import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

/**
 * Which harness drives the chat, and on what model.
 *
 * A property of the machine rather than of a project, so it is served above the
 * loopback server's "no project is open" gate and read from two places: the
 * composer's compact picker, and the Settings screen's expanded list.
 */

export type HarnessId = "claude-code" | "codex";

/** Mirrors the Claude Agent SDK's named reasoning-effort levels. */
export type EffortLevel = "low" | "medium" | "high" | "xhigh" | "max";

export const EFFORT_LEVELS: EffortLevel[] = ["low", "medium", "high", "xhigh", "max"];

export interface HarnessOption {
  id: HarnessId;
  label: string;
  installed: boolean;
  version: string | null;
  supported: boolean;
  unavailableReason: string | null;
}

export interface AgentModel {
  id: string;
  /**
   * The harness's own name for the model — "Opus 5.5", never an alias we
   * coined. See electron/agent/models.ts: a row that can't be named honestly
   * is the "Default" row instead, and the harness is listed in `modelsUnread`.
   */
  label: string;
  version: string | null;
  detail: string;
  harness: HarnessId;
}

export interface HarnessState {
  active: HarnessId;
  activeModel: string | null;
  activeEffort: EffortLevel;
  options: HarnessOption[];
  models: AgentModel[];
  /** Harnesses whose model list couldn't be read, so their rows may be stale. */
  modelsUnread: HarnessId[];
}

export const harnessKey = ["harness"] as const;

export function useHarness() {
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: harnessKey,
    queryFn: () => api<HarnessState>("/api/agents"),
    staleTime: 30_000,
  });

  const choose = useMutation({
    mutationFn: (model: AgentModel) =>
      api<HarnessState>("/api/agents", { json: { id: model.harness, model: model.id } }),
    onSuccess: (next) => queryClient.setQueryData(harnessKey, next),
  });

  // The picker's Retry. A plain refetch would be served from the main
  // process's cache, which is the thing the user is telling us is wrong, so
  // this asks the harnesses again.
  const refresh = useMutation({
    mutationFn: () => api<HarnessState>("/api/agents?refresh=1"),
    onSuccess: (next) => queryClient.setQueryData(harnessKey, next),
  });

  const setEffort = useMutation({
    mutationFn: (effort: EffortLevel) =>
      api<HarnessState>("/api/agents", {
        json: { id: data?.active, model: data?.activeModel, effort },
      }),
    onSuccess: (next) => queryClient.setQueryData(harnessKey, next),
  });

  /** Re-read the cached state — cheap, and picks up a background refresh. */
  const recheck = () => void queryClient.invalidateQueries({ queryKey: harnessKey });

  return { state: data, choose, setEffort, refresh, recheck };
}
