'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSession, signIn } from 'next-auth/react';
import { Lock } from 'lucide-react';

interface RawgApiKeyInputProps {
  value: string;
  onChange: (value: string) => void;
  userId: string;
}

export function RawgApiKeyInput({ value, onChange, userId }: RawgApiKeyInputProps) {
  const { data: session, status } = useSession();

  // @ts-ignore - session.user.id is injected by our authOptions
  const sessionUserId = session?.user?.id;
  const isAuthenticated = status === 'authenticated';
  const isAuthorized = isAuthenticated && sessionUserId === userId;

  if (status === 'loading') {
    return (
      <div className="space-y-2 opacity-50 pointer-events-none">
         <div className="space-y-0.5">
          <Label className="text-[10px] text-zinc-500">RAWG API Key</Label>
          <div className="h-7 w-full bg-zinc-800 rounded-md animate-pulse" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="space-y-2">
         <div className="space-y-0.5">
          <Label className="text-[10px] text-zinc-500">RAWG API Key</Label>
          <div className="p-3 rounded-md border border-white/5 bg-zinc-900/50 flex flex-col items-center justify-center text-center gap-2">
            <Lock className="w-4 h-4 text-zinc-500" />
            <p className="text-[10px] text-zinc-400 leading-normal">
              We use Discord to confirm this is your profile. This keeps your RAWG API key secure and prevents others from editing your settings.
            </p>
            <button
              onClick={() => signIn('discord')}
              className="px-3 py-1.5 rounded-md bg-[#5865F2] hover:bg-[#4752C4] text-white text-[10px] font-medium transition-colors mt-1"
            >
              Authorize Discord Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="space-y-2">
         <div className="space-y-0.5">
          <Label className="text-[10px] text-zinc-500">RAWG API Key</Label>
          <div className="p-3 rounded-md border border-red-500/20 bg-red-500/5 flex flex-col items-center justify-center text-center gap-2">
            <Lock className="w-4 h-4 text-red-400" />
            <p className="text-[10px] text-red-300">
              You are signed in as <span className="font-mono text-red-200">{sessionUserId}</span>, but you are trying to configure <span className="font-mono text-red-200">{userId}</span>.
            </p>
            <p className="text-[10px] text-zinc-500">
              You can only set the API key for your own profile.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="space-y-0.5">
        <Label htmlFor="rawg-api-key-input" className="text-[10px] text-zinc-500">
          RAWG API Key
        </Label>
        <Input
          id="rawg-api-key-input"
          type="password"
          placeholder="Enter your RAWG API key"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete="off"
          className="h-7 text-xs bg-zinc-900/50 border border-white/5 focus:border-[#5865F2] focus:ring-0 rounded-md font-mono transition-all"
        />
      </div>
      <p className="text-[9px] text-zinc-600 leading-tight">
        Get a free API key from{' '}
        <a
          href="https://rawg.io/apidocs"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#5865F2] hover:text-[#4752C4] underline"
        >
          rawg.io/apidocs
        </a>
        {' '}to enable better game activity images and metadata.
      </p>
    </div>
  );
}