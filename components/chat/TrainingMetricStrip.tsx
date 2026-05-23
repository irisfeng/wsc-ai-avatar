'use client';

import { AlertCircle, CheckCircle2, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TrainingSignal } from '@/lib/trainingSignals';

interface Props {
  signals: TrainingSignal[];
  className?: string;
}

export function TrainingMetricStrip({ signals, className }: Props) {
  return (
    <div
      className={cn(
        'w-full max-w-[19rem] rounded-xl border border-white/[0.08] bg-black/35 p-2 text-white/90 shadow-[0_16px_42px_rgba(0,0,0,0.34)] backdrop-blur-md',
        className
      )}
    >
      <div className="mb-1 flex items-center justify-between px-1">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-white/45">
          Coach pulse
        </span>
        <span className="text-[10px] text-white/35">live</span>
      </div>
      <div className="space-y-1">
        {signals.map((signal) => (
          <div
            key={signal.id}
            className="grid grid-cols-[4.5rem_minmax(0,1fr)_auto] items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-white/[0.035]"
          >
            <span className="truncate text-[11px] text-white/45">{signal.title}</span>
            <div className="min-w-0">
              <div
                className={cn(
                  'truncate text-xs font-semibold leading-tight',
                  signal.state === 'good' && 'text-emerald-200',
                  signal.state === 'warn' && 'text-amber-200',
                  signal.state === 'neutral' && 'text-white/85'
                )}
                title={signal.label}
              >
                {signal.label}
              </div>
              <div className="truncate text-[10px] leading-tight text-white/38" title={signal.detail}>
                {signal.detail}
              </div>
            </div>
            <SignalIcon state={signal.state} />
          </div>
        ))}
      </div>
    </div>
  );
}

function SignalIcon({ state }: { state: TrainingSignal['state'] }) {
  if (state === 'good') {
    return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />;
  }
  if (state === 'warn') {
    return <AlertCircle className="h-3.5 w-3.5 text-amber-300" />;
  }
  return <Circle className="h-3.5 w-3.5 text-white/35" />;
}
