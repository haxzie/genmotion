"use client";

import {
  Children,
  isValidElement,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { useCurrentFrame, useVideoConfig } from "../context";
import { CameraContext } from "../camera-context";
import {
  cameraAt,
  cameraClampWarnings,
  cameraTransform,
  depthForZ,
  perspectiveDistance,
  resolveCameraKeyframes,
  zoomToFit,
  type CameraFocusOverride,
  type CameraGeometry,
  type CameraKeyframe,
  type DriftOptions,
  type ShakeOptions,
} from "../camera";

const isBrowser = typeof window !== "undefined";
// renderToString never runs layout effects; the AI validator renders scenes that
// way, so fall back to useEffect there rather than emit React's SSR warning.
const useIsomorphicLayoutEffect = isBrowser ? useLayoutEffect : useEffect;

/**
 * Read through `globalThis` rather than the bare `process` identifier.
 *
 * This package is consumed by browser-targeted builds whose tsconfig has no
 * node types — `@genmotion/compiler` among them, where the bare reference has
 * been failing `tsc` since this file landed. Bundlers still substitute
 * `process.env.NODE_ENV` here, and at runtime a missing `process` simply reads
 * as development, which is the safe default for a dev-only warning.
 */
const isDev =
  (globalThis as { process?: { env?: { NODE_ENV?: string } } }).process?.env
    ?.NODE_ENV !== "production";

export interface CameraProps {
  /**
   * World size as a multiple of the frame. 1 (the default) means the world is
   * exactly the frame, so <Camera> is a drop-in no-op. Go above 1 when the
   * scene has content outside the frame to pan across.
   */
  world?: number;
  /**
   * Viewer distance for perspective tilt, in multiples of the frame width.
   * Lower is a wider lens: more dramatic convergence, more distortion. Only
   * has an effect when a keyframe sets `tilt`.
   */
  perspective?: number;
  keyframes?: CameraKeyframe[];
  /** Ambient sway, so the frame is never fully static. */
  drift?: DriftOptions;
  /** One or more impact shakes. */
  shake?: ShakeOptions | ShakeOptions[];
  /** Keep the frame inside the world. On by default. */
  clamp?: boolean;
  style?: React.CSSProperties;
  className?: string;
  children?: ReactNode;
}

export interface LayerProps {
  /**
   * Distance behind the screen plane, in px. 0 (the default) is the screen
   * plane and moves with the world; larger is further away and moves less;
   * negative sits in front of the screen and moves more.
   */
  z?: number;
  style?: React.CSSProperties;
  className?: string;
  children?: ReactNode;
}

export interface OverlayProps {
  style?: React.CSSProperties;
  className?: string;
  children?: ReactNode;
}

/**
 * A plane of world content at depth `z`.
 *
 * Must be a DIRECT child of <Camera> — planes render as siblings so their
 * transforms never compound. Anything else you pass to <Camera> is collected
 * into an implicit z=0 plane, in place, so document order is preserved.
 */
export function Layer({ children, style, className }: LayerProps) {
  // <Camera> owns the box geometry and the transform; this fills the plane box
  // so absolutely-positioned children resolve against the world, not a
  // shrink-wrapped block.
  return (
    <div className={className} style={{ position: "absolute", inset: 0, ...style }}>
      {children}
    </div>
  );
}

/**
 * Screen-locked content: captions, logos, lower-thirds. Never moves, whatever
 * the camera does.
 *
 * Unlike a <Layer>, its box is the FRAME rather than the world — so `bottom:
 * 40` means 40px from the bottom of the picture, which is the only thing an
 * author ever means by it.
 */
export function Overlay({ children, style, className }: OverlayProps) {
  return (
    <div className={className} style={{ position: "absolute", inset: 0, ...style }}>
      {children}
    </div>
  );
}

/** Brand instead of comparing identity: a duplicated module instance (Fast
 * Refresh re-evaluating this file, a barrel resolved twice) yields a different
 * function object, and an identity check would then silently flatten every
 * plane onto z=0. */
const KIND = "__genmotionCameraKind";
(Layer as unknown as Record<string, string>)[KIND] = "layer";
(Overlay as unknown as Record<string, string>)[KIND] = "overlay";

function kindOf(node: ReactNode): "layer" | "overlay" | null {
  if (!isValidElement(node)) return null;
  const kind = (node.type as unknown as Record<string, string> | null)?.[KIND];
  return kind === "layer" || kind === "overlay" ? kind : null;
}

/**
 * Layer box.
 *
 * depth 0 is a special case on purpose: the box is the FRAME and carries no
 * transform, so `bottom: 60` means 60px from the bottom of the picture. Sizing
 * it like every other layer would make it world-sized, and a screen-locked
 * caption anchored to `bottom` would land off the bottom of the frame — the
 * transform would be right and the authoring unusable. Every other depth is
 * world-sized, because that is the space its content is positioned in.
 */
function layerBoxStyle(
  width: number,
  height: number,
  transform: string | undefined,
): React.CSSProperties {
  return {
    position: "absolute",
    left: 0,
    top: 0,
    width,
    height,
    transformOrigin: "0 0",
    // Never promote this. `will-change: transform` pins the layer's raster
    // scale, which is precisely the bug a camera zoom exposes — the texture
    // gets stretched instead of the content re-rasterized.
    willChange: "auto",
    overflow: "visible",
    transform,
  };
}

/**
 * Where an element sits in world coordinates.
 *
 * Deliberately uses the offsetParent chain, not getBoundingClientRect: offsets
 * are LAYOUT values, so they ignore every transform — the camera's own, and the
 * target's. That means a target mid-entrance (translateY, scale(0), …) does not
 * drag the camera or collapse `fit` to a zero-size rect. It costs sub-pixel
 * precision, which is why focus targets must be layout-stable anyway.
 */
function measureWorldRect(
  el: HTMLElement,
  worldEl: HTMLElement,
): { x: number; y: number; width: number; height: number } | null {
  let x = 0;
  let y = 0;
  let node: HTMLElement | null = el;
  // Bounded so a detached or reparented node can't spin here.
  for (let hops = 0; node && node !== worldEl && hops < 64; hops++) {
    x += node.offsetLeft;
    y += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }
  if (node !== worldEl) return null;
  return { x, y, width: el.offsetWidth, height: el.offsetHeight };
}

/**
 * The scene's camera: a view transform over a world, rather than a scale on a
 * div. Content is authored in world coordinates; the camera says which world
 * point is at frame centre and how tight the crop is.
 *
 *   <Camera world={2} keyframes={[
 *     { at: 0,  x: 0.5, y: 0.5, zoom: 1 },
 *     { at: 45, focus: "pricing-card", fit: 0.8 },
 *   ]}>
 */
export function Camera({
  world = 1,
  perspective = 2,
  keyframes,
  drift,
  shake,
  clamp = true,
  style,
  className,
  children,
}: CameraProps) {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const worldRef = useRef<HTMLDivElement>(null);

  const geometry = useMemo<CameraGeometry>(
    () => ({ width, height, world, perspective: width * perspective }),
    [width, height, world, perspective],
  );

  const kfs = useMemo(() => keyframes ?? [], [keyframes]);
  const worldW = width * world;
  const worldH = height * world;

  // Only establish a 3D rendering context when something actually tilts —
  // `perspective` promotes its children to composited layers, which is a cost
  // (and a raster-scale hazard) worth avoiding on the flat path.
  const hasTilt = useMemo(
    () => kfs.some((k) => (k.tilt?.x ?? 0) !== 0 || (k.tilt?.y ?? 0) !== 0),
    [kfs],
  );

  // Any `focus` means the camera can only be finished after layout. Without it
  // the inline transforms below are the whole story and we touch no DOM at all.
  const needsMeasurement = useMemo(() => kfs.some((k) => k.focus), [kfs]);

  const baseOptions = { geometry, fps, drift, shake, clamp };
  // Rendered value: pure math, no measurement. This is what SSR and the first
  // paint get, and — when nothing uses `focus` — the final value too.
  const declaredState = cameraAt(frame, kfs, baseOptions);

  // Group consecutive non-layer children into implicit depth-1 layers so that
  // explicit <CameraLayer>s stay siblings (transforms must not compound) while
  // document order, and therefore stacking order, is preserved exactly.
  const layers = useMemo(() => {
    const out: Array<{
      z: number;
      overlay: boolean;
      nodes: ReactNode[];
      key: string;
    }> = [];
    let loose: ReactNode[] = [];
    const flush = () => {
      if (loose.length === 0) return;
      out.push({ z: 0, overlay: false, nodes: loose, key: `implicit-${out.length}` });
      loose = [];
    };
    Children.toArray(children).forEach((child, i) => {
      const kind = kindOf(child);
      if (!kind) {
        loose.push(child);
        return;
      }
      flush();
      out.push({
        z: kind === "layer" ? ((child as React.ReactElement<LayerProps>).props.z ?? 0) : 0,
        overlay: kind === "overlay",
        nodes: [child],
        key: `${kind}-${i}`,
      });
    });
    flush();
    return out;
  }, [children]);

  useIsomorphicLayoutEffect(() => {
    if (!needsMeasurement) return;
    const worldEl = worldRef.current;
    if (!worldEl) return;

    const resolved = resolveCameraKeyframes(kfs);
    const overrides: Array<CameraFocusOverride | undefined> = resolved.map((kf) => {
      if (!kf.focus) return undefined;
      const id = kf.focus.startsWith("#") ? kf.focus.slice(1) : kf.focus;
      const target = worldEl.querySelector<HTMLElement>(`#${CSS.escape(id)}`);
      // Unmounted (or outside the camera): fall back to the declared x/y/zoom.
      if (!target) return undefined;
      const rect = measureWorldRect(target, worldEl);
      if (!rect || rect.width <= 0 || rect.height <= 0) return undefined;

      if (isDev) {
        const owner = target.closest<HTMLElement>("[data-camera-z],[data-camera-overlay]");
        const ownerZ = Number(owner?.dataset.cameraZ ?? 0);
        if (owner?.dataset.cameraOverlay !== undefined || ownerZ !== 0) {
          console.warn(
            `[Camera] focus target "${id}" is not on the z=0 plane. Focus ` +
              `resolves in world space, so it will not frame accurately. Move ` +
              `the target into a <Layer> at z={0}.`,
          );
        }
      }

      const override: CameraFocusOverride = {
        x: (rect.x + rect.width / 2) / worldW,
        y: (rect.y + rect.height / 2) / worldH,
      };
      if (kf.fit !== undefined) {
        const zoom = zoomToFit(rect, geometry, kf.fit, kf.fitMode);
        if (Number.isFinite(zoom)) override.zoom = zoom;
      }
      return override;
    });

    const state = cameraAt(frame, kfs, { ...baseOptions, overrides });

    // Written unconditionally every frame: React only touches the DOM when its
    // own inline value changes, so a conditional write would leave a stale
    // measured transform behind whenever the declared camera happens to hold.
    for (const el of Array.from(worldEl.children) as HTMLElement[]) {
      // Overlays are frame-sized and untransformed by construction — writing a
      // matrix here would undo exactly that.
      if (el.dataset.cameraOverlay !== undefined) continue;
      const css = cameraTransform(
        state,
        geometry,
        depthForZ(Number(el.dataset.cameraZ ?? 0), geometry),
      );
      // Null means a non-finite component, which would be invalid CSS and get
      // dropped wholesale — leaving the declared transform in place is better.
      if (css) el.style.transform = css;
    }
  });

  useEffect(() => {
    if (!isDev) return;
    for (const warning of cameraClampWarnings(kfs, geometry)) {
      console.warn(`[Camera] ${warning}`);
    }
  }, [kfs, geometry]);

  return (
    <CameraContext.Provider value={declaredState}>
      <div
        className={className}
        style={{ position: "absolute", inset: 0, overflow: "hidden", ...style }}
      >
        <div
          ref={worldRef}
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: worldW,
            height: worldH,
            // Perspective lives here, not on the viewport: the property only
            // applies to an element's DIRECT children, and the layers are the
            // children of this div. Putting it here also means every depth
            // layer shares one vanishing point, which is what makes them read
            // as one 3D space.
            //
            // The origin is the FRAME centre expressed in this div's own
            // coordinates. That div starts at the viewport's top-left, so the
            // frame centre is simply (width/2, height/2) — and it is exactly
            // where the view transform parks whatever the camera is looking
            // at, so a tilt pivots around the subject.
            ...(hasTilt
              ? {
                  perspective: perspectiveDistance(geometry),
                  perspectiveOrigin: `${width / 2}px ${height / 2}px`,
                }
              : null),
          }}
        >
          {layers.map((layer) =>
            layer.overlay ? (
              <div
                key={layer.key}
                data-camera-overlay=""
                style={layerBoxStyle(width, height, undefined)}
              >
                {layer.nodes}
              </div>
            ) : (
              <div
                key={layer.key}
                data-camera-z={layer.z}
                style={layerBoxStyle(
                  worldW,
                  worldH,
                  cameraTransform(
                    declaredState,
                    geometry,
                    depthForZ(layer.z, geometry),
                  ) ?? undefined,
                )}
              >
                {layer.nodes}
              </div>
            ),
          )}
        </div>
      </div>
    </CameraContext.Provider>
  );
}
