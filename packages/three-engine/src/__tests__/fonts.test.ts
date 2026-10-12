import { afterEach, describe, expect, it, vi } from "vitest";
import { withFonts } from "../fonts";
import type { ThreeFrame, ThreeSceneContext } from "../context";

/**
 * The browser pieces `withFonts` touches, small enough to assert against: a
 * document whose font set survives between builds (which is the editor, and
 * the whole reason the URL tag exists) and a `FontFace` that records what it
 * was constructed with.
 */
type FakeFace = {
  family: string;
  source: string;
  weight: string;
  style: string;
  status: string;
  load(): Promise<FakeFace>;
};

let constructed: FakeFace[] = [];
let failLoad = false;

class FakeFontFace {
  status = "unloaded";
  weight: string;
  style: string;
  constructor(
    public family: string,
    public source: string,
    public descriptors?: Record<string, string | undefined>,
  ) {
    this.weight = descriptors?.weight ?? "normal";
    this.style = descriptors?.style ?? "normal";
    constructed.push(this as unknown as FakeFace);
  }
  async load() {
    if (failLoad) throw new Error("404");
    this.status = "loaded";
    return this;
  }
}

function fakeDocument(faces: FakeFace[] = []) {
  const set = new Set<FakeFace>(faces);
  return {
    fonts: {
      forEach: (fn: (face: FakeFace) => void) => set.forEach(fn),
      add: (face: FakeFace) => set.add(face),
      delete: (face: FakeFace) => set.delete(face),
      get size() {
        return set.size;
      },
    },
  } as unknown as Document;
}

function fakeContext(doc: Document) {
  const items: string[] = [];
  const ctx = {
    canvas: { ownerDocument: doc },
    manager: {
      itemStart: (k: string) => items.push(`start:${k}`),
      itemEnd: (k: string) => items.push(`end:${k}`),
    },
  } as unknown as ThreeSceneContext;
  return { ctx, items };
}

/** A face already in the document, as if an earlier build had registered it. */
function loadedFace(family: string, url?: string, descriptors?: Record<string, string>): FakeFace {
  const face = new FakeFontFace(family, `url(${url ?? ""})`, {
    weight: "100 900",
    style: "normal",
    ...descriptors,
  }) as unknown as FakeFace;
  face.status = "loaded";
  if (url !== undefined) (face as unknown as { __gmUrl: string }).__gmUrl = url;
  constructed = [];
  return face;
}

const frame = (n: number): ThreeFrame => ({ frame: n, time: n / 30, fps: 30, progress: 0 });

vi.stubGlobal("FontFace", FakeFontFace);

afterEach(() => {
  constructed = [];
  failLoad = false;
});

describe("withFonts", () => {
  it("builds synchronously when every face is already loaded from the same url", () => {
    const doc = fakeDocument([loadedFace("Inter", "/a/Inter.woff2")]);
    const { ctx, items } = fakeContext(doc);
    const build = vi.fn(() => () => {});

    withFonts(ctx, [{ family: "Inter", url: "/a/Inter.woff2" }], build);

    expect(build).toHaveBeenCalledOnce();
    expect(constructed).toHaveLength(0);
    expect(items).toEqual([]);
  });

  it("reloads and replaces the face when the url behind a family changes", async () => {
    const old = loadedFace("Jaro", "/a/jaro-v1.woff2");
    const doc = fakeDocument([old]);
    const { ctx } = fakeContext(doc);
    const build = vi.fn(() => () => {});

    withFonts(ctx, [{ family: "Jaro", url: "/a/jaro-v2.woff2" }], build);
    await vi.waitFor(() => expect(build).toHaveBeenCalledOnce());

    // The stale face is gone and exactly one face named Jaro is registered.
    const families: FakeFace[] = [];
    doc.fonts.forEach((f) => families.push(f as unknown as FakeFace));
    expect(families).toHaveLength(1);
    expect(families[0]!.source).toBe("url(/a/jaro-v2.woff2)");
    expect(families[0]).not.toBe(old);
  });

  it("keeps each weight and style of a family in its own slot", () => {
    // Two weights of one family, both ours and both current: nothing to reload,
    // and neither may evict the other.
    const doc = fakeDocument([
      loadedFace("Poppins", "/a/poppins-400.woff2", { weight: "400" }),
      loadedFace("Poppins", "/a/poppins-500.woff2", { weight: "500" }),
      loadedFace("Serif", "/a/serif-italic.woff2", { weight: "400", style: "italic" }),
    ]);
    const { ctx } = fakeContext(doc);
    const build = vi.fn(() => () => {});

    withFonts(
      ctx,
      [
        { family: "Poppins", url: "/a/poppins-400.woff2", weight: "400" },
        { family: "Poppins", url: "/a/poppins-500.woff2", weight: "500" },
        { family: "Serif", url: "/a/serif-italic.woff2", weight: "400", style: "italic" },
      ],
      build,
    );

    expect(build).toHaveBeenCalledOnce();
    expect(constructed).toHaveLength(0);
    expect(doc.fonts.size).toBe(3);
  });

  it("leaves an untagged face from the host page alone", () => {
    const doc = fakeDocument([loadedFace("Inter")]); // no __gmUrl: not ours
    const { ctx } = fakeContext(doc);
    const build = vi.fn(() => () => {});

    withFonts(ctx, [{ family: "Inter", url: "/a/Inter.woff2" }], build);

    expect(build).toHaveBeenCalledOnce();
    expect(doc.fonts.size).toBe(1);
  });

  it("passes weight, features and variable axes to the face", async () => {
    const { ctx } = fakeContext(fakeDocument());
    withFonts(
      ctx,
      [{ family: "Jaro", url: "/a/jaro.woff2", weight: "400", features: '"tnum" 1', variation: "'opsz' 58" }],
      () => () => {},
    );
    await vi.waitFor(() => expect(constructed).toHaveLength(1));

    expect((constructed[0] as unknown as FakeFontFace).descriptors).toEqual({
      weight: "400",
      style: "normal",
      featureSettings: '"tnum" 1',
      variationSettings: "'opsz' 58",
    });
  });

  it("holds the frame barrier open across the load and re-poses the last frame", async () => {
    const { ctx, items } = fakeContext(fakeDocument());
    const update = vi.fn();

    const scene = withFonts(ctx, [{ family: "Jaro", url: "/a/jaro.woff2" }], () => update);
    scene(frame(12)); // asked for before the font lands: nothing to draw with yet
    expect(update).not.toHaveBeenCalled();
    expect(items).toEqual(["start:fonts:/a/jaro.woff2"]);

    await vi.waitFor(() => expect(update).toHaveBeenCalledWith(frame(12)));
    expect(items).toEqual(["start:fonts:/a/jaro.woff2", "end:fonts:/a/jaro.woff2"]);
  });

  it("still builds, and releases the barrier, when a font file is missing", async () => {
    failLoad = true;
    const { ctx, items } = fakeContext(fakeDocument());
    const build = vi.fn(() => () => {});

    withFonts(ctx, [{ family: "Nope", url: "/a/missing.woff2" }], build);

    await vi.waitFor(() => expect(build).toHaveBeenCalledOnce());
    expect(items).toContain("end:fonts:/a/missing.woff2");
  });
});
