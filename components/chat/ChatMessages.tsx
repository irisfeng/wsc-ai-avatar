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
            'rounded-xl px-4 py-3 text-sm leading-relaxed shadow-[0_10px_28px_rgba(0,0,0,0.16)]',
            m.role === 'user'
              ? 'max-w-[82%] self-end bg-wsc-calm/22 text-white'
              : 'w-full self-start bg-white/[0.055] text-white/92'
          )}
        >
          <div className="mb-1 text-[10px] uppercase tracking-wider text-white/40">
            {m.role === 'user' ? 'You' : 'AI Debater'}
          </div>
          <div className="whitespace-pre-wrap">{m.content}</div>
        </div>
      ))}
      {streaming && (
        <div className="w-full self-start rounded-xl bg-white/[0.055] px-4 py-3 text-sm leading-relaxed text-white/92 shadow-[0_10px_28px_rgba(0,0,0,0.16)]">
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
        <div className="w-full self-start rounded-xl border border-wsc-gold/45 bg-wsc-gold/12 px-4 py-3 text-sm leading-relaxed text-wsc-gold shadow-[0_12px_30px_rgba(0,0,0,0.18)]">
          <div className="mb-1 text-[10px] uppercase tracking-wider text-wsc-gold/70">
            Point of Information
          </div>
          {poi}
        </div>
      )}
    </div>
  );
}
