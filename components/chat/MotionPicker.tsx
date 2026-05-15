'use client';

import { useMemo, useState } from 'react';
import { Shuffle } from 'lucide-react';
import {
  MOTIONS,
  SUBJECT_META,
  WSC_THEME_2026,
  randomMotion,
  type Motion,
  type MotionSource,
  type SubjectId
} from '@/lib/motions';

interface Props {
  value: string;
  onChange: (next: string) => void;
}

const ALL_SOURCES: MotionSource[] = ['2026', '2025', '2024'];

export function MotionPicker({ value, onChange }: Props) {
  const [subject, setSubject] = useState<SubjectId | 'all'>('all');
  const [source, setSource] = useState<MotionSource | 'all'>('all');

  const filtered = useMemo<Motion[]>(() => {
    return MOTIONS.filter((m) => {
      if (subject !== 'all' && !m.subjects.includes(subject)) return false;
      if (source !== 'all' && m.source !== source) return false;
      return true;
    });
  }, [subject, source]);

  // If current value not in filter, fall back to first match (purely UX, not state change)
  const selectValue = filtered.some((m) => m.text === value) ? value : '';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs text-white/50">
          Motion · WSC {WSC_THEME_2026.year} — {WSC_THEME_2026.title}
        </label>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-0.5 text-[11px] text-white/60 hover:bg-white/10"
          onClick={() => onChange(randomMotion().text)}
          title="Surprise me"
        >
          <Shuffle className="h-3 w-3" /> Random
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5 text-[10px]">
        <Chip active={subject === 'all'} onClick={() => setSubject('all')}>
          All subjects
        </Chip>
        {(Object.keys(SUBJECT_META) as SubjectId[]).map((s) => (
          <Chip
            key={s}
            active={subject === s}
            onClick={() => setSubject(s)}
            color={SUBJECT_META[s].color}
          >
            {SUBJECT_META[s].emoji} {SUBJECT_META[s].name}
          </Chip>
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5 text-[10px]">
        <Chip active={source === 'all'} onClick={() => setSource('all')}>
          All years
        </Chip>
        {ALL_SOURCES.map((y) => (
          <Chip key={y} active={source === y} onClick={() => setSource(y)}>
            {y}
          </Chip>
        ))}
      </div>

      <select
        className="input"
        value={selectValue}
        onChange={(e) => onChange(e.target.value)}
      >
        {selectValue === '' && (
          <option value="" disabled className="bg-wsc-ink">
            选一个议题（{filtered.length} 条匹配）
          </option>
        )}
        {filtered.map((m) => (
          <option key={m.text} value={m.text} className="bg-wsc-ink">
            [{m.source}] {m.text}
          </option>
        ))}
      </select>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
  color
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  color?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? 'rounded-full bg-wsc-calm px-2 py-0.5 text-wsc-ink'
          : 'rounded-full bg-white/5 px-2 py-0.5 text-white/60 hover:bg-white/10'
      }
      style={active && color ? { backgroundColor: color, color: '#fff' } : undefined}
    >
      {children}
    </button>
  );
}
