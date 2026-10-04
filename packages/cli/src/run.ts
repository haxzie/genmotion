import { parseArgs } from "node:util";
import { existsSync, statSync } from "node:fs";
import { GLOBAL_OPTIONS, type Command } from "./command";
import { createOutput, reportError, bold, dim, cyan, CliError } from "./output";
import { init } from "./commands/init";
import { dev } from "./commands/dev";
import { render, still } from "./commands/render";
import { check } from "./commands/check";
import { info, scene } from "./commands/project";
import { audio } from "./commands/audio";
import { browser, doctor, mcp, scenes, skills, templates, upgrade } from "./commands/tools";
import { openDesktop } from "./desktop";
import { VERSION } from "./version";

const COMMANDS: Command[] = [init, dev, render, still, check, info, scene, audio, templates, scenes, mcp, skills, browser, doctor, upgrade];
const ALIASES: Record<string, string> = {
  create: "init",
  new: "init",
  studio: "dev",
  preview: "dev",
  snapshot: "still",
  lint: "check",
  validate: "check",
  compositions: "info",
};

function usage(): string {
  const width = Math.max(...COMMANDS.map((c) => c.name.length));
  return `${bold("genmotion")} ${dim(VERSION)} — make videos with code and coding agents

${bold("Usage")}
  genmotion <command> [options]

${bold("Commands")}
${COMMANDS.map((c) => `  ${cyan(c.name.padEnd(width))}  ${c.summary}`).join("\n")}

${bold("Desktop app")}
  genmotion .              Open this folder in the GenMotion app
  genmotion clone <repo>   Clone a repo and open it in the app

${bold("Every command")}
  --json        One JSON object on stdout, nothing else (for agents and scripts)
  --dir, -C     Project folder (default: nearest with a project.json)
  --help, -h

${bold("Start here")}
  npx @genmotion/cli init my-video && cd my-video && npm install && npm run dev

${dim("Docs: https://genmotion.dev/docs")}`;
}

export async function main(argv: string[]): Promise<number> {
  const [first, ...rest] = argv;
  const wantsJson = argv.includes("--json");

  if (first === undefined) {
    // Bare `genmotion` has always opened the app; without one, show help.
    try {
      await openDesktop({});
      return 0;
    } catch {
      process.stdout.write(`${usage()}\n`);
      return 0;
    }
  }
  if (first === "--help" || first === "-h" || first === "help") {
    process.stdout.write(`${usage()}\n`);
    return 0;
  }
  if (first === "--version" || first === "-v" || first === "version") {
    process.stdout.write(`${VERSION}\n`);
    return 0;
  }

  const name = ALIASES[first] ?? first;
  const command = COMMANDS.find((c) => c.name === name);

  if (!command) {
    // The desktop shim's contract: `genmotion .`, `genmotion <folder>`, `genmotion clone <repo>`.
    try {
      if (first === "clone") {
        if (!rest[0]) throw new CliError("Which repository?", { fix: "genmotion clone owner/repo" });
        await openDesktop({ clone: rest[0] });
        return 0;
      }
      if (existsSync(first) && statSync(first).isDirectory()) {
        await openDesktop({ dir: first });
        return 0;
      }
      throw new CliError(`Unknown command "${first}"`, { fix: "genmotion --help" });
    } catch (err) {
      return reportError(err, wantsJson);
    }
  }

  let parsed;
  try {
    parsed = parseArgs({
      args: rest,
      options: { ...GLOBAL_OPTIONS, ...command.options },
      allowPositionals: true,
      strict: true,
    });
  } catch (err) {
    return reportError(new CliError(err instanceof Error ? err.message : String(err), { fix: `genmotion ${command.name} --help` }), wantsJson);
  }
  if (parsed.values.help) {
    process.stdout.write(`${command.help}\n`);
    return 0;
  }

  const out = createOutput(parsed.values.json === true);
  try {
    return (await command.run({ values: parsed.values, positionals: parsed.positionals, out })) ?? 0;
  } catch (err) {
    out.endProgress();
    return reportError(err, out.json);
  }
}
