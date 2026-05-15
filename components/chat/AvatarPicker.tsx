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
        'inline-flex items-center gap-0.5 rounded-full border p-0.5 text-[11px] backdrop-blur-md transition-opacity duration-300',
        // The single source of truth for "can users interact":
        //   disabled === false → pointer-events-auto + full opacity
        //   disabled === true  → pointer-events-none + 50% opacity + not-allowed cursor
        // Using a hard CSS pointer-events-none belt-AND-suspenders the
        // native `disabled` attribute, so even synthetic events,
        // touch-tap libraries, or stray click-through behaviour can't
        // reach the buttons mid-speech.
        disabled
          ? 'pointer-events-none opacity-50 cursor-not-allowed border-white/[0.05]'
          : 'pointer-events-auto border-white/[0.10] text-white/85',
        className
      )}
      style={{
        background:
          'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)'
      }}
      aria-disabled={disabled}
      title={title}
    >
      {AVATAR_LIST.map((a) => {
        const active = value === a.id;
        const lockedOut = disabled && !active;
        return (
          <button
            key={a.id}
            type="button"
            onClick={(e) => {
              // Defence-in-depth: even if pointer-events somehow leaked,
              // the click handler itself short-circuits.
              if (lockedOut || disabled || active) {
                e.preventDefault();
                e.stopPropagation();
                return;
              }
              onChange(a.id);
            }}
            disabled={lockedOut}
            tabIndex={lockedOut ? -1 : 0}
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
