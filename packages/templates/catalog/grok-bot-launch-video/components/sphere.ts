import * as THREE from "three";
import { REF_W, REF_H, layer } from "./stage";

/**
 * A shaded bot sphere with two capsule eyes painted on its surface, so the
 * eyes foreshorten and slip behind the limb as the sphere turns. Everything is
 * in reference px; the plane covers the whole frame.
 */
export type SphereEye = { lat: number; lon: number; len: number; wid: number; tilt: number };

export function botSphere(name: string) {
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthTest: false,
    depthWrite: false,
    uniforms: {
      uC: { value: new THREE.Vector2(640, 360) },
      uR: { value: 100 },
      uLight: { value: new THREE.Color("#5e2db9") },
      uDark: { value: new THREE.Color("#3a1a7a") },
      uGloss: { value: 0 },
      uE0: { value: new THREE.Vector4() },
      uE1: { value: new THREE.Vector4() },
      uTilt: { value: new THREE.Vector2() },
      uEyeOn: { value: 1 },
      uWink: { value: 0 },
      uOpacity: { value: 1 },
      uPx: { value: 1.5 },
    },
    vertexShader: `varying vec2 vRef;
      void main(){ vec4 w = modelMatrix * vec4(position,1.0); vRef = vec2(w.x + ${REF_W / 2}.0, ${REF_H / 2}.0 - w.y);
      gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `
      uniform vec2 uC; uniform float uR; uniform vec3 uLight; uniform vec3 uDark; uniform float uGloss;
      uniform vec4 uE0; uniform vec4 uE1; uniform vec2 uTilt; uniform float uEyeOn; uniform float uWink; uniform float uOpacity; uniform float uPx;
      varying vec2 vRef;
      // iq's arc SDF: an arc around +y with half-aperture sc=(sin,cos), radius ra, half-thickness rb
      float sdArc(vec2 p, vec2 sc, float ra, float rb){ p.x = abs(p.x); return ((sc.y * p.x > sc.x * p.y) ? length(p - sc * ra) : abs(length(p) - ra)) - rb; }
      // w = wink amount: the open capsule squashes shut, then becomes a happy closed-eye arc
      float eye(vec2 d, vec4 e, float tilt, float w){
        float lat = e.x, lon = e.y;
        float z = cos(lon) * cos(lat);
        if (z <= 0.0) return 0.0;
        vec2 c = vec2(sin(lon) * cos(lat), -sin(lat));
        float lc = length(c);
        vec2 rd = lc > 1e-4 ? c / lc : vec2(1.0, 0.0);
        vec2 pd = d - c;
        float along = dot(pd, rd);
        vec2 unf = (pd - rd * along) + rd * (along / max(z, 0.03));
        vec2 a = vec2(sin(tilt), cos(tilt));
        float ax = dot(unf, a);
        float ac = dot(unf, vec2(a.y, -a.x));
        float squash = 1.0 - 0.8 * smoothstep(0.0, 0.6, w);
        float h = max(e.z * 0.5 * squash - e.w * 0.5, 0.0);
        vec2 q = vec2(ac, max(abs(ax) - h, 0.0));
        float sdOpen = length(q) - e.w * 0.5;
        // closed eye: an upward arc (y is down here, so flip), leaning with the eye
        float cr = cos(-0.35), sr = sin(-0.35);
        vec2 pu = vec2(unf.x * cr - unf.y * sr, -(unf.x * sr + unf.y * cr));
        float sdShut = sdArc(pu - vec2(0.0, -0.15), vec2(sin(1.2), cos(1.2)), 0.25, e.w * 0.36);
        float sd = mix(sdOpen, sdShut, smoothstep(0.4, 0.75, w));
        return clamp(-sd * uR * uPx * z + 0.5, 0.0, 1.0);
      }
      void main(){
        vec2 d = (vRef - uC) / uR;
        float len = length(d);
        float a = clamp((1.0 - len) * uR * uPx + 0.5, 0.0, 1.0);
        if (a <= 0.0) discard;
        float t = clamp(0.5 + 0.55 * (-0.75 * d.x - 0.45 * d.y), 0.0, 1.0);
        vec3 col = mix(uDark, uLight, t);
        // glossy lighter cap over the top of the sphere
        float capEdge = length(d - vec2(0.14, 0.34)) - 0.97;
        float cap = clamp(capEdge * uR * uPx + 0.5, 0.0, 1.0) * uGloss;
        vec3 capCol = mix(vec3(0.66, 0.58, 0.96), vec3(0.55, 0.45, 0.93), clamp(d.x * 0.5 + 0.5, 0.0, 1.0));
        col = mix(col, capCol, cap);
        float e = max(eye(d, uE0, uTilt.x, 0.0), eye(d, uE1, uTilt.y, uWink)) * uEyeOn;
        col = mix(col, vec3(1.0), e);
        gl_FragColor = vec4(col, a * uOpacity);
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(4000, REF_H), mat);
  mesh.name = name;
  layer(mesh);
  const u = mat.uniforms;
  return {
    mesh,
    u,
    set(cx: number, cy: number, r: number) {
      u.uC.value.set(cx, cy);
      u.uR.value = r;
      // pick box = the disc itself
      mesh.userData.pickBounds = new THREE.Box3(
        new THREE.Vector3(cx - REF_W / 2 - r, REF_H / 2 - cy - r, 0),
        new THREE.Vector3(cx - REF_W / 2 + r, REF_H / 2 - cy + r, 0),
      );
    },
    eyes(e0: SphereEye, e1: SphereEye) {
      u.uE0.value.set(e0.lat, e0.lon, e0.len, e0.wid);
      u.uE1.value.set(e1.lat, e1.lon, e1.len, e1.wid);
      u.uTilt.value.set(e0.tilt, e1.tilt);
    },
  };
}
