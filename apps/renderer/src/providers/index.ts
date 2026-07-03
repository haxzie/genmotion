import { resolveProviderKind, type RenderProvider } from "./types";
import { LocalRenderProvider } from "./local";
import { E2BRenderProvider } from "./e2b";
import { DockerRenderProvider } from "./docker";

export * from "./types";
export { LocalRenderProvider } from "./local";
export { E2BRenderProvider } from "./e2b";
export { DockerRenderProvider } from "./docker";

const DEFAULT_RENDER_TIMEOUT_MS = 20 * 60_000; // 20 min
// Run the render CLI inside the sandbox. `tsx` is a workspace devDependency
// (not on PATH), so resolve it via `pnpm exec` from the renderer package; the
// --tsconfig gives every .tsx source in the import graph the JSX transform
// (mirrors the renderer's local `render` script). Repo lives at /app.
const DEFAULT_CLI_COMMAND =
  "pnpm --dir /app/apps/renderer exec tsx --tsconfig /app/tsconfig.tsx-runtime.json /app/apps/renderer/src/render-cli.ts";

/** Build the render provider selected by RENDER_PROVIDER (default "local"). */
export function createRenderProvider(
  env: Record<string, string | undefined> = process.env,
): RenderProvider {
  const kind = resolveProviderKind(env);
  if (kind === "local") return new LocalRenderProvider();

  // Remote providers (e2b / docker) run the render credential-less against the
  // API control-plane, so they need the API URL and the token-signing secret.
  const timeoutMs = Number(env.RENDER_TIMEOUT_MS) || DEFAULT_RENDER_TIMEOUT_MS;
  const secret = env.RENDER_JWT_SECRET ?? env.BETTER_AUTH_SECRET;
  if (!secret) {
    throw new Error(
      `RENDER_PROVIDER="${kind}" needs RENDER_JWT_SECRET (or BETTER_AUTH_SECRET) to sign per-job render tokens.`,
    );
  }
  const cliCommand = env.E2B_RENDER_CMD ?? DEFAULT_CLI_COMMAND;

  if (kind === "e2b") {
    const apiUrl =
      env.API_URL ?? env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001";
    return new E2BRenderProvider({
      template: env.E2B_RENDER_TEMPLATE ?? "genmotion-renderer",
      apiKey: env.E2B_API_KEY,
      timeoutMs,
      apiUrl,
      secret,
      cliCommand,
    });
  }

  // docker: the container reaches the host API via host.docker.internal.
  const apiUrl =
    env.RENDER_DOCKER_API_URL ??
    env.API_URL ??
    "http://host.docker.internal:4001";
  return new DockerRenderProvider({
    image: env.RENDER_DOCKER_IMAGE ?? "genmotion-render-sandbox",
    timeoutMs,
    apiUrl,
    secret,
    cliCommand,
  });
}
