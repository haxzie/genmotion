import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { api as desktop } from "../api";
import type { McpServerInput, McpServerPatch, McpServerView } from "@genmotion/shared";

/**
 * The user's MCP servers, as the main process last saw them.
 *
 * A property of the machine, like the harness, and read from three places:
 * the marketplace's list, its catalog cards (to say "connected" on one), and
 * the composer's `+` menu.
 *
 * The main process pushes whenever a server's configuration or reachability
 * changes, and that is what the rows actually follow. The poll underneath is
 * a backstop: the push is the only thing that works for the case that matters
 * most — an OAuth redirect landing while the app is behind the browser, where
 * react-query holds its interval because Chromium calls the window hidden.
 */

export const mcpServersKey = ["mcp-servers"] as const;

interface ServersResponse {
  servers: McpServerView[];
}

function settling(servers: McpServerView[] | undefined): boolean {
  return (servers ?? []).some((s) => s.status === "connecting" || s.status === "needs-auth");
}

export function useMcpServers() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: mcpServersKey,
    queryFn: () => api<ServersResponse>("/api/mcp-servers"),
    // Fast while something is in flight or a browser tab is open for it;
    // otherwise a slow heartbeat, since a server can go away on its own.
    refetchInterval: (q) => (settling(q.state.data?.servers) ? 1500 : 30_000),
    // A sign-in finishes in another application, so the window being behind
    // one is the normal case rather than a reason to stop watching.
    refetchIntervalInBackground: true,
    staleTime: 1000,
  });

  // The main process says only that something moved; the list itself comes
  // from the loopback, which is where `McpServerView` is built.
  useEffect(
    () => desktop.onMcpChanged(() => void queryClient.invalidateQueries({ queryKey: mcpServersKey })),
    [queryClient],
  );

  const put = (server: McpServerView) =>
    queryClient.setQueryData<ServersResponse>(mcpServersKey, (current) => {
      const servers = current?.servers ?? [];
      const index = servers.findIndex((s) => s.id === server.id);
      return {
        servers: index === -1 ? [...servers, server] : servers.map((s) => (s.id === server.id ? server : s)),
      };
    });

  const add = useMutation({
    mutationFn: (input: McpServerInput) => api<McpServerView>("/api/mcp-servers", { json: input }),
    onSuccess: put,
  });

  const update = useMutation({
    mutationFn: ({ id, ...patch }: { id: string } & McpServerPatch) =>
      api<McpServerView>(`/api/mcp-servers/${encodeURIComponent(id)}`, { method: "PATCH", json: patch }),
    onSuccess: put,
  });

  const remove = useMutation({
    mutationFn: (id: string) =>
      api<{ ok: true }>(`/api/mcp-servers/${encodeURIComponent(id)}`, { method: "DELETE" }),
    onSuccess: (_result, id) =>
      queryClient.setQueryData<ServersResponse>(mcpServersKey, (current) => ({
        servers: (current?.servers ?? []).filter((s) => s.id !== id),
      })),
  });

  const refresh = useMutation({
    mutationFn: (id: string) =>
      api<McpServerView>(`/api/mcp-servers/${encodeURIComponent(id)}/refresh`, { method: "POST" }),
    onSuccess: put,
  });

  const authenticate = useMutation({
    mutationFn: (id: string) =>
      api<McpServerView>(`/api/mcp-servers/${encodeURIComponent(id)}/auth`, { method: "POST" }),
    onSuccess: put,
  });

  return {
    servers: query.data?.servers,
    isLoading: query.isLoading,
    error: query.error,
    add,
    update,
    remove,
    refresh,
    authenticate,
  };
}

/** Enabled and reachable — what the composer can offer. */
export function connectedServers(servers: McpServerView[] | undefined): McpServerView[] {
  return (servers ?? []).filter((s) => s.enabled && s.status === "connected");
}
