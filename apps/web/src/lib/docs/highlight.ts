import { createHighlighter, type Highlighter } from "shiki";

/**
 * Shiki at build time: docs pages ship highlighted HTML and no highlighter
 * JavaScript. One instance per server process; loading grammars is the slow
 * part, so only the languages the docs actually use are loaded.
 */
const LANGS = ["sh", "bash", "json", "jsonc", "ts", "tsx", "js", "yaml", "md", "html", "css"] as const;
const THEME = "github-dark-default";

let highlighter: Promise<Highlighter> | null = null;

export async function highlight(code: string, lang: string | undefined): Promise<string> {
  highlighter ??= createHighlighter({ themes: [THEME], langs: [...LANGS] });
  const h = await highlighter;
  const known = lang && (h.getLoadedLanguages() as string[]).includes(lang) ? lang : "text";
  return h.codeToHtml(code, { lang: known, theme: THEME });
}
