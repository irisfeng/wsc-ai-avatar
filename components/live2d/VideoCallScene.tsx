'use client';

import { useEffect, useState } from 'react';
import { Signal, Mic2, Wifi } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Video-call scene wrapper — Pika-inspired aesthetic.
 *
 * Design rules (one liners):
 *  - **Deep charcoal** background, never warm tones.
 *  - **Single accent**: violet/indigo. No second palette.
 *  - **Glass morphism** on every floating UI chip (backdrop blur + 6%
 *    white fill + 1px white-12% border).
 *  - **One key light** — cool radial from upper-left; subtle warm fill
 *    from upper-right at <20% alpha so the avatar's skin still reads.
 *  - **No decoration that competes with the avatar.** No bookshelves,
 *    no plants, no picture frames — just a desk, a laptop, a mug.
 *  - Borders/radii are consistent: 16px outer frame, 12px chips, 8px desk
 *    objects.
 */
interface Props {
  speakerName: string;
  speakerHint?: string;
  speaking?: boolean;
  topRightSlot?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function VideoCallScene({
  speakerName,
  speakerHint,
  speaking = false,
  topRightSlot,
  children,
  className
}: Props) {
  const clock = useClock();
  return (
    <div
      className={cn('relative h-full w-full overflow-hidden', className)}
      style={{ background: '#08060f' }}
    >
      {/* === Backdrop: deep charcoal with violet radial glow ============
          Two radial gradients establish depth without illustration —
          one violet pulse from upper-left as the key light, one cool
          indigo wash on the far right for ambient fill. */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background: [
            'radial-gradient(80% 70% at 18% 18%, rgba(124, 58, 237, 0.32), transparent 55%)',
            'radial-gradient(70% 80% at 92% 38%, rgba(99, 102, 241, 0.18), transparent 60%)',
            'radial-gradient(120% 80% at 50% 110%, rgba(0,0,0,0.6), transparent 60%)',
            'linear-gradient(180deg, #0d0a1a 0%, #08060f 100%)'
          ].join(',')
        }}
      />

      {/* === Subtle film grain (low-frequency dots, near-monochrome) ====
          Two faint white pin-pricks instead of the previous 5 coloured
          bokeh dots — depth cue without colour noise. */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-25"
        style={{
          background: [
            'radial-gradient(circle at 70% 22%, rgba(255,255,255,0.20) 0, transparent 0.25%)',
            'radial-gradient(circle at 30% 70%, rgba(255,255,255,0.15) 0, transparent 0.22%)'
          ].join(',')
        }}
      />

      {/* === Camera frame ================================================
          Glass-morphism border. Pulses violet on speaking. */}
      <div className="absolute inset-4 md:inset-8">
        <div
          className={cn(
            'relative h-full w-full overflow-hidden rounded-2xl border backdrop-blur-[2px] transition-shadow duration-500',
            speaking
              ? 'border-violet-400/45 shadow-[0_0_42px_-4px_rgba(139,92,246,0.55),0_8px_36px_rgba(0,0,0,0.55)]'
              : 'border-white/[0.09] shadow-[0_8px_42px_rgba(0,0,0,0.55)]'
          )}
          style={{
            background:
              'linear-gradient(135deg, rgba(255,255,255,0.025) 0%, rgba(255,255,255,0.005) 100%)'
          }}
        >
          {/* === Status bar (top) ===
              Three glass pills: LIVE+clock, avatar picker slot, signal */}
          <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-center justify-between px-4 py-3">
            <GlassPill>
              <span className="flex items-center gap-1.5">
                <span
                  className={cn(
                    'inline-block h-1.5 w-1.5 rounded-full',
                    speaking
                      ? 'animate-pulse bg-violet-400'
                      : 'bg-rose-500'
                  )}
                />
                <span
                  className={cn(
                    'font-medium tracking-wide',
                    speaking && 'text-violet-200'
                  )}
                >
                  LIVE
                </span>
              </span>
              <span className="mx-2 h-3 w-px bg-white/15" />
              <span className="font-mono tabular-nums text-white/70">
                {clock}
              </span>
            </GlassPill>
            <div className="flex items-center gap-2">
              {topRightSlot}
              <GlassPill>
                <Wifi className="h-3 w-3 text-white/70" />
                <Signal className="h-3 w-3 text-white/70" />
                <Mic2
                  className={cn(
                    'h-3 w-3',
                    speaking ? 'text-violet-300' : 'text-white/70'
                  )}
                />
              </GlassPill>
            </div>
          </div>

          {/* === Live2D canvas === */}
          <div className="absolute inset-0 z-10">{children}</div>

          {/* === Vignette to push the avatar centre forward === */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-10"
            style={{
              background:
                'radial-gradient(140% 100% at 50% 40%, transparent 50%, rgba(0,0,0,0.45) 100%)'
            }}
          />

          {/* === DESK ====================================================
              Single tilted plane, dark walnut tone, perfectly minimal.
              The desk's top edge is a thin violet-tinted highlight that
              echoes the key light. */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-[44%]">
            {/* horizon highlight (violet-tinted) */}
            <div
              className="absolute inset-x-0 top-0 h-px"
              style={{
                background:
                  'linear-gradient(to right, transparent, rgba(167, 139, 250, 0.45) 25%, rgba(167, 139, 250, 0.45) 75%, transparent)',
                boxShadow: '0 1px 14px rgba(167, 139, 250, 0.18)'
              }}
            />
            {/* desk top — tilted forward */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(to bottom, #1a1424 0%, #0d0817 100%)',
                transform: 'rotateX(5deg)',
                transformOrigin: 'center top'
              }}
            >
              {/* matte sheen reflecting the key light */}
              <div
                className="absolute inset-0"
                style={{
                  background:
                    'radial-gradient(110% 70% at 22% -10%, rgba(124, 58, 237, 0.10), transparent 55%)'
                }}
              />
              {/* contact shadow under avatar */}
              <div
                className="absolute inset-x-[20%] top-0 h-4"
                style={{
                  background:
                    'radial-gradient(70% 100% at 50% 0%, rgba(0,0,0,0.75), transparent 75%)'
                }}
              />
              {/* very faint horizontal grain (not wood, more like fine matte) */}
              <div
                className="absolute inset-0 opacity-20 mix-blend-overlay"
                style={{
                  background:
                    'repeating-linear-gradient(to right, transparent 0 90px, rgba(255,255,255,0.04) 90px 91px, transparent 91px 220px)'
                }}
              />
            </div>

            {/* === Laptop (centre-left, glass + dark) === */}
            <div className="absolute bottom-[22%] left-[15%] z-30 w-[26%]">
              <div className="relative">
                <div className="relative mx-auto h-14 w-full rounded-t-lg bg-gradient-to-b from-zinc-800 to-zinc-950 shadow-[0_10px_22px_rgba(0,0,0,0.65)] md:h-16">
                  {/* screen */}
                  <div className="absolute inset-1.5 overflow-hidden rounded-md bg-gradient-to-br from-violet-950/70 via-indigo-950 to-slate-950">
                    {/* Pika-style: a single subtle waveform / connection mark */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="flex items-end gap-0.5">
                        {[3, 5, 8, 6, 4, 7, 5, 3].map((h, i) => (
                          <div
                            key={i}
                            className="w-0.5 rounded-full bg-violet-400/70"
                            style={{ height: `${h}px` }}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="absolute right-1.5 top-1 h-1 w-1 animate-pulse rounded-full bg-rose-500" />
                  </div>
                  <div className="absolute left-1/2 top-1 h-0.5 w-0.5 -translate-x-1/2 rounded-full bg-white/40" />
                </div>
                <div className="mx-auto -mt-0.5 h-2 w-[110%] rounded-b-lg bg-gradient-to-b from-zinc-700 to-zinc-900 shadow-[0_6px_18px_rgba(0,0,0,0.6)]" />
                <div className="mx-auto h-px w-[107%] bg-zinc-600/40" />
                {/* cast shadow on desk */}
                <div
                  className="absolute -bottom-2 left-1/2 h-3 w-[115%] -translate-x-1/2 rounded-full opacity-65 blur-md"
                  style={{ background: 'rgba(0,0,0,0.7)' }}
                />
              </div>
            </div>

            {/* === Coffee mug (right, paler ceramic, violet steam) === */}
            <div className="absolute bottom-[26%] right-[16%] z-30">
              <div className="relative">
                <div className="absolute -top-5 left-1.5 text-[11px] leading-[1] text-violet-200/35">
                  <span className="block animate-pulse">⌇</span>
                </div>
                <div
                  className="relative h-8 w-6 rounded-b-md rounded-t-sm shadow-[0_5px_12px_rgba(0,0,0,0.6)]"
                  style={{
                    background:
                      'linear-gradient(180deg, #e2e0e6 0%, #b6b3bd 100%)'
                  }}
                />
                <div className="absolute -right-1.5 top-2 h-3 w-2 rounded-r-full border-2 border-[#b6b3bd] bg-transparent" />
                <div className="absolute inset-x-0.5 top-0.5 h-1 rounded-t-sm bg-gradient-to-b from-amber-950 to-stone-950" />
                <div
                  className="absolute -bottom-1.5 left-1/2 h-2 w-[140%] -translate-x-1/2 rounded-full opacity-65 blur-md"
                  style={{ background: 'rgba(0,0,0,0.65)' }}
                />
              </div>
            </div>
          </div>

          {/* === Speaker tile (lower-left, glass) === */}
          <div className="pointer-events-none absolute bottom-3 left-4 z-40">
            <div
              className="rounded-xl border border-white/[0.09] px-3 py-1.5 text-white/95 backdrop-blur-md"
              style={{
                background:
                  'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)'
              }}
            >
              <div className="text-xs font-semibold tracking-tight leading-tight">
                {speakerName}
              </div>
              {speakerHint && (
                <div className="mt-0.5 text-[10px] leading-tight text-white/55">
                  {speakerHint}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── primitives ────────────────────────────────────────────────────────

function GlassPill({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="pointer-events-none inline-flex items-center gap-1.5 rounded-full border border-white/[0.10] px-3 py-1 text-[11px] text-white/85 backdrop-blur-md"
      style={{
        background:
          'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)'
      }}
    >
      {children}
    </span>
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

function fmt(d: Date): string {
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}
