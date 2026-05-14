'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * Live2D stage:
 *  - Uses pixi-live2d-display-lipsyncpatch with PixiJS 7
 *  - Cubism Core (Live2D's closed-source runtime) is loaded from /live2d/core/*.js via <script>
 *  - Default model is loaded from /live2d/models/{MODEL}/runtime/{MODEL}.model3.json
 *    Place a Cubism 4 model (model3.json + textures) there.
 *
 * Exposes window.__wscLive2D for the lip-sync hook to drive ParamMouthOpenY.
 */

interface Live2DStageProps {
  modelUrl?: string;
  className?: string;
  expression?: string;
  onReady?: () => void;
}

declare global {
  interface Window {
    PIXI?: typeof import('pixi.js');
    __wscLive2D?: {
      setMouthOpen: (value: number) => void;
      setExpression: (name: string) => void;
      speak: (audioUrl: string, opts?: { expression?: string; volume?: number }) => Promise<void>;
      model: unknown;
    };
  }
}

const DEFAULT_MODEL =
  '/live2d/models/Hiyori/runtime/Hiyori.model3.json';

export function Live2DStage({
  modelUrl = DEFAULT_MODEL,
  className,
  expression,
  onReady
}: Live2DStageProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    let app: unknown = null;

    (async () => {
      try {
        await ensureCubismCore();

        const PIXI = await import('pixi.js');
        // Expose globally for the lipsyncpatch (it expects window.PIXI)
        (window as Window).PIXI = PIXI;

        // Import the Cubism 4-only bundle (smaller; Hiyori is Cubism 4)
        const live2dModule = await import('pixi-live2d-display-lipsyncpatch/cubism4');
        const { Live2DModel } = live2dModule;

        if (cancelled || !canvasRef.current) return;

        const application = new PIXI.Application({
          view: canvasRef.current,
          autoStart: true,
          backgroundAlpha: 0,
          antialias: true,
          resolution: window.devicePixelRatio || 1,
          autoDensity: true,
          resizeTo: canvasRef.current.parentElement || undefined
        });
        app = application;

        const model = (await Live2DModel.from(modelUrl, {
          autoInteract: true,
          autoUpdate: true
        })) as unknown as PIXIDisplayObject;

        // pixi-live2d-display returns its own DisplayObject subclass; addChild's
        // signature wants PIXI.DisplayObject. The runtime types match, but the
        // bundled .d.ts diverges — cast through `unknown` to silence TS only.
        (application.stage.addChild as (child: unknown) => void)(model);

        const fit = () => {
          const w = (application.renderer as { width: number }).width;
          const h = (application.renderer as { height: number }).height;
          const m = model as PIXIDisplayObject & {
            width: number;
            height: number;
            scale: { set(v: number): void };
            x: number;
            y: number;
            anchor: { set(x: number, y: number): void };
          };
          const scale = Math.min(w / m.width, h / m.height) * 0.95;
          m.scale.set(scale);
          m.anchor?.set?.(0.5, 0.5);
          m.x = w / 2;
          m.y = h / 2 + h * 0.05;
        };
        fit();
        window.addEventListener('resize', fit);

        // Expose control surface
        window.__wscLive2D = {
          setMouthOpen(value: number) {
            try {
              const core = (model as unknown as {
                internalModel: {
                  coreModel: { setParameterValueById: (id: string, v: number) => void };
                };
              }).internalModel.coreModel;
              core.setParameterValueById('ParamMouthOpenY', clamp(value, 0, 1));
            } catch {
              /* model may not have that param */
            }
          },
          setExpression(name: string) {
            try {
              (model as unknown as { expression: (n: string) => void }).expression(name);
            } catch {
              /* missing expression — ignore */
            }
          },
          /**
           * Use the lipsyncpatch's built-in `speak()` which plays audio AND drives the
           * model's mouth from the same audio analyser — most accurate option.
           */
          speak(audioUrl, opts) {
            return new Promise((resolve, reject) => {
              try {
                const speakable = model as unknown as {
                  speak: (
                    url: string,
                    o: {
                      volume?: number;
                      expression?: string;
                      resetExpression?: boolean;
                      crossOrigin?: string;
                      onFinish?: () => void;
                      onError?: (e: unknown) => void;
                    }
                  ) => void;
                };
                speakable.speak(audioUrl, {
                  volume: opts?.volume ?? 1,
                  expression: opts?.expression,
                  resetExpression: true,
                  crossOrigin: 'anonymous',
                  onFinish: () => resolve(),
                  onError: (e) => reject(e instanceof Error ? e : new Error(String(e)))
                });
              } catch (e) {
                reject(e instanceof Error ? e : new Error(String(e)));
              }
            });
          },
          model
        };

        setStatus('ready');
        onReady?.();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setErrorMsg(msg);
        setStatus('error');
        // eslint-disable-next-line no-console
        console.error('[Live2D] init failed:', err);
      }
    })();

    return () => {
      cancelled = true;
      try {
        (app as { destroy?: (a: boolean, b: object) => void } | null)?.destroy?.(true, {
          children: true,
          texture: true,
          baseTexture: true
        });
      } catch {
        /* noop */
      }
      delete window.__wscLive2D;
    };
  }, [modelUrl, onReady]);

  // Apply expression changes from props
  useEffect(() => {
    if (status === 'ready' && expression) {
      window.__wscLive2D?.setExpression(expression);
    }
  }, [expression, status]);

  return (
    <div className={cn('relative h-full w-full overflow-hidden', className)}>
      <canvas ref={canvasRef} className="h-full w-full" />
      {status !== 'ready' && (
        <div className="absolute inset-0 flex items-center justify-center text-center text-sm text-white/60">
          {status === 'loading' && '加载 Live2D 模型中…'}
          {status === 'error' && (
            <div className="max-w-md px-6">
              <p className="font-semibold text-wsc-accent">Live2D 加载失败</p>
              <p className="mt-2 text-white/60">{errorMsg}</p>
              <p className="mt-3 text-xs text-white/40">
                请确认 <code>public/live2d/core/live2dcubismcore.min.js</code> 与
                <code>public/live2d/models/Hiyori/</code> 已就位。
                参考 README → "Live2D 模型与运行时"。
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

type PIXIDisplayObject = unknown;

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

async function ensureCubismCore(): Promise<void> {
  if (typeof window === 'undefined') return;
  const w = window as Window & { Live2DCubismCore?: unknown; Live2D?: unknown };
  if (w.Live2DCubismCore) return;
  // Cubism 4 core (closed source binary released by Live2D Inc.)
  await loadScript('/live2d/core/live2dcubismcore.min.js');
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      resolve();
      return;
    }
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}
