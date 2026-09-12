import path from "node:path";
import fs from "node:fs/promises";
import { lintHyperframeHtml } from "@hyperframes/core/lint";
import { ENTRY_FILE } from "./compile";
import type { LintFinding, LintReport } from "./shared";

/** Sub-compositions are HTML files under here, mounted by `data-composition-src`. */
export const SCENES_DIR = "scenes";

/**
 * Run HyperFrames' own linter over a project's source files.
 *
 * The root is linted as a standalone composition, every `scenes/*.html` as a
 * sub-composition — the two have different rules (a sub-composition must wrap
 * its root in `<template>`, a root must not). Findings carry the file so an
 * agent knows where to look; the linter itself reports against the string it
 * was handed.
 */
export async function lintProject(projectDir: string): Promise<LintReport> {
  const files = [ENTRY_FILE, ...(await listScenes(projectDir))];
  const findings: LintFinding[] = [];

  for (const file of files) {
    const html = await fs.readFile(path.join(projectDir, file), "utf8").catch(() => null);
    if (html === null) continue;
    const result = await lintHyperframeHtml(html, {
      filePath: file,
      isSubComposition: file !== ENTRY_FILE,
    });
    for (const finding of result.findings) {
      findings.push({
        file,
        code: finding.code,
        severity: finding.severity,
        message: finding.message,
        ...(finding.fixHint ? { fixHint: finding.fixHint } : {}),
        ...(finding.selector ? { selector: finding.selector } : {}),
        ...(finding.elementId ? { elementId: finding.elementId } : {}),
      });
    }
  }

  const errorCount = findings.filter((f) => f.severity === "error").length;
  const warningCount = findings.filter((f) => f.severity === "warning").length;
  return { ok: errorCount === 0, errorCount, warningCount, findings };
}

/** Project-relative paths of every sub-composition file, sorted. */
export async function listScenes(projectDir: string): Promise<string[]> {
  const entries = await fs
    .readdir(path.join(projectDir, SCENES_DIR), { withFileTypes: true })
    .catch(() => []);
  return entries
    .filter((e) => e.isFile() && /\.html?$/i.test(e.name))
    .map((e) => `${SCENES_DIR}/${e.name}`)
    .sort();
}
