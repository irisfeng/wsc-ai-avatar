export interface ParsedSpeech {
  text: string; // LLM text with all known tag noise removed
  poi?: string; // Point of Information (opponent mode)
  emotion?: string; // confident | thoughtful | surprised | amused | firm | ...
}

/**
 * Set of emotions the Live2D model can express. Used both for accepting
 * bare-tag forms like <thoughtful></thoughtful> and for the fallback
 * "last-line is an emotion word" sniffer.
 */
const KNOWN_EMOTIONS = new Set([
  'confident',
  'thoughtful',
  'surprised',
  'amused',
  'firm',
  'happy',
  'neutral',
  'sad',
  'angry'
]);

// ─── matchers — ordered from strictest to loosest ───────────────────
//
// 1. <emotion>thoughtful</emotion>         — canonical
// 2. <emotion type="thoughtful"/>          — self-closing attribute form
// 3. <emotion: thoughtful>                 — informal colon form (some models)
// 4. <thoughtful></thoughtful>             — model dropped the wrapping tag
//                                            (only matched if the inner word
//                                            is a known emotion, so we don't
//                                            accidentally eat real HTML)
// Each regex MUST have a capture group #1 = the emotion word.
const EMOTION_PATTERNS: RegExp[] = [
  /<emotion>\s*([a-zA-Z_]+)\s*<\/emotion>/i,
  /<emotion\s+type\s*=\s*["']?([a-zA-Z_]+)["']?\s*\/?>/i,
  /<emotion\s*[:=]\s*([a-zA-Z_]+)\s*>/i,
  // bare-tag form — only when the tag name is itself an emotion word
  new RegExp(
    `<(${[...KNOWN_EMOTIONS].join('|')})\\s*>\\s*</\\1\\s*>`,
    'i'
  ),
  // self-closing bare-tag form: <thoughtful/>
  new RegExp(`<(${[...KNOWN_EMOTIONS].join('|')})\\s*\\/?>`, 'i')
];

export function parseDebaterReply(raw: string): ParsedSpeech {
  let text = raw.trim();
  let emotion: string | undefined;

  // 1. Try each matcher in order; remove on first hit.
  for (const re of EMOTION_PATTERNS) {
    const m = text.match(re);
    if (m) {
      const candidate = m[1].toLowerCase();
      if (KNOWN_EMOTIONS.has(candidate)) {
        emotion = candidate;
        text = text.replace(re, '').trim();
        break;
      }
    }
  }

  // 2. POI line (extract before fallback emotion sniff so it isn't gobbled)
  let poi: string | undefined;
  const poiMatch = text.match(/(?:^|\n)\s*POI[:：]\s*(.+)$/im);
  if (poiMatch) {
    poi = poiMatch[1].trim();
    text = text.replace(poiMatch[0], '').trim();
  }

  // 3. Fallback: last non-empty line is a single known emotion word.
  if (!emotion) {
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length > 0) {
      const last = lines[lines.length - 1].toLowerCase().replace(/[.!?]+$/, '');
      if (/^[a-z]+$/.test(last) && KNOWN_EMOTIONS.has(last)) {
        emotion = last;
        lines.pop();
        text = lines.join('\n').trim();
      }
    }
  }

  // 4. Defensive cleanup — strip any leftover HTML-ish tags so they never
  //    leak into the spoken/displayed text. This catches unknown emotion
  //    variants the matchers above didn't recognise (e.g. <mood>x</mood>).
  text = stripStrayTags(text);

  return { text: text.trim(), poi, emotion };
}

/**
 * Remove any remaining `<tag>...</tag>`, `<tag/>`, or `<tag>` fragments.
 * Conservative: only strips tags whose name is purely alphabetic
 * (matches "emotion" / "thoughtful" / "mood" but not real punctuation like
 * "<--" or formulae like "x<y").
 */
function stripStrayTags(s: string): string {
  return s
    .replace(/<\/?[a-zA-Z_][a-zA-Z0-9_-]*(?:\s+[^>]*)?\/?>/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
