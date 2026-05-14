export async function fetchTTS(
  text: string,
  opts: { voice?: string; rate?: string; pitch?: string } = {}
): Promise<Blob> {
  const res = await fetch('/api/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, ...opts })
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`TTS ${res.status}: ${detail.slice(0, 200)}`);
  }
  return await res.blob();
}
