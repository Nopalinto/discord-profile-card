'use client';

import React from 'react';
import type { LanyardActivity, LanyardSpotify } from '@/lib/types/lanyard';
import { ActivityCard } from './ActivityCard';
import { MusicCard } from './MusicCard';

interface ActivitySectionsProps {
  activities: LanyardActivity[];
  listeningActivities: LanyardActivity[];
  spotify: LanyardSpotify | null;
  history?: any[] | null;
  hideActivity?: boolean;
  hideSpotify?: boolean;
  hideActivityTime?: boolean;
  hideRecentActivity?: boolean;
  status?: 'online' | 'idle' | 'dnd' | 'offline';
  userId?: string;
}

function ActivitySectionsComponent({
  activities,
  listeningActivities,
  spotify,
  history,
  hideActivity,
  hideSpotify,
  hideActivityTime,
  hideRecentActivity,
  status = 'offline',
  userId,
}: ActivitySectionsProps) {
  const isOffline = status === 'offline';

  // Process history data if available
  const historyActivities = history?.filter(h => h.type === 'activity') || [];
  const historySongs = history?.filter(h => h.type === 'spotify' || h.type === 'apple' || h.type === 'tidal') || [];
  
  return (
    <>
      {/* Show activities when online/idle/dnd */}
      {!isOffline && (
        <section
          className={`discord-activities-section ${activities.length > 0 && !hideActivity ? 'has-content' : ''}`}
        >
          <div id="activities-list" className="activities-list">
            {activities.length > 0 && !hideActivity && activities.map((activity, index) => (
              <ActivityCard
                key={activity.id || index}
                activity={activity}
                hideTimestamp={hideActivityTime}
                userId={userId}
              />
            ))}
          </div>
        </section>
      )}

      {/* Show music when online/idle/dnd */}
      {!isOffline && (
        <section
          className={`discord-music-section ${(spotify || listeningActivities.length > 0) && !hideSpotify ? 'has-content' : ''}`}
        >
          <div id="music-list" className="music-list">
            {!hideSpotify && spotify && (
              <MusicCard spotify={spotify} />
            )}
            {!hideSpotify && listeningActivities.map((activity, index) => {
              if (activity.name?.toLowerCase().includes('apple')) {
                return <MusicCard key={`apple-${index}`} activity={activity} type="apple" />;
              }
              if (activity.name?.toLowerCase().includes('tidal')) {
                return <MusicCard key={`tidal-${index}`} activity={activity} type="tidal" />;
              }
              return null;
            })}
          </div>
        </section>
      )}

      {/* Show Recent Activity when offline */}
      {isOffline && !hideRecentActivity && (activities.length > 0 || historyActivities.length > 0) && !hideActivity && (
        <section className="discord-recent-activity-section has-content">
          <div className="recent-activity-header">
            <h3 className="recent-activity-title">Recent activity</h3>
          </div>
          <div id="recent-activities-list" className="recent-activities-list">
            {/* Prefer current activities (cached) then history */}
            {activities.length > 0 ? (
              activities.map((activity, index) => (
                <ActivityCard
                  key={activity.id || index}
                  activity={activity}
                  hideTimestamp={true}
                  userId={userId}
                />
              ))
            ) : (
              historyActivities.slice(0, 1).map((item, index) => (
                <ActivityCard
                  key={`hist-${index}`}
                  activity={{
                    type: 0,
                    name: item.name,
                    details: item.details,
                    state: item.state,
                    assets: {
                        large_image: item.image ? 'external' : undefined,
                        large_text: item.name,
                        small_image: item.metadata?.small_image ? 'external' : undefined,
                        small_text: item.metadata?.small_text,
                        external_url: item.image,
                        small_external_url: item.metadata?.small_image
                    } as any,
                    timestamps: { start: item.timestamp - (item.metadata?.duration || 0) }
                  } as any}
                  hideTimestamp={true}
                  userId={userId}
                />
              ))
            )}
          </div>
        </section>
      )}

      {/* Show Recent Song when offline */}
      {isOffline && !hideRecentActivity && !hideSpotify && (spotify || historySongs.length > 0) && (
        <section className="discord-recent-music-section has-content">
          <div className="recent-music-header">
            <h3 className="recent-music-title">Recently played</h3>
          </div>
          <div id="recent-music-list" className="recent-music-list">
            {spotify ? (
              <MusicCard spotify={spotify} hideTimestamp={true} />
            ) : (
              historySongs.slice(0, 1).map((item, index) => (
                <MusicCard 
                  key={`hist-song-${index}`}
                  type={item.type}
                  spotify={{
                    song: item.name,
                    artist: item.details,
                    album_art_url: item.image,
                    album: item.metadata?.album,
                    track_id: item.metadata?.track_id
                  } as any} 
                  hideTimestamp={true} 
                />
              ))
            )}
          </div>
        </section>
      )}
    </>
  );
}

const areEqual = (prev: ActivitySectionsProps, next: ActivitySectionsProps): boolean => (
  prev.hideActivity === next.hideActivity &&
  prev.hideSpotify === next.hideSpotify &&
  prev.hideActivityTime === next.hideActivityTime &&
  prev.hideRecentActivity === next.hideRecentActivity &&
  prev.spotify === next.spotify &&
  prev.activities === next.activities &&
  prev.listeningActivities === next.listeningActivities &&
  prev.history === next.history &&
  prev.status === next.status &&
  prev.userId === next.userId
);

export const ActivitySections = React.memo(ActivitySectionsComponent, areEqual);

