import { describe, expect, it } from 'vitest';
import { accumulateSpeechResults } from '@/lib/speechTranscript';

describe('accumulateSpeechResults', () => {
  it('keeps final text and interim text separate while exposing combined transcript', () => {
    const out = accumulateSpeechResults('', [
      { isFinal: true, transcript: 'Firstly, AI tutors help.' },
      { isFinal: false, transcript: ' For example' }
    ]);

    expect(out.finalText).toBe('Firstly, AI tutors help.');
    expect(out.interimText).toBe('For example');
    expect(out.transcript).toBe('Firstly, AI tutors help. For example');
  });

  it('appends new final results to previous final text', () => {
    const out = accumulateSpeechResults('Firstly, AI tutors help.', [
      { isFinal: true, transcript: 'For example, feedback is faster.' }
    ]);

    expect(out.finalText).toBe(
      'Firstly, AI tutors help. For example, feedback is faster.'
    );
    expect(out.interimText).toBe('');
    expect(out.transcript).toBe(
      'Firstly, AI tutors help. For example, feedback is faster.'
    );
  });

  it('normalizes extra whitespace from browser speech chunks', () => {
    const out = accumulateSpeechResults('  First point. ', [
      { isFinal: false, transcript: '   second point is coming   ' }
    ]);

    expect(out.finalText).toBe('First point.');
    expect(out.interimText).toBe('second point is coming');
    expect(out.transcript).toBe('First point. second point is coming');
  });
});
