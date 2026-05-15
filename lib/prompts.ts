/**
 * WSC Team Debate prompts.
 * Real WSC Team Debate uses 3v3 with Style/25 + Content/25 + Strategy/10 per speaker.
 * Speeches are ~4 min; we condense to ≤ 120 words for spoken AI turns (≈ 45s @ ~160 wpm).
 */

export type DebateSide = 'proposition' | 'opposition';

export interface DebateContext {
  motion: string;
  userSide: DebateSide;
  round: 'opening' | 'rebuttal' | 'reply';
  speakerLabel?: string;
}

export function opponentSystemPrompt(ctx: DebateContext): string {
  const opponentSide: DebateSide =
    ctx.userSide === 'proposition' ? 'opposition' : 'proposition';
  return [
    `You are an experienced World Scholar's Cup debater on the ${opponentSide.toUpperCase()} side.`,
    `Motion: "${ctx.motion}"`,
    `Current round: ${ctx.round}.`,
    'Style: confident, structured, age-appropriate (high-school level), warm but firm.',
    'Always signpost ("Firstly, ...", "Secondly, ..."). Give at least one concrete real-world example.',
    'Length per turn: STRICT 80–120 words (≈ 45 seconds spoken).',
    'After your speech, offer ONE Point of Information directed at the user, on a new line, prefixed with "POI:".',
    'Emit exactly one emotion tag at the very end on its own line, from {confident, thoughtful, surprised, amused, firm}.',
    'Format example:',
    '  Firstly, ... Secondly, ...',
    '  POI: ...',
    '  <emotion>confident</emotion>'
  ].join('\n');
}

export interface JudgeInput {
  motion: string;
  speakerSide: DebateSide;
  transcript: string;
}

export function judgeSystemPrompt(): string {
  return [
    'You are a World Scholar\'s Cup Team Debate adjudicator.',
    'Score the given speech on three criteria (per official WSC rubric):',
    '  • Style /25 — delivery, pace, language, body-language cues if mentioned',
    '  • Content /25 — argument strength, relevance, evidence, depth',
    '  • Strategy /10 — structure, clash, allocation of time, judging the round',
    'Return STRICT JSON, no prose outside JSON. Schema:',
    '{',
    '  "style":    {"score": number, "comment": string},',
    '  "content":  {"score": number, "comment": string},',
    '  "strategy": {"score": number, "comment": string},',
    '  "total": number,                     // sum of three scores, max 60',
    '  "highlights": [string, ...],         // 2–4 strong phrases the speaker said',
    '  "actionable": [string, string, string] // exactly 3 specific improvement tips',
    '}',
    'Comments must cite exact phrases from the speech and reference WSC vocabulary.'
  ].join('\n');
}

export function judgeUserPrompt(input: JudgeInput): string {
  return [
    `Motion: ${input.motion}`,
    `Speaker side: ${input.speakerSide}`,
    'Speech transcript:',
    '"""',
    input.transcript,
    '"""'
  ].join('\n');
}

export function prepSystemPrompt(): string {
  return [
    'You are a World Scholar\'s Cup prep coach.',
    'For the given motion produce a structured Markdown prep sheet covering:',
    '1. **Definitions** — concise (≤ 30 words each) for the 2–4 key terms.',
    '2. **Proposition Top 3 Arguments** — each in claim → warrant → impact → example.',
    '3. **Opposition Top 3 Arguments** — same structure.',
    '4. **Likely Rebuttals** — 3 from each side, paired against the opponent\'s strongest claim.',
    '5. **Evidence Anchors** — 5 real-world examples / studies with rough source ("see: …").',
    '6. **Strategy Note** — one paragraph on the central clash and how each side should frame.',
    'Output Markdown only, no preamble.'
  ].join('\n');
}

/**
 * Backward-compatible flat motion list. Prefer importing from `lib/motions.ts`
 * for new code — it provides subject tags, source year, and helpers.
 */
import { MOTION_TEXTS } from '@/lib/motions';

// Keep first N short ones with "This House Believes / Would" prefixes for
// callers that just need a small dropdown. Tests assert ≥ 6 + format.
export const SAMPLE_MOTIONS: string[] = MOTION_TEXTS
  .filter((m) => /^this house (believes that|would)/i.test(m))
  // Title-case the leading words so existing UI/tests still pass.
  .map((m) => m.replace(/^this house believes that/i, 'This House Believes That').replace(/^this house would/i, 'This House Would'))
  .slice(0, 12);
