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
      const metadata = await probeMedia(file);
      setProgress(0);

      const params = new URLSearchParams({ filename: file.name });
      if (projectId) params.set("projectId", projectId);
      if (metadata.width) params.set("width", String(metadata.width));
      if (metadata.height) params.set("height", String(metadata.height));
      if (metadata.durationSeconds != null) {
        params.set("durationSeconds", String(metadata.durationSeconds));
      }

      // Upload through the API (browser → API → R2) so there's no browser↔R2
      // CORS to configure, and we can report real progress.
      return uploadWithProgress(
        `${API_URL}/api/assets/upload?${params.toString()}`,
        file,
        setProgress,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets", projectId] });
    },
    onSettled: () => setProgress(null),
  });

  return Object.assign(mutation, { progress });
}
