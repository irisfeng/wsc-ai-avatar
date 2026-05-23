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
        'grid w-full max-w-3xl grid-cols-2 gap-2 px-4 md:grid-cols-4',
        className
      )}
    >
      {signals.map((signal) => (
        <div
          key={signal.id}
          className="rounded-lg border border-white/[0.08] bg-black/45 px-3 py-2 text-white/90 shadow-[0_10px_30px_rgba(0,0,0,0.32)] backdrop-blur-md"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-white/50">{signal.title}</span>
            <SignalIcon state={signal.state} />
          </div>
          <div
            className={cn(
              'mt-1 truncate text-sm font-semibold',
              signal.state === 'good' && 'text-emerald-200',
              signal.state === 'warn' && 'text-amber-200',
              signal.state === 'neutral' && 'text-white/85'
            )}
            title={signal.label}
          >
            {signal.label}
          </div>
          <div className="mt-0.5 truncate text-[10px] text-white/45" title={signal.detail}>
            {signal.detail}
          </div>
        </div>
      ))}
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
