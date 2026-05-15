/**
 * Client-side session storage using IndexedDB (via `idb`).
 *
 * Stores two kinds of artifacts:
 *  - debate sessions   (motion, side, turn-by-turn transcript)
 *  - judge runs        (motion, side, transcript, rubric result)
 *
 * Data never leaves the browser. Reset by clearing site data in DevTools.
 */

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { ChatMessage } from '@/lib/llm';
import type { DebateSide } from '@/lib/prompts';
import type { RubricResult } from '@/lib/rubric';

const DB_NAME = 'wsc-avatar';
const DB_VERSION = 1;

export interface DebateSession {
  id: string;
  kind: 'debate';
  motion: string;
  userSide: DebateSide;
  round: 'opening' | 'rebuttal' | 'reply';
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

export interface JudgeSession {
  id: string;
  kind: 'judge';
  motion: string;
  speakerSide: DebateSide;
  transcript: string;
  result: RubricResult;
  createdAt: number;
  /** Mirrors createdAt — kept so the shared `by-updated` index returns judge runs too. */
  updatedAt: number;
}

export type Session = DebateSession | JudgeSession;

interface WSCSchema extends DBSchema {
  sessions: {
    key: string;
    value: Session;
    indexes: {
      'by-updated': number;
      'by-kind': string;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<WSCSchema>> | null = null;

function getDB(): Promise<IDBPDatabase<WSCSchema>> {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB not available in this environment'));
  }
  if (!dbPromise) {
    dbPromise = openDB<WSCSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const store = db.createObjectStore('sessions', { keyPath: 'id' });
        store.createIndex('by-updated', 'updatedAt' as never);
        store.createIndex('by-kind', 'kind');
      }
    });
  }
  return dbPromise;
}

/** Close any open handle and clear the cached promise; tests use this between cases. */
export async function _resetForTests(): Promise<void> {
  if (dbPromise) {
    try {
      const db = await dbPromise;
      db.close();
    } catch {
      /* ignore */
    }
    dbPromise = null;
  }
}

function id(): string {
  // Reasonably unique without pulling uuid as a dependency
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ─── debate ───────────────────────────────────────────────────────

export async function startDebateSession(
  init: Omit<DebateSession, 'id' | 'kind' | 'createdAt' | 'updatedAt' | 'messages'> & {
    messages?: ChatMessage[];
  }
): Promise<DebateSession> {
  const now = Date.now();
  const s: DebateSession = {
    id: id(),
    kind: 'debate',
    motion: init.motion,
    userSide: init.userSide,
    round: init.round,
    messages: init.messages ?? [],
    createdAt: now,
    updatedAt: now
  };
  const db = await getDB();
  await db.put('sessions', s);
  return s;
}

export async function updateDebateSession(
  sessionId: string,
  patch: Partial<Pick<DebateSession, 'messages' | 'round' | 'userSide' | 'motion'>>
): Promise<DebateSession | null> {
  const db = await getDB();
  const existing = (await db.get('sessions', sessionId)) as DebateSession | undefined;
  if (!existing || existing.kind !== 'debate') return null;
  const updated: DebateSession = {
    ...existing,
    ...patch,
    updatedAt: Date.now()
  };
  await db.put('sessions', updated);
  return updated;
}

// ─── judge ────────────────────────────────────────────────────────

export async function saveJudgeRun(
  s: Omit<JudgeSession, 'id' | 'kind' | 'createdAt' | 'updatedAt'>
): Promise<JudgeSession> {
  const now = Date.now();
  const j: JudgeSession = {
    id: id(),
    kind: 'judge',
    createdAt: now,
    updatedAt: now,
    ...s
  };
  const db = await getDB();
  await db.put('sessions', j);
  return j;
}

// ─── generic ──────────────────────────────────────────────────────

export async function getSession(sessionId: string): Promise<Session | null> {
  const db = await getDB();
  return (await db.get('sessions', sessionId)) ?? null;
}

export async function listSessions(
  kind?: 'debate' | 'judge',
  limit = 20
): Promise<Session[]> {
  const db = await getDB();
  const idx = db.transaction('sessions').store.index('by-updated');
  const out: Session[] = [];
  let cursor = await idx.openCursor(null, 'prev');
  while (cursor && out.length < limit) {
    const v = cursor.value as Session;
    if (!kind || v.kind === kind) out.push(v);
    cursor = await cursor.continue();
  }
  return out;
}

export async function deleteSession(sessionId: string): Promise<void> {
  const db = await getDB();
  await db.delete('sessions', sessionId);
}

export async function clearAll(): Promise<void> {
  const db = await getDB();
  await db.clear('sessions');
}
