import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const root = path.dirname(fileURLToPath(import.meta.url));
const web = path.resolve(root, "../web/src");
const shim = (name: string) => path.resolve(root, "src/shims", name);

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // The packaged renderer is served from the loopback origin, so root-absolute
  // paths work — including the ones the web components already use.
  base: "/",
  // Public assets the reused components reference by absolute path.
  publicDir: path.resolve(root, "public"),
  resolve: {
    // Order matters: the specific shims must win over the `@/` catch-all.
    alias: [
      // Next-only modules the editor components touch.
      { find: /^next\/link$/, replacement: shim("next-link.tsx") },
      { find: /^next\/dynamic$/, replacement: shim("next-dynamic.ts") },
      // Analytics posts to PostHog; a desktop app has no such pipeline.
      { find: /^@\/lib\/analytics$/, replacement: shim("analytics.ts") },
      // Billing, quotas, and the upgrade path don't exist here.
      { find: /^@\/lib\/billing$/, replacement: shim("billing.ts") },
      { find: /^@\/components\/upgrade-modal$/, replacement: shim("upgrade-modal.tsx") },
      // Scenes are bundled by native esbuild in the main process, not compiled
      // with esbuild-wasm in the browser: only the main process can resolve the
      // project's node_modules and sibling components.
      { find: /^@\/hooks\/use-compiled-scenes$/, replacement: shim("use-compiled-scenes.tsx") },
      // Everything else — components, ui, stores, hooks — is the web app's own
      // source, compiled straight into this renderer.
      { find: /^@\//, replacement: `${web}/` },
    ],
  },
  define: {
    // `lib/api` reads this at module scope; the preload publishes the real
    // loopback URL (with its per-launch secret) on the window.
    "process.env.NEXT_PUBLIC_API_URL": "window.__GM_API_URL__",
    "process.env.NEXT_PUBLIC_POSTHOG_KEY": "undefined",
    "process.env.NEXT_PUBLIC_GA_ID": "undefined",
  },
  build: {
    outDir: "dist/renderer",
    emptyOutDir: true,
    target: "chrome130",
  },
  optimizeDeps: {
    exclude: [
      "@genmotion/compiler",
      "@genmotion/motion",
      "@genmotion/player",
      "@genmotion/shared",
    ],
  },
  server: { port: 4100, strictPort: true },
});
