'use client';

import { useEffect, useState } from 'react';
import { Mic, MicOff, PhoneOff, Captions, Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Video-call scene — Pika-style.
 *
 * Hard rules learned from observation:
 *  1. NO desk / laptop / mug / room props. They make the avatar look
 *     like a photo on a wall instead of a live call participant.
 *  2. The chrome IS the video-call app — circular control buttons at
 *     bottom, live caption strip, "you" thumbnail in the corner.
 *  3. The avatar fills the tile. Heads-and-shoulders crop. Negative
 *     space pushed to the edges where the chrome lives.
 *  4. Speaking indicator = big audio waveform overlay, not buried in
 *     a tiny laptop screen.
 *  5. One accent colour (violet/indigo) for everything that's "live".
 */
interface Props {
  speakerName: string;
  speakerHint?: string;
  speaking?: boolean;
  /** latest sentence the AI just said — shown as a live caption */
  caption?: string;
  /** avatar picker / mode chips, anchored top-right */
  topRightSlot?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function VideoCallScene({
  speakerName,
  speakerHint,
  speaking = false,
  caption,
  topRightSlot,
  children,
  className
}: Props) {
  const clock = useClock();
  const callDuration = useCallDuration();

  return (
    <div
      className={cn('relative h-full w-full overflow-hidden', className)}
      style={{ background: '#070611' }}
    >
      {/* === Ambient backdrop — a single violet bloom that follows
              wherever the head-shoulders crop centres the avatar ====== */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background: [
            'radial-gradient(72% 60% at 50% 40%, rgba(124, 58, 237, 0.32), transparent 65%)',
            'radial-gradient(50% 70% at 8% 80%, rgba(56, 189, 248, 0.10), transparent 60%)',
            'radial-gradient(120% 90% at 50% 110%, rgba(0,0,0,0.65), transparent 50%)',
            'linear-gradient(180deg, #0b0918 0%, #060410 100%)'
          ].join(',')
        }}
      />

      {/* === Live2D canvas takes the full stage so the avatar can fill ==
              the frame end-to-end. Chrome sits ON TOP. */}
      <div className="absolute inset-0 z-10">{children}</div>

      {/* === Vignette to focus attention on the head/shoulders area === */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-20"
        style={{
          background:
            'radial-gradient(120% 80% at 50% 35%, transparent 38%, rgba(0,0,0,0.45) 80%, rgba(0,0,0,0.75) 100%)'
        }}
      />

      {/* === TOP CHROME ============================================== */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-40 flex items-start justify-between gap-3 p-4">
        {/* Call meta — left */}
        <div className="pointer-events-auto flex flex-col gap-2">
          <GlassPill>
            <span
              className={cn(
                'inline-flex h-1.5 w-1.5 rounded-full',
                speaking ? 'animate-pulse bg-violet-400' : 'bg-rose-500'
              )}
            />
            <span
              className={cn(
                'font-semibold tracking-wide',
                speaking && 'text-violet-200'
              )}
            >
              LIVE
            </span>
            <span className="mx-1 h-3 w-px bg-white/15" />
            <span className="font-mono tabular-nums text-white/70">
              {callDuration}
            </span>
          </GlassPill>
          <GlassPill subtle>
            <span className="text-white/60">WSC Debate Call</span>
            <span className="mx-1 h-3 w-px bg-white/10" />
            <span className="text-white/40 tabular-nums">{clock}</span>
          </GlassPill>
        </div>

        {/* Avatar picker / mode chips — right */}
        <div className="pointer-events-auto flex flex-col items-end gap-2">
          {topRightSlot}
        </div>
      </div>

      {/* === SPEAKING WAVEFORM (centre-bottom, above caption) ==========
              Big, prominent, Pika-style 24-bar live audio bar. */}
      {speaking && (
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[58%] z-30 flex h-12 -translate-x-1/2 items-center gap-[3px]"
        >
          {Array.from({ length: 24 }).map((_, i) => (
            <span
              key={i}
              className="w-[3px] rounded-full bg-violet-400/85"
              style={{
                height: `${randomBarHeight(i)}%`,
                animation: `wsc-bar 0.${800 + (i % 5) * 80}s ease-in-out infinite`,
                animationDelay: `${(i % 7) * 80}ms`
              }}
            />
          ))}
        </div>
      )}

      {/* === LIVE CAPTION STRIP (bottom-centre, above call controls) ===
              When AI is speaking we show the last sentence as a
              live subtitle — Pika's signature element. */}
      {caption && (
        <div className="pointer-events-none absolute inset-x-0 bottom-28 z-40 flex justify-center px-6">
          <div
            className="max-w-2xl rounded-xl border border-white/[0.08] px-4 py-2 text-center text-sm leading-snug text-white/95 backdrop-blur-md"
            style={{
              background:
                'linear-gradient(180deg, rgba(20,16,40,0.85) 0%, rgba(12,9,28,0.85) 100%)'
            }}
          >
            {caption}
          </div>
        </div>
      )}

      {/* === BOTTOM CONTROL BAR — circular call buttons ==============
              Faux mute / captions / leave / speaker — purely decorative
              but instantly read as "I am inside a call app". */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-40 flex items-end justify-between gap-3 p-4">
        {/* Speaker name tile — bottom-left */}
        <div className="pointer-events-auto rounded-xl border border-white/[0.08] px-3 py-2 text-white/95 backdrop-blur-md"
          style={{
            background:
              'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)'
          }}
        >
          <div className="flex items-center gap-2 text-xs font-semibold leading-tight">
            <span
              className={cn(
                'inline-block h-1.5 w-1.5 rounded-full',
                speaking ? 'animate-pulse bg-violet-400' : 'bg-white/40'
              )}
            />
            {speakerName}
          </div>
          {speakerHint && (
            <div className="mt-0.5 text-[10px] leading-tight text-white/55">
              {speakerHint}
            </div>
          )}
        </div>

        {/* Centre: control cluster */}
        <div className="pointer-events-auto flex items-center gap-2">
          <CallButton tone="default" icon={<Mic className="h-4 w-4" />} hint="mic" />
          <CallButton
            tone="default"
            icon={<Captions className="h-4 w-4" />}
            hint="captions"
            active={!!caption}
          />
          <CallButton
            tone="default"
            icon={<Volume2 className="h-4 w-4" />}
            hint="speaker"
          />
          <CallButton tone="leave" icon={<PhoneOff className="h-5 w-5" />} hint="leave" />
        </div>

        {/* Self-view tile — bottom-right ("YOU" thumbnail) */}
        <div className="pointer-events-auto h-16 w-24 overflow-hidden rounded-lg border border-white/[0.10] shadow-[0_8px_20px_rgba(0,0,0,0.55)]"
          style={{
            background:
              'linear-gradient(135deg, rgba(124,58,237,0.18) 0%, rgba(56,189,248,0.10) 100%)'
          }}
        >
          {/* faux self-cam: avatar silhouette of user */}
          <div className="relative h-full w-full">
            <div className="absolute left-1/2 top-[28%] h-5 w-5 -translate-x-1/2 rounded-full bg-white/25" />
            <div className="absolute left-1/2 top-[55%] h-6 w-9 -translate-x-1/2 rounded-t-full bg-white/20" />
            <div className="absolute bottom-1 left-1.5 text-[9px] font-semibold tracking-wide text-white/70">
              YOU
            </div>
            <div className="absolute bottom-1 right-1.5">
              <MicOff className="h-2.5 w-2.5 text-rose-400/90" />
            </div>
          </div>
        </div>
      </div>

      {/* keyframes for the live waveform bars live in app/globals.css —
          Next 15 App Router doesn't ship styled-jsx by default and we
          have a one-rule animation, so a global keyframe is the
          right-sized hammer here. */}
    </div>
  );
}

// ─── primitives ────────────────────────────────────────────────────────

function GlassPill({
  children,
  subtle = false
}: {
  children: React.ReactNode;
  subtle?: boolean;
}) {
  return (
    <span
      className={cn(
        'pointer-events-auto inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] backdrop-blur-md',
        subtle
          ? 'border-white/[0.06] text-white/75'
          : 'border-white/[0.10] text-white/90'
      )}
      style={{
        background: subtle
          ? 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.015) 100%)'
          : 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.025) 100%)'
      }}
    >
      {children}
    </span>
  );
}

function CallButton({
  icon,
  hint,
  tone,
  active = false
}: {
  icon: React.ReactNode;
  hint: string;
  tone: 'default' | 'leave';
  active?: boolean;
}) {
  const base =
    'group relative inline-flex h-11 w-11 items-center justify-center rounded-full border backdrop-blur-md transition-all duration-200';
  const palette =
    tone === 'leave'
      ? 'border-rose-400/50 bg-rose-500/85 text-white shadow-[0_0_22px_-4px_rgba(244,63,94,0.75)] hover:bg-rose-500'
      : active
      ? 'border-violet-400/60 bg-violet-500/40 text-white shadow-[0_0_18px_-4px_rgba(139,92,246,0.75)]'
      : 'border-white/[0.12] text-white/85 hover:bg-white/[0.08]';
  const inactiveBg =
    tone === 'default' && !active
      ? 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)'
      : undefined;
  return (
    <button
      type="button"
      aria-label={hint}
      title={hint}
      className={cn(base, palette)}
      style={inactiveBg ? { background: inactiveBg } : undefined}
    >
      {icon}
    </button>
  );
}

function useClock(): string {
  const [now, setNow] = useState<string>(() => fmt(new Date()));
  useEffect(() => {
    const id = setInterval(() => setNow(fmt(new Date())), 15_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

/** Counts up from mount — feels like a real call duration */
function useCallDuration(): string {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const mm = String(Math.floor(secs / 60)).padStart(2, '0');
  const ss = String(secs % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

function fmt(d: Date): string {
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

/** Deterministic-ish bar heights so re-renders don't flash randomly. */
function randomBarHeight(i: number): number {
  const seq = [40, 65, 85, 70, 55, 75, 90, 60, 45, 70, 80, 50, 65, 90, 55, 70, 45, 80, 60, 70, 55, 85, 65, 50];
  return seq[i % seq.length];
}
