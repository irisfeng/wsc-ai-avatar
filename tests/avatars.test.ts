import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { AVATAR_LIST, DEFAULT_AVATAR_ID, resolveExpression } from '@/lib/avatars';

const root = process.cwd();

function publicPath(url: string) {
  expect(url.startsWith('/')).toBe(true);
  return path.join(root, 'public', url.slice(1));
}

describe('avatar registry', () => {
  it('has a usable default avatar', () => {
    const ids = AVATAR_LIST.map((avatar) => avatar.id);
    expect(ids).toContain(DEFAULT_AVATAR_ID);
  });

  it('points every avatar at an existing Live2D model file', async () => {
    for (const avatar of AVATAR_LIST) {
      const modelPath = publicPath(avatar.modelUrl);
      expect(existsSync(modelPath), `${avatar.id} model is missing`).toBe(true);

      const model = JSON.parse(await readFile(modelPath, 'utf8')) as {
        FileReferences?: {
          Moc?: string;
          Textures?: string[];
          Expressions?: { Name: string; File: string }[];
          Motions?: Record<string, { File: string; Sound?: string }[]>;
          Physics?: string;
          Pose?: string;
        };
      };
      const refs = model.FileReferences;
      expect(refs?.Moc, `${avatar.id} moc reference`).toBeTruthy();

      const modelDir = path.dirname(modelPath);
      if (refs?.Moc) {
        expect(existsSync(path.join(modelDir, refs.Moc)), `${avatar.id} moc file`).toBe(
          true
        );
      }
      for (const texture of refs?.Textures ?? []) {
        expect(
          existsSync(path.join(modelDir, texture)),
          `${avatar.id} texture ${texture}`
        ).toBe(true);
      }
      if (refs?.Physics) {
        expect(existsSync(path.join(modelDir, refs.Physics)), `${avatar.id} physics`).toBe(
          true
        );
      }
      if (refs?.Pose) {
        expect(existsSync(path.join(modelDir, refs.Pose)), `${avatar.id} pose`).toBe(
          true
        );
      }
      for (const expression of refs?.Expressions ?? []) {
        expect(
          existsSync(path.join(modelDir, expression.File)),
          `${avatar.id} expression ${expression.Name}`
        ).toBe(true);
      }
      for (const group of Object.values(refs?.Motions ?? {})) {
        for (const motion of group) {
          expect(
            existsSync(path.join(modelDir, motion.File)),
            `${avatar.id} motion ${motion.File}`
          ).toBe(true);
          if ('Sound' in motion && motion.Sound) {
            expect(
              existsSync(path.join(modelDir, motion.Sound)),
              `${avatar.id} sound ${motion.Sound}`
            ).toBe(true);
          }
        }
      }
    }
  });

  it('uses voices and layout hints that are safe for the call UI', () => {
    for (const avatar of AVATAR_LIST) {
      expect(avatar.label.length).toBeGreaterThan(0);
      expect(avatar.blurb.length).toBeGreaterThan(0);
      expect(avatar.voice).toMatch(/^[a-z]{2}-[A-Z]{2}-[A-Za-z]+Neural$/);
      expect(avatar.anchorX).toBeGreaterThanOrEqual(0);
      expect(avatar.anchorX).toBeLessThanOrEqual(1);
      expect(avatar.anchorY).toBeGreaterThanOrEqual(-0.25);
      expect(avatar.anchorY).toBeLessThanOrEqual(0.25);
      expect(avatar.scale).toBeGreaterThan(1);
      expect(avatar.scale).toBeLessThanOrEqual(2.5);
    }
  });

  it('maps emotion words only to expressions shipped by the model', async () => {
    for (const avatar of AVATAR_LIST) {
      const modelPath = publicPath(avatar.modelUrl);
      const model = JSON.parse(await readFile(modelPath, 'utf8')) as {
        FileReferences?: { Expressions?: { Name: string }[] };
      };
      const shipped = new Set(
        (model.FileReferences?.Expressions ?? []).map((expression) => expression.Name)
      );

      for (const emotion of Object.keys(avatar.expressions)) {
        const expression = resolveExpression(avatar, emotion);
        if (expression) {
          expect(
            shipped.has(expression),
            `${avatar.id} emotion ${emotion} -> missing ${expression}`
          ).toBe(true);
        }
      }
    }
  });
});
