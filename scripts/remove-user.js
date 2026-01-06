const { createClient } = require('redis');
require('dotenv').config({ path: '.env.local' }); // Try to load .env.local

const userId = process.argv[2];

if (!userId) {
  console.error('Please provide a user ID to remove.');
  console.error('Usage: node scripts/remove-user.js <userId>');
  process.exit(1);
}

const REDIS_URL = process.env.KV_URL || process.env.REDIS_URL;

if (!REDIS_URL) {
  console.error('Error: KV_URL or REDIS_URL environment variable is required.');
  console.error('Make sure you have a .env.local file or set the environment variables.');
  process.exit(1);
}

async function main() {
  const client = createClient({
    url: REDIS_URL,
    socket: {
      tls: REDIS_URL.startsWith('rediss://') || REDIS_URL.includes(':6380'),
    },
  });

  client.on('error', (err) => console.error('Redis Client Error:', err));

  try {
    await client.connect();
    console.log('Connected to Redis.');

    // 1. Remove from tracked users list
    const trackedUsersKey = 'discord-activities:tracked-users';
    const trackedUsersJson = await client.get(trackedUsersKey);
    
    if (trackedUsersJson) {
      let trackedUsers = JSON.parse(trackedUsersJson);
      if (trackedUsers.includes(userId)) {
        trackedUsers = trackedUsers.filter(id => id !== userId);
        await client.set(trackedUsersKey, JSON.stringify(trackedUsers));
        console.log(`Removed ${userId} from tracked users list.`);
      } else {
        console.log(`${userId} was not in tracked users list.`);
      }
    } else {
      console.log('Tracked users list not found.');
    }

    // 2. Delete individual keys
    const keys = [
      `discord-activities:${userId}`,
      `discord-history:${userId}`,
      `discord-streaks:${userId}`,
      `discord-internal-state:${userId}`
    ];

    let deletedCount = 0;
    for (const key of keys) {
      const result = await client.del(key);
      if (result > 0) {
        console.log(`Deleted key: ${key}`);
        deletedCount++;
      }
    }

    if (deletedCount === 0) {
      console.log('No individual keys found to delete.');
    } else {
      console.log('Cleanup complete.');
    }

  } catch (error) {
    console.error('Error during cleanup:', error);
  } finally {
    await client.disconnect();
  }
}

main();
