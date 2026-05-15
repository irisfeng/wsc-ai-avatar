'use client';

import { useEffect, useState } from 'react';
import { Signal, Mic2, Wifi } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Video-call scene wrapper around the Live2D stage.
 *
 * Built entirely from CSS — no image assets. Pseudo-3D depth is achieved
 * through parallax layers (back wall → bookshelf → window beam → desk),
 * perspective transforms on the desk plane, soft drop-shadows under desk
 * objects, and warm radial gradients simulating ambient + key lighting.
 */
interface Props {
  /** name shown in the lower-left "tile name" overlay */
  speakerName: string;
  /** one-line subtitle under the name */
  speakerHint?: string;
  /** when true, frame border pulses to signal "AI speaking" */
  speaking?: boolean;
  /** anything you want anchored to the top-right of the camera frame */
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
    <div className={cn('relative h-full w-full overflow-hidden', className)}>
      {/* === LAYER 0 — back wall (warmest, dimmest) =================== */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background: [
            // warm wall colour graded top→bottom
            'linear-gradient(to bottom, #2a1f3d 0%, #1f1830 45%, #1a1428 100%)'
          ].join(',')
        }}
      />

      {/* === LAYER 1 — distant bookshelf (FAR PLANE, blurred) ========= */}
      <div
        aria-hidden
        className="absolute inset-x-[6%] top-[8%] h-[45%] opacity-65"
        style={{
          // each "shelf" is a horizontal band with darker bottom = receding
          background: [
            // book-spine pattern, two-tone palette + irregular widths
            'repeating-linear-gradient(90deg, #d97706 0 5px, transparent 5px 10px, #db2777 10px 17px, transparent 17px 22px, #4cc9f0 22px 30px, transparent 30px 36px, #ffd166 36px 41px, transparent 41px 48px, #7c3aed 48px 56px, transparent 56px 63px)',
            // shelf board separators
            'linear-gradient(to bottom, transparent 0%, transparent 24%, rgba(0,0,0,0.55) 24%, rgba(0,0,0,0.55) 28%, transparent 28%, transparent 56%, rgba(0,0,0,0.55) 56%, rgba(0,0,0,0.55) 60%, transparent 60%, transparent 88%, rgba(0,0,0,0.55) 88%, rgba(0,0,0,0.55) 92%)'
          ].join(','),
          filter: 'blur(0.6px)',
          // slight perspective so the shelf has subtle vanishing-point feel
          transform: 'perspective(900px) rotateX(8deg)',
          transformOrigin: 'center 30%'
        }}
      />

      {/* === LAYER 2 — soft framed picture (depth marker, left) ====== */}
      <div
        aria-hidden
        className="absolute left-[8%] top-[12%] h-[12%] w-[8%] rounded-sm border border-amber-200/30 bg-gradient-to-br from-amber-300/15 to-rose-300/10 shadow-[0_4px_12px_rgba(0,0,0,0.5)]"
        style={{ transform: 'perspective(900px) rotateX(6deg)' }}
      />

      {/* === LAYER 3 — hanging plant (right side, breaks symmetry) === */}
      <div
        aria-hidden
        className="absolute right-[7%] top-[6%] h-[18%] w-[5%]"
      >
        {/* pot */}
        <div className="absolute bottom-1/3 left-1/2 h-[20%] w-full -translate-x-1/2 rounded-b-md bg-gradient-to-b from-amber-900/70 to-amber-950/80" />
        {/* leaves — 3 ovals fanning */}
        <div className="absolute bottom-[35%] left-1/2 h-3/4 w-full -translate-x-1/2">
          <div className="absolute left-1/2 top-0 h-full w-2/3 -translate-x-[80%] -rotate-12 rounded-full bg-gradient-to-b from-emerald-700/65 to-emerald-900/45" />
          <div className="absolute left-1/2 top-0 h-full w-2/3 -translate-x-1/2 rounded-full bg-gradient-to-b from-emerald-600/65 to-emerald-900/45" />
          <div className="absolute left-1/2 top-0 h-full w-2/3 translate-x-[-20%] rotate-12 rounded-full bg-gradient-to-b from-emerald-700/65 to-emerald-900/45" />
        </div>
      </div>

      {/* === LAYER 4 — window light beam (NEAR-WALL, key light) ===== */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background: [
            // angled warm beam from upper-right
            'linear-gradient(225deg, rgba(255,209,102,0.18) 0%, rgba(255,209,102,0.06) 18%, transparent 35%)',
            // soft cyan rim from upper-left (cool fill)
            'radial-gradient(80% 60% at 8% 10%, rgba(76,201,240,0.10), transparent 50%)'
          ].join(',')
        }}
      />

      {/* === LAYER 5 — bokeh particles (foreground depth) =========== */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-40"
        style={{
          background: [
            'radial-gradient(circle at 18% 22%, rgba(255,209,102,0.55) 0, transparent 0.5%)',
            'radial-gradient(circle at 72% 14%, rgba(255,209,102,0.45) 0, transparent 0.35%)',
            'radial-gradient(circle at 24% 58%, rgba(76,201,240,0.55) 0, transparent 0.45%)',
            'radial-gradient(circle at 88% 48%, rgba(255,107,107,0.45) 0, transparent 0.35%)',
            'radial-gradient(circle at 55% 38%, rgba(255,255,255,0.30) 0, transparent 0.25%)'
          ].join(',')
        }}
      />

      {/* === LAYER 6 — the camera-frame chrome ======================= */}
      <div className="absolute inset-4 md:inset-8">
        <div
          className={cn(
            'relative h-full w-full overflow-hidden rounded-2xl border bg-black/10 transition-shadow duration-300',
            speaking
              ? 'border-wsc-accent/70 shadow-[0_0_36px_rgba(255,107,107,0.35)]'
              : 'border-white/15 shadow-[0_12px_40px_rgba(0,0,0,0.5)]'
          )}
        >
          {/* === Status bar (top of the camera frame) === */}
          <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between px-4 py-2 text-[11px] text-white/85">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded-full bg-black/45 px-2 py-0.5 backdrop-blur',
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
              <span className="rounded-full bg-black/45 px-2 py-0.5 font-mono backdrop-blur">
                {clock}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {topRightSlot}
              <span className="flex items-center gap-2 rounded-full bg-black/45 px-2 py-0.5 backdrop-blur">
                <Wifi className="h-3 w-3" />
                <Signal className="h-3 w-3 opacity-90" />
                <Mic2 className={cn('h-3 w-3', speaking && 'text-wsc-accent')} />
              </span>
            </div>
          </div>

          {/* === The Live2D canvas slot === */}
          <div className="absolute inset-0 z-10">{children}</div>

          {/* === LAYER 7 — DESK PLANE (tilted, near-field) ============== */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[42%]">
            {/* subtle vanishing-point tilt for the whole desk plane */}
            <div
              className="absolute inset-0"
              style={{
                transformStyle: 'preserve-3d',
                perspective: '1100px'
              }}
            >
              {/* sharp horizon line where the desk meets the room behind */}
              <div
                className="absolute inset-x-0 top-0 h-[2px]"
                style={{
                  background:
                    'linear-gradient(to right, transparent, rgba(255,209,102,0.55) 22%, rgba(255,209,102,0.55) 78%, transparent)',
                  boxShadow: '0 1px 6px rgba(255,209,102,0.20)'
                }}
              />

              {/* the desk top — slightly tilted forward via rotateX */}
              <div
                className="absolute inset-0"
                style={{
                  background: [
                    // base wood colour
                    'linear-gradient(to bottom, rgba(96,67,42,1) 0%, rgba(54,37,22,1) 100%)'
                  ].join(','),
                  transform: 'rotateX(6deg)',
                  transformOrigin: 'center top'
                }}
              >
                {/* wood grain */}
                <div
                  className="absolute inset-0 opacity-30"
                  style={{
                    background:
                      'repeating-linear-gradient(to right, transparent 0 26px, rgba(255,209,102,0.12) 26px 27px, transparent 27px 90px), repeating-linear-gradient(to right, transparent 0 140px, rgba(0,0,0,0.18) 140px 142px, transparent 142px 300px)'
                  }}
                />
                {/* desk-lamp pool of warm light from upper-right */}
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      'radial-gradient(120% 90% at 82% -8%, rgba(255,209,102,0.22), transparent 55%)'
                  }}
                />
                {/* contact shadow under the avatar (centred) */}
                <div
                  className="absolute inset-x-[25%] top-0 h-3"
                  style={{
                    background:
                      'radial-gradient(60% 100% at 50% 0%, rgba(0,0,0,0.55), transparent 70%)'
                  }}
                />
              </div>
            </div>

            {/* === Desk objects (sit above the tilted desktop) === */}
            {/* Laptop, left of centre, with cast shadow */}
            <div className="absolute bottom-[20%] left-[14%] z-20 w-[26%]">
              <div className="relative">
                {/* lid */}
                <div className="relative mx-auto h-12 w-full rounded-t-md bg-gradient-to-b from-zinc-700 to-zinc-900 shadow-[0_8px_18px_rgba(0,0,0,0.6)] md:h-16">
                  {/* screen */}
                  <div className="absolute inset-1 overflow-hidden rounded-sm bg-gradient-to-br from-sky-900 to-slate-900">
                    {/* fake speaker tile grid */}
                    <div className="absolute inset-1.5 grid grid-cols-2 gap-0.5 opacity-90">
                      <div className="rounded-sm bg-sky-700/40" />
                      <div className="rounded-sm bg-rose-700/40" />
                      <div className="rounded-sm bg-emerald-700/40" />
                      <div className="rounded-sm bg-amber-700/40" />
                    </div>
                    {/* small "REC" dot top-right */}
                    <div className="absolute right-1 top-1 h-1 w-1 animate-pulse rounded-full bg-rose-500" />
                  </div>
                  {/* webcam dot */}
                  <div className="absolute left-1/2 top-0.5 h-0.5 w-0.5 -translate-x-1/2 rounded-full bg-white/60" />
                </div>
                {/* base */}
                <div className="mx-auto -mt-0.5 h-1.5 w-[108%] rounded-b-md bg-gradient-to-b from-zinc-600 to-zinc-800 shadow-[0_6px_14px_rgba(0,0,0,0.55)]" />
                {/* hinge highlight */}
                <div className="mx-auto h-px w-[105%] bg-zinc-500/60" />
                {/* cast shadow ON the desk */}
                <div
                  className="absolute -bottom-1 left-1/2 h-2 w-[110%] -translate-x-1/2 rounded-full opacity-65 blur-sm"
                  style={{ background: 'rgba(0,0,0,0.55)' }}
                />
              </div>
            </div>

            {/* Coffee mug — right side, with steam + cast shadow */}
            <div className="absolute bottom-[24%] right-[16%] z-20">
              <div className="relative">
                {/* steam wisps */}
                <div className="absolute -top-5 left-1.5 text-[10px] leading-[1] text-white/40">
                  <span className="block animate-pulse">⌇</span>
                </div>
                {/* mug body */}
                <div
                  className="relative h-7 w-6 rounded-b-md rounded-t-sm shadow-[0_5px_10px_rgba(0,0,0,0.5)]"
                  style={{
                    background:
                      'linear-gradient(to bottom, #fdfbf6 0%, #d9d4c4 100%)'
                  }}
                />
                {/* handle */}
                <div className="absolute -right-1.5 top-1.5 h-3 w-2 rounded-r-full border-2 border-[#d9d4c4] bg-transparent" />
                {/* coffee surface */}
                <div className="absolute inset-x-0.5 top-0.5 h-1 rounded-t-sm bg-gradient-to-b from-amber-900 to-amber-950" />
                {/* cast shadow */}
                <div
                  className="absolute -bottom-1 left-1/2 h-1.5 w-[140%] -translate-x-1/2 rounded-full opacity-60 blur-sm"
                  style={{ background: 'rgba(0,0,0,0.5)' }}
                />
              </div>
            </div>
          </div>

          {/* === Speaker label (lower-left tile name) === */}
          <div className="pointer-events-none absolute bottom-3 left-4 z-30 flex items-end gap-2 text-white/95">
            <div className="rounded-md bg-black/55 px-2 py-1 backdrop-blur">
              <div className="text-xs font-semibold leading-tight">
                {speakerName}
              </div>
              {speakerHint && (
                <div className="text-[10px] leading-tight text-white/60">
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
