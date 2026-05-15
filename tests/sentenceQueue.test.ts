import { describe, it, expect } from 'vitest';
import { extractSentences, flushTail } from '@/lib/sentenceQueue';

describe('extractSentences — incremental splitting', () => {
  it('returns no sentences while the first one is still streaming', () => {
    const { sentences, newCursor } = extractSentences('Firstly, ', 0);
    expect(sentences).toEqual([]);
    expect(newCursor).toBe(0);
  });

  it('emits the first sentence once its terminator arrives', () => {
    const { sentences, newCursor } = extractSentences('Firstly, AI helps. Secondly,', 0);
    expect(sentences).toEqual(['Firstly, AI helps.']);
    // cursor advances past "Firstly, AI helps. " (including trailing space)
    expect(newCursor).toBe('Firstly, AI helps. '.length);
  });

  it('emits multiple sentences in one call when several have completed', () => {
    const { sentences } = extractSentences(
      'The first claim is true. The second one follows it. The third is the impact. ',
      0
    );
    expect(sentences).toEqual([
      'The first claim is true.',
      'The second one follows it.',
      'The third is the impact.'
    ]);
  });

  it('preserves an incomplete trailing fragment in the buffer (returned via newCursor)', () => {
    const buf = 'Sentence one. Sentence two — half written';
    const { sentences, newCursor } = extractSentences(buf, 0);
    expect(sentences).toEqual(['Sentence one.']);
    // remainder of buffer not yet consumed
    expect(buf.slice(newCursor)).toBe('Sentence two — half written');
  });

  it('respects the running cursor across multiple calls', () => {
    let buf = 'My first argument is clear. ';
    let cursor = 0;
    let r = extractSentences(buf, cursor);
    expect(r.sentences).toEqual(['My first argument is clear.']);
    cursor = r.newCursor;

    buf += 'Now the second point arises. ';
    r = extractSentences(buf, cursor);
    expect(r.sentences).toEqual(['Now the second point arises.']);
    cursor = r.newCursor;

    buf += 'Halfway through the third';
    r = extractSentences(buf, cursor);
    expect(r.sentences).toEqual([]); // not yet terminated
  });

  it('stops before <emotion> so the tag is never spoken', () => {
    const { sentences } = extractSentences(
      'Firstly, AI helps. Secondly, it matters. <emotion>confident</emotion>',
      0
    );
    expect(sentences).toEqual(['Firstly, AI helps.', 'Secondly, it matters.']);
  });

  it('stops before any tag-like start, including malformed ones', () => {
    const { sentences } = extractSentences(
      'Firstly, AI helps. Secondly, it matters. <thoughtful></thoughtful>',
      0
    );
    expect(sentences).toEqual(['Firstly, AI helps.', 'Secondly, it matters.']);
  });

  it('stops before "POI:" so the body and POI are separate units', () => {
    const { sentences } = extractSentences(
      'My main point is X. Another sentence here.\nPOI: a question?',
      0
    );
    expect(sentences).toEqual([
      'My main point is X.',
      'Another sentence here.'
    ]);
  });

  it('skips tiny fragments below MIN_SENTENCE_CHARS', () => {
    const { sentences } = extractSentences('A. This is a proper sentence.', 0);
    // "A." is shorter than 8 chars → dropped
    expect(sentences).toEqual(['This is a proper sentence.']);
  });

  it('handles ! and ? as terminators', () => {
    const { sentences } = extractSentences(
      'Is this real? Absolutely yes! Continuing...',
      0
    );
    expect(sentences[0]).toBe('Is this real?');
    expect(sentences[1]).toBe('Absolutely yes!');
  });
});

describe('flushTail — end-of-stream remainder', () => {
  it('returns the leftover body when no terminator arrived', () => {
    expect(flushTail('Final clause without period', 0)).toBe(
      'Final clause without period'
    );
  });

  it('strips trailing tag / POI from the tail', () => {
    expect(flushTail('Body tail<emotion>x</emotion>', 0)).toBe('Body tail');
    expect(flushTail('Body tail\nPOI: q?', 0)).toBe('Body tail');
  });

  it('returns empty string for too-short tails', () => {
    expect(flushTail('ok', 0)).toBe('');
  });

  it('respects cursor — only returns content past it', () => {
    const buf = 'Already spoken. Then this remainder.';
    expect(flushTail(buf, 'Already spoken. '.length)).toBe(
      'Then this remainder.'
    );
  });
});
