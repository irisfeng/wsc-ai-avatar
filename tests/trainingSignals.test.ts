import { describe, expect, it } from 'vitest';
import {
  computeTrainingSignals,
  roundTargetSeconds,
  type TrainingSignalInput
} from '@/lib/trainingSignals';

function baseInput(overrides: Partial<TrainingSignalInput> = {}): TrainingSignalInput {
  return {
    transcript: '',
    elapsedSeconds: 0,
    round: 'opening',
    pendingPoi: undefined,
    ...overrides
  };
}

describe('roundTargetSeconds', () => {
  it('uses 4 minutes for opening and rebuttal', () => {
    expect(roundTargetSeconds('opening')).toBe(240);
    expect(roundTargetSeconds('rebuttal')).toBe(240);
  });

  it('uses 2 minutes for reply', () => {
    expect(roundTargetSeconds('reply')).toBe(120);
  });
});

describe('computeTrainingSignals', () => {
  it('marks time as starting before the speaker reaches 30 percent of target', () => {
    const out = computeTrainingSignals(baseInput({ elapsedSeconds: 50 }));
    expect(out.time.state).toBe('neutral');
    expect(out.time.label).toBe('Building');
    expect(out.time.detail).toBe('0:50 / 4:00');
  });

  it('warns when the speaker is near the target limit', () => {
    const out = computeTrainingSignals(baseInput({ elapsedSeconds: 220 }));
    expect(out.time.state).toBe('warn');
    expect(out.time.label).toBe('Wrap up soon');
  });

  it('detects signposting language', () => {
    const out = computeTrainingSignals(
      baseInput({ transcript: 'Firstly, we protect access. Secondly, we reduce harm.' })
    );
    expect(out.structure.state).toBe('good');
    expect(out.structure.label).toBe('Signpost found');
  });

  it('warns when no structure marker is present after enough words', () => {
    const out = computeTrainingSignals(
      baseInput({
        transcript:
          'AI tutors help students learn at home because many learners need practice outside school hours.'
      })
    );
    expect(out.structure.state).toBe('warn');
    expect(out.structure.label).toBe('Add structure');
  });

  it('detects evidence and examples', () => {
    const out = computeTrainingSignals(
      baseInput({ transcript: 'For example, a 2024 study showed faster feedback improved revision.' })
    );
    expect(out.evidence.state).toBe('good');
    expect(out.evidence.label).toBe('Evidence present');
  });

  it('warns when the speech has claims but no example marker', () => {
    const out = computeTrainingSignals(
      baseInput({
        transcript:
          'This improves learning outcomes because students receive more practice and clearer feedback from the system.'
      })
    );
    expect(out.evidence.state).toBe('warn');
    expect(out.evidence.label).toBe('Needs example');
  });

  it('keeps POI neutral when there is no pending POI', () => {
    const out = computeTrainingSignals(baseInput({ transcript: 'Firstly, our stance is clear.' }));
    expect(out.poi.state).toBe('neutral');
    expect(out.poi.label).toBe('No POI');
  });

  it('detects a likely POI answer through keyword overlap and reasoning language', () => {
    const out = computeTrainingSignals(
      baseInput({
        pendingPoi: 'How would you protect students who need emotional support?',
        transcript:
          'However, emotional support remains protected because teachers still handle wellbeing while AI handles drills.'
      })
    );
    expect(out.poi.state).toBe('good');
    expect(out.poi.label).toBe('POI answered');
  });

  it('warns when a pending POI has not been addressed after 45 seconds', () => {
    const out = computeTrainingSignals(
      baseInput({
        pendingPoi: 'How would you protect students who need emotional support?',
        elapsedSeconds: 52,
        transcript: 'Firstly, AI tutors can personalize homework for every student.'
      })
    );
    expect(out.poi.state).toBe('warn');
    expect(out.poi.label).toBe('Address POI');
  });

  it('warns for long average sentence length', () => {
    const out = computeTrainingSignals(
      baseInput({
        transcript:
          'This policy should pass because it gives every student a private tutor at home while reducing teacher workload and allowing schools to focus on deeper classroom discussion.'
      })
    );
    expect(out.clarity.state).toBe('warn');
    expect(out.clarity.label).toBe('Shorten sentences');
  });
});
