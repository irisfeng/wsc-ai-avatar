import { NextRequest, NextResponse } from 'next/server';
import {
  streamChatCompletion,
  currentProviderInfo,
  type ChatMessage
} from '@/lib/llm';
import {
  opponentSystemPrompt,
  prepSystemPrompt,
  type DebateContext
} from '@/lib/prompts';

export const runtime = 'nodejs';

type Mode = 'opponent' | 'prep';

interface ChatBody {
  mode: Mode;
  messages: ChatMessage[];
  context?: Partial<DebateContext>;
  /** if true the server streams text/event-stream deltas; otherwise returns JSON */
  stream?: boolean;
}

export async function POST(req: NextRequest) {
  let body: ChatBody;
  try {
    body = (await req.json()) as ChatBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const { mode, messages = [], context, stream = true } = body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: 'messages required' }, { status: 400 });
  }

  let system: string;
  if (mode === 'opponent') {
    const ctx: DebateContext = {
      motion: context?.motion ?? 'This House Believes That AI helps students learn better.',
      userSide: context?.userSide ?? 'proposition',
      round: context?.round ?? 'opening'
    };
    system = opponentSystemPrompt(ctx);
  } else if (mode === 'prep') {
    system = prepSystemPrompt();
  } else {
    return NextResponse.json({ error: `Unknown mode: ${mode}` }, { status: 400 });
  }

  const final: ChatMessage[] = [
    { role: 'system', content: system },
    ...messages.filter((m) => m.role !== 'system')
  ];

  const temperature = mode === 'prep' ? 0.4 : 0.8;
  const maxTokens = mode === 'prep' ? 1500 : 400;

  if (!stream) {
    // Non-streaming path: collect deltas and reply once.
    try {
      let content = '';
      for await (const delta of streamChatCompletion(final, {
        temperature,
        maxTokens
      })) {
        content += delta;
      }
      return NextResponse.json({
        content: content.trim(),
        provider: currentProviderInfo()
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'unknown error';
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  // Streaming path — text/event-stream protocol.
  // We emit two event kinds, separated by blank lines (\n\n):
  //   event: meta   data: {"provider":"...","model":"..."}
  //   event: delta  data: {"content":"..."}
  //   event: done   data: {}
  //   event: error  data: {"error":"..."}
  const encoder = new TextEncoder();
  const provider = currentProviderInfo();

  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      };

      try {
        send('meta', provider);
        for await (const delta of streamChatCompletion(final, {
          temperature,
          maxTokens
        })) {
          if (delta) send('delta', { content: delta });
        }
        send('done', {});
      } catch (err) {
        const message = err instanceof Error ? err.message : 'unknown error';
        send('error', { error: message });
      } finally {
        controller.close();
      }
    }
  });

  return new Response(readable, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no' // disable proxy buffering (nginx)
    }
  });
}
