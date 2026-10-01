import { describe, expect, it } from "vitest";
import { installNpmCli, isLegacyScript, isNpmCli, readCliState, type CliDeps } from "../cli-install";

const LEGACY = "#!/bin/sh\n# GenMotion 0.0.27 — command line launcher.\n# gm-app: /Applications/GenMotion.app\n# gm-cli: 3\n";
const NPM_BIN = "/usr/local/lib/node_modules/@genmotion/cli/bin/genmotion.js";

/**
 * A fake machine: files, symlinks, PATH order, and an npm whose install can be
 * told to fail. Every call is logged so a test can assert on the sequence.
 */
function machine(opts: {
  files?: Record<string, string>;
  links?: Record<string, string>;
  path: string[];
  npm?: boolean;
  prefix?: string;
  installFails?: string;
  plainWritesFail?: boolean;
}) {
  const files = new Map(Object.entries(opts.files ?? {}));
  const links = new Map(Object.entries(opts.links ?? {}));
  const log: string[] = [];
  const exists = (p: string) => files.has(p) || links.has(p);
  const deps: CliDeps = {
    async exec(command, args) {
      log.push([command, ...args].join(" "));
      if (command === "which") {
        const name = args.at(-1)!;
        const found = name === "npm" ? (opts.npm === false ? [] : ["/usr/local/bin/npm"]) : opts.path.filter(exists);
        if (!found.length) throw Object.assign(new Error("not found"), { stderr: "" });
        return { stdout: `${(args[0] === "-a" ? found : found.slice(0, 1)).join("\n")}\n`, stderr: "" };
      }
      if (args[0] === "prefix") return { stdout: `${opts.prefix ?? "/usr/local"}\n`, stderr: "" };
      if (args[0] === "install") {
        if (opts.installFails) throw Object.assign(new Error("exit 1"), { stderr: opts.installFails });
        const target = `${opts.prefix ?? "/usr/local"}/bin/genmotion`;
        if (exists(target)) throw Object.assign(new Error("exit 1"), { stderr: "npm error code EEXIST" });
        links.set(target, NPM_BIN);
        return { stdout: "", stderr: "" };
      }
      if (args[0] === "--version") return { stdout: "0.2.0\n", stderr: "" };
      throw new Error(`unexpected ${command}`);
    },
    async readFile(p) {
      return files.get(p) ?? (links.has(p) ? "#!/usr/bin/env node\n" : null);
    },
    async realpath(p) {
      return links.get(p) ?? p;
    },
    async rename(from, to) {
      if (opts.plainWritesFail) throw new Error("EACCES");
      log.push(`rename ${from} ${to}`);
      files.set(to, files.get(from)!);
      files.delete(from);
    },
    async remove(p) {
      if (opts.plainWritesFail) throw new Error("EACCES");
      log.push(`remove ${p}`);
      files.delete(p);
    },
    async admin(command) {
      log.push(`admin ${command}`);
      const mv = /^mv -f '([^']+)' '([^']+)'$/.exec(command);
      if (mv) {
        files.set(mv[2]!, files.get(mv[1]!)!);
        files.delete(mv[1]!);
      }
      const rm = /^rm -f '([^']+)'$/.exec(command);
      if (rm) files.delete(rm[1]!);
    },
  };
  return { deps, files, links, log };
}

describe("recognizing commands", () => {
  it("tells an old script from npm's command and from anything else", () => {
    expect(isLegacyScript(LEGACY)).toBe(true);
    expect(isLegacyScript("#!/usr/bin/env node\nrequire('x')")).toBe(false);
    expect(isLegacyScript(null)).toBe(false);
    expect(isNpmCli(NPM_BIN)).toBe(true);
    expect(isNpmCli("/Users/a/.nvm/versions/node/v22.1.0/lib/node_modules/@genmotion/cli/bin/genmotion.js")).toBe(true);
    expect(isNpmCli("/usr/local/bin/genmotion")).toBe(false);
  });

  it("reports what a shell would run first", async () => {
    const { deps } = machine({
      files: { "/usr/local/bin/genmotion": LEGACY },
      links: { "/opt/homebrew/bin/genmotion": "/opt/homebrew/lib/node_modules/@genmotion/cli/bin/genmotion.js" },
      path: ["/opt/homebrew/bin/genmotion", "/usr/local/bin/genmotion"],
    });
    const state = await readCliState(deps);
    expect(state.commands.map((c) => c.kind)).toEqual(["npm", "legacy"]);
    expect(state.version).toBe("0.2.0");
  });
});

describe("installNpmCli", () => {
  it("asks for Node rather than failing when there is no npm", async () => {
    const { deps } = machine({ path: [], npm: false });
    expect(await installNpmCli(deps)).toMatchObject({ ok: false, needsNode: true });
  });

  it("moves an old script out of npm's way, installs, then deletes it", async () => {
    const { deps, files, links, log } = machine({ files: { "/usr/local/bin/genmotion": LEGACY }, path: ["/usr/local/bin/genmotion"] });
    expect(await installNpmCli(deps)).toEqual({ ok: true });
    expect(links.get("/usr/local/bin/genmotion")).toBe(NPM_BIN);
    expect([...files.keys()]).toEqual([]);
    expect(log.indexOf("rename /usr/local/bin/genmotion /usr/local/bin/genmotion.gm-legacy")).toBeLessThan(
      log.indexOf("/usr/local/bin/npm install -g @genmotion/cli@latest"),
    );
  });

  it("puts the old script back when npm fails, so there is still a command", async () => {
    const { deps, files } = machine({
      files: { "/usr/local/bin/genmotion": LEGACY },
      path: ["/usr/local/bin/genmotion"],
      installFails: "npm error code EACCES\nnpm error syscall mkdir",
    });
    const result = await installNpmCli(deps);
    expect(result).toMatchObject({ ok: false });
    expect(!result.ok && result.error).toMatch(/permissions/);
    expect(files.get("/usr/local/bin/genmotion")).toBe(LEGACY);
  });

  it("removes an old script elsewhere on PATH that would shadow npm's", async () => {
    const { deps, files } = machine({
      files: { "/usr/local/bin/genmotion": LEGACY },
      path: ["/usr/local/bin/genmotion", "/opt/homebrew/bin/genmotion"],
      prefix: "/opt/homebrew",
    });
    expect(await installNpmCli(deps)).toEqual({ ok: true });
    expect(files.has("/usr/local/bin/genmotion")).toBe(false);
  });

  it("falls back to an administrator prompt in a root-owned folder", async () => {
    const { deps, links, log } = machine({
      files: { "/usr/local/bin/genmotion": LEGACY },
      path: ["/usr/local/bin/genmotion"],
      plainWritesFail: true,
    });
    expect(await installNpmCli(deps)).toEqual({ ok: true });
    expect(log.filter((l) => l.startsWith("admin"))).toEqual([
      "admin mv -f '/usr/local/bin/genmotion' '/usr/local/bin/genmotion.gm-legacy'",
      "admin rm -f '/usr/local/bin/genmotion.gm-legacy'",
    ]);
    expect(links.get("/usr/local/bin/genmotion")).toBe(NPM_BIN);
  });

  it("leaves a command that isn't ours alone", async () => {
    const { deps, files } = machine({
      files: { "/usr/local/bin/genmotion": "#!/bin/bash\necho someone else's\n" },
      path: ["/usr/local/bin/genmotion"],
    });
    const result = await installNpmCli(deps);
    expect(result).toMatchObject({ ok: false });
    expect(files.get("/usr/local/bin/genmotion")).toContain("someone else's");
  });
});
