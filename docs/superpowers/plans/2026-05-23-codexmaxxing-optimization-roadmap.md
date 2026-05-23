# Codexmaxxing Optimization Roadmap

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the WSC AI Avatar prototype into a durable, verifiable, skill-oriented training system.

**Architecture:** Proceed in small, independently testable layers. First establish durable project memory and executable verification, then add learner memory, skill registry, artifact review surfaces, voice steering, automation, and finally realtime audio proof-of-concept work.

**Tech Stack:** Next.js App Router, React, TypeScript, IndexedDB via `idb`, Vitest, local shell verification scripts, browser-based visual QA.

---

## Task 1: Durable Project Memory

**Files:**

- Create: `AGENTS.md`
- Create: `docs/context/PROJECT_STATE.md`
- Create: `docs/context/DECISIONS.md`
- Create: `docs/context/QA_LOG.md`

- [x] **Step 1: Create repository agent instructions**

Define how future agents should use `docs/context/`, what the current product boundary is, and which verification commands are required.

- [x] **Step 2: Create project state memory**

Record product goal, current capability, explicit half-duplex boundary, priorities, known risks, and useful commands.

- [x] **Step 3: Create decision log**

Record durable decisions around half-duplex voice, heuristic feedback, Pika-style UI, local-first storage, resource pressure, and visual HTML docs.

- [x] **Step 4: Create QA log**

Record current baseline verification, known warnings, and remaining manual gaps.

## Task 2: Executable Current-Stage Verifier

**Files:**

- Create: `scripts/verify-current-stage.sh`
- Modify: `package.json`
- Optional create: `tests/currentStageSmoke.test.ts`

- [x] **Step 1: Add a shell verifier**

Run typecheck, unit tests, and a local TTS smoke check against the dev server.

- [x] **Step 2: Add npm script**

Expose the verifier as `npm run verify:current`.

- [x] **Step 3: Document verifier output**

Update `docs/context/QA_LOG.md` with the command and expected pass/fail signals.

## Task 3: Learner Profile Memory

**Files:**

- Modify: `lib/storage.ts`
- Create: `lib/learnerProfile.ts`
- Create: `tests/learnerProfile.test.ts`
- Modify: `app/debate/page.tsx`
- Modify: `components/chat/TrainingDrawer.tsx`

- [x] Store avatar preference, recurring weak signals, last practiced motion tags, and suggested next drill.
- [x] Show the next recommended drill in the Training panel.
- [x] Keep all data local-first.

## Task 4: Skill Registry

**Files:**

- Create: `lib/skills.ts`
- Create: `tests/skills.test.ts`
- Modify: `components/chat/TrainingDrawer.tsx`
- Optional create: `components/chat/SkillPanel.tsx`

- [x] Add initial skills: `opening-coach`, `poi-drill`, `evidence-finder`, `judge-replay`, `style-coach`.
- [x] Render selectable skills without changing the core call flow.
- [x] Keep each skill declarative until a specific skill needs runtime execution.

## Task 5: Artifact Review Surface

**Files:**

- Modify: `components/chat/TrainingDrawer.tsx`
- Create: `components/chat/TranscriptPanel.tsx`
- Create: `components/chat/ReportPanel.tsx`
- Create: `lib/sessionReport.ts`
- Create: `tests/sessionReport.test.ts`

- [ ] Split Training Drawer into Live, Transcript, and Report views.
- [ ] Generate a local post-call report from session data.
- [ ] Make transcript and report copyable/exportable as Markdown.

## Task 6: Voice Steering and Barge-In

**Files:**

- Modify: `app/debate/page.tsx`
- Modify: `components/chat/useMic.ts`
- Modify: `components/live2d/useLipSync.ts`
- Modify: `components/chat/sentenceTtsQueue.ts`

- [ ] Allow the learner to interrupt TTS/LLM with a new mic turn.
- [ ] Distinguish normal answer submission from steering commands.
- [ ] Preserve abort safety and recovery to the next turn.

## Task 7: Practice Loop Automation

**Files:**

- Create: `lib/practicePlan.ts`
- Create: `tests/practicePlan.test.ts`
- Modify: `app/debate/page.tsx`
- Modify: `components/chat/TrainingDrawer.tsx`

- [ ] Generate a suggested next drill after each session.
- [ ] Surface continuation prompts when returning to `/debate`.
- [ ] Summarize trends every few sessions using local data.

## Task 8: Realtime Audio POC

**Files:**

- Create: `docs/superpowers/specs/realtime-audio-poc.html`
- Optional create: `app/realtime-poc/page.tsx`

- [ ] Specify provider choices and security constraints.
- [ ] Build a separate proof-of-concept route before touching `/debate`.
- [ ] Compare latency, interruption behavior, resource usage, and integration cost against the half-duplex baseline.
