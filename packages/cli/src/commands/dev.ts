import path from "node:path";
import fs from "node:fs/promises";
import { spawn } from "node:child_process";
import { serveProject } from "@genmotion/render";
import { INTERNAL_DIR } from "@genmotion/project";
import { resolveProjectDir } from "../project-dir";
import { CliError, bold, dim, green } from "../output";
import { num, str, type Command } from "../command";

const DEFAULT_PORT = 4200;

interface DevState {
  pid: number;
  url: string;
  port: number;
  startedAt: string;
}

const stateFile = (projectDir: string) => path.join(projectDir, INTERNAL_DIR, "dev.json");

async function readState(projectDir: string): Promise<DevState | null> {
  const raw = await fs.readFile(stateFile(projectDir), "utf8").catch(() => null);
  if (!raw) return null;
  try {
    const state = JSON.parse(raw) as DevState;
    process.kill(state.pid, 0); // throws when the process is gone
    return state;
  } catch {
    await fs.rm(stateFile(projectDir), { force: true });
    return null;
  }
}

/** Opens a URL in the user's browser, best effort. */
function openBrowser(url: string): void {
  const [cmd, args] =
    process.platform === "darwin" ? ["open", [url]]
    : process.platform === "win32" ? ["cmd", ["/c", "start", "", url]]
    : ["xdg-open", [url]];
  spawn(cmd as string, args as string[], { stdio: "ignore", detached: true }).on("error", () => {}).unref();
}

export const dev: Command = {
  name: "dev",
  summary: "Live studio: play, scrub and reload on save",
  help: `Usage: genmotion dev [options]

Serves the studio at http://localhost:4200 (or the next free port). It renders
through the same page as \`genmotion render\`, so what you see is what exports.
Saving any file reloads the preview at the frame you were on.

Options
  --port <n>        Port (default: 4200, next free one if taken)
  --host <addr>     Bind address (default: 127.0.0.1)
  --open            Open the studio in your browser
  --background      Start detached and return at once (for agents)
  --status          Is a background studio running? Prints its URL
  --stop            Stop the background studio
  --json`,
  options: {
    port: { type: "string", short: "p" },
    host: { type: "string" },
    open: { type: "boolean" },
    background: { type: "boolean" },
    status: { type: "boolean" },
    stop: { type: "boolean" },
  },
  async run({ values, out }) {
    const projectDir = resolveProjectDir(str(values.dir));

    if (values.status) {
      const state = await readState(projectDir);
      out.result({ running: state !== null, ...(state ?? {}) }, state ? `${green("●")} ${state.url} ${dim(`pid ${state.pid}`)}` : "Not running");
      return;
    }
    if (values.stop) {
      const state = await readState(projectDir);
      if (state) {
        process.kill(state.pid, "SIGTERM");
        await fs.rm(stateFile(projectDir), { force: true });
      }
      out.result({ stopped: state !== null }, state ? `Stopped ${state.url}` : "Not running");
      return;
    }
    if (values.background) {
      const existing = await readState(projectDir);
      if (existing) {
        out.result({ running: true, alreadyRunning: true, ...existing }, `${green("●")} Already running at ${existing.url}`);
        return;
      }
      // Re-run this same CLI entry (with the same loader flags, so a source
      // checkout under tsx works too), detached from this terminal.
      const entry = process.argv[1];
      if (!entry) throw new CliError("Can't locate the genmotion entry point to relaunch");
      const args = [...process.execArgv, entry, "dev", "--dir", projectDir];
      if (str(values.port)) args.push("--port", str(values.port)!);
      if (str(values.host)) args.push("--host", str(values.host)!);
      const child = spawn(process.execPath, args, { detached: true, stdio: "ignore", env: { ...process.env, GENMOTION_DEV_CHILD: "1" } });
      child.unref();
      // Wait for the child to record where it listens.
      for (let i = 0; i < 100; i++) {
        await new Promise((r) => setTimeout(r, 150));
        const state = await readState(projectDir);
        if (state) {
          out.result({ running: true, ...state }, `${green("●")} Studio running at ${bold(state.url)} ${dim(`(stop: npx genmotion dev --stop)`)}`);
          return;
        }
      }
      throw new CliError("The background studio didn't start within 15s", { fix: "Run `npx genmotion dev` in the foreground to see why" });
    }

    const host = str(values.host) ?? "127.0.0.1";
    const requested = num(values.port, "port");
    let server;
    for (let port = requested ?? DEFAULT_PORT; ; port++) {
      try {
        server = await serveProject({ projectDir, port, host, studio: true });
        break;
      } catch (err) {
        const code = (err as NodeJS.ErrnoException).code;
        if (code !== "EADDRINUSE" || requested !== undefined || port > DEFAULT_PORT + 50) throw err;
      }
    }
    const url = host === "0.0.0.0" ? `http://localhost:${server.port}` : server.url;
    const state: DevState = { pid: process.pid, url, port: server.port, startedAt: new Date().toISOString() };
    await fs.mkdir(path.dirname(stateFile(projectDir)), { recursive: true });
    await fs.writeFile(stateFile(projectDir), JSON.stringify(state, null, 2));

    const comp = await server.composition();
    if (values.open) openBrowser(url);
    if (!process.env.GENMOTION_DEV_CHILD) {
      out.result(
        { running: true, ...state },
        `${green("●")} ${bold(comp.name)} studio at ${bold(url)}\n  ${dim("watching for changes · ctrl-c to stop")}`,
      );
    }

    await new Promise<void>((resolve) => {
      const stop = async () => {
        await fs.rm(stateFile(projectDir), { force: true }).catch(() => {});
        await server.close();
        resolve();
      };
      process.once("SIGINT", stop);
      process.once("SIGTERM", stop);
    });
  },
};
