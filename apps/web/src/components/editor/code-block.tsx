"use client";

import CodeMirror, { EditorView } from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
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

/** Read-only TSX viewer. Compact (max-h-60) by default; `fill` makes it fill its parent. */
export default function CodeBlock({ code, fill = false }: { code: string; fill?: boolean }) {
  return (
    <div
      className={`w-full min-w-0 max-w-full overflow-auto ${fill ? "h-full" : "max-h-60"}`}
    >
      <CodeMirror
        value={code}
        theme={tokyoNightTransparent}
        extensions={[javascript({ jsx: true, typescript: true }), chromeOverrides]}
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
