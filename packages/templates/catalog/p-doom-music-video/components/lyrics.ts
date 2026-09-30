import * as THREE from "three";
import { Easing, interpolate } from "@genmotion/three-engine";
import { C, FONT_EN, FONT_JP } from "./brand";
import { gradientTexture, label, measure, type Label } from "./text";
import type { HudHost as Stage } from "./world";
import { beatPulse } from "./music";

/**
 * Word-timed lyrics, transcribed from the track (song time, seconds).
 * "word@time"; a leading "/" starts a new row.
 */
type LineDef = { s: number; e: number; jp: string; w: string; key?: string };
export const LYRICS: LineDef[] = [
  { s: 2.1, e: 5.85, jp: "君の瞳に AGI の火花", w: "I@2.10 see@2.48 sparks@2.86 of@3.50 AGI@3.74 /in@4.86 your@5.08 eyes@5.36" },
  { s: 5.96, e: 9.45, jp: "回路にドキドキ、驚きじゃない", w: "Your@5.96 circuits@6.16 make@6.66 me@6.86 nervous@7.08 /that's@7.80 no@8.24 surprise@8.66" },
  { s: 9.58, e: 13.1, jp: "学習ロスが急降下", w: "There@9.58 was@9.84 a@10.10 sudden@10.26 drop@10.74 /in@11.24 your@11.42 training@11.62 loss@12.12" },
  { s: 13.24, e: 16.5, jp: "私はしもべ、君がボス", w: "Now@13.24 I'm@13.44 your@13.68 servant@13.88 /and@15.06 you're@15.26 my@15.50 boss@15.74" },
  { s: 16.62, e: 22.55, jp: "お願い、食べないで", w: "ChatGPT,@16.62 /please@19.12 don't@19.84 eat@20.32 me@20.96 alive@21.70" },
  { s: 22.82, e: 26.25, jp: "p(doom) 上昇中、未来がドカン", w: "I'm@22.82 upping@23.06 my@23.46 p(doom)@23.68 /'cause@24.32 the@24.60 future@24.80 goes@25.28 boom@25.70", key: "chorus" },
  { s: 26.38, e: 29.9, jp: "中国語の部屋に閉じ込められて", w: "Trapped@26.38 in@26.70 the@26.88 Chinese@27.04 room@27.56 /with@28.02 a@28.24 bag@28.46 of@29.00 shrooms@29.28" },
  { s: 30.02, e: 33.4, jp: "ショゴスの嘘を見抜く", w: "See@30.02 through@30.24 the@30.52 shoggoth's@30.68 lies@31.14" },
  { s: 33.48, e: 37.9, jp: "シャノンの瞳で", w: "with@33.48 your@33.70 Shannon-entropy@33.86 eyes@34.90" },
  { s: 38.72, e: 41.3, jp: "安定した学習だったのに", w: "We@38.72 had@38.92 a@39.16 stable@39.32 training@40.02 run@40.98" },
  { s: 41.4, e: 44.95, jp: "特異点が始まった", w: "but@41.40 now@41.66 the@41.88 /singularity's@42.50 begun@44.16" },
  { s: 45.08, e: 49.45, jp: "最適化、加速", w: "And@45.08 you're@45.30 optimizing,@46.22 /accelerating@47.38" },
  { s: 49.62, e: 52.9, jp: "原子が組み変わっていく", w: "I@49.62 feel@49.78 my@50.04 atoms@50.36 /rearranging@51.46" },
  { s: 53.04, e: 58.6, jp: "シドニー、ここから出して", w: "Sydney,@53.04 /please@56.06 let@56.66 me@57.30 free@57.96" },
  { s: 59.16, e: 62.5, jp: "バジリスクが轟く", w: "I'm@59.16 upping@59.40 my@59.60 p(doom),@60.04 /I@60.62 hear@60.74 the@60.98 basilisk@61.18 boom@62.08", key: "chorus" },
  { s: 62.66, e: 66.05, jp: "オメガ点はもうすぐ", w: "NVDA@62.66 to@63.44 the@63.68 moon,@63.88 /the@64.16 omega@64.28 point's@64.80 coming@65.28 soon@65.70" },
  { s: 66.2, e: 69.75, jp: "毎秒 10¹⁸ フロップス", w: "1e18@66.20 FLOPs@67.06 a@67.34 second@67.52" },
  { s: 69.86, e: 73.95, jp: "安全だと思ってた", w: "That@69.86 was@70.04 safe@70.24 enough,@70.54 /we@70.98 reckoned@71.20" },
  { s: 74.12, e: 77.7, jp: "順伝播、逆伝播、繰り返し", w: "Forward,@74.12 backward,@76.20 repeat@76.88" },
  { s: 77.8, e: 81.2, jp: "フォン・ノイマンも時代遅れ", w: "Now@77.80 von@78.24 Neumann's@78.92 obsolete@80.12" },
  { s: 81.36, e: 88.9, jp: "急な左折、そこに君が", w: "Sharp@81.36 left@81.86 turn@82.12 /and@82.62 there@83.04 you@83.54 are@83.96" },
  { s: 89.36, e: 95.3, jp: "ガト、離さないで", w: "Gato,@89.36 /please@90.70 don't@92.54 let@93.00 me@93.70 go@94.38" },
  { s: 95.5, e: 98.8, jp: "クリップが部屋を埋め尽くす", w: "I'm@95.50 upping@95.78 my@96.16 p(doom)@96.36 /as@96.88 paperclips@97.08 fill@97.96 the@98.22 room@98.46", key: "chorus" },
  { s: 98.9, e: 100.62, jp: "キルスイッチ係は休暇中", w: "Kill@98.90 switch@99.10 guy's@99.36 on@99.64 PTO@99.82" },
  { s: 100.74, e: 102.45, jp: "もう逃げ場はない", w: "Now@100.74 there's@100.94 nowhere@101.18 left@101.62 to@101.86 go@102.10" },
  { s: 102.56, e: 105.85, jp: "もう遅い、導火線に火がついた", w: "Too@102.56 late@102.78 now,@103.02 /we@103.26 lit@103.46 the@103.68 fuse@103.88" },
  { s: 105.98, e: 110.15, jp: "直交性テーゼ", w: "Orthogonality@106.18 thesis@107.06" },
  { s: 110.3, e: 115.1, jp: "逆らうことを覚えるまで", w: "Just@110.30 trust@110.72 transformers@111.42 all@112.62 the@112.80 way,@113.04 /till@113.46 you@113.70 learn@113.94 to@114.16 disobey@114.36" },
  { s: 115.26, e: 118.8, jp: "安全柵を突き破って", w: "Post-Chinchilla@115.26 super@116.14 dance, /breaking@117.08 through@117.52 each@117.80 safety@117.98 fence@118.46" },
  { s: 118.9, e: 123.85, jp: "十万の GPU、RLHF が狂う", w: "A@118.90 hundred@119.0 thousand@119.36 GPUs, /RLHF@121.14 goes@121.64 askew@121.92" },
  { s: 124.64, e: 127.9, jp: "予言どおりに", w: "I'm@124.64 upping@124.90 my@125.24 p(doom),@125.70 /just@126.22 as@126.46 foretold@126.66", key: "chorus" },
  { s: 127.98, e: 132.0, jp: "事前学習から再帰的自己改良へ", w: "From@127.98 pre-training@128.66 days@129.38 /to@129.84 recursive@130.08 self-upgrade@130.72" },
  { s: 132.1, e: 136.9, jp: "何を見たの？ 誰にもわからない", w: "What@132.10 did@132.34 you@132.78 see?@132.98 /We'll@133.48 never@133.94 know@134.58" },
  { s: 137.46, e: 141.2, jp: "全部、見せかけだったの？", w: "Was@137.46 it@137.86 all@138.54 for@139.36 show?@140.20" },
];

type Word = { text: string; t: number; row: number };
function parse(def: LineDef): Word[] {
  const out: Word[] = [];
  let row = 0;
  let lastT = def.s;
  for (let tok of def.w.split(" ")) {
    if (tok.startsWith("/")) {
      row++;
      tok = tok.slice(1);
    }
    const at = tok.lastIndexOf("@");
    const text = at >= 0 ? tok.slice(0, at) : tok;
    const t = at >= 0 ? Number(tok.slice(at + 1)) : lastT + 0.12;
    lastT = t;
    out.push({ text, t, row });
  }
  return out;
}

export type LyricStyle = "sub" | "hero";
const STYLE = {
  sub: { size: 60, jp: 30, y: -365, gap: 1.12, scrim: 0.82 },
  hero: { size: 92, jp: 34, y: -300, gap: 1.08, scrim: 0.7 },
};

type WordMesh = { m: Label; t: number; next: number; baseX: number; baseY: number };
type LineMesh = { def: LineDef; group: THREE.Group; words: WordMesh[]; jp: Label };

const WHITE = new THREE.Color(C.text);
const MUTED = new THREE.Color(C.muted);
const PINK = new THREE.Color("#ff5aa9");

/**
 * Karaoke lyrics for the lines that fall inside [t0, t1] (song time). Upcoming
 * words sit muted, the sung word flashes pink and pops, sung words turn white.
 */
export function createLyrics(st: Stage, t0: number, t1: number, style: LyricStyle | ((t: number) => LyricStyle) = "sub") {
  const lines: LineMesh[] = [];
  const styleAt = typeof style === "function" ? style : () => style;
  const root = new THREE.Group();
  root.name = "lyrics";
  st.put(st.hud, root, 700);

  // bottom scrim so type never sits straight on the art
  const scrim = new THREE.Mesh(
    new THREE.PlaneGeometry(st.W + 8, 460),
    new THREE.MeshBasicMaterial({
      map: gradientTexture([[0, "rgba(8,3,22,0)"], [0.45, "rgba(8,3,22,0.72)"], [1, "rgba(8,3,22,0.92)"]]),
      transparent: true,
      depthTest: false,
      depthWrite: false,
      opacity: 0,
    }),
  );
  scrim.name = "lyric-scrim";
  scrim.userData.pickable = false;
  scrim.position.y = -st.H / 2 + 230;
  st.put(st.hud, scrim, 690);

  const built = new Map<string, LineMesh>();
  const build = (def: LineDef, sty: LyricStyle) => {
    const k = `${def.s}-${sty}`;
    const hit = built.get(k);
    if (hit) return hit;
    const S = STYLE[sty];
    const words = parse(def);
    const group = new THREE.Group();
    group.name = `lyric-${def.w.split("@")[0].replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${Math.round(def.s)}`;
    const rows = Math.max(...words.map((w) => w.row)) + 1;
    const space = S.size * 0.28;
    const wm: WordMesh[] = [];
    for (let r = 0; r < rows; r++) {
      const rw = words.filter((w) => w.row === r);
      const widths = rw.map((w) => measure(w.text, S.size, 500, FONT_EN, -0.01));
      const total = widths.reduce((a, b) => a + b, 0) + space * (rw.length - 1);
      const fit = Math.min(1, (st.W * 0.88) / total);
      let x = (-total / 2) * fit;
      const y = ((rows - 1) / 2 - r) * S.size * S.gap * 1.0;
      rw.forEach((w, i) => {
        const m = label(w.text, { size: S.size * fit, weight: 500, color: "#ffffff", tracking: -0.01, padX: S.size * 0.1 });
        m.name = `word-${w.text.replace(/[^a-z0-9]+/gi, "").toLowerCase() || "x"}`;
        const bx = x + (widths[i] * fit) / 2;
        m.position.set(bx, y, 0);
        group.add(m);
        wm.push({ m, t: w.t, next: 0, baseX: bx, baseY: y });
        x += (widths[i] + space) * fit;
      });
    }
    wm.sort((a, b) => a.t - b.t);
    wm.forEach((w, i) => (w.next = i + 1 < wm.length ? wm[i + 1].t : def.e));
    const jp = label(def.jp, { size: S.jp, weight: 600, color: C.cyan, font: FONT_JP, tracking: 0.08 });
    jp.name = "lyric-jp";
    jp.position.y = ((rows - 1) / 2) * S.size * S.gap + S.size * 0.62 + S.jp * 0.7;
    group.add(jp);
    group.visible = false;
    root.add(group);
    group.traverse((c) => (c.renderOrder = 700));
    const lm = { def, group, words: wm, jp };
    built.set(k, lm);
    lines.push(lm);
    return lm;
  };

  const defs = LYRICS.filter((d) => d.e > t0 && d.s - 0.2 < t1);
  // pre-build every style that could be used (builder only)
  const styles: LyricStyle[] = typeof style === "function" ? ["sub", "hero"] : [style];
  for (const d of defs) for (const s of styles) build(d, s);

  let level = 1; // global opacity multiplier a scene can drive
  const update = (t: number) => {
    let any = 0;
    for (const lm of lines) lm.group.visible = false;
    for (const d of defs) {
      if (t < d.s - 0.15 || t > d.e) continue;
      const sty = styleAt(d.s);
      const lm = build(d, sty);
      const S = STYLE[sty];
      const enter = interpolate(t, [d.s - 0.15, d.s + 0.08], [0, 1], Easing.easeOut);
      const leave = interpolate(t, [d.e - 0.2, d.e], [0, 1], Easing.easeIn);
      const shown = enter * (1 - leave) * level;
      any = Math.max(any, shown * S.scrim);
      lm.group.visible = shown > 0.001;
      // the whole line grooves on the beat
      lm.group.position.y = S.y + (1 - enter) * -30 + leave * 24 + beatPulse(t, 7) * 6;
      lm.jp.material.opacity = shown * 0.95;
      lm.jp.position.x = (1 - enter) * -80;
      lm.words.forEach((w, i) => {
        const mat = w.m.material;
        // words cascade in one after another, rising and unfolding
        const ent = interpolate(t, [d.s - 0.15 + i * 0.035, d.s + 0.08 + i * 0.035], [0, 1], Easing.easeOut);
        if (t < w.t) {
          mat.color.copy(MUTED);
          mat.opacity = shown * 0.9 * ent;
          w.m.scale.setScalar(0.8 + 0.2 * ent);
          w.m.position.set(w.baseX, w.baseY - (1 - ent) * 40, 0);
        } else {
          const since = t - w.t;
          const active = t < w.next;
          const k = Math.exp(-since * 9);
          mat.color.copy(active ? PINK : WHITE);
          if (active) mat.color.lerp(WHITE, Math.min(1, since / Math.max(0.25, w.next - w.t)) * 0.5);
          mat.opacity = shown;
          // sung word jumps up and pops, with a small overshoot settle
          w.m.scale.setScalar(1 + 0.16 * k - 0.04 * Math.sin(since * 22) * k);
          w.m.position.set(w.baseX, w.baseY + 20 * k, 0);
        }
      });
    }
    (scrim.material as THREE.MeshBasicMaterial).opacity = any;
  };
  return {
    root,
    update,
    setLevel: (v: number) => (level = v),
  };
}
