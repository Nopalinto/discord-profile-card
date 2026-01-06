import { ImageResponse } from '@vercel/og';

export const runtime = 'edge';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const theme = searchParams.get('theme') || 'dark';

  if (!id) {
    return new Response('Missing id parameter', { status: 400 });
  }

  // Direct fetch to Lanyard, bypassing local helpers that might use localStorage
  let status = 'offline';
  try {
    const res = await fetch(`https://api.lanyard.rest/v1/users/${id}`);
    const data = await res.json();
    if (data.success && data.data) {
      status = data.data.discord_status || 'offline';
    }
  } catch (e) {
    console.error('Lanyard fetch error:', e);
  }

  const colors: Record<string, string> = {
    online: '#23A55A',
    idle: '#F0B232',
    dnd: '#F23F43',
    offline: '#80848E',
  };

  const statusColor = colors[status] || colors.offline;
  
  // Shield.io style badges
  // Left side: Label (Discord)
  // Right side: Status

  return new ImageResponse(
    (
      <div style={{
        display: 'flex',
        fontSize: '11px',
        fontFamily: 'Verdana, Geneva, sans-serif',
        lineHeight: '1',
        textShadow: '0 1px 0 rgba(1,1,1,0.3)',
      }}>
        <div style={{
          background: '#555',
          color: '#fff',
          padding: '6px 8px',
          borderTopLeftRadius: '3px',
          borderBottomLeftRadius: '3px',
          backgroundImage: 'linear-gradient(180deg,rgba(255,255,255,.15),rgba(0,0,0,.15))',
        }}>
          Discord
        </div>
        <div style={{
          background: statusColor,
          color: '#fff',
          padding: '6px 8px',
          borderTopRightRadius: '3px',
          borderBottomRightRadius: '3px',
          backgroundImage: 'linear-gradient(180deg,rgba(255,255,255,.15),rgba(0,0,0,.15))',
          fontWeight: 'bold',
          textTransform: 'uppercase',
        }}>
          {status}
        </div>
      </div>
    ),
    {
      width: 120, // Approximate width
      height: 20,
    }
  );
}
