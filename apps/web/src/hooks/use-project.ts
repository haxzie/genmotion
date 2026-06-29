"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ProjectData, SceneData } from "@genmotion/shared";
import { api } from "@/lib/api";

export function projectQueryKey(projectId: string) {
  return ["project", projectId] as const;
}

export function useProject(projectId: string) {
  return useQuery({
    queryKey: projectQueryKey(projectId),
    queryFn: () => api<ProjectData>(`/api/projects/${projectId}`),
  });
}

export function useProjectMutations(projectId: string) {
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: projectQueryKey(projectId) });

  const renameProject = useMutation({
    mutationFn: (name: string) =>
      api(`/api/projects/${projectId}`, { method: "PATCH", json: { name } }),
    onSuccess: invalidate,
  });

  const reorderScenes = useMutation({
    mutationFn: (orderedSceneIds: string[]) =>
      api(`/api/projects/${projectId}/scenes/reorder`, {
        method: "PATCH",
        json: { orderedSceneIds },
      }),
    onMutate: async (orderedSceneIds) => {
      // Optimistic: reorder the cached scenes immediately so the drop doesn't snap back.
      await queryClient.cancelQueries({ queryKey: projectQueryKey(projectId) });
      const previous = queryClient.getQueryData<ProjectData>(
        projectQueryKey(projectId),
      );
      if (previous) {
        const byId = new Map(previous.scenes.map((s) => [s.id, s]));
        const scenes = orderedSceneIds
          .map((id) => byId.get(id))
          .filter((s): s is SceneData => !!s);
        queryClient.setQueryData(projectQueryKey(projectId), {
          ...previous,
          scenes,
        });
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(projectQueryKey(projectId), context.previous);
      }
    },
    onSettled: invalidate,
  });

  const deleteScene = useMutation({
    mutationFn: (sceneId: string) =>
      api(`/api/projects/${projectId}/scenes/${sceneId}`, {
        method: "DELETE",
      }),
    onSuccess: invalidate,
  });

  const updateScene = useMutation({
    mutationFn: ({
      sceneId,
      ...patch
    }: {
      sceneId: string;
      name?: string;
      durationInFrames?: number;
      audioVolume?: number;
    }) =>
      api(`/api/projects/${projectId}/scenes/${sceneId}`, {
        method: "PATCH",
        json: patch,
      }),
    onSuccess: invalidate,
  });

  return { renameProject, reorderScenes, deleteScene, updateScene, invalidate };
}
