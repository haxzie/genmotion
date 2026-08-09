"use client";

/**
 * Dev harness for the free video generators: preview a template against sample
 * data and export it, with per-stage timings printed to the console.
 *
 * Kept out of the marketing routes on purpose — /dev is not in the sitemap and
 * is disallowed for crawlers. This is where to check rasterization fidelity and
 * frame-loop cost after touching a template or the render pipeline.
 */

import { useCallback, useMemo, useRef, useState } from "react";
import { Player, usePlaybackStore } from "@genmotion/player";
import { Button } from "@/components/ui";
import { ASPECTS, DURATION_IN_FRAMES, FPS, type AspectKey } from "@/lib/video-tools/types";
import { TEMPLATES } from "@/lib/video-tools/templates";
import { SAMPLES } from "@/lib/video-tools/samples";
import type { TemplateId } from "@/lib/video-tools/templates/types";

export default function VideoToolsDevPage() {
  const [templateId, setTemplateId] = useState<TemplateId>("count-up");
  const [sampleKey, setSampleKey] = useState<keyof typeof SAMPLES>("github-stars");
  const [aspect, setAspect] = useState<AspectKey>("landscape");
  const [status, setStatus] = useState("idle");
  const abortRef = useRef<AbortController | null>(null);

  const data = SAMPLES[sampleKey];
  const template = TEMPLATES[templateId];
  const { width, height } = ASPECTS[aspect];

  const scenes = useMemo(() => {
    const Scene = template.Scene;
    return [
      {
        id: "preview",
        name: template.name,
        durationInFrames: DURATION_IN_FRAMES,
        component: () => <Scene data={data} />,
      },
    ];
  }, [template, data]);

  const runExport = useCallback(async () => {
    const controller = new AbortController();
    abortRef.current = controller;
    const Scene = template.Scene;
    const started = performance.now();
    setStatus("starting…");

    try {
      const { exportVideo, downloadBlob } = await import("@/lib/video-tools/render/export-video");
      let firstFrameAt = 0;
      const result = await exportVideo({
        scene: () => <Scene data={data} />,
        width,
        height,
        fps: FPS,
        durationInFrames: DURATION_IN_FRAMES,
        filename: `${sampleKey}-${templateId}`,
        signal: controller.signal,
        onProgress: (p) => {
          if (!firstFrameAt) {
            firstFrameAt = performance.now();
            console.log(`setup: ${(firstFrameAt - started).toFixed(0)}ms`);
          }
          setStatus(`${Math.round(p * 100)}%`);
        },
      });

      const total = performance.now() - started;
      const loop = performance.now() - firstFrameAt;
      console.log(
        `total ${total.toFixed(0)}ms · frame loop ${loop.toFixed(0)}ms · ` +
          `${(loop / DURATION_IN_FRAMES).toFixed(1)}ms/frame · ` +
          `${(result.blob.size / 1e6).toFixed(2)}MB · ${result.filename}`,
      );
      setStatus(`done in ${(total / 1000).toFixed(1)}s — ${result.filename}`);
      downloadBlob(result.blob, result.filename);
    } catch (error) {
      console.error(error);
      setStatus(`failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      abortRef.current = null;
    }
  }, [template, data, width, height, sampleKey, templateId]);

  return (
    <main className="flex h-screen flex-col bg-background">
      <div className="flex flex-wrap items-center gap-3 border-b border-border p-4 text-[0.9rem]">
        <select
          value={templateId}
          onChange={(e) => setTemplateId(e.target.value as TemplateId)}
          className="rounded-md border border-border bg-surface px-2 py-1"
        >
          {Object.values(TEMPLATES).map((t) => (
            <option key={t.id} value={t.id} disabled={!t.supports(data)}>
              {t.name}
              {t.supports(data) ? "" : " (unsupported)"}
            </option>
          ))}
        </select>

        <select
          value={sampleKey}
          onChange={(e) => setSampleKey(e.target.value as keyof typeof SAMPLES)}
          className="rounded-md border border-border bg-surface px-2 py-1"
        >
          {Object.keys(SAMPLES).map((k) => (
            <option key={k} value={k}>{k}</option>
          ))}
        </select>

        <select
          value={aspect}
          onChange={(e) => setAspect(e.target.value as AspectKey)}
          className="rounded-md border border-border bg-surface px-2 py-1"
        >
          {Object.entries(ASPECTS).map(([key, a]) => (
            <option key={key} value={key}>{a.label} · {a.width}×{a.height}</option>
          ))}
        </select>

        <Button size="sm" variant="primary" onClick={runExport}>Export</Button>
        <Button size="sm" onClick={() => abortRef.current?.abort()}>Cancel</Button>
        <span className="font-mono text-text-secondary">{status}</span>
      </div>

      <div className="min-h-0 flex-1 p-6">
        <Player scenes={scenes} fps={FPS} width={width} height={height} />
      </div>

      <Transport />
    </main>
  );
}

function Transport() {
  const frame = usePlaybackStore((s) => s.frame);
  const isPlaying = usePlaybackStore((s) => s.isPlaying);
  const totalFrames = usePlaybackStore((s) => s.totalFrames);
  const toggle = usePlaybackStore((s) => s.toggle);
  const seek = usePlaybackStore((s) => s.seek);

  return (
    <div className="flex items-center gap-4 border-t border-border bg-surface px-4 py-3">
      <Button variant="primary" size="sm" onClick={toggle}>
        {isPlaying ? "Pause" : "Play"}
      </Button>
      <input
        type="range"
        min={0}
        max={Math.max(0, totalFrames - 1)}
        value={frame}
        onChange={(e) => seek(Number(e.target.value))}
        className="flex-1 accent-accent"
      />
      <span className="w-20 text-right font-mono text-text-secondary">{frame}</span>
    </div>
  );
}
