import * as THREE from "three";
import { withFonts, track, Easing, interpolate, type ThreeSceneContext, type ThreeSceneUpdate } from "@genmotion/three-engine";
import interUrl from "../assets/Inter.woff2";
import serifUrl from "../assets/Merriweather-400.woff2";
import person1Url from "../assets/avatars/person-1.png";
import person2Url from "../assets/avatars/person-2.png";
import adAUrl from "../assets/ads/ad-a-blue.png";
import adBUrl from "../assets/ads/ad-b-curly.png";
import adCUrl from "../assets/ads/ad-c-woman.png";
import adDUrl from "../assets/ads/ad-d-wide-full.png";
import { C } from "../components/brand";
import { drawBot } from "../components/bots";
import { tealCursor } from "../components/chat";
import { headphones } from "../components/headphones";
import { mediaTile } from "../components/tile";
import { canvasMesh, fillRR, keys, layer, measure, place, setOpacity, setupStage, text } from "../components/stage";
import { clipPlanes, panel, setClip } from "../components/ui";

/**
 * 0:40.33–0:50.5 (reference frames 1210–1515). Local 0 = ref 1210.
 *  1210–1254 the design tool's inspector (team avatars, Share, Design tab) scrolls
 *  1255–1277 Layers: "Headline" is selected; Copy Bot's cursor is on it
 *  1278–1344 canvas: "Sound, reimagined." — Copy Bot circles the text box
 *  1345–1382 it retypes the headline: "A lighter fit for longer days"
 *  1383–1414 the view pulls back; the line rides up
 *  1415–1455 the Arc render (a 3D model here) turns under the headline
 *  1452–1514 pan across the generated ad variants
 */
const REF0 = 1210;
const SERIF = '"Merriweather", Georgia, serif';
const TEAL = "#18c29c";

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  return withFonts(ctx, [{ family: "Inter", url: interUrl }, { family: "Merriweather", url: serifUrl, weight: "400" }], () => {
    const { scene, view } = setupStage(ctx, C.white);
    ctx.renderer.localClippingEnabled = true;
    const loader = new THREE.TextureLoader(ctx.manager);
    const tex = (url: string) => {
      const t = loader.load(url);
      t.colorSpace = THREE.SRGBColorSpace;
      return t;
    };

    // ============================================== A: inspector panel
    const inspector = new THREE.Group();
    inspector.name = "inspector-panel";
    const insp = canvasMesh("inspector", 1280, 1000, (g) => {
      // avatars are separate meshes; the rest is drawn here
      g.beginPath(); g.arc(442, 115, 64, 0, Math.PI * 2); g.fillStyle = "#efefef"; g.fill();
      g.strokeStyle = "#1a1a1a"; g.lineWidth = 6; g.lineCap = "round"; g.lineJoin = "round";
      g.beginPath(); g.moveTo(426, 106); g.lineTo(442, 122); g.lineTo(458, 106); g.stroke();
      g.lineWidth = 5;
      g.beginPath(); g.moveTo(734, 90); g.lineTo(770, 113); g.lineTo(734, 136); g.closePath(); g.stroke();
      g.lineWidth = 3.5;
      g.beginPath(); g.moveTo(820, 108); g.lineTo(828, 116); g.lineTo(836, 108); g.stroke();
      fillRR(g, 938, 36, 278, 150, 26, "#0d4d3c");
      text(g, "Share", 1077, 112, { size: 54, weight: 500, color: "#ffffff", align: "center", tracking: -0.5 });
      fillRR(g, 45, 275, 265, 124, 20, "#efefef");
      text(g, "Design", 177, 338, { size: 54, weight: 600, color: "#1a1a1a", align: "center", tracking: -0.6 });
      text(g, "Prototype", 335, 338, { size: 54, weight: 400, color: "#8e8e93", tracking: -0.5 });
      text(g, "50%", 1034, 338, { size: 54, weight: 400, color: "#1a1a1a", tracking: -0.5 });
      g.beginPath(); g.moveTo(1188, 332); g.lineTo(1197, 341); g.lineTo(1206, 332); g.stroke();
      g.fillStyle = "#ebebeb"; g.fillRect(0, 455, 1280, 4);
      text(g, "Frame", 64, 559, { size: 54, weight: 600, color: "#1a1a1a", tracking: -0.5 });
      g.beginPath(); g.moveTo(273, 553); g.lineTo(282, 562); g.lineTo(291, 553); g.stroke();
      g.fillRect(0, 655, 1280, 4);
      text(g, "Position", 64, 771, { size: 54, weight: 600, color: "#1a1a1a", tracking: -0.5 });
      g.fillStyle = "#1a1a1a"; g.fillRect(1225, 769, 28, 4);
      fillRR(g, 64, 830, 456, 104, 16, "#f2f2f2");
      fillRR(g, 560, 830, 456, 104, 16, "#f2f2f2");
      text(g, "X", 100, 882, { size: 44, color: "#8e8e93" });
      text(g, "0", 160, 882, { size: 44, color: "#1a1a1a" });
      text(g, "Y", 596, 882, { size: 44, color: "#8e8e93" });
      text(g, "0", 656, 882, { size: 44, color: "#1a1a1a" });
    }, { res: 2 });
    insp.geometry.translate(640, -500, 0);
    insp.position.set(-640, 360, 0);
    inspector.add(insp);
    const avatar = (name: string, url: string) => {
      const mat = new THREE.ShaderMaterial({
        transparent: true, depthTest: false, depthWrite: false,
        uniforms: { map: { value: tex(url) } },
        vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `uniform sampler2D map; varying vec2 vUv;
          void main(){ vec2 d = vUv - 0.5; float r = length(d);
            float ring = smoothstep(0.5, 0.49, r); float inner = smoothstep(0.458, 0.448, r);
            vec4 c = texture2D(map, vec2(0.5) + d * 0.92);
            gl_FragColor = vec4(mix(vec3(0.988), c.rgb, inner), ring);
            #include <colorspace_fragment>
          }`,
      });
      const m = new THREE.Mesh(new THREE.PlaneGeometry(140, 140), mat);
      m.name = name;
      return m;
    };
    const avs = [avatar("avatar-teammate-1", person1Url), avatar("avatar-teammate-2", person2Url)];
    const av3 = canvasMesh("avatar-copy-bot", 140, 140, (g) => {
      g.beginPath(); g.arc(70, 70, 70, 0, Math.PI * 2); g.fillStyle = "#fcfcfc"; g.fill();
      g.beginPath(); g.arc(70, 70, 64, 0, Math.PI * 2); g.fillStyle = "#14cf9c"; g.fill();
      drawBot(g, "teal", 75, 73, 95, { color: "#ffffff", eyes: false });
      g.fillStyle = "#14cf9c";
      for (const [ex, ey] of [[65, 68], [81, 64]]) {
        g.save(); g.translate(ex, ey); g.rotate(-0.3);
        g.beginPath(); g.roundRect(-4.5, -11, 9, 22, 4.5); g.fill(); g.restore();
      }
    });
    [...avs, av3].forEach((m, i) => {
      m.position.set(115 + i * 108 - 640, 360 - 115, 0);
      m.renderOrder = i + 1;
      inspector.add(m);
    });
    layer(inspector, 10);
    avs.forEach((m, i) => (m.renderOrder = 11 + i));
    av3.renderOrder = 13;
    scene.add(inspector);

    // ============================================== B: layers
    const layers = canvasMesh("layers-panel", 1280, 900, (g) => {
      text(g, "Layers", 54, 79, { size: 54, weight: 600, color: "#1a1a1a", tracking: -0.5 });
      const hash = (x: number, y: number) => {
        g.strokeStyle = "#1a1a1a"; g.lineWidth = 4;
        g.beginPath();
        g.moveTo(x - 10, y - 24); g.lineTo(x - 14, y + 24); g.moveTo(x + 12, y - 24); g.lineTo(x + 8, y + 24);
        g.moveTo(x - 24, y - 8); g.lineTo(x + 24, y - 8); g.moveTo(x - 26, y + 9); g.lineTo(x + 22, y + 9);
        g.stroke();
      };
      hash(86, 230);
      text(g, "Ad · 1080×1350", 151, 230, { size: 56, weight: 500, color: "#1a1a1a", tracking: -0.5 });
      g.fillStyle = "#d5f5ec"; g.fillRect(0, 317, 1280, 172);
      text(g, "T", 173, 406, { size: 66, color: "#1a1a1a", family: SERIF, align: "center" });
      text(g, "Headline", 239, 404, { size: 54, color: "#1a1a1a", tracking: -0.3 });
      g.strokeStyle = "#1a1a1a"; g.lineWidth = 4;
      g.beginPath(); g.roundRect(146, 552, 54, 54, 6); g.stroke();
      g.beginPath(); g.arc(163, 569, 6, 0, Math.PI * 2); g.stroke();
      g.beginPath(); g.moveTo(148, 600); g.lineTo(172, 578); g.lineTo(198, 600); g.stroke();
      text(g, "Arc_render_002", 239, 579, { size: 54, color: "#1a1a1a", tracking: -0.3 });
      hash(86, 750);
      text(g, "Ad · 1080×1350", 151, 750, { size: 56, weight: 500, color: "#1a1a1a", tracking: -0.5 });
    }, { res: 2 });
    layers.geometry.translate(640, -450, 0);
    layer(layers, 10);
    scene.add(layers);

    // ============================================== C/D/E: canvas + headline
    const dots = canvasMesh("canvas-dot-grid", 1400, 820, (g) => {
      g.fillStyle = "#d6d6d8";
      for (let y = 20; y < 820; y += 41) for (let x = 20; x < 1400; x += 41) { g.beginPath(); g.arc(x, y, 1.6, 0, Math.PI * 2); g.fill(); }
    }, { res: 1.5 });
    dots.userData.pickable = false;
    place(dots, 640, 360);
    layer(dots, 2);
    scene.add(dots);

    const HEAD0 = { size: 90, weight: 400, family: SERIF, color: "#111111", tracking: -0.5 };
    const fitK = 672 / measure("Sound, reimagined.", HEAD0);
    const HEAD = { ...HEAD0, size: 90 * fitK, tracking: -0.5 * fitK };
    const serifLine = (name: string, str: string) => {
      const w = Math.ceil(measure(str, HEAD)) + 10;
      const m = canvasMesh(name, w, 140, (g) => text(g, str, 5, 72, HEAD), { res: 2.4 });
      m.userData.w = w - 10;
      return m;
    };
    const sound = serifLine("headline-sound-reimagined", "Sound, reimagined.");
    place(sound, 640, 357);
    layer(sound, 20);
    scene.add(sound);
    const FINAL = "A lighter fit for longer days";
    const prefixes = Array.from({ length: FINAL.length }, (_, i) => {
      const m = serifLine(i === FINAL.length - 1 ? "headline-a-lighter-fit-for-longer-days" : `headline-typing-${i + 1}`, FINAL.slice(0, i + 1));
      m.visible = false;
      layer(m, 20);
      scene.add(m);
      return m;
    });
    // selection box with corner handles (drawn as 4 lines + 4 handles, sized per frame)
    const boxG = new THREE.Group();
    boxG.name = "text-selection";
    const lineMat = new THREE.MeshBasicMaterial({ color: TEAL, transparent: true, depthTest: false, depthWrite: false, toneMapped: false });
    const edges = Array.from({ length: 4 }, () => new THREE.Mesh(new THREE.PlaneGeometry(1, 1), lineMat));
    const handle = canvasMesh("selection-handle", 12, 12, (g) => {
      g.fillStyle = "#fff"; g.fillRect(1, 1, 10, 10); g.strokeStyle = TEAL; g.lineWidth = 2; g.strokeRect(1, 1, 10, 10);
    }, { res: 4 });
    const handles = [handle, handle.clone(), handle.clone(), handle.clone()];
    boxG.add(...edges, ...handles);
    layer(boxG, 21);
    scene.add(boxG);
    const setBox = (x0: number, y0: number, x1: number, y1: number) => {
      const t = 2.2;
      const set = (m: THREE.Mesh, cx: number, cy: number, w: number, h: number) => { place(m, cx, cy); m.scale.set(w, h, 1); };
      set(edges[0], (x0 + x1) / 2, y0, x1 - x0, t);
      set(edges[1], (x0 + x1) / 2, y1, x1 - x0, t);
      set(edges[2], x0, (y0 + y1) / 2, t, y1 - y0);
      set(edges[3], x1, (y0 + y1) / 2, t, y1 - y0);
      [[x0, y0], [x1, y0], [x0, y1], [x1, y1]].forEach(([x, y], i) => place(handles[i], x, y));
    };

    const toolbar = canvasMesh("canvas-toolbar", 407, 64, (g) => {
      fillRR(g, 0, 0, 407, 64, 18, "#ffffff", { blur: 14, y: 4, color: "rgba(0,0,0,0.12)" });
      fillRR(g, 8, 8, 48, 48, 10, TEAL);
      g.fillStyle = "#fff";
      g.beginPath(); g.moveTo(24, 20); g.lineTo(44, 30); g.lineTo(35, 33); g.lineTo(31, 43); g.closePath(); g.fill();
      g.strokeStyle = "#1a1a1a"; g.lineWidth = 2.2;
      // # frame, rect, pen, T, comment, code
      g.beginPath(); g.moveTo(80, 22); g.lineTo(78, 42); g.moveTo(88, 22); g.lineTo(86, 42); g.moveTo(73, 28); g.lineTo(93, 28); g.moveTo(72, 36); g.lineTo(92, 36); g.stroke();
      g.strokeRect(126, 23, 18, 18);
      g.beginPath(); g.moveTo(172, 42); g.lineTo(186, 24); g.lineTo(192, 30); g.lineTo(178, 46); g.closePath(); g.stroke();
      text(g, "T", 229, 33, { size: 24, color: "#1a1a1a", align: "center", family: SERIF });
      g.beginPath(); g.arc(275, 31, 9, 0.6, Math.PI * 2 + 0.2); g.lineTo(267, 42); g.stroke();
      g.fillStyle = "#e3e3e3"; g.fillRect(298, 20, 1.5, 24);
      g.beginPath(); g.moveTo(320, 25); g.lineTo(313, 32); g.lineTo(320, 39); g.moveTo(330, 25); g.lineTo(337, 32); g.lineTo(330, 39); g.stroke();
    }, { pad: 16 });
    place(toolbar, 645, 637);
    layer(toolbar, 22);
    scene.add(toolbar);

    // ============================================== F: the 3D render
    const renderBg = panel("arc-render-frame", { color: "#f3f3f1", radius: 0, shadow: 1, shadowA: 0 });
    layer(renderBg.mesh, 15);
    scene.add(renderBg.mesh);
    const hp = headphones(ctx.renderer);
    const hpClip = clipPlanes();
    hp.clip(hpClip);
    hp.order(25);
    scene.add(hp.root);

    // ============================================== G: ad variants
    const row = new THREE.Group();
    row.name = "ad-variants";
    const ADS = [
      { k: "a", url: adAUrl, x: 0, y: 155, w: 328, h: 413, label: "Ad · 1080×1350" },
      { k: "b", url: adBUrl, x: 374, y: 175, w: 389, h: 393, label: "Ad · 1080×1080" },
      { k: "c", url: adCUrl, x: 810, y: 155, w: 332, h: 412, label: "Ad · 1080×1350" },
      { k: "d", url: adDUrl, x: 1190, y: 218, w: 619, h: 350, label: "Ad · 1920×1080" },
      { k: "b", url: adBUrl, x: 1857, y: 175, w: 389, h: 393, label: "Ad · 1080×1080" },
      { k: "c", url: adCUrl, x: 2293, y: 155, w: 332, h: 412, label: "Ad · 1080×1350" },
      { k: "d", url: adDUrl, x: 2673, y: 218, w: 619, h: 350, label: "Ad · 1920×1080" },
    ];
    const adTex: Record<string, THREE.Texture> = {};
    const adTiles = ADS.map((a, i) => {
      adTex[a.k] ??= tex(a.url);
      const t = mediaTile(`ad-variant-${i + 1}`, adTex[a.k], a.w / a.h);
      t.u.uRadius.value = 4;
      layer(t.mesh, 30);
      scene.add(t.mesh);
      const lab = canvasMesh(`ad-label-${i + 1}`, 160, 20, (g) => text(g, a.label, 0, 10, { size: 13, color: "#8a8a8f" }));
      lab.geometry.translate(80, 0, 0);
      layer(lab, 30);
      row.add(lab);
      return { t, lab, a };
    });
    scene.add(row);

    const cursor = tealCursor("copy-bot-cursor", 1);
    const cursorLayer = new THREE.Group();
    cursorLayer.add(cursor);
    layer(cursorLayer, 50);
    scene.add(cursorLayer);

    // ============================================== timing
    const panelY = track([[1210, 24], [1215, 0], [1240, -20], [1250, -230], [1254, -260]]);
    const layersY = track([[1255, 75], [1276, 0]]);
    const typed = keys([[1345, 0], [1350, 13], [1355, 17], [1360, 21], [1365, 23], [1370, 27], [1374, 29]]);
    const headScale = track([[1376, 1], [1388, 0.63], [1416, 0.62]]);
    const headY = track([[1376, 357], [1388, 369], [1410, 315], [1416, 211], [1440, 190], [1452, 183]]);
    const aLeft = track([[1452, 1300], [1456, 867], [1460, 416], [1464, 100], [1468, -175], [1472, -245], [1515, -490]]);
    // cursor tip path (ref px) through the canvas beats
    const cX = track([[1250, 560], [1255, 520], [1276, 493], [1278, 560], [1290, 560], [1296, 552], [1302, 520], [1308, 430], [1314, 300], [1320, 222], [1325, 238], [1330, 380], [1336, 640], [1341, 860], [1345, 930]]);
    const cY = track([[1250, 760], [1255, 470], [1276, 420], [1278, 425], [1290, 400], [1296, 320], [1302, 252], [1308, 226], [1314, 262], [1320, 352], [1325, 430], [1330, 468], [1336, 470], [1341, 440], [1345, 410]]);
    const gX = track([[1456, 1060], [1460, 1000], [1470, 985], [1476, 900], [1482, 820], [1490, 721], [1500, 600], [1515, 560]]);
    const gY = track([[1456, 330], [1470, 340], [1482, 382], [1490, 391], [1500, 370], [1515, 380]]);
    const yaw = track([[1415, 0], [1430, 0.03], [1440, 0.42], [1452, 1.2], [1456, 1.3]]);
    const hpS = track([[1415, 1.0], [1430, 0.97], [1440, 1.1], [1452, 1.85], [1456, 1.95]]);
    const hpX = track([[1415, 647], [1440, 610], [1452, 560]]);
    const hpY = track([[1415, 477], [1440, 440], [1452, 430]]);

    return ({ frame: f, time }) => {
      const ref = f + REF0;
      view(640, 360, 1);
      const sA = ref < 1255, sB = ref >= 1255 && ref < 1278, sCanvas = ref >= 1278 && ref < 1456;
      const sRender = ref >= 1415 && ref < 1462, sRow = ref >= 1452;
      const pan = sRow ? aLeft(ref) - 1300 : 0;

      inspector.visible = sA;
      inspector.position.y = -panelY(ref);
      layers.visible = sB;
      layers.position.set(-640, 360 - layersY(ref), 0);

      dots.visible = (sCanvas && ref < 1415) || sRow;
      dots.position.x = sRow ? ((pan % 41) + 41) % 41 - 20 : 0;

      // headline
      const typing = ref >= 1345;
      sound.visible = sCanvas && !typing;
      const n = Math.round(typed(ref));
      const sc = headScale(ref);
      prefixes.forEach((m, i) => {
        m.visible = sCanvas && typing && i === n - 1;
        place(m, 640 + pan, headY(ref));
        m.scale.setScalar(sc);
      });
      // the line is clipped by the render frame once the pan starts
      const boxOn = (sCanvas && ref < 1345) || (ref >= 1375 && ref < 1383);
      boxG.visible = boxOn;
      if (boxOn) {
        if (ref < 1345) setBox(293, 307, 986, 407);
        else {
          const w = prefixes[FINAL.length - 1].userData.w;
          setBox(640 - w / 2 - 12, 307, 640 + w / 2 + 12, 407);
        }
      }
      toolbar.visible = sCanvas && ref < 1383;

      // render
      const panelRight = 1240 + pan;
      renderBg.mesh.visible = sRender;
      renderBg.rect(-2000, -2000, panelRight + 2000, 4000);
      hp.root.visible = sRender;
      setClip(hpClip, -2000, -2000, panelRight + 2000, 4000);
      if (sRender) {
        place(hp.root, hpX(ref) + pan, hpY(ref));
        hp.root.scale.setScalar(hpS(ref));
        hp.root.rotation.set(0.04 + yaw(ref) * 0.08, yaw(ref), 0.035 - yaw(ref) * 0.05);
      }
      // headline sits above the render's background but under the model
      prefixes[FINAL.length - 1].renderOrder = sRender ? 20 : 20;

      // ad row
      row.visible = sRow;
      adTiles.forEach(({ t, lab, a }) => {
        const x = aLeft(ref) + a.x;
        t.mesh.visible = sRow;
        t.rect(x, a.y, a.w, a.h);
        place(lab, x, a.y - 14);
      });

      // cursor
      let cx = 0, cy = 0, show = false;
      if (ref >= 1245 && ref < 1345) {
        cx = cX(ref); cy = cY(ref); show = true;
      } else if (ref >= 1456) {
        cx = gX(ref); cy = gY(ref); show = true;
      }
      cursorLayer.visible = show;
      place(cursor, cx + Math.sin(time * 3) * 2, cy + Math.cos(time * 2.4) * 2);
      cursor.rotation.z = ref >= 1456 ? interpolate(ref, [1472, 1484], [0.6, 0], Easing.easeInOut) : 0;
      setOpacity(cursor, 1);
    };
  });
}
