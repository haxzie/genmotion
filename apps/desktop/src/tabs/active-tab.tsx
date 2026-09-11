import { createContext, useContext, type ReactNode } from "react";

/**
 * Whether the tab this subtree belongs to is the one in front.
 *
 * Every open project's editor stays mounted so its agent keeps streaming, so
 * the window has several editors at once — hidden, but alive. Anything they
 * hang on `window` (keyboard shortcuts, file drops) fires in all of them,
 * and that is a Delete key removing scenes in every project with a selection.
 * Handlers check this first. Defaults to true, so a lone editor with no tab
 * host around it behaves as before.
 */
const TabActiveContext = createContext(true);

export function TabActiveProvider({ active, children }: { active: boolean; children: ReactNode }) {
  return <TabActiveContext.Provider value={active}>{children}</TabActiveContext.Provider>;
}

export function useTabActive(): boolean {
  return useContext(TabActiveContext);
}
