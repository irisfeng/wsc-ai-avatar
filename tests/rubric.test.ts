import { describe, it, expect } from 'vitest';
import { clampRubric, RUBRIC_MAX } from '@/lib/rubric';

describe('clampRubric', () => {
  it('passes a well-formed rubric through', () => {
    const out = clampRubric({
      style: { score: 20, comment: 'clear' },
      content: { score: 22, comment: 'strong evidence' },
      strategy: { score: 8, comment: 'good clash' },
      highlights: ['phrase A', 'phrase B'],
      actionable: ['tip 1', 'tip 2', 'tip 3']
    });
    expect(out.total).toBe(50);
    expect(out.style.score).toBe(20);
    expect(out.highlights).toHaveLength(2);
    expect(out.actionable).toHaveLength(3);
  });

  it('clamps over-max scores down to ceiling', () => {
    const out = clampRubric({
      style: { score: 99, comment: '' },
      content: { score: 30, comment: '' },
      strategy: { score: 15, comment: '' }
    });
    expect(out.style.score).toBe(RUBRIC_MAX.style);
    expect(out.content.score).toBe(RUBRIC_MAX.content);
    expect(out.strategy.score).toBe(RUBRIC_MAX.strategy);
    expect(out.total).toBe(RUBRIC_MAX.total);
  });

  it('clamps negative scores to zero', () => {
    const out = clampRubric({
      style: { score: -5, comment: '' },
      content: { score: -100, comment: '' },
      strategy: { score: -1, comment: '' }
    });
    expect(out.style.score).toBe(0);
    expect(out.content.score).toBe(0);
    expect(out.strategy.score).toBe(0);
    expect(out.total).toBe(0);
  });

  it('rounds fractional scores', () => {
    const out = clampRubric({
      style: { score: 17.7, comment: '' },
      content: { score: 19.4, comment: '' },
      strategy: { score: 6.5, comment: '' }
    });
    expect(out.style.score).toBe(18);
    expect(out.content.score).toBe(19);
    // 6.5 rounds to 7 in Math.round (banker's rounding caveat aside)
    expect(out.strategy.score).toBe(7);
  });

  it('coerces non-number scores via Number()', () => {
    const out = clampRubric({
      style: { score: '20' as unknown as number, comment: '' },
      content: { score: NaN, comment: '' },
      strategy: { score: 'abc' as unknown as number, comment: '' }
    });
    expect(out.style.score).toBe(20);
    expect(out.content.score).toBe(0); // NaN → 0
    expect(out.strategy.score).toBe(0);
  });

  it('handles missing criterion blocks gracefully', () => {
    const out = clampRubric({});
    expect(out.style).toEqual({ score: 0, comment: 'No comment' });
    expect(out.content).toEqual({ score: 0, comment: 'No comment' });
    expect(out.strategy).toEqual({ score: 0, comment: 'No comment' });
    expect(out.total).toBe(0);
    expect(out.highlights).toEqual([]);
    expect(out.actionable).toEqual([]);
  });

  it('truncates highlights to 4 and actionable to 3', () => {
    const out = clampRubric({
      style: { score: 10, comment: '' },
      content: { score: 10, comment: '' },
      strategy: { score: 5, comment: '' },
      highlights: ['a', 'b', 'c', 'd', 'e', 'f'],
      actionable: ['t1', 't2', 't3', 't4', 't5']
    });
    expect(out.highlights).toHaveLength(4);
    expect(out.actionable).toHaveLength(3);
  });

  it('ignores non-array highlights / actionable', () => {
    const out = clampRubric({
      style: { score: 1, comment: '' },
      content: { score: 1, comment: '' },
      strategy: { score: 1, comment: '' },
      highlights: 'not-an-array' as unknown as string[],
      actionable: null as unknown as string[]
    });
    expect(out.highlights).toEqual([]);
    expect(out.actionable).toEqual([]);
  });

  it('null comment is coerced to empty string (no crash)', () => {
    const out = clampRubric({
      style: { score: 10, comment: null as unknown as string },
      content: { score: 10, comment: undefined as unknown as string },
      strategy: { score: 5, comment: '' }
    });
    expect(out.style.comment).toBe('');
    expect(out.content.comment).toBe('');
  });
});
