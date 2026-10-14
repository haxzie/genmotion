"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Player, defaultPlaybackStore } from "@genmotion/player";
import { FaqSection } from "@/components/marketing/faq";
import { ToolShell } from "@/components/marketing/tool-shell";
import { MoreTools, ToolSections } from "@/components/marketing/tool-sections";
import { Button, Spinner } from "@/components/ui";
import { Chips, Transport } from "@/components/tools/tool-controls";
import { UpsellModal, type ExportPhase } from "@/components/tools/upsell-modal";
import { track } from "@/lib/analytics";
import { getTool } from "@/lib/marketing/tools";
import { slugify } from "@/lib/video-tools/filename";
import { getGenerator } from "@/lib/video-tools/registry";
import { SAMPLES } from "@/lib/video-tools/samples";
import { usableTemplates } from "@/lib/video-tools/templates";
import type { TemplateId } from "@/lib/video-tools/templates/types";
import {
  ASPECTS,
  ASPECT_KEYS,
  DURATION_IN_FRAMES,
  FPS,
  type AspectKey,
  type MetricVideoData,
} from "@/lib/video-tools/types";

/**
 * The one component behind every free video generator page.
 *
 * A page supplies only its slug; everything else — input copy, which templates
 * are offered, which endpoint to call — comes from the registry, so adding a
 * generator needs no new UI.
 */
export function VideoTool({ slug }: { slug: string }) {
  const generator = getGenerator(slug);
  const tool = getTool(slug)!;

  const [query, setQuery] = useState("");
  const [data, setData] = useState<MetricVideoData>(SAMPLES[generator.source]);
  const [isSample, setIsSample] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [templateId, setTemplateId] = useState<TemplateId>(generator.templates[0]!);
  const [aspect, setAspect] = useState<AspectKey>("landscape");

  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [exportError, setExportError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [upsell, setUpsell] = useState<{ phase: ExportPhase; filename: string | null } | null>(null);

  // Coarse capability gate. The precise codec check needs mediabunny, which we
  // don't want in the page bundle, so that runs on click instead.
  const [canExport, setCanExport] = useState(true);
  useEffect(() => {
    setCanExport(typeof window !== "undefined" && "VideoEncoder" in window);
  }, []);

  const available = useMemo(
    () => usableTemplates(generator.templates, data),
    [generator.templates, data],
  );
  const template = available.find((t) => t.id === templateId) ?? available[0]!;
  // The chosen style can stop being offered when live data arrives — the chart
  // needs a history the source may not have. Say so rather than silently
  // swapping the preview out from under the visitor.
  const fellBack = templateId !== template.id;
  const { width, height } = ASPECTS[aspect];

  const scenes = useMemo(() => {
    const Scene = template.Scene;
    return [
      {
        id: "tool",
        name: template.name,
        durationInFrames: DURATION_IN_FRAMES,
        component: () => <Scene data={data} />,
      },
    ];
  }, [template, data]);

  const lookup = useCallback(
    async (raw: string) => {
      const trimmed = raw.trim();
      if (!trimmed || loading) return;

      setLoading(true);
      setError(null);
      setExportError(null);
      try {
        const response = await fetch(
          `/api/tools/${generator.slug}?q=${encodeURIComponent(trimmed)}`,
        );
        const body = (await response.json()) as MetricVideoData | { error: string };
        if (!response.ok) {
          setError("error" in body ? body.error : "Something went wrong.");
          return;
        }
        const live = body as MetricVideoData;
        setData(live);
        setIsSample(false);
        track("tool_video_generated", {
          tool: generator.slug,
          source: live.source,
          query: trimmed,
          title: live.title,
          value: live.value,
          hasSeries: (live.series?.length ?? 0) >= 2,
          template: template.id,
          aspect,
        });
        // Restart the preview so the visitor sees the animation for their data.
        // This page has one player on the default clock, so it is addressed
        // directly rather than through a provider.
        defaultPlaybackStore.getState().seek(0);
        defaultPlaybackStore.setState({ isPlaying: true });
      } catch {
        setError("Couldn't reach the server. Check your connection and try again.");
      } finally {
        setLoading(false);
      }
    },
    [aspect, generator.slug, loading, template.id],
  );

  const download = useCallback(async () => {
    if (exporting) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setExporting(true);
    setProgress(0);
    setExportError(null);
    setUpsell({ phase: "rendering", filename: null });

    const Scene = template.Scene;
    const startedAt = performance.now();
    try {
      const { exportVideo, downloadBlob } = await import(
        "@/lib/video-tools/render/export-video"
      );
      const result = await exportVideo({
        scene: () => <Scene data={data} />,
        width,
        height,
        fps: FPS,
        durationInFrames: DURATION_IN_FRAMES,
        filename: `${generator.slug}-${slugify(data.title)}`,
        signal: controller.signal,
        onProgress: setProgress,
      });
      downloadBlob(result.blob, result.filename);
      setUpsell({ phase: "done", filename: result.filename });
      track("tool_video_exported", {
        tool: generator.slug,
        source: data.source,
        title: data.title,
        // Whether they exported the example or their own lookup.
        sample: isSample,
        template: template.id,
        aspect,
        width,
        height,
        format: result.blob.type === "video/webm" ? "webm" : "mp4",
        durationMs: Math.round(performance.now() - startedAt),
      });
      if (result.blob.type === "video/webm") {
        setExportError(
          "Your browser can't encode MP4, so this downloaded as a WebM. Chrome, Edge, or Safari will give you an MP4.",
        );
      }
    } catch (err) {
      const { ExportCancelled } = await import("@/lib/video-tools/render/export-video");
      if (err instanceof ExportCancelled) {
        // Cancelling is a decision to stop, not a moment to be pitched at.
        setUpsell(null);
      } else {
        console.error(err);
        const message = err instanceof Error ? err.message : "The export failed.";
        setExportError(message);
        setUpsell({ phase: "error", filename: null });
      }
    } finally {
      setExporting(false);
      abortRef.current = null;
    }
  }, [aspect, data, exporting, generator.slug, height, isSample, template, width]);

  return (
    <>
      <ToolShell wide title={tool.name} description={tool.description}>
        <div className="flex flex-col gap-7">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void lookup(query);
            }}
            className="flex flex-col gap-2.5"
          >
            <label
              htmlFor="video-tool-input"
              className="text-[0.857rem] text-text-secondary"
            >
              {generator.inputLabel}
            </label>
            <div className="flex gap-2.5">
              <input
                id="video-tool-input"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={generator.inputPlaceholder}
                autoComplete="off"
                spellCheck={false}
                className="h-11 flex-1 rounded-md border border-border bg-surface px-3.5 text-text-primary outline-none transition-colors duration-150 placeholder:text-text-tertiary focus:border-accent/60 focus:ring-2 focus:ring-accent/20"
              />
              <Button
                type="submit"
                variant="primary"
                disabled={loading || !query.trim()}
                className="h-11 px-5"
              >
                {loading ? <Spinner /> : "Generate"}
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[0.857rem] text-text-tertiary">
              <span>{generator.hint}</span>
              {generator.examples.map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => {
                    setQuery(example);
                    void lookup(example);
                  }}
                  className="rounded border border-border px-1.5 py-0.5 font-mono text-[0.786rem] transition-colors hover:border-border-strong hover:text-text-secondary"
                >
                  {example}
                </button>
              ))}
            </div>
            {error && (
              <p role="alert" className="text-[0.9rem] text-danger">
                {error}
              </p>
            )}
          </form>

          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Chips
                label="Style"
                options={available.map((t) => ({ value: t.id, label: t.name, Icon: t.Icon }))}
                value={template.id}
                onChange={(value) => setTemplateId(value as TemplateId)}
              />
              <Chips
                label="Size"
                options={ASPECT_KEYS.map((key) => ({ value: key, label: ASPECTS[key].label }))}
                value={aspect}
                onChange={(value) => setAspect(value as AspectKey)}
              />
            </div>

            {/* The stage takes the composition's own aspect ratio, with its
                width capped so a 9:16 preview stays inside the viewport rather
                than running off the bottom of the page. */}
            <div
              className="relative mx-auto w-full overflow-hidden rounded-xl border border-border bg-black"
              style={{
                aspectRatio: `${width} / ${height}`,
                maxWidth: `calc(65vh * ${width} / ${height})`,
              }}
            >
              <Player scenes={scenes} fps={FPS} width={width} height={height} />
              {isSample && (
                <span className="pointer-events-none absolute left-3 top-3 rounded border border-border-strong bg-background/80 px-2 py-1 text-[0.786rem] text-text-secondary">
                  Example — enter a {generator.inputLabel.toLowerCase()} above
                </span>
              )}
            </div>

            {fellBack && (
              <p className="text-[0.857rem] text-text-tertiary">
                Showing the {template.name} style — {data.title} doesn&apos;t have the
                data the other one needs.
              </p>
            )}

            <Transport />
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
                {DURATION_IN_FRAMES / FPS}s · {width}×{height} · MP4 · free, no sign-up
              </span>
            </div>

            {!canExport && (
              <p className="text-[0.9rem] text-text-secondary">
                Your browser can&apos;t encode video. The preview still works — download in
                Chrome, Edge, or Safari 16.4+.
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


