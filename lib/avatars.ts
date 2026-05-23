/**
 * Avatar registry — each entry pairs a Live2D model with positioning hints
 * and an emotion → expression name map (since each model names its
 * expressions differently).
 */

import type { ParsedSpeech } from '@/lib/parseEmotion';

export type AvatarId = 'mao' | 'rice' | 'ren' | 'hiyori';

export interface AvatarConfig {
  id: AvatarId;
  /** display label */
  label: string;
  /** short hint shown under the camera frame */
  blurb: string;
  /** single emoji used in the avatar picker chip */
  emoji: string;
  /** model3.json path served from /public */
  modelUrl: string;
  /** layout anchors inside the Live2D stage (0..1) */
  anchorX: number;
  anchorY: number;
  /** scale multiplier on top of the fit-to-stage scale */
  scale: number;
  /**
   * Edge-TTS voice id. Male avatars get a male voice, female get female.
   * Browse: https://learn.microsoft.com/azure/ai-services/speech-service/language-support
   */
  voice: string;
  /**
   * Map our LLM-emitted emotion words to this model's expression IDs.
   * The 9 keys below cover everything parseEmotion can return; missing
   * keys fall back to the 'neutral' entry.
   */
  expressions: Record<NonNullable<ParsedSpeech['emotion']>, string | null>;
}

export const AVATARS: Record<AvatarId, AvatarConfig> = {
  // Mao — magical-artist character (witch hat, paint-splashed jacket).
  // 8 expressions (exp_01–08). Full-body sample; hard-zoom strategy lets
  // the desk surface in VideoCallScene replace her lower body.
  mao: {
    id: 'mao',
    label: 'Mao · 创意辩手',
    blurb: 'WSC senior · creative arts track',
    emoji: '🎨',
    modelUrl: '/live2d/models/Mao/runtime/Mao.model3.json',
    anchorX: 0.5,
    anchorY: 0.08,
    scale: 2.05,
    voice: 'en-US-AnaNeural', // younger, brighter female voice for Mao
    expressions: {
      confident: 'exp_01',
      thoughtful: 'exp_05',
      surprised: 'exp_03',
      amused: 'exp_02',
      firm: 'exp_07',
      happy: 'exp_02',
      neutral: 'exp_01',
      sad: 'exp_06',
      angry: 'exp_07'
    }
  },
  // Rice — polished academy captain. Clean blue/white uniform, long silver
  // hair, and a calmer "senior scholar" read than Haru/Natori.
  rice: {
    id: 'rice',
    label: 'Rice · 学院队长',
    blurb: 'WSC senior · strategy captain',
    emoji: '📘',
    modelUrl: '/live2d/models/Rice/runtime/Rice.model3.json',
    anchorX: 0.5,
    anchorY: -0.05,
    scale: 1.82,
    voice: 'en-US-JennyNeural', // clear, polished female coach voice
    // Rice sample ships no expression files, but lipSync/idle are stable.
    expressions: {
      confident: null,
      thoughtful: null,
      surprised: null,
      amused: null,
      firm: null,
      happy: null,
      neutral: null,
      sad: null,
      angry: null
    }
  },
  // Ren — cooler opposition captain / tech debater. Darker outfit and sharper
  // silhouette, with five expression files and native mouth parameter support.
  ren: {
    id: 'ren',
    label: 'Ren · 反方队长',
    blurb: 'WSC senior · tech & rebuttal track',
    emoji: '⚡',
    modelUrl: '/live2d/models/Ren/runtime/Ren.model3.json',
    anchorX: 0.5,
    anchorY: -0.02,
    scale: 1.72,
    voice: 'en-US-BrianNeural', // young, confident male voice
    expressions: {
      confident: 'exp_01',
      thoughtful: 'exp_04',
      surprised: 'exp_03',
      amused: 'exp_02',
      firm: 'exp_05',
      happy: 'exp_02',
      neutral: 'exp_01',
      sad: 'exp_04',
      angry: 'exp_05'
    }
  },
  // Hiyori — full-body kawaii junior. No expressions (sample doesn't ship
  // any), but lipSync works fine.
  hiyori: {
    id: 'hiyori',
    label: 'Hiyori · 同龄',
    blurb: 'WSC peer debater · junior section',
    emoji: '🌸',
    modelUrl: '/live2d/models/Hiyori/runtime/Hiyori.model3.json',
    anchorX: 0.5,
    anchorY: -0.05,
    scale: 2.0,
    voice: 'en-US-AriaNeural', // clear female, slightly youthful
    // Hiyori sample ships with no .exp3.json files — expression() calls are no-ops.
    // Listed for type completeness only.
    expressions: {
      confident: null,
      thoughtful: null,
      surprised: null,
      amused: null,
      firm: null,
      happy: null,
      neutral: null,
      sad: null,
      angry: null
    }
  },
};

export const AVATAR_LIST: AvatarConfig[] = [
  AVATARS.mao,
  AVATARS.rice,
  AVATARS.ren,
  AVATARS.hiyori
];

export const DEFAULT_AVATAR_ID: AvatarId = 'mao';

/** Translate a LLM-emitted emotion word into the model's expression ID. */
export function resolveExpression(
  cfg: AvatarConfig,
  emotion: string | undefined
): string | undefined {
  if (!emotion) return undefined;
  const key = emotion.toLowerCase() as keyof AvatarConfig['expressions'];
  const v = cfg.expressions[key];
  return v ?? undefined;
}
