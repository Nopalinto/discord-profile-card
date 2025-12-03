import type { Metadata } from 'next';
import Script from 'next/script';
import '@/styles/globals.css';
import { EntryFadeOverlay } from '@/components/EntryFadeOverlay';
import { Analytics } from '@vercel/analytics/react';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://discord-card.nopalinto.dev';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Discord Profile Card Generator - Create & Share Your Discord Presence',
    template: '%s | Discord Profile Card Generator',
  },
  description: 'Generate beautiful Discord profile cards with real-time status, activities, and Spotify integration. Customize colors, fonts, and effects. Share your Discord presence anywhere!',
  keywords: [
    'discord profile card',
    'discord presence',
    'discord status',
    'discord activity',
    'discord card generator',
    'discord embed',
    'discord profile',
    'discord status card',
    'discord rich presence',
    'discord spotify',
  ],
  authors: [{ name: 'Nopalinto' }],
  creator: 'Nopalinto',
  publisher: 'Nopalinto',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteUrl,
    siteName: 'Discord Profile Card Generator',
    title: 'Discord Profile Card Generator - Create & Share Your Discord Presence',
    description: 'Generate beautiful Discord profile cards with real-time status, activities, and Spotify integration.',
    images: [
      {
        url: `${siteUrl}/api/og`,
        width: 1200,
        height: 630,
        alt: 'Discord Profile Card Generator',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Discord Profile Card Generator',
    description: 'Generate beautiful Discord profile cards with real-time status, activities, and Spotify integration.',
    images: [`${siteUrl}/api/og`],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: siteUrl,
  },
};

const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Discord Profile Card Generator',
  description: 'Generate beautiful Discord profile cards with real-time status, activities, and Spotify integration.',
  url: siteUrl,
  applicationCategory: 'UtilityApplication',
  operatingSystem: 'Web',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
  creator: {
    '@type': 'Person',
    name: 'Nopalinto',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body>
        <Script
          id="structured-data"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <EntryFadeOverlay />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
