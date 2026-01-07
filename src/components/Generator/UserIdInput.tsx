'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import { Lock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface UserIdInputProps {
  value: string;
  onChange: (value: string) => void;
  // Kept for prop compatibility but unused
  isVerified?: boolean;
  updatedAt?: number;
  isInLantern?: boolean;
}

export function UserIdInput({ value, onChange, userId, isInLantern = true }: UserIdInputProps & { userId?: string }) {
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
        <div className="relative">
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
      </div>

      <div className="p-3 rounded-md border border-white/5 bg-zinc-900/50 flex flex-col items-center justify-center text-center gap-2">
        {!isAuthenticated ? (
          <>
            <p className="text-[10px] text-zinc-400 leading-normal">
              Authorize your discord user to get Recent Activity and Recent music feature when user is offline
            </p>
            <button
              onClick={async () => {
                // Open window immediately to avoid popup blockers
                const popup = window.open('', '_blank');
                if (popup) {
                  popup.document.write('Loading Discord authorization...');
                }
                
                try {
                  const result = await signIn('discord', { redirect: false });
                  if (result?.url && popup) {
                    popup.location.href = result.url;
                  } else if (popup) {
                    popup.close();
                  }
                } catch (error) {
                  console.error('Failed to start auth flow', error);
                  popup?.close();
                }
              }}
              className="px-3 py-1.5 rounded-md bg-[#5865F2] hover:bg-[#4752C4] text-white text-[10px] font-medium transition-colors"
            >
              Authorize Discord Account
            </button>
          </>
        ) : (
          <div className="flex flex-col gap-2 w-full">
            {!isOwner && (
              <p className="text-[10px] text-zinc-500 leading-normal">
                You are viewing another user's profile.
              </p>
            )}
            <button
              onClick={async () => {
                // Open window immediately to avoid popup blockers
                const popup = window.open('', '_blank');
                if (popup) {
                  popup.document.write('Signing out...');
                }

                try {
                  const result = await signOut({ redirect: false, callbackUrl: window.location.origin });
                  if (result?.url && popup) {
                    popup.location.href = result.url;
                  } else if (popup) {
                    popup.close();
                  }
                } catch (error) {
                  console.error('Failed to sign out', error);
                  popup?.close();
                }
              }}
              className="px-3 py-1.5 w-full rounded-md bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20 text-[10px] font-medium transition-colors"
            >
              Deauthorize Discord Account
            </button>
          </div>
        )}
      </div>
    </div>
  );
}


