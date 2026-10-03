import * as THREE from "three";
import { canvasTexture, texPlane } from "./ui";

/**
 * The Firebase mark (2024 flame), taken verbatim from firebase.google.com's icon.svg
 * (viewBox 0 0 600 600), and the "Firebase" wordmark from the official lockup.svg
 * (viewBox 0 0 749 205). Never redraw these by hand.
 */
export const FLAME_LAYERS: { d: string; fill: string }[] = [
  { d: "M213.918 560.499C237.166 569.856 262.387 575.408 288.87 576.333C324.71 577.585 358.792 570.175 389.261 556.099C352.724 541.744 319.634 520.751 291.392 494.651C273.086 523.961 246.01 547.113 213.918 560.499Z", fill: "#FF9100" },
  { d: "M291.389 494.66C226.923 435.038 187.815 348.743 191.12 254.092C191.228 251.019 191.39 247.947 191.58 244.876C180.034 241.89 167.98 240.068 155.576 239.635C137.821 239.015 120.626 241.217 104.393 245.788C87.1838 275.933 76.7989 310.521 75.5051 347.569C72.1663 443.18 130.027 526.723 213.914 560.508C246.007 547.121 273.082 523.998 291.389 494.66Z", fill: "#FFC400" },
  { d: "M291.39 494.657C306.378 470.671 315.465 442.551 316.523 412.254C319.306 332.559 265.731 264.003 191.581 244.873C191.391 247.944 191.229 251.016 191.121 254.089C187.816 348.74 226.924 435.035 291.39 494.657Z", fill: "#FF9100" },
  { d: "M308.231 20.8584C266 54.6908 232.652 99.302 212.475 150.693C200.924 180.129 193.665 211.748 191.546 244.893C265.696 264.023 319.272 332.579 316.489 412.273C315.431 442.57 306.317 470.663 291.355 494.677C319.595 520.804 352.686 541.77 389.223 556.124C462.56 522.224 514.593 449.278 517.606 362.997C519.558 307.096 498.08 257.273 467.731 215.219C435.68 170.742 308.231 20.8584 308.231 20.8584Z", fill: "#DD2C00" },
];
/** Ink bounds of the flame inside its 600 x 600 viewBox. */
export const FLAME_BOX = { x: 75.37, y: 20.86, w: 442.36, h: 555.61 };

/** The wordmark paths of the official lockup (fill #5E5E5E in the original). */
export const WORDMARK_PATHS: string[] = [
  "M707.39 161.434C700.156 161.434 693.615 159.749 687.768 156.379C682.021 153.01 677.512 148.352 674.241 142.406C670.971 136.361 669.336 129.623 669.336 122.19C669.336 115.055 670.872 108.514 673.944 102.568C677.115 96.5234 681.525 91.7666 687.174 88.2981C692.822 84.7306 699.264 82.9468 706.498 82.9468C713.931 82.9468 720.372 84.5819 725.823 87.8522C731.372 91.1225 735.584 95.6811 738.458 101.528C741.332 107.276 742.769 113.915 742.769 121.447C742.769 122.339 742.719 123.231 742.62 124.123C742.521 125.014 742.471 125.51 742.471 125.609H685.687C686.183 132.348 688.611 137.551 692.971 141.217C697.332 144.884 702.286 146.717 707.836 146.717C716.359 146.717 722.899 142.753 727.458 134.825L741.431 141.515C738.16 147.56 733.602 152.415 727.755 156.082C722.007 159.65 715.219 161.434 707.39 161.434ZM726.12 113.123C725.922 110.744 725.129 108.316 723.742 105.839C722.354 103.361 720.174 101.28 717.201 99.5955C714.327 97.8117 710.71 96.9198 706.35 96.9198C701.494 96.9198 697.282 98.4063 693.714 101.379C690.246 104.352 687.868 108.267 686.579 113.123H726.12Z",
  "M633.449 161.434C625.025 161.434 618.039 159.501 612.489 155.636C607.039 151.672 603.174 146.717 600.895 140.771L615.462 134.528C617.147 138.591 619.575 141.663 622.746 143.744C626.016 145.825 629.584 146.866 633.449 146.866C637.512 146.866 640.832 146.123 643.408 144.636C645.985 143.051 647.273 141.019 647.273 138.542C647.273 136.163 646.233 134.231 644.151 132.744C642.07 131.159 638.651 129.771 633.895 128.582L623.786 126.204C618.237 124.915 613.431 122.537 609.368 119.069C605.404 115.501 603.422 110.893 603.422 105.244C603.422 98.4063 606.246 93.0054 611.895 89.0414C617.543 84.9783 624.48 82.9468 632.705 82.9468C639.543 82.9468 645.588 84.3837 650.841 87.2576C656.192 90.1315 660.057 94.2937 662.435 99.7441L648.016 105.839C646.629 102.767 644.498 100.487 641.624 99.0009C638.75 97.5144 635.629 96.7711 632.26 96.7711C628.989 96.7711 626.115 97.5144 623.638 99.0009C621.16 100.388 619.922 102.271 619.922 104.65C619.922 106.731 620.764 108.415 622.449 109.704C624.232 110.992 627.007 112.082 630.773 112.974L641.773 115.65C649.205 117.532 654.755 120.406 658.422 124.271C662.088 128.037 663.922 132.596 663.922 137.947C663.922 142.307 662.584 146.271 659.908 149.839C657.332 153.406 653.715 156.231 649.057 158.312C644.498 160.393 639.296 161.434 633.449 161.434Z",
  "M555.223 161.434C549.971 161.434 545.214 160.393 540.953 158.312C536.791 156.132 533.471 153.159 530.993 149.393C528.615 145.528 527.426 141.168 527.426 136.312C527.426 128.582 530.3 122.487 536.047 118.028C541.894 113.568 549.277 111.339 558.196 111.339C566.025 111.339 572.714 112.677 578.264 115.352V112.231C578.264 107.771 576.48 104.105 572.912 101.231C569.444 98.2576 565.232 96.7711 560.277 96.7711C552.746 96.7711 546.701 99.8432 542.142 105.987L529.656 97.3657C533.124 92.7081 537.435 89.1405 542.588 86.663C547.84 84.1855 553.737 82.9468 560.277 82.9468C571.079 82.9468 579.403 85.672 585.25 91.1225C591.196 96.4738 594.169 104.055 594.169 113.866V159.055H578.264V149.988H577.372C574.994 153.357 571.971 156.132 568.304 158.312C564.638 160.393 560.277 161.434 555.223 161.434ZM557.899 147.906C561.566 147.906 564.935 147.015 568.007 145.231C571.178 143.348 573.656 140.92 575.439 137.947C577.322 134.875 578.264 131.605 578.264 128.136C573.012 125.262 567.412 123.825 561.466 123.825C556.016 123.825 551.755 125.014 548.683 127.393C545.611 129.771 544.075 132.794 544.075 136.46C544.075 139.83 545.412 142.605 548.088 144.785C550.863 146.866 554.133 147.906 557.899 147.906Z",
  "M486.618 161.433C481.266 161.433 476.46 160.294 472.199 158.014C468.037 155.735 464.915 152.861 462.834 149.393H461.942V159.055H446.482V52.6221H462.834V84.5816L461.942 94.8384H462.834C464.915 91.469 468.037 88.6447 472.199 86.3654C476.46 84.0861 481.266 82.9465 486.618 82.9465C492.96 82.9465 498.807 84.6312 504.158 88.0006C509.609 91.3699 513.92 96.0772 517.091 102.122C520.361 108.068 521.996 114.757 521.996 122.19C521.996 129.622 520.361 136.312 517.091 142.257C513.92 148.203 509.609 152.911 504.158 156.379C498.807 159.749 492.96 161.433 486.618 161.433ZM483.793 146.42C487.658 146.42 491.226 145.429 494.496 143.447C497.865 141.465 500.541 138.64 502.523 134.974C504.604 131.208 505.645 126.947 505.645 122.19C505.645 117.433 504.604 113.221 502.523 109.555C500.541 105.789 497.865 102.915 494.496 100.933C491.226 98.951 487.658 97.9601 483.793 97.9601C479.928 97.9601 476.311 98.951 472.942 100.933C469.672 102.915 466.996 105.739 464.915 109.406C462.933 113.073 461.942 117.334 461.942 122.19C461.942 127.046 462.933 131.307 464.915 134.974C466.996 138.64 469.672 141.465 472.942 143.447C476.311 145.429 479.928 146.42 483.793 146.42Z",
  "M401.365 161.434C394.13 161.434 387.59 159.749 381.743 156.379C375.995 153.01 371.486 148.352 368.216 142.406C364.946 136.361 363.311 129.623 363.311 122.19C363.311 115.055 364.847 108.514 367.919 102.568C371.09 96.5234 375.5 91.7666 381.148 88.2981C386.797 84.7306 393.239 82.9468 400.473 82.9468C407.905 82.9468 414.347 84.5819 419.797 87.8522C425.347 91.1225 429.559 95.6811 432.432 101.528C435.306 107.276 436.743 113.915 436.743 121.447C436.743 122.339 436.694 123.231 436.595 124.123C436.495 125.014 436.446 125.51 436.446 125.609H379.662C380.157 132.348 382.585 137.551 386.946 141.217C391.306 144.884 396.261 146.717 401.811 146.717C410.333 146.717 416.874 142.753 421.432 134.825L435.405 141.515C432.135 147.56 427.577 152.415 421.73 156.082C415.982 159.65 409.194 161.434 401.365 161.434ZM420.095 113.123C419.896 110.744 419.104 108.316 417.716 105.839C416.329 103.361 414.149 101.28 411.176 99.5955C408.302 97.8117 404.685 96.9198 400.324 96.9198C395.468 96.9198 391.257 98.4063 387.689 101.379C384.221 104.352 381.842 108.267 380.554 113.123H420.095Z",
  "M317.93 85.3252H333.389V96.3252H334.281C335.867 92.5595 338.741 89.4378 342.903 86.9603C347.065 84.3838 351.326 83.0955 355.687 83.0955C359.254 83.0955 362.178 83.591 364.457 84.582V101.677C361.087 99.9919 357.322 99.1496 353.16 99.1496C347.808 99.1496 343.299 101.231 339.632 105.393C336.065 109.456 334.281 114.46 334.281 120.406V159.055H317.93V85.3252Z",
  "M294.594 72.8384C291.522 72.8384 288.896 71.7979 286.715 69.7168C284.634 67.5366 283.594 64.9105 283.594 61.8384C283.594 58.7663 284.634 56.1897 286.715 54.1087C288.896 51.9285 291.522 50.8384 294.594 50.8384C297.666 50.8384 300.242 51.9285 302.324 54.1087C304.504 56.1897 305.594 58.7663 305.594 61.8384C305.594 64.9105 304.504 67.5366 302.324 69.7168C300.242 71.7979 297.666 72.8384 294.594 72.8384ZM286.418 85.325H302.769V159.055H286.418V85.325Z",
  "M211.938 52.6221H276.6V68.5275H228.586V99.1492H271.843V114.906H228.586V159.055H211.938V52.6221Z",
];
export const WORDMARK_BOX = { x: 211.94, y: 50.84, w: 530.83, h: 110.6 };

export type FlameStyle = "color" | "white" | "ink";

/**
 * Draw the flame into a canvas context at the origin, `h` px tall.
 * `reveal` (0..1 per layer, 4 entries) scales each layer's opacity: the "ignite" animation
 * lights the layers in order (yellow core, orange side, orange fold, red body).
 */
export function drawFlame(g: OffscreenCanvasRenderingContext2D, h: number, style: FlameStyle = "color") {
  const k = h / FLAME_BOX.h;
  g.save();
  g.scale(k, k);
  g.translate(-FLAME_BOX.x, -FLAME_BOX.y);
  const mono = style === "white" ? ["#ffffff", "#ffffff", "#ffffff", "#ffffff"] : style === "ink" ? ["#202124", "#202124", "#202124", "#202124"] : null;
  const alpha = style === "color" ? [1, 1, 1, 1] : [0.82, 1, 0.68, 1];
  FLAME_LAYERS.forEach((l, i) => {
    g.globalAlpha = alpha[i]!;
    g.fillStyle = mono ? mono[i]! : l.fill;
    g.fill(new Path2D(l.d));
  });
  g.restore();
}

/**
 * The flame as four stacked planes (one per layer), `h` px tall, centred on the group origin.
 * Animate it with `ignite(t)`: each layer rises 14% of the height and fades in, staggered, the
 * red body first and the yellow core last, overshooting 1.04 then settling.
 */
export function flame(h: number, name = "firebase-flame", style: FlameStyle = "color") {
  const group = new THREE.Group();
  group.name = name;
  const w = (h * FLAME_BOX.w) / FLAME_BOX.h;
  const pad = 4;
  const order = [3, 1, 2, 0]; // body, core, fold, base
  const layers = FLAME_LAYERS.map((l, i) => {
    const tex = canvasTexture(w + pad * 2, h + pad * 2, (g) => {
      g.translate(pad, pad);
      const k = h / FLAME_BOX.h;
      g.scale(k, k);
      g.translate(-FLAME_BOX.x, -FLAME_BOX.y);
      g.fillStyle = style === "white" ? "#ffffff" : style === "ink" ? "#202124" : l.fill;
      g.globalAlpha = style === "color" ? 1 : [0.82, 1, 0.68, 1][i]!;
      g.fill(new Path2D(l.d));
    });
    const m = texPlane(w + pad * 2, h + pad * 2, tex, `${name}-layer-${i + 1}`);
    m.renderOrder = 15 + order.indexOf(i) * 0.01;
    group.add(m);
    return m;
  });
  const ignite = (t: number) => {
    order.forEach((li, n) => {
      const local = Math.min(1, Math.max(0, (t - n * 0.12) / 0.52));
      const e = 1 - (1 - local) ** 3;
      const m = layers[li]!;
      (m.material as THREE.MeshBasicMaterial).opacity = Math.min(1, local * 2.2);
      // grow to 1.04 by 70% of the layer's time, settle to 1
      const s = local < 0.7 ? 0.6 + 0.44 * (1 - (1 - local / 0.7) ** 3) : 1.04 - 0.04 * ((local - 0.7) / 0.3);
      m.scale.setScalar(s);
      m.position.y = (1 - e) * -h * 0.14;
    });
  };
  ignite(1);
  return { group, layers, ignite, w, h };
}

/** The Firebase wordmark as a plane whose ink is `h` px tall (ascender top to baseline), in `color`. */
export function wordmark(h: number, color = "#5E5E5E", name = "firebase-wordmark") {
  // measured ink bounds of the wordmark inside the lockup: x 211.94..742.77, y 50.84..161.43 (ascender top to baseline)
  const bx = 211.94, by = 50.84, bw = 530.83, bh = 110.6;
  const k = h / bh;
  const w = bw * k;
  const pad = 4;
  const tex = canvasTexture(w + pad * 2, h + pad * 2, (g) => {
    g.translate(pad, pad);
    g.scale(k, k);
    g.translate(-bx, -by);
    g.fillStyle = color;
    for (const d of WORDMARK_PATHS) g.fill(new Path2D(d));
  });
  return { mesh: texPlane(w + pad * 2, h + pad * 2, tex, name), w, h };
}

/**
 * The wordmark with a left-to-right reveal: `reveal(x)` hides everything right of world x
 * (feathered by `soft` px), so the official glyphs can "type" in without redrawing them.
 */
export function wordmarkReveal(h: number, color = "#5E5E5E", name = "firebase-wordmark") {
  const bx = 211.94, by = 50.84, bw = 530.83, bh = 110.6;
  const k = h / bh;
  const w = bw * k;
  const pad = 4;
  const tex = canvasTexture(w + pad * 2, h + pad * 2, (g) => {
    g.translate(pad, pad);
    g.scale(k, k);
    g.translate(-bx, -by);
    g.fillStyle = "#ffffff";
    for (const d of WORDMARK_PATHS) g.fill(new Path2D(d));
  });
  const mat = new THREE.ShaderMaterial({
    uniforms: { uMap: { value: tex }, uColor: { value: new THREE.Color(color) }, uOpacity: { value: 1 }, uMaskX: { value: 1e9 }, uSoft: { value: 18 } },
    vertexShader: /* glsl */ `varying vec2 vUv; varying float vX; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vX = w.x; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */ `uniform sampler2D uMap; uniform vec3 uColor; uniform float uOpacity; uniform float uMaskX; uniform float uSoft; varying vec2 vUv; varying float vX;
      void main(){ vec4 c = texture2D(uMap, vUv); float keep = clamp((uMaskX - vX) / uSoft, 0.0, 1.0); gl_FragColor = vec4(uColor, c.a * uOpacity * keep);
      #include <colorspace_fragment>
      }`,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w + pad * 2, h + pad * 2), mat);
  mesh.name = name;
  return {
    mesh,
    w,
    h,
    reveal: (worldX: number, soft = 18) => {
      mat.uniforms.uMaskX!.value = worldX;
      mat.uniforms.uSoft!.value = soft;
    },
    setOpacity: (o: number) => {
      mat.uniforms.uOpacity!.value = o;
      mesh.visible = o > 0.001;
    },
  };
}
