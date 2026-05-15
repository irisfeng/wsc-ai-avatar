'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Mic, Send, Square } from 'lucide-react';
import type { ChatMessage } from '@/lib/llm';
import type { DebateSide } from '@/lib/prompts';
import { MOTIONS } from '@/lib/motions';
import { parseDebaterReply } from '@/lib/parseEmotion';
import { extractSentences, flushTail } from '@/lib/sentenceQueue';
import { AVATARS, DEFAULT_AVATAR_ID, resolveExpression } from '@/lib/avatars';
import { useMic } from '@/components/chat/useMic';
import { streamChat } from '@/components/chat/streamClient';
import { SentenceTtsQueue } from '@/components/chat/sentenceTtsQueue';
import { VideoCallScene } from '@/components/live2d/VideoCallScene';
import { useAudioMouth } from '@/components/live2d/useLipSync';
import { ChatMessages } from '@/components/chat/ChatMessages';
import { MotionPicker } from '@/components/chat/MotionPicker';
import { HistoryPanel } from '@/components/chat/HistoryPanel';
import {
  startDebateSession,
  updateDebateSession,
  type DebateSession,
  type Session
} from '@/lib/storage';

const Live2DStage = dynamic(
  () => import('@/components/live2d/Live2DStage').then((m) => m.Live2DStage),
  { ssr: false }
);

export default function DebatePage() {
  const avatar = AVATARS[DEFAULT_AVATAR_ID];
  const [motion, setMotion] = useState(MOTIONS[0].text);
  const [userSide, setUserSide] = useState<DebateSide>('proposition');
  const [round, setRound] = useState<'opening' | 'rebuttal' | 'reply'>('opening');
  const [emotionWord, setEmotionWord] = useState<string | undefined>(undefined);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = useState(''); // partial AI reply (raw, pre-parse)
  const [poi, setPoi] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>('');
  const [provider, setProvider] = useState<string | undefined>();
  const [showHistory, setShowHistory] = useState(false);
  const [historyKey, setHistoryKey] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const ttsQueueRef = useRef<SentenceTtsQueue | null>(null);
  const sentenceCursorRef = useRef(0);

  const mic = useMic('en-US');
  const { play, prime } = useAudioMouth();

  // Persist session whenever messages change (debounced via effect).
  useEffect(() => {
    if (messages.length === 0) return;
    (async () => {
      try {
        if (!sessionId) {
          const s = await startDebateSession({
            motion,
            userSide,
            round,
            messages
          });
          setSessionId(s.id);
        } else {
          await updateDebateSession(sessionId, {
            motion,
            userSide,
            round,
            messages
          });
        }
        setHistoryKey((k) => k + 1);
      } catch {
        /* storage unavailable — skip */
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  function restoreSession(s: Session) {
    if (s.kind !== 'debate') return;
    const d = s as DebateSession;
    setMotion(d.motion);
    setUserSide(d.userSide);
    setRound(d.round);
    setMessages(d.messages);
    setSessionId(d.id);
    setShowHistory(false);
    setPoi(undefined);
    setStreaming('');
  }

  function newSession() {
    setSessionId(null);
    setMessages([]);
    setPoi(undefined);
    setStreaming('');
    setEmotionWord(undefined);
  }

  async function send(textToSend: string) {
    const userMsg: ChatMessage = { role: 'user', content: textToSend.trim() };
    if (!userMsg.content) return;

    // E2: warm up AudioContext inside the user-gesture handler.
    void prime();

    setBusy(true);
    setError('');
    setPoi(undefined);
    setStreaming('');
    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setInput('');

    // Abort any in-flight stream / TTS from a previous turn.
    abortRef.current?.abort();
    ttsQueueRef.current?.abort();
    const ctl = new AbortController();
    abortRef.current = ctl;
    const ttsQueue = new SentenceTtsQueue();
    ttsQueueRef.current = ttsQueue;
    sentenceCursorRef.current = 0;

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
            // F1: incrementally extract complete sentences and pipeline TTS.
            const { sentences, newCursor } = extractSentences(
              raw,
              sentenceCursorRef.current
            );
            sentenceCursorRef.current = newCursor;
            for (const s of sentences) {
              ttsQueue.enqueue(s, (blob) => play(blob));
            }
          },
          onError: (err) => setError(err.message)
        }
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'stream failed');
    }

    // Stream finished — parse final + finalise UI immediately.
    const parsed = parseDebaterReply(raw);
    if (parsed.text) {
      setMessages([...nextHistory, { role: 'assistant', content: parsed.text }]);
    }
    setPoi(parsed.poi);
    if (parsed.emotion) setEmotionWord(parsed.emotion);
    setStreaming('');

    // Resolve LLM emotion word to this avatar's expression ID (e.g. exp_05 for Mao).
    const resolvedExpression = resolveExpression(avatar, parsed.emotion);

    // F1: speak any leftover body (sentence without terminator at end).
    const tail = flushTail(raw, sentenceCursorRef.current);
    if (tail) {
      ttsQueue.enqueue(tail, (blob) =>
        play(blob, { expression: resolvedExpression })
      );
    }
    // POI is spoken as its own unit, with a verbal prefix.
    if (parsed.poi) {
      ttsQueue.enqueue(`Point of Information. ${parsed.poi}`, (blob) =>
        play(blob)
      );
    }

    // Keep input disabled until she finishes speaking the whole turn.
    await ttsQueue.drain();
    setBusy(false);
  }

  function stopStreaming() {
    abortRef.current?.abort();
    ttsQueueRef.current?.abort();
  }

  function toggleMic() {
    if (mic.listening) {
      mic.stop();
    } else {
      // E2: also warm up audio here so voice-only flow gets sound.
      void prime();
      mic.start((finalText) => {
        if (finalText) void send(finalText);
      });
    }
  }

  return (
    <main className="grid h-screen grid-cols-1 md:grid-cols-[1fr_minmax(420px,_36rem)]">
      <section className="relative h-[40vh] md:h-screen">
        <VideoCallScene
          speakerName={`${avatar.label}`}
          speakerHint={
            emotionWord ? `${avatar.blurb} · feeling ${emotionWord}` : avatar.blurb
          }
          speaking={busy}
          className="absolute inset-0"
        >
          <Live2DStage
            modelUrl={avatar.modelUrl}
            expression={resolveExpression(avatar, emotionWord)}
            className="absolute inset-0"
            anchorX={avatar.anchorX}
            anchorY={avatar.anchorY}
            scale={avatar.scale}
          />
        </VideoCallScene>
        <Link
          href="/"
          className="absolute left-6 top-6 z-30 inline-flex items-center gap-1 rounded-full bg-black/50 px-3 py-1.5 text-xs text-white/80 backdrop-blur hover:bg-black/70"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> 返回
        </Link>
      </section>

      <aside className="flex h-[60vh] flex-col border-l border-white/10 bg-wsc-ink/95 md:h-screen">
        <header className="space-y-3 border-b border-white/10 p-4">
          <MotionPicker value={motion} onChange={setMotion} />
          <div className="flex flex-wrap items-center gap-2 text-xs">
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
            <span className="ml-auto flex items-center gap-1">
              <button
                type="button"
                className="rounded-full bg-white/5 px-2 py-0.5 text-[11px] text-white/60 hover:bg-white/10"
                onClick={newSession}
                title="新建一轮"
              >
                + 新建
              </button>
              <button
                type="button"
                className={
                  showHistory
                    ? 'rounded-full bg-wsc-calm px-2 py-0.5 text-[11px] text-wsc-ink'
                    : 'rounded-full bg-white/5 px-2 py-0.5 text-[11px] text-white/60 hover:bg-white/10'
                }
                onClick={() => setShowHistory((v) => !v)}
              >
                历史
              </button>
            </span>
          </div>
        </header>

        {showHistory && (
          <div className="border-b border-white/10 bg-white/[0.02] py-2">
            <HistoryPanel
              kind="debate"
              refreshKey={historyKey}
              onRestore={restoreSession}
            />
          </div>
        )}

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
