import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import {
  startDebateSession,
  updateDebateSession,
  saveJudgeRun,
  getLearnerProfile,
  saveLearnerProfile,
  updateLearnerProfile as updateStoredLearnerProfile,
  getSession,
  listSessions,
  deleteSession,
  clearAll,
  _resetForTests
} from '@/lib/storage';
import {
  createDefaultLearnerProfile,
  updateLearnerProfileFromPractice
} from '@/lib/learnerProfile';

beforeEach(async () => {
  // Close any open handle, then nuke the database file.
  await _resetForTests();
  await new Promise<void>((resolve) => {
    const req = indexedDB.deleteDatabase('wsc-avatar');
    req.onsuccess = () => resolve();
    req.onerror = () => resolve();
    req.onblocked = () => resolve();
  });
});

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

describe('storage — debate sessions', () => {
  it('startDebateSession persists with createdAt/updatedAt', async () => {
    const s = await startDebateSession({
      motion: 'THBT X.',
      userSide: 'proposition',
      round: 'opening'
    });
    expect(s.id).toMatch(/^\d+-/);
    expect(s.kind).toBe('debate');
    expect(s.messages).toEqual([]);
    expect(s.createdAt).toBe(s.updatedAt);

    const round = await getSession(s.id);
    expect(round).not.toBeNull();
    expect(round?.kind).toBe('debate');
  });

  it('updateDebateSession patches and bumps updatedAt', async () => {
    const s = await startDebateSession({
      motion: 'm',
      userSide: 'proposition',
      round: 'opening'
    });
    await sleep(3);
    const updated = await updateDebateSession(s.id, {
      messages: [{ role: 'user', content: 'hi' }]
    });
    expect(updated).not.toBeNull();
    expect(updated!.messages).toHaveLength(1);
    expect(updated!.updatedAt).toBeGreaterThan(updated!.createdAt);
  });

  it('updateDebateSession returns null on unknown id', async () => {
    expect(await updateDebateSession('no-such-id', { round: 'reply' })).toBeNull();
  });

  it('listSessions returns most-recent first', async () => {
    const a = await startDebateSession({ motion: 'A', userSide: 'proposition', round: 'opening' });
    await sleep(3);
    const b = await startDebateSession({ motion: 'B', userSide: 'opposition', round: 'opening' });
    await sleep(3);
    const c = await startDebateSession({ motion: 'C', userSide: 'proposition', round: 'opening' });

    const list = await listSessions('debate');
    expect(list.map((s) => s.id)).toEqual([c.id, b.id, a.id]);
  });

  it('deleteSession removes a single record', async () => {
    const s = await startDebateSession({ motion: 'X', userSide: 'proposition', round: 'opening' });
    await deleteSession(s.id);
    expect(await getSession(s.id)).toBeNull();
  });

  it('clearAll wipes the store', async () => {
    await startDebateSession({ motion: 'P', userSide: 'proposition', round: 'opening' });
    await startDebateSession({ motion: 'Q', userSide: 'opposition', round: 'opening' });
    await clearAll();
    expect(await listSessions()).toEqual([]);
  });
});

describe('storage — judge runs', () => {
  it('saveJudgeRun stores the rubric and shows up in listSessions', async () => {
    const r = await saveJudgeRun({
      motion: 'THBT Y.',
      speakerSide: 'opposition',
      transcript: 'Opening line.',
      result: {
        style: { score: 20, comment: 'ok' },
        content: { score: 22, comment: 'good evidence' },
        strategy: { score: 8, comment: 'clear' },
        total: 50,
        highlights: ['phrase'],
        actionable: ['tip']
      }
    });
    expect(r.kind).toBe('judge');
    expect(r.createdAt).toBe(r.updatedAt);
    const list = await listSessions('judge');
    expect(list).toHaveLength(1);
    expect((list[0] as typeof r).result.total).toBe(50);
  });

  it('listSessions with no kind returns both kinds', async () => {
    await startDebateSession({ motion: 'D', userSide: 'proposition', round: 'opening' });
    await sleep(2);
    await saveJudgeRun({
      motion: 'J',
      speakerSide: 'proposition',
      transcript: 't',
      result: {
        style: { score: 1, comment: '' },
        content: { score: 1, comment: '' },
        strategy: { score: 1, comment: '' },
        total: 3,
        highlights: [],
        actionable: []
      }
    });
    const all = await listSessions();
    expect(all).toHaveLength(2);
    expect(new Set(all.map((s) => s.kind))).toEqual(new Set(['debate', 'judge']));
  });
});

describe('storage — learner profile', () => {
  it('getLearnerProfile returns a default profile before one is saved', async () => {
    const profile = await getLearnerProfile();
    expect(profile.id).toBe('default');
    expect(profile.practicedMotions).toEqual([]);
    expect(profile.weakSignals).toEqual({});
  });

  it('saveLearnerProfile persists a profile', async () => {
    const profile = {
      ...createDefaultLearnerProfile(1000),
      preferredAvatarId: 'mao' as const
    };
    await saveLearnerProfile(profile);

    const stored = await getLearnerProfile();
    expect(stored.preferredAvatarId).toBe('mao');
    expect(stored.createdAt).toBe(1000);
  });

  it('updateLearnerProfile reads, mutates, and saves the profile', async () => {
    const updated = await updateStoredLearnerProfile((profile) =>
      updateLearnerProfileFromPractice(profile, {
        avatarId: 'mao',
        motion: 'THBT journeys matter.',
        signals: [
          {
            id: 'evidence',
            title: 'Evidence',
            label: 'Needs example',
            detail: 'Add a concrete case',
            state: 'warn'
          }
        ],
        now: 2000
      })
    );

    expect(updated.preferredAvatarId).toBe('mao');
    expect(updated.weakSignals.evidence?.count).toBe(1);
    expect(updated.nextDrill?.skillId).toBe('evidence-finder');

    const stored = await getLearnerProfile();
    expect(stored.weakSignals.evidence?.count).toBe(1);
  });

  it('clearAll wipes sessions and learner profiles', async () => {
    await startDebateSession({ motion: 'D', userSide: 'proposition', round: 'opening' });
    await saveLearnerProfile({
      ...createDefaultLearnerProfile(1000),
      preferredAvatarId: 'mao'
    });

    await clearAll();

    expect(await listSessions()).toEqual([]);
    expect((await getLearnerProfile()).preferredAvatarId).toBeUndefined();
  });
});
