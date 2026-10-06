import { create } from "zustand";
import { api } from "@/lib/api";
import type { TemplateSummary } from "@genmotion/templates/types";

/**
 * The template a prompt is about to be built from — the composer's chip.
 *
 * Picking a template never writes anything to disk. Remix is a download and a
 * project folder, and doing that the moment somebody hovers a gallery card (or
 * follows a link from the web site out of curiosity) leaves a litter of
 * projects nobody asked for. So the choice is held here, shown as a chip in
 * the start screen's composer, and the copy is made when that message is sent.
 *
 * A store rather than state in `Home`, because the pick arrives from two
 * places that cannot see each other: the gallery under the composer, and the
 * `genmotion://templates/<id>/remix` deep link, which lands in `App`.
 */
export interface PendingTemplate {
  id: string;
  title: string;
  /** API-relative, as every path in a template payload is. Absent until resolved. */
  posterPath: string | null;
  revision: string | null;
}

interface PendingTemplateState {
  template: PendingTemplate | null;
  /** From a gallery card, which already has the whole summary. */
  pick(template: TemplateSummary): void;
  /**
   * From a deep link, which carries only an id. The chip appears at once with
   * the id standing in for a title, and fills itself in when the catalog
   * answers; a template that no longer exists is dropped rather than left as a
   * chip that cannot be remixed.
   */
  pickById(id: string): void;
  clear(): void;
}

export const usePendingTemplateStore = create<PendingTemplateState>((set, get) => ({
  template: null,
  pick(template) {
    set({
      template: {
        id: template.id,
        title: template.title,
        posterPath: template.posterPath,
        revision: template.revision,
      },
    });
  },
  pickById(id) {
    set({ template: { id, title: id, posterPath: null, revision: null } });
    void api<TemplateSummary>(`/api/templates/${encodeURIComponent(id)}`)
      .then((summary) => {
        // Another pick may have landed while this was in flight; it wins.
        if (get().template?.id !== id) return;
        get().pick(summary);
      })
      .catch(() => {
        if (get().template?.id === id) set({ template: null });
      });
  },
  clear() {
    set({ template: null });
  },
}));
