import type { Metadata } from 'next';
import { Suspense } from 'react';
import { EmbedContent } from './EmbedContent';
import { fetchLanyardData } from '@/lib/api/lanyard';
import { fetchDstnData } from '@/lib/api/dstn';
import { getDisplayName, getAvatarUrl } from '@/lib/utils/profile';
import { isValidDiscordId } from '@/lib/utils/validation';
import styles from './page.module.css';

const DEFAULT_USER_ID = '915480322328649758';

interface EmbedPageProps {
  searchParams: Promise<{ id?: string }> | { id?: string };
}

export async function generateMetadata({ searchParams }: EmbedPageProps): Promise<Metadata> {
  const params = searchParams instanceof Promise ? await searchParams : searchParams;
  const userId = params.id || DEFAULT_USER_ID;
  
  // Only fetch if valid Discord ID
  if (!isValidDiscordId(userId)) {
    return {
      title: 'Discord Profile Card',
      description: 'View Discord user profile card',
      openGraph: {
        title: 'Discord Profile Card',
        description: 'View Discord user profile card',
        type: 'website',
        url: `https://discord-card-generator.vercel.app/embed?id=${userId}`,
      },
      twitter: {
        card: 'summary_large_image',
        title: 'Discord Profile Card',
        description: 'View Discord user profile card',
      },
    };
  }

  try {
    // Fetch user data in parallel
    const [lanyardData, dstnData] = await Promise.all([
      fetchLanyardData(userId),
      fetchDstnData(userId),
    ]);

    const user = lanyardData?.discord_user || dstnData?.user || null;
    const dstnUser = dstnData?.user || null;
    
    const displayName = getDisplayName(user, dstnUser);
    const avatarUrl = getAvatarUrl(user, dstnUser);
    const username = user?.username || dstnUser?.username || 'User';
    const bio = dstnData?.user_profile?.bio || '';
    
    // Create description
    let description = `${displayName}'s Discord Profile`;
    if (bio) {
      // Strip markdown and limit length
      const cleanBio = bio.replace(/[#*_~`\[\]()]/g, '').substring(0, 150);
      description = cleanBio.length < bio.length ? `${cleanBio}...` : cleanBio;
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://discord-card-generator.vercel.app';
    const embedUrl = `${siteUrl}/embed?id=${userId}`;
    
    return {
      title: `${displayName}'s Discord Profile`,
      description,
      openGraph: {
        title: `${displayName}'s Discord Profile`,
        description,
        type: 'website',
        url: embedUrl,
        images: [
          {
            url: avatarUrl,
            width: 512,
            height: 512,
            alt: `${displayName}'s avatar`,
          },
        ],
        siteName: 'Discord Profile Card Generator',
      },
      twitter: {
        card: 'summary_large_image',
        title: `${displayName}'s Discord Profile`,
        description,
        images: [avatarUrl],
      },
    };
  } catch (error) {
    // Fallback metadata on error
    return {
      title: 'Discord Profile Card',
      description: 'View Discord user profile card',
      openGraph: {
        title: 'Discord Profile Card',
        description: 'View Discord user profile card',
        type: 'website',
        url: `https://discord-card-generator.vercel.app/embed?id=${userId}`,
      },
      twitter: {
        card: 'summary_large_image',
        title: 'Discord Profile Card',
        description: 'View Discord user profile card',
      },
    };
  }
}

export default function EmbedPage({ searchParams }: EmbedPageProps) {
  return (
    <Suspense fallback={
      <div className={styles.embedBody}>
        <div className={styles.embedContainer}>
          <div style={{ 
            width: '380px', 
            height: '600px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            background: 'transparent'
          }}>
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#5865F2]"></div>
          </div>
        </div>
      </div>
    }>
      <EmbedContent />
    </Suspense>
  );
}

