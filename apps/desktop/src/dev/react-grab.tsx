import { useEffect } from "react";

/**
 * React Grab — hover any part of the editor, press ⌘C, and the element's
 * source context lands on the clipboard ready to paste into a coding agent.
 *
 * The same tool the marketing site mounts (`apps/web/src/components/
 * react-grab.tsx`), with the gate written the way this renderer writes it:
 * `import.meta.env.DEV` is a literal by the time Vite builds, so both the
 * branch in App.tsx and the dynamic import below are dropped from the
 * packaged app rather than merely inert in it.
 */
export function ReactGrab() {
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    void import("react-grab");
  }, []);
  return null;
}
