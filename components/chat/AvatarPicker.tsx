'use client';

import { AVATAR_LIST, type AvatarId } from '@/lib/avatars';
import { cn } from '@/lib/utils';

interface Props {
  value: AvatarId;
  onChange: (id: AvatarId) => void;
  className?: string;
}

/**
 * Compact pill-group sitting in the camera-frame top bar — switches the
 * Live2D model live. Disable swap mid-speech if you don't want to
 * interrupt audio: the parent currently does NOT prevent it; the new
 * model just takes over the canvas while the existing TTS finishes.
 */
export function AvatarPicker({ value, onChange, className }: Props) {
  return (
    <div
      className={cn(
        'pointer-events-auto inline-flex items-center gap-1 rounded-full bg-black/45 px-1 py-0.5 text-[11px] text-white/85 backdrop-blur',
        className
      )}
    >
      {AVATAR_LIST.map((a) => (
        <button
          key={a.id}
          type="button"
          onClick={() => onChange(a.id)}
          aria-pressed={value === a.id}
          className={cn(
            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 transition-colors',
            value === a.id
              ? 'bg-white/95 text-wsc-ink'
              : 'text-white/75 hover:bg-white/15 hover:text-white'
          )}
          title={a.blurb}
        >
          <span aria-hidden>{a.emoji}</span>
          <span>{a.label.split(' · ')[1] ?? a.label}</span>
        </button>
      ))}
    </div>
  );
}
