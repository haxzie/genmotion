import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

/**
 * Every tool the agent can call has a card in the chat.
 *
 * Both sides are read as source text. `tool-presentation.tsx` is the
 * renderer's and this is a node-only suite; `agent/tools.ts` cannot be
 * imported here either, because its module graph reaches Electron and throws
 * on load. Two regexes over two files is a blunt instrument, but the thing
 * being checked is exactly a pair of lists drifting apart, and it is the
 * check that was missing: eight tools shipped with no entry, so the
 * transcript showed `mcp__genmotion__search_skills` beside a grey dot. The
 * fallback catches that case now, but a written label beats "Used search
 * skills", and this keeps the gap visible while it is still cheap to close.
 */
describe("tool presentation", () => {
  const source = fs.readFileSync(
    path.join(__dirname, "../../src/tool-presentation.tsx"),
    "utf8",
  );
  const registered = new Set(
    [...source.matchAll(/mcp__genmotion__([a-z_]+):/g)].map((m) => m[1] as string),
  );

  // The array literal only, so the server's own `name: "genmotion"` further
  // down the file is not mistaken for a tool.
  const tools = fs.readFileSync(path.join(__dirname, "../agent/tools.ts"), "utf8");
  const start = tools.indexOf("export const GENMOTION_TOOLS");
  const array = tools.slice(start, tools.indexOf("\n];", start));
  const declared = [...array.matchAll(/^\s{4}name: "([a-z_]+)",$/gm)].map((m) => m[1] as string);

  it("has a card for every tool the agent can call", () => {
    expect(declared.length).toBeGreaterThan(15);
    expect(declared.filter((n) => !registered.has(n))).toEqual([]);
  });

  it("registers nothing for a tool that no longer exists", () => {
    const names = new Set(declared);
    expect([...registered].filter((n) => !names.has(n))).toEqual([]);
  });
});
