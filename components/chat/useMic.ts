'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Browser-native Web Speech recognition (Chrome / Edge). English by default.
 * No server cost. Falls back to manual text entry if unsupported.
 */
export interface MicState {
  listening: boolean;
  supported: boolean;
  interim: string;
  error?: string;
}

type SR = SpeechRecognition;
type SRCtor = new () => SR;

export function useMic(lang = 'en-US') {
  const recRef = useRef<SR | null>(null);
  const [state, setState] = useState<MicState>({
    listening: false,
    supported: true,
    interim: ''
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
      let finalBuf = '';
      rec.onresult = (e: SpeechRecognitionEvent) => {
        let interim = '';
        for (let i = e.resultIndex; i < e.results.length; i += 1) {
          const r = e.results[i];
          if (r.isFinal) finalBuf += r[0].transcript + ' ';
          else interim += r[0].transcript;
        }
        setState((s) => ({ ...s, interim }));
      };
      rec.onerror = (e: SpeechRecognitionErrorEvent) => {
        setState((s) => ({ ...s, error: e.error, listening: false }));
      };
      rec.onend = () => {
        setState((s) => ({ ...s, listening: false, interim: '' }));
        const out = finalBuf.trim();
        if (out) onFinal(out);
      };
      try {
        rec.start();
        setState((s) => ({ ...s, listening: true, error: undefined }));
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
