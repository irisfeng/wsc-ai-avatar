import { describe, expect, it } from 'vitest';
import { getDebateSkill, listDebateSkills } from '@/lib/skills';

describe('debate skills registry', () => {
  it('contains the initial reusable debate training skills', () => {
    expect(listDebateSkills().map((skill) => skill.id)).toEqual([
      'opening-coach',
      'poi-drill',
      'evidence-finder',
      'judge-replay',
      'style-coach'
    ]);
  });

  it('returns a skill by id', () => {
    const skill = getDebateSkill('poi-drill');
    expect(skill.title).toBe('POI Drill');
    expect(skill.runMode).toBe('inline');
    expect(skill.outputType).toBe('question');
  });

  it('throws for an unknown id', () => {
    expect(() => getDebateSkill('missing' as never)).toThrow('Unknown debate skill');
  });
});
