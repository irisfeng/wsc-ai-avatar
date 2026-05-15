import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { streamChatCompletion } from '@/lib/llm';

beforeEach(() => {
  process.env.LLM_PROVIDER = 'ollama';
  process.env.OLLAMA_MODEL = 'qwen2.5:14b';
  process.env.OLLAMA_BASE_URL = 'http://localhost:11434/v1';
});

afterEach(() => {
  vi.restoreAllMocks();
});

function sseResponse(events: string[]): Response {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const enc = new TextEncoder();
      for (const e of events) controller.enqueue(enc.encode(e));
      controller.close();
    }
  });
  return new Response(stream, {
    status: 200,
    headers: { 'Content-Type': 'text/event-stream' }
  });
}

async function collect(gen: AsyncGenerator<string, void, unknown>): Promise<string[]> {
  const out: string[] = [];
  for await (const d of gen) out.push(d);
  return out;
}

describe('streamChatCompletion — SSE parsing', () => {
  it('yields content deltas in order', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        sseResponse([
          'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n',
          'data: {"choices":[{"delta":{"content":" world"}}]}\n\n',
          'data: [DONE]\n\n'
        ])
      )
    );
    expect(await collect(streamChatCompletion([{ role: 'user', content: 'q' }]))).toEqual([
      'Hello',
      ' world'
    ]);
  });

  it('handles split chunks across reads (buffering)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        sseResponse([
          'data: {"choices":[{"delta":{"con',
          'tent":"foo"}}]}\n\n',
          'data: {"choices":[{"delta":{"content":"bar"}}]}\n\ndata: [DONE]\n\n'
        ])
      )
    );
    expect(await collect(streamChatCompletion([{ role: 'user', content: 'q' }]))).toEqual([
      'foo',
      'bar'
    ]);
  });

  it('ignores malformed JSON events without throwing', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        sseResponse([
          'data: {bad json}\n\n',
          'data: {"choices":[{"delta":{"content":"ok"}}]}\n\n',
          'data: [DONE]\n\n'
        ])
      )
    );
    expect(await collect(streamChatCompletion([{ role: 'user', content: 'q' }]))).toEqual([
      'ok'
    ]);
  });

  it('terminates at [DONE] even when more events follow', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        sseResponse([
          'data: {"choices":[{"delta":{"content":"A"}}]}\n\n',
          'data: [DONE]\n\n',
          'data: {"choices":[{"delta":{"content":"AFTER"}}]}\n\n'
        ])
      )
    );
    expect(await collect(streamChatCompletion([{ role: 'user', content: 'q' }]))).toEqual([
      'A'
    ]);
  });

  it('skips events with empty/missing content', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        sseResponse([
          'data: {"choices":[{"delta":{}}]}\n\n',
          'data: {"choices":[{"delta":{"content":""}}]}\n\n',
          'data: {"choices":[{"delta":{"content":"x"}}]}\n\n',
          'data: [DONE]\n\n'
        ])
      )
    );
    // Empty deltas are filtered (current impl yields only non-null content).
    expect(await collect(streamChatCompletion([{ role: 'user', content: 'q' }]))).toEqual([
      'x'
    ]);
  });

  it('throws on non-200 with body snippet', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('quota exceeded', { status: 402 }))
    );
    await expect(async () => {
      for await (const _ of streamChatCompletion([{ role: 'user', content: 'q' }])) {
        // no-op
      }
    }).rejects.toThrow(/LLM 402: quota exceeded/);
  });

  it('sends stream:true in the request body', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(sseResponse(['data: [DONE]\n\n']));
    vi.stubGlobal('fetch', fetchMock);
    for await (const _ of streamChatCompletion([{ role: 'user', content: 'q' }])) {
      // drain
    }
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.stream).toBe(true);
  });
});
