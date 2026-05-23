import type { DebateContext } from '@/lib/prompts';

export type TrainingSignalState = 'good' | 'warn' | 'neutral';
export type TrainingSignalId = 'time' | 'structure' | 'evidence' | 'poi' | 'clarity';

export interface TrainingSignal {
  id: TrainingSignalId;
  title: string;
  label: string;
  detail: string;
  state: TrainingSignalState;
}

export interface TrainingSignalInput {
  transcript: string;
  elapsedSeconds: number;
  round: DebateContext['round'];
  pendingPoi?: string;
}

export interface TrainingSignals {
  time: TrainingSignal;
  structure: TrainingSignal;
  evidence: TrainingSignal;
  poi: TrainingSignal;
  clarity: TrainingSignal;
  checklist: TrainingSignal[];
}

const SIGNPOST_RE =
  /\b(firstly|secondly|thirdly|my first argument|my second argument|first argument|second argument|therefore|in conclusion|to summarize)\b/i;
const EVIDENCE_RE =
  /\b(for example|for instance|study|data|according to|in 20\d{2}|case of|research|survey|report)\b/i;
const REASONING_RE = /\b(because|however|therefore|that means|this proves|the reason|even if)\b/i;
const FILLER_RE = /\b(um|uh|like|you know)\b/gi;

export function roundTargetSeconds(round: DebateContext['round']): number {
  return round === 'reply' ? 120 : 240;
}

export function computeTrainingSignals(input: TrainingSignalInput): TrainingSignals {
  const transcript = normalize(input.transcript);
  const words = wordTokens(transcript);
  const wordCount = words.length;
  const target = roundTargetSeconds(input.round);
  const elapsed = Math.max(0, Math.floor(input.elapsedSeconds));
  const timeRatio = target === 0 ? 0 : elapsed / target;

  const time: TrainingSignal =
    timeRatio >= 0.9
      ? signal('time', 'Time', 'Wrap up soon', `${formatTime(elapsed)} / ${formatTime(target)}`, 'warn')
      : timeRatio >= 0.3
        ? signal('time', 'Time', 'Good pace', `${formatTime(elapsed)} / ${formatTime(target)}`, 'good')
        : signal('time', 'Time', 'Building', `${formatTime(elapsed)} / ${formatTime(target)}`, 'neutral');

  const hasStructure = SIGNPOST_RE.test(transcript);
  const structure: TrainingSignal = hasStructure
    ? signal('structure', 'Structure', 'Signpost found', 'Clear debate structure', 'good')
    : wordCount >= 10
      ? signal('structure', 'Structure', 'Add structure', 'Use Firstly / Secondly', 'warn')
      : signal('structure', 'Structure', 'Listening', 'Start with a stance', 'neutral');

  const hasEvidence = EVIDENCE_RE.test(transcript);
  const evidence: TrainingSignal = hasEvidence
    ? signal('evidence', 'Evidence', 'Evidence present', 'Example marker detected', 'good')
    : wordCount >= 10
      ? signal('evidence', 'Evidence', 'Needs example', 'Add a concrete case', 'warn')
      : signal('evidence', 'Evidence', 'Waiting', 'Use one example', 'neutral');

  const poi = computePoiSignal(input.pendingPoi, transcript, elapsed);
  const clarity = computeClaritySignal(transcript, wordCount);
  const checklist = [structure, evidence, poi, clarity];

  return { time, structure, evidence, poi, clarity, checklist };
}

function computePoiSignal(
  pendingPoi: string | undefined,
  transcript: string,
  elapsedSeconds: number
): TrainingSignal {
  if (!pendingPoi?.trim()) {
    return signal('poi', 'POI', 'No POI', 'No pending question', 'neutral');
  }

  const overlap = keywordOverlap(pendingPoi, transcript);
  if (overlap >= 1 && REASONING_RE.test(transcript)) {
    return signal('poi', 'POI', 'POI answered', 'Question addressed', 'good');
  }

  if (elapsedSeconds >= 45 || wordTokens(transcript).length >= 45) {
    return signal('poi', 'POI', 'Address POI', 'Answer the question directly', 'warn');
  }

  return signal('poi', 'POI', 'Pending', 'Work it into your next line', 'neutral');
}

function computeClaritySignal(transcript: string, wordCount: number): TrainingSignal {
  if (wordCount < 12) {
    return signal('clarity', 'Clarity', 'Listening', 'Keep sentences compact', 'neutral');
  }

  const sentences = transcript
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const avgSentenceWords =
    sentences.length === 0 ? wordCount : wordCount / Math.max(1, sentences.length);
  const fillerCount = transcript.match(FILLER_RE)?.length ?? 0;

  if (avgSentenceWords >= 24) {
    return signal('clarity', 'Clarity', 'Shorten sentences', `${Math.round(avgSentenceWords)} words avg`, 'warn');
  }

  if (fillerCount >= 3) {
    return signal('clarity', 'Clarity', 'Reduce fillers', `${fillerCount} filler words`, 'warn');
  }

  return signal('clarity', 'Clarity', 'Clear delivery', `${Math.round(avgSentenceWords)} words avg`, 'good');
}

function signal(
  id: TrainingSignalId,
  title: string,
  label: string,
  detail: string,
  state: TrainingSignalState
): TrainingSignal {
  return { id, title, label, detail, state };
}

function normalize(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function wordTokens(value: string): string[] {
  return value.toLowerCase().match(/[a-z][a-z'-]*/g) ?? [];
}

function keywordOverlap(question: string, answer: string): number {
  const stop = new Set([
    'the',
    'and',
    'you',
    'your',
    'would',
    'could',
    'should',
    'how',
    'what',
    'why',
    'who',
    'that',
    'this',
    'with',
    'from',
    'need',
    'needs'
  ]);
  const q = new Set(wordTokens(question).filter((w) => w.length > 4 && !stop.has(w)));
  const a = new Set(wordTokens(answer));
  let count = 0;
  for (const word of q) {
    if (a.has(word)) count += 1;
  }
  return count;
}

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
