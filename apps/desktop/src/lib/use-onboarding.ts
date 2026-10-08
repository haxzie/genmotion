import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { harnessKey, type HarnessState } from "./use-harness";

/**
 * First-run onboarding: whether it still has to happen, and the one action
 * only it takes.
 *
 * The flag is a property of the machine, not of the account — what the
 * walkthrough sets up (the coding agent, the MCP servers) is stored on this
 * machine, so a second Mac has its own first run. `staleTime: Infinity`
 * because nothing changes it but the mutation below.
 */

export const onboardingKey = ["onboarding"] as const;

interface OnboardingState {
  completed: boolean;
}

interface InstallResponse {
  ok: boolean;
  error?: string;
  /** Re-detected after the install, so the row can say "Installed" at once. */
  harness: HarnessState;
}

export function useOnboarding() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: onboardingKey,
    queryFn: () => api<OnboardingState>("/api/onboarding"),
    staleTime: Infinity,
  });

  const complete = useMutation({
    mutationFn: () => api<OnboardingState>("/api/onboarding", { json: {} }),
    onSuccess: (next) => queryClient.setQueryData(onboardingKey, next),
  });

  /**
   * `npm install -g` the harness, in the main process.
   *
   * It answers with the freshly detected harness state, which goes straight
   * into the cache the picker and this screen both read — so the row flips to
   * "Installed" without a second round trip. A failure is returned rather than
   * thrown, because the row shows the reason next to the button that caused it.
   */
  const install = useMutation({
    mutationFn: (id: string) => api<InstallResponse>("/api/onboarding/install", { json: { id } }),
    onSuccess: (result) => queryClient.setQueryData(harnessKey, result.harness),
  });

  return { state: query.data, isLoading: query.isLoading, complete, install };
}
