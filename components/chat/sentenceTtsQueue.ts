/**
 * SentenceTtsQueue — pipelines sentence-level TTS during streaming LLM output.
 *
 * Design:
 *  - Each enqueued sentence fires its TTS fetch IMMEDIATELY (parallel network).
 *  - Audio playback is serialised via a chained promise so sentences play
 *    in order with no overlap.
 *  - First sentence audio starts as soon as its mp3 arrives (typically <1 s
 *    after the sentence finishes streaming). Later sentences usually have
 *    their TTS ready by the time the previous sentence finishes playing,
 *    eliminating the inter-sentence gap.
 *  - abort() prevents any not-yet-played sentence from playing; in-flight
 *    fetches still complete (cheap to discard).
 */

import { fetchTTS } from '@/components/chat/ttsClient';

type PlayFn = (blob: Blob) => Promise<void>;
export type TtsFetchFn = (
  text: string,
  opts: { voice?: string; signal?: AbortSignal }
) => Promise<Blob>;

export interface TtsQueueOpts {
  /** Edge-TTS voice id (e.g. 'en-US-AndrewNeural'). */
  voice?: string;
  fetcher?: TtsFetchFn;
}

export class SentenceTtsQueue {
  private chain: Promise<void> = Promise.resolve();
  private aborted = false;
  private voice: string | undefined;
  private fetcher: TtsFetchFn;
  private controllers = new Set<AbortController>();

  constructor(opts: TtsQueueOpts = {}) {
    this.voice = opts.voice;
    this.fetcher = opts.fetcher ?? fetchTTS;
  }

  /**
   * Enqueue a sentence to be synthesised and spoken.
   * Returns immediately; audio plays asynchronously in order.
   */
  enqueue(sentence: string, play: PlayFn): void {
    if (this.aborted) return;
    const trimmed = sentence.trim();
    if (!trimmed) return;

    // Kick off the TTS request right now so the network round-trip
    // overlaps with the playback of the previous sentence.
    const ctl = new AbortController();
    this.controllers.add(ctl);
    const ttsPromise = this.fetcher(trimmed, {
      voice: this.voice,
      signal: ctl.signal
    })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.warn('[sentenceTtsQueue] TTS fetch failed:', err);
        return null;
      })
      .finally(() => {
        this.controllers.delete(ctl);
      });

    this.chain = this.chain.then(async () => {
      if (this.aborted) return;
      const blob = await ttsPromise;
      if (!blob || this.aborted) return;
      try {
        await play(blob);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[sentenceTtsQueue] playback failed:', err);
      }
    });
  }

  /** Wait until every queued sentence has finished playing (or been aborted). */
  drain(): Promise<void> {
    return this.chain;
  }

  /** Prevent any not-yet-played sentence from speaking. Idempotent. */
  abort(): void {
    this.aborted = true;
    for (const ctl of this.controllers) ctl.abort();
    this.controllers.clear();
  }
}
