'use client';

import { useEffect, useState } from 'react';
import { Trash2, RotateCcw, History } from 'lucide-react';
import {
  listSessions,
  deleteSession,
  type Session,
  type DebateSession,
  type JudgeSession
} from '@/lib/storage';

interface Props {
  kind: 'debate' | 'judge';
  onRestore?: (s: Session) => void;
  /** monotonic counter — parent bumps it to force a refresh after writes */
  refreshKey?: number;
}

export function HistoryPanel({ kind, onRestore, refreshKey = 0 }: Props) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listSessions(kind, 30)
      .then((rows) => {
        if (!cancelled) setSessions(rows);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [kind, refreshKey]);

  async function onDelete(id: string) {
    await deleteSession(id);
    setSessions((prev) => prev.filter((s) => s.id !== id));
  }

  if (loading) {
    return <p className="px-3 py-2 text-xs text-white/40">Loading history…</p>;
  }
  if (sessions.length === 0) {
    return (
      <p className="px-3 py-2 text-xs text-white/40">
        <History className="mr-1 inline h-3 w-3" /> 还没有历史。完成一轮后会自动存到这里。
      </p>
    );
  }

  return (
    <ul className="space-y-1 px-1">
      {sessions.map((s) => (
        <li
          key={s.id}
          className="group rounded-lg px-2 py-1.5 text-xs hover:bg-white/5"
        >
          <div className="flex items-start gap-2">
            <button
              type="button"
              className="flex-1 text-left"
              onClick={() => onRestore?.(s)}
              title="Restore"
            >
              <div className="line-clamp-2 text-white/80">{summary(s)}</div>
              <div className="mt-0.5 text-[10px] text-white/40">
                {new Date(s.updatedAt).toLocaleString()} · {detail(s)}
              </div>
            </button>
            {onRestore && (
              <button
                type="button"
                onClick={() => onRestore(s)}
                className="text-white/30 opacity-0 hover:text-wsc-calm group-hover:opacity-100"
                title="Restore"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={() => void onDelete(s.id)}
              className="text-white/30 opacity-0 hover:text-wsc-accent group-hover:opacity-100"
              title="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}

function summary(s: Session): string {
  return s.motion;
}

function detail(s: Session): string {
  if (s.kind === 'debate') {
    const d = s as DebateSession;
    return `${d.userSide} · ${d.round} · ${d.messages.length} msg`;
  }
  const j = s as JudgeSession;
  return `judge · ${j.speakerSide} · ${j.result.total}/60`;
}
