"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ProjectFileContent, ProjectFileNode } from "../../../electron/shared";

export function projectFilesKey(projectId: string) {
  return ["project-files", projectId] as const;
}

export function projectFileKey(projectId: string, filePath: string) {
  return ["project-file", projectId, filePath] as const;
}

/** The whole project folder as a tree. One request; see `readProjectTree`. */
export function useProjectFiles(projectId: string) {
  return useQuery({
    queryKey: projectFilesKey(projectId),
    queryFn: () => api<ProjectFileNode[]>(`/api/projects/${projectId}/files`),
  });
}

/**
 * One file's text. The watcher invalidates this on every folder change, so a
 * file the agent is writing updates under the tab while it works.
 */
export function useProjectFile(projectId: string, filePath: string | null) {
  return useQuery({
    queryKey: projectFileKey(projectId, filePath ?? ""),
    queryFn: () =>
      api<ProjectFileContent>(
        `/api/projects/${projectId}/file/${filePath!.split("/").map(encodeURIComponent).join("/")}`,
      ),
    enabled: Boolean(filePath),
  });
}
