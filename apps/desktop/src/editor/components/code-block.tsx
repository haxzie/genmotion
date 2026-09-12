"use client";

import CodeMirror, { EditorView } from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { html } from "@codemirror/lang-html";
import { tokyoNightInit } from "@uiw/codemirror-theme-tokyo-night";

// Tokyo Night syntax colors, but with a transparent canvas/gutter so the code
// sits on whatever background is behind it.
const tokyoNightTransparent = tokyoNightInit({
  settings: { background: "transparent", gutterBackground: "transparent" },
});

const chromeOverrides = EditorView.theme({
  "&": {
    fontSize: "11px",
    backgroundColor: "transparent",
    maxWidth: "100%",
  },
  ".cm-scroller": {
    overflowX: "auto",
  },
  ".cm-gutters": {
    backgroundColor: "transparent",
    border: "none",
    color: "#b6b6c2",
  },
  ".cm-content": {
    fontFamily: "var(--font-mono)",
    padding: "8px 0",
  },
  ".cm-line": {
    padding: "0 10px",
  },
});

export type CodeLanguage = "tsx" | "html";

/** Read-only code viewer. Compact (max-h-60) by default; `fill` makes it fill its parent. */
export default function CodeBlock({
  code,
  fill = false,
  language = "tsx",
}: {
  code: string;
  fill?: boolean;
  /** TSX for React scenes; HTML (with its CSS and JS) for a HyperFrames composition. */
  language?: CodeLanguage;
}) {
  return (
    <div
      className={`w-full min-w-0 max-w-full overflow-auto ${fill ? "h-full overscroll-contain" : "max-h-60"}`}
    >
      <CodeMirror
        value={code}
        theme={tokyoNightTransparent}
        extensions={[
          language === "html" ? html() : javascript({ jsx: true, typescript: true }),
          chromeOverrides,
        ]}
        editable={false}
        readOnly
        basicSetup={{
          lineNumbers: true,
          foldGutter: false,
          highlightActiveLine: false,
          highlightActiveLineGutter: false,
          searchKeymap: false,
        }}
      />
    </div>
  );
}
