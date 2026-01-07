import { ImageResponse } from '@vercel/og';
import { NextRequest } from 'next/server';
import { getRedisClient, RedisKeys } from '@/lib/redis';
import type { StreakData } from '@/lib/types/redis';

// export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('id');
    const activity = searchParams.get('activity') || 'Coding';
    const showFire = searchParams.get('fire') !== 'false';
    const theme = searchParams.get('theme') || 'dark';

    if (!userId) {
      return new Response('Missing id parameter', { status: 400 });
    }

    let days = 0;
    
    try {
      const client = await getRedisClient();
      if (client) {
        const key = RedisKeys.streaks(userId);
        const storedJson = await client.get(key);
        
        if (storedJson) {
          const streaks: StreakData = JSON.parse(storedJson);
          // Case-insensitive search for activity
          const activityKey = Object.keys(streaks).find(
            k => k.toLowerCase() === activity.toLowerCase()
          );
          
          if (activityKey && streaks[activityKey]) {
            days = streaks[activityKey].days || 0;
          }
        }
      }
    } catch (e) {
      console.error('Error fetching streak:', e);
    }

    // Colors based on theme
    const bg = theme === 'light' ? '#ffffff' : '#0D1117';
    const text = theme === 'light' ? '#24292f' : '#E6EDF3';
    const border = theme === 'light' ? '#d0d7de' : '#30363D';
    const highlight = '#58A6FF';

    return new ImageResponse(
      (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          background: bg,
          color: text,
          border: `1px solid ${border}`,
          borderRadius: '6px',
          padding: '4px 10px',
          fontSize: '14px',
          fontFamily: 'sans-serif',
          fontWeight: 600,
          height: '100%',
        }}>
          <span style={{ color: highlight }}>{activity}</span>
          {showFire && <span style={{ margin: '0 6px', fontSize: '16px' }}>🔥</span>}
          {!showFire && <span style={{ width: '6px' }}></span>}
          <span>{days} {days === 1 ? 'Day' : 'Days'}</span>
        </div>
      ),
      {
        width: activity.length * 9 + 100, // Dynamic width estimate
        height: 32,
      }
    );
  } catch (error) {
    return new Response('Error generating streak badge', { status: 500 });
  }
}
