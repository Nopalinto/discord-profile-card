'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ImageOptionsProps {
  bannerUrl: string;
  bannerColor: string;
  imageWidth: number;
  onChange: (key: string, value: string | number) => void;
}

export function ImageOptions({ bannerUrl, bannerColor, imageWidth, onChange }: ImageOptionsProps) {
  const colorValue = bannerColor && /^#[0-9A-Fa-f]{6}$/.test(bannerColor) ? bannerColor : '#5865F2';

  return (
    <div className="col-span-2 space-y-2">
      <div className="grid grid-cols-2 gap-1.5">
        <div className="space-y-0.5">
          <Label htmlFor="banner-url" className="text-[10px] text-zinc-500">
            Banner URL
          </Label>
          <Input
            id="banner-url"
            type="url"
            placeholder="https://example.com/banner.png"
            value={bannerUrl}
            onChange={(e) => onChange('bannerUrl', e.target.value)}
            className="h-7 text-xs bg-zinc-900/50 border border-white/5 focus:border-[#5865F2] focus:ring-0 rounded-md"
          />
        </div>

        <div className="space-y-0.5">
          <Label htmlFor="image-width" className="text-[10px] text-zinc-500">
            Width (px)
          </Label>
          <Input
            id="image-width"
            type="number"
            min={100}
            max={2048}
            value={imageWidth}
            onChange={(e) => onChange('imageWidth', parseInt(e.target.value) || 512)}
            className="h-7 text-xs bg-zinc-900/50 border border-white/5 focus:border-[#5865F2] focus:ring-0 rounded-md tabular-nums"
          />
        </div>
      </div>

      <div className="space-y-0.5">
        <Label htmlFor="banner-color" className="text-[10px] text-zinc-500">
          Banner Color
        </Label>
        <div className="flex gap-1.5">
          <input
            type="color"
            id="banner-color"
            value={colorValue}
            onChange={(e) => onChange('bannerColor', e.target.value)}
            className="h-7 w-7 flex-shrink-0 cursor-pointer rounded-md border border-white/5 bg-zinc-900/50"
            aria-label="Pick banner color"
          />
          <Input
            id="banner-color-hex"
            value={bannerColor}
            placeholder="#5865F2 (auto)"
            onChange={(e) => {
              const hex = e.target.value;
              if (/^#[0-9A-F]{6}$/i.test(hex) || hex === '') {
                onChange('bannerColor', hex);
              }
            }}
            className="h-7 text-xs bg-zinc-900/50 border border-white/5 focus:border-[#5865F2] focus:ring-0 rounded-md font-mono"
          />
        </div>
        <p className="text-[9px] text-zinc-600 leading-tight">
          Overrides your Discord banner color (the API can't always see it). Leave empty for auto.
        </p>
      </div>
    </div>
  );
}
