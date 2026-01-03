import { createClient } from 'redis';
import WebSocket from 'ws';

// Configuration
const REDIS_URL = process.env.REDIS_URL || process.env.KV_URL;
const LANYARD_WS_URL = 'wss://api.lanyard.rest/socket';
const MAX_AGE = 90 * 24 * 60 * 60 * 1000; // 90 days
const STREAK_MINUTES_THRESHOLD = 10;
const MAX_ACTIVITIES_PER_USER = 100;

if (!REDIS_URL) {
  console.error('Error: REDIS_URL or KV_URL environment variable is required.');
  process.exit(1);
}

// Redis Client
const redis = createClient({
  url: REDIS_URL,
  socket: {
    tls: REDIS_URL.startsWith('rediss://'),
    reconnectStrategy: (retries) => Math.min(retries * 100, 3000),
  },
});

redis.on('error', (err) => console.error('Redis Client Error:', err));

// State
let trackedUsers = new Set();
let ws = null;
let heartbeatInterval = null;
const userStates = new Map(); // Store previous state to detect changes

// Helper to get Redis keys
const getKey = (userId) => `discord-activities:${userId}`;
const getStreakKey = (userId) => `discord-streaks:${userId}`;
const getHistoryKey = (userId) => `discord-history:${userId}`;

// Sanitize activity name (copied from validation logic)
function sanitizeActivityName(name) {
  if (!name) return '';
  const trimmed = name.trim().slice(0, 128);
  const forbidden = ['__proto__', 'constructor', 'prototype'];
  if (forbidden.includes(trimmed.toLowerCase())) return 'Invalid Activity';
  return trimmed;
}

// Update history logic
async function updateHistory(userId, newData) {
  const oldData = userStates.get(userId);
  const historyKey = getHistoryKey(userId);
  const now = Date.now();
  
  if (!oldData) {
    userStates.set(userId, newData);
    return;
  }

  // 1. Check for Spotify song completion/change
  if (oldData.spotify && (!newData.spotify || oldData.spotify.track_id !== newData.spotify.track_id)) {
    const historyItem = {
      type: 'spotify',
      name: oldData.spotify.song,
      details: oldData.spotify.artist,
      image: oldData.spotify.album_art_url,
      timestamp: now,
      metadata: {
        track_id: oldData.spotify.track_id,
        album: oldData.spotify.album
      }
    };
    await redis.lPush(historyKey, JSON.stringify(historyItem));
    await redis.lTrim(historyKey, 0, 19); // Keep last 20
    console.log(`[${userId}] Logged Spotify history: ${historyItem.name}`);
  }

  // 2. Check for Activity completion
  // Find activities that were present but are now gone
  const oldActivities = oldData.activities || [];
  const newActivities = newData.activities || [];
  
  for (const oldActivity of oldActivities) {
    // Skip custom status and spotify (handled separately)
    if (oldActivity.type === 4 || oldActivity.type === 2) continue;

    // Check if this specific activity is gone or restarted
    // We match by name and application_id
    const isStillActive = newActivities.find(
        newA => newA.name === oldActivity.name && newA.application_id === oldActivity.application_id
    );

    if (!isStillActive) {
        // Activity ended
        let duration = 0;
        if (oldActivity.timestamps && oldActivity.timestamps.start) {
            duration = now - oldActivity.timestamps.start;
        }

        // Only log if it lasted at least 1 minute
        if (duration > 60000) {
            const historyItem = {
                type: 'activity',
                name: oldActivity.name,
                details: oldActivity.details || oldActivity.state,
                image: oldActivity.assets?.large_image ? `https://cdn.discordapp.com/app-assets/${oldActivity.application_id}/${oldActivity.assets.large_image}.png` : null,
                timestamp: now,
                metadata: {
                    application_id: oldActivity.application_id,
                    duration: duration
                }
            };
            await redis.lPush(historyKey, JSON.stringify(historyItem));
            await redis.lTrim(historyKey, 0, 19); // Keep last 20
            console.log(`[${userId}] Logged Activity history: ${historyItem.name}`);
        }
    }
  }

  // Update local state
  userStates.set(userId, newData);
}

// Update streaks logic
async function updateStreaks(userId, activities) {
  try {
    const streakKey = getStreakKey(userId);
    const storedStreaksJson = await redis.get(streakKey);
    const streaks = storedStreaksJson ? JSON.parse(storedStreaksJson) : {};
    let streaksUpdated = false;

    const now = new Date();
    const today = now.toISOString().slice(0, 10);

    for (const activity of activities) {
      if ((activity.type === 0 || activity.type === 5) && activity.name && activity.timestamps?.start) {
        const title = sanitizeActivityName(activity.name);
        if (!title || title === 'Invalid Activity') continue;

        // Check limit
        if (!streaks[title] && Object.keys(streaks).length >= MAX_ACTIVITIES_PER_USER) continue;

        const record = streaks[title] || { lastDate: '', days: 0, minutesToday: 0 };
        const startTimestamp = activity.timestamps.start;
        const mins = Math.floor((Date.now() - startTimestamp) / 60000);

        // Update streak if it's a new day
        if (record.lastDate !== today) {
          if (record.minutesToday >= STREAK_MINUTES_THRESHOLD) {
            record.days = (record.days || 0) + 1;
          } else {
            record.days = 1;
          }
          record.minutesToday = 0;
          record.lastDate = today;
          streaksUpdated = true;
        }

        // Update minutes for today
        if (mins > record.minutesToday) {
            record.minutesToday = Math.max(record.minutesToday, mins);
            streaksUpdated = true;
        }

        streaks[title] = record;
      }
    }

    if (streaksUpdated) {
      const ttlSeconds = Math.floor(MAX_AGE / 1000);
      await redis.setEx(streakKey, ttlSeconds, JSON.stringify(streaks));
      console.log(`[${userId}] Updated streaks`);
    }
  } catch (error) {
    console.error(`[${userId}] Failed to update streaks:`, error);
  }
}

// WebSocket Logic
function connectLanyard() {
  ws = new WebSocket(LANYARD_WS_URL);

  ws.on('open', () => {
    console.log('Connected to Lanyard WebSocket');
  });

  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data.toString());
      const { op, d, t } = message;

      switch (op) {
        case 1: // Hello
          console.log('Received Hello, sending Initialize...');
          // Subscribe to all tracked users
          const subscribeMsg = {
            op: 2,
            d: { subscribe_to_ids: Array.from(trackedUsers) },
          };
          ws.send(JSON.stringify(subscribeMsg));
          
          // Setup heartbeat
          if (heartbeatInterval) clearInterval(heartbeatInterval);
          heartbeatInterval = setInterval(() => {
            ws.send(JSON.stringify({ op: 3 }));
          }, d.heartbeat_interval);
          break;

        case 0: // Dispatch
          if (t === 'INIT_STATE' || t === 'PRESENCE_UPDATE') {
            const userData = t === 'INIT_STATE' ? Object.values(d) : [d];
            
            for (const user of userData) {
                // Determine user ID (PRESENCE_UPDATE has user.id, INIT_STATE has keys as IDs but value is object)
                // Actually INIT_STATE d is { "userId": { ...data } }
                // Wait, Lanyard INIT_STATE returns data structure: { "userid": { ... } }
                
                let userId;
                let data;

                if (t === 'INIT_STATE') {
                    // For INIT_STATE, we iterate the object values? No, the loop above was wrong.
                    // d is { "userId1": { ... }, "userId2": { ... } }
                    // We should handle this differently
                    return; // INIT_STATE is massive, we might just rely on updates. 
                    // Actually, let's process it correctly if we want initial sync.
                    // But simpler: PRESENCE_UPDATE handles changes.
                } else {
                   userId = user.discord_user.id;
                   data = user;
                }

                if (!userId) continue;

                // Update Activity Cache
                const activityData = {
                  activities: data.activities || [],
                  spotify: data.spotify || null,
                  updatedAt: Date.now(),
                };
                
                const key = getKey(userId);
                const ttlSeconds = Math.floor(MAX_AGE / 1000);
                await redis.setEx(key, ttlSeconds, JSON.stringify(activityData));
                console.log(`[${userId}] Updated activity cache`);

                // Update History (Detect ended activities/songs)
                await updateHistory(userId, activityData);

                // Update Streaks
                await updateStreaks(userId, data.activities || []);
            }
          }
          break;
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });

  ws.on('close', () => {
    console.log('Disconnected from Lanyard. Reconnecting in 5s...');
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    setTimeout(connectLanyard, 5000);
  });

  ws.on('error', (err) => {
    console.error('WebSocket Error:', err);
    ws.close();
  });
}

// Main function
async function main() {
  await redis.connect();
  console.log('Connected to Redis');

  // Load tracked users
  const trackedUsersKey = 'discord-activities:tracked-users';
  const trackedUsersJson = await redis.get(trackedUsersKey);
  if (trackedUsersJson) {
    const users = JSON.parse(trackedUsersJson);
    users.forEach(id => trackedUsers.add(id));
    console.log(`Loaded ${trackedUsers.size} tracked users`);
  }

  // Refresh tracked users list every minute
  setInterval(async () => {
    const json = await redis.get(trackedUsersKey);
    if (json) {
      const users = JSON.parse(json);
      let changed = false;
      users.forEach(id => {
        if (!trackedUsers.has(id)) {
            trackedUsers.add(id);
            changed = true;
        }
      });
      
      if (changed && ws && ws.readyState === WebSocket.OPEN) {
        console.log('Tracked users list updated, resubscribing...');
        ws.send(JSON.stringify({
            op: 2,
            d: { subscribe_to_ids: Array.from(trackedUsers) },
        }));
      }
    }
  }, 60000);

  connectLanyard();
}

main().catch(console.error);
