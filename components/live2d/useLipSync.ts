'use client';

import { useRef } from 'react';

/**
 * Speaks an audio Blob through the Live2D model.
 *
 * Preferred path: pixi-live2d-display-lipsyncpatch's `model.speak()` (handles
 * audio playback + mouth driving + optional expression in one call).
 *
 * Fallback: HTMLAudio + Web Audio Analyser → RMS → ParamMouthOpenY.
 */
export function useAudioMouth() {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);

  async function play(
    audioBlob: Blob,
    opts: { expression?: string } = {}
  ): Promise<void> {
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

  return { play };
}

async function playWithRms(
  url: string,
  ctxRef: { current: AudioContext | null },
  rafRef: { current: number | null }
): Promise<void> {
  const audio = new Audio(url);
  audio.crossOrigin = 'anonymous';
  if (!ctxRef.current) {
    const Ctx =
      (window.AudioContext as typeof AudioContext) ||
      ((window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext);
    ctxRef.current = new Ctx();
  }
  const ctx = ctxRef.current;
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
