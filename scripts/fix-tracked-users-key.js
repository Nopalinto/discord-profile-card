/**
 * Fix for Redis WRONGTYPE error on discord-activities:tracked-users
 * 
 * This script:
 * 1. Checks the current type of the tracked-users key
 * 2. If it's the wrong type, backs up any data and deletes it
 * 3. The worker will recreate it as a proper SET when users are tracked
 * 
 * Run with: node scripts/fix-tracked-users-key.js
 */

import { createClient } from 'redis';
import 'dotenv/config';

const REDIS_URL = process.env.REDIS_URL || process.env.KV_URL;
const TRACKED_USERS_KEY = 'discord-activities:tracked-users';

if (!REDIS_URL) {
    console.error('Error: REDIS_URL or KV_URL environment variable is required.');
    process.exit(1);
}

async function fixTrackedUsersKey() {
    const client = createClient({
        url: REDIS_URL,
        socket: {
            tls: REDIS_URL.startsWith('rediss://'),
        },
    });

    client.on('error', (err) => console.error('Redis Client Error:', err));

    try {
        await client.connect();
        console.log('Connected to Redis');

        // Check the type of the key
        const keyType = await client.type(TRACKED_USERS_KEY);
        console.log(`Key "${TRACKED_USERS_KEY}" type: ${keyType}`);

        if (keyType === 'none') {
            console.log('✅ Key does not exist. Nothing to fix.');
            return;
        }

        if (keyType === 'set') {
            console.log('✅ Key is already a SET. Nothing to fix.');
            const members = await client.sMembers(TRACKED_USERS_KEY);
            console.log(`Current tracked users (${members.length}):`, members);
            return;
        }

        // Key exists but is wrong type - need to fix
        console.log(`⚠️  Key is of type "${keyType}" but should be "set". Fixing...`);

        // Try to read the current value for backup
        let backup = null;
        try {
            if (keyType === 'string') {
                backup = await client.get(TRACKED_USERS_KEY);
                console.log('Backup of current value:', backup);
            } else if (keyType === 'list') {
                backup = await client.lRange(TRACKED_USERS_KEY, 0, -1);
                console.log('Backup of current value (list):', backup);
            } else if (keyType === 'hash') {
                backup = await client.hGetAll(TRACKED_USERS_KEY);
                console.log('Backup of current value (hash):', backup);
            }
        } catch (e) {
            console.log('Could not backup current value:', e.message);
        }

        // Delete the key
        await client.del(TRACKED_USERS_KEY);
        console.log('✅ Deleted the corrupted key');

        // Try to recover user IDs from backup if it was a JSON array
        if (backup && typeof backup === 'string') {
            try {
                const parsed = JSON.parse(backup);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    console.log('Found user IDs in backup, restoring as SET...');
                    await client.sAdd(TRACKED_USERS_KEY, parsed);
                    console.log(`✅ Restored ${parsed.length} user IDs as a SET`);
                }
            } catch (e) {
                // Not JSON, that's fine
            }
        }

        // If backup was already an array (from list type)
        if (Array.isArray(backup) && backup.length > 0) {
            console.log('Restoring user IDs from list backup as SET...');
            await client.sAdd(TRACKED_USERS_KEY, backup);
            console.log(`✅ Restored ${backup.length} user IDs as a SET`);
        }

        console.log('\n✅ Fix complete! Restart your worker and it should work now.');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.quit();
        console.log('Disconnected from Redis');
    }
}

fixTrackedUsersKey();
