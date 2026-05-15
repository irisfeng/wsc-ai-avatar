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

  // ─── E1: tolerance for malformed emotion tags from weaker models ──

  it('handles bare-tag form <thoughtful></thoughtful>', () => {
    // This is the actual Qwen2.5:14b output bug we saw in the screenshot.
    const out = parseDebaterReply(
      "Firstly, ... Secondly, ...\nPOI: Could you elaborate?\n<thoughtful></thoughtful>"
    );
    expect(out.emotion).toBe('thoughtful');
    expect(out.poi).toBe('Could you elaborate?');
    expect(out.text).toBe('Firstly, ... Secondly, ...');
    expect(out.text).not.toContain('<');
  });

  it('handles self-closing bare-tag form <amused/>', () => {
    const out = parseDebaterReply('Speech.\n<amused/>');
    expect(out.emotion).toBe('amused');
    expect(out.text).toBe('Speech.');
  });

  it('handles self-closing emotion form <emotion type="firm"/>', () => {
    const out = parseDebaterReply('Body.\n<emotion type="firm"/>');
    expect(out.emotion).toBe('firm');
    expect(out.text).toBe('Body.');
  });

  it('handles informal colon form <emotion: confident>', () => {
    const out = parseDebaterReply('Body.\n<emotion: confident>');
    expect(out.emotion).toBe('confident');
    expect(out.text).toBe('Body.');
  });

  it('does NOT mistake <mood>thoughtful</mood> for an emotion tag', () => {
    // "mood" is not in KNOWN_EMOTIONS, and "<mood>" doesn't match
    // any of our recognised patterns. The stray-tag stripper should still
    // remove the leftover noise so it doesn't leak into the bubble.
    const out = parseDebaterReply('Body.\n<mood>thoughtful</mood>');
    expect(out.emotion).toBeUndefined();
    expect(out.text).not.toContain('<');
    expect(out.text).not.toContain('mood');
  });

  it('strips stray unknown tags from spoken text (no leak)', () => {
    const out = parseDebaterReply(
      'Hello world.\n<random_tag>noise</random_tag>'
    );
    expect(out.text).not.toContain('<');
    expect(out.text).not.toContain('random_tag');
  });

  it('still preserves inline punctuation like "x < y" (no tag match)', () => {
    const out = parseDebaterReply('We argue x < y in this case.');
    // "<y" alone isn't a valid tag (no closing >), so stripper leaves it.
    expect(out.text).toBe('We argue x < y in this case.');
  });

  it('emotion tag in the middle of text is still extracted', () => {
    const out = parseDebaterReply(
      'Firstly, X. <emotion>confident</emotion> Secondly, Y.'
    );
    expect(out.emotion).toBe('confident');
    expect(out.text).toContain('Firstly');
    expect(out.text).toContain('Secondly');
    expect(out.text).not.toContain('<');
  });
});
