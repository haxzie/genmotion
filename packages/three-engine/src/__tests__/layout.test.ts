import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { solve, auditRects, type Element, type NamedRect, type AuditFinding } from "../layout";

const msgs = (f: AuditFinding[]) => f.map((x) => `${x.rule}: ${x.message}`);

const el = (w: number, h: number, name = ""): Element => {
  const o = new THREE.Object3D();
  o.name = name;
  return { object: o, size: { w, h } };
};

describe("intrinsic sizing — a container is as big as its children", () => {
  it("a column sums its children and adds gaps and padding", () => {
    const L = solve({
      pad: 40,
      gap: 10,
      children: [{ h: 50 }, { h: 50 }, { h: 50 }],
    });
    // 3*50 + 2*10 + 40*2 = 250
    expect(L.size.h).toBe(250);
  });

  it("THE REGRESSION: adding a row grows the card instead of overflowing it", () => {
    const card = (rows: number) =>
      solve({
        name: "card",
        w: 820,
        pad: 40,
        gap: 30,
        children: [
          { name: "header", h: 44 },
          ...Array.from({ length: rows }, (_, i) => ({ name: `row-${i}`, h: 58 })),
          { name: "footer", h: 52 },
        ],
      });
    const three = card(3);
    const four = card(4);
    expect(four.size.h).toBe(three.size.h + 58 + 30);
    // and the footer moved down with it rather than being sat on
    expect(four.rect("footer").y).toBe(three.rect("footer").y + 88);
    expect(four.audit()).toEqual([]);
  });

  it("a container with no width yields invisible children, and the audit says so", () => {
    // Easy mistake: a column of rows where nobody declared a width. The boxes
    // lay out, the scene renders, and nothing is on screen.
    const L = solve({ pad: 40, children: [{ name: "row", h: 58 }] });
    expect(L.rect("row").w).toBe(0);
    expect(L.audit()[0]!.message).toMatch(/row is 0x58/);
  });

  it("a row sums across and takes the tallest child", () => {
    const L = solve({ dir: "row", gap: 16, children: [{ w: 100, h: 20 }, { w: 50, h: 60 }] });
    expect(L.size).toEqual({ w: 166, h: 60 });
  });

  it("an explicit size wins over the intrinsic one", () => {
    const L = solve({ h: 1000, children: [{ h: 10 }] });
    expect(L.size.h).toBe(1000);
  });
});

describe("grow and alignment", () => {
  it("a bare grow is a spacer that pushes the rest right", () => {
    const L = solve({
      dir: "row",
      w: 1000,
      children: [{ name: "a", w: 100 }, { grow: 1 }, { name: "b", w: 100 }],
    });
    expect(L.rect("a").x).toBe(0);
    expect(L.rect("b").x).toBe(900);
  });

  it("several growers share the free space", () => {
    const L = solve({
      dir: "row",
      w: 300,
      children: [{ name: "a", grow: 1 }, { name: "b", grow: 2 }],
    });
    expect(L.rect("a").w).toBe(100);
    expect(L.rect("b").w).toBe(200);
  });

  it("main: between spreads the gaps", () => {
    const L = solve({
      dir: "row",
      w: 400,
      main: "between",
      children: [{ name: "a", w: 100 }, { name: "b", w: 100 }],
    });
    expect(L.rect("b").x).toBe(300);
  });

  it("cross: center centres on the other axis", () => {
    const L = solve({ dir: "row", h: 100, children: [{ name: "a", w: 10, h: 20 }], cross: "center" });
    expect(L.rect("a").y).toBe(40);
  });

  it("right-aligning a group of two keeps one gap between them", () => {
    // The hand-written version of this was `w - PAD - 56 - 112`.
    const L = solve({
      dir: "row",
      w: 740,
      children: [
        { grow: 1 },
        { name: "ghost", w: 143 },
        { name: "fill", w: 163 },
      ],
      gap: 16,
    });
    expect(L.rect("fill").x + L.rect("fill").w).toBe(740);
    expect(L.rect("ghost").x + L.rect("ghost").w + 16).toBe(L.rect("fill").x);
  });
});

describe("place — the centre-origin conversion, done once", () => {
  it("puts the root's centre at the parent origin", () => {
    const L = solve({ w: 100, h: 100, children: [{ name: "a", w: 20, h: 20 }] });
    const o = new THREE.Object3D();
    L.place(o, "a");
    // box at (0,0,20,20) in a 100x100 root → centre (10,10) → world (-40, +40)
    expect(o.position.x).toBe(-40);
    expect(o.position.y).toBe(40);
  });

  it("y goes up, not down", () => {
    const L = solve({ w: 100, h: 100, children: [{ name: "top", h: 10 }, { name: "bottom", h: 10 }] });
    const a = new THREE.Object3D();
    const b = new THREE.Object3D();
    L.place(a, "top");
    L.place(b, "bottom");
    expect(a.position.y).toBeGreaterThan(b.position.y);
  });

  it("scales by `unit` for a world-space stage", () => {
    const L = solve({ w: 100, h: 100, children: [{ name: "a", w: 20, h: 20 }] });
    const o = new THREE.Object3D();
    L.place(o, "a", { unit: 0.01, z: 2 });
    expect(o.position.x).toBeCloseTo(-0.4, 10);
    expect(o.position.z).toBe(2);
  });

  it("mount places and parents every element", () => {
    const chip = el(80, 40, "chip");
    const L = solve({ pad: 10, children: [{ element: chip }] });
    const group = new THREE.Group();
    L.mount(group);
    expect(group.children).toContain(chip.object);
    expect(L.size).toEqual({ w: 100, h: 60 });
  });

  it("an element's intrinsic size drives the layout", () => {
    const short = solve({ dir: "row", children: [{ element: el(80, 40) }] });
    const long = solve({ dir: "row", children: [{ element: el(260, 40) }] });
    expect(long.size.w - short.size.w).toBe(180);
  });

  it("rejects duplicate names, because a name is an address", () => {
    expect(() => solve({ children: [{ name: "a" }, { name: "a" }] })).toThrow(/two boxes are named/);
  });
});

describe("auditRects", () => {
  const r = (name: string, x: number, y: number, w: number, h: number): NamedRect => ({ name, x, y, w, h });

  it("passes a clean layout", () => {
    expect(auditRects([r("a", 0, 0, 10, 10), r("b", 0, 20, 10, 10)])).toEqual([]);
  });

  it("catches a partial overlap", () => {
    const out = auditRects([r("row", 0, 0, 100, 20), r("button", 50, 10, 100, 20)]);
    expect(out).toHaveLength(1);
    expect(out[0]!.rule).toBe("overlap");
    expect(out[0]!.severity).toBe("error");
    expect(out[0]!.message).toMatch(/button and row overlap by 50x10px/);
  });

  it("treats containment as legal nesting, not a collision", () => {
    expect(auditRects([r("card", 0, 0, 100, 100), r("row", 10, 10, 50, 10)])).toEqual([]);
  });

  it("catches a near-miss alignment", () => {
    const out = auditRects([r("a", 100, 0, 10, 10), r("b", 103, 40, 10, 10)]);
    expect(out[0]!.rule).toBe("near-miss");
    expect(out[0]!.severity).toBe("warning");
    expect(out[0]!.message).toMatch(/a and b left edges are 3.0px apart/);
  });

  it("does not flag edges that are properly apart", () => {
    expect(auditRects([r("a", 100, 0, 10, 10), r("b", 400, 40, 10, 10)])).toEqual([]);
  });

  it("leaves centre-aligned boxes of different sizes alone", () => {
    // A 44px mark beside 34px text in a centred row: tops differ by 5px and
    // that is correct. An earlier version of this rule reported it as a bug.
    const mark = r("mark", 0, 0, 44, 44);
    const text = r("text", 60, 5, 100, 34);
    expect(mark.y + mark.h / 2).toBe(text.y + text.h / 2);
    expect(auditRects([mark, text])).toEqual([]);
  });

  it("still catches a near-miss when the centres do not agree either", () => {
    const out = auditRects([r("a", 0, 0, 40, 40), r("b", 60, 3, 40, 40)]);
    expect(msgs(out).some((m) => /near-miss: a and b top edges are 3.0px apart/.test(m))).toBe(true);
  });

  it("catches a right-edge near-miss, not just the left", () => {
    const out = auditRects([r("a", 0, 0, 100, 20), r("b", 0, 40, 104, 20)]);
    expect(msgs(out).some((m) => /right edges are 4.0px apart/.test(m))).toBe(true);
  });

  it("checks a spacing grid when asked, and not otherwise", () => {
    const boxes = [r("a", 7, 0, 10, 10)];
    expect(auditRects(boxes)).toEqual([]);
    expect(msgs(auditRects(boxes, { grid: 8 })).some((m) => /off the 8px grid/.test(m))).toBe(true);
  });

  it("flags a box nothing will ever see", () => {
    expect(auditRects([r("ghost", 0, 0, 0, 0)])[0]!.message).toMatch(/ghost is 0x0/);
  });

  it("honours the ignore list for a full-frame backdrop", () => {
    const boxes = [r("backdrop", 0, 0, 1920, 1080), r("a", 10, 10, 20, 20), r("b", 20, 20, 20, 20)];
    const out = msgs(auditRects(boxes, { ignore: ["backdrop"] }));
    expect(out.every((m) => !m.includes("backdrop"))).toBe(true);
    expect(out.some((m) => m.includes("overlap: a and b") || m.includes("overlap: b and a"))).toBe(true);
  });
});
