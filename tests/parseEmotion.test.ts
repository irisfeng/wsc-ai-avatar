import { describe, it, expect } from 'vitest';
import { parseDebaterReply } from '@/lib/parseEmotion';

describe('parseDebaterReply', () => {
  it('extracts <emotion> tag and strips it', () => {
    const out = parseDebaterReply(
      'Firstly, social media erodes attention.\n<emotion>confident</emotion>'
    );
    expect(out.emotion).toBe('confident');
    expect(out.text).toBe('Firstly, social media erodes attention.');
    expect(out.poi).toBeUndefined();
  });

  it('extracts POI line (English colon)', () => {
    const raw =
      'My case rests on three pillars.\nPOI: How do you account for digital natives?\n<emotion>thoughtful</emotion>';
    const out = parseDebaterReply(raw);
    expect(out.poi).toBe('How do you account for digital natives?');
    expect(out.emotion).toBe('thoughtful');
    expect(out.text).toBe('My case rests on three pillars.');
  });

  it('handles full-width colon "POI："', () => {
    const out = parseDebaterReply('Argument body.\nPOI：你方如何回应？');
    expect(out.poi).toBe('你方如何回应？');
    expect(out.text).toBe('Argument body.');
  });

  it('falls back to last-line bare emotion word when tag missing', () => {
    const out = parseDebaterReply(
      'The opposition has yet to provide a single warrant.\nfirm'
    );
    expect(out.emotion).toBe('firm');
    expect(out.text).toBe('The opposition has yet to provide a single warrant.');
  });

  it('ignores unknown bare last-line words as emotion', () => {
    const out = parseDebaterReply('Sentence one.\nuhh');
    expect(out.emotion).toBeUndefined();
    expect(out.text).toBe('Sentence one.\nuhh'); // left intact
  });

  it('is case-insensitive on emotion tag', () => {
    const out = parseDebaterReply('Body.\n<EMOTION>Surprised</EMOTION>');
    expect(out.emotion).toBe('surprised');
  });

  it('strips trailing punctuation on fallback emotion word', () => {
    const out = parseDebaterReply('Body.\nAmused.');
    expect(out.emotion).toBe('amused');
    expect(out.text).toBe('Body.');
  });

  it('returns empty/undefined fields when raw is blank', () => {
    const out = parseDebaterReply('   ');
    expect(out.text).toBe('');
    expect(out.poi).toBeUndefined();
    expect(out.emotion).toBeUndefined();
  });

  it('keeps text intact when no markers present', () => {
    const raw = 'Just a plain speech with no tags.';
    const out = parseDebaterReply(raw);
    expect(out.text).toBe(raw);
    expect(out.emotion).toBeUndefined();
    expect(out.poi).toBeUndefined();
  });

  it('handles POI without subsequent emotion tag', () => {
    const out = parseDebaterReply('Speech.\nPOI: Question?');
    expect(out.poi).toBe('Question?');
    expect(out.text).toBe('Speech.');
    expect(out.emotion).toBeUndefined();
  });

  it('does not gobble POI as fallback emotion', () => {
    // POI line must be extracted BEFORE the fallback-emotion sniff,
    // otherwise the last line "POI: ..." could match the emotion regex.
    const out = parseDebaterReply('Speech body.\nPOI: Q?');
    expect(out.poi).toBe('Q?');
    expect(out.emotion).toBeUndefined();
    expect(out.text).toBe('Speech body.');
  });
});
