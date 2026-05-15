'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRef, useState } from 'react';
import { ArrowLeft, Mic, Send, Square } from 'lucide-react';
import type { ChatMessage } from '@/lib/llm';
import type { DebateSide } from '@/lib/prompts';
import { SAMPLE_MOTIONS } from '@/lib/prompts';
import { parseDebaterReply } from '@/lib/parseEmotion';
import { useMic } from '@/components/chat/useMic';
import { fetchTTS } from '@/components/chat/ttsClient';
import { streamChat } from '@/components/chat/streamClient';
import { useAudioMouth } from '@/components/live2d/useLipSync';
import { ChatMessages } from '@/components/chat/ChatMessages';

const Live2DStage = dynamic(
  () => import('@/components/live2d/Live2DStage').then((m) => m.Live2DStage),
  { ssr: false }
);

export default function DebatePage() {
  const [motion, setMotion] = useState(SAMPLE_MOTIONS[0]);
  const [userSide, setUserSide] = useState<DebateSide>('proposition');
  const [round, setRound] = useState<'opening' | 'rebuttal' | 'reply'>('opening');
  const [expression, setExpression] = useState<string | undefined>(undefined);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = useState(''); // partial AI reply (raw, pre-parse)
  const [poi, setPoi] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>('');
  const [provider, setProvider] = useState<string | undefined>();
  const abortRef = useRef<AbortController | null>(null);

  const mic = useMic('en-US');
  const { play } = useAudioMouth();

  async function send(textToSend: string) {
    const userMsg: ChatMessage = { role: 'user', content: textToSend.trim() };
    if (!userMsg.content) return;
    setBusy(true);
    setError('');
    setPoi(undefined);
    setStreaming('');
    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setInput('');

    abortRef.current?.abort();
    const ctl = new AbortController();
    abortRef.current = ctl;

    let raw = '';
    try {
      await streamChat(
        {
          mode: 'opponent',
          messages: nextHistory,
          context: { motion, userSide, round }
        },
        {
          signal: ctl.signal,
          onMeta: (m) => setProvider(`${m.provider}/${m.model}`),
          onDelta: (delta) => {
            raw += delta;
            setStreaming(raw);
          },
          onError: (err) => setError(err.message)
        }
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'stream failed');
    }

    // Stream finished — parse and finalise.
    const parsed = parseDebaterReply(raw);
    if (parsed.text) {
      setMessages([...nextHistory, { role: 'assistant', content: parsed.text }]);
    }
    setPoi(parsed.poi);
    if (parsed.emotion) setExpression(parsed.emotion);
    setStreaming('');
    setBusy(false);

    // TTS speaks the full text after streaming completes (Edge-TTS needs full
    // sentence for prosody). Best-effort: failure does not break the turn.
    if (parsed.text) {
      try {
        const speakText = parsed.poi
          ? `${parsed.text}\nPoint of Information: ${parsed.poi}`
          : parsed.text;
        const blob = await fetchTTS(speakText);
        await play(blob, { expression: parsed.emotion });
      } catch (ttsErr) {
        // eslint-disable-next-line no-console
        console.warn('TTS skipped:', ttsErr);
      }
    }
  }

  function stopStreaming() {
    abortRef.current?.abort();
  }

  function toggleMic() {
    if (mic.listening) {
      mic.stop();
    } else {
      mic.start((finalText) => {
        if (finalText) void send(finalText);
      });
    }
  }

  return (
    <main className="grid h-screen grid-cols-1 md:grid-cols-[1fr_minmax(420px,_36rem)]">
      <section className="relative h-[40vh] bg-gradient-to-b from-sky-950/60 to-wsc-ink md:h-screen">
        <Live2DStage expression={expression} className="absolute inset-0" />
        <Link
          href="/"
          className="absolute left-4 top-4 inline-flex items-center gap-1 rounded-full bg-black/40 px-3 py-1.5 text-xs text-white/80 backdrop-blur hover:bg-black/60"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> 返回
        </Link>
        {expression && (
          <span className="chip absolute right-4 top-4 bg-black/40 backdrop-blur">
            mood: {expression}
          </span>
        )}
      </section>

      <aside className="flex h-[60vh] flex-col border-l border-white/10 bg-wsc-ink/95 md:h-screen">
        <header className="space-y-3 border-b border-white/10 p-4">
          <label className="block text-xs text-white/50">Motion</label>
          <select
            className="input"
            value={motion}
            onChange={(e) => setMotion(e.target.value)}
          >
            {SAMPLE_MOTIONS.map((m) => (
              <option key={m} value={m} className="bg-wsc-ink">
                {m}
              </option>
            ))}
          </select>
          <div className="flex flex-wrap gap-2 text-xs">
            <Toggle
              active={userSide === 'proposition'}
              onClick={() => setUserSide('proposition')}
              label="我:Proposition"
            />
            <Toggle
              active={userSide === 'opposition'}
              onClick={() => setUserSide('opposition')}
              label="我:Opposition"
            />
            <span className="mx-2 w-px self-stretch bg-white/10" />
            {(['opening', 'rebuttal', 'reply'] as const).map((r) => (
              <Toggle
                key={r}
                active={round === r}
                onClick={() => setRound(r)}
                label={r}
              />
            ))}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4">
          {messages.length === 0 && !streaming ? (
            <p className="text-sm text-white/40">
              点击麦克风或在下方输入你的第一段发言。AI 数字人将以对方辩手身份回应。
            </p>
          ) : (
            <ChatMessages messages={messages} poi={poi} streaming={streaming} />
          )}
          {error && <p className="mt-3 text-xs text-wsc-accent">{error}</p>}
          {mic.listening && (
            <p className="mt-3 text-xs text-wsc-calm">
              录音中… {mic.interim || '(开始说话)'}
            </p>
          )}
          {provider && (
            <p className="mt-3 font-mono text-[10px] text-white/30">
              powered by {provider}
            </p>
          )}
        </div>

        <footer className="space-y-2 border-t border-white/10 p-4">
          <textarea
            className="input min-h-[72px] resize-none"
            placeholder="输入你的发言（英文）或使用左侧麦克风…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={busy}
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn-ghost"
              onClick={toggleMic}
              disabled={!mic.supported || busy}
              title={mic.supported ? '浏览器麦克风（Chrome 推荐）' : '当前浏览器不支持'}
            >
              {mic.listening ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              {mic.listening ? 'Stop' : 'Mic'}
            </button>
            {busy && (
              <button
                type="button"
                className="btn-ghost"
                onClick={stopStreaming}
                title="中断当前生成"
              >
                <Square className="h-4 w-4" />
                Stop
              </button>
            )}
            <button
              type="button"
              className="btn-primary flex-1"
              disabled={busy || !input.trim()}
              onClick={() => void send(input)}
            >
              <Send className="h-4 w-4" />
              {busy ? 'AI 思考中…' : '发送'}
            </button>
          </div>
        </footer>
      </aside>
    </main>
  );
}

function Toggle({
  active,
  onClick,
  label
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? 'rounded-full bg-wsc-calm px-3 py-1 text-wsc-ink'
          : 'rounded-full bg-white/5 px-3 py-1 text-white/70 hover:bg-white/10'
      }
    >
      {label}
    </button>
  );
}
