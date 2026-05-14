export interface ParsedSpeech {
  text: string;     // LLM text with emotion tag removed
  poi?: string;     // Point of Information (opponent mode)
  emotion?: string; // confident | thoughtful | surprised | amused | firm | ...
}

const EMOTION_RE = /<emotion>\s*([a-zA-Z_]+)\s*<\/emotion>/i;
const KNOWN_EMOTIONS = new Set([
  'confident',
  'thoughtful',
  'surprised',
  'amused',
  'firm',
  'happy',
  'neutral'
]);

export function parseDebaterReply(raw: string): ParsedSpeech {
  let text = raw.trim();
  let emotion: string | undefined;

  // 1. Tagged form: <emotion>confident</emotion>
  const m = text.match(EMOTION_RE);
  if (m) {
    emotion = m[1].toLowerCase();
    text = text.replace(EMOTION_RE, '').trim();
  }

  // 2. POI line (extract before fallback emotion sniff so it isn't gobbled)
  let poi: string | undefined;
  const poiMatch = text.match(/(?:^|\n)\s*POI[:：]\s*(.+)$/im);
  if (poiMatch) {
    poi = poiMatch[1].trim();
    text = text.replace(poiMatch[0], '').trim();
  }

  // 3. Fallback: last non-empty line is a single known emotion word
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

  return { text, poi, emotion };
}
