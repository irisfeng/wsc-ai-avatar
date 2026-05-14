import { NextRequest } from 'next/server';
import { synthesize } from '@/lib/tts';

export const runtime = 'nodejs';

/**
 * Synthesises speech through the configured TTS provider (Edge-TTS by default,
 * any OpenAI-compatible endpoint — e.g. VoxCPM via vLLM-Omni — when
 * TTS_PROVIDER=openai). Returns a single MP3 response.
 */
export async function POST(req: NextRequest) {
  const { text, voice, rate, pitch } = (await req.json()) as {
    text?: string;
    voice?: string;
    rate?: string;
    pitch?: string;
  };
  if (!text || !text.trim()) {
    return new Response('text required', { status: 400 });
  }
  try {
    const buf = await synthesize({ text, voice, rate, pitch });
    const blob = new Blob([new Uint8Array(buf)], { type: 'audio/mpeg' });
    return new Response(blob, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': String(buf.length),
        'Cache-Control': 'no-store'
      }
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'tts failed';
    return new Response(message, { status: 500 });
  }
}
