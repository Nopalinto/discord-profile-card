import { NextRequest, NextResponse } from 'next/server';
import { isValidDiscordId } from '@/lib/utils/validation';
import { encrypt, decrypt } from '@/lib/encryption';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getRedisClient, RedisKeys } from '@/lib/redis';

// GET: Retrieve stored RAWG API key for a user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    const session = await getServerSession(authOptions);
    if (!session || session.user?.id !== userId) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    if (!userId || !isValidDiscordId(userId)) {
      return NextResponse.json(
        { error: 'Invalid or missing userId' },
        { status: 400 }
      );
    }

    try {
      const client = await getRedisClient();
      const key = RedisKeys.rawgKey(userId);
      const encryptedApiKey = await client.get(key);
      
      if (!encryptedApiKey) {
        return NextResponse.json({
          apiKey: null,
          exists: false,
        });
      }

      // Decrypt the API key
      let apiKey: string;
      try {
        apiKey = decrypt(encryptedApiKey);
      } catch (e) {
        console.error('Failed to decrypt API key'); // Sanitized log
        // If decryption fails, we can't use the key
        return NextResponse.json({
          apiKey: null,
          exists: false,
        });
      }

      // DO NOT return the full API key to the client to prevent theft
      // Only return a masked version to indicate it's configured
      const maskedKey = apiKey.length > 8 
        ? `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`
        : '****';

      return NextResponse.json({
        apiKey: maskedKey,
        exists: true,
      });
    } catch (redisError) {
      console.warn('Redis not configured or error:', redisError);
      return NextResponse.json({
        apiKey: null,
      });
    }
  } catch (error) {
    console.error('Error fetching RAWG API key:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST: Store RAWG API key for a user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, apiKey } = body;

    const session = await getServerSession(authOptions);
    if (!session || session.user?.id !== userId) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    if (!userId || !isValidDiscordId(userId)) {
      return NextResponse.json(
        { error: 'Invalid or missing userId' },
        { status: 400 }
      );
    }

    // Validate API key format (RAWG keys are typically alphanumeric)
    if (apiKey && typeof apiKey !== 'string') {
      return NextResponse.json(
        { error: 'Invalid API key format' },
        { status: 400 }
      );
    }

    try {
      const client = await getRedisClient();
      const key = RedisKeys.rawgKey(userId);
      
      if (apiKey && apiKey.trim() !== '') {
        // Encrypt the API key before storing
        const encryptedApiKey = encrypt(apiKey.trim());
        // Store API key with no expiration (user can delete it manually)
        await client.set(key, encryptedApiKey);
      } else {
        // Delete if empty
        await client.del(key);
      }

      return NextResponse.json({
        success: true,
        message: 'RAWG API key stored successfully',
      });
    } catch (redisError) {
      console.warn('Redis not configured or error:', redisError);
      return NextResponse.json({
        success: false,
        message: 'Storage not available. Please configure Redis/KV.',
        error: 'REDIS_NOT_CONFIGURED',
      }, { status: 503 });
    }
  } catch (error) {
    console.error('Error storing RAWG API key:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

