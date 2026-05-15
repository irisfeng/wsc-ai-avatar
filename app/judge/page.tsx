'use client';

import Link from 'next/link';
import { ArrowLeft, Gavel } from 'lucide-react';
import { useState } from 'react';
import type { DebateSide } from '@/lib/prompts';
import type { RubricResult } from '@/lib/rubric';
import { RUBRIC_MAX } from '@/lib/rubric';
import { MotionPicker } from '@/components/chat/MotionPicker';
import { HistoryPanel } from '@/components/chat/HistoryPanel';
import { MOTIONS } from '@/lib/motions';
import { saveJudgeRun, type Session, type JudgeSession } from '@/lib/storage';

export default function JudgePage() {
  const [motion, setMotion] = useState(MOTIONS[0].text);
  const [side, setSide] = useState<DebateSide>('proposition');
  const [transcript, setTranscript] = useState('');
  const [result, setResult] = useState<RubricResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [historyKey, setHistoryKey] = useState(0);

  async function submit() {
    setBusy(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motion, speakerSide: side, transcript })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'score failed');
      setResult(data as RubricResult);
      try {
        await saveJudgeRun({
          motion,
          speakerSide: side,
          transcript,
          result: data as RubricResult
        });
        setHistoryKey((k) => k + 1);
      } catch {
        /* storage unavailable — ok */
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'unknown error');
    } finally {
      setBusy(false);
    }
  }

  function restoreSession(s: Session) {
    if (s.kind !== 'judge') return;
    const j = s as JudgeSession;
    setMotion(j.motion);
    setSide(j.speakerSide);
    setTranscript(j.transcript);
    setResult(j.result);
    setShowHistory(false);
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-xs text-white/60 hover:text-white"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> 返回
      </Link>
      <div className="mt-4 flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Gavel className="h-6 w-6 text-wsc-gold" /> AI 评委复盘
        </h1>
        <button
          type="button"
          className={
            showHistory
              ? 'rounded-full bg-wsc-calm px-3 py-1 text-xs text-wsc-ink'
              : 'rounded-full bg-white/5 px-3 py-1 text-xs text-white/60 hover:bg-white/10'
          }
          onClick={() => setShowHistory((v) => !v)}
        >
          历史
        </button>
      </div>
      <p className="mt-1 text-sm text-white/60">
        粘贴一段发言文字稿，AI 将按 WSC 评分维度给出 Style / Content / Strategy 三档分数与改进建议。
      </p>

      {showHistory && (
        <div className="mt-4 card">
          <HistoryPanel kind="judge" refreshKey={historyKey} onRestore={restoreSession} />
        </div>
      )}

      <div className="mt-6 grid gap-4">
        <div>
          <MotionPicker value={motion} onChange={setMotion} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-white/50">Speaker Side</label>
          <div className="flex gap-2 text-xs">
            {(['proposition', 'opposition'] as DebateSide[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSide(s)}
                className={
                  side === s
                    ? 'rounded-full bg-wsc-calm px-3 py-1 text-wsc-ink'
                    : 'rounded-full bg-white/5 px-3 py-1 text-white/70 hover:bg-white/10'
                }
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs text-white/50">Speech Transcript</label>
          <textarea
            className="input min-h-[200px]"
            placeholder="粘贴或输入辩手发言（建议 4 分钟稿约 500–700 词）…"
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
          />
        </div>
        <button
          type="button"
          className="btn-primary self-start"
          disabled={busy || !transcript.trim()}
          onClick={() => void submit()}
        >
          {busy ? 'AI 评分中…' : '开始评分'}
        </button>
        {error && <p className="text-sm text-wsc-accent">{error}</p>}
      </div>

      {result && (
        <section className="mt-8 grid gap-4">
          <div className="card flex items-end justify-between">
            <div>
              <div className="text-xs uppercase text-white/40">Total Score</div>
              <div className="text-4xl font-bold text-wsc-gold">
                {result.total}
                <span className="text-base font-normal text-white/40"> / {RUBRIC_MAX.total}</span>
              </div>
            </div>
            <div className="text-right text-xs text-white/40">
              <div>WSC Team Debate · MVP rubric</div>
              {result.provider && (
                <div className="mt-1 font-mono text-[10px] text-white/30">
                  graded by {result.provider.provider}/{result.provider.model}
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <CriterionCard label="Style" max={RUBRIC_MAX.style} value={result.style} />
            <CriterionCard label="Content" max={RUBRIC_MAX.content} value={result.content} />
            <CriterionCard label="Strategy" max={RUBRIC_MAX.strategy} value={result.strategy} />
          </div>

          {result.highlights.length > 0 && (
            <div className="card">
              <h3 className="mb-2 text-sm font-semibold text-wsc-calm">Highlights</h3>
              <ul className="list-disc pl-5 text-sm text-white/80">
                {result.highlights.map((h, i) => (
                  <li key={i}>{h}</li>
                ))}
              </ul>
            </div>
          )}
          {result.actionable.length > 0 && (
            <div className="card">
              <h3 className="mb-2 text-sm font-semibold text-wsc-accent">
                Actionable next steps
              </h3>
              <ol className="list-decimal pl-5 text-sm text-white/80">
                {result.actionable.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ol>
            </div>
          )}
        </section>
      )}
    </main>
  );
}

function CriterionCard({
  label,
  max,
  value
}: {
  label: string;
  max: number;
  value: { score: number; comment: string };
}) {
  return (
    <div className="card">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-xs uppercase text-white/40">{label}</span>
        <span className="text-2xl font-bold">
          {value.score}
          <span className="text-xs font-normal text-white/40"> / {max}</span>
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full bg-wsc-calm"
          style={{ width: `${Math.round((value.score / max) * 100)}%` }}
        />
      </div>
      <p className="mt-3 text-sm text-white/70">{value.comment}</p>
    </div>
  );
}
