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
        'pointer-events-auto inline-flex items-center gap-0.5 rounded-full border border-white/[0.10] p-0.5 text-[11px] text-white/85 backdrop-blur-md',
        className
      )}
      style={{
        background:
          'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)'
      }}
    >
      {AVATAR_LIST.map((a) => (
        <button
          key={a.id}
          type="button"
          onClick={() => onChange(a.id)}
          aria-pressed={value === a.id}
          className={cn(
            'inline-flex items-center gap-1 rounded-full px-2.5 py-1 transition-colors',
            value === a.id
              ? 'bg-violet-500/90 text-white shadow-[0_0_18px_-4px_rgba(139,92,246,0.7)]'
              : 'text-white/70 hover:bg-white/[0.08] hover:text-white'
          )}
          title={a.blurb}
        >
          <span aria-hidden>{a.emoji}</span>
          <span className="font-medium tracking-tight">
            {a.label.split(' · ')[1] ?? a.label}
          </span>
        </button>
      ))}
    </div>
  );
}
