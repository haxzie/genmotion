"use client";

import { useState } from "react";
import { Spinner } from "@/components/ui";
import { ProjectPlayer } from "./project-player";
import { useAdminDetail } from "@/lib/admin/client";
import {
  formatBytes,
  formatDate,
  formatDateTime,
  formatDuration,
} from "@/lib/admin/format";
import type { ExportRow, ExportStatus, ProjectDetail } from "@/lib/admin/types";
import {
  Badge,
  Field,
  Panel,
  PersonRow,
  PlanBadge,
  Section,
  Sheet,
  StatGrid,
  useRetained,
} from "./sheet";

const IN_PROGRESS = new Set<ExportStatus>([
  "queued",
  "rendering",
  "encoding",
  "uploading",
]);

const STATUS_LABEL: Record<ExportStatus, string> = {
  queued: "Queued",
  rendering: "Rendering",
  encoding: "Encoding",
  uploading: "Uploading",
  done: "Done",
  failed: "Failed",
  cancelled: "Cancelled",
};

function statusTone(status: ExportStatus) {
  if (status === "done") return "green" as const;
  if (status === "failed") return "danger" as const;
  return "default" as const;
}

/**
 * One export attempt. A finished render gets a real player; anything else shows
 * why there is nothing to watch.
 *
 * The player is mounted only after the admin asks for it — a project can carry
 * dozens of exports, and mounting every <video> would fire a metadata request
 * for each one as soon as the panel opens.
 */
function ExportCard({ job }: { job: ExportRow }) {
  const [playing, setPlaying] = useState(false);
  const playable = job.status === "done" && Boolean(job.url);
  const active = IN_PROGRESS.has(job.status);

  return (
    <div className="rounded-lg border border-border p-3">
      <div className="flex items-center gap-2">
        <Badge tone={statusTone(job.status)}>{STATUS_LABEL[job.status]}</Badge>
        <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[0.68rem] uppercase text-text-tertiary">
          {job.format}
        </span>
        {job.watermark && <Badge>Watermark</Badge>}
        <span className="ml-auto shrink-0 text-[0.78rem] text-text-tertiary">
          {formatDate(job.completedAt ?? job.createdAt)}
        </span>
      </div>

      {active && (
        <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-raised">
          <div
            className="h-full bg-accent transition-all duration-500"
            style={{ width: `${Math.max(job.progress, 4)}%` }}
          />
        </div>
      )}

      {job.status === "failed" && job.error && (
        <p className="mt-2 text-[0.8rem] text-danger" title={job.error}>
          {job.error}
        </p>
      )}

      {playable && (
        <div className="mt-2.5">
          {playing ? (
            <video
              src={job.url!}
              controls
              autoPlay
              playsInline
              preload="metadata"
              className="aspect-video w-full rounded-md border border-border bg-black"
            />
          ) : (
            <button
              onClick={() => setPlaying(true)}
              className="flex aspect-video w-full items-center justify-center rounded-md border border-border bg-black/60 transition-colors hover:border-border-strong"
              aria-label="Play export"
            >
              <span className="flex size-11 items-center justify-center rounded-full bg-black/60 text-text-primary backdrop-blur-sm">
                <svg viewBox="0 0 24 24" className="ml-0.5 size-5" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </span>
            </button>
          )}
        </div>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.78rem] text-text-tertiary">
        {job.durationSeconds ? <span>{formatDuration(job.durationSeconds)}</span> : null}
        {job.sizeBytes ? <span>{formatBytes(job.sizeBytes)}</span> : null}
        <span>Quality {job.quality}</span>
        {job.url && (
          <a
            href={`${job.url}?download=1`}
            className="ml-auto text-text-secondary underline-offset-2 hover:text-text-primary hover:underline"
          >
            Download
          </a>
        )}
      </div>
    </div>
  );
}

export function ProjectSheet({ id, onClose }: { id: string | null; onClose: () => void }) {
  const shown = useRetained(id);
  const { data, isLoading, error } = useAdminDetail<ProjectDetail>(
    ["project", shown],
    shown ? `/projects/${shown}` : null,
  );

  return (
    <Sheet
      open={Boolean(id)}
      onClose={onClose}
      title={data?.name || "Project"}
      subtitle={data?.organization?.name ?? "No organisation"}
    >
      {!data ? (
        isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner className="size-5 text-text-tertiary" />
          </div>
        ) : (
          <p className="py-16 text-center text-[0.9rem] text-danger">
            {error instanceof Error ? error.message : "Couldn't load this project."}
          </p>
        )
      ) : (
        <>
          {/* Keyed by id so switching projects tears the player down rather
              than feeding new scenes to a running clock. */}
          <ProjectPlayer key={data.id} project={data} />

          <div className="mt-4">
            <StatGrid
              stats={[
                { label: "Duration", value: formatDuration(data.durationSeconds) },
                { label: "Messages", value: data.messageCount },
                { label: "Exports", value: data.exportCount },
              ]}
            />
          </div>

          <Section title="Details">
            <Panel>
              <Field label="Organisation">
                {data.organization ? (
                  <span className="inline-flex items-center gap-2">
                    {data.organization.name}
                    <PlanBadge
                      plan={data.organization.plan}
                      planName={data.organization.planName}
                    />
                  </span>
                ) : (
                  "—"
                )}
              </Field>
              <Field label="Resolution">
                {data.width}×{data.height} @ {data.fps}fps
              </Field>
              <Field label="Scenes">{data.sceneCount}</Field>
              <Field label="Created">{formatDateTime(data.createdAt)}</Field>
              <Field label="Updated">{formatDateTime(data.updatedAt)}</Field>
              <Field label="Project ID">
                <span className="font-mono text-[0.78rem]">{data.id}</span>
              </Field>
            </Panel>
          </Section>

          <Section title="Created by">
            <Panel>
              <PersonRow person={data.createdBy} />
            </Panel>
          </Section>

          <Section title="Exports" count={data.exports.length}>
            {data.exports.length ? (
              <div className="flex flex-col gap-2">
                {data.exports.map((job) => (
                  <ExportCard key={job.id} job={job} />
                ))}
              </div>
            ) : (
              <p className="text-[0.85rem] text-text-tertiary">No exports yet.</p>
            )}
          </Section>
        </>
      )}
    </Sheet>
  );
}
