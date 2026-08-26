import { lazy, type ComponentType } from "react";

/**
 * `next/dynamic` in the editor is only ever used to keep CodeMirror off the
 * server. There is no server here, so it collapses to `React.lazy`.
 */
export default function dynamic<P extends object>(
  loader: () => Promise<{ default: ComponentType<P> } | ComponentType<P>>,
  _options?: { ssr?: boolean; loading?: ComponentType },
): ComponentType<P> {
  return lazy(async () => {
    const loaded = await loader();
    return "default" in loaded ? loaded : { default: loaded };
  });
}
