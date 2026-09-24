"use client";

import { useProjectFile } from "@/hooks/use-project-files";
import { API_URL } from "@/lib/api";
import { Spinner } from "@/components/ui";
import CodeBlock from "./code-block";

function formatBytes(n: number): string {
  if (!n) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|avif|svg)$/i;
const VIDEO_EXT = /\.(mp4|webm|mov|m4v)$/i;
const AUDIO_EXT = /\.(mp3|wav|m4a|aac|ogg|flac)$/i;

/**
 * Anything in the folder is reachable through the preview route — that is how
 * the composition loads its own assets — so a picture opened from the tree can
 * be shown without copying it anywhere.
 */
function fileUrl(projectId: string, path: string): string {
  return `${API_URL}/api/projects/${projectId}/preview/${path.split("/").map(encodeURIComponent).join("/")}`;
}

function Media({ projectId, path }: { projectId: string; path: string }) {
  const url = fileUrl(projectId, path);
  if (IMAGE_EXT.test(path)) {
    return <img src={url} alt={path} className="max-h-full max-w-full object-contain" />;
  }
  if (VIDEO_EXT.test(path)) {
    return <video src={url} controls className="max-h-full max-w-full" />;
  }
  if (AUDIO_EXT.test(path)) {
    return <audio src={url} controls className="w-full max-w-md" />;
  }
  return <p>There is nothing to show for this kind of file.</p>;
}

/** One file from the explorer, open as a document: its source, or its preview. */
export function FileDocument({ projectId, path }: { projectId: string; path: string }) {
  const { data, isLoading, error } = useProjectFile(projectId, path);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-10 shrink-0 items-center justify-between gap-3 border-b border-border px-3">
        <span className="truncate text-[0.857rem] text-text-secondary" title={path}>
          {path}
        </span>
        {data?.sizeBytes ? (
          <span className="shrink-0 text-[0.786rem] text-text-tertiary">
            {formatBytes(data.sizeBytes)}
          </span>
        ) : null}
      </div>
      <div className="flex min-h-0 flex-1 flex-col">
        {isLoading ? (
          <div className="flex flex-1 items-center justify-center">
            <Spinner />
          </div>
        ) : error ? (
          <div className="flex flex-1 items-center justify-center px-6 text-center text-text-tertiary">
            {error instanceof Error ? error.message : "This file can't be read."}
          </div>
        ) : data?.code !== null && data?.code !== undefined ? (
          <CodeBlock code={data.code} fill language={data.language} />
        ) : (
          <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-[#0b0b0d] p-6 text-center text-text-tertiary">
            {data?.reason === "too-large" ? (
              <p>This file is too large to show here.</p>
            ) : (
              <Media projectId={projectId} path={path} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
