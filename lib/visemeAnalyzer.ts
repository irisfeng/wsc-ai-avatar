/**
 * Formant-based viseme analyser.
 *
 * Takes a single audio analyser frame (time + frequency domain bytes)
 * and produces viseme weights that drive Live2D mouth parameters.
 *
 * Approach:
 *   1. Time-domain RMS → overall mouth openness (with a silence gate
 *      so the mouth doesn't twitch during inter-syllable gaps).
 *   2. Frequency-domain peaks in classic formant bands:
 *        F1: 280-900 Hz   (vertical mouth openness)
 *        F2: 900-2400 Hz  (front-back tongue position)
 *      Parabolic interpolation around each peak for sub-bin Hz accuracy.
 *   3. Map (openness, frontness) into the IPA vowel chart and compute
 *      Gaussian-style weights for the five cardinal vowels A/I/U/E/O.
 *   4. Compute horizontal mouth form from frontness (smile ↔ pucker).
 *
 * Pure / synchronous / no I/O — easy to unit test.
 */

export interface VisemeWeights {
  /** Overall mouth openness, 0..1 — universal `ParamMouthOpenY`. */
  open: number;
  /** Horizontal lip form, -1 (pucker) .. +1 (smile) — `ParamMouthForm`. */
  form: number;
  /** Cardinal vowel weights, 0..1, scaled by `open`. */
  a: number;
  i: number;
  u: number;
  e: number;
  o: number;
}

export interface AnalyserFrame {
  /** Byte time-domain data (0-255 centred at 128) from getByteTimeDomainData. */
  timeData: Uint8Array;
  /** Float frequency-domain data (dB) from getFloatFrequencyData. */
  freqData: Float32Array;
  sampleRate: number;
  fftSize: number;
}

const SILENCE_RMS = 0.012;
const OPEN_GAIN = 4.5;
/** Sharpness of the vowel Gaussian — smaller = more peaky weights. */
const VOWEL_SHARPNESS = 0.08;

/** Cardinal vowel coordinates in (openness, frontness) space (0..1 each). */
const VOWEL_TARGETS = {
  a: { open: 0.95, front: 0.45 }, // open central → big-open mouth
  i: { open: 0.10, front: 0.9 },  // close front  → narrow smile-ish
  u: { open: 0.1, front: 0.15 }, // close back   → pucker
  e: { open: 0.5, front: 0.85 }, // mid front    → in between A & I
  o: { open: 0.5, front: 0.15 }  // mid back     → rounded medium
} as const;

const ZERO: VisemeWeights = {
  open: 0,
  form: 0,
  a: 0,
  i: 0,
  u: 0,
  e: 0,
  o: 0
};

export function analyseFrame(frame: AnalyserFrame): VisemeWeights {
  // 1. RMS in time-domain → overall openness.
  let sumSq = 0;
  for (let i = 0; i < frame.timeData.length; i += 1) {
    const v = (frame.timeData[i] - 128) / 128;
    sumSq += v * v;
  }
  const rms = Math.sqrt(sumSq / frame.timeData.length);
  if (rms < SILENCE_RMS) return ZERO;

  const open = clamp01(rms * OPEN_GAIN);

  // 2. Formant estimation — peak bin in F1 / F2 bands with sub-bin parabolic refine.
  const binHz = frame.sampleRate / frame.fftSize;
  const f1 = peakHz(frame.freqData, 280, 1100, binHz);
  const f2 = peakHz(frame.freqData, 900, 2700, binHz);

  // 3. Normalise into (openness, frontness) ∈ [0,1].
  const openness = clamp01((f1 - 280) / (900 - 280));
  const frontness = clamp01((f2 - 900) / (2400 - 900));

  // 4. Gaussian weights centred on each cardinal vowel.
  const dA = dist2(openness, frontness, VOWEL_TARGETS.a.open, VOWEL_TARGETS.a.front);
  const dI = dist2(openness, frontness, VOWEL_TARGETS.i.open, VOWEL_TARGETS.i.front);
  const dU = dist2(openness, frontness, VOWEL_TARGETS.u.open, VOWEL_TARGETS.u.front);
  const dE = dist2(openness, frontness, VOWEL_TARGETS.e.open, VOWEL_TARGETS.e.front);
  const dO = dist2(openness, frontness, VOWEL_TARGETS.o.open, VOWEL_TARGETS.o.front);

  const k = VOWEL_SHARPNESS;
  const iA = Math.exp(-dA / k);
  const iI = Math.exp(-dI / k);
  const iU = Math.exp(-dU / k);
  const iE = Math.exp(-dE / k);
  const iO = Math.exp(-dO / k);
  const sum = iA + iI + iU + iE + iO + 1e-9;

  // 5. Horizontal form: front vowels (i, e) → smile;
  //    back vowels (u, o) → pucker; scaled by openness.
  const form = (frontness - 0.5) * 1.6 * open;

  return {
    open,
    form,
    a: (iA / sum) * open,
    i: (iI / sum) * open,
    u: (iU / sum) * open,
    e: (iE / sum) * open,
    o: (iO / sum) * open
  };
}

/**
 * Find the strongest frequency bin in [lowHz, highHz] and refine with
 * parabolic interpolation for sub-bin Hz accuracy.
 */
function peakHz(
  freqData: Float32Array,
  lowHz: number,
  highHz: number,
  binHz: number
): number {
  const lo = Math.max(1, Math.floor(lowHz / binHz));
  const hi = Math.min(freqData.length - 1, Math.ceil(highHz / binHz));
  let maxDb = -Infinity;
  let maxBin = lo;
  for (let i = lo; i <= hi; i += 1) {
    if (freqData[i] > maxDb) {
      maxDb = freqData[i];
      maxBin = i;
    }
  }
  if (maxBin > lo && maxBin < hi) {
    const a = freqData[maxBin - 1];
    const b = freqData[maxBin];
    const c = freqData[maxBin + 1];
    const denom = a - 2 * b + c;
    if (denom !== 0) {
      const delta = (0.5 * (a - c)) / denom;
      return (maxBin + delta) * binHz;
    }
  }
  return maxBin * binHz;
}

function dist2(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x1 - x2;
  const dy = y1 - y2;
  return Math.sqrt(dx * dx + dy * dy);
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/** Exposed for tests. */
export const _internals = { SILENCE_RMS, VOWEL_TARGETS };
