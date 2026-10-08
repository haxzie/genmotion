/**
 * The coding agents onboarding offers, including the ones this build can't
 * drive yet.
 *
 * Separate from `registry.ts`'s `HarnessState`, which only ever lists
 * harnesses the chat can actually run on: this is the shop window, so it also
 * carries the ones we have announced but not wired up. Plain data with no
 * Electron or Node import, because the renderer imports it directly — the
 * rows are static, and a round trip for four names nobody can change is a
 * round trip for nothing. What *is* dynamic (installed, version) comes from
 * `/api/agents`.
 */

export interface HarnessCatalogEntry {
  /** Matches `HarnessId` for the two we drive; the others are their own slugs. */
  id: string;
  label: string;
  /** Shown under the name, and opened when there is nothing to install. */
  homepage: string;
  /**
   * What `npm install -g` installs. Null means we don't install it —
   * either because it isn't supported yet, or because npm isn't how it ships.
   */
  npmPackage: string | null;
  /** False while the chat can't run on it: the row says "Coming soon". */
  supported: boolean;
}

export const HARNESS_CATALOG: HarnessCatalogEntry[] = [
  {
    id: "claude-code",
    label: "Claude Code",
    homepage: "https://claude.com/product/claude-code",
    npmPackage: "@anthropic-ai/claude-code",
    supported: true,
  },
  {
    id: "codex",
    label: "OpenAI Codex",
    homepage: "https://openai.com/codex",
    npmPackage: "@openai/codex",
    supported: true,
  },
  {
    id: "opencode",
    label: "opencode",
    homepage: "https://opencode.ai",
    npmPackage: null,
    supported: false,
  },
  {
    id: "grok",
    label: "Grok CLI",
    homepage: "https://grok.com",
    npmPackage: null,
    supported: false,
  },
];

/** The ones we can install, by id — the only ids `installHarness` accepts. */
export function installableHarness(id: string): HarnessCatalogEntry | null {
  const entry = HARNESS_CATALOG.find((h) => h.id === id);
  return entry?.supported && entry.npmPackage ? entry : null;
}
