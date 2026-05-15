'use client';

import { AVATAR_LIST, type AvatarId } from '@/lib/avatars';
import { cn } from '@/lib/utils';

interface Props {
  value: AvatarId;
  onChange: (id: AvatarId) => void;
  /**
   * When true, the picker is locked. Use this while the AI is actively
   * speaking — swapping models mid-sentence destroys the Pixi WebGL
   * context, interrupts in-flight TTS playback, and confuses the user.
   */
  disabled?: boolean;
  className?: string;
}

export function AvatarPicker({ value, onChange, disabled = false, className }: Props) {
  const title = disabled
    ? '说话中无法切换数字人'
    : undefined;

  return (
    <div
      className={cn(
        'pointer-events-auto inline-flex items-center gap-0.5 rounded-full border p-0.5 text-[11px] backdrop-blur-md transition-opacity duration-300',
        disabled
          ? 'border-white/[0.05] opacity-50 cursor-not-allowed'
          : 'border-white/[0.10] text-white/85',
        className
      )}
      style={{
        background:
          'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)'
      }}
      // surface the reason to assistive tech + plain hover
      aria-disabled={disabled}
      title={title}
    >
      {AVATAR_LIST.map((a) => {
        const active = value === a.id;
        // The currently-selected chip is always non-clickable (no-op), but
        // we DON'T grey it out — losing the visual marker mid-call is
        // worse than the redundancy.
        const lockedOut = disabled && !active;
        return (
          <button
            key={a.id}
            type="button"
            onClick={() => {
              if (lockedOut || active) return;
              onChange(a.id);
            }}
            disabled={lockedOut}
            aria-pressed={active}
            aria-disabled={lockedOut || undefined}
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2.5 py-1 transition-colors',
              active
                ? 'bg-violet-500/90 text-white shadow-[0_0_18px_-4px_rgba(139,92,246,0.7)]'
                : lockedOut
                  ? 'cursor-not-allowed text-white/35'
                  : 'text-white/70 hover:bg-white/[0.08] hover:text-white'
            )}
            title={
              lockedOut
                ? '说话中无法切换数字人'
                : active
                  ? `${a.blurb}（当前）`
                  : `切换到 ${a.label}`
            }
          >
            <span aria-hidden>{a.emoji}</span>
            <span className="font-medium tracking-tight">
              {a.label.split(' · ')[1] ?? a.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
