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
  label: string;
  version: string | null;
  detail: string;
  harness: HarnessId;
}

export interface HarnessState {
  active: HarnessId;
  activeModel: string | null;
  options: HarnessOption[];
  models: AgentModel[];
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

  return { state: data, choose };
}
