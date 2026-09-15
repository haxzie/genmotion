import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { McpCatalog } from "@genmotion/shared";

/**
 * The marketplace's catalog, from the hosted API by way of the loopback
 * proxy. Changes on deploy, not while you look at it.
 */
export function useMcpCatalog() {
  return useQuery({
    queryKey: ["mcp-catalog"],
    queryFn: () => api<McpCatalog>("/api/mcp-catalog"),
    staleTime: 5 * 60 * 1000,
  });
}
