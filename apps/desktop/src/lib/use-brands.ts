import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { BrandInspection, BrandSummary } from "@genmotion/shared";
import type { AcceptedInspection, BrandDetail } from "../../electron/brands/service";

/**
 * The brands on this machine.
 *
 * A property of the machine, like the harness and the MCP servers, and read
 * from three places: the Brands tab, the start screen's chip picker, and the
 * composer's brand control inside the editor.
 *
 * No push channel and no poll, unlike `use-mcp-servers`: nothing in the main
 * process changes a brand on its own. Every mutation starts in this renderer,
 * so invalidating on success is the whole story — and a brand edited in Finder
 * is picked up the next time the list is fetched, which is the next time
 * somebody looks at it.
 */

export const brandsKey = ["brands"] as const;
export const brandKey = (id: string) => ["brand", id] as const;
/** Keyed by project, because each open tab has its own brand. */
export const attachedBrandKey = (projectId: string | null) => ["attached-brand", projectId] as const;

interface BrandsResponse {
  brands: BrandSummary[];
}

export function useBrands() {
  return useQuery({
    queryKey: brandsKey,
    queryFn: () => api<BrandsResponse>("/api/brands"),
    staleTime: 5_000,
    select: (data) => data.brands,
  });
}

export function useBrand(id: string | null) {
  return useQuery({
    queryKey: brandKey(id ?? ""),
    queryFn: () => api<BrandDetail>(`/api/brands/${encodeURIComponent(id!)}`),
    enabled: id !== null,
  });
}

/** One place to invalidate from, so a change is never half-reflected. */
function useRefresh() {
  const queryClient = useQueryClient();
  return (detail?: BrandDetail) => {
    if (detail) queryClient.setQueryData(brandKey(detail.id), detail);
    void queryClient.invalidateQueries({ queryKey: brandsKey });
    // A brand's values are also in `components/brand.ts`, which the main
    // process rewrites for every open project using it: the code view and the
    // preview follow the file watcher, so there is nothing to invalidate here.
    void queryClient.invalidateQueries({ queryKey: ["attached-brand"] });
  };
}

export function useBrandMutations() {
  const refresh = useRefresh();

  /**
   * Everything the import dialog collected, in one request.
   *
   * Create-then-patch would leave a brand with a name and nothing else behind
   * whenever the second call failed, and the list cannot tell that apart from
   * a finished one.
   */
  const create = useMutation({
    mutationFn: (input: {
      name: string;
      site?: string;
      description?: string;
      thirdParty?: boolean;
      accepted?: AcceptedInspection;
    }) => api<BrandDetail>("/api/brands", { json: input }),
    onSuccess: refresh,
  });

  const save = useMutation({
    mutationFn: ({ id, ...patch }: { id: string } & Partial<BrandSummary>) =>
      api<BrandDetail>(`/api/brands/${encodeURIComponent(id)}`, { method: "PATCH", json: patch }),
    onSuccess: refresh,
  });

  const remove = useMutation({
    mutationFn: (id: string) =>
      api<{ ok: true }>(`/api/brands/${encodeURIComponent(id)}`, { method: "DELETE" }),
    onSuccess: () => refresh(),
  });

  const removeAsset = useMutation({
    mutationFn: ({ id, file }: { id: string; file: string }) =>
      api<BrandDetail>(
        `/api/brands/${encodeURIComponent(id)}/assets?file=${encodeURIComponent(file)}`,
        { method: "DELETE" },
      ),
    onSuccess: refresh,
  });

  const reveal = useMutation({
    mutationFn: (id: string) =>
      api<{ ok: true }>(`/api/brands/${encodeURIComponent(id)}/reveal`, { json: {} }),
  });

  /**
   * Read a site and report what it looks like the brand is. Writes nothing.
   *
   * The reading happens on our API, against Firecrawl: that key is billable,
   * so it is not in this build.
   */
  const inspect = useMutation({
    mutationFn: (site: string) => api<BrandInspection>("/api/brands/inspect", { json: { site } }),
  });

  return { create, save, remove, removeAsset, reveal, inspect };
}

/**
 * Upload a file into one of a brand's folders.
 *
 * Streamed as a raw body rather than multipart, matching the project asset
 * upload: the filename and the destination travel in the query string so the
 * main process can write the bytes straight to disk without buffering a
 * reference video in memory first.
 */
export function useBrandUpload() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: async ({ id, dir, file }: { id: string; dir: string; file: File }) => {
      const search = new URLSearchParams({ dir, filename: file.name });
      return api<BrandDetail>(
        `/api/brands/${encodeURIComponent(id)}/assets?${search.toString()}`,
        { method: "POST", body: file, headers: { "content-type": file.type || "application/octet-stream" } },
      );
    },
    onSuccess: refresh,
  });
}

/** Which brand a project is being made for, and the control to change it. */
export function useAttachedBrand(projectId: string | null) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: attachedBrandKey(projectId),
    queryFn: () => api<{ brand: BrandSummary | null }>(`/api/brands/attached?projectId=${encodeURIComponent(projectId!)}`),
    enabled: projectId !== null,
  });

  const attach = useMutation({
    mutationFn: (brandId: string | null) =>
      api<{ brand: BrandSummary | null; moduleSkipped?: boolean }>(
        `/api/brands/attach?projectId=${encodeURIComponent(projectId!)}`,
        { json: { brandId } },
      ),
    onSuccess: (result) => {
      queryClient.setQueryData(attachedBrandKey(projectId), { brand: result.brand });
      void queryClient.invalidateQueries({ queryKey: brandsKey });
    },
  });

  return { brand: query.data?.brand ?? null, isLoading: query.isLoading, attach };
}
