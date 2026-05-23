# WSC AI Avatar Agent Instructions

## Project Memory

Treat `docs/context/` as the durable project memory for this repository. When a change affects product scope, architecture, testing, known risks, or next-step priorities, update the relevant context file in the same change.

Use these files as the first stop before planning substantial work:

- `docs/context/PROJECT_STATE.md` — current product status, capability boundary, and near-term priorities.
- `docs/context/DECISIONS.md` — architecture and product decisions that should not be rediscovered each session.
- `docs/context/QA_LOG.md` — verification history, screenshots, command results, and known validation gaps.

Do not rewrite context files for cosmetic edits or empty progress. Add durable facts: decisions, blockers, verification evidence, and follow-up actions that future agents should know.

## Current Product Boundary

The `/debate` experience is currently a Pika-style half-duplex voice training prototype:

1. Browser STT captures the learner's speech.
2. The app sends text to the selected LLM provider through `/api/chat`.
3. AI responses stream back over SSE.
4. Sentence-level TTS generates audio through `/api/tts`.
5. Live2D playback drives avatar speech and mouth movement.
6. Lightweight heuristics provide quasi-real-time WSC training feedback.

Do not describe the current product as true realtime duplex audio, WebRTC, or OpenAI Realtime API unless that is implemented and verified.

## Development Rules

- Keep changes small and independently verifiable.
- Prefer existing patterns in `app/`, `components/`, `lib/`, and `tests/`.
- Run `npm run typecheck` and `npm test` before claiming runtime code is complete.
- For UI changes, verify `/debate` in desktop and mobile-sized viewports when practical.
- For voice changes, verify both `/api/tts` and the in-browser call flow when practical.
- Treat CPU temperature and local background workloads as release risks. Avoid long-running multimedia or model tests when the machine is already under load.

## Documentation Rules

- Specs and visual plans live under `docs/superpowers/`.
- Durable project state lives under `docs/context/`.
- If a test or acceptance criterion changes, update `docs/superpowers/specs/2026-05-23-current-stage-test-acceptance.html` or add a successor document.
