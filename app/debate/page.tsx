'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Mic, PanelRightOpen, Send, Square } from 'lucide-react';
import type { ChatMessage } from '@/lib/llm';
import type { DebateSide } from '@/lib/prompts';
import { MOTIONS } from '@/lib/motions';
import { parseDebaterReply } from '@/lib/parseEmotion';
import { extractSentences, flushTail } from '@/lib/sentenceQueue';
import {
  AVATARS,
  DEFAULT_AVATAR_ID,
  resolveExpression,
  type AvatarId
} from '@/lib/avatars';
import { useMic } from '@/components/chat/useMic';
import { streamChat } from '@/components/chat/streamClient';
import { SentenceTtsQueue } from '@/components/chat/sentenceTtsQueue';
import { AvatarPicker } from '@/components/chat/AvatarPicker';
import { VideoCallScene } from '@/components/live2d/VideoCallScene';
import { useAudioMouth } from '@/components/live2d/useLipSync';
import { TrainingDrawer } from '@/components/chat/TrainingDrawer';
import { TrainingMetricStrip } from '@/components/chat/TrainingMetricStrip';
import { computeTrainingSignals } from '@/lib/trainingSignals';
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

const AVATAR_PREF_KEY = 'wsc.avatar';

export default function DebatePage() {
  const [avatarId, setAvatarId] = useState<AvatarId>(DEFAULT_AVATAR_ID);
  const avatar = AVATARS[avatarId];
  // Restore avatar choice from localStorage on mount; persist on change.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(AVATAR_PREF_KEY);
      if (saved && saved in AVATARS) setAvatarId(saved as AvatarId);
    } catch {
      /* localStorage blocked — ignore */
    }
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(AVATAR_PREF_KEY, avatarId);
    } catch {
      /* ignore */
    }
  }, [avatarId]);

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
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [turnStartedAt, setTurnStartedAt] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const ttsQueueRef = useRef<SentenceTtsQueue | null>(null);
  const sentenceCursorRef = useRef(0);

  const mic = useMic('en-US');
  const { play, prime, stop: stopAudio } = useAudioMouth();

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

  useEffect(() => {
    if (turnStartedAt === null) return;
    const tick = () => {
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - turnStartedAt) / 1000)));
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [turnStartedAt]);

  const liveUserTranscript = [input, mic.transcript].filter(Boolean).join(' ').trim();
  const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user')?.content ?? '';
  const signalTranscript = liveUserTranscript || lastUserMessage;
  const trainingSignals = computeTrainingSignals({
    transcript: signalTranscript,
    elapsedSeconds,
    round,
    pendingPoi: poi
  });
  const visibleMetrics = [
    trainingSignals.time,
    trainingSignals.structure,
    trainingSignals.evidence,
    trainingSignals.poi
  ];
  const micStatus = mic.listening
    ? `录音中... ${mic.transcript || '(开始说话)'}`
    : undefined;

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
    setElapsedSeconds(0);
    setTurnStartedAt(null);
  }

  function newSession() {
    setSessionId(null);
    setMessages([]);
    setPoi(undefined);
    setStreaming('');
    setEmotionWord(undefined);
    setElapsedSeconds(0);
    setTurnStartedAt(null);
  }

  async function send(textToSend: string) {
    const userMsg: ChatMessage = { role: 'user', content: textToSend.trim() };
    if (!userMsg.content) return;
    setTurnStartedAt(null);

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
    stopAudio();
    const ctl = new AbortController();
    abortRef.current = ctl;
    const ttsQueue = new SentenceTtsQueue({ voice: avatar.voice });
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
    stopAudio();
    setBusy(false);
  }

  function endCall() {
    if (mic.listening) mic.stop();
    stopStreaming();
  }

  function toggleMic() {
    if (mic.listening) {
      mic.stop();
      setTurnStartedAt(null);
    } else {
      // E2: also warm up audio here so voice-only flow gets sound.
      void prime();
      setElapsedSeconds(0);
      setTurnStartedAt(Date.now());
      mic.start((finalText) => {
        if (finalText) void send(finalText);
      });
    }
  }

  return (
    <main className="relative h-screen overflow-hidden bg-wsc-ink md:grid md:grid-cols-[minmax(0,_1fr)_minmax(360px,_28rem)]">
      <section className="relative h-screen min-w-0">
        <VideoCallScene
          speakerName={`${avatar.label}`}
          speakerHint={
            emotionWord ? `${avatar.blurb} · feeling ${emotionWord}` : avatar.blurb
          }
          speaking={busy}
          caption={liveCaption(streaming, messages)}
          className="absolute inset-0"
          micActive={mic.listening}
          micDisabled={!mic.supported || busy}
          onMicClick={toggleMic}
          onEndCall={endCall}
          trainingSlot={<TrainingMetricStrip signals={visibleMetrics} />}
          topRightSlot={
            <div className="hidden md:block">
              <AvatarPicker
                value={avatarId}
                onChange={setAvatarId}
                // Lock the picker while the AI is generating + speaking —
                // mid-turn swaps destroy the Pixi WebGL context and kill
                // the in-flight sentence-level TTS queue.
                disabled={busy}
              />
            </div>
          }
        >
          <Live2DStage
            // key forces a full unmount+remount when switching models —
            // PixiJS calls destroy(true, ...) which removes the <canvas>
            // from the DOM and tears down its WebGL context. Reusing the
            // same React canvas slot afterwards hands the new
            // PIXI.Application a detached canvas whose GL caps query
            // returns 0, tripping `checkMaxIfStatementsInShader`.
            // Keying by modelUrl gives every model a fresh canvas DOM
            // node and a fresh GL context.
            key={avatar.modelUrl}
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
        <button
          type="button"
          className="absolute right-6 top-6 z-40 inline-flex items-center gap-1 rounded-full bg-black/50 px-3 py-1.5 text-xs text-white/80 backdrop-blur hover:bg-black/70 md:hidden"
          onClick={() => setDrawerOpen(true)}
        >
          <PanelRightOpen className="h-3.5 w-3.5" /> Training
        </button>

        <div className="absolute inset-x-4 bottom-20 z-50 mx-auto max-w-3xl rounded-xl border border-white/10 bg-black/55 p-3 backdrop-blur-md">
          <textarea
            className="input min-h-[54px] resize-none"
            placeholder="输入你的发言（英文）或使用麦克风..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={busy}
          />
          <div className="mt-2 flex items-center gap-2">
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
              {busy ? 'AI 思考中...' : '发送'}
            </button>
          </div>
        </div>
      </section>

      <div className="hidden min-h-0 md:block">
        <TrainingDrawer
          open
          mobile={false}
          motion={motion}
          onMotionChange={setMotion}
          userSide={userSide}
          onUserSideChange={setUserSide}
          round={round}
          onRoundChange={setRound}
          checklist={trainingSignals.checklist}
          messages={messages}
          poi={poi}
          streaming={streaming}
          error={error}
          provider={provider}
          micStatus={micStatus}
          historyKey={historyKey}
          showHistory={showHistory}
          onToggleHistory={() => setShowHistory((v) => !v)}
          onRestoreSession={restoreSession}
          onNewSession={newSession}
          onClose={() => setDrawerOpen(false)}
        />
      </div>

      <div className="md:hidden">
        <TrainingDrawer
          open={drawerOpen}
          mobile
          motion={motion}
          onMotionChange={setMotion}
          userSide={userSide}
          onUserSideChange={setUserSide}
          round={round}
          onRoundChange={setRound}
          checklist={trainingSignals.checklist}
          messages={messages}
          poi={poi}
          streaming={streaming}
          error={error}
          provider={provider}
          micStatus={micStatus}
          historyKey={historyKey}
          showHistory={showHistory}
          onToggleHistory={() => setShowHistory((v) => !v)}
          onRestoreSession={restoreSession}
          onNewSession={newSession}
          onClose={() => setDrawerOpen(false)}
        />
      </div>
    </main>
  );
}

/**
 * Resolve what to show in the call-tile live caption strip.
 *  - While streaming: surface the latest in-progress sentence (skip
 *    stop markers; strip leftover tag noise).
 *  - Right after stream ends: surface the AI's last fully-rendered
 *    message for a couple beats so the user can still see what was said.
 *  - Otherwise: undefined (caption strip hides).
 */
function liveCaption(streaming: string, messages: ChatMessage[]): string | undefined {
  if (streaming) {
    // Trim any tag/POI tail and return the last partial sentence.
    const cut = streaming.split(/<|POI[:：]/, 1)[0].trim();
    if (!cut) return undefined;
    // Find the last sentence terminator; show only the most recent clause
    const re = /[.!?]\s+/g;
    let lastEnd = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(cut))) lastEnd = m.index + m[0].length;
    const tail = cut.slice(lastEnd).trim();
    return tail || cut.slice(-160);
  }
  // No live stream — show the last assistant turn if recent
  const last = [...messages].reverse().find((m) => m.role === 'assistant');
  if (!last) return undefined;
  // For a finished turn, show the LAST sentence of the reply
  const sentences = last.content.split(/(?<=[.!?])\s+/);
  return sentences[sentences.length - 1]?.trim() || undefined;
}
