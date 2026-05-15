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
  /**
   * Horizontal anchor inside the stage. 0 = left edge, 0.5 = centred,
   * 1 = right edge. Default 0.5. The debate page sets this to ~0.4 so
   * the model sits slightly left of centre, clear of the chat panel.
   */
  anchorX?: number;
  /** Vertical anchor. 0 = top, 0.5 = centre, 1 = bottom. Default 0.55 (slightly low). */
  anchorY?: number;
  /** Multiplier on the fit-to-stage scale. 0.85 default — leaves margin. */
  scale?: number;
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
  onReady,
  anchorX = 0.5,
  anchorY = 0.55,
  scale: scaleMul = 0.85
}: Live2DStageProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState<string>('');
  // Keep latest layout knobs in refs so fit() (created once per mount) sees
  // up-to-date values when the props change.
  const anchorXRef = useRef(anchorX);
  const anchorYRef = useRef(anchorY);
  const scaleMulRef = useRef(scaleMul);
  anchorXRef.current = anchorX;
  anchorYRef.current = anchorY;
  scaleMulRef.current = scaleMul;
  const fitRef = useRef<(() => void) | null>(null);
  // Re-fit whenever positional props change.
  useEffect(() => {
    fitRef.current?.();
  }, [anchorX, anchorY, scaleMul]);

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

        const parentEl = canvasRef.current.parentElement;

        // Wait until the parent actually has non-zero dimensions before
        // initialising Pixi. With absolute-positioned ancestors the
        // browser sometimes hands us a freshly-mounted element whose
        // layout hasn't been computed yet, which makes `parentEl.clientWidth`
        // read 0. Pixi's WebGL setup then queries the GL context at 0×0
        // and the shader-pool check explodes with
        // "Invalid value of `0` passed to checkMaxIfStatementsInShader".
        await waitForLayout(parentEl);
        if (cancelled || !canvasRef.current) return;

        // Defensive: clamp to a sane minimum even if measurement still
        // somehow returns 0 (e.g. display:none ancestor).
        const initialW = Math.max(
          parentEl?.clientWidth || 0,
          window.innerWidth || 0,
          320
        );
        const initialH = Math.max(
          parentEl?.clientHeight || 0,
          window.innerHeight || 0,
          240
        );

        const application = new PIXI.Application({
          view: canvasRef.current,
          autoStart: true,
          backgroundAlpha: 0,
          antialias: true,
          resolution: window.devicePixelRatio || 1,
          autoDensity: true,
          width: initialW,
          height: initialH,
          resizeTo: parentEl || undefined
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

        type Renderer = { width: number; height: number; resolution: number };
        type Positionable = {
          width: number;
          height: number;
          scale: { set(v: number): void; x: number; y: number };
          x: number;
          y: number;
        };

        const fit = () => {
          const r = application.renderer as unknown as Renderer;
          // renderer.width is in physical pixels; we want layout px so we
          // divide out resolution (Pixi v7, autoDensity=true).
          const w = r.width / r.resolution;
          const h = r.height / r.resolution;
          const m = model as unknown as Positionable;

          // Reset scale before reading natural size — otherwise width/height
          // would reflect the previous scale and the fit calculation drifts
          // on consecutive calls.
          m.scale.set(1);
          const naturalW = m.width;
          const naturalH = m.height;
          if (naturalW <= 0 || naturalH <= 0) return;

          const fitScale =
            Math.min(w / naturalW, h / naturalH) * scaleMulRef.current;
          m.scale.set(fitScale);

          const scaledW = naturalW * fitScale;
          const scaledH = naturalH * fitScale;

          // Live2DModel ignores `anchor.set()` (it's not a Sprite). Use the
          // computed offset instead so the model is positioned by its
          // visual centre, not its top-left corner.
          m.x = (w - scaledW) * anchorXRef.current;
          m.y = (h - scaledH) * anchorYRef.current;
        };
        fit();
        fitRef.current = fit;
        window.addEventListener('resize', fit);
        // Re-fit when the parent container resizes (responsive grid).
        const ro =
          parentEl && typeof ResizeObserver !== 'undefined'
            ? new ResizeObserver(() => fit())
            : null;
        ro?.observe(parentEl as Element);
        // Stash the observer on the app so the cleanup teardown can stop it.
        (application as unknown as { __ro?: ResizeObserver | null }).__ro = ro;

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
           *
           * IMPORTANT — Chrome AudioContext gotcha:
           * The library calls `new AudioContext()` for every speak() invocation.
           * Contexts created far from a user gesture start `suspended`, so the
           * <audio> element plays (you hear sound) but the analyser feeding
           * ParamMouthOpenY reads zeros — mouth freezes from sentence 2 onward.
           * Fix: poll briefly after speak() initialises and force-resume the
           * fresh context grabbed from motionManager.currentContext.
           */
          speak(audioUrl, opts) {
            return new Promise<void>((resolve, reject) => {
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
                  ) => Promise<unknown> | unknown;
                };

                const ret = speakable.speak(audioUrl, {
                  volume: opts?.volume ?? 1,
                  expression: opts?.expression,
                  resetExpression: true,
                  crossOrigin: 'anonymous',
                  onFinish: () => resolve(),
                  onError: (e) =>
                    reject(e instanceof Error ? e : new Error(String(e)))
                });

                // After speak()'s init resolves, the library has set
                // internalModel.motionManager.currentContext. Resume it if Chrome
                // started it suspended.
                const resumeWhenReady = () => {
                  const ctx = (model as unknown as {
                    internalModel?: {
                      motionManager?: { currentContext?: AudioContext };
                    };
                  }).internalModel?.motionManager?.currentContext;
                  if (ctx && ctx.state === 'suspended') {
                    ctx.resume().catch(() => undefined);
                  }
                };
                if (ret && typeof (ret as Promise<unknown>).then === 'function') {
                  (ret as Promise<unknown>).then(resumeWhenReady).catch(() => undefined);
                } else {
                  // speak() is sync in some versions — give it a microtask
                  // to write currentContext, then resume.
                  Promise.resolve().then(resumeWhenReady);
                }
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
        const a = app as
          | ({
              destroy?: (a: boolean, b: object) => void;
              __ro?: ResizeObserver | null;
            })
          | null;
        a?.__ro?.disconnect();
        a?.destroy?.(true, { children: true, texture: true, baseTexture: true });
      } catch {
        /* noop */
      }
      fitRef.current = null;
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

/**
 * Resolves once `el` has a non-zero clientWidth & clientHeight, or after a
 * short timeout (~ 1 s). Used to dodge a race where Pixi's WebGL setup
 * queries the canvas before CSS layout finishes, which yields a 0×0 GL
 * context and trips `checkMaxIfStatementsInShader`.
 */
function waitForLayout(el: HTMLElement | null): Promise<void> {
  return new Promise<void>((resolve) => {
    if (!el) {
      resolve();
      return;
    }
    const ready = () => el.clientWidth > 0 && el.clientHeight > 0;
    if (ready()) {
      resolve();
      return;
    }
    let frames = 0;
    const maxFrames = 60; // ~1 s at 60 Hz
    const tick = () => {
      frames += 1;
      if (ready() || frames >= maxFrames) {
        resolve();
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
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
