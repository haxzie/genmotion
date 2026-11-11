import * as THREE from "three";
import { withFonts, Easing, interpolate, type ThreeSceneContext, type ThreeSceneUpdate } from "@genmotion/three-engine";
import interUrl from "../assets/Inter.woff2";
import lato400 from "../assets/Lato-400.woff2";
import lato700 from "../assets/Lato-700.woff2";
import person1Url from "../assets/avatars/person-1.png";
import person2Url from "../assets/avatars/person-2.png";
import { C } from "../components/brand";
import { bodyPath, drawBot } from "../components/bots";
import { smoothCam, canvasMesh, fillRR, layer, measure, place, setOpacity, setupStage, text, EMOJI } from "../components/stage";
import { interstitial } from "../components/title";

/**
 * 0:33.17–0:40.33 (reference frames 995–1210). Local 0 = ref 995.
 *  995–1039  "Works with other bots"
 *  1040–1164 Research Bot tags @marketing and cc's @Copy Bot in a channel
 *            thread; Copy Bot answers "I'm on it." and gets a 👍.
 *  1165–1209 the team's avatar stack; Copy Bot joins it.
 */
const LATO = '"Lato", -apple-system, "Helvetica Neue", Arial, sans-serif';
const REF0 = 995;

function appIcon(g: OffscreenCanvasRenderingContext2D, x: number, y: number, s: number, top: string, bottom: string, eye: string) {
  g.save();
  g.beginPath();
  g.roundRect(x, y, s, s, s * 0.2);
  const gr = g.createLinearGradient(x + s, y, x, y + s);
  gr.addColorStop(0, top);
  gr.addColorStop(1, bottom);
  g.fillStyle = gr;
  g.fill();
  g.clip();
  g.translate(x + s * 0.48, y + s * 0.78);
  g.scale(s * 0.95, s * 0.95);
  bodyPath(g, "blue");
  g.fillStyle = "#ffffff";
  g.fill();
  g.fillStyle = eye;
  for (const [ex, ey] of [[-0.14, -0.08], [0.08, -0.12]]) {
    g.save();
    g.translate(ex, ey);
    g.rotate(-0.35);
    g.beginPath();
    g.roundRect(-0.045, -0.1, 0.09, 0.2, 0.045);
    g.fill();
    g.restore();
  }
  g.restore();
}

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  return withFonts(ctx, [
    { family: "Inter", url: interUrl },
    { family: "Lato", url: lato400, weight: "400" },
    { family: "Lato", url: lato700, weight: "700" },
  ], () => {
    const { scene, view } = setupStage(ctx, C.white);

    // ------------------------------------------------------------ title
    const title = interstitial("Works with other bots", 587, 351);
    title.mesh.name = "works-with-other-bots";
    scene.add(title.mesh);

    // ------------------------------------------------------------ thread
    const thread = new THREE.Group();
    thread.name = "channel-thread";
    scene.add(thread);
    const at = (o: THREE.Object3D, x: number, y: number) => {
      o.position.set(x - 640, 360 - y, 0);
      thread.add(o);
      return o;
    };
    const B = { size: 38, family: LATO, color: "#1d1c1d" };
    const MENTION = "#1264a3";
    // a run of words as a left-anchored plane
    const run = (name: string, str: string, color: string, x: number, y: number) => {
      const w = Math.ceil(measure(str, B)) + 6;
      const m = canvasMesh(name, w, 56, (g) => text(g, str, 0, 29, { ...B, color }));
      m.geometry.translate(w / 2, 0, 0);
      at(m, x, y);
      return { m, w: measure(str, B) };
    };
    const header = (name: string, who: string, x: number, y: number) => {
      const nameW = measure(who, { size: 38, weight: 700, family: LATO });
      const W = nameW + 260;
      const m = canvasMesh(name, W, 50, (g) => {
        text(g, who, 0, 25, { size: 38, weight: 700, family: LATO, color: "#1d1c1d" });
        fillRR(g, nameW + 16, 6, 63, 37, 6, "#ebebeb");
        text(g, "APP", nameW + 47.5, 25, { size: 22, weight: 700, family: LATO, color: "#616061", align: "center" });
        text(g, "11:02 AM", nameW + 96, 25, { size: 34, family: LATO, color: "#616061" });
      });
      m.geometry.translate(W / 2, 0, 0);
      return at(m, x, y);
    };

    const rIcon = canvasMesh("research-bot-app-icon", 90, 90, (g) => appIcon(g, 0, 0, 90, "#1a7ff0", "#8cc2fb", "#4a9cf6"));
    at(rIcon, 279, 310);
    const rHead = header("research-bot-11-02-am", "Research Bot", 347, 292);
    const L1 = 349, L2 = 405;
    const w1 = run("mention-marketing", "@marketing", MENTION, 347, L1);
    const w2 = run("can-we-work-this-feedback", " Can we work this feedback", B.color, 347 + w1.w, L1);
    const w3 = run("into-the-ad-concepts", "into the ad concepts? cc ", B.color, 347, L2);
    const w4 = run("mention-copy-bot", "@Copy Bot", MENTION, 347 + w3.w, L2);

    const cIcon = canvasMesh("copy-bot-app-icon", 90, 90, (g) => appIcon(g, 0, 0, 90, "#10c493", "#8be7cb", "#3fd3a8"));
    at(cIcon, 274, 528);
    const cHead = header("copy-bot-11-02-am", "Copy Bot", 342, 510);
    const onIt = run("im-on-it", "I’m on it.", B.color, 342, 566);
    const thumb = canvasMesh("reaction-thumbs-up", 108, 60, (g) => {
      fillRR(g, 0, 0, 108, 60, 30, "#e8f5fa");
      g.strokeStyle = "#1d9bd1"; g.lineWidth = 2.5;
      g.beginPath(); g.roundRect(1.25, 1.25, 105.5, 57.5, 28.75); g.stroke();
      g.font = `30px ${EMOJI}`; g.textBaseline = "middle"; g.fillText("👍", 18, 32);
      text(g, "1", 70, 31, { size: 32, weight: 700, family: LATO, color: MENTION });
    }, { pad: 2 });
    at(thumb, 393, 631);
    layer(thread, 10);

    // ------------------------------------------------------------ avatars
    const loader = new THREE.TextureLoader(ctx.manager);
    const photo = (name: string, url: string) => {
      const tex = loader.load(url);
      tex.colorSpace = THREE.SRGBColorSpace;
      const mat = new THREE.ShaderMaterial({
        transparent: true, depthTest: false, depthWrite: false,
        uniforms: { map: { value: tex }, uOpacity: { value: 1 } },
        vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `uniform sampler2D map; uniform float uOpacity; varying vec2 vUv;
          void main(){ vec2 d = vUv - 0.5; float r = length(d);
            float ring = smoothstep(0.5, 0.49, r);
            float inner = smoothstep(0.462, 0.452, r);
            vec4 c = texture2D(map, vec2(0.5) + d * 0.92);
            vec3 col = mix(vec3(0.988), c.rgb, inner);
            gl_FragColor = vec4(col, ring * uOpacity);
            #include <colorspace_fragment>
          }`,
      });
      const m = new THREE.Mesh(new THREE.PlaneGeometry(222, 222), mat);
      m.name = name;
      return m;
    };
    const av1 = photo("avatar-teammate-1", person1Url);
    const av2 = photo("avatar-teammate-2", person2Url);
    const av3 = canvasMesh("avatar-copy-bot", 222, 222, (g) => {
      g.beginPath(); g.arc(111, 111, 111, 0, Math.PI * 2); g.fillStyle = "#fcfcfc"; g.fill();
      g.beginPath(); g.arc(111, 111, 102, 0, Math.PI * 2); g.fillStyle = "#14cf9c"; g.fill();
      drawBot(g, "teal", 118, 116, 150, { color: "#ffffff", eyes: false });
      g.fillStyle = "#14cf9c";
      for (const [ex, ey] of [[103, 108], [128, 102]]) {
        g.save(); g.translate(ex, ey); g.rotate(-0.3);
        g.beginPath(); g.roundRect(-7, -17, 14, 34, 7); g.fill(); g.restore();
      }
    });
    const chev = canvasMesh("avatar-stack-more", 232, 232, (g) => {
      g.beginPath(); g.arc(116, 116, 116, 0, Math.PI * 2); g.fillStyle = "#fcfcfc"; g.fill();
      g.beginPath(); g.arc(116, 116, 108, 0, Math.PI * 2); g.fillStyle = "#efefef"; g.fill();
      g.strokeStyle = "#1a1a1a"; g.lineWidth = 9; g.lineCap = "round"; g.lineJoin = "round";
      g.beginPath(); g.moveTo(88, 103); g.lineTo(116, 131); g.lineTo(144, 103); g.stroke();
    });
    const stack = new THREE.Group();
    stack.name = "team-avatars";
    stack.add(av1, av2, av3, chev);
    av1.renderOrder = 1; av2.renderOrder = 2; av3.renderOrder = 3; chev.renderOrder = 4;
    scene.add(stack);

    const r = (ref: number) => ref - REF0;
    const cam = smoothCam([[r(1040), 640, 360, 1], [r(1061), 640, 360, 1], [r(1069), 627, 354, 1.31], [r(1100), 627, 354, 1.31], [r(1112), 628, 454, 1.31]]);

    return ({ frame: f }) => {
      const ref = f + REF0;
      const isTitle = ref < 1040, isThread = ref >= 1040 && ref < 1165, isStack = ref >= 1165;
      title.update(f, 0, 150, 20);
      if (!isTitle) title.mesh.visible = false;

      thread.visible = isThread;
      const [cx, cy, z] = isThread ? cam(f) : [640, 360, 1];
      view(cx, cy, z);
      if (isThread) {
        setOpacity(w2.m, ref >= 1064 ? 1 : 0);
        setOpacity(w3.m, ref >= 1069 ? 1 : 0);
        setOpacity(w4.m, ref >= 1074 ? 1 : 0);
        const cin = interpolate(ref, [1108, 1116], [0, 1], Easing.outCubic);
        for (const m of [cIcon, cHead, onIt.m]) setOpacity(m, cin);
        const tp = interpolate(ref, [1131, 1135, 1138], [0, 1.1, 1]);
        thumb.scale.setScalar(Math.max(0.001, tp));
        setOpacity(thumb, tp > 0 ? 1 : 0);
        void rIcon; void rHead;
      }

      stack.visible = isStack;
      if (isStack) {
        const k = interpolate(ref, [1170, 1186], [0, 1], Easing.easeInOut);
        const y = 340;
        place(av1, THREE.MathUtils.lerp(452, 371, k), y);
        place(av2, THREE.MathUtils.lerp(641, 550, k), y);
        place(av3, THREE.MathUtils.lerp(700, 726, k), y);
        place(chev, THREE.MathUtils.lerp(815, 905, k), y);
        const pop = interpolate(ref, [1170, 1178, 1183], [0, 1.08, 1], Easing.easeOut);
        av3.scale.setScalar(Math.max(0.001, pop));
        setOpacity(av3, pop > 0 ? 1 : 0);
        const drift = interpolate(ref, [1186, 1210], [0, -8]);
        stack.position.y = -drift * 0;
        stack.position.x = drift;
      }
    };
  });
}
