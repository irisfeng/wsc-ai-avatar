/**
 * Incremental sentence splitter for streaming LLM output.
 *
 * Used by the debate page to pipeline TTS: as tokens arrive, extract any
 * sentences that are now complete and enqueue them for synthesis, while
 * the rest of the reply continues to stream.
 */

/** Region-terminating markers — we never speak past these. */
const STOP_RE = /<\/?[a-zA-Z]|POI[:：]/;
/** Minimum length below which we don't bother dispatching a TTS request. */
const MIN_SENTENCE_CHARS = 8;

export interface ExtractResult {
  /** Newly-complete sentences ready to send to TTS, in order. */
  sentences: string[];
  /** Updated cursor — pass this back in on the next call. */
  newCursor: number;
}

/**
 * Pull any newly-complete sentences out of `buffer` beyond `cursor`.
 * Stops at the first stop marker (`<`-prefixed tag or `POI:`) so we
 * don't speak emotion tags or merge POI into the body.
 */
export function extractSentences(buffer: string, cursor: number): ExtractResult {
  // 1. Find earliest stop marker beyond cursor; speakable region is [cursor, stop).
  const tail = buffer.slice(cursor);
  const stopMatch = STOP_RE.exec(tail);
  const regionEnd = stopMatch ? cursor + stopMatch.index : buffer.length;
  const region = buffer.slice(cursor, regionEnd);

  // 2. Find every complete sentence end inside this region.
  const sentences: string[] = [];
  let consumed = 0;
  const sentEnd = /([.!?])(\s|$)/g;
  let m: RegExpExecArray | null;
  while ((m = sentEnd.exec(region))) {
    const end = m.index + m[1].length; // include the terminator
    const piece = region.slice(consumed, end).trim();
    if (piece.length >= MIN_SENTENCE_CHARS) sentences.push(piece);
    consumed = m.index + m[0].length; // skip the trailing whitespace too
  }

  return {
    sentences,
    // Advance cursor only over the bytes we actually emitted as full
    // sentences. The trailing incomplete fragment (if any) stays in the
    // buffer for next time. If a stop marker is present we do NOT cross
    // it on this call — flushTail handles that.
    newCursor: cursor + consumed
  };
}

/**
 * Called once at stream end. Returns whatever speakable body is sitting
 * between the cursor and the first stop marker, after trimming. The POI
 * itself is NOT returned here — read it from parseDebaterReply().
 */
export function flushTail(buffer: string, cursor: number): string {
  const tail = buffer.slice(cursor);
  const stopMatch = STOP_RE.exec(tail);
  const region = (stopMatch ? tail.slice(0, stopMatch.index) : tail).trim();
  return region.length >= MIN_SENTENCE_CHARS ? region : '';
}
