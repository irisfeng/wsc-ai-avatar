'use client';

import { useRef } from 'react';

/**
 * Speaks an audio Blob through the Live2D model.
 *
 * Preferred path: pixi-live2d-display-lipsyncpatch's `model.speak()` (handles
 * audio playback + mouth driving + optional expression in one call).
 *
 * Fallback: HTMLAudio + Web Audio Analyser → RMS → ParamMouthOpenY.
 *
 * E2 — call `prime()` from a synchronous user gesture handler (Send button
 * onClick) BEFORE the LLM round-trip. That creates / resumes the
 * AudioContext while the browser still considers the click "active", so
 * the later auto-playback isn't blocked by Chrome's autoplay policy.
 */
export function useAudioMouth() {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
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

  /**
   * Warm up the audio pipeline from inside a user-gesture handler.
   * Cheap (~no-op) on subsequent calls.
   * Returns true if the context is in a runnable state afterwards.
   */
  async function prime(): Promise<boolean> {
    try {
      const ctx = getCtx();
      if (ctx.state === 'suspended') await ctx.resume();
      // Play a single silent sample — this unlocks the page-level audio
      // unlock on iOS Safari and confirms the context is alive.
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
    // Make sure the context is alive in case prime() was skipped.
    await prime();
    const url = URL.createObjectURL(audioBlob);
    try {
      if (window.__wscLive2D?.speak) {
        await window.__wscLive2D.speak(url, { expression: opts.expression });
        return;
      }
      await playWithRms(url, audioCtxRef, rafRef);
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  return { play, prime };
}

async function playWithRms(
  url: string,
  ctxRef: { current: AudioContext | null },
  rafRef: { current: number | null }
): Promise<void> {
  const audio = new Audio(url);
  audio.crossOrigin = 'anonymous';
  const ctx = ctxRef.current!; // prime() guarantees this is set
  if (ctx.state === 'suspended') await ctx.resume();

  const source = ctx.createMediaElementSource(audio);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 512;
  source.connect(analyser);
  analyser.connect(ctx.destination);
  const buf = new Uint8Array(analyser.fftSize);

  return new Promise<void>((resolve, reject) => {
    const loop = () => {
      analyser.getByteTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i += 1) {
        const v = (buf[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / buf.length);
      window.__wscLive2D?.setMouthOpen(Math.min(1, rms * 4));
      rafRef.current = requestAnimationFrame(loop);
    };
    audio.onended = () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      window.__wscLive2D?.setMouthOpen(0);
      resolve();
    };
    audio.onerror = () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      reject(new Error('audio playback failed'));
    };
    audio
      .play()
      .then(() => {
        rafRef.current = requestAnimationFrame(loop);
      })
      .catch(reject);
  });
}
