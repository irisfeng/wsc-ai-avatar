'use client';

import { useEffect, useState } from 'react';
import { Signal, Mic2, Wifi } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Video-call scene wrapper around the Live2D stage.
 *
 * Composes:
 *   - warm classroom backdrop (CSS — bookshelf silhouettes + light bokeh)
 *   - rounded "webcam window" frame with pulse-on-speaking border
 *   - top status bar: LIVE chip + clock + connection bars
 *   - bottom desk surface gradient + a tiny notebook icon
 *
 * Children = the Live2DStage canvas.
 */
interface Props {
  /** name shown under the camera frame */
  speakerName: string;
  /** one-line subtitle under the name */
  speakerHint?: string;
  /** when true, frame border pulses to signal "AI speaking" */
  speaking?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function VideoCallScene({
  speakerName,
  speakerHint,
  speaking = false,
  children,
  className
}: Props) {
  const clock = useClock();
  return (
    <div className={cn('relative h-full w-full overflow-hidden', className)}>
      {/* === Layer 0: warm classroom backdrop === */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background: [
            // warm ambient gradient
            'radial-gradient(120% 80% at 30% 35%, rgba(255,209,102,0.18), transparent 55%)',
            'radial-gradient(80% 90% at 80% 70%, rgba(76,201,240,0.10), transparent 50%)',
            'linear-gradient(to bottom, #1a1a2e 0%, #16213e 55%, #20364e 100%)'
          ].join(',')
        }}
      />
      {/* faint bookshelf silhouettes — built with repeating gradients, no images */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-[55%] opacity-[0.18]"
        style={{
          background: [
            // vertical "books" along the upper shelves
            'repeating-linear-gradient(90deg, rgba(255,209,102,0.45) 0 6px, rgba(0,0,0,0) 6px 11px, rgba(255,107,107,0.40) 11px 18px, rgba(0,0,0,0) 18px 24px, rgba(76,201,240,0.35) 24px 31px, rgba(0,0,0,0) 31px 38px)',
            // shelf horizontal bands
            'linear-gradient(to bottom, transparent 0%, transparent 18%, rgba(255,255,255,0.06) 18%, rgba(255,255,255,0.06) 20%, transparent 20%, transparent 42%, rgba(255,255,255,0.06) 42%, rgba(255,255,255,0.06) 44%, transparent 44%)'
          ].join(',')
        }}
      />
      {/* light bokeh dots for depth */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-30"
        style={{
          background: [
            'radial-gradient(circle at 12% 20%, rgba(255,209,102,0.5) 0, transparent 0.6%)',
            'radial-gradient(circle at 72% 14%, rgba(255,209,102,0.4) 0, transparent 0.4%)',
            'radial-gradient(circle at 24% 62%, rgba(76,201,240,0.5) 0, transparent 0.5%)',
            'radial-gradient(circle at 88% 48%, rgba(255,107,107,0.4) 0, transparent 0.4%)'
          ].join(',')
        }}
      />

      {/* === Layer 1: the camera frame === */}
      <div className="absolute inset-4 md:inset-8">
        <div
          className={cn(
            'relative h-full w-full overflow-hidden rounded-2xl border bg-black/30 backdrop-blur-[1px] transition-shadow duration-300',
            speaking
              ? 'border-wsc-accent/70 shadow-[0_0_36px_rgba(255,107,107,0.35)]'
              : 'border-white/15 shadow-[0_8px_36px_rgba(0,0,0,0.35)]'
          )}
        >
          {/* === Status bar (top of the camera frame) === */}
          <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between px-4 py-2 text-[11px] text-white/80">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded-full bg-black/40 px-2 py-0.5 backdrop-blur',
                  speaking && 'text-wsc-accent'
                )}
              >
                <span
                  className={cn(
                    'inline-block h-1.5 w-1.5 rounded-full',
                    speaking ? 'animate-pulse bg-wsc-accent' : 'bg-red-500'
                  )}
                />
                LIVE
              </span>
              <span className="rounded-full bg-black/40 px-2 py-0.5 font-mono backdrop-blur">
                {clock}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Wifi className="h-3 w-3" />
              <Signal className="h-3 w-3 opacity-90" />
              <Mic2 className={cn('h-3 w-3', speaking && 'text-wsc-accent')} />
            </div>
          </div>

          {/* === The Live2D canvas slot === */}
          <div className="absolute inset-0 z-10">{children}</div>

          {/* === Desk surface (bottom 38% of the frame) ===
              Tall on purpose: covers the avatar's lower body and creates the
              "sitting at a desk" illusion without needing a true seated model.
           */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[38%]">
            {/* sharp top edge of the desk — the visual "horizon" line */}
            <div
              className="absolute inset-x-0 top-0 h-px"
              style={{
                background:
                  'linear-gradient(to right, transparent, rgba(255,209,102,0.45) 20%, rgba(255,209,102,0.45) 80%, transparent)'
              }}
            />
            {/* desk surface — opaque so it actually OCCLUDES the avatar legs */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(to bottom, rgba(86, 60, 38, 0.92) 0%, rgba(60, 41, 26, 1) 100%)'
              }}
            />
            {/* subtle wood grain via horizontal lines */}
            <div
              className="absolute inset-0 opacity-25"
              style={{
                background:
                  'repeating-linear-gradient(to right, rgba(255,209,102,0.0) 0 24px, rgba(255,209,102,0.10) 24px 25px, rgba(255,209,102,0.0) 25px 80px)'
              }}
            />
            {/* warm desk-lamp highlight from upper-right */}
            <div
              className="absolute inset-0 opacity-50"
              style={{
                background:
                  'radial-gradient(140% 80% at 85% -5%, rgba(255,209,102,0.18), transparent 50%)'
              }}
            />

            {/* === Desk objects === */}
            {/* Laptop — left of centre */}
            <div className="absolute bottom-[18%] left-[12%] w-[28%]">
              {/* lid (back panel) */}
              <div className="relative mx-auto h-12 w-full rounded-t-md bg-zinc-800 shadow-[0_6px_12px_rgba(0,0,0,0.4)] md:h-16">
                {/* screen */}
                <div className="absolute inset-1 rounded-sm bg-gradient-to-br from-sky-900/80 to-slate-900/90">
                  {/* faux text rows */}
                  <div className="absolute inset-x-2 top-2 h-px bg-wsc-calm/70" />
                  <div className="absolute inset-x-2 top-3.5 h-px bg-white/30" />
                  <div className="absolute inset-x-2 top-5 h-px w-3/4 bg-white/30" />
                  <div className="absolute inset-x-2 top-6.5 h-px w-1/2 bg-white/30" />
                </div>
                {/* webcam dot */}
                <div className="absolute left-1/2 top-0.5 h-0.5 w-0.5 -translate-x-1/2 rounded-full bg-white/60" />
              </div>
              {/* base / keyboard */}
              <div className="mx-auto -mt-0.5 h-1.5 w-[108%] rounded-b-md bg-zinc-700 shadow-[0_4px_10px_rgba(0,0,0,0.35)]" />
              {/* hinge highlight */}
              <div className="mx-auto h-px w-[105%] bg-zinc-500/60" />
            </div>

            {/* Coffee mug — right side */}
            <div className="absolute bottom-[22%] right-[14%]">
              <div className="relative">
                {/* mug body */}
                <div
                  className="h-7 w-6 rounded-b-md rounded-t-sm shadow-[0_4px_8px_rgba(0,0,0,0.35)]"
                  style={{
                    background:
                      'linear-gradient(to bottom, #fdfbf6 0%, #e8e4d8 100%)'
                  }}
                />
                {/* handle */}
                <div className="absolute -right-1.5 top-1.5 h-3 w-2 rounded-r-full border-2 border-[#e8e4d8] bg-transparent" />
                {/* coffee surface */}
                <div className="absolute inset-x-0.5 top-0.5 h-1 rounded-t-sm bg-gradient-to-b from-amber-900 to-amber-950" />
                {/* steam */}
                <div className="absolute -top-3 left-1 text-[8px] text-white/30">
                  ⌇
                </div>
              </div>
            </div>

          </div>

          {/* === Speaker label (lower-left, like Zoom's tile name) === */}
          <div className="pointer-events-none absolute bottom-3 left-4 z-20 flex items-end gap-2 text-white/95">
            <div className="rounded-md bg-black/45 px-2 py-1 backdrop-blur">
              <div className="text-xs font-semibold leading-tight">{speakerName}</div>
              {speakerHint && (
                <div className="text-[10px] leading-tight text-white/55">
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
