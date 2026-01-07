import { NextRequest, NextResponse } from 'next/server';
import { isValidDiscordId } from '@/lib/utils/validation';
import { searchGame, getGameImageUrl } from '@/lib/api/rawg';
import { decrypt } from '@/lib/encryption';
import { getRedisClient, RedisKeys } from '@/lib/redis';

// GET: Fetch game data using server-stored API key
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const gameName = searchParams.get('gameName');

    if (!userId || !isValidDiscordId(userId)) {
      return NextResponse.json(
        { error: 'Invalid or missing userId' },
        { status: 400 }
      );
    }

    if (!gameName || gameName.trim() === '') {
      return NextResponse.json(
        { error: 'Invalid or missing gameName' },
        { status: 400 }
      );
    }

    try {
      // Get API key from Redis
      const client = await getRedisClient();
      const key = RedisKeys.rawgKey(userId);
      const encryptedApiKey = await client.get(key);
      
      if (!encryptedApiKey) {
        return NextResponse.json({
          game: null,
          imageUrl: null,
        });
      }

      // Decrypt the API key
      let apiKey: string;
      try {
        apiKey = decrypt(encryptedApiKey);
      } catch (e) {
        console.error('Failed to decrypt API key for game search, User:', userId, e);
        return NextResponse.json({
          game: null,
          imageUrl: null,
        });
      }

      // Fetch game data using server-side API key (never exposed to client)
      const game = await searchGame(gameName, apiKey);
      const imageUrl = game ? getGameImageUrl(game) : null;

      return NextResponse.json({
        game,
        imageUrl,
      });
    } catch (redisError) {
      console.warn('Redis error:', redisError);
      return NextResponse.json({
        game: null,
        imageUrl: null,
      });
    }
  } catch (error) {
    console.error('Error fetching game data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

