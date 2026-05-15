/**
 * Avatar registry — each entry pairs a Live2D model with positioning hints
 * and an emotion → expression name map (since each model names its
 * expressions differently).
 */

import type { ParsedSpeech } from '@/lib/parseEmotion';

export type AvatarId = 'mao' | 'natori' | 'hiyori';

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
    anchorY: 0.02,
    scale: 1.85,
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
  // Natori — formal male, glasses, gray hair. 11 expressions, half of them
  // semantically named (Smile, Surprised, Angry, Sad, Blushing, Normal) —
  // the strongest fit for a "senior debater" video-call opponent.
  natori: {
    id: 'natori',
    label: 'Natori · 学者派',
    blurb: 'WSC senior · scholar track',
    emoji: '🎩',
    modelUrl: '/live2d/models/Natori/runtime/Natori.model3.json',
    anchorX: 0.5,
    anchorY: 0.02,
    scale: 1.6,
    expressions: {
      confident: 'Smile',
      thoughtful: 'exp_01',
      surprised: 'Surprised',
      amused: 'Smile',
      firm: 'Angry',
      happy: 'Smile',
      neutral: 'Normal',
      sad: 'Sad',
      angry: 'Angry'
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
    anchorY: 0.04,
    scale: 1.6,
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
  }
};

export const AVATAR_LIST: AvatarConfig[] = [
  AVATARS.natori,
  AVATARS.mao,
  AVATARS.hiyori
];

export const DEFAULT_AVATAR_ID: AvatarId = 'natori';

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
