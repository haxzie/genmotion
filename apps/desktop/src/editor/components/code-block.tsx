"use client";

import { useMemo } from "react";
import { language as tsxLanguage } from "@twinkleplop/tsx";
import { language as htmlLanguage } from "@twinkleplop/html";
import "./code-block.css";

/** TSX for React scenes; HTML (with its CSS and JS) for a HyperFrames composition. */
const HIGHLIGHTERS = {
  tsx: tsxLanguage(),
  html: htmlLanguage(),
};

export type CodeLanguage = keyof typeof HIGHLIGHTERS;

/** Read-only code viewer. Compact (max-h-60) by default; `fill` makes it fill its parent. */
export default function CodeBlock({
  code,
  fill = false,
  language = "tsx",
}: {
  code: string;
  fill?: boolean;
  language?: CodeLanguage;
}) {
  // Twinkleplop escapes the source text it wraps, so the markup it returns
  // carries no HTML from `code` itself.
  const html = useMemo(
    () => HIGHLIGHTERS[language](code, { line_numbers: true }),
    [code, language],
  );

  return (
    <div
      className={`w-full min-w-0 max-w-full overflow-auto ${fill ? "h-full overscroll-contain" : "max-h-60"}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
