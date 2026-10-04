import * as THREE from "three";

/**
 * Stripe Payment Links — light mode. One file re-skins the film.
 * Palette from stripe.com: blurple #635BFF, navy #0A2540, slate #425466, page #F6F9FC,
 * and the signature gradient (violet → pink → amber → cyan) used only at the reveal and end.
 */
export const C = {
  page: "#F6F9FC",
  surface: "#FFFFFF",
  navy: "#0A2540",
  slate: "#425466",
  muted: "#6B7C93", // labels on white only (4.6:1)
  line: "#E3E8EE",
  blurple: "#635BFF",
  blurpleDeep: "#4B44E0",
  cyan: "#00D4FF",
  violet: "#A960EE",
  pink: "#FF5996",
  amber: "#FFCB57",
  green: "#1EA672",
};

export const LINK_URL = "buy.stripe.com/aF8fUK";
export const PRODUCT = { name: "Ceramic mug", price: "$32.00", shop: "Clay & Co." };

// Real Stripe wordmark outline (Wikimedia "Stripe Logo, revised 2016"), viewBox 54 36 360.02 149.84.
const WORDMARK_VB = { x: 54, y: 36, w: 360.02, h: 149.84 };
const WORDMARK_PATHS = [
  "M414,113.4c0-25.6-12.4-45.8-36.1-45.8c-23.8,0-38.2,20.2-38.2,45.6c0,30.1,17,45.3,41.4,45.3c11.9,0,20.9-2.7,27.7-6.5v-20c-6.8,3.4-14.6,5.5-24.5,5.5c-9.7,0-18.3-3.4-19.4-15.2h48.9C413.8,121,414,115.8,414,113.4z M364.6,103.9c0-11.3,6.9-16,13.2-16c6.1,0,12.6,4.7,12.6,16H364.6z",
  "M301.1,67.6c-9.8,0-16.1,4.6-19.6,7.8l-1.3-6.2h-22v116.6l25-5.3l0.1-28.3c3.6,2.6,8.9,6.3,17.7,6.3c17.9,0,34.2-14.4,34.2-46.1C335.1,83.4,318.6,67.6,301.1,67.6z M295.1,136.5c-5.9,0-9.4-2.1-11.8-4.7l-0.1-37.1c2.6-2.9,6.2-4.9,11.9-4.9c9.1,0,15.4,10.2,15.4,23.3C310.5,126.5,304.3,136.5,295.1,136.5z",
  "M223.8,61.7L248.9,56.3L248.9,36L223.8,41.3Z",
  "M223.8,69.3h25.1v87.5h-25.1Z",
  "M196.9,76.7l-1.6-7.4h-21.6v87.5h25V97.5c5.9-7.7,15.9-6.3,19-5.2v-23C214.5,68.1,202.8,65.9,196.9,76.7z",
  "M146.9,47.6l-24.4,5.2l-0.1,80.1c0,14.8,11.1,25.7,25.9,25.7c8.2,0,14.2-1.5,17.5-3.3V135c-3.2,1.3-19,5.9-19-8.9V90.6h19V69.3h-19L146.9,47.6z",
  "M79.3,94.7c0-3.9,3.2-5.4,8.5-5.4c7.6,0,17.2,2.3,24.8,6.4V72.2c-8.3-3.3-16.5-4.6-24.8-4.6C67.5,67.6,54,78.2,54,95.9c0,27.6,38,23.2,38,35.1c0,4.6-4,6.1-9.6,6.1c-8.3,0-18.9-3.4-27.3-8v23.8c9.3,4,18.7,5.7,27.3,5.7c20.8,0,35.1-10.3,35.1-28.2C117.4,100.6,79.3,105.9,79.3,94.7z",
];

/** The Stripe wordmark as a crisp plane, `height` px tall, centred. */
export function stripeWordmark(height: number, color = C.blurple, name = "stripe-wordmark") {
  const scale = height / WORDMARK_VB.h;
  const w = WORDMARK_VB.w * scale;
  const DPR = 3;
  const c = new OffscreenCanvas(Math.ceil(w * DPR), Math.ceil(height * DPR));
  const g = c.getContext("2d")!;
  g.scale(DPR * scale, DPR * scale);
  g.translate(-WORDMARK_VB.x, -WORDMARK_VB.y);
  g.fillStyle = color;
  for (const d of WORDMARK_PATHS) g.fill(new Path2D(d), "evenodd");
  const t = new THREE.CanvasTexture(c as unknown as HTMLCanvasElement);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, height),
    new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, toneMapped: false }),
  );
  m.name = name;
  return { mesh: m, width: w };
}

/** Stripe's signature gradient as canvas stops. */
export function signatureGradient(g: OffscreenCanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number) {
  const gr = g.createLinearGradient(x0, y0, x1, y1);
  gr.addColorStop(0, C.violet);
  gr.addColorStop(0.35, C.pink);
  gr.addColorStop(0.62, C.amber);
  gr.addColorStop(1, C.cyan);
  return gr;
}
