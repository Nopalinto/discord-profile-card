'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import type { UrlParams } from '@/lib/utils/url';
import { cn } from '@/lib/utils';
import { showToast } from '@/components/Toast';

interface UrlGeneratorProps {
  userId: string;
  params: UrlParams;
}

export function UrlGenerator({ userId, params }: UrlGeneratorProps) {
  const [activeTab, setActiveTab] = useState<'markdown' | 'html' | 'url'>('markdown');
  const [copied, setCopied] = useState<string | null>(null);

  if (!userId || !/^\d{17,19}$/.test(userId)) {
    return null;
  }

  const baseUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/embed?${new URLSearchParams(Object.entries(params).filter(([_, v]) => v !== undefined && v !== false).map(([k, v]) => [k, String(v)])).toString()}`
    : '';

  const markdownUrl = `[![Discord Profile](${baseUrl})](https://discord.com/users/${userId})`;
  const htmlUrl = `<iframe src="${baseUrl}" width="380" height="405" frameborder="0" allowtransparency="true" loading="lazy" title="Discord Profile Card"></iframe>`;

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      showToast(`${type.charAt(0).toUpperCase() + type.slice(1)} copied to clipboard!`, 'success');
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        // Fallback for older browsers (deprecated but still needed for compatibility)
        // @deprecated document.execCommand is deprecated, but kept as fallback
        document.execCommand('copy');
        setCopied(type);
        showToast(`${type.charAt(0).toUpperCase() + type.slice(1)} copied to clipboard!`, 'success');
        setTimeout(() => setCopied(null), 2000);
      } catch (e) {
        showToast('Failed to copy to clipboard', 'error');
      }
      document.body.removeChild(textArea);
    }
  };

  const tabs = [
    { id: 'markdown' as const, label: 'Markdown' },
    { id: 'html' as const, label: 'HTML' },
    { id: 'url' as const, label: 'URL' },
  ];

  const getContent = () => {
    switch (activeTab) {
      case 'markdown':
        return markdownUrl;
      case 'html':
        return htmlUrl;
      case 'url':
        return baseUrl;
    }
  };

  return (
    <div className="space-y-1">
      <div className="flex gap-0.5 border-b border-white/5" role="tablist" aria-label="Code format tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'px-1.5 py-0.5 text-[10px] font-medium transition-colors border-b-2 -mb-[1px]',
              activeTab === tab.id
                ? 'text-zinc-200 border-[#5865F2]'
                : 'text-zinc-500 border-transparent hover:text-zinc-400'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="relative">
        <textarea
          readOnly
          value={getContent()}
          className="w-full h-20 md:h-16 text-xs md:text-[10px] font-mono bg-zinc-900/50 border border-white/5 rounded-md p-2 md:p-1.5 text-zinc-300 resize-none focus:outline-none focus:border-[#5865F2]"
          aria-label={`${activeTab} code to embed`}
          role="textbox"
          tabIndex={0}
        />
        <button
          onClick={() => copyToClipboard(getContent(), activeTab)}
          className="absolute top-1 right-1 p-2 md:p-1 rounded-md bg-zinc-800/50 border border-white/5 hover:bg-zinc-700/50 hover:border-white/10 transition-colors min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 flex items-center justify-center"
          title="Copy to clipboard"
          aria-label={`Copy ${activeTab} to clipboard`}
        >
          {copied === activeTab ? (
            <Check className="h-2.5 w-2.5 text-[#5865F2]" />
          ) : (
            <Copy className="h-2.5 w-2.5 text-zinc-400" />
          )}
        </button>
      </div>
    </div>
  );
}
