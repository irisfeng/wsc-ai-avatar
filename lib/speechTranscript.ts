export interface SpeechResultChunk {
  isFinal: boolean;
  transcript: string;
}

export interface SpeechTranscriptState {
  finalText: string;
  interimText: string;
  transcript: string;
}

export function accumulateSpeechResults(
  previousFinalText: string,
  chunks: SpeechResultChunk[]
): SpeechTranscriptState {
  const finalParts = [previousFinalText];
  const interimParts: string[] = [];

  for (const chunk of chunks) {
    if (chunk.isFinal) finalParts.push(chunk.transcript);
    else interimParts.push(chunk.transcript);
  }

  const finalText = normalize(finalParts.join(' '));
  const interimText = normalize(interimParts.join(' '));
  const transcript = normalize([finalText, interimText].filter(Boolean).join(' '));

  return { finalText, interimText, transcript };
}

export function normalizeSpeechText(value: string): string {
  return normalize(value);
}

function normalize(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}
