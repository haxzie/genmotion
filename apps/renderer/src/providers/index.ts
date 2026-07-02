import {
  pickRenderEnv,
  resolveProviderKind,
  type RenderProvider,
} from "./types";
import { LocalRenderProvider } from "./local";
import { E2BRenderProvider } from "./e2b";

export * from "./types";
export { LocalRenderProvider } from "./local";
export { E2BRenderProvider } from "./e2b";

const DEFAULT_RENDER_TIMEOUT_MS = 20 * 60_000; // 20 min

/** Build the render provider selected by RENDER_PROVIDER (default "local"). */
export function createRenderProvider(
  env: Record<string, string | undefined> = process.env,
): RenderProvider {
  const kind = resolveProviderKind(env);
  if (kind === "e2b") {
    return new E2BRenderProvider({
      template: env.E2B_RENDER_TEMPLATE ?? "genmotion-renderer",
      apiKey: env.E2B_API_KEY,
      timeoutMs: Number(env.RENDER_TIMEOUT_MS) || DEFAULT_RENDER_TIMEOUT_MS,
      cliCommand:
        env.E2B_RENDER_CMD ?? "tsx /app/apps/renderer/src/render-cli.ts",
      env: pickRenderEnv(env),
    });
  }
  return new LocalRenderProvider();
}
