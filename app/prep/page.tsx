'use client';

import Link from 'next/link';
import { ArrowLeft, NotebookPen } from 'lucide-react';
import { useState } from 'react';
import { SAMPLE_MOTIONS } from '@/lib/prompts';

export default function PrepPage() {
  const [motion, setMotion] = useState(SAMPLE_MOTIONS[0]);
  const [custom, setCustom] = useState('');
  const [output, setOutput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function generate() {
    const m = custom.trim() || motion;
    setBusy(true);
    setError('');
    setOutput('');
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'prep',
          messages: [{ role: 'user', content: `Motion: ${m}` }]
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'prep failed');
      setOutput(String(data.content || ''));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'unknown error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-xs text-white/60 hover:text-white"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> 返回
      </Link>
      <h1 className="mt-4 flex items-center gap-2 text-2xl font-bold">
        <NotebookPen className="h-6 w-6 text-wsc-calm" /> 议题准备助理
      </h1>
      <p className="mt-1 text-sm text-white/60">
        输入议题，AI 给出正反方核心论点、定义、证据锚点与可能的反驳。
      </p>

      <div className="mt-6 grid gap-4">
        <div>
          <label className="mb-1 block text-xs text-white/50">Sample Motion</label>
          <select
            className="input"
            value={motion}
            onChange={(e) => {
              setMotion(e.target.value);
              setCustom('');
            }}
          >
            {SAMPLE_MOTIONS.map((m) => (
              <option key={m} value={m} className="bg-wsc-ink">
                {m}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-white/50">Custom Motion (optional)</label>
          <input
            className="input"
            placeholder="This House Would …"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
          />
        </div>
        <button
          type="button"
          className="btn-primary self-start"
          disabled={busy}
          onClick={() => void generate()}
        >
          {busy ? '生成中…' : '生成 prep notes'}
        </button>
        {error && <p className="text-sm text-wsc-accent">{error}</p>}
      </div>

      {output && (
        <pre className="card mt-8 whitespace-pre-wrap text-sm leading-relaxed text-white/90">
{output}
        </pre>
      )}
    </main>
  );
}
