/**
 * TTS provider abstraction. Returns an MP3 Buffer.
 *
 *  - `edge`    — Microsoft Edge-TTS (Azure Neural, free endpoint via msedge-tts)
 *  - `openai`  — OpenAI /v1/audio/speech compatible (also works for any
 *                OpenAI-compatible TTS server such as **VoxCPM via vLLM-Omni**,
 *                Kokoro-FastAPI, openai-edge-tts, etc.)
 *
 * Switch via TTS_PROVIDER env. Defaults to `edge`.
 */

import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

export type TtsProvider = 'edge' | 'openai';

export interface TtsRequest {
  text: string;
  voice?: string;
  rate?: string;
  pitch?: string;
}

export async function synthesize(req: TtsRequest): Promise<Buffer> {
  const provider = (process.env.TTS_PROVIDER || 'edge').toLowerCase() as TtsProvider;
  switch (provider) {
    case 'edge':
      return synthEdge(req);
    case 'openai':
      return synthOpenAI(req);
    default:
      throw new Error(`Unknown TTS_PROVIDER: ${provider}`);
  }
}

async function synthEdge(req: TtsRequest): Promise<Buffer> {
  const tts = new MsEdgeTTS();
  await tts.setMetadata(
    req.voice || process.env.TTS_VOICE || 'en-US-AriaNeural',
    OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3
  );
  const { audioStream } = tts.toStream(req.text, {
    rate: req.rate || process.env.TTS_RATE || '+0%',
    pitch: req.pitch || process.env.TTS_PITCH || '+0Hz',
    volume: '+0%'
  });
  const chunks: Buffer[] = [];
  await new Promise<void>((resolve, reject) => {
    audioStream.on('data', (c: Buffer) => chunks.push(c));
    audioStream.on('end', () => resolve());
    audioStream.on('error', reject);
  });
  try {
    tts.close();
  } catch {
    /* noop */
  }
  return Buffer.concat(chunks);
}

/**
 * Generic OpenAI-compatible `/v1/audio/speech` client.
 * Works for OpenAI itself **and** any compatible server:
 *  - VoxCPM via vLLM-Omni (`pip install vllm-omni && voxcpm serve`)
 *  - openai-edge-tts proxy
 *  - Kokoro-FastAPI
 *
 * Required env:
 *   OPENAI_TTS_BASE_URL   e.g. http://localhost:8808/v1   (VoxCPM)
 *   OPENAI_TTS_API_KEY    any string ok for self-hosted
 *   OPENAI_TTS_MODEL      e.g. voxcpm-2, tts-1, tts-1-hd
 *   TTS_VOICE             provider-specific voice id / reference name
 */
async function synthOpenAI(req: TtsRequest): Promise<Buffer> {
  const base = process.env.OPENAI_TTS_BASE_URL;
  const key = process.env.OPENAI_TTS_API_KEY || 'sk-local';
  const model = process.env.OPENAI_TTS_MODEL || 'tts-1';
  if (!base) {
    throw new Error('OPENAI_TTS_BASE_URL is required when TTS_PROVIDER=openai');
  }
  const res = await fetch(`${base}/audio/speech`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`
    },
    body: JSON.stringify({
      model,
      input: req.text,
      voice: req.voice || process.env.TTS_VOICE || 'alloy',
      response_format: 'mp3'
    })
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`TTS provider ${res.status}: ${detail.slice(0, 300)}`);
  }
  const ab = await res.arrayBuffer();
  return Buffer.from(ab);
}
