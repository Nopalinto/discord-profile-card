// Formatting utilities

export function msToHMS(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function msToMMSS(ms: number): string {
  ms = Math.max(0, Math.floor(ms));
  const t = Math.floor(ms / 1000);
  const m = Math.floor(t / 60);
  const s = t % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function normalizeStatus(status: string | null | undefined): 'online' | 'idle' | 'dnd' | 'offline' {
  if (!status) return 'offline';
  return status === 'invisible' ? 'offline' : (status as 'online' | 'idle' | 'dnd' | 'offline');
}

export function prettyStatus(status: string): string {
  if (status === 'dnd') return 'Do Not Disturb';
  return status.charAt(0).toUpperCase() + status.slice(1);
}

