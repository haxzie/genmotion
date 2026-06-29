"use client";

import { useEffect } from "react";

/**
 * React Grab — dev-only tool to select UI elements and copy source context for
 * coding agents (hover an element, press ⌘C / Ctrl+C, paste into your agent).
 * The dynamic import is gated on NODE_ENV so it's dead-code-eliminated from
 * production builds.
 */
export function ReactGrab() {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      import("react-grab");
    }
  }, []);
  return null;
}
