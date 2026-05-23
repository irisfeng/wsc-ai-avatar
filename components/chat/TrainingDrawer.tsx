'use client';

import { History, Plus, X } from 'lucide-react';
import type { ChatMessage } from '@/lib/llm';
import type { DebateSide } from '@/lib/prompts';
import type { TrainingSignal } from '@/lib/trainingSignals';
import type { NextDrill } from '@/lib/learnerProfile';
import { cn } from '@/lib/utils';
import { ChatMessages } from '@/components/chat/ChatMessages';
import { HistoryPanel } from '@/components/chat/HistoryPanel';
import { MotionPicker } from '@/components/chat/MotionPicker';
import type { Session } from '@/lib/storage';

interface Props {
  open: boolean;
  mobile: boolean;
  motion: string;
  onMotionChange: (value: string) => void;
  userSide: DebateSide;
  onUserSideChange: (value: DebateSide) => void;
  round: 'opening' | 'rebuttal' | 'reply';
  onRoundChange: (value: 'opening' | 'rebuttal' | 'reply') => void;
  checklist: TrainingSignal[];
  nextDrill?: NextDrill;
  messages: ChatMessage[];
  poi?: string;
  streaming?: string;
  error?: string;
  provider?: string;
  micStatus?: string;
  historyKey: number;
  showHistory: boolean;
  onToggleHistory: () => void;
  onRestoreSession: (session: Session) => void;
  onNewSession: () => void;
  onClose: () => void;
}

export function TrainingDrawer({
  open,
  mobile,
  motion,
  onMotionChange,
  userSide,
  onUserSideChange,
  round,
  onRoundChange,
  checklist,
  nextDrill,
  messages,
  poi,
  streaming,
  error,
  provider,
  micStatus,
  historyKey,
  showHistory,
  onToggleHistory,
  onRestoreSession,
  onNewSession,
  onClose
}: Props) {
  return (
    <aside
      className={cn(
        'flex min-h-0 flex-col border-white/10 bg-wsc-ink/95 text-white shadow-2xl backdrop-blur-xl',
        mobile
          ? 'fixed inset-x-0 bottom-0 z-50 max-h-[82vh] rounded-t-2xl border-t transition-transform duration-200'
          : 'relative h-screen border-l',
        mobile && !open && 'translate-y-full',
        !mobile && !open && 'hidden'
      )}
    >
      <header className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold">Training</h2>
          <p className="text-[11px] text-white/45">准实时 WSC feedback</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className="drawer-icon-button" onClick={onNewSession} title="新建一轮">
            <Plus className="h-4 w-4" />
          </button>
          <button type="button" className="drawer-icon-button" onClick={onToggleHistory} title="历史">
            <History className="h-4 w-4" />
          </button>
          {mobile && (
            <button type="button" className="drawer-icon-button" onClick={onClose} title="关闭">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </header>

      <div className="space-y-3 border-b border-white/10 p-4">
        <MotionPicker value={motion} onChange={onMotionChange} />
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <DrawerToggle
            active={userSide === 'proposition'}
            onClick={() => onUserSideChange('proposition')}
          >
            我:Proposition
          </DrawerToggle>
          <DrawerToggle
            active={userSide === 'opposition'}
            onClick={() => onUserSideChange('opposition')}
          >
            我:Opposition
          </DrawerToggle>
          {(['opening', 'rebuttal', 'reply'] as const).map((value) => (
            <DrawerToggle key={value} active={round === value} onClick={() => onRoundChange(value)}>
              {value}
            </DrawerToggle>
          ))}
        </div>
      </div>

      <section className="border-b border-white/10 p-4">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/45">
          Checklist
        </h3>
        <div className="space-y-1">
          {checklist.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg bg-white/[0.035] px-3 py-2">
              <div className="min-w-0">
                <div className="truncate text-xs text-white/85">{item.label}</div>
                <div className="truncate text-[10px] text-white/40">{item.detail}</div>
              </div>
              <span
                className={cn(
                  'h-2.5 w-2.5 shrink-0 rounded-full',
                  item.state === 'good' && 'bg-emerald-300',
                  item.state === 'warn' && 'bg-amber-300',
                  item.state === 'neutral' && 'bg-white/25'
                )}
              />
            </div>
          ))}
        </div>
        {nextDrill && (
          <div className="mt-3 rounded-lg border border-wsc-calm/20 bg-wsc-calm/10 px-3 py-2">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-wsc-calm/80">
              Next drill
            </div>
            <div className="mt-1 text-xs font-semibold text-white/90">{nextDrill.title}</div>
            <div className="mt-0.5 text-[11px] leading-snug text-white/55">
              {nextDrill.detail}
            </div>
            <div className="mt-1 text-[10px] leading-snug text-white/35">
              {nextDrill.reason}
            </div>
          </div>
        )}
      </section>

      {showHistory && (
        <div className="border-b border-white/10 bg-white/[0.02] py-2">
          <HistoryPanel kind="debate" refreshKey={historyKey} onRestore={onRestoreSession} />
        </div>
      )}

      <section className="min-h-0 flex-1 overflow-y-auto p-4">
        {messages.length === 0 && !streaming ? (
          <p className="text-sm text-white/40">
            点击麦克风或输入第一段发言。AI 数字人将以对方辩手身份回应。
          </p>
        ) : (
          <ChatMessages messages={messages} poi={poi} streaming={streaming} />
        )}
        {error && <p className="mt-3 text-xs text-wsc-accent">{error}</p>}
        {micStatus && <p className="mt-3 text-xs text-wsc-calm">{micStatus}</p>}
        {provider && (
          <p className="mt-3 font-mono text-[10px] text-white/30">powered by {provider}</p>
        )}
      </section>
    </aside>
  );
}

function DrawerToggle({
  active,
  onClick,
  children
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? 'rounded-full bg-wsc-calm px-3 py-1 text-wsc-ink'
          : 'rounded-full bg-white/5 px-3 py-1 text-white/70 hover:bg-white/10'
      }
    >
      {children}
    </button>
  );
}
