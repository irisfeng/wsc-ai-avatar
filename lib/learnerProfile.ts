import type { AvatarId } from '@/lib/avatars';
import type { TrainingSignal, TrainingSignalId } from '@/lib/trainingSignals';

export const DEFAULT_LEARNER_PROFILE_ID = 'default';

export interface LearnerWeakSignal {
  id: TrainingSignalId;
  count: number;
  lastLabel: string;
  lastDetail: string;
  updatedAt: number;
}

export interface PracticedMotion {
  motion: string;
  count: number;
  lastPracticedAt: number;
}

export interface NextDrill {
  skillId: 'opening-coach' | 'poi-drill' | 'evidence-finder' | 'style-coach';
  title: string;
  detail: string;
  reason: string;
  createdAt: number;
}

export interface LearnerProfile {
  id: string;
  preferredAvatarId?: AvatarId;
  practicedMotions: PracticedMotion[];
  weakSignals: Partial<Record<TrainingSignalId, LearnerWeakSignal>>;
  nextDrill?: NextDrill;
  createdAt: number;
  updatedAt: number;
}

export interface PracticeUpdateInput {
  avatarId?: AvatarId;
  motion: string;
  signals: TrainingSignal[];
  now?: number;
}

export function createDefaultLearnerProfile(now = Date.now()): LearnerProfile {
  return {
    id: DEFAULT_LEARNER_PROFILE_ID,
    practicedMotions: [],
    weakSignals: {},
    createdAt: now,
    updatedAt: now
  };
}

export function updateLearnerProfileFromPractice(
  profile: LearnerProfile,
  input: PracticeUpdateInput
): LearnerProfile {
  const now = input.now ?? Date.now();
  const weakSignals = { ...profile.weakSignals };
  const warnings = input.signals.filter((signal) => signal.state === 'warn');

  for (const signal of warnings) {
    const existing = weakSignals[signal.id];
    weakSignals[signal.id] = {
      id: signal.id,
      count: (existing?.count ?? 0) + 1,
      lastLabel: signal.label,
      lastDetail: signal.detail,
      updatedAt: now
    };
  }

  return {
    ...profile,
    preferredAvatarId: input.avatarId ?? profile.preferredAvatarId,
    practicedMotions: updatePracticedMotions(profile.practicedMotions, input.motion, now),
    weakSignals,
    nextDrill: chooseNextDrill(warnings, weakSignals, now),
    updatedAt: now
  };
}

function updatePracticedMotions(
  practicedMotions: PracticedMotion[],
  motion: string,
  now: number
): PracticedMotion[] {
  const normalizedMotion = motion.trim();
  if (!normalizedMotion) return practicedMotions;

  const byMotion = new Map<string, PracticedMotion>();
  for (const item of practicedMotions) {
    byMotion.set(item.motion, item);
  }
  const existing = byMotion.get(normalizedMotion);
  byMotion.set(normalizedMotion, {
    motion: normalizedMotion,
    count: (existing?.count ?? 0) + 1,
    lastPracticedAt: now
  });

  return [...byMotion.values()]
    .sort((a, b) => b.lastPracticedAt - a.lastPracticedAt)
    .slice(0, 8);
}

function chooseNextDrill(
  warnings: TrainingSignal[],
  weakSignals: Partial<Record<TrainingSignalId, LearnerWeakSignal>>,
  now: number
): NextDrill {
  const priority: TrainingSignalId[] = ['structure', 'evidence', 'poi', 'clarity', 'time'];
  const warningIds = new Set(warnings.map((signal) => signal.id));
  const target =
    priority.find((id) => warningIds.has(id)) ??
    priority
      .map((id) => weakSignals[id])
      .filter((signal): signal is LearnerWeakSignal => Boolean(signal))
      .sort((a, b) => b.count - a.count)[0]?.id;

  switch (target) {
    case 'structure':
      return {
        skillId: 'opening-coach',
        title: 'Drill signposting',
        detail: 'Give a 45-second opening with “Firstly / Secondly / Therefore”.',
        reason: 'Recent practice needs clearer debate structure.',
        createdAt: now
      };
    case 'evidence':
      return {
        skillId: 'evidence-finder',
        title: 'Add one concrete example',
        detail: 'Prepare one case, study, or tournament-style example before the next turn.',
        reason: 'Recent practice lacked concrete evidence.',
        createdAt: now
      };
    case 'poi':
      return {
        skillId: 'poi-drill',
        title: 'Answer the POI directly',
        detail: 'Use “Even if..., because...” to answer one challenge in under 20 seconds.',
        reason: 'A pending POI was not addressed directly.',
        createdAt: now
      };
    case 'clarity':
      return {
        skillId: 'style-coach',
        title: 'Shorten sentence length',
        detail: 'Repeat the same argument in three compact sentences.',
        reason: 'Recent delivery needs clearer, shorter phrasing.',
        createdAt: now
      };
    case 'time':
      return {
        skillId: 'style-coach',
        title: 'Practice a clean wrap-up',
        detail: 'Finish with a 15-second conclusion before the timer turns red.',
        reason: 'Recent timing was close to the round limit.',
        createdAt: now
      };
    default:
      return {
        skillId: 'poi-drill',
        title: 'Increase pressure',
        detail: 'Try a tougher POI drill after your next opening.',
        reason: 'No urgent weakness found; increase debate difficulty.',
        createdAt: now
      };
  }
}
