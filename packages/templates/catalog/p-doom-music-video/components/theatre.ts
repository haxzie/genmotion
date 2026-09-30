import * as THREE from "three";
import { rng } from "./music";
import { stars } from "./motion";
import type { World } from "./world";

/** Where the stage sits, and the camera pose scene 11 ends on and the finale opens on. */
export const STAGE_AT = new THREE.Vector3(0, 0, -6000);
export const STAGE_CAM = new THREE.Vector3(0, 5.2, 21);
export const STAGE_LOOK = new THREE.Vector3(0, 4.6, 0);

const canvasTex = (c: OffscreenCanvas, srgb = true) => {
  const t = new THREE.CanvasTexture(c as unknown as HTMLCanvasElement);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
};

/** Polished stage boards. */
function planks() {
  const c = new OffscreenCanvas(1024, 512);
  const g = c.getContext("2d")!;
  const r = rng(12);
  const H = 512 / 10;
  for (let i = 0; i < 10; i++) {
    const tone = 70 + Math.floor(r() * 30);
    g.fillStyle = `rgb(${tone + 40},${tone},${Math.floor(tone * 0.55)})`;
    g.fillRect(0, i * H, 1024, H);
    g.strokeStyle = "rgba(30,15,5,0.35)";
    g.lineWidth = 1.5;
    for (let k = 0; k < 7; k++) {
      g.beginPath();
      const y0 = i * H + r() * H;
      g.moveTo(0, y0);
      for (let x = 0; x <= 1024; x += 64) g.lineTo(x, y0 + Math.sin(x * 0.01 + k) * 3);
      g.stroke();
    }
    g.fillStyle = "rgba(10,5,0,0.8)";
    g.fillRect(0, i * H, 1024, 2);
    const seam = r() * 1024;
    g.fillRect(seam, i * H, 3, H);
  }
  const t = canvasTex(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(2, 1.2);
  return t;
}

/** A painted night-sky flat: gradient, stars, a crescent moon, cloud swirls. */
function paintedSky() {
  const c = new OffscreenCanvas(1024, 640);
  const g = c.getContext("2d")!;
  const grad = g.createLinearGradient(0, 0, 0, 640);
  grad.addColorStop(0, "#0d0730");
  grad.addColorStop(0.6, "#3a1466");
  grad.addColorStop(1, "#7a2a6e");
  g.fillStyle = grad;
  g.fillRect(0, 0, 1024, 640);
  const r = rng(5);
  for (let i = 0; i < 160; i++) {
    g.fillStyle = `rgba(255,${230 + r() * 25},${200 + r() * 55},${0.4 + r() * 0.6})`;
    g.beginPath();
    g.arc(r() * 1024, r() * 420, 0.8 + r() * 2.2, 0, Math.PI * 2);
    g.fill();
  }
  // crescent moon
  g.fillStyle = "#ffe9b0";
  g.beginPath();
  g.arc(780, 150, 70, 0, Math.PI * 2);
  g.fill();
  // bite the crescent out with the sky's own colour
  g.fillStyle = "#150a3a";
  g.beginPath();
  g.arc(752, 132, 64, 0, Math.PI * 2);
  g.fill();
  // painted cloud swirls
  g.strokeStyle = "rgba(255,190,230,0.35)";
  g.lineWidth = 10;
  g.lineCap = "round";
  for (let k = 0; k < 6; k++) {
    const x = 80 + k * 170;
    const y = 470 + (k % 2) * 50;
    g.beginPath();
    g.arc(x, y, 40, Math.PI, Math.PI * 1.9);
    g.arc(x + 70, y + 5, 30, Math.PI * 1.1, Math.PI * 1.95);
    g.stroke();
  }
  // canvas seams of a stage flat
  g.fillStyle = "rgba(0,0,0,0.25)";
  for (const x of [341, 682]) g.fillRect(x, 0, 3, 640);
  return canvasTex(c);
}

/** The cutout's painted face: pale skin, one big anime eye. */
function paintedEye() {
  const c = new OffscreenCanvas(1024, 1024);
  const g = c.getContext("2d")!;
  // painted board with visible brush strokes
  g.fillStyle = "#ffe6e0";
  g.fillRect(0, 0, 1024, 1024);
  const r = rng(9);
  for (let i = 0; i < 90; i++) {
    g.strokeStyle = `rgba(${230 + r() * 25},${190 + r() * 30},${190 + r() * 30},0.25)`;
    g.lineWidth = 10 + r() * 30;
    g.beginPath();
    const x = r() * 1024;
    const y = r() * 1024;
    g.moveTo(x, y);
    g.lineTo(x + 120 + r() * 160, y + (r() - 0.5) * 40);
    g.stroke();
  }
  // blush hatching
  g.strokeStyle = "rgba(255,120,150,0.55)";
  g.lineWidth = 6;
  for (let i = 0; i < 6; i++) {
    g.beginPath();
    g.moveTo(640 + i * 26, 830);
    g.lineTo(610 + i * 26, 880);
    g.stroke();
  }
  // the eye, painted big across the board
  g.save();
  g.translate(512, 520);
  g.scale(1.28, 1.28);
  g.translate(-520, -500);
  const eyePath = new Path2D();
  eyePath.moveTo(170, 520);
  eyePath.bezierCurveTo(250, 280, 760, 250, 870, 470);
  eyePath.bezierCurveTo(800, 700, 290, 740, 170, 520);
  g.fillStyle = "#ffffff";
  g.fill(eyePath);
  g.save();
  g.clip(eyePath);
  // lid shadow
  const sh = g.createLinearGradient(0, 300, 0, 480);
  sh.addColorStop(0, "rgba(120,110,200,0.6)");
  sh.addColorStop(1, "rgba(120,110,200,0)");
  g.fillStyle = sh;
  g.fillRect(0, 250, 1024, 260);
  // iris: tall, dark at the top, glowing at the bottom
  const ig = g.createLinearGradient(0, 300, 0, 720);
  ig.addColorStop(0, "#1a0a4a");
  ig.addColorStop(0.55, "#8b5cff");
  ig.addColorStop(1, "#3df2ff");
  g.fillStyle = ig;
  g.beginPath();
  g.ellipse(520, 500, 150, 205, 0, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = "rgba(255,255,255,0.18)";
  g.lineWidth = 4;
  for (let a = 0; a < Math.PI * 2; a += 0.18) {
    g.beginPath();
    g.moveTo(520 + Math.cos(a) * 70, 500 + Math.sin(a) * 95);
    g.lineTo(520 + Math.cos(a) * 140, 500 + Math.sin(a) * 190);
    g.stroke();
  }
  g.fillStyle = "#0a0420";
  g.beginPath();
  g.ellipse(520, 510, 60, 88, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#ffffff";
  g.beginPath();
  g.ellipse(470, 420, 44, 58, -0.3, 0, Math.PI * 2);
  g.fill();
  g.beginPath();
  g.arc(590, 610, 20, 0, Math.PI * 2);
  g.fill();
  g.restore();
  // lash line with flicks, crease
  g.strokeStyle = "#2a1236";
  g.lineCap = "round";
  g.lineWidth = 26;
  g.beginPath();
  g.moveTo(175, 515);
  g.bezierCurveTo(255, 280, 760, 250, 872, 468);
  g.stroke();
  g.lineWidth = 14;
  for (const [x0, y0, x1, y1] of [[850, 440, 930, 380], [872, 468, 955, 430], [835, 410, 890, 340]]) {
    g.beginPath();
    g.moveTo(x0, y0);
    g.quadraticCurveTo((x0 + x1) / 2 + 10, (y0 + y1) / 2 + 5, x1, y1);
    g.stroke();
  }
  g.lineWidth = 6;
  g.beginPath();
  g.moveTo(420, 690);
  g.quadraticCurveTo(650, 700, 790, 600);
  g.stroke();
  g.strokeStyle = "rgba(170,100,120,0.6)";
  g.lineWidth = 7;
  g.beginPath();
  g.moveTo(290, 290);
  g.bezierCurveTo(420, 190, 700, 190, 820, 300);
  g.stroke();
  g.restore();
  return canvasTex(c);
}

/** The cutout's back: bare corrugated card, tape, a stencilled PROP. */
function cardboardBack() {
  const c = new OffscreenCanvas(1024, 1024);
  const g = c.getContext("2d")!;
  g.fillStyle = "#b8895a";
  g.fillRect(0, 0, 1024, 1024);
  g.strokeStyle = "rgba(90,60,30,0.25)";
  g.lineWidth = 3;
  for (let x = 0; x < 1024; x += 14) {
    g.beginPath();
    g.moveTo(x, 0);
    g.lineTo(x, 1024);
    g.stroke();
  }
  g.fillStyle = "rgba(240,225,170,0.75)";
  g.save();
  g.translate(300, 300);
  g.rotate(-0.5);
  g.fillRect(-160, -30, 320, 60);
  g.restore();
  g.save();
  g.translate(730, 700);
  g.rotate(0.4);
  g.fillRect(-160, -30, 320, 60);
  g.restore();
  g.fillStyle = "rgba(40,20,20,0.85)";
  g.font = "900 190px Impact, 'Arial Black', sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText("PROP", 512, 470);
  g.font = "700 60px 'Arial Black', sans-serif";
  g.fillText("DO NOT BEND", 512, 620);
  g.strokeStyle = "rgba(40,20,20,0.85)";
  g.lineWidth = 10;
  g.strokeRect(240, 340, 544, 330);
  return canvasTex(c);
}

/**
 * "Was it all for show?" — a gilded theatre: velvet curtains on tie-backs,
 * footlights, a painted sky, swinging cardboard stars, an audience, and the
 * AI's eye revealed as a painted cardboard prop. Shared by the last two
 * scenes so the cut between them is invisible.
 */
export function createTheatre(w: World, name = "stage") {
  const group = new THREE.Group();
  group.name = name;
  const gold = new THREE.MeshStandardMaterial({ color: "#e8b54a", metalness: 0.85, roughness: 0.28, emissive: "#6a4210", emissiveIntensity: 0.35 });
  const velvet = new THREE.MeshPhysicalMaterial({ color: "#8a0c24", roughness: 0.75, sheen: 1, sheenColor: new THREE.Color("#ff6a8a"), sheenRoughness: 0.35, side: THREE.DoubleSide, emissive: "#2a0008", emissiveIntensity: 0.5 });

  // stage: polished boards with a curved apron
  const floorMat = new THREE.MeshStandardMaterial({ map: planks(), roughness: 0.32, metalness: 0.15 });
  const floor = new THREE.Mesh(new THREE.BoxGeometry(20, 0.7, 10), floorMat);
  floor.position.set(0, -0.35, -0.5);
  floor.name = "stage-floor";
  const apron = new THREE.Mesh(new THREE.CylinderGeometry(10, 10, 0.7, 64, 1, false, -Math.PI / 2, Math.PI), floorMat);
  apron.scale.set(1, 1, 0.22);
  apron.position.set(0, -0.35, 4.5);
  apron.name = "stage-apron";
  const lip = new THREE.Mesh(new THREE.TorusGeometry(10, 0.07, 8, 96, Math.PI), gold);
  lip.rotation.x = Math.PI / 2;
  lip.scale.set(1, 0.22, 1);
  lip.position.set(0, 0.0, 4.5);
  lip.name = "stage-lip";
  group.add(floor, apron, lip);

  // footlights along the apron
  const bulbs: THREE.Sprite[] = [];
  const bulbMat = new THREE.MeshBasicMaterial({ color: "#fff1c8" });
  for (let i = 0; i < 15; i++) {
    const a = Math.PI * (0.08 + (i / 14) * 0.84);
    const x = -Math.cos(a) * 9.4;
    const z = 4.5 + Math.sin(a) * 2.05;
    const shell = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), gold);
    shell.rotation.x = -Math.PI / 2 - 0.6;
    shell.position.set(x, 0.12, z);
    shell.name = `footlight-${i}`;
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 8), bulbMat);
    bulb.position.set(x, 0.2, z - 0.05);
    bulb.name = `footlight-${i}-bulb`;
    const gl = w.glow("#ffd9a0", 1.6, `footlight-${i}-glow`);
    gl.position.set(x, 0.3, z - 0.1);
    group.add(shell, bulb, gl);
    bulbs.push(gl);
  }
  const footLight = new THREE.PointLight("#ffcf90", 60, 16, 1.3);
  footLight.position.set(0, 0.6, 5);
  group.add(footLight);

  // backdrop flat and swinging cardboard stars
  const back = new THREE.Mesh(new THREE.PlaneGeometry(19, 12.5), new THREE.MeshStandardMaterial({ map: paintedSky(), roughness: 0.9, emissive: "#ffffff", emissiveMap: paintedSky(), emissiveIntensity: 0.25 }));
  back.position.set(0, 6.2, -5);
  back.name = "painted-sky-backdrop";
  back.userData.pickable = false;
  group.add(back);
  const starShape = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
    const rr = i % 2 ? 0.28 : 0.7;
    if (i === 0) starShape.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
    else starShape.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  const starGeo = new THREE.ExtrudeGeometry(starShape, { depth: 0.05, bevelEnabled: false });
  const starMat = new THREE.MeshStandardMaterial({ color: "#ffd24d", metalness: 0.6, roughness: 0.3, emissive: "#b8741a", emissiveIntensity: 0.5 });
  const strMat = new THREE.LineBasicMaterial({ color: "#c9b8a0", transparent: true, opacity: 0.5 });
  const hanging = [[-6.5, 9.5, 1.1], [-3.5, 10.6, 0.8], [4.2, 10.2, 1.0], [7, 9.0, 0.7], [1.2, 11.2, 0.6]].map(([x, y, s], i) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, 12.8, -3.5 + i * 0.3);
    const len = 12.8 - y;
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -len, 0)]), strMat);
    line.name = `prop-star-${i}-string`;
    const st = new THREE.Mesh(starGeo, starMat);
    st.position.y = -len;
    st.scale.setScalar(s);
    st.name = `prop-star-${i}`;
    pivot.add(line, st);
    group.add(pivot);
    return { pivot, st, ph: i * 1.3 };
  });

  // curtains: velvet, pleated, drawn back to tie-backs when open
  const CW = 9.8;
  const CH = 13;
  const makeCurtain = (side: 1 | -1) => {
    const geo = new THREE.PlaneGeometry(CW, CH, 110, 26);
    const base = Float32Array.from(geo.attributes.position.array as Float32Array);
    const m = new THREE.Mesh(geo, velvet);
    m.name = side < 0 ? "curtain-left" : "curtain-right";
    m.position.set(0, 6.3, 4.0);
    group.add(m);
    const tassel = new THREE.Group();
    tassel.name = `${m.name}-tieback`;
    const rope = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.07, 8, 32), gold);
    rope.scale.set(1, 0.5, 1);
    rope.name = `${m.name}-rope`;
    const tas = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.8, 12), gold);
    tas.position.set(0.1, -0.7, 0.3);
    tas.name = `${m.name}-tassel`;
    const knot = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), gold);
    knot.position.set(0.1, -0.25, 0.3);
    knot.name = `${m.name}-tassel-knot`;
    tassel.add(rope, tas, knot);
    group.add(tassel);
    return { m, geo, base, side, tassel };
  };
  const curtains = [makeCurtain(-1), makeCurtain(1)];

  // top border: scalloped swags with gold fringe
  const swagGeo = new THREE.TorusGeometry(1.5, 0.42, 12, 40, Math.PI);
  const fringeGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.32, 5);
  const fringe = new THREE.InstancedMesh(fringeGeo, gold, 7 * 20);
  fringe.name = "swag-fringe";
  const fm = new THREE.Matrix4();
  let fi = 0;
  for (let k = 0; k < 7; k++) {
    const x = -9 + k * 3;
    const swag = new THREE.Mesh(swagGeo, velvet);
    swag.rotation.z = Math.PI;
    swag.position.set(x, 12.9, 4.45);
    swag.name = `curtain-swag-${k}`;
    group.add(swag);
    for (let j = 0; j < 20; j++) {
      const a = Math.PI + (j / 19) * Math.PI;
      fm.makeTranslation(x + Math.cos(a) * 1.9 * -1, 12.9 + Math.sin(a) * 1.9 - 0.16, 4.5);
      fringe.setMatrixAt(fi++, fm);
    }
  }
  group.add(fringe);
  const pelmet = new THREE.Mesh(new THREE.BoxGeometry(22, 2, 0.8), velvet);
  pelmet.position.set(0, 14, 4.2);
  pelmet.name = "curtain-pelmet";
  group.add(pelmet);

  // gilded proscenium: fluted columns, an arch, a crest
  for (const side of [-1, 1]) {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.7, 14, 24, 1), gold);
    col.position.set(side * 10.7, 7, 4.8);
    col.name = side < 0 ? "proscenium-column-left" : "proscenium-column-right";
    const capital = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.5, 1.8), gold);
    capital.position.set(side * 10.7, 14.2, 4.8);
    capital.name = `${col.name}-capital`;
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.7, 1.8), gold);
    plinth.position.set(side * 10.7, 0.1, 4.8);
    plinth.name = `${col.name}-plinth`;
    for (let k = 0; k < 8; k++) {
      const flute = new THREE.Mesh(new THREE.BoxGeometry(0.08, 13.2, 0.08), new THREE.MeshStandardMaterial({ color: "#7a5214", roughness: 0.6 }));
      const a = (k / 8) * Math.PI * 2;
      flute.position.set(side * 10.7 + Math.cos(a) * 0.64, 7, 4.8 + Math.sin(a) * 0.64);
      flute.name = `${col.name}-flute`;
      group.add(flute);
    }
    group.add(col, capital, plinth);
  }
  const arch = new THREE.Mesh(new THREE.TorusGeometry(10.9, 0.45, 16, 96, Math.PI), gold);
  arch.scale.set(1, 0.28, 1);
  arch.position.set(0, 14.4, 4.9);
  arch.name = "proscenium-arch";
  const crestShape = new THREE.Shape();
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + Math.PI / 2;
    const rr = i % 2 ? 0.6 : 1.4;
    if (i === 0) crestShape.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
    else crestShape.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  const crest = new THREE.Mesh(new THREE.ExtrudeGeometry(crestShape, { depth: 0.3, bevelEnabled: true, bevelSize: 0.08, bevelThickness: 0.08, bevelSegments: 2 }), gold);
  crest.position.set(0, 17.4, 4.9);
  crest.name = "proscenium-crest";
  group.add(arch, crest);

  // the spotlight: real light + a soft volumetric beam + dust in it
  const spot = new THREE.SpotLight("#fff2d6", 420, 40, 0.38, 0.55, 1.4);
  spot.position.set(0, 16, 7);
  spot.target.position.set(0, 0, 0);
  group.add(spot, spot.target);
  const beamGeo = new THREE.CylinderGeometry(0.3, 4.2, 17, 48, 1, true);
  beamGeo.translate(0, -8.5, 0);
  const beamMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: { uAmt: { value: 1 } },
    vertexShader: /* glsl */ `varying float vY; varying vec3 vN; varying vec3 vV;
      void main() { vY = uv.y; vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: /* glsl */ `uniform float uAmt; varying float vY; varying vec3 vN; varying vec3 vV;
      void main() { float edge = pow(abs(dot(vN, vV)), 2.0); float a = edge * (0.25 + 0.75 * vY) * 0.16 * uAmt; gl_FragColor = vec4(vec3(1.0, 0.95, 0.84) * a, a); }`,
  });
  const beam = new THREE.Mesh(beamGeo, beamMat);
  beam.position.set(0, 16, 7);
  beam.lookAt(0, 0, 0);
  beam.rotateX(-Math.PI / 2);
  beam.name = "spotlight-beam";
  beam.userData.pickable = false;
  const pool = w.glow("#fff2d6", 8, "spotlight-pool");
  pool.position.set(0, 0.1, 0.8);
  const dust = stars(260, new THREE.Vector3(6, 14, 6), 44, 0.07, ["#fff6e0", "#ffe2a0"], "spotlight-dust");
  dust.points.position.set(0, 7, 2.5);
  group.add(beam, pool, dust.points);

  // the audience, in silhouette
  const crowd = new THREE.Group();
  crowd.name = "audience";
  crowd.userData.pickable = false;
  const crowdMat = new THREE.MeshStandardMaterial({ color: "#07030f", roughness: 0.9 });
  const cr = rng(31);
  const heads: { m: THREE.Group; ph: number; y: number }[] = [];
  for (let row = 0; row < 2; row++) {
    for (let k = 0; k < 13; k++) {
      const p = new THREE.Group();
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.62, 16, 12), crowdMat);
      head.position.y = 1.15;
      const shoulders = new THREE.Mesh(new THREE.CapsuleGeometry(0.75, 0.9, 4, 12), crowdMat);
      shoulders.rotation.z = Math.PI / 2;
      p.add(head, shoulders);
      const y = row === 0 ? -1.8 : -1.1;
      p.position.set(-13 + k * 2.2 + (row ? 1.1 : 0) + (cr() - 0.5) * 0.4, y, 11.5 + row * 2.4);
      p.scale.setScalar(1 + row * 0.15);
      crowd.add(p);
      heads.push({ m: p, ph: cr() * 6, y });
    }
  }
  group.add(crowd);

  // the prop: a painted anime eye on rough-cut cardboard, on an A-frame
  const cut = new THREE.Shape();
  const N = 48;
  const cr2 = rng(3);
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * Math.PI * 2;
    const rr = 1 + (cr2() - 0.5) * 0.05;
    const x = Math.cos(a) * 3.0 * rr;
    const y = Math.sin(a) * 2.5 * rr;
    if (i === 0) cut.moveTo(x, y);
    else cut.lineTo(x, y);
  }
  const cardEdge = new THREE.MeshStandardMaterial({ color: "#a8784a", roughness: 0.95 });
  const body = new THREE.Mesh(new THREE.ExtrudeGeometry(cut, { depth: 0.1, bevelEnabled: false }), cardEdge);
  body.name = "cardboard-eye-board";
  const faceGeo = new THREE.ShapeGeometry(cut, 12);
  const fuv = faceGeo.attributes.uv as THREE.BufferAttribute;
  const fpos = faceGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < fuv.count; i++) fuv.setXY(i, (fpos.getX(i) + 3.1) / 6.2, (fpos.getY(i) + 3.1) / 6.2);
  const face = new THREE.Mesh(faceGeo, new THREE.MeshStandardMaterial({ map: paintedEye(), roughness: 0.85, color: "#e6dcdc" }));
  face.position.z = 0.105;
  face.name = "cardboard-eye-painted-face";
  const backFace = new THREE.Mesh(faceGeo, new THREE.MeshStandardMaterial({ map: cardboardBack(), roughness: 0.95, color: "#d9cfc4" }));
  backFace.rotation.y = Math.PI;
  backFace.position.z = -0.005;
  backFace.name = "cardboard-eye-back";
  const board = new THREE.Group();
  board.name = "cardboard-eye-disc";
  board.add(body, face, backFace);
  board.position.y = 4.6;
  const wood = new THREE.MeshStandardMaterial({ color: "#6b4424", roughness: 0.8 });
  const cutout = new THREE.Group();
  cutout.name = "cardboard-eye";
  const legA = new THREE.Mesh(new THREE.BoxGeometry(0.18, 4.4, 0.14), wood);
  legA.position.set(-0.9, 2.0, -0.7);
  legA.rotation.set(-0.35, 0, 0.18);
  legA.name = "cardboard-eye-brace-left";
  const legB = legA.clone();
  legB.position.x = 0.9;
  legB.rotation.z = -0.18;
  legB.name = "cardboard-eye-brace-right";
  const bar = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.16, 0.12), wood);
  bar.position.set(0, 1.4, -1.0);
  bar.name = "cardboard-eye-crossbar";
  const weight = new THREE.Mesh(new THREE.BoxGeometry(1, 0.5, 0.7), new THREE.MeshStandardMaterial({ color: "#2a2a30", roughness: 0.5, metalness: 0.4 }));
  weight.position.set(0, 0.25, -1.2);
  weight.name = "cardboard-eye-sandbag";
  cutout.add(board, legA, legB, bar, weight);
  group.add(cutout);

  const tieL = new THREE.Vector3();
  /**
   * open 0 closed → 1 open; beam 0..1; turn: cutout yaw (radians);
   * pulse adds beat life.
   */
  const update = (t: number, s: { open: number; beam: number; turn: number; pulse?: number }) => {
    const o = THREE.MathUtils.clamp(s.open, 0, 1);
    const pulse = s.pulse ?? 0;
    for (const c of curtains) {
      const pos = c.geo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) {
        const bx = c.base[i * 3];
        const by = c.base[i * 3 + 1];
        const u = (bx + CW / 2) / CW; // 0..1 across the cloth, 0 at the far left
        const inner = c.side < 0 ? u : 1 - u; // 1 at the centre edge
        const hN = (by + CH / 2) / CH; // 0 bottom → 1 top
        // tie-back gathers hardest at ~35% height, fans at the top and flares at the hem
        const pinch = Math.exp(-Math.pow((hN - 0.35) / 0.22, 2));
        const gatherW = CW * (1 - o * (0.62 + 0.25 * pinch));
        const xEdge = c.side < 0 ? -10 : 10;
        const x = xEdge + (c.side < 0 ? 1 : -1) * (c.side < 0 ? u : 1 - u) * gatherW;
        const pleat = Math.sin(bx * (3.4 + o * 3)) * (0.22 + o * 0.35 * (1 - pinch * 0.5));
        const sway = Math.sin(t * 1.1 + by * 0.4) * 0.05 * inner;
        const drape = o * inner * inner * (1 - hN) * 0.7;
        pos.setXYZ(i, x + sway, by + drape * 0.3, pleat + drape);
      }
      pos.needsUpdate = true;
      c.geo.computeVertexNormals();
      // the tieback sits at the pinch, on the outer third
      tieL.set(c.side * (10 - CW * (1 - o * 0.87) * 0.55), 6.3 + (0.35 - 0.5) * CH, 4.4);
      c.tassel.position.copy(tieL);
      c.tassel.visible = o > 0.2;
      c.tassel.rotation.z = Math.sin(t * 1.5) * 0.08;
    }
    const b = THREE.MathUtils.clamp(s.beam, 0, 1);
    spot.intensity = 420 * b;
    beamMat.uniforms.uAmt.value = b * (1 + pulse * 0.3);
    pool.material.opacity = 0.45 * b;
    dust.update(t, 0.7 * b, 0);
    dust.points.rotation.y = t * 0.1;
    bulbs.forEach((g, i) => (g.material.opacity = 0.6 + pulse * 0.3 + Math.sin(t * 7 + i) * 0.05));
    footLight.intensity = 50 + pulse * 30;
    hanging.forEach((h) => {
      h.pivot.rotation.z = Math.sin(t * 1.2 + h.ph) * 0.08;
      h.st.rotation.y = Math.sin(t * 0.9 + h.ph) * 0.6;
    });
    heads.forEach((h) => (h.m.position.y = h.y + Math.max(0, Math.sin(t * 3.7 + h.ph)) * 0.08 * (1 + pulse)));
    cutout.rotation.y = s.turn;
    cutout.position.y = Math.sin(t * 2) * 0.03;
  };
  update(0, { open: 0, beam: 0, turn: 0 });
  return { group, update, cutout };
}
