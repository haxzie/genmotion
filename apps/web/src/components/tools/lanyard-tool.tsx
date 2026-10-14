"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Player, defaultPlaybackStore } from "@genmotion/player";
import { FaqSection } from "@/components/marketing/faq";
import { ToolShell } from "@/components/marketing/tool-shell";
import { MoreTools, ToolSections } from "@/components/marketing/tool-sections";
import { CardFaceUpload } from "@/components/tools/card-face-upload";
import { Chips, Transport } from "@/components/tools/tool-controls";
import { UpsellModal, type ExportPhase } from "@/components/tools/upsell-modal";
import { Button } from "@/components/ui";
import { track } from "@/lib/analytics";
import { getTool } from "@/lib/marketing/tools";
import { slugify } from "@/lib/video-tools/filename";
import { ArtRejected, readCardArt, releaseCardArt } from "@/lib/video-tools/lanyard/art";
import { LanyardScene } from "@/lib/video-tools/lanyard/scene";
import {
  CARD_SHAPES,
  CARD_SHAPE_IDS,
  LANYARD_DURATION_IN_FRAMES,
  LANYARD_FPS,
  LANYARD_STYLES,
  LANYARD_STYLE_IDS,
  shapeForRatio,
  type CardArt,
  type CardShapeId,
  type LanyardConfig,
  type LanyardStyleId,
} from "@/lib/video-tools/lanyard/types";
import { ASPECTS, ASPECT_KEYS, type AspectKey } from "@/lib/video-tools/types";

export const SLUG = "lanyard-drop-video";

/**
 * Strap colours offered as swatches. Any of them reads as real webbing.
 *
 * Every scene's own default is one of these values, so switching scenes always
 * leaves a chip looking selected. A default that is not in this list shows the
 * strap row with nothing pressed, which reads as a broken control.
 */
const STRAPS = [
  { value: "#151918", label: "Black" },
  { value: "#1b2f6b", label: "Navy" },
  { value: "#8a1f2d", label: "Crimson" },
  { value: "#0b5e3a", label: "Forest" },
  { value: "#2a1a54", label: "Violet" },
  { value: "#d8d2c4", label: "Sand" },
];

/**
 * The 3D lanyard drop generator.
 *
 * Not built on `VideoTool` like the other four generators, and the reason is
 * the whole shape of the page rather than a detail of it: those tools take one
 * string, fetch a number and render a DOM template through the shared
 * rasterizer. This one takes two images that never leave the browser, has no
 * API route behind it, and renders WebGL, which the rasterizer cannot see. What
 * the two do share (the chips, the transport, the badge, the encoder, the
 * upsell) is shared properly instead.
 */
export function LanyardTool() {
  const tool = getTool(SLUG)!;

  const [shape, setShape] = useState<CardShapeId>("portrait");
  // Whether the visitor has chosen the shape themselves. Until they have, the
  // first image they drop picks the shape it fits best, which is right far more
  // often than "portrait" is and saves a step nobody enjoys.
  const [shapeLocked, setShapeLocked] = useState(false);
  const [front, setFront] = useState<CardArt | null>(null);
  const [back, setBack] = useState<CardArt | null>(null);
  const [faceError, setFaceError] = useState<{ front: string | null; back: string | null }>({
    front: null,
    back: null,
  });
  const [style, setStyle] = useState<LanyardStyleId>("studio");
  const [strap, setStrap] = useState(LANYARD_STYLES.studio.strap);
  const [strapTouched, setStrapTouched] = useState(false);
  const [aspect, setAspect] = useState<AspectKey>("portrait");
  const [sceneError, setSceneError] = useState<string | null>(null);

  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [exportError, setExportError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [upsell, setUpsell] = useState<{ phase: ExportPhase; filename: string | null } | null>(null);

  // Coarse capability gate, same as the other generators: the precise codec
  // check needs mediabunny, which stays out of the page bundle.
  const [canExport, setCanExport] = useState(true);
  useEffect(() => {
    setCanExport(typeof window !== "undefined" && "VideoEncoder" in window);
  }, []);

  // Object URLs are the one thing on this page with a lifetime. Released when
  // a face is replaced or cleared, and on the way out.
  useEffect(
    () => () => {
      releaseCardArt(front);
      releaseCardArt(back);
    },
    // Intentionally empty: this is the unmount sweep, and listing the faces
    // would revoke the URL of the image still on screen the moment it changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const isSample = front === null && back === null;
  const { width, height } = ASPECTS[aspect];

  const config = useMemo<LanyardConfig>(
    () => ({ shape, front, back, style, strap }),
    [shape, front, back, style, strap],
  );

  const scenes = useMemo(
    () => [
      {
        id: "lanyard",
        name: "Lanyard drop",
        durationInFrames: LANYARD_DURATION_IN_FRAMES,
        component: () => <LanyardScene config={config} onError={setSceneError} />,
      },
    ],
    [config],
  );

  const pick = useCallback(
    (face: "front" | "back") => async (file: File) => {
      setExportError(null);
      try {
        const art = await readCardArt(file);
        setFaceError((previous) => ({ ...previous, [face]: null }));
        if (face === "front") {
          setFront((previous) => {
            releaseCardArt(previous);
            return art;
          });
        } else {
          setBack((previous) => {
            releaseCardArt(previous);
            return art;
          });
        }
        if (!shapeLocked) setShape(shapeForRatio(art.width / art.height));
        // Restart the preview so the drop plays against the new artwork. One
        // player on this page, so the default clock is addressed directly.
        defaultPlaybackStore.getState().seek(0);
        defaultPlaybackStore.setState({ isPlaying: true });
        track("tool_video_generated", {
          tool: SLUG,
          face,
          shape,
          style,
          aspect,
          artWidth: art.width,
          artHeight: art.height,
        });
      } catch (error) {
        const message =
          error instanceof ArtRejected
            ? error.message
            : "That image couldn't be read. Try a different file.";
        setFaceError((previous) => ({ ...previous, [face]: message }));
      }
    },
    [aspect, shape, shapeLocked, style],
  );

  const clear = useCallback((face: "front" | "back") => {
    setFaceError((previous) => ({ ...previous, [face]: null }));
    const reset = (previous: CardArt | null) => {
      releaseCardArt(previous);
      return null;
    };
    if (face === "front") setFront(reset);
    else setBack(reset);
  }, []);

  const download = useCallback(async () => {
    if (exporting) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setExporting(true);
    setProgress(0);
    setExportError(null);
    setUpsell({ phase: "rendering", filename: null });

    const startedAt = performance.now();
    try {
      const [{ exportCanvasVideo, downloadBlob }, { createLanyardRenderer }] = await Promise.all([
        import("@/lib/video-tools/render/export-canvas-video"),
        import("@/lib/video-tools/lanyard/renderer"),
      ]);
      const result = await exportCanvasVideo({
        // A second renderer, at the export's full resolution: the preview's is
        // capped well below 1080p, and sharing it would either ship a soft
        // video or make the preview crawl.
        createSource: async ({ width: w, height: h }) => {
          const renderer = await createLanyardRenderer({
            width: w,
            height: h,
            fps: LANYARD_FPS,
            durationInFrames: LANYARD_DURATION_IN_FRAMES,
            config,
            mode: "capture",
          });
          return {
            canvas: renderer.canvas,
            drawFrame: renderer.drawFrame,
            dispose: renderer.dispose,
          };
        },
        width,
        height,
        fps: LANYARD_FPS,
        durationInFrames: LANYARD_DURATION_IN_FRAMES,
        filename: `lanyard-drop-${slugify(front?.name ?? "badge")}`,
        signal: controller.signal,
        onProgress: setProgress,
      });
      downloadBlob(result.blob, result.filename);
      setUpsell({ phase: "done", filename: result.filename });
      track("tool_video_exported", {
        tool: SLUG,
        sample: isSample,
        shape,
        style,
        aspect,
        width,
        height,
        hasBack: back !== null,
        format: result.blob.type === "video/webm" ? "webm" : "mp4",
        durationMs: Math.round(performance.now() - startedAt),
      });
      if (result.blob.type === "video/webm") {
        setExportError(
          "Your browser can't encode MP4, so this downloaded as a WebM. Chrome, Edge, or Safari will give you an MP4.",
        );
      }
    } catch (err) {
      const { ExportCancelled } = await import("@/lib/video-tools/render/common");
      if (err instanceof ExportCancelled) {
        // Cancelling is a decision to stop, not a moment to be pitched at.
        setUpsell(null);
      } else {
        console.error(err);
        setExportError(err instanceof Error ? err.message : "The export failed.");
        setUpsell({ phase: "error", filename: null });
      }
    } finally {
      setExporting(false);
      abortRef.current = null;
    }
  }, [aspect, back, config, exporting, front, height, isSample, shape, style, width]);

  return (
    <>
      <ToolShell wide title={tool.name} description={tool.description}>
        <div className="flex flex-col gap-7">
          <div className="flex flex-col gap-4">
            <Chips
              label="Card shape"
              options={CARD_SHAPE_IDS.map((id) => ({
                value: id,
                label: CARD_SHAPES[id].label,
                title: CARD_SHAPES[id].hint,
              }))}
              value={shape}
              onChange={(value) => {
                setShape(value as CardShapeId);
                setShapeLocked(true);
              }}
            />
            <p className="text-[0.857rem] text-text-tertiary">
              {CARD_SHAPES[shape].hint}. Both faces are filled to this shape, so upload
              them at {CARD_SHAPES[shape].ratioLabel} and nothing gets cropped.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <CardFaceUpload
                label="Front of the card"
                art={front}
                shape={shape}
                error={faceError.front}
                onPick={(file) => void pick("front")(file)}
                onClear={() => clear("front")}
              />
              <CardFaceUpload
                label="Back of the card"
                optional
                art={back}
                shape={shape}
                error={faceError.back}
                onPick={(file) => void pick("back")(file)}
                onClear={() => clear("back")}
              />
            </div>
            <p className="text-[0.857rem] text-text-tertiary">
              Both images stay on your machine. They are read by the page and drawn
              straight onto the 3D card, so there is nothing to upload and nothing to
              delete afterwards. Leave the back empty and the card gets a plain one.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Chips
                label="Scene"
                options={LANYARD_STYLE_IDS.map((id) => ({
                  value: id,
                  label: LANYARD_STYLES[id].label,
                }))}
                value={style}
                onChange={(value) => {
                  const next = value as LanyardStyleId;
                  setStyle(next);
                  // The scene's own strap colour follows the scene until the
                  // visitor picks one, after which theirs wins.
                  if (!strapTouched) setStrap(LANYARD_STYLES[next].strap);
                }}
              />
              <Chips
                label="Size"
                options={ASPECT_KEYS.map((key) => ({ value: key, label: ASPECTS[key].label }))}
                value={aspect}
                onChange={(value) => setAspect(value as AspectKey)}
              />
            </div>
            <Chips
              label="Strap"
              options={STRAPS.map((option) => ({
                value: option.value,
                label: option.label,
                swatch: option.value,
              }))}
              value={strap}
              onChange={(value) => {
                setStrap(value);
                setStrapTouched(true);
              }}
            />

            {/* The stage takes the composition's own aspect ratio, with its
                width capped so a 9:16 preview stays inside the viewport. */}
            <div
              className="relative mx-auto w-full overflow-hidden rounded-xl border border-border bg-black"
              style={{
                aspectRatio: `${width} / ${height}`,
                maxWidth: `calc(65vh * ${width} / ${height})`,
              }}
            >
              <Player scenes={scenes} fps={LANYARD_FPS} width={width} height={height} />
              {isSample && (
                <span className="pointer-events-none absolute left-3 top-3 rounded border border-border-strong bg-background/80 px-2 py-1 text-[0.786rem] text-text-secondary">
                  Example badge, upload your own above
                </span>
              )}
            </div>

            {sceneError && (
              <p role="alert" className="text-[0.9rem] text-warning">
                {sceneError}
              </p>
            )}

            <Transport durationInFrames={LANYARD_DURATION_IN_FRAMES} fps={LANYARD_FPS} />
          </div>

          <div className="flex flex-col gap-2.5">
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="primary"
                onClick={() => void download()}
                disabled={!canExport || exporting}
                className="h-11 px-5"
              >
                {exporting ? `Rendering ${Math.round(progress * 100)}%` : "Download video"}
              </Button>
              {exporting && (
                <Button className="h-11 px-4" onClick={() => abortRef.current?.abort()}>
                  Cancel
                </Button>
              )}
              <span className="text-[0.857rem] text-text-tertiary">
                {LANYARD_DURATION_IN_FRAMES / LANYARD_FPS}s · {width}×{height} · MP4 · free, no sign-up
              </span>
            </div>

            {!canExport && (
              <p className="text-[0.9rem] text-text-secondary">
                Your browser can&apos;t encode video. The preview still works, so download
                in Chrome, Edge, or Safari 16.4+.
              </p>
            )}
            {exportError && (
              <p role="alert" className="text-[0.9rem] text-warning">
                {exportError}
              </p>
            )}
          </div>
        </div>
      </ToolShell>
      <ToolSections tool={tool} />
      <FaqSection items={tool.faqs} />
      <MoreTools current={tool.slug} />

      <UpsellModal
        open={upsell !== null}
        phase={upsell?.phase ?? "rendering"}
        progress={progress}
        error={exportError}
        filename={upsell?.filename ?? null}
        onClose={() => setUpsell(null)}
      />
    </>
  );
}
