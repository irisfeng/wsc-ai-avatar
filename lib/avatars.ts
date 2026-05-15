/**
 * Avatar registry — each entry pairs a Live2D model with positioning hints
 * and an emotion → expression name map (since each model names its
 * expressions differently).
 */

import type { ParsedSpeech } from '@/lib/parseEmotion';

export interface AvatarConfig {
  id: 'mao' | 'hiyori';
  /** display label */
  label: string;
  /** short hint shown under the camera frame */
  blurb: string;
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

export const AVATARS: Record<AvatarConfig['id'], AvatarConfig> = {
  // Mao — Live2D Inc. Cubism 5 sample. The character design is a magical-
  // artist / wizard girl (witch hat, paint-splashed jacket, paintbrush
  // "staff") — NOT business attire as I initially assumed. The model is
  // full-body. To make her work for a "video call from a desk" scene we
  // zoom in hard (scale 1.85) and anchor near the top of the camera frame
  // so legs are pushed past the bottom and visually replaced by the desk
  // surface in VideoCallScene. 8 expressions exp_01–exp_08.
  mao: {
    id: 'mao',
    label: 'Mao · 创意辩手',
    blurb: 'WSC senior · creative arts track',
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
  // Hiyori — full-body kawaii junior. Same hard-zoom strategy as Mao so
  // the desk surface in VideoCallScene visually replaces her lower body.
  hiyori: {
    id: 'hiyori',
    label: 'Hiyori · 同龄',
    blurb: 'WSC peer debater · junior section',
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

export const DEFAULT_AVATAR_ID: AvatarConfig['id'] = 'mao';

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
