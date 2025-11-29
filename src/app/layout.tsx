import type { Metadata } from 'next';
import '@/styles/globals.css';
import { EntryFadeOverlay } from '@/components/EntryFadeOverlay';
import { Analytics } from '@vercel/analytics/react';

export const metadata: Metadata = {
  title: 'Discord Profile Card Generator',
  description: 'Generate your Discord presence card',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body>
        <EntryFadeOverlay />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
