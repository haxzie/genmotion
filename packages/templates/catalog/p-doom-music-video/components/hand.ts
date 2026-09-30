import * as THREE from "three";

/**
 * A thumbs-up hand, sculpted as a signed-distance field and raymarched inside
 * its bounding box: palm, four curled fingers, a two-jointed thumb with a
 * nail, wrist and sleeve, all smoothly blended — with AO in the creases.
 * About 2.2 × 4.6 units; thumb up (+y), facing +z.
 */
export function createThumbsUp(name = "thumbs-up") {
  const BOX = new THREE.Vector3(2.9, 5.4, 2.3);
  const geo = new THREE.BoxGeometry(BOX.x, BOX.y, BOX.z);
  geo.translate(0, 0.15, 0);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uInv: { value: new THREE.Matrix4() },
      uLight: { value: new THREE.Vector3(0.5, 0.7, 0.6).normalize() },
      uRimA: { value: new THREE.Color("#ff5aa9") },
      uRimB: { value: new THREE.Color("#3df2ff") },
      uTime: { value: 0 },
      uPulse: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vLocal;
      void main() { vLocal = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform mat4 uInv; uniform vec3 uLight, uRimA, uRimB; uniform float uTime, uPulse;
      varying vec3 vLocal;

      float smin(float a, float b, float k) { float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0); return mix(b, a, h) - k * h * (1.0 - h); }
      float sdCap(vec3 p, vec3 a, vec3 b, float r) { vec3 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0); return length(pa - ba * h) - r; }
      float sdRBox(vec3 p, vec3 b, float r) { vec3 q = abs(p) - b; return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0) - r; }
      float sdEll(vec3 p, vec3 r) { float k0 = length(p / r); float k1 = length(p / (r * r)); return k0 * (k0 - 1.0) / k1; }

      // material ids: 0 skin, 1 nail, 2 sleeve
      vec2 map(vec3 p) {
        // palm: a soft rounded block behind the curled fingers
        float d = sdRBox(p - vec3(-0.05, 0.05, -0.18), vec3(0.62, 0.78, 0.36), 0.32);
        // four curled fingers: a knuckle roll across the front, tips tucked back into the palm
        for (int i = 0; i < 4; i++) {
          float fi = float(i);
          float y = 0.66 - fi * 0.43;
          float r = 0.235 - fi * 0.018;
          float x0 = -0.72 + fi * 0.03;
          float x1 = 0.5 - fi * 0.04;
          float f = sdCap(p, vec3(x0, y, 0.12), vec3(x1, y - 0.02, 0.42), r);
          f = smin(f, sdCap(p, vec3(x1, y - 0.02, 0.42), vec3(x1 + 0.12, y - 0.08, 0.02), r * 0.93), 0.06);
          d = smin(d, f, 0.07);
        }
        // the thumb: base knuckle, then a tip that stands proud
        float th = sdCap(p, vec3(-0.5, 0.62, 0.12), vec3(-0.46, 1.45, 0.2), 0.36);
        th = smin(th, sdCap(p, vec3(-0.46, 1.45, 0.2), vec3(-0.38, 2.12, 0.14), 0.33), 0.1);
        d = smin(d, th, 0.12);
        // wrist
        d = smin(d, sdCap(p, vec3(0.0, -0.6, -0.15), vec3(0.08, -1.9, -0.22), 0.5), 0.2);
        vec2 res = vec2(d, 0.0);
        // thumbnail
        float nail = sdEll(p - vec3(-0.35, 1.96, 0.44), vec3(0.2, 0.27, 0.07));
        if (nail < res.x + 0.004) res = vec2(min(nail, res.x), 1.0);
        // sleeve cuff
        float cuff = max(sdCap(p, vec3(0.06, -1.55, -0.2), vec3(0.1, -2.6, -0.22), 0.64), -sdCap(p, vec3(0.06, -1.45, -0.2), vec3(0.1, -2.7, -0.22), 0.52));
        cuff = min(cuff, sdCap(p, vec3(0.06, -1.55, -0.2), vec3(0.1, -2.6, -0.22), 0.64));
        if (cuff < res.x) res = vec2(cuff, 2.0);
        return res;
      }
      vec3 nrm(vec3 p) {
        vec2 e = vec2(0.0015, 0.0);
        return normalize(vec3(map(p + e.xyy).x - map(p - e.xyy).x, map(p + e.yxy).x - map(p - e.yxy).x, map(p + e.yyx).x - map(p - e.yyx).x));
      }
      float ao(vec3 p, vec3 n) {
        float o = 0.0, s = 1.0;
        for (int i = 1; i <= 5; i++) { float h = 0.03 + 0.06 * float(i); o += (h - map(p + n * h).x) * s; s *= 0.7; }
        return clamp(1.0 - 2.2 * o, 0.0, 1.0);
      }
      void main() {
        vec3 ro = (uInv * vec4(cameraPosition, 1.0)).xyz;
        vec3 rd = normalize(vLocal - ro);
        vec3 p = vLocal;
        float t = 0.0;
        vec2 h = vec2(1.0, 0.0);
        bool hit = false;
        for (int i = 0; i < 110; i++) {
          h = map(p + rd * t);
          if (h.x < 0.0012) { hit = true; break; }
          t += h.x * 0.9;
          if (t > 7.0) break;
        }
        if (!hit) discard;
        p += rd * t;
        vec3 n = nrm(p);
        vec3 l = normalize(uLight);
        vec3 v = -rd;
        float diff = clamp(dot(n, l) * 0.6 + 0.4, 0.0, 1.0);       // wrapped lambert: soft, toy-like
        float spec = pow(clamp(dot(reflect(-l, n), v), 0.0, 1.0), 40.0);
        float fres = pow(1.0 - clamp(dot(n, v), 0.0, 1.0), 3.0);
        float occ = ao(p, n);
        vec3 base = h.y < 0.5 ? vec3(1.0, 0.78, 0.26) : h.y < 1.5 ? vec3(1.0, 0.86, 0.8) : vec3(0.96, 0.95, 1.0);
        // warm subsurface-ish bounce in the shadows
        vec3 shadowTint = h.y < 0.5 ? vec3(0.95, 0.42, 0.2) : vec3(0.5, 0.5, 0.7);
        vec3 col = mix(base * shadowTint * 0.55, base, diff) * mix(0.45, 1.0, occ);
        col += spec * (h.y > 0.5 && h.y < 1.5 ? 0.9 : 0.55);
        vec3 rim = mix(uRimA, uRimB, 0.5 + 0.5 * n.y);
        col += rim * fres * (0.7 + uPulse * 0.6) * occ;
        // sleeve stripe
        if (h.y > 1.5) col = mix(col, uRimB * 0.9, smoothstep(0.02, 0.0, abs(p.y + 1.75) - 0.06));
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = name;
  mesh.frustumCulled = false;

  const inv = new THREE.Matrix4();
  const light = new THREE.Vector3();
  const nm = new THREE.Matrix3();
  /** Call after the hand's transform is final for the frame. */
  const update = (t: number, pulse: number, worldLight = new THREE.Vector3(0.4, 0.8, 0.6)) => {
    mesh.updateWorldMatrix(true, false);
    inv.copy(mesh.matrixWorld).invert();
    mat.uniforms.uInv.value.copy(inv);
    nm.setFromMatrix4(inv);
    light.copy(worldLight).applyMatrix3(nm).normalize();
    mat.uniforms.uLight.value.copy(light);
    mat.uniforms.uTime.value = t;
    mat.uniforms.uPulse.value = pulse;
  };
  return { mesh, update };
}
