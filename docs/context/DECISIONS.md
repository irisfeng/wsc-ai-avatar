# Decisions

Last updated: 2026-05-23

## D-001: Keep the Current Voice Flow Half-Duplex

Decision: Keep the current `/debate` voice flow as browser STT, text submission, LLM streaming, sentence-level TTS, and Live2D playback until a dedicated realtime audio proof of concept is built.

Why: This path is already testable locally, works with the current provider abstraction, and avoids prematurely committing to WebRTC or a Realtime API before the training product loop is validated.

Consequence: Product copy, QA docs, and implementation notes must not claim true realtime duplex audio.

## D-002: Use Heuristic Training Signals Before LLM Judging

Decision: Current live training feedback uses deterministic heuristics in `lib/trainingSignals.ts`.

Why: The feedback must be fast, cheap, and available while the learner is speaking or composing. A second LLM evaluation call would add latency and cost.

Consequence: The UI should present these signals as lightweight coaching prompts. Full rubric judging belongs in `/judge` or a post-call report.

## D-003: Prefer a Pika-Style Call Surface Over a Chat-First Layout

Decision: `/debate` should prioritize the avatar call stage. Training controls live in a desktop side panel or mobile drawer.

Why: The product is an AI audio/video conversation app prototype, not a conventional chat page.

Consequence: Avoid placing large cards or dense controls over the avatar face, mouth, captions, composer, or call controls.

## D-004: Store User Practice Locally First

Decision: Debate and judge sessions are stored in browser IndexedDB through `lib/storage.ts`.

Why: Local-first storage is enough for the prototype and avoids account/cloud complexity.

Consequence: Future learner profile memory should extend the local storage model before adding backend persistence.

## D-005: Treat Resource Pressure as a Product Constraint

Decision: Resource usage and CPU temperature are part of the acceptance criteria for local testing.

Why: The user has observed CPU temperatures above 75°C while other multimedia jobs were running.

Consequence: Verification should pause under heavy background load, and future implementation should include a low-resource mode.

## D-006: Use Visual HTML for Major Specs and Plans

Decision: Major product specs, implementation plans, and acceptance plans should be archived as visual HTML under `docs/superpowers/`.

Why: This project is visually driven, and HTML artifacts are easier to review beside the app.

Consequence: Markdown can hold implementation detail, but key product/QA documents should have a visual HTML version when useful.
