'use client';

import { useRef } from 'react';
import { analyseFrame, type VisemeWeights } from '@/lib/visemeAnalyzer';

/**
 * Real-time lip-sync driver.
 *
 * Replaces the lipsyncpatch library's built-in amplitude-only mouth driver
 * (which collapses every sound into a single ParamMouthOpenY value and
 * applies a "min open = 0.4" clamp that looks like an on/off switch).
 *
 * Each frame:
 *   1. Pull a time + frequency domain snapshot from our AnalyserNode.
 *   2. analyseFrame() → 7 viseme weights (open, form, A/I/U/E/O).
 *   3. One-pole low-pass smooth.
 *   4. Write all 7 standard Cubism mouth params on the core model.
 *      trySet swallows "param doesn't exist" silently, so the same code
 *      drives Mao (ParamA + co.), Natori, Hiyori — anything Cubism-3+.
 *
 * To win against the lib's own writer we set `model.lipSync = false`
 * before playback. Then the only writer of mouth params is us.
 */

interface Core {
  setParameterValueById?: (id: string, value: number) => void;
}
interface Live2DRef {
  internalModel?: { coreModel?: Core };
  lipSync?: boolean;
}

const MOUTH_PARAMS = [
  'ParamMouthOpenY',
  'ParamMouthForm',
  'ParamA',
  'ParamI',
  'ParamU',
  'ParamE',
  'ParamO'
] as const;

/** Higher = more responsive, lower = smoother. 0.45 ≈ ~50 ms 90% rise. */
const SMOOTHING_ALPHA = 0.45;

export function useAudioMouth() {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const primedRef = useRef(false);

  function getCtx(): AudioContext {
    if (!audioCtxRef.current) {
      const Ctx =
        (window.AudioContext as typeof AudioContext) ||
        ((window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext);
      audioCtxRef.current = new Ctx();
    }
    return audioCtxRef.current;
  }

  /** Unlock the AudioContext from inside a user-gesture handler. */
  async function prime(): Promise<boolean> {
    try {
      const ctx = getCtx();
      if (ctx.state === 'suspended') await ctx.resume();
      if (!primedRef.current) {
        const buf = ctx.createBuffer(1, 1, 22050);
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.connect(ctx.destination);
        src.start(0);
        primedRef.current = true;
      }
      return ctx.state === 'running';
    } catch {
      return false;
    }
  }

  async function play(
    audioBlob: Blob,
    opts: { expression?: string } = {}
  ): Promise<void> {
    await prime();

    // Apply expression via the library (it owns expression-manager state).
    if (opts.expression) {
      window.__wscLive2D?.setExpression(opts.expression);
    }

    // Take ownership of mouth params for the duration of this clip.
    const model = window.__wscLive2D?.model as Live2DRef | undefined;
    const previousLipSync = model?.lipSync;
    if (model) model.lipSync = false;

    const url = URL.createObjectURL(audioBlob);
    try {
      await playWithViseme(url, getCtx(), model?.internalModel?.coreModel);
    } finally {
      URL.revokeObjectURL(url);
      // Restore the model's lip-sync setting in case anything else uses it.
      if (model && previousLipSync !== undefined) {
        model.lipSync = previousLipSync;
      }
    }
  }

  return { play, prime };
}

async function playWithViseme(
  url: string,
  ctx: AudioContext,
  core: Core | undefined
): Promise<void> {
  if (ctx.state === 'suspended') await ctx.resume();

  const audio = new Audio(url);
  audio.crossOrigin = 'anonymous';

  const source = ctx.createMediaElementSource(audio);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 2048;
  // Internal smoothing on the analyser itself — gentle, because we
  // do our own one-pole on top.
  analyser.smoothingTimeConstant = 0.15;
  source.connect(analyser);
  analyser.connect(ctx.destination);

  const timeData = new Uint8Array(analyser.fftSize);
  const freqData = new Float32Array(analyser.frequencyBinCount);

  // smoothed viseme state
  let s: VisemeWeights = {
    open: 0,
    form: 0,
    a: 0,
    i: 0,
    u: 0,
    e: 0,
    o: 0
  };

  let rafId: number | null = null;
  let stopped = false;

  function tick() {
    if (stopped) return;
    analyser.getByteTimeDomainData(timeData);
    analyser.getFloatFrequencyData(freqData);

    const v = analyseFrame({
      timeData,
      freqData,
      sampleRate: ctx.sampleRate,
      fftSize: analyser.fftSize
    });

    // One-pole low-pass smoothing per channel
    s = {
      open: lerp(s.open, v.open, SMOOTHING_ALPHA),
      form: lerp(s.form, v.form, SMOOTHING_ALPHA),
      a: lerp(s.a, v.a, SMOOTHING_ALPHA),
      i: lerp(s.i, v.i, SMOOTHING_ALPHA),
      u: lerp(s.u, v.u, SMOOTHING_ALPHA),
      e: lerp(s.e, v.e, SMOOTHING_ALPHA),
      o: lerp(s.o, v.o, SMOOTHING_ALPHA)
    };

    if (core?.setParameterValueById) {
      trySet(core, 'ParamMouthOpenY', s.open);
      trySet(core, 'ParamMouthForm', s.form);
      trySet(core, 'ParamA', s.a);
      trySet(core, 'ParamI', s.i);
      trySet(core, 'ParamU', s.u);
      trySet(core, 'ParamE', s.e);
      trySet(core, 'ParamO', s.o);
    }

    rafId = requestAnimationFrame(tick);
  }
  rafId = requestAnimationFrame(tick);

  try {
    await new Promise<void>((resolve, reject) => {
      audio.onended = () => resolve();
      audio.onerror = () => reject(new Error('audio playback failed'));
      audio.play().catch(reject);
    });
  } finally {
    stopped = true;
    if (rafId !== null) cancelAnimationFrame(rafId);
    // Reset mouth to closed when playback ends so the avatar doesn't
    // freeze mid-syllable on the next idle frame.
    if (core?.setParameterValueById) {
      for (const id of MOUTH_PARAMS) trySet(core, id, 0);
    }
  }
}

function trySet(core: Core, id: string, value: number) {
  try {
    core.setParameterValueById?.(id, clamp01(value));
  } catch {
    /* parameter doesn't exist on this model — silent skip */
  }
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
