/**
 * Browser-side consumer for /api/chat's text/event-stream protocol.
 *
 * Event types (one JSON object per event):
 *   meta   { provider, model }       — once at start
 *   delta  { content }               — many; concatenate
 *   done   { }                       — once at end (success)
 *   error  { error }                 — once at end (failure)
 */

export interface StreamMeta {
  provider: string;
  model: string;
}

export interface StreamCallbacks {
  onMeta?: (meta: StreamMeta) => void;
  onDelta: (content: string) => void;
  onDone?: () => void;
  onError?: (err: Error) => void;
  signal?: AbortSignal;
}

export async function streamChat(
  body: unknown,
  cb: StreamCallbacks
): Promise<void> {
  let res: Response;
  try {
    res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...(body as object), stream: true }),
      signal: cb.signal
    });
  } catch (err) {
    cb.onError?.(err instanceof Error ? err : new Error(String(err)));
    return;
  }

  if (!res.ok || !res.body) {
    const txt = await res.text().catch(() => '');
    cb.onError?.(new Error(`chat ${res.status}: ${txt.slice(0, 200)}`));
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let idx: number;
      while ((idx = buffer.indexOf('\n\n')) !== -1) {
        const block = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);
        dispatch(block, cb);
      }
    }
    if (buffer.trim().length > 0) dispatch(buffer, cb);
  } catch (err) {
    cb.onError?.(err instanceof Error ? err : new Error(String(err)));
  } finally {
    try {
      reader.releaseLock();
    } catch {
      /* noop */
    }
  }
}

function dispatch(block: string, cb: StreamCallbacks): void {
  let event = 'message';
  const dataLines: string[] = [];
  for (const line of block.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('event:')) event = trimmed.slice(6).trim();
    else if (trimmed.startsWith('data:')) dataLines.push(trimmed.slice(5).trim());
  }
  if (dataLines.length === 0) return;
  let payload: unknown;
  try {
    payload = JSON.parse(dataLines.join(''));
  } catch {
    return;
  }

  switch (event) {
    case 'meta':
      cb.onMeta?.(payload as StreamMeta);
      break;
    case 'delta': {
      const c = (payload as { content?: string }).content;
      if (typeof c === 'string' && c.length > 0) cb.onDelta(c);
      break;
    }
    case 'done':
      cb.onDone?.();
      break;
    case 'error':
      cb.onError?.(new Error(String((payload as { error?: string }).error)));
      break;
  }
}
