import { create } from "zustand";
import type { BrandSummary } from "@genmotion/shared";

/**
 * The brand the next video will be made for, before that video exists.
 *
 * The start screen has no project to attach anything to, and attaching one the
 * moment somebody opens the picker to look at the list would record a brand
 * against a project they never created. So the choice is held here and the
 * create call carries it, the same way `pending-template-store` holds a
 * template until the message is sent.
 *
 * It outlives the message deliberately: somebody making three videos for one
 * company should not re-pick the brand three times. It is cleared when they
 * pick "No brand", not when a project opens.
 */
interface PendingBrandState {
  brand: BrandSummary | null;
  pick(brand: BrandSummary): void;
  clear(): void;
}

export const usePendingBrandStore = create<PendingBrandState>((set) => ({
  brand: null,
  pick(brand) {
    set({ brand });
  },
  clear() {
    set({ brand: null });
  },
}));
