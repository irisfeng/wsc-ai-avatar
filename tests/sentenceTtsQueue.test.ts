import { describe, expect, it } from 'vitest';
import { SentenceTtsQueue, type TtsFetchFn } from '@/components/chat/sentenceTtsQueue';

function blob(label: string) {
  return new Blob([label], { type: 'audio/mpeg' });
}

describe('SentenceTtsQueue', () => {
  it('starts TTS fetches immediately but plays audio serially', async () => {
    const calls: string[] = [];
    const played: string[] = [];
    const fetcher: TtsFetchFn = async (text) => {
      calls.push(text);
      return blob(text);
    };

    const q = new SentenceTtsQueue({ fetcher });
    q.enqueue('First sentence.', async (audio) => {
      played.push(await audio.text());
    });
    q.enqueue('Second sentence.', async (audio) => {
      played.push(await audio.text());
    });

    expect(calls).toEqual(['First sentence.', 'Second sentence.']);
    await q.drain();
    expect(played).toEqual(['First sentence.', 'Second sentence.']);
  });

  it('aborts in-flight TTS requests and prevents later playback', async () => {
    const abortStates: boolean[] = [];
    const played: string[] = [];
    const fetcher: TtsFetchFn = (text, opts) =>
      new Promise((resolve) => {
        opts.signal?.addEventListener('abort', () => {
          abortStates.push(opts.signal?.aborted ?? false);
          resolve(blob(text));
        });
      });

    const q = new SentenceTtsQueue({ fetcher });
    q.enqueue('Do not play this.', async (audio) => {
      played.push(await audio.text());
    });
    q.abort();

    await q.drain();
    expect(abortStates).toEqual([true]);
    expect(played).toEqual([]);
  });
});
