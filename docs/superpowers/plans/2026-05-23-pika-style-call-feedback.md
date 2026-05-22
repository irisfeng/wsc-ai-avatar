# Pika-Style Call Feedback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert `/debate` into a Pika-style adaptive video-call training experience with lightweight quasi-real-time WSC feedback.

**Architecture:** Keep the existing LLM/SSE/TTS/Live2D pipeline intact. Add a pure `lib/trainingSignals.ts` heuristic engine, render those signals through small client components, and reorganize `app/debate/page.tsx` so the video call is primary while training controls live in a desktop side panel or mobile drawer.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript strict, Tailwind CSS, lucide-react, Vitest.

---

## File Structure

- Create `lib/trainingSignals.ts`: pure heuristic signal engine for Time, Structure, Evidence, POI, and Clarity.
- Create `tests/trainingSignals.test.ts`: unit coverage for all signal states and edge cases.
- Create `components/chat/TrainingMetricStrip.tsx`: compact overlay metric renderer for the call stage.
- Create `components/chat/TrainingDrawer.tsx`: right-side/mobile training panel for motion, role, round, checklist, transcript, POI, and history controls.
- Modify `components/live2d/VideoCallScene.tsx`: accept optional training overlay slot and panel toggle controls without knowing training logic.
- Modify `app/debate/page.tsx`: wire elapsed timing, mic/input transcript, training signals, responsive drawer state, and the new components.
- Modify `app/globals.css`: add small utility classes only if Tailwind cannot express the mobile drawer transition cleanly.

## Task 1: Heuristic Signal Engine

**Files:**
- Create: `lib/trainingSignals.ts`
- Create: `tests/trainingSignals.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/trainingSignals.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  computeTrainingSignals,
  roundTargetSeconds,
  type TrainingSignalInput
} from '@/lib/trainingSignals';

function baseInput(overrides: Partial<TrainingSignalInput> = {}): TrainingSignalInput {
  return {
    transcript: '',
    elapsedSeconds: 0,
    round: 'opening',
    pendingPoi: undefined,
    ...overrides
  };
}

describe('roundTargetSeconds', () => {
  it('uses 4 minutes for opening and rebuttal', () => {
    expect(roundTargetSeconds('opening')).toBe(240);
    expect(roundTargetSeconds('rebuttal')).toBe(240);
  });

  it('uses 2 minutes for reply', () => {
    expect(roundTargetSeconds('reply')).toBe(120);
  });
});

describe('computeTrainingSignals', () => {
  it('marks time as starting before the speaker reaches 30 percent of target', () => {
    const out = computeTrainingSignals(baseInput({ elapsedSeconds: 50 }));
    expect(out.time.state).toBe('neutral');
    expect(out.time.label).toBe('Building');
    expect(out.time.detail).toBe('0:50 / 4:00');
  });

  it('warns when the speaker is near the target limit', () => {
    const out = computeTrainingSignals(baseInput({ elapsedSeconds: 220 }));
    expect(out.time.state).toBe('warn');
    expect(out.time.label).toBe('Wrap up soon');
  });

  it('detects signposting language', () => {
    const out = computeTrainingSignals(
      baseInput({ transcript: 'Firstly, we protect access. Secondly, we reduce harm.' })
    );
    expect(out.structure.state).toBe('good');
    expect(out.structure.label).toBe('Signpost found');
  });

  it('warns when no structure marker is present after enough words', () => {
    const out = computeTrainingSignals(
      baseInput({
        transcript:
          'AI tutors help students learn at home because many learners need practice outside school hours.'
      })
    );
    expect(out.structure.state).toBe('warn');
    expect(out.structure.label).toBe('Add structure');
  });

  it('detects evidence and examples', () => {
    const out = computeTrainingSignals(
      baseInput({ transcript: 'For example, a 2024 study showed faster feedback improved revision.' })
    );
    expect(out.evidence.state).toBe('good');
    expect(out.evidence.label).toBe('Evidence present');
  });

  it('warns when the speech has claims but no example marker', () => {
    const out = computeTrainingSignals(
      baseInput({
        transcript:
          'This improves learning outcomes because students receive more practice and clearer feedback from the system.'
      })
    );
    expect(out.evidence.state).toBe('warn');
    expect(out.evidence.label).toBe('Needs example');
  });

  it('keeps POI neutral when there is no pending POI', () => {
    const out = computeTrainingSignals(baseInput({ transcript: 'Firstly, our stance is clear.' }));
    expect(out.poi.state).toBe('neutral');
    expect(out.poi.label).toBe('No POI');
  });

  it('detects a likely POI answer through keyword overlap and reasoning language', () => {
    const out = computeTrainingSignals(
      baseInput({
        pendingPoi: 'How would you protect students who need emotional support?',
        transcript:
          'However, emotional support remains protected because teachers still handle wellbeing while AI handles drills.'
      })
    );
    expect(out.poi.state).toBe('good');
    expect(out.poi.label).toBe('POI answered');
  });

  it('warns when a pending POI has not been addressed after 45 seconds', () => {
    const out = computeTrainingSignals(
      baseInput({
        pendingPoi: 'How would you protect students who need emotional support?',
        elapsedSeconds: 52,
        transcript: 'Firstly, AI tutors can personalize homework for every student.'
      })
    );
    expect(out.poi.state).toBe('warn');
    expect(out.poi.label).toBe('Address POI');
  });

  it('warns for long average sentence length', () => {
    const out = computeTrainingSignals(
      baseInput({
        transcript:
          'This policy should pass because it gives every student a private tutor at home while reducing teacher workload and allowing schools to focus on deeper classroom discussion.'
      })
    );
    expect(out.clarity.state).toBe('warn');
    expect(out.clarity.label).toBe('Shorten sentences');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
npm test -- tests/trainingSignals.test.ts
```

Expected: FAIL because `@/lib/trainingSignals` does not exist.

- [ ] **Step 3: Implement the signal engine**

Create `lib/trainingSignals.ts`:

```ts
import type { DebateContext } from '@/lib/prompts';

export type TrainingSignalState = 'good' | 'warn' | 'neutral';
export type TrainingSignalId = 'time' | 'structure' | 'evidence' | 'poi' | 'clarity';

export interface TrainingSignal {
  id: TrainingSignalId;
  title: string;
  label: string;
  detail: string;
  state: TrainingSignalState;
}

export interface TrainingSignalInput {
  transcript: string;
  elapsedSeconds: number;
  round: DebateContext['round'];
  pendingPoi?: string;
}

export interface TrainingSignals {
  time: TrainingSignal;
  structure: TrainingSignal;
  evidence: TrainingSignal;
  poi: TrainingSignal;
  clarity: TrainingSignal;
  checklist: TrainingSignal[];
}

const SIGNPOST_RE =
  /\b(firstly|secondly|thirdly|my first argument|my second argument|first argument|second argument|therefore|in conclusion|to summarize)\b/i;
const EVIDENCE_RE =
  /\b(for example|for instance|study|data|according to|in 20\d{2}|case of|research|survey|report)\b/i;
const REASONING_RE = /\b(because|however|therefore|that means|this proves|the reason|even if)\b/i;
const FILLER_RE = /\b(um|uh|like|you know)\b/gi;

export function roundTargetSeconds(round: DebateContext['round']): number {
  return round === 'reply' ? 120 : 240;
}

export function computeTrainingSignals(input: TrainingSignalInput): TrainingSignals {
  const transcript = normalize(input.transcript);
  const words = wordTokens(transcript);
  const wordCount = words.length;
  const target = roundTargetSeconds(input.round);
  const elapsed = Math.max(0, Math.floor(input.elapsedSeconds));
  const timeRatio = target === 0 ? 0 : elapsed / target;

  const time: TrainingSignal =
    timeRatio >= 0.9
      ? signal('time', 'Time', 'Wrap up soon', `${formatTime(elapsed)} / ${formatTime(target)}`, 'warn')
      : timeRatio >= 0.3
        ? signal('time', 'Time', 'Good pace', `${formatTime(elapsed)} / ${formatTime(target)}`, 'good')
        : signal('time', 'Time', 'Building', `${formatTime(elapsed)} / ${formatTime(target)}`, 'neutral');

  const hasStructure = SIGNPOST_RE.test(transcript);
  const structure: TrainingSignal = hasStructure
    ? signal('structure', 'Structure', 'Signpost found', 'Clear debate structure', 'good')
    : wordCount >= 10
      ? signal('structure', 'Structure', 'Add structure', 'Use Firstly / Secondly', 'warn')
      : signal('structure', 'Structure', 'Listening', 'Start with a stance', 'neutral');

  const hasEvidence = EVIDENCE_RE.test(transcript);
  const evidence: TrainingSignal = hasEvidence
    ? signal('evidence', 'Evidence', 'Evidence present', 'Example marker detected', 'good')
    : wordCount >= 10
      ? signal('evidence', 'Evidence', 'Needs example', 'Add a concrete case', 'warn')
      : signal('evidence', 'Evidence', 'Waiting', 'Use one example', 'neutral');

  const poi = computePoiSignal(input.pendingPoi, transcript, elapsed);
  const clarity = computeClaritySignal(transcript, wordCount);
  const checklist = [structure, evidence, poi, clarity];

  return { time, structure, evidence, poi, clarity, checklist };
}

function computePoiSignal(
  pendingPoi: string | undefined,
  transcript: string,
  elapsedSeconds: number
): TrainingSignal {
  if (!pendingPoi?.trim()) {
    return signal('poi', 'POI', 'No POI', 'No pending question', 'neutral');
  }

  const overlap = keywordOverlap(pendingPoi, transcript);
  if (overlap >= 1 && REASONING_RE.test(transcript)) {
    return signal('poi', 'POI', 'POI answered', 'Question addressed', 'good');
  }

  if (elapsedSeconds >= 45 || wordTokens(transcript).length >= 45) {
    return signal('poi', 'POI', 'Address POI', 'Answer the question directly', 'warn');
  }

  return signal('poi', 'POI', 'Pending', 'Work it into your next line', 'neutral');
}

function computeClaritySignal(transcript: string, wordCount: number): TrainingSignal {
  if (wordCount < 12) {
    return signal('clarity', 'Clarity', 'Listening', 'Keep sentences compact', 'neutral');
  }

  const sentences = transcript
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const avgSentenceWords =
    sentences.length === 0 ? wordCount : wordCount / Math.max(1, sentences.length);
  const fillerCount = transcript.match(FILLER_RE)?.length ?? 0;

  if (avgSentenceWords > 28) {
    return signal('clarity', 'Clarity', 'Shorten sentences', `${Math.round(avgSentenceWords)} words avg`, 'warn');
  }

  if (fillerCount >= 3) {
    return signal('clarity', 'Clarity', 'Reduce fillers', `${fillerCount} filler words`, 'warn');
  }

  return signal('clarity', 'Clarity', 'Clear delivery', `${Math.round(avgSentenceWords)} words avg`, 'good');
}

function signal(
  id: TrainingSignalId,
  title: string,
  label: string,
  detail: string,
  state: TrainingSignalState
): TrainingSignal {
  return { id, title, label, detail, state };
}

function normalize(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function wordTokens(value: string): string[] {
  return value.toLowerCase().match(/[a-z][a-z'-]*/g) ?? [];
}

function keywordOverlap(question: string, answer: string): number {
  const stop = new Set([
    'the',
    'and',
    'you',
    'your',
    'would',
    'could',
    'should',
    'how',
    'what',
    'why',
    'who',
    'that',
    'this',
    'with',
    'from',
    'need',
    'needs'
  ]);
  const q = new Set(wordTokens(question).filter((w) => w.length > 4 && !stop.has(w)));
  const a = new Set(wordTokens(answer));
  let count = 0;
  for (const word of q) {
    if (a.has(word)) count += 1;
  }
  return count;
}

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
npm test -- tests/trainingSignals.test.ts
```

Expected: PASS for `tests/trainingSignals.test.ts`.

- [ ] **Step 5: Commit**

```bash
git add lib/trainingSignals.ts tests/trainingSignals.test.ts
git commit -m "feat: add debate training signal heuristics"
```

## Task 2: Training Metric Strip

**Files:**
- Create: `components/chat/TrainingMetricStrip.tsx`
- Modify: `components/live2d/VideoCallScene.tsx`

- [ ] **Step 1: Create the metric strip component**

Create `components/chat/TrainingMetricStrip.tsx`:

```tsx
'use client';

import { AlertCircle, CheckCircle2, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TrainingSignal } from '@/lib/trainingSignals';

interface Props {
  signals: TrainingSignal[];
  className?: string;
}

export function TrainingMetricStrip({ signals, className }: Props) {
  return (
    <div
      className={cn(
        'grid w-full max-w-3xl grid-cols-2 gap-2 px-4 md:grid-cols-4',
        className
      )}
    >
      {signals.map((signal) => (
        <div
          key={signal.id}
          className="rounded-lg border border-white/[0.08] bg-black/45 px-3 py-2 text-white/90 shadow-[0_10px_30px_rgba(0,0,0,0.32)] backdrop-blur-md"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-white/48">{signal.title}</span>
            <SignalIcon state={signal.state} />
          </div>
          <div
            className={cn(
              'mt-1 truncate text-sm font-semibold',
              signal.state === 'good' && 'text-emerald-200',
              signal.state === 'warn' && 'text-amber-200',
              signal.state === 'neutral' && 'text-white/82'
            )}
            title={signal.label}
          >
            {signal.label}
          </div>
          <div className="mt-0.5 truncate text-[10px] text-white/45" title={signal.detail}>
            {signal.detail}
          </div>
        </div>
      ))}
    </div>
  );
}

function SignalIcon({ state }: { state: TrainingSignal['state'] }) {
  if (state === 'good') {
    return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />;
  }
  if (state === 'warn') {
    return <AlertCircle className="h-3.5 w-3.5 text-amber-300" />;
  }
  return <Circle className="h-3.5 w-3.5 text-white/35" />;
}
```

- [ ] **Step 2: Add an overlay slot to VideoCallScene**

Modify the props in `components/live2d/VideoCallScene.tsx`:

```tsx
interface Props {
  speakerName: string;
  speakerHint?: string;
  speaking?: boolean;
  caption?: string;
  topRightSlot?: React.ReactNode;
  trainingSlot?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}
```

Update the function signature:

```tsx
export function VideoCallScene({
  speakerName,
  speakerHint,
  speaking = false,
  caption,
  topRightSlot,
  trainingSlot,
  children,
  className
}: Props) {
```

Render the slot above the controls and below the caption:

```tsx
      {trainingSlot && (
        <div className="pointer-events-none absolute inset-x-0 bottom-24 z-40 flex justify-center">
          <div className="pointer-events-auto w-full">{trainingSlot}</div>
        </div>
      )}
```

Place that block before the existing bottom control bar. If the caption overlaps, move the existing caption block from `bottom-28` to `bottom-44`.

- [ ] **Step 3: Run typecheck**

Run:

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add components/chat/TrainingMetricStrip.tsx components/live2d/VideoCallScene.tsx
git commit -m "feat: add training metric overlay"
```

## Task 3: Training Drawer Component

**Files:**
- Create: `components/chat/TrainingDrawer.tsx`
- Modify: `app/debate/page.tsx` in Task 4 only

- [ ] **Step 1: Create the drawer component**

Create `components/chat/TrainingDrawer.tsx`:

```tsx
'use client';

import { History, Plus, X } from 'lucide-react';
import type { ChatMessage } from '@/lib/llm';
import type { DebateSide } from '@/lib/prompts';
import type { TrainingSignal } from '@/lib/trainingSignals';
import { cn } from '@/lib/utils';
import { ChatMessages } from '@/components/chat/ChatMessages';
import { HistoryPanel } from '@/components/chat/HistoryPanel';
import { MotionPicker } from '@/components/chat/MotionPicker';
import type { Session } from '@/lib/storage';

interface Props {
  open: boolean;
  mobile: boolean;
  motion: string;
  onMotionChange: (value: string) => void;
  userSide: DebateSide;
  onUserSideChange: (value: DebateSide) => void;
  round: 'opening' | 'rebuttal' | 'reply';
  onRoundChange: (value: 'opening' | 'rebuttal' | 'reply') => void;
  checklist: TrainingSignal[];
  messages: ChatMessage[];
  poi?: string;
  streaming?: string;
  error?: string;
  provider?: string;
  micStatus?: string;
  historyKey: number;
  showHistory: boolean;
  onToggleHistory: () => void;
  onRestoreSession: (session: Session) => void;
  onNewSession: () => void;
  onClose: () => void;
}

export function TrainingDrawer({
  open,
  mobile,
  motion,
  onMotionChange,
  userSide,
  onUserSideChange,
  round,
  onRoundChange,
  checklist,
  messages,
  poi,
  streaming,
  error,
  provider,
  micStatus,
  historyKey,
  showHistory,
  onToggleHistory,
  onRestoreSession,
  onNewSession,
  onClose
}: Props) {
  return (
    <aside
      className={cn(
        'flex min-h-0 flex-col border-white/10 bg-wsc-ink/95 text-white shadow-2xl backdrop-blur-xl',
        mobile
          ? 'fixed inset-x-0 bottom-0 z-50 max-h-[82vh] rounded-t-2xl border-t transition-transform duration-200'
          : 'relative h-screen border-l',
        mobile && !open && 'translate-y-full',
        !mobile && !open && 'hidden'
      )}
    >
      <header className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold">Training</h2>
          <p className="text-[11px] text-white/45">准实时 WSC feedback</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className="drawer-icon-button" onClick={onNewSession} title="新建一轮">
            <Plus className="h-4 w-4" />
          </button>
          <button type="button" className="drawer-icon-button" onClick={onToggleHistory} title="历史">
            <History className="h-4 w-4" />
          </button>
          {mobile && (
            <button type="button" className="drawer-icon-button" onClick={onClose} title="关闭">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </header>

      <div className="space-y-3 border-b border-white/10 p-4">
        <MotionPicker value={motion} onChange={onMotionChange} />
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <DrawerToggle
            active={userSide === 'proposition'}
            onClick={() => onUserSideChange('proposition')}
          >
            我:Proposition
          </DrawerToggle>
          <DrawerToggle
            active={userSide === 'opposition'}
            onClick={() => onUserSideChange('opposition')}
          >
            我:Opposition
          </DrawerToggle>
          {(['opening', 'rebuttal', 'reply'] as const).map((value) => (
            <DrawerToggle key={value} active={round === value} onClick={() => onRoundChange(value)}>
              {value}
            </DrawerToggle>
          ))}
        </div>
      </div>

      <section className="border-b border-white/10 p-4">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/45">
          Checklist
        </h3>
        <div className="space-y-1">
          {checklist.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg bg-white/[0.035] px-3 py-2">
              <div className="min-w-0">
                <div className="truncate text-xs text-white/85">{item.label}</div>
                <div className="truncate text-[10px] text-white/40">{item.detail}</div>
              </div>
              <span
                className={cn(
                  'h-2.5 w-2.5 shrink-0 rounded-full',
                  item.state === 'good' && 'bg-emerald-300',
                  item.state === 'warn' && 'bg-amber-300',
                  item.state === 'neutral' && 'bg-white/25'
                )}
              />
            </div>
          ))}
        </div>
      </section>

      {showHistory && (
        <div className="border-b border-white/10 bg-white/[0.02] py-2">
          <HistoryPanel kind="debate" refreshKey={historyKey} onRestore={onRestoreSession} />
        </div>
      )}

      <section className="min-h-0 flex-1 overflow-y-auto p-4">
        {messages.length === 0 && !streaming ? (
          <p className="text-sm text-white/40">
            点击麦克风或输入第一段发言。AI 数字人将以对方辩手身份回应。
          </p>
        ) : (
          <ChatMessages messages={messages} poi={poi} streaming={streaming} />
        )}
        {error && <p className="mt-3 text-xs text-wsc-accent">{error}</p>}
        {micStatus && <p className="mt-3 text-xs text-wsc-calm">{micStatus}</p>}
        {provider && (
          <p className="mt-3 font-mono text-[10px] text-white/30">powered by {provider}</p>
        )}
      </section>
    </aside>
  );
}

function DrawerToggle({
  active,
  onClick,
  children
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
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
      {children}
    </button>
  );
}
```

- [ ] **Step 2: Add the icon button utility**

Modify `app/globals.css` by adding:

```css
.drawer-icon-button {
  @apply inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-white/70 transition-colors hover:bg-white/10 hover:text-white;
}
```

- [ ] **Step 3: Run typecheck**

Run:

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add components/chat/TrainingDrawer.tsx app/globals.css
git commit -m "feat: add adaptive training drawer"
```

## Task 4: Wire Debate Page Into Adaptive Call Layout

**Files:**
- Modify: `app/debate/page.tsx`

- [ ] **Step 1: Update imports**

In `app/debate/page.tsx`, remove these imports:

```tsx
import { ArrowLeft, Mic, Send, Square } from 'lucide-react';
import { ChatMessages } from '@/components/chat/ChatMessages';
import { MotionPicker } from '@/components/chat/MotionPicker';
import { HistoryPanel } from '@/components/chat/HistoryPanel';
```

Replace them with:

```tsx
import { ArrowLeft, Mic, PanelRightOpen, Send, Square } from 'lucide-react';
import { TrainingDrawer } from '@/components/chat/TrainingDrawer';
import { TrainingMetricStrip } from '@/components/chat/TrainingMetricStrip';
import { computeTrainingSignals } from '@/lib/trainingSignals';
```

- [ ] **Step 2: Add elapsed-time and drawer state**

Inside `DebatePage`, after the existing state declarations, add:

```tsx
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [turnStartedAt, setTurnStartedAt] = useState<number | null>(null);
```

Add this effect after the storage effect:

```tsx
  useEffect(() => {
    if (turnStartedAt === null) return;
    const tick = () => {
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - turnStartedAt) / 1000)));
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [turnStartedAt]);
```

- [ ] **Step 3: Compute live training signals**

Add this before `restoreSession`:

```tsx
  const liveUserTranscript = [input, mic.interim].filter(Boolean).join(' ').trim();
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
    ? `录音中... ${mic.interim || '(开始说话)'}`
    : undefined;
```

- [ ] **Step 4: Reset timing at the right moments**

In `restoreSession`, add:

```tsx
    setElapsedSeconds(0);
    setTurnStartedAt(null);
```

In `newSession`, add:

```tsx
    setElapsedSeconds(0);
    setTurnStartedAt(null);
```

At the start of `send`, immediately after `if (!userMsg.content) return;`, add:

```tsx
    setTurnStartedAt(null);
```

In `toggleMic`, before `mic.start`, add:

```tsx
      setElapsedSeconds(0);
      setTurnStartedAt(Date.now());
```

When stopping mic, after `mic.stop();`, add:

```tsx
      setTurnStartedAt(null);
```

- [ ] **Step 5: Replace the page layout JSX**

Replace the top-level return wrapper:

```tsx
    <main className="grid h-screen grid-cols-1 md:grid-cols-[1fr_minmax(420px,_36rem)]">
```

with:

```tsx
    <main className="relative h-screen overflow-hidden bg-wsc-ink md:grid md:grid-cols-[minmax(0,_1fr)_minmax(360px,_28rem)]">
```

Replace the first section class:

```tsx
      <section className="relative h-[40vh] md:h-screen">
```

with:

```tsx
      <section className="relative h-screen min-w-0">
```

Inside `VideoCallScene`, pass the metric slot:

```tsx
          trainingSlot={<TrainingMetricStrip signals={visibleMetrics} />}
```

After the existing back `<Link>`, add a mobile/drawer opener:

```tsx
        <button
          type="button"
          className="absolute right-6 top-6 z-40 inline-flex items-center gap-1 rounded-full bg-black/50 px-3 py-1.5 text-xs text-white/80 backdrop-blur hover:bg-black/70 md:hidden"
          onClick={() => setDrawerOpen(true)}
        >
          <PanelRightOpen className="h-3.5 w-3.5" /> Training
        </button>
```

Delete the existing right-side `<aside>` block that begins with:

```tsx
      <aside className="flex h-[60vh] flex-col border-l border-white/10 bg-wsc-ink/95 md:h-screen">
```

and ends immediately before the closing `</main>`.

Replace that removed block with this desktop drawer plus mobile drawer pair:

```tsx
      <div className="hidden min-h-0 md:block">
        <TrainingDrawer
          open={drawerOpen}
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
```

Keep the existing footer input controls, but move them into a call overlay below the `VideoCallScene` section:

```tsx
        <div className="absolute inset-x-4 bottom-4 z-50 mx-auto max-w-3xl rounded-xl border border-white/10 bg-black/55 p-3 backdrop-blur-md">
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
              <button type="button" className="btn-ghost" onClick={stopStreaming} title="中断当前生成">
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
```

- [ ] **Step 6: Remove the old local Toggle component**

Delete the `Toggle` function at the bottom of `app/debate/page.tsx`, because `TrainingDrawer` owns those controls now.

- [ ] **Step 7: Run focused tests and typecheck**

Run:

```bash
npm test -- tests/trainingSignals.test.ts
npm run typecheck
```

Expected: both PASS.

- [ ] **Step 8: Commit**

```bash
git add app/debate/page.tsx
git commit -m "feat: make debate page an adaptive call experience"
```

## Task 5: Browser Verification And Polish

**Files:**
- Modify: `components/chat/TrainingMetricStrip.tsx` if overlay spacing needs adjustment.
- Modify: `components/chat/TrainingDrawer.tsx` if mobile drawer spacing needs adjustment.
- Modify: `components/live2d/VideoCallScene.tsx` if caption/metrics/control overlap appears.

- [ ] **Step 1: Start the dev server**

Run:

```bash
npm run dev
```

Expected: Next.js starts and prints a localhost URL, normally `http://localhost:3000`.

- [ ] **Step 2: Open `/debate` and inspect desktop**

Open:

```text
http://localhost:3000/debate
```

Expected desktop state:
- Live2D call stage fills the left/main area.
- Metric strip appears above the input overlay and does not cover the avatar face.
- Training drawer is visible on the right.
- Motion picker, side toggles, round toggles, checklist, transcript, history, and provider area are present.
- Text input and mic controls remain usable.

- [ ] **Step 3: Inspect mobile width**

Set viewport around `390x844`.

Expected mobile state:
- Call stage fills the screen.
- `Training` button appears at top right.
- Drawer opens from the bottom and can close.
- Metric strip uses two columns and does not overlap the text input.

- [ ] **Step 4: Run a manual heuristic check without LLM cost**

Type this into the text area without sending:

```text
Firstly, AI tutors can personalize practice. For example, a 2024 school report showed faster feedback improved revision.
```

Expected:
- Structure shows `Signpost found`.
- Evidence shows `Evidence present`.
- Clarity should be `Clear delivery` after enough words.

- [ ] **Step 5: Polish only concrete layout defects**

If the metric strip overlaps controls, change the `trainingSlot` wrapper in `VideoCallScene` from:

```tsx
bottom-24
```

to:

```tsx
bottom-32
```

If the caption overlaps metrics, keep caption at:

```tsx
bottom-44
```

If the input overlay covers too much of the avatar on mobile, change its textarea height from:

```tsx
min-h-[54px]
```

to:

```tsx
min-h-[44px]
```

- [ ] **Step 6: Run final verification**

Run:

```bash
npm test -- tests/trainingSignals.test.ts
npm run typecheck
```

Expected: both PASS.

- [ ] **Step 7: Commit**

```bash
git add components/chat/TrainingMetricStrip.tsx components/chat/TrainingDrawer.tsx components/live2d/VideoCallScene.tsx app/debate/page.tsx app/globals.css
git commit -m "fix: polish adaptive debate call layout"
```

## Self-Review

Spec coverage:
- Pika-style call stage: Task 2 and Task 4.
- Lightweight quasi-real-time heuristic feedback: Task 1 and Task 2.
- Desktop side panel and mobile bottom drawer: Task 3 and Task 4.
- No extra LLM evaluation call: Task 1 uses pure front-end heuristics and Task 4 keeps `/api/chat` unchanged.
- Transcript, POI, provider, history, motion, side, and round controls: Task 3.
- Type and test coverage: Task 1, Task 4, and Task 5.

Placeholder scan:
- This plan contains no unresolved placeholder sections and no deferred edge handling.

Type consistency:
- `TrainingSignal`, `TrainingSignalInput`, and `TrainingSignals` are defined in Task 1 and imported consistently in Tasks 2-4.
- `round` uses the existing `DebateContext['round']` union from `lib/prompts.ts`.
- `TrainingDrawer` uses existing `Session`, `ChatMessage`, and `DebateSide` types.
