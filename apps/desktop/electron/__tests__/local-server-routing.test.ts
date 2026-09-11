import { describe, expect, it } from "vitest";
import { matchProjectPath } from "../local-server";
import type { ProjectSession } from "../project-session";

/**
 * A project's id is its absolute folder path, spread across URL segments. With
 * several projects open the matcher has to pick the right one — and one
 * project can live inside another's folder, so "first prefix that matches"
 * is not good enough.
 */

const session = (dir: string) => ({ dir }) as ProjectSession;
const segments = (url: string) => url.split("/").filter(Boolean);

describe("matchProjectPath", () => {
  it("matches a bare project path with nothing after it", () => {
    const a = session("/Users/me/work");
    expect(matchProjectPath([a], segments("/Users/me/work"))).toEqual({ session: a, rest: [] });
  });

  it("splits what follows the folder into segments", () => {
    const a = session("/Users/me/work");
    expect(matchProjectPath([a], segments("/Users/me/work/scenes/reorder"))).toEqual({
      session: a,
      rest: ["scenes", "reorder"],
    });
  });

  it("prefers the longest folder when one project is inside another", () => {
    const outer = session("/Users/me/work");
    const inner = session("/Users/me/work/promo");
    // Registration order must not matter.
    for (const list of [[outer, inner], [inner, outer]]) {
      expect(matchProjectPath(list, segments("/Users/me/work/promo/scenes/a.tsx"))).toEqual({
        session: inner,
        rest: ["scenes", "a.tsx"],
      });
      expect(matchProjectPath(list, segments("/Users/me/work/scenes/a.tsx"))).toEqual({
        session: outer,
        rest: ["scenes", "a.tsx"],
      });
    }
  });

  it("does not treat a sibling with a shared prefix as a match", () => {
    const foo = session("/Users/me/foo");
    expect(matchProjectPath([foo], segments("/Users/me/foo-2/scenes"))).toBeNull();
  });

  it("decodes encoded segments before comparing", () => {
    const a = session("/Users/me/my video");
    expect(matchProjectPath([a], segments("/Users/me/my%20video/scenes/01%20intro.tsx"))).toEqual({
      session: a,
      rest: ["scenes", "01 intro.tsx"],
    });
  });

  it("returns null when nothing open owns the path", () => {
    expect(matchProjectPath([session("/a")], segments("/b/c"))).toBeNull();
    expect(matchProjectPath([], segments("/a"))).toBeNull();
  });
});
