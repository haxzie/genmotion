"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AssetData } from "@genmotion/shared";
import { api } from "@/lib/api";

interface PresignResponse {
  uploadUrl: string;
  asset: AssetData & { id: string };
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

export function useUploadAsset(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      const { uploadUrl, asset } = await api<PresignResponse>(
        "/api/assets/presign",
        {
          json: {
            filename: file.name,
            contentType: file.type,
            sizeBytes: file.size,
            projectId,
          },
        },
      );

      const put = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!put.ok) {
        throw new Error(`Upload failed (${put.status})`);
      }

      const metadata = await probeMedia(file);
      return api<AssetData>(`/api/assets/${asset.id}/complete`, {
        json: metadata,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets", projectId] });
    },
  });
}
