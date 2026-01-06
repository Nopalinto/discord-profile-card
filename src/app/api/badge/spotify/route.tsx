import { ImageResponse } from '@vercel/og';

export const runtime = 'edge';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const theme = searchParams.get('theme') || 'dark';
  const width = parseInt(searchParams.get('width') || '350');

  if (!id) {
    return new Response('Missing id parameter', { status: 400 });
  }

  let spotify: any = null;
  try {
    const res = await fetch(`https://api.lanyard.rest/v1/users/${id}`);
    const data = await res.json();
    if (data.success && data.data) {
      spotify = data.data.spotify;
    }
  } catch (e) {
    console.error('Lanyard fetch error:', e);
  }

  const bg = theme === 'light' ? '#ffffff' : '#000000';
  const text = theme === 'light' ? '#000000' : '#ffffff';
  const subtext = theme === 'light' ? '#666666' : '#b3b3b3';

  if (!spotify) {
    // Return an empty pixel or a "Not Playing" badge if preferred
    // For now, let's return a clean "Not Playing" state
    return new ImageResponse(
      (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          background: '#1DB954', // Spotify Green background for empty state
          color: 'white',
          borderRadius: '20px',
          padding: '4px 12px',
          fontSize: '12px',
          fontFamily: 'sans-serif',
          fontWeight: 'bold',
          height: '100%',
        }}>
          <svg width="16" height="16" viewBox="0 0 168 168" style={{ marginRight: '6px' }}>
            <path fill="currentColor" d="M83.996.277C37.747.277.253 37.77.253 84.019c0 46.251 37.494 83.741 83.743 83.741 46.254 0 83.744-37.49 83.744-83.741 0-46.246-37.49-83.738-83.745-83.738zM121.493 121.125c-1.505 2.479-4.717 3.235-7.147 1.745-19.579-11.96-44.22-14.665-73.255-8.03-2.775.636-5.578-1.127-6.216-3.901-.637-2.775 1.127-5.579 3.902-6.216 31.89-7.29 59.263-4.226 80.97 8.97 2.43 1.49 3.192 4.667 1.746 7.432zm10.142-22.564c-1.888 3.076-5.918 4.048-8.995 2.16-22.454-13.805-56.678-17.802-83.228-9.746-3.456 1.05-7.11-1.003-8.158-4.46-1.049-3.457 1.003-7.11 4.46-8.158 30.565-9.277 68.748-4.75 93.762 10.635 3.076 1.889 4.048 5.919 2.16 8.995v-.001zm1.092-23.233C105.77 59.207 61.353 57.514 35.78 65.28c-4.14 1.258-8.524-1.124-9.782-5.263-1.259-4.14 1.124-8.525 5.263-9.783 29.563-8.975 78.497-7.062 108.648 10.838 3.824 2.27 5.093 7.218 2.822 11.042-2.269 3.824-7.217 5.093-11.042 2.822h.001z"/>
          </svg>
          Not Playing
        </div>
      ),
      { width: 120, height: 28 }
    );
  }

  // Calculate progress
  const start = spotify.timestamps.start;
  const end = spotify.timestamps.end;
  const now = Date.now();
  const total = end - start;
  const current = Math.min(now - start, total);
  const progressPercent = Math.min((current / total) * 100, 100);

  const formatTime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const rs = s % 60;
    return `${m}:${rs.toString().padStart(2, '0')}`;
  };

  return new ImageResponse(
    (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        background: bg,
        color: text,
        borderRadius: '12px',
        border: theme === 'light' ? '1px solid #e1e4e8' : '1px solid #30363d',
        padding: '8px',
        width: '100%',
        height: '100%',
        fontFamily: 'sans-serif',
      }}>
        {/* Album Art */}
        <img 
          src={spotify.album_art_url} 
          width="48" 
          height="48" 
          style={{ borderRadius: '6px', marginRight: '12px' }} 
        />
        
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
          {/* Song Title */}
          <div style={{ 
            fontSize: '14px', 
            fontWeight: 'bold', 
            whiteSpace: 'nowrap', 
            overflow: 'hidden', 
            textOverflow: 'ellipsis',
            maxWidth: '240px'
          }}>
            {spotify.song}
          </div>
          
          {/* Artist */}
          <div style={{ 
            fontSize: '12px', 
            color: subtext,
            marginBottom: '6px',
            whiteSpace: 'nowrap', 
            overflow: 'hidden', 
            textOverflow: 'ellipsis',
            maxWidth: '240px'
          }}>
            {spotify.artist}
          </div>

          {/* Progress Bar */}
          <div style={{ 
            width: '100%', 
            height: '4px', 
            background: theme === 'light' ? '#e1e4e8' : '#30363d', 
            borderRadius: '2px',
            overflow: 'hidden',
            display: 'flex'
          }}>
            <div style={{ 
              width: `${progressPercent}%`, 
              height: '100%', 
              background: '#1DB954' 
            }} />
          </div>
          
          {/* Timestamps */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            fontSize: '10px', 
            color: subtext,
            marginTop: '2px' 
          }}>
            <span>{formatTime(current)}</span>
            <span>{formatTime(total)}</span>
          </div>
        </div>
      </div>
    ),
    {
      width: width,
      height: 64,
    }
  );
}
