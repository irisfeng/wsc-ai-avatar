'use client';

import { useRef } from 'react';
import { analyseFrame, type VisemeWeights } from '@/lib/visemeAnalyzer';

/**
 * Real-time lip-sync driver.
 *
 * The PREVIOUS implementation used `requestAnimationFrame` for writes,
 * which runs AFTER Pixi's ticker. By then the InternalModel had already
 * called `coreModel.update()` (which consumed the current param values
 * to compute the mesh) AND `loadParameters()` (which restored the
 * pre-write snapshot). So our writes either lagged a full frame OR
 * were ignored, hence "mouth barely moves".
 *
 * CURRENT approach: subscribe to the InternalModel's `beforeModelUpdate`
 * event. The lib emits this between expression/physics application and
 * `coreModel.update()`, so our param writes are consumed in the SAME
 * frame's render. After `loadParameters()` they're discarded — exactly
 * what we want, because next frame we write fresh values.
 *
 * The audio AnalyserNode is created once per playback (per Blob) and
 * the handler closure reads from it every frame.
 */

interface Core {
  setParameterValueById?: (id: string, value: number) => void;
  addParameterValueById?: (id: string, value: number, weight?: number) => void;
}
interface EventEmitterLike {
  on?: (event: string, fn: () => void) => void;
  off?: (event: string, fn: () => void) => void;
}
interface InternalModelLike extends EventEmitterLike {
  coreModel?: Core;
}
interface Live2DRef {
  internalModel?: InternalModelLike;
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

/** Higher = more responsive, lower = smoother. 0.55 ≈ ~40 ms 90% rise. */
const SMOOTHING_ALPHA = 0.55;

export function useAudioMouth() {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const primedRef = useRef(false);
  const stopCurrentRef = useRef<(() => void) | null>(null);

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

    if (opts.expression) {
      window.__wscLive2D?.setExpression(opts.expression);
    }

    const model = window.__wscLive2D?.model as Live2DRef | undefined;
    const previousLipSync = model?.lipSync;
    if (model) model.lipSync = false;

    const url = URL.createObjectURL(audioBlob);
    try {
      await playWithViseme(url, getCtx(), model, (stopFn) => {
        stopCurrentRef.current = stopFn;
      });
    } finally {
      URL.revokeObjectURL(url);
      stopCurrentRef.current = null;
      if (model && previousLipSync !== undefined) {
        model.lipSync = previousLipSync;
      }
    }
  }

  function stop(): void {
    stopCurrentRef.current?.();
    stopCurrentRef.current = null;
  }

  return { play, prime, stop };
}

async function playWithViseme(
  url: string,
  ctx: AudioContext,
  model: Live2DRef | undefined,
  onStopReady: (stopFn: (() => void) | null) => void
): Promise<void> {
  if (ctx.state === 'suspended') await ctx.resume();

  const audio = new Audio(url);
  audio.crossOrigin = 'anonymous';

  const source = ctx.createMediaElementSource(audio);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 2048;
  analyser.smoothingTimeConstant = 0.15;
  source.connect(analyser);
  analyser.connect(ctx.destination);

  const timeData = new Uint8Array(analyser.fftSize);
  const freqData = new Float32Array(analyser.frequencyBinCount);

  // Smoothed viseme state, persistent across frames for one-pole low-pass.
  let s: VisemeWeights = {
    open: 0,
    form: 0,
    a: 0,
    i: 0,
    u: 0,
    e: 0,
    o: 0
  };

  const core = model?.internalModel?.coreModel;
  const internalModel = model?.internalModel;

  // The handler runs INSIDE Pixi's ticker, right before coreModel.update().
  // That timing is essential: writes here are used for the current frame's
  // mesh computation, instead of being discarded by loadParameters().
  const onBeforeModelUpdate = () => {
    if (!core) return;
    analyser.getByteTimeDomainData(timeData);
    analyser.getFloatFrequencyData(freqData);

    const v = analyseFrame({
      timeData,
      freqData,
      sampleRate: ctx.sampleRate,
      fftSize: analyser.fftSize
    });

    s = {
      open: lerp(s.open, v.open, SMOOTHING_ALPHA),
      form: lerp(s.form, v.form, SMOOTHING_ALPHA),
      a: lerp(s.a, v.a, SMOOTHING_ALPHA),
      i: lerp(s.i, v.i, SMOOTHING_ALPHA),
      u: lerp(s.u, v.u, SMOOTHING_ALPHA),
      e: lerp(s.e, v.e, SMOOTHING_ALPHA),
      o: lerp(s.o, v.o, SMOOTHING_ALPHA)
    };

    // Use addParameterValueById with weight=1.0 — same call the library
    // itself uses (with weight 0.8) for lipSync. Acts like a SET because
    // loadParameters() restores the snapshot at end-of-frame, so we re-
    // write from scratch every frame.
    writeParam(core, 'ParamMouthOpenY', s.open);
    writeParam(core, 'ParamMouthForm', s.form);
    writeParam(core, 'ParamA', s.a);
    writeParam(core, 'ParamI', s.i);
    writeParam(core, 'ParamU', s.u);
    writeParam(core, 'ParamE', s.e);
    writeParam(core, 'ParamO', s.o);
  };

  // rAF fallback for any platform where the InternalModel event isn't
  // available — same handler, just a different scheduler. We still
  // disable the lib lip-sync above so there's no double-write.
  let rafId: number | null = null;
  const useRafFallback = !internalModel?.on;
  if (useRafFallback) {
    const tick = () => {
      onBeforeModelUpdate();
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
  } else {
    internalModel?.on?.('beforeModelUpdate', onBeforeModelUpdate);
  }

  try {
    await new Promise<void>((resolve, reject) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        resolve();
      };
      const fail = (err: Error) => {
        if (settled) return;
        settled = true;
        reject(err);
      };

      onStopReady(() => {
        try {
          audio.pause();
          audio.currentTime = 0;
        } catch {
          /* noop */
        }
        finish();
      });

      audio.onended = finish;
      audio.onerror = () => fail(new Error('audio playback failed'));
      audio.play().catch(reject);
    });
  } finally {
    onStopReady(null);
    if (rafId !== null) cancelAnimationFrame(rafId);
    internalModel?.off?.('beforeModelUpdate', onBeforeModelUpdate);

    // Reset mouth to closed once playback ends, otherwise the avatar
    // freezes mid-syllable until the next clip plays.
    if (core) {
      for (const id of MOUTH_PARAMS) writeParam(core, id, 0);
    }
  }
}

function writeParam(core: Core, id: string, value: number) {
  const v = clamp01(value);
  try {
    // SET — absolute override. Any expression "Add" contribution earlier
    // in the frame on mouth params is overwritten, which is what we want
    // (we own the mouth; expressions own eyes / eyebrows).
    if (core.setParameterValueById) {
      core.setParameterValueById(id, v);
    } else if (core.addParameterValueById) {
      // older / variant SDKs: weight-1 add is equivalent thanks to the
      // loadParameters() reset at end-of-frame.
      core.addParameterValueById(id, v, 1.0);
    }
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
