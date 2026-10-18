import type { BrandManifest } from "@genmotion/shared";

/**
 * The attached brand, in the shape the prompt needs it.
 *
 * A type of its own, in a module with no Electron or filesystem imports, so
 * `agent/prompt.ts` stays a pure text builder: it is the one file in the agent
 * folder that is only strings in and a string out, and the tests of it benefit
 * from that staying true.
 */
export interface BrandPrompt {
  manifest: BrandManifest;
  /** Absolute path to the brand folder, which the agent may read. */
  dir: string;
  /** Logo files already copied into the project, as project-relative paths. */
  logos: string[];
  /** `components/brand.ts` was the project's own, so it was not rewritten. */
  moduleSkipped?: boolean;
}
