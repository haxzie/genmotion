import * as THREE from "three";
import { track } from "@genmotion/three-engine";
import { REF_W, REF_H, layer } from "./stage";

/**
 * A rounded rectangle showing up to two textures "cover"-fitted into it
 * (crossfaded by `mix`). The rect animates per frame in ref px, so a tile
 * can change aspect while its picture stays undistorted.
 */
export function mediaTile(name: string, texA: THREE.Texture | null, aspectA: number, texB: THREE.Texture | null = null, aspectB = 1) {
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthTest: false,
    depthWrite: false,
    uniforms: {
      uRect: { value: new THREE.Vector4(0, 0, 100, 100) },
      uRadius: { value: 16 },
      uA: { value: texA },
      uB: { value: texB ?? texA },
      uAspA: { value: aspectA },
      uAspB: { value: aspectB },
      uMix: { value: 0 },
      uZoomA: { value: 1 },
      uZoomB: { value: 1 },
      uOpacity: { value: 1 },
      uPx: { value: 1.5 },
    },
    vertexShader: `varying vec2 vRef;
      void main(){ vec4 w = modelMatrix * vec4(position,1.0);
      vRef = vec2(w.x + ${REF_W / 2}.0, ${REF_H / 2}.0 - w.y);
      gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `
      uniform vec4 uRect; uniform float uRadius; uniform sampler2D uA; uniform sampler2D uB;
      uniform float uAspA; uniform float uAspB; uniform float uMix; uniform float uZoomA; uniform float uZoomB;
      uniform float uOpacity; uniform float uPx;
      varying vec2 vRef;
      float sdBox(vec2 p, vec2 c, vec2 h, float r){ vec2 q = abs(p - c) - h + r; return length(max(q,0.0)) + min(max(q.x,q.y),0.0) - r; }
      vec2 cover(vec2 uv, float rectAsp, float texAsp, float zoom){
        vec2 s = rectAsp > texAsp ? vec2(1.0, texAsp / rectAsp) : vec2(rectAsp / texAsp, 1.0);
        return (uv - 0.5) * s / zoom + 0.5;
      }
      void main(){
        vec2 c = uRect.xy + uRect.zw * 0.5; vec2 h = uRect.zw * 0.5;
        float d = sdBox(vRef, c, h, min(uRadius, min(h.x, h.y)));
        float a = clamp(0.5 - d * uPx, 0.0, 1.0);
        if (a <= 0.0) discard;
        vec2 uv = (vRef - uRect.xy) / uRect.zw;
        uv.y = 1.0 - uv.y;
        float ra = uRect.z / uRect.w;
        vec4 ca = texture2D(uA, cover(uv, ra, uAspA, uZoomA));
        vec4 cb = texture2D(uB, cover(uv, ra, uAspB, uZoomB));
        vec4 col = mix(ca, cb, uMix);
        gl_FragColor = vec4(col.rgb, a * uOpacity);
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(40000, 40000), mat);
  mesh.name = name;
  layer(mesh);
  const u = mat.uniforms;
  return {
    mesh,
    u,
    rect(x: number, y: number, w: number, h: number) {
      u.uRect.value.set(x, y, w, h);
      mesh.userData.pickBounds = new THREE.Box3(
        new THREE.Vector3(x - REF_W / 2, REF_H / 2 - y - h, 0),
        new THREE.Vector3(x + w - REF_W / 2, REF_H / 2 - y, 0),
      );
    },
  };
}

/**
 * Rect keyframes [[frame, x, y, w, h], ...] through a monotone cubic spline
 * per component: no stop-and-restart at the keys, no overshoot. (The old
 * per-segment ease argument is accepted and ignored.)
 */
export function rectTrack(k: [number, number, number, number, number][], _ease?: (t: number) => number) {
  const c = [1, 2, 3, 4].map((i) => track(k.map((r) => [r[0], r[i]] as const)));
  return (f: number): [number, number, number, number] => [c[0](f), c[1](f), c[2](f), c[3](f)];
}
