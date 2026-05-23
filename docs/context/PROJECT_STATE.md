# Project State

Last updated: 2026-05-23

## Product Goal

Build a usable AI audio/video conversation app prototype for World Scholar's Cup debate training. The product direction borrows from Pika-style avatar calls and skill-based agent workflows, but it should remain grounded in what can be tested and shipped locally.

## Current Capability

The primary experience is `/debate`:

- Pika-style Live2D call surface with avatar picker, call controls, captions, and self-view chrome.
- Browser microphone input through Web Speech API.
- Text-to-LLM flow through `/api/chat`, using the configured provider in `.env.local`.
- Streaming AI opponent responses.
- Sentence-level TTS through `/api/tts`, with abort support.
- Live2D audio playback and mouth movement.
- Quasi-real-time WSC training signals: Time, Structure, Evidence, POI, and Clarity.
- Training side panel on desktop and mobile drawer on narrow screens.
- Debate and judge sessions stored locally in IndexedDB.
- Local learner profile memory stores preferred avatar, practiced motions, recurring weak signals, and next recommended drill.

## Explicit Boundary

The current product is half-duplex:

`STT -> text submit -> LLM streaming -> sentence TTS -> Live2D playback`

It is not yet a true realtime duplex audio system. WebRTC, OpenAI Realtime API, server-side rooms, interruption over live audio streams, and multi-agent calls are next-stage work.

## Current Priorities

1. Skill registry for reusable debate training workflows.
2. Training panel as an artifact/review surface.
3. Voice steering and barge-in behavior.
4. Practice-loop automation.
5. Realtime audio proof of concept.

## Known Risks

- Browser STT quality depends on Chrome and microphone permissions.
- Edge-TTS latency and voice availability can vary.
- Live2D/Pixi warnings exist and should be distinguished from app errors.
- Local resource pressure matters; long-running multimedia or model tasks can push CPU temperature above a safe testing range.
- Training feedback is heuristic and should be presented as coaching guidance, not authoritative judging.

## Useful Commands

```bash
npm run dev
npm run typecheck
npm test
```

Use Chrome for microphone testing.
