import { ImageResponse } from '@vercel/og';
import { NextRequest } from 'next/server';
import { fetchLanyardData } from '@/lib/api/lanyard';
import { fetchDstnData } from '@/lib/api/dstn';
import { getDisplayName, getAvatarUrl, getBannerUrl, getStatus, extractBadges } from '@/lib/utils/profile';
import { isValidDiscordId } from '@/lib/utils/validation';

export const runtime = 'edge';

const DEFAULT_USER_ID = '915480322328649758';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('id') || DEFAULT_USER_ID;

    if (!isValidDiscordId(userId)) {
      return new Response('Invalid Discord ID', { status: 400 });
    }

    // Fetch user data
    const [lanyardData, dstnData] = await Promise.all([
      fetchLanyardData(userId),
      fetchDstnData(userId),
    ]);

    const user = lanyardData?.discord_user || dstnData?.user || null;
    const dstnUser = dstnData?.user || null;
    
    const displayName = getDisplayName(user, dstnUser);
    const username = user?.username || dstnUser?.username || 'User';
    const avatarUrl = getAvatarUrl(user, dstnUser);
    const bannerUrl = getBannerUrl(lanyardData, dstnData);
    const status = getStatus(lanyardData);
    const badges = extractBadges(lanyardData, dstnData);
    const pronouns = dstnData?.user_profile?.pronouns || '';
    const bio = dstnData?.user_profile?.bio || '';

    // Status colors
    const statusColors = {
      online: '#23A55A',
      idle: '#F0B232',
      dnd: '#F23F43',
      offline: '#80848E',
    };

    const statusColor = statusColors[status] || statusColors.offline;

    // Create OG image
    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            background: 'linear-gradient(180deg, #2f3136 0%, #23272a 100%)',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          {/* Banner */}
          {bannerUrl ? (
            <div
              style={{
                width: '100%',
                height: '200px',
                backgroundImage: `url(${bannerUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                position: 'relative',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 12px',
                  background: 'rgba(0, 0, 0, 0.6)',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '14px',
                }}
              >
                <div
                  style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    background: statusColor,
                  }}
                />
                <span style={{ textTransform: 'capitalize' }}>{status}</span>
              </div>
            </div>
          ) : (
            <div
              style={{
                width: '100%',
                height: '200px',
                background: 'linear-gradient(135deg, #5865F2 0%, #7289DA 100%)',
                position: 'relative',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 12px',
                  background: 'rgba(0, 0, 0, 0.6)',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '14px',
                }}
              >
                <div
                  style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    background: statusColor,
                  }}
                />
                <span style={{ textTransform: 'capitalize' }}>{status}</span>
              </div>
            </div>
          )}

          {/* Profile Content */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              padding: '24px',
              paddingTop: bannerUrl ? '80px' : '24px',
              position: 'relative',
            }}
          >
            {/* Avatar */}
            <div
              style={{
                position: 'absolute',
                top: bannerUrl ? '-60px' : '24px',
                left: '24px',
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                border: '6px solid #2f3136',
                background: '#23272a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              <img
                src={avatarUrl}
                alt={displayName}
                width={120}
                height={120}
                style={{
                  borderRadius: '50%',
                }}
              />
            </div>

            {/* User Info */}
            <div
              style={{
                marginLeft: bannerUrl ? '0' : '140px',
                marginTop: bannerUrl ? '60px' : '0',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              {/* Display Name */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  flexWrap: 'wrap',
                }}
              >
                <h1
                  style={{
                    fontSize: '32px',
                    fontWeight: 'bold',
                    color: '#fff',
                    margin: 0,
                  }}
                >
                  {displayName}
                </h1>
                {badges.length > 0 && (
                  <div
                    style={{
                      display: 'flex',
                      gap: '4px',
                      alignItems: 'center',
                    }}
                  >
                    {badges.slice(0, 3).map((badge, idx) => (
                      <div
                        key={idx}
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '4px',
                          background: '#5865F2',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <span style={{ fontSize: '16px' }}>✓</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Username and Pronouns */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '18px',
                  color: '#B9BBBE',
                }}
              >
                <span>@{username}</span>
                {pronouns && (
                  <>
                    <span>•</span>
                    <span>{pronouns}</span>
                  </>
                )}
              </div>

              {/* Bio */}
              {bio && (
                <div
                  style={{
                    fontSize: '16px',
                    color: '#DCDDDE',
                    marginTop: '8px',
                    maxWidth: '600px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                  }}
                >
                  {bio.replace(/[#*_~`\[\]()]/g, '').substring(0, 150)}
                </div>
              )}

              {/* Footer */}
              <div
                style={{
                  marginTop: '16px',
                  paddingTop: '16px',
                  borderTop: '1px solid #40444B',
                  fontSize: '14px',
                  color: '#72767D',
                }}
              >
                Discord Profile Card Generator
              </div>
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (error) {
    console.error('OG image generation error:', error);
    return new Response('Failed to generate image', { status: 500 });
  }
}

