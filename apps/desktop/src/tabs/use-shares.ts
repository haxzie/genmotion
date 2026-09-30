import { useEffect } from "react";
import { create } from "zustand";
import { api as http } from "@/lib/api";

/**
 * The account's shared videos, keyed by the export each came from.
 *
 * One store rather than a hook with its own state, because two surfaces show
 * this same fact at once: the Exports page and the popover in the tab strip.
 * With per-hook state, sharing from the popover left the page still offering
 * "Share" for a video that already had a link — the two lists had no way to
 * hear about each other.
 *
 * The list lives on the server, not on disk, because a share can be withdrawn
 * from the web app on another machine. A local copy would mean a row offering
 * a link that no longer resolves.
 */

export interface SharedVideo {
  id: string;
  slug: string;
  exportId: string | null;
  title: string;
  url: string;
  createdAt: string;
}

interface SharesState {
  byExport: Map<string, SharedVideo>;
  loaded: boolean;
  /** In flight, so several mounting components make one request between them. */
  inflight: Promise<void> | null;
  refresh: () => Promise<void>;
  remove: (share: SharedVideo) => Promise<void>;
}

export const useSharesStore = create<SharesState>((set, get) => ({
  byExport: new Map(),
  loaded: false,
  inflight: null,

  refresh: async () => {
    const existing = get().inflight;
    if (existing) return existing;

    const run = (async () => {
      // Signed out, or offline: the list is simply empty and every row falls
      // back to offering Share. Nothing here is worth an error banner over.
      const res = await http<{ items: SharedVideo[] }>("/api/share/list").catch(() => null);
      if (!res) {
        // A failure is not an empty list. `loaded` stays false so the next
        // mount tries again — without this, one dropped request at launch
        // leaves every row offering "Share" for videos that already have a
        // link, for the rest of the session.
        set({ inflight: null });
        return;
      }
      const byExport = new Map<string, SharedVideo>();
      for (const item of res.items) {
        if (item.exportId) byExport.set(item.exportId, item);
      }
      set({ byExport, loaded: true, inflight: null });
    })();

    set({ inflight: run });
    return run;
  },

  remove: async (share) => {
    await http(`/api/share/${encodeURIComponent(share.id)}`, { method: "DELETE" });
    await get().refresh();
  },
}));

/** Subscribe to the list, loading it once on first use. */
export function useShares() {
  const byExport = useSharesStore((s) => s.byExport);
  const loaded = useSharesStore((s) => s.loaded);
  const refresh = useSharesStore((s) => s.refresh);
  const remove = useSharesStore((s) => s.remove);

  useEffect(() => {
    if (!loaded) void refresh();
  }, [loaded, refresh]);

  return { byExport, loaded, refresh, remove };
}
