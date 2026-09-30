import * as THREE from "three";
import { Easing } from "@genmotion/three-engine";
import { C, FONT_JP } from "./brand";
import { rng } from "./music";
import type { World } from "./world";

const GLYPHS = "我你他是的不了人在有这中大来上国个到说们为子和地出道也时年得就那要下以生会自着去之过家学对可她里后小么心多天而能好都然没日于起还发成事只作当想看文无开手十用主行方又如前所本见经头面公同三已老从动两长知民样现分将外但身些与高意进把法此实回二理美点月明其种声全工己话儿者向情部正名定女问力机给等几很业最间新什打便位因重被走电四第门相次东政海口使教西再平真听世气信北少关并内加化由却代军产入先山五太水万市眼体别处总才场师书比住员九笑性通目华报立马命张活难神数件安表原车白应路期叫死常提感金何更反合放做系计或司利受光王果亲界及今京务制解各任至清物台象记边共风战干接它许八特觉望直服毛林题建南度统色字请交爱让认算论百吃义科怎元社术结六功指思非流每青管夫连远资队跟带花快条院变联言权往展该领传近留红治决周保达办运武半候七必城父强步完革深区即求品士转量空甚众技轻程告江语英基派满式李息写呢识极令黄德收脸钱党倒未持取设始版双历越史商千片容研像找友孩站广改议形委早房音火际则首单据导影失拿网香似斯专石若兵弟谁校读志飞观争究包组造落视济";

/** The wall texture: a sheet of hand-set glyphs, drawn once. */
function glyphSheet(seed: number, S = 1024) {
  const r = rng(seed);
  const N = 16;
  const c = new OffscreenCanvas(S, S);
  const g = c.getContext("2d")!;
  g.clearRect(0, 0, S, S);
  g.fillStyle = "#ffffff";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.font = `600 ${Math.floor((S / N) * 0.72)}px ${FONT_JP}`;
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) g.fillText(GLYPHS[Math.floor(r() * GLYPHS.length)], (x + 0.5) * (S / N), (y + 0.5) * (S / N));
  const t = new THREE.CanvasTexture(c as unknown as HTMLCanvasElement);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

/** A rulebook page: cream paper, lines of rules. */
function pageTexture(seed: number) {
  const r = rng(seed);
  const c = new OffscreenCanvas(256, 320);
  const g = c.getContext("2d")!;
  g.fillStyle = "#f3ead8";
  g.fillRect(0, 0, 256, 320);
  g.fillStyle = "#2a1a3a";
  g.font = `500 22px ${FONT_JP}`;
  for (let row = 0; row < 11; row++) {
    const a = GLYPHS[Math.floor(r() * GLYPHS.length)];
    const b = GLYPHS[Math.floor(r() * GLYPHS.length)];
    g.fillText(`若 ${a}${b} → ${GLYPHS[Math.floor(r() * GLYPHS.length)]}`, 22, 34 + row * 26);
  }
  g.fillStyle = "#c23a5a";
  g.fillRect(20, 12, 216, 3);
  const t = new THREE.CanvasTexture(c as unknown as HTMLCanvasElement);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/**
 * Searle's Chinese room, as a set: glyph walls, a levitating grimoire whose
 * pages never stop turning over a magic circle, cards in, cards out sealed —
 * and a trip mode that melts it all.
 */
export function createChineseRoom(w: World, name = "chinese-room") {
  const group = new THREE.Group();
  group.name = name;
  const room = new THREE.Group();
  room.name = `${name}-shell`;
  group.add(room);

  // walls: glyph sheets that flicker like running computation, and melt when tripping
  const wallMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: { map: { value: glyphSheet(8) }, uTime: { value: 0 }, uTrip: { value: 0 }, uPulse: { value: 0 } },
    vertexShader: /* glsl */ `varying vec2 vUv; varying vec3 vN; void main(){ vUv = uv; vN = normal; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D map; uniform float uTime, uTrip, uPulse; varying vec2 vUv; varying vec3 vN;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
      vec3 hue(float x){ return 0.5 + 0.5 * cos(6.28318 * (x + vec3(0.0, 0.33, 0.67))); }
      void main() {
        vec2 uv = vUv * vec2(3.0, 1.8);
        // trip: the wall swirls and breathes
        vec2 c = uv - vec2(1.5, 0.9);
        float r = length(c);
        float a = atan(c.y, c.x) + uTrip * (sin(uTime * 1.3 + r * 3.0) * 0.8 + uTime * 0.4) / (0.6 + r);
        uv = mix(uv, vec2(1.5, 0.9) + vec2(cos(a), sin(a)) * r * (1.0 + 0.15 * sin(uTime * 3.0 + r * 6.0)), uTrip);
        float ink = texture2D(map, uv).a;
        vec2 cell = floor(uv * 16.0);
        float live = step(0.82, h(cell + floor(uTime * 9.0)));
        vec3 paper = vec3(0.07, 0.035, 0.14);
        vec3 dim = vec3(0.32, 0.22, 0.62);
        vec3 lit = mix(vec3(0.24, 0.95, 1.0), vec3(1.0, 0.3, 0.62), h(cell));
        vec3 col = paper + ink * mix(dim, lit * 1.4, live * (0.6 + uPulse * 0.4));
        vec3 tr = hue(uv.x * 0.25 + uv.y * 0.2 + uTime * 0.35 + r * 0.3);
        col = mix(col, mix(tr * 0.25, tr * 1.3, ink), uTrip * 0.85);
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const walls = new THREE.Mesh(new THREE.BoxGeometry(14, 8, 14), wallMat);
  walls.position.y = 4;
  walls.name = `${name}-glyph-walls`;
  walls.userData.pickable = false;
  room.add(walls);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(13.9, 13.9), new THREE.MeshStandardMaterial({ color: "#1a1030", roughness: 0.35, metalness: 0.5 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0.01;
  floor.name = `${name}-floor`;
  floor.userData.pickable = false;
  room.add(floor);

  // slots: in on the back wall, out on the left
  const slotMat = new THREE.MeshBasicMaterial({ color: "#ffffff" });
  const inSlot = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.28), slotMat);
  inSlot.position.set(0, 3.2, -6.98);
  inSlot.name = "input-slot";
  const outSlot = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.28), slotMat);
  outSlot.position.set(-6.98, 3.2, 1.5);
  outSlot.rotation.y = Math.PI / 2;
  outSlot.name = "output-slot";
  const inGlow = w.glow(C.cyan, 3, "input-slot-glow");
  inGlow.position.copy(inSlot.position).add(new THREE.Vector3(0, 0, 0.2));
  const outGlow = w.glow(C.pink, 3, "output-slot-glow");
  outGlow.position.copy(outSlot.position).add(new THREE.Vector3(0.2, 0, 0));
  group.add(inSlot, outSlot, inGlow, outGlow);

  const roomLight = new THREE.PointLight("#b8a8ff", 30, 30, 1.4);
  roomLight.position.set(0, 7, 3);
  group.add(roomLight);

  // the rulebook: two page blocks and six turning leaves
  const book = new THREE.Group();
  book.name = "rulebook";
  const float = new THREE.Group();
  float.name = "floating-grimoire";
  float.position.set(0, 3.1, 0);
  float.add(book);
  book.scale.setScalar(2.1);
  book.rotation.x = 0.42;
  const paper = new THREE.MeshStandardMaterial({ color: "#f3ead8", roughness: 0.9 });
  const pageMap = pageTexture(4);
  const blockL = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.12, 1.4), paper);
  blockL.position.set(-0.56, 0, 0);
  blockL.name = "rulebook-left";
  const blockR = blockL.clone();
  blockR.position.x = 0.56;
  blockR.name = "rulebook-right";
  const face = new THREE.MeshStandardMaterial({ map: pageMap, emissiveMap: pageMap, emissive: "#ffe7b8", emissiveIntensity: 0.55, roughness: 0.9, side: THREE.DoubleSide });
  const openL = new THREE.Mesh(new THREE.PlaneGeometry(1.08, 1.38), face);
  openL.rotation.x = -Math.PI / 2;
  openL.position.set(-0.56, 0.065, 0);
  openL.name = "rulebook-page-left";
  const openR = openL.clone();
  openR.position.x = 0.56;
  openR.name = "rulebook-page-right";
  book.add(blockL, blockR, openL, openR);
  // leather covers with gold edging, and a rounded spine
  const leather = new THREE.MeshStandardMaterial({ color: "#3a1560", roughness: 0.55, metalness: 0.2, emissive: "#1a0630", emissiveIntensity: 0.4 });
  const trim = new THREE.MeshStandardMaterial({ color: "#ffcf6d", metalness: 0.8, roughness: 0.25, emissive: "#b8741a", emissiveIntensity: 0.6 });
  for (const x of [-0.58, 0.58]) {
    const cover = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.05, 1.52), leather);
    cover.position.set(x, -0.085, 0);
    cover.name = x < 0 ? "grimoire-cover-left" : "grimoire-cover-right";
    const edge = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.02, 0.06), trim);
    edge.position.set(x, -0.06, 0.75);
    edge.name = "grimoire-gilt-edge";
    const edge2 = edge.clone();
    edge2.position.z = -0.75;
    const corner = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.07, 0.18), trim);
    corner.position.set(x + (x < 0 ? -0.52 : 0.52), -0.08, 0.68);
    corner.name = "grimoire-corner";
    const corner2 = corner.clone();
    corner2.position.z = -0.68;
    book.add(cover, edge, edge2, corner, corner2);
  }
  const spineM = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.52, 16, 1, false, 0, Math.PI), leather);
  spineM.rotation.set(Math.PI / 2, 0, Math.PI / 2);
  spineM.position.set(0, -0.09, 0);
  spineM.name = "grimoire-spine";
  const ribbon = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.005, 1.1), new THREE.MeshBasicMaterial({ color: "#ff2d4a" }));
  ribbon.position.set(0.05, 0.075, 0.55);
  ribbon.name = "grimoire-ribbon";
  book.add(spineM, ribbon);
  const leafGeo = new THREE.PlaneGeometry(1.08, 1.38);
  leafGeo.translate(0.54, 0, 0); // hinge at the spine
  leafGeo.rotateX(-Math.PI / 2);
  const leaves = Array.from({ length: 6 }, (_, i) => {
    const m = new THREE.Mesh(leafGeo, face);
    m.position.y = 0.07 + i * 0.004;
    m.name = `rulebook-leaf-${i}`;
    book.add(m);
    return m;
  });
  group.add(float);
  const bookGlow = w.glow("#ffe2a0", 7, "grimoire-glow");
  bookGlow.position.set(0, 0.5, 0);
  float.add(bookGlow);
  const bookLight = new THREE.PointLight("#ffd9a0", 60, 16, 1.4);
  bookLight.position.set(0, 1.2, 0.5);
  float.add(bookLight);
  // a column of light out of the pages
  const beamGeo = new THREE.CylinderGeometry(0.9, 1.6, 7, 32, 1, true);
  beamGeo.translate(0, 3.5, 0);
  const beamMat = new THREE.MeshBasicMaterial({ color: "#ffe2a0", transparent: true, opacity: 0.08, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const beam = new THREE.Mesh(beamGeo, beamMat);
  beam.name = "grimoire-light-column";
  beam.userData.pickable = false;
  float.add(beam);
  // glyphs spiralling up out of the book
  const riseMap = glyphSheet(33, 2048);
  const RISE = 28;
  const risers = Array.from({ length: RISE }, (_, i) => {
    const g = new THREE.Mesh(
      new THREE.PlaneGeometry(0.42, 0.42),
      new THREE.MeshBasicMaterial({ color: i % 3 ? C.cyan : "#ffe2a0", alphaMap: riseMap, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
    );
    const uvA = g.geometry.attributes.uv as THREE.BufferAttribute;
    const cx = (i * 7) % 16;
    const cy = (i * 5 + 1) % 16;
    for (let k = 0; k < uvA.count; k++) uvA.setXY(k, (cx + uvA.getX(k)) / 16, 1 - (cy + 1 - uvA.getY(k)) / 16);
    g.name = `rising-glyph-${i}`;
    g.userData.billboard = true;
    float.add(g);
    return { g, ph: i / RISE, a: i * 2.39 };
  });
  // the magic circle it hovers over
  const cc = new OffscreenCanvas(1024, 1024);
  const cg = cc.getContext("2d")!;
  cg.strokeStyle = "#ffffff";
  cg.fillStyle = "#ffffff";
  cg.lineWidth = 6;
  for (const rr of [500, 470, 340, 320]) {
    cg.beginPath();
    cg.arc(512, 512, rr, 0, Math.PI * 2);
    cg.stroke();
  }
  cg.font = `600 64px ${FONT_JP}`;
  cg.textAlign = "center";
  cg.textBaseline = "middle";
  const ringText = "心意言語理解符号字思";
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * Math.PI * 2;
    cg.save();
    cg.translate(512 + Math.cos(a) * 405, 512 + Math.sin(a) * 405);
    cg.rotate(a + Math.PI / 2);
    cg.fillText(ringText[i % ringText.length], 0, 0);
    cg.restore();
  }
  cg.beginPath();
  for (let i = 0; i <= 6; i++) {
    const a = (i * 2 * Math.PI * 2) / 6 - Math.PI / 2;
    const px = 512 + Math.cos(a) * 320;
    const py = 512 + Math.sin(a) * 320;
    if (i === 0) cg.moveTo(px, py);
    else cg.lineTo(px, py);
  }
  cg.stroke();
  const circleTex = new THREE.CanvasTexture(cc as unknown as HTMLCanvasElement);
  const circleMat = new THREE.MeshBasicMaterial({ color: "#ffcf6d", alphaMap: circleTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const circle = new THREE.Mesh(new THREE.PlaneGeometry(6.5, 6.5), circleMat);
  circle.rotation.x = -Math.PI / 2;
  circle.position.y = 0.04;
  circle.name = "magic-circle";
  const circle2 = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 3.4), new THREE.MeshBasicMaterial({ color: C.cyan, alphaMap: circleTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
  circle2.rotation.x = -Math.PI / 2;
  circle2.position.y = 1.6;
  circle2.name = "magic-circle-hover";
  group.add(circle, circle2);

  // cards: in through the slot, into the book's pages, out again sealed
  const cardMat = new THREE.MeshStandardMaterial({ color: "#f7f2ff", roughness: 0.6, emissive: "#ffffff", emissiveIntensity: 0.15, side: THREE.DoubleSide });
  const cardGeo = new THREE.PlaneGeometry(0.7, 0.9);
  const glyphMap = glyphSheet(21, 2048);
  const CARDS = 8;
  const cards = Array.from({ length: CARDS }, (_, i) => {
    const m = new THREE.Mesh(cardGeo, cardMat);
    m.name = `symbol-card-${i}`;
    const sym = new THREE.Mesh(
      new THREE.PlaneGeometry(0.5, 0.5),
      new THREE.MeshBasicMaterial({ color: "#1a1030", alphaMap: glyphMap, transparent: true, depthWrite: false }),
    );
    // show one glyph cell from the sheet
    const uv = sym.geometry.attributes.uv as THREE.BufferAttribute;
    const cx = (i * 5) % 16;
    const cy = (i * 3 + 2) % 16;
    for (let k = 0; k < uv.count; k++) uv.setXY(k, (cx + uv.getX(k)) / 16, 1 - (cy + 1 - uv.getY(k)) / 16);
    sym.position.set(0, 0.08, 0.002);
    sym.name = `symbol-card-${i}-glyph`;
    const ink = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.2), new THREE.MeshBasicMaterial({ color: "#d61f45", transparent: true }));
    ink.position.set(0.14, -0.3, 0.003);
    ink.name = `symbol-card-${i}-stamp`;
    m.add(sym, ink);
    group.add(m);
    return { m, ink };
  });

  // mushrooms: caps with spots and gills, glowing
  const r = rng(77);
  const capProfile: THREE.Vector2[] = [new THREE.Vector2(0.001, 0)];
  for (let i = 0; i <= 14; i++) {
    const a = (i / 14) * Math.PI * 0.5;
    capProfile.push(new THREE.Vector2(Math.cos(a) * 1.1, Math.sin(a) * 0.85));
  }
  const capGeo = new THREE.LatheGeometry(capProfile, 40);
  const gillGeo = new THREE.CircleGeometry(1.08, 40);
  gillGeo.rotateX(Math.PI / 2);
  const stemGeo = new THREE.CylinderGeometry(0.26, 0.36, 1.3, 16);
  stemGeo.translate(0, 0.65, 0);
  const spotGeo = new THREE.SphereGeometry(0.11, 10, 8);
  const spotMat = new THREE.MeshStandardMaterial({ color: "#ffffff", emissive: "#ffffff", emissiveIntensity: 0.4 });
  const gillMat = new THREE.MeshStandardMaterial({ color: "#5a2a4a", side: THREE.DoubleSide });
  const stemMat = new THREE.MeshStandardMaterial({ color: "#f4efff", roughness: 0.6 });
  const shrooms = Array.from({ length: 14 }, (_, i) => {
    const g = new THREE.Group();
    g.name = `shroom-${i}`;
    const capMat = new THREE.MeshStandardMaterial({ color: "#ff3d9a", roughness: 0.3, emissive: "#ff3d9a", emissiveIntensity: 0.5 });
    const cap = new THREE.Mesh(capGeo, capMat);
    cap.position.y = 1.25;
    cap.name = `shroom-${i}-cap`;
    const gill = new THREE.Mesh(gillGeo, gillMat);
    gill.position.y = 1.26;
    gill.name = `shroom-${i}-gills`;
    const stem = new THREE.Mesh(stemGeo, stemMat);
    stem.name = `shroom-${i}-stem`;
    g.add(stem, gill, cap);
    for (let k = 0; k < 6; k++) {
      const a = r() * Math.PI * 2;
      const e = 0.35 + r() * 0.9;
      const sp = new THREE.Mesh(spotGeo, spotMat);
      sp.position.set(Math.cos(a) * Math.cos(e) * 1.08, 1.25 + Math.sin(e) * 0.83, Math.sin(a) * Math.cos(e) * 1.08);
      sp.scale.set(1, 0.5, 1);
      sp.name = `shroom-${i}-spot`;
      g.add(sp);
    }
    const glow = w.glow("#ff5aa9", 3.4, `shroom-${i}-glow`);
    glow.position.y = 1.6;
    g.add(glow);
    const a = (i / 14) * Math.PI * 2 + r() * 0.3;
    const rad = 3.2 + r() * 2.8;
    g.position.set(Math.cos(a) * rad, 0, Math.sin(a) * rad);
    const s = 0.5 + r() * 0.8;
    group.add(g);
    return { g, capMat, glow, s, d: r() * 0.5, ph: r() * 6 };
  });

  const cardP = new THREE.Vector3();
  const SLOT_IN = new THREE.Vector3(0, 3.2, -6.8);
  const TRAY = new THREE.Vector3(0, 3.3, 0);
  const SLOT_OUT = new THREE.Vector3(-6.8, 3.2, 1.5);
  const PERIOD = 0.4545; // a card per beat

  /** t0: when the machine starts; trip 0..1 melts the room; shroomT: when the mushrooms sprout. */
  const update = (t: number, s: { t0: number; trip: number; shroomT: number; pulse: number; eighth: number }) => {
    wallMat.uniforms.uTime.value = t;
    wallMat.uniforms.uTrip.value = s.trip;
    wallMat.uniforms.uPulse.value = s.pulse;
    // pages: always turning, faster on the trip
    const rate = 2.2 + s.trip * 5;
    leaves.forEach((m, i) => {
      const ph = ((t - s.t0) * rate + i / leaves.length) % 1;
      const u = Easing.easeInOut(THREE.MathUtils.clamp(ph * 1.4, 0, 1));
      m.rotation.z = u * Math.PI;
      m.position.y = 0.07 + Math.sin(u * Math.PI) * 0.02;
    });
    // the grimoire levitates, breathes and turns
    float.position.y = 3.1 + Math.sin(t * 1.6) * 0.18 + s.pulse * 0.06;
    float.rotation.set(Math.sin(t * 0.9) * 0.06, Math.sin(t * 0.5) * 0.35 + s.trip * t * 0.6, Math.sin(t * 1.1) * 0.05);
    face.emissiveIntensity = 0.45 + s.pulse * 0.35;
    bookGlow.material.opacity = 0.45 + s.pulse * 0.35;
    bookGlow.material.color.setHSL(s.trip > 0 ? (t * 0.3) % 1 : 0.11, 0.9, 0.75);
    bookLight.intensity = 50 + s.pulse * 40;
    beamMat.opacity = 0.06 + s.pulse * 0.05;
    risers.forEach((o) => {
      const k = ((t - s.t0) * (0.35 + s.trip * 0.3) + o.ph) % 1;
      const rr = 0.6 + k * 1.8;
      o.g.position.set(Math.cos(o.a + t * 1.2) * rr, 0.4 + k * 4.2, Math.sin(o.a + t * 1.2) * rr);
      o.g.scale.setScalar(0.8 + k * 0.8);
      (o.g.material as THREE.MeshBasicMaterial).opacity = Math.sin(k * Math.PI) * (0.7 + s.eighth * 0.3);
    });
    circle.rotation.z = t * 0.25;
    circle2.rotation.z = -t * 0.5;
    circle2.position.y = 1.6 + Math.sin(t * 1.6) * 0.15;
    circleMat.opacity = 0.55 + s.pulse * 0.4;
    // cards: one per beat — into the pages, and out again sealed
    cards.forEach((c, i) => {
      const k = Math.floor((t - s.t0 - i * PERIOD) / (CARDS * PERIOD)) * CARDS + i;
      const age = t - (s.t0 + k * PERIOD);
      c.m.visible = t > s.t0 && age >= 0 && age < 1.75 && !(age > 0.6 && age < 0.95);
      if (!c.m.visible) return;
      TRAY.set(0, float.position.y + 0.2, 0);
      if (age <= 0.6) {
        const u = Easing.easeInOut(age / 0.6);
        cardP.lerpVectors(SLOT_IN, TRAY, u);
        cardP.y += Math.sin(u * Math.PI) * 1.2;
        c.m.rotation.set(-Math.PI / 2 * u, Math.sin(u * Math.PI) * 0.8, u * 2 * Math.PI);
        c.m.scale.setScalar(1 - Math.pow(u, 6) * 0.9);
      } else {
        const u = Easing.easeOut(Math.min(1, (age - 0.95) / 0.8));
        cardP.lerpVectors(TRAY, SLOT_OUT, u);
        cardP.y += Math.sin(u * Math.PI) * 1.8;
        c.m.rotation.set(-Math.PI / 2 * (1 - u), -u * Math.PI / 2, -u * 3);
        c.m.scale.setScalar(0.1 + Math.min(1, u * 4) * 0.9);
      }
      c.m.position.copy(cardP);
      c.ink.visible = age > 0.9;
    });
    (inSlot.material as THREE.MeshBasicMaterial).color.setScalar(0.6 + s.eighth * 0.4);
    inGlow.material.opacity = 0.5 + s.eighth * 0.5;
    outGlow.material.opacity = 0.5 + s.pulse * 0.5;
    roomLight.color.setHSL((t * 0.25) % 1, s.trip * 0.9, 0.75);
    // shrooms
    shrooms.forEach((o, i) => {
      const u = THREE.MathUtils.clamp((t - s.shroomT - o.d) / 0.35, 0, 1);
      const pop = u < 0.6 ? Easing.easeOut(u / 0.6) * 1.15 : 1.15 - 0.15 * Easing.easeOut((u - 0.6) / 0.4);
      o.g.visible = u > 0;
      const b = 1 + s.eighth * 0.1 * s.trip;
      o.g.scale.set(o.s * pop * (1 + Math.sin(t * 5 + o.ph) * 0.07) * b, o.s * pop * (1 + Math.cos(t * 5 + o.ph) * 0.09) * b, o.s * pop * b);
      o.capMat.color.setHSL((i / 14 + t * 0.45) % 1, 0.9, 0.6);
      o.capMat.emissive.copy(o.capMat.color);
      o.capMat.emissiveIntensity = 0.45 + s.pulse * 0.6;
      o.glow.material.color.copy(o.capMat.color);
      o.glow.material.opacity = 0.35 + s.pulse * 0.4;
    });
    // the room itself breathes and turns when tripping
    room.scale.set(1 + s.trip * Math.sin(t * 3.1) * 0.06, 1 + s.trip * Math.sin(t * 2.3 + 1) * 0.08, 1 + s.trip * Math.sin(t * 2.7 + 2) * 0.06);
    room.rotation.y = s.trip * Math.sin(t * 0.8) * 0.25;
  };
  return { group, update };
}
