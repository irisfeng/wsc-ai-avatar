import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { chatCompletion } from '@/lib/llm';

const STASH = ['LLM_PROVIDER', 'OLLAMA_MODEL', 'OLLAMA_BASE_URL'] as const;
let stash: Record<string, string | undefined>;

beforeEach(() => {
  stash = {};
  for (const k of STASH) {
    stash[k] = process.env[k];
    delete process.env[k];
  }
  process.env.LLM_PROVIDER = 'ollama';
  process.env.OLLAMA_MODEL = 'qwen2.5:14b';
  process.env.OLLAMA_BASE_URL = 'http://localhost:11434/v1';
});

afterEach(() => {
  vi.restoreAllMocks();
  for (const k of STASH) {
    if (stash[k] === undefined) delete process.env[k];
    else process.env[k] = stash[k];
  }
});

describe('chatCompletion — fetch contract', () => {
  it('POSTs to {baseUrl}/chat/completions with bearer + correct body', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: '  hello world  ' } }]
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );
    vi.stubGlobal('fetch', fetchMock);

    const out = await chatCompletion(
      [{ role: 'user', content: 'ping' }],
      { temperature: 0.5, maxTokens: 100 }
    );
    expect(out).toBe('hello world'); // trimmed

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://localhost:11434/v1/chat/completions');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>).Authorization).toBe(
      'Bearer ollama'
    );
    const body = JSON.parse(init.body as string);
    expect(body.model).toBe('qwen2.5:14b');
    expect(body.temperature).toBe(0.5);
    expect(body.max_tokens).toBe(100);
    expect(body.stream).toBe(false);
    expect(body.messages).toEqual([{ role: 'user', content: 'ping' }]);
  });

  it('passes model override into the request body', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ choices: [{ message: { content: 'x' } }] }), {
        status: 200
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    await chatCompletion([{ role: 'user', content: 'q' }], {
      model: 'qwen2.5:7b'
    });
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.model).toBe('qwen2.5:7b');
  });

  it('adds response_format when JSON requested', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ choices: [{ message: { content: '{}' } }] }), {
        status: 200
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    await chatCompletion([{ role: 'user', content: 'q' }], {
      responseFormat: 'json_object'
    });
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.response_format).toEqual({ type: 'json_object' });
  });

  it('throws with status and body snippet on non-200', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('rate limit exceeded blah blah', { status: 429 })
      )
    );
    await expect(
      chatCompletion([{ role: 'user', content: 'q' }])
    ).rejects.toThrow(/LLM 429: rate limit/);
  });

  it('returns empty string when choices array is missing', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({}), { status: 200 })
      )
    );
    const out = await chatCompletion([{ role: 'user', content: 'q' }]);
    expect(out).toBe('');
  });
});
