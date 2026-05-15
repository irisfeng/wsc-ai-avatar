import { describe, it, expect } from 'vitest';
import { analyseFrame, _internals } from '@/lib/visemeAnalyzer';

/**
 * Build a synthetic analyser frame.
 *  - `rms` sets the time-domain RMS amplitude (we just synthesise a flat
 *     wave at that level — the analyser only needs the byte buffer).
 *  - `peakHz` is a single dominant tone the FFT would have detected;
 *     we set the matching bin to 0 dB and everything else to -120 dB.
 *  - `peak2Hz` (optional) — a second peak (e.g. F2).
 */
function makeFrame(opts: {
  rms: number;
  f1Hz?: number;
  f2Hz?: number;
  sampleRate?: number;
  fftSize?: number;
}) {
  const sampleRate = opts.sampleRate ?? 48_000;
  const fftSize = opts.fftSize ?? 2048;
  const binHz = sampleRate / fftSize;

  // time-domain: synthesise a flat tone at desired RMS
  const timeData = new Uint8Array(fftSize);
  const amp = Math.round(opts.rms * 128); // signed amplitude
  for (let i = 0; i < fftSize; i += 1) {
    // alternating ±amp around 128 — pure square wave gives RMS == amp/128
    timeData[i] = 128 + (i % 2 === 0 ? amp : -amp);
  }

  // freq-domain: -120 dB floor with one or two peaks
  const freqData = new Float32Array(fftSize / 2);
  freqData.fill(-120);
  if (opts.f1Hz) {
    const bin = Math.round(opts.f1Hz / binHz);
    if (bin >= 0 && bin < freqData.length) freqData[bin] = 0;
  }
  if (opts.f2Hz) {
    const bin = Math.round(opts.f2Hz / binHz);
    if (bin >= 0 && bin < freqData.length) freqData[bin] = 0;
  }

  return { timeData, freqData, sampleRate, fftSize };
}

describe('analyseFrame — silence handling', () => {
  it('returns all-zero weights when below the silence floor', () => {
    const frame = makeFrame({ rms: _internals.SILENCE_RMS / 2 });
    const v = analyseFrame(frame);
    expect(v).toEqual({ open: 0, form: 0, a: 0, i: 0, u: 0, e: 0, o: 0 });
  });

  it('crosses to non-zero openness once RMS exceeds the floor', () => {
    const frame = makeFrame({
      rms: _internals.SILENCE_RMS * 5,
      f1Hz: 700,
      f2Hz: 1200
    });
    const v = analyseFrame(frame);
    expect(v.open).toBeGreaterThan(0);
  });
});

describe('analyseFrame — vowel classification', () => {
  // F1 / F2 anchors are rough male-voice averages (English):
  //   /a/ ≈ 850 / 1250
  //   /i/ ≈ 300 / 2300
  //   /u/ ≈ 320 /  920
  //   /e/ ≈ 480 / 2100
  //   /o/ ≈ 500 / 1000

  it('classifies /a/ as the dominant vowel weight', () => {
    const v = analyseFrame(makeFrame({ rms: 0.3, f1Hz: 850, f2Hz: 1250 }));
    const peak = Math.max(v.a, v.i, v.u, v.e, v.o);
    expect(v.a).toBe(peak);
  });

  it('classifies /i/ as the dominant vowel weight', () => {
    const v = analyseFrame(makeFrame({ rms: 0.3, f1Hz: 300, f2Hz: 2300 }));
    const peak = Math.max(v.a, v.i, v.u, v.e, v.o);
    expect(v.i).toBe(peak);
  });

  it('classifies /u/ as the dominant vowel weight', () => {
    const v = analyseFrame(makeFrame({ rms: 0.3, f1Hz: 320, f2Hz: 920 }));
    const peak = Math.max(v.a, v.i, v.u, v.e, v.o);
    expect(v.u).toBe(peak);
  });

  it('classifies /e/ as the dominant vowel weight', () => {
    const v = analyseFrame(makeFrame({ rms: 0.3, f1Hz: 480, f2Hz: 2100 }));
    const peak = Math.max(v.a, v.i, v.u, v.e, v.o);
    expect(v.e).toBe(peak);
  });

  it('classifies /o/ as the dominant vowel weight', () => {
    const v = analyseFrame(makeFrame({ rms: 0.3, f1Hz: 500, f2Hz: 1000 }));
    const peak = Math.max(v.a, v.i, v.u, v.e, v.o);
    expect(v.o).toBe(peak);
  });
});

describe('analyseFrame — form (smile/pucker)', () => {
  it('produces positive form for front vowels (smile)', () => {
    const v = analyseFrame(makeFrame({ rms: 0.3, f1Hz: 300, f2Hz: 2300 })); // /i/
    expect(v.form).toBeGreaterThan(0.2);
  });

  it('produces negative form for back vowels (pucker)', () => {
    const v = analyseFrame(makeFrame({ rms: 0.3, f1Hz: 320, f2Hz: 920 })); // /u/
    expect(v.form).toBeLessThan(-0.2);
  });

  it('produces near-zero form for central vowels', () => {
    // F2 around 1650 Hz lands close to the (frontness 0.5) centreline.
    const v = analyseFrame(makeFrame({ rms: 0.3, f1Hz: 600, f2Hz: 1650 }));
    expect(Math.abs(v.form)).toBeLessThan(0.2);
  });

  it('scales form by openness (silent → no form)', () => {
    const v = analyseFrame(makeFrame({ rms: _internals.SILENCE_RMS / 2, f1Hz: 300, f2Hz: 2300 }));
    expect(v.form).toBe(0);
  });
});

describe('analyseFrame — output ranges & invariants', () => {
  it('open and per-vowel weights stay within [0, 1]', () => {
    const v = analyseFrame(makeFrame({ rms: 1.0, f1Hz: 600, f2Hz: 1500 }));
    for (const k of ['open', 'a', 'i', 'u', 'e', 'o'] as const) {
      expect(v[k]).toBeGreaterThanOrEqual(0);
      expect(v[k]).toBeLessThanOrEqual(1);
    }
  });

  it('sum of vowel weights is ≤ open (Gaussian-normalised then scaled)', () => {
    const v = analyseFrame(makeFrame({ rms: 0.3, f1Hz: 700, f2Hz: 1500 }));
    const sum = v.a + v.i + v.u + v.e + v.o;
    expect(sum).toBeLessThanOrEqual(v.open + 1e-6);
    expect(sum).toBeGreaterThan(0);
  });

  it('form stays within [-1, 1]', () => {
    const lo = analyseFrame(makeFrame({ rms: 1.0, f1Hz: 320, f2Hz: 920 }));
    const hi = analyseFrame(makeFrame({ rms: 1.0, f1Hz: 300, f2Hz: 2300 }));
    expect(lo.form).toBeGreaterThanOrEqual(-1);
    expect(lo.form).toBeLessThan(0);
    expect(hi.form).toBeLessThanOrEqual(1);
    expect(hi.form).toBeGreaterThan(0);
  });
});
