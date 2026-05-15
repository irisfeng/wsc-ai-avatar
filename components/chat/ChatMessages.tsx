'use client';

import { cn } from '@/lib/utils';
import type { ChatMessage } from '@/lib/llm';

export function ChatMessages({
  messages,
  poi,
  streaming
}: {
  messages: ChatMessage[];
  poi?: string;
  /** in-flight assistant reply, rendered as a tentative bubble with a blinking caret */
  streaming?: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      {messages.map((m, i) => (
        <div
          key={i}
          className={cn(
            'max-w-[85%] rounded-2xl px-4 py-2 text-sm leading-relaxed',
            m.role === 'user'
              ? 'self-end bg-wsc-calm/20 text-white'
              : 'self-start bg-white/5 text-white/90'
          )}
        >
          <div className="mb-1 text-[10px] uppercase tracking-wider text-white/40">
            {m.role === 'user' ? 'You' : 'AI Debater'}
          </div>
          <div className="whitespace-pre-wrap">{m.content}</div>
        </div>
      ))}
      {streaming && (
        <div className="self-start max-w-[85%] rounded-2xl bg-white/5 px-4 py-2 text-sm leading-relaxed text-white/90">
          <div className="mb-1 text-[10px] uppercase tracking-wider text-wsc-calm/80">
            AI Debater · streaming
          </div>
          <div className="whitespace-pre-wrap">
            {streaming}
            <span className="ml-0.5 inline-block h-3.5 w-[2px] animate-pulse bg-wsc-calm align-middle" />
          </div>
        </div>
      )}
      {poi && (
        <div className="self-start max-w-[85%] rounded-2xl border border-wsc-gold/40 bg-wsc-gold/10 px-4 py-2 text-sm text-wsc-gold">
          <div className="mb-1 text-[10px] uppercase tracking-wider text-wsc-gold/70">
            Point of Information
          </div>
          {poi}
        </div>
      )}
    </div>
  );
}
