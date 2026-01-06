'use client';

import { useSession, signIn } from 'next-auth/react';
import { Lock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface UserIdInputProps {
  value: string;
  onChange: (value: string) => void;
  // Kept for prop compatibility but unused
  isVerified?: boolean;
  updatedAt?: number;
}

export function UserIdInput({ value, onChange, userId }: UserIdInputProps & { userId?: string }) {
  const { data: session, status } = useSession();
  
  // @ts-ignore
  const sessionUserId = session?.user?.id;
  const isAuthenticated = status === 'authenticated';
  const isOwner = isAuthenticated && sessionUserId === value;

  return (
    <div className="space-y-2">
      <div className="space-y-0.5">
        <Label htmlFor="user-id-input" className="text-[10px] text-zinc-500">
          User ID
        </Label>
        <Input
          id="user-id-input"
          type="text"
          placeholder="915480322328649758"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete="off"
          className="h-7 text-xs bg-zinc-900/50 border border-white/5 focus:border-[#5865F2] focus:ring-0 rounded-md tabular-nums font-mono transition-all"
        />
      </div>

      {!isOwner && (
        <div className="p-3 rounded-md border border-white/5 bg-zinc-900/50 flex flex-col items-center justify-center text-center gap-2">
          {!isAuthenticated ? (
            <>
              <p className="text-[10px] text-zinc-400 leading-normal">
                Authorize your discord user to get Recent Activity and Recent music feature when user is offline
              </p>
              <button
                onClick={() => signIn('discord')}
                className="px-3 py-1.5 rounded-md bg-[#5865F2] hover:bg-[#4752C4] text-white text-[10px] font-medium transition-colors"
              >
                Authorize Discord Account
              </button>
            </>
          ) : (
            <p className="text-[10px] text-zinc-500 leading-normal">
              You are viewing another user's profile. Log in with this ID to enable offline tracking.
            </p>
          )}
        </div>
      )}
    </div>
  );
}


