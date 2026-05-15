/**
 * WSC Team Debate motions — real tournament archive.
 *
 * Sourced from:
 *  - WSC 2026 "Are We There Yet?" theme-aligned drafts
 *  - 2025 "Reigniting the Future" past motions
 *  - 2024 "Reimagining the Present" past motions
 *
 * Curated against irisfeng/wsc-scholar-ai (Beijing Alpacas archives).
 *
 * Subjects follow the official WSC six-area split:
 *   History · Social Studies · Science & Technology · Art & Music ·
 *   Literature & Media · Special Area
 */

export type SubjectId =
  | 'history'
  | 'social_studies'
  | 'science'
  | 'art_music'
  | 'literature'
  | 'special';

export type MotionSource = '2026' | '2025' | '2024' | 'custom';

export interface Motion {
  text: string;
  source: MotionSource;
  subjects: SubjectId[];
}

export const SUBJECT_META: Record<
  SubjectId,
  { name: string; emoji: string; color: string }
> = {
  history: { name: 'History', emoji: '📜', color: '#d97706' },
  social_studies: { name: 'Social Studies', emoji: '🌍', color: '#7c3aed' },
  science: { name: 'Science & Tech', emoji: '🔬', color: '#2563eb' },
  art_music: { name: 'Art & Music', emoji: '🎨', color: '#db2777' },
  literature: { name: 'Literature', emoji: '📚', color: '#059669' },
  special: { name: 'Special Area', emoji: '⚡', color: '#dc2626' }
};

export const WSC_THEME_2026 = {
  year: 2026,
  title: 'Are We There Yet?',
  description:
    "Journeys, progress, destinations, endings — how we perceive the start, middle, and end of experiences."
};

export const MOTIONS: Motion[] = [
  // ─── 2026 theme: Are We There Yet? ────────────────────────────
  { text: 'This house believes that the journey is more important than the destination.', source: '2026', subjects: ['special'] },
  { text: 'This house would prioritize space exploration over solving Earth\'s problems.', source: '2026', subjects: ['science', 'social_studies'] },
  { text: 'This house believes that planned obsolescence should be illegal.', source: '2026', subjects: ['social_studies', 'science'] },
  { text: 'This house would ban the development of artificial general intelligence.', source: '2026', subjects: ['science'] },
  { text: 'This house believes that CRISPR gene editing should be used to eliminate genetic diseases.', source: '2026', subjects: ['science'] },
  { text: 'This house would develop quantum computing even if security risks are unclear.', source: '2026', subjects: ['science'] },
  { text: 'This house believes that geoengineering is a necessary response to climate change.', source: '2026', subjects: ['science'] },
  { text: 'This house believes that GDP is no longer a valid measure of national progress.', source: '2026', subjects: ['social_studies'] },
  { text: 'This house believes that hereditary succession is never justified.', source: '2026', subjects: ['history'] },
  { text: 'This house believes that empires do more harm than good.', source: '2026', subjects: ['history'] },
  { text: 'This house believes that reboots and sequels harm original creative works.', source: '2026', subjects: ['literature'] },
  { text: 'This house would ban AI-generated literature.', source: '2026', subjects: ['literature'] },
  { text: 'This house believes Okonkwo\'s downfall in Things Fall Apart was inevitable.', source: '2026', subjects: ['literature'] },
  { text: 'This house believes that AI-generated art should not be considered real art.', source: '2026', subjects: ['art_music'] },
  { text: 'This house would return all culturally significant artifacts to their countries of origin.', source: '2026', subjects: ['art_music', 'history'] },
  { text: 'This house believes that art restoration should prioritize original intent over modern aesthetics.', source: '2026', subjects: ['art_music'] },
  { text: 'This house believes that some mistakes should never be forgiven.', source: '2026', subjects: ['special'] },
  { text: 'This house believes that cancel culture prevents genuine recovery from mistakes.', source: '2026', subjects: ['special', 'social_studies'] },
  { text: 'This house believes that technological progress has made humanity less resilient.', source: '2026', subjects: ['science', 'special'] },
  { text: 'This house would give AI systems the right to refuse harmful instructions.', source: '2026', subjects: ['science'] },
  { text: 'This house believes the placebo button is ethically justifiable.', source: '2026', subjects: ['social_studies', 'special'] },
  { text: 'This house believes that historical buildings, once destroyed, should be rebuilt as they were.', source: '2026', subjects: ['history', 'art_music'] },

  // ─── 2025 archive: Reigniting the Future ──────────────────────
  { text: 'This house believes that living forever is a curse, not a blessing.', source: '2025', subjects: ['special', 'literature'] },
  { text: 'This house believes that AI should take over all laborious jobs.', source: '2025', subjects: ['science', 'social_studies'] },
  { text: 'This house would put a strict age limit of 12 on social media access.', source: '2025', subjects: ['social_studies'] },
  { text: 'This house believes social media should require a fake-news label.', source: '2025', subjects: ['social_studies'] },
  { text: 'This house believes companies should not revive old brands but create new ones.', source: '2025', subjects: ['social_studies', 'art_music'] },
  { text: 'This house would make space exploration the exclusive domain of the United Nations.', source: '2025', subjects: ['science', 'history'] },
  { text: 'This house believes presidential debates should be eliminated.', source: '2025', subjects: ['history', 'social_studies'] },
  { text: 'This house believes the world is ready for fully autonomous driving.', source: '2025', subjects: ['science'] },
  { text: 'This house believes Odysseus was a villain, not a hero.', source: '2025', subjects: ['literature', 'history'] },
  { text: 'This house believes art that has aged with time should be left alone, not restored.', source: '2025', subjects: ['art_music'] },
  { text: 'This house believes the next generation will live in a better world.', source: '2025', subjects: ['special', 'social_studies'] },
  { text: 'This house would invest heavily in digital regeneration of damaged heritage.', source: '2025', subjects: ['art_music', 'science'] },

  // ─── 2024 archive: Reimagining the Present ────────────────────
  { text: 'This house believes future fonts should be designed by AI.', source: '2024', subjects: ['art_music', 'science'] },
  { text: 'This house believes art that mimics the original is less valuable.', source: '2024', subjects: ['art_music'] },
  { text: 'This house believes Banksy should remain anonymous.', source: '2024', subjects: ['art_music'] },
  { text: 'This house believes AI-edited photos should carry a special label.', source: '2024', subjects: ['art_music', 'science'] },
  { text: 'This house believes museums should display AI art alongside traditional art.', source: '2024', subjects: ['art_music'] },
  { text: 'This house believes artifacts should be returned to their home country.', source: '2024', subjects: ['history', 'art_music'] },
  { text: 'This house would forbid AI from mimicking real people\'s voices.', source: '2024', subjects: ['science', 'social_studies'] },
  { text: 'This house believes society does not need more superhero franchise movies.', source: '2024', subjects: ['literature', 'art_music'] },
  { text: 'This house believes nuclear power plants should be eliminated.', source: '2024', subjects: ['science', 'social_studies'] },
  { text: 'This house believes ChatGPT should be allowed for school assignments.', source: '2024', subjects: ['science', 'social_studies'] },
  { text: 'This house believes AI-generated poetry should not be considered real poetry.', source: '2024', subjects: ['literature', 'art_music'] },
  { text: 'This house would ban AI holographs and influencers.', source: '2024', subjects: ['science', 'art_music'] }
];

/** Backward-compat list as plain strings — used by older callers. */
export const MOTION_TEXTS: string[] = MOTIONS.map((m) => m.text);

export function motionsBySubject(): Record<SubjectId, Motion[]> {
  const out = {} as Record<SubjectId, Motion[]>;
  for (const m of MOTIONS) {
    for (const s of m.subjects) {
      if (!out[s]) out[s] = [];
      out[s].push(m);
    }
  }
  return out;
}

export function motionsBySource(): Record<MotionSource, Motion[]> {
  const out = {} as Record<MotionSource, Motion[]>;
  for (const m of MOTIONS) {
    if (!out[m.source]) out[m.source] = [];
    out[m.source].push(m);
  }
  return out;
}

/** Stable random pick — useful for "Surprise me" button without SSR mismatch */
export function randomMotion(seed?: number): Motion {
  const i =
    seed !== undefined
      ? Math.abs(seed) % MOTIONS.length
      : Math.floor(Math.random() * MOTIONS.length);
  return MOTIONS[i];
}
