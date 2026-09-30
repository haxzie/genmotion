import { describe, expect, it } from "vitest";
import { normalizeSource, webUrl } from "../git/repo";
import { cloneSourceFromArgv } from "../cli";

/**
 * The string handling around a clone. Everything else in `git/repo.ts` is a
 * sequence of subprocesses against a real repository — these are the parts
 * that are decisions rather than commands.
 */

describe("normalizeSource", () => {
  it("passes owner/name through", () => {
    expect(normalizeSource("heygen-com/hyperframes")).toBe("heygen-com/hyperframes");
  });

  it("reduces a pasted browser URL to owner/name", () => {
    expect(normalizeSource("https://github.com/heygen-com/hyperframes")).toBe(
      "heygen-com/hyperframes",
    );
    // What the green Code button actually copies.
    expect(normalizeSource("https://github.com/heygen-com/hyperframes.git")).toBe(
      "heygen-com/hyperframes",
    );
    // A deep link to a file or a tab, which is what someone usually has open.
    expect(normalizeSource("https://github.com/heygen-com/hyperframes/tree/main/docs")).toBe(
      "heygen-com/hyperframes",
    );
  });

  it("leaves a host gh knows how to handle alone", () => {
    expect(normalizeSource("git@github.com:me/thing.git")).toBe("git@github.com:me/thing");
  });
});

describe("webUrl", () => {
  it("turns an SSH remote into a page someone can open", () => {
    expect(webUrl("git@github.com:me/thing.git")).toBe("https://github.com/me/thing");
  });

  it("strips .git from an https remote", () => {
    expect(webUrl("https://github.com/me/thing.git")).toBe("https://github.com/me/thing");
  });

  it("has nothing to offer for a repo with no remote", () => {
    expect(webUrl("")).toBeNull();
  });
});

describe("cloneSourceFromArgv", () => {
  it("finds what `genmotion clone` passed", () => {
    expect(cloneSourceFromArgv(["/app", "--gm-clone=me/thing"])).toBe("me/thing");
  });

  it("is null for an ordinary launch", () => {
    expect(cloneSourceFromArgv(["/app", "--gm-cwd=/Users/me/work"])).toBeNull();
  });

  it("treats an empty value as nothing asked for", () => {
    expect(cloneSourceFromArgv(["/app", "--gm-clone="])).toBeNull();
  });
});
