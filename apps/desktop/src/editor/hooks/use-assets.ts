"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AssetData } from "@genmotion/shared";
import { API_URL, api } from "@/lib/api";

/** POST a file to the API with XHR so we get upload-progress events. */
function uploadWithProgress(
  url: string,
  file: File,
  onProgress: (percent: number) => void,
): Promise<AssetData> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.withCredentials = true; // send the better-auth session cookie
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText) as AssetData);
        } catch {
          reject(new Error("Malformed upload response"));
        }
        return;
      }
      let message = `Upload failed (${xhr.status})`;
      try {
        const parsed = JSON.parse(xhr.responseText);
        if (parsed?.error) message = parsed.error;
      } catch {
        /* keep default */
      }
      reject(new Error(message));
    };
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.send(file);
  });
}

/** Probe media dimensions/duration in the browser before completing the upload. */
async function probeMedia(
  file: File,
): Promise<{ width?: number; height?: number; durationSeconds?: number }> {
  const url = URL.createObjectURL(file);
  try {
    if (file.type.startsWith("image/")) {
      return await new Promise((resolve) => {
        const img = new Image();
        img.onload = () =>
          resolve({ width: img.naturalWidth, height: img.naturalHeight });
        img.onerror = () => resolve({});
        img.src = url;
      });
    }
    if (file.type.startsWith("video/")) {
      return await new Promise((resolve) => {
        const video = document.createElement("video");
        video.preload = "metadata";
        video.onloadedmetadata = () =>
          resolve({
            width: video.videoWidth,
            height: video.videoHeight,
            durationSeconds: video.duration,
          });
        video.onerror = () => resolve({});
        video.src = url;
      });
    }
    if (file.type.startsWith("audio/")) {
      return await new Promise((resolve) => {
        const audio = document.createElement("audio");
        audio.preload = "metadata";
        audio.onloadedmetadata = () =>
          resolve({ durationSeconds: audio.duration });
        audio.onerror = () => resolve({});
        audio.src = url;
      });
    }
    return {};
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Answers per URL, so dropping the same track twice probes it once. */
const urlDurations = new Map<string, number | null>();

/**
 * How long the audio at `url` actually runs, in seconds.
 *
 * The asset row usually knows already (`probeMedia` measured the file on the
 * way up), but anything that arrived without being uploaded from here — AI
 * generated music, an older asset — has no duration on it, and a clip placed
 * from one of those would otherwise fall back to a fixed default length. Only
 * metadata is fetched, not the samples.
 */
export async function probeAudioDurationFromUrl(
  url: string,
): Promise<number | null> {
  const cached = urlDurations.get(url);
  if (cached !== undefined) return cached;
  const duration = await new Promise<number | null>((resolve) => {
    const audio = document.createElement("audio");
    audio.preload = "metadata";
    audio.crossOrigin = "anonymous";
    // A stream with no known length reports Infinity; treat it as unknown
    // rather than handing a caller a clip an hour long.
    audio.onloadedmetadata = () =>
      resolve(Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : null);
    audio.onerror = () => resolve(null);
    audio.src = url;
  });
  urlDurations.set(url, duration);
  return duration;
}

/**
 * Probe + upload one file to a project, reporting progress. Standalone (not a
 * hook) so callers that manage their own per-file state — the chat composer
 * (pending chips) and the timeline (drop-to-place) — can track each upload.
 * Invalidate ["assets", projectId] yourself after success.
 */
export async function uploadProjectAsset(
  projectId: string,
  file: File,
  onProgress?: (percent: number) => void,
): Promise<AssetData> {
  const metadata = await probeMedia(file);
  const params = new URLSearchParams({ filename: file.name });
  if (projectId) params.set("projectId", projectId);
  if (metadata.width) params.set("width", String(metadata.width));
  if (metadata.height) params.set("height", String(metadata.height));
  if (metadata.durationSeconds != null) {
    params.set("durationSeconds", String(metadata.durationSeconds));
  }
  return uploadWithProgress(
    `${API_URL}/api/assets/upload?${params.toString()}`,
    file,
    onProgress ?? (() => {}),
  );
}

export function useProjectAssets(projectId: string) {
  return useQuery({
    queryKey: ["assets", projectId],
    queryFn: () => api<AssetData[]>(`/api/assets?projectId=${projectId}`),
  });
}

export function useDeleteAsset(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (assetId: string) =>
      api(`/api/assets/${assetId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets", projectId] });
    },
  });
}

export function useUploadAsset(projectId: string) {
  const queryClient = useQueryClient();
  // Percentage (0–100) of the current upload, or null when idle.
  const [progress, setProgress] = useState<number | null>(null);

  const mutation = useMutation({
    mutationFn: async (file: File) => {
      setProgress(0);
      // Upload through the API (browser → API → R2) so there's no browser↔R2
      // CORS to configure, and we can report real progress.
      return uploadProjectAsset(projectId, file, setProgress);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets", projectId] });
    },
    onSettled: () => setProgress(null),
  });

  return Object.assign(mutation, { progress });
}
