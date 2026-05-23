export type DebateSkillId =
  | 'opening-coach'
  | 'poi-drill'
  | 'evidence-finder'
  | 'judge-replay'
  | 'style-coach';

export type DebateSkillRunMode = 'inline' | 'panel' | 'post-call';

export interface DebateSkill {
  id: DebateSkillId;
  title: string;
  shortTitle: string;
  trigger: string;
  description: string;
  runMode: DebateSkillRunMode;
  outputType: 'coaching' | 'question' | 'examples' | 'report';
}

export const DEBATE_SKILLS: DebateSkill[] = [
  {
    id: 'opening-coach',
    title: 'Opening Coach',
    shortTitle: 'Opening',
    trigger: 'Learner needs clearer stance and signposting.',
    description: 'Guide a 45-60 second opening with stance, two signposts, and a clean conclusion.',
    runMode: 'panel',
    outputType: 'coaching'
  },
  {
    id: 'poi-drill',
    title: 'POI Drill',
    shortTitle: 'POI',
    trigger: 'Learner ignores, delays, or over-expands a point of information.',
    description: 'Pressure-test one challenge and coach a direct answer under 20 seconds.',
    runMode: 'inline',
    outputType: 'question'
  },
  {
    id: 'evidence-finder',
    title: 'Evidence Finder',
    shortTitle: 'Evidence',
    trigger: 'Learner makes claims without concrete cases, studies, or examples.',
    description: 'Suggest one tournament-ready example that fits the current motion and side.',
    runMode: 'panel',
    outputType: 'examples'
  },
  {
    id: 'judge-replay',
    title: 'Judge Replay',
    shortTitle: 'Replay',
    trigger: 'A completed turn or session needs rubric-style review.',
    description: 'Convert the transcript into WSC-style comments and next action items.',
    runMode: 'post-call',
    outputType: 'report'
  },
  {
    id: 'style-coach',
    title: 'Style Coach',
    shortTitle: 'Style',
    trigger: 'Learner needs shorter sentences, fewer fillers, or cleaner timing.',
    description: 'Coach delivery clarity through sentence length, filler words, and wrap-up timing.',
    runMode: 'panel',
    outputType: 'coaching'
  }
];

export function listDebateSkills(): DebateSkill[] {
  return DEBATE_SKILLS;
}

export function getDebateSkill(id: DebateSkillId): DebateSkill {
  const skill = DEBATE_SKILLS.find((item) => item.id === id);
  if (!skill) {
    throw new Error(`Unknown debate skill: ${id}`);
  }
  return skill;
}
