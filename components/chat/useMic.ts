'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  accumulateSpeechResults,
  normalizeSpeechText,
  type SpeechResultChunk
} from '@/lib/speechTranscript';

/**
 * Browser-native Web Speech recognition (Chrome / Edge). English by default.
 * No server cost. Falls back to manual text entry if unsupported.
 */
export interface MicState {
  listening: boolean;
  supported: boolean;
  interim: string;
  finalText: string;
  transcript: string;
  error?: string;
}

type SR = SpeechRecognition;
type SRCtor = new () => SR;

export function useMic(lang = 'en-US') {
  const recRef = useRef<SR | null>(null);
  const finalTextRef = useRef('');
  const [state, setState] = useState<MicState>({
    listening: false,
    supported: true,
    interim: '',
    finalText: '',
    transcript: ''
  });

  useEffect(() => {
    const W = window as typeof window & {
      SpeechRecognition?: SRCtor;
      webkitSpeechRecognition?: SRCtor;
    };
    const Ctor = W.SpeechRecognition || W.webkitSpeechRecognition;
    if (!Ctor) {
      setState((s) => ({ ...s, supported: false }));
      return;
    }
    const rec = new Ctor();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = true;
    recRef.current = rec;
    return () => {
      try {
        rec.stop();
      } catch {
        /* noop */
      }
    };
  }, [lang]);

  const start = useCallback(
    (onFinal: (final: string) => void) => {
      const rec = recRef.current;
      if (!rec) return;
      finalTextRef.current = '';
      rec.onresult = (e: SpeechRecognitionEvent) => {
        const chunks: SpeechResultChunk[] = [];
        for (let i = e.resultIndex; i < e.results.length; i += 1) {
          const r = e.results[i];
          chunks.push({ isFinal: r.isFinal, transcript: r[0].transcript });
        }
        const next = accumulateSpeechResults(finalTextRef.current, chunks);
        finalTextRef.current = next.finalText;
        setState((s) => ({
          ...s,
          interim: next.interimText,
          finalText: next.finalText,
          transcript: next.transcript
        }));
      };
      rec.onerror = (e: SpeechRecognitionErrorEvent) => {
        setState((s) => ({ ...s, error: e.error, listening: false }));
      };
      rec.onend = () => {
        const out = normalizeSpeechText(finalTextRef.current);
        setState((s) => ({
          ...s,
          listening: false,
          interim: '',
          finalText: out,
          transcript: out
        }));
        if (out) onFinal(out);
      };
      try {
        rec.start();
        setState((s) => ({
          ...s,
          listening: true,
          interim: '',
          finalText: '',
          transcript: '',
          error: undefined
        }));
      } catch (err) {
        setState((s) => ({
          ...s,
          error: err instanceof Error ? err.message : 'mic error'
        }));
      }
    },
    []
  );

  const stop = useCallback(() => {
    try {
      recRef.current?.stop();
    } catch {
      /* noop */
    }
  }, []);

  return { ...state, start, stop };
}
