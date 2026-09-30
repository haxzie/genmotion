import path from "node:path";
import { checkProject } from "@genmotion/render";
import { resolveProjectDir } from "../project-dir";
import { bold, dim, green, red, yellow } from "../output";
import { str, type Command } from "../command";

export const check: Command = {
  name: "check",
  summary: "Validate every scene: compile, determinism, and a real headless render",
  help: `Usage: genmotion check [options]

Runs, in order:
  1. project.json parses and every listed scene exists
  2. every scene compiles and follows the determinism rules
     (no clocks, no Math.random, no timers, no hot-linked assets)
  3. every scene renders its first, middle and last frame in headless
     Chromium without throwing, logging errors, or drawing an empty frame

Exits 1 when there is any error.

Options
  --static        Steps 1–2 only (no browser; fast)
  --snapshots     Save each sampled frame to .genmotion/check/
  --gl <swiftshader|gpu>
  --json`,
  options: {
    static: { type: "boolean" },
    snapshots: { type: "boolean" },
    gl: { type: "string" },
  },
  async run({ values, out }) {
    const projectDir = resolveProjectDir(str(values.dir));
    out.info(`Checking ${dim(projectDir)}${values.static ? "" : dim(" (with headless render)")}`);
    const gl = str(values.gl);
    const result = await checkProject({
      projectDir,
      static: values.static === true,
      snapshots: values.snapshots === true,
      gl: gl === "gpu" ? "gpu" : undefined,
    });

    const errors = result.findings.filter((f) => f.level === "error");
    const warnings = result.findings.filter((f) => f.level === "warning");
    const lines = result.findings.map((f) => {
      const tag = f.level === "error" ? red("error  ") : yellow("warning");
      const where = [f.file, f.frame !== undefined ? `frame ${f.frame}` : null].filter(Boolean).join(" @ ");
      return `${tag} ${dim(`[${f.rule}]`)} ${where ? bold(where) + " " : ""}${f.message}${f.fix ? `\n        ${dim("fix:")} ${f.fix}` : ""}`;
    });
    for (const snap of result.snapshots) lines.push(dim(`snapshot ${path.relative(process.cwd(), snap.path)}`));
    const summary = result.ok
      ? `${green("✓")} ${result.scenes.length} scene${result.scenes.length === 1 ? "" : "s"} OK${warnings.length ? `, ${warnings.length} warning${warnings.length === 1 ? "" : "s"}` : ""}`
      : `${red("✗")} ${errors.length} error${errors.length === 1 ? "" : "s"}, ${warnings.length} warning${warnings.length === 1 ? "" : "s"}`;
    out.result({ ...result, ok: result.ok }, [...lines, summary].join("\n"));
    return result.ok ? 0 : 1;
  },
};
