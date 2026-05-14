export interface CriterionScore {
  score: number;
  comment: string;
}

export interface RubricResult {
  style: CriterionScore;
  content: CriterionScore;
  strategy: CriterionScore;
  total: number;
  highlights: string[];
  actionable: string[];
  /** echoed by /api/score so the UI can show which model graded the speech */
  provider?: { provider: string; model: string };
}

export const RUBRIC_MAX = { style: 25, content: 25, strategy: 10, total: 60 } as const;

export function clampRubric(r: Partial<RubricResult>): RubricResult {
  const style = clampCriterion(r.style, RUBRIC_MAX.style);
  const content = clampCriterion(r.content, RUBRIC_MAX.content);
  const strategy = clampCriterion(r.strategy, RUBRIC_MAX.strategy);
  return {
    style,
    content,
    strategy,
    total: style.score + content.score + strategy.score,
    highlights: Array.isArray(r.highlights) ? r.highlights.slice(0, 4) : [],
    actionable: Array.isArray(r.actionable) ? r.actionable.slice(0, 3) : []
  };
}

function clampCriterion(c: CriterionScore | undefined, max: number): CriterionScore {
  if (!c) return { score: 0, comment: 'No comment' };
  const score = Math.max(0, Math.min(max, Math.round(Number(c.score) || 0)));
  return { score, comment: String(c.comment ?? '') };
}
