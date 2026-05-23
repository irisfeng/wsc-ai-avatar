# QA Log

Last updated: 2026-05-23

## 2026-05-23 — Pika-Style Debate Call Baseline

Scope:

- `/debate` adaptive call UI.
- Voice hardening for half-duplex STT -> LLM -> TTS.
- Training metric strip and training drawer.
- Layout polish to avoid avatar/control overlap.
- Mao voice changed to `en-US-AnaNeural`.

Verification run:

```bash
npm run typecheck
npm test
```

Observed result:

- TypeScript check passed.
- Vitest passed: 13 test files, 122 tests.
- TTS smoke for `en-US-AnaNeural` returned HTTP 200 with audio bytes.
- Browser UI checks covered desktop, mobile, and mobile Training drawer screenshots.

Known warnings:

- Live2D/Pixi library deprecation warning around `autoInteract`.
- Live2D model asset resolution warnings can appear during load. Treat these separately from app runtime errors.

Remaining manual gaps:

- Real microphone permission and live STT must be tested by the user in Chrome.
- True realtime duplex audio has not been implemented or verified.
- Long-run resource profile needs a dedicated 10-minute local test when no heavy background jobs are running.

## Acceptance Reference

Current-stage acceptance document:

`docs/superpowers/specs/2026-05-23-current-stage-test-acceptance.html`

## Current-Stage Verifier

Command:

```bash
npm run verify:current
```

Expected checks:

- TypeScript passes.
- Vitest passes.
- Local dev server starts.
- `/debate` returns HTTP 200.
- `/api/tts` returns audio bytes for `en-US-AnaNeural`.

This verifier intentionally does not call the LLM provider. Use `npm run smoke` when a deeper provider-backed check is needed.

## 2026-05-23 — Learner Profile Memory

Scope:

- Added local learner profile model.
- Added IndexedDB `learnerProfiles` store.
- Connected `/debate` completed turns to profile updates.
- Training panel now shows a next recommended drill when enough practice data exists.

Verification run:

```bash
npm run typecheck
npm test
npm run verify:current
```

Observed result:

- TypeScript check passed.
- Vitest passed: 14 test files, 130 tests.
- Current-stage verifier passed, including `/debate` HTTP 200 and `en-US-AnaNeural` TTS smoke.

## 2026-05-23 — Debate Skill Registry

Scope:

- Added declarative debate skill registry.
- Added initial skills: Opening Coach, POI Drill, Evidence Finder, Judge Replay, and Style Coach.
- Rendered selectable skills in the Training panel without changing the core call flow.

Verification run:

```bash
npm run typecheck
npm test
npm run verify:current
```

Observed result:

- TypeScript check passed.
- Vitest passed: 15 test files, 133 tests.
- Current-stage verifier passed.

## 2026-05-23 — Current Route Maturity Test Hardening

Scope:

- Added avatar registry regression coverage for Live2D model paths, referenced textures, motions, sounds, expressions, voice ids, and layout hints.
- Fixed Haru asset completeness by adding missing referenced motions and sounds.
- Updated `scripts/setup-live2d.sh` so future Live2D installs fetch Haru's referenced runtime assets.
- Added a visual maturity test board for the current Live2D + half-duplex voice route.

Reference:

`docs/superpowers/specs/2026-05-23-current-route-maturity-test.html`

Verification run:

```bash
npm run typecheck
npm test
npm run verify:current
```

Observed result:

- TypeScript check passed.
- Vitest passed: 16 test files, 137 tests.
- Current-stage verifier passed, including `/debate` HTTP 200 and `en-US-AnaNeural` TTS smoke.
