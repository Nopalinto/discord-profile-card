// Validation utilities

export function isValidDiscordId(id: string | null | undefined): boolean {
  if (!id) return false;
  return /^\d{17,19}$/.test(id);
}

export function sanitizeExternalURL(url: string): string {
  if (!url) return '';
  
  // Allow data URIs for images (used for placeholders)
  if (url.startsWith('data:image/')) {
    return url;
  }

  try {
    const parsed = new URL(url);
    // Only allow http/https protocols
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return '';
    }
    return url;
  } catch {
    return '';
  }
}

export function escapeHtml(text: string): string {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.textContent || ''; // Use textContent instead of innerHTML for clarity
}

export function sanitizeActivityName(name: string | null | undefined): string {
  if (!name) return '';
  // Limit length to 128 characters (Discord activity names are usually short)
  const trimmed = name.trim().slice(0, 128);
  // Prevent prototype pollution
  const forbidden = ['__proto__', 'constructor', 'prototype'];
  if (forbidden.includes(trimmed.toLowerCase())) {
    return 'Invalid Activity';
  }
  return trimmed;
}

