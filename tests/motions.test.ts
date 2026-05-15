import { describe, it, expect } from 'vitest';
import {
  MOTIONS,
  MOTION_TEXTS,
  motionsBySubject,
  motionsBySource,
  randomMotion,
  SUBJECT_META,
  WSC_THEME_2026
} from '@/lib/motions';

describe('motions library', () => {
  it('has at least 40 motions from three sources', () => {
    expect(MOTIONS.length).toBeGreaterThanOrEqual(40);
    const years = new Set(MOTIONS.map((m) => m.source));
    expect(years.has('2026')).toBe(true);
    expect(years.has('2025')).toBe(true);
    expect(years.has('2024')).toBe(true);
  });

  it('every motion is phrased as "This house …"', () => {
    for (const m of MOTIONS) {
      // Real WSC archives include both THBT-form and bare "This house believes X"
      // (without "that"), so we only assert the canonical preamble.
      expect(m.text).toMatch(/^this house (believes|would)/i);
    }
  });

  it('MOTION_TEXTS is parallel to MOTIONS', () => {
    expect(MOTION_TEXTS).toHaveLength(MOTIONS.length);
    expect(MOTION_TEXTS[0]).toBe(MOTIONS[0].text);
  });

  it('every motion has at least one valid subject', () => {
    for (const m of MOTIONS) {
      expect(m.subjects.length).toBeGreaterThan(0);
      for (const s of m.subjects) {
        expect(SUBJECT_META).toHaveProperty(s);
      }
    }
  });

  it('motionsBySubject groups motions with multi-tag motions appearing in each', () => {
    const grouped = motionsBySubject();
    // Sanity: each subject in SUBJECT_META has a non-empty list
    for (const s of Object.keys(SUBJECT_META)) {
      expect(grouped[s as keyof typeof grouped].length).toBeGreaterThan(0);
    }
  });

  it('motionsBySource groups by year', () => {
    const g = motionsBySource();
    expect(g['2026'].length).toBeGreaterThan(0);
    expect(g['2025'].length).toBeGreaterThan(0);
    expect(g['2024'].length).toBeGreaterThan(0);
  });

  it('randomMotion with seed is deterministic', () => {
    const a = randomMotion(7);
    const b = randomMotion(7);
    expect(a.text).toBe(b.text);
  });

  it('randomMotion clamps very large / negative seed', () => {
    expect(randomMotion(9999999).text).toBeDefined();
    expect(randomMotion(-1).text).toBeDefined();
  });

  it('WSC_THEME_2026 carries year + title', () => {
    expect(WSC_THEME_2026.year).toBe(2026);
    expect(WSC_THEME_2026.title).toMatch(/Are We There Yet/);
  });
});
