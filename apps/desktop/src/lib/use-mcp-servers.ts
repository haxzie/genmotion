import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { McpServerInput, McpServerPatch, McpServerView } from "@genmotion/shared";

/**
 * The user's MCP servers, as the main process last saw them.
 *
 * A property of the machine, like the harness, and read from three places:
 * the marketplace's list, its catalog cards (to say "connected" on one), and
 * the composer's `+` menu. Polled while any server is being probed — a probe
 * ends in the main process, and this is how the row finds out.
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
    staleTime: 1000,
  });

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
