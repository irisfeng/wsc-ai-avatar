import { describe, it, expect } from 'vitest';
import {
  opponentSystemPrompt,
  judgeSystemPrompt,
  judgeUserPrompt,
  prepSystemPrompt,
  SAMPLE_MOTIONS,
  type DebateContext
} from '@/lib/prompts';

describe('opponentSystemPrompt', () => {
  it('switches sides — user prop ⇒ AI opp', () => {
    const ctx: DebateContext = {
      motion: 'THBT X.',
      userSide: 'proposition',
      round: 'opening'
    };
    const out = opponentSystemPrompt(ctx);
    expect(out).toMatch(/OPPOSITION/);
    expect(out).not.toMatch(/PROPOSITION side/i);
  });

  it('switches sides — user opp ⇒ AI prop', () => {
    const out = opponentSystemPrompt({
      motion: 'THBT Y.',
      userSide: 'opposition',
      round: 'rebuttal'
    });
    expect(out).toMatch(/PROPOSITION/);
  });

  it('embeds motion and round verbatim', () => {
    const out = opponentSystemPrompt({
      motion: 'This House Would lower the voting age to 16.',
      userSide: 'proposition',
      round: 'reply'
    });
    expect(out).toContain('This House Would lower the voting age to 16.');
    expect(out).toContain('reply');
  });

  it('mandates POI + emotion tag format', () => {
    const out = opponentSystemPrompt({
      motion: 'm',
      userSide: 'proposition',
      round: 'opening'
    });
    expect(out).toMatch(/POI:/);
    expect(out).toMatch(/<emotion>/);
    expect(out).toMatch(/confident|thoughtful|surprised|amused|firm/);
  });

  it('caps speech length to 80–120 words', () => {
    const out = opponentSystemPrompt({
      motion: 'm',
      userSide: 'proposition',
      round: 'opening'
    });
    expect(out).toMatch(/80.{1,3}120 words/);
  });
});

describe('judgeSystemPrompt + judgeUserPrompt', () => {
  it('judge prompt declares WSC rubric maxes', () => {
    const sys = judgeSystemPrompt();
    expect(sys).toMatch(/Style \/25/);
    expect(sys).toMatch(/Content \/25/);
    expect(sys).toMatch(/Strategy \/10/);
  });

  it('judge prompt demands strict JSON', () => {
    const sys = judgeSystemPrompt();
    expect(sys).toMatch(/STRICT JSON/);
    expect(sys).toMatch(/"highlights"/);
    expect(sys).toMatch(/"actionable"/);
  });

  it('user prompt embeds inputs as a triple-quoted block', () => {
    const user = judgeUserPrompt({
      motion: 'M',
      speakerSide: 'proposition',
      transcript: 'Hello world.'
    });
    expect(user).toContain('Motion: M');
    expect(user).toContain('Speaker side: proposition');
    expect(user).toContain('"""');
    expect(user).toContain('Hello world.');
  });
});

describe('prepSystemPrompt', () => {
  it('asks for definitions, arguments for both sides, rebuttals, evidence, strategy', () => {
    const out = prepSystemPrompt();
    expect(out).toMatch(/Definitions/);
    expect(out).toMatch(/Proposition/);
    expect(out).toMatch(/Opposition/);
    expect(out).toMatch(/Rebuttals/);
    expect(out).toMatch(/Evidence Anchors/);
    expect(out).toMatch(/Strategy/);
  });
});

describe('SAMPLE_MOTIONS', () => {
  it('has at least 6 motions all phrased as THBT/THW', () => {
    expect(SAMPLE_MOTIONS.length).toBeGreaterThanOrEqual(6);
    for (const m of SAMPLE_MOTIONS) {
      expect(m).toMatch(/^This House (Believes That|Would)/);
    }
  });
});
