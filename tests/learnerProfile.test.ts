import { describe, expect, it } from 'vitest';
import {
  createDefaultLearnerProfile,
  updateLearnerProfileFromPractice
} from '@/lib/learnerProfile';
import type { TrainingSignal } from '@/lib/trainingSignals';

function signal(
  id: TrainingSignal['id'],
  state: TrainingSignal['state'],
  label = 'Label',
  detail = 'Detail'
): TrainingSignal {
  return {
    id,
    title: id,
    label,
    detail,
    state
  };
}

describe('learner profile', () => {
  it('creates an empty default profile', () => {
    const profile = createDefaultLearnerProfile(1000);
    expect(profile.id).toBe('default');
    expect(profile.practicedMotions).toEqual([]);
    expect(profile.weakSignals).toEqual({});
    expect(profile.createdAt).toBe(1000);
    expect(profile.updatedAt).toBe(1000);
  });

  it('records avatar preference and recent practiced motions', () => {
    const profile = createDefaultLearnerProfile(1000);
    const updated = updateLearnerProfileFromPractice(profile, {
      avatarId: 'mao',
      motion: 'THBT journeys matter.',
      signals: [],
      now: 2000
    });

    expect(updated.preferredAvatarId).toBe('mao');
    expect(updated.practicedMotions).toEqual([
      { motion: 'THBT journeys matter.', count: 1, lastPracticedAt: 2000 }
    ]);
    expect(updated.updatedAt).toBe(2000);
  });

  it('increments weak signal counts and chooses a structure drill first', () => {
    const profile = createDefaultLearnerProfile(1000);
    const updated = updateLearnerProfileFromPractice(profile, {
      motion: 'THBT journeys matter.',
      signals: [
        signal('evidence', 'warn', 'Needs example', 'Add a concrete case'),
        signal('structure', 'warn', 'Add structure', 'Use Firstly / Secondly')
      ],
      now: 2000
    });

    expect(updated.weakSignals.structure?.count).toBe(1);
    expect(updated.weakSignals.evidence?.count).toBe(1);
    expect(updated.nextDrill?.skillId).toBe('opening-coach');
    expect(updated.nextDrill?.title).toBe('Drill signposting');
  });

  it('falls back to the most frequent historical weakness when the latest turn is clean', () => {
    const profile = updateLearnerProfileFromPractice(createDefaultLearnerProfile(1000), {
      motion: 'A',
      signals: [signal('evidence', 'warn')],
      now: 2000
    });
    const updated = updateLearnerProfileFromPractice(profile, {
      motion: 'B',
      signals: [signal('structure', 'good'), signal('evidence', 'good')],
      now: 3000
    });

    expect(updated.nextDrill?.skillId).toBe('evidence-finder');
  });
});
