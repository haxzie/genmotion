import * as THREE from "three";

export const MAX_IMPACTS = 12;

export type EarthMaps = { day: THREE.Texture; night: THREE.Texture; spec: THREE.Texture };

/**
 * The real Earth (NASA-derived day, night-lights, cloud and specular maps):
 * a soft terminator, city lights on the dark side, ocean glint, a thin
 * atmosphere — and nuclear impacts that flash, burn and scorch. Radius R.
 * `rotY` turns the planet; impact directions are given in world space.
 */
export function createEarth(maps: EarthMaps, name = "earth", R = 10, rotY = 0) {
  const group = new THREE.Group();
  group.name = name;
  const sun = new THREE.Vector3(-1, 0.3, 0.35).normalize();
  const impDirs = Array.from({ length: MAX_IMPACTS }, () => new THREE.Vector3(0, 0, 1));
  const impT = new Array(MAX_IMPACTS).fill(1e6);
  const uniforms = {
    uDay: { value: maps.day },
    uNight: { value: maps.night },
    uSpec: { value: maps.spec },
    uSun: { value: sun },
    uTime: { value: 0 },
    uImp: { value: impDirs },
    uImpT: { value: impT },
    uNow: { value: 0 },
    uHot: { value: 0 },
  };
  const surface = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: /* glsl */ `
      varying vec2 vUv; varying vec3 vP; varying vec3 vN; varying vec3 vW;
      void main() { vUv = uv; vP = normalize(position); vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D uDay, uNight, uSpec;
      float h3(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
      float vn(vec3 x) { vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(mix(h3(i), h3(i + vec3(1,0,0)), f.x), mix(h3(i + vec3(0,1,0)), h3(i + vec3(1,1,0)), f.x), f.y),
                   mix(mix(h3(i + vec3(0,0,1)), h3(i + vec3(1,0,1)), f.x), mix(h3(i + vec3(0,1,1)), h3(i + vec3(1,1,1)), f.x), f.y), f.z); }
      float fbm(vec3 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 6; i++) { s += a * vn(p); p = p * 2.07 + vec3(1.7, 9.2, 3.1); a *= 0.5; } return s; }
      uniform vec3 uSun; uniform float uTime, uNow, uHot;
      uniform vec3 uImp[${MAX_IMPACTS}]; uniform float uImpT[${MAX_IMPACTS}];
      varying vec2 vUv; varying vec3 vP; varying vec3 vN; varying vec3 vW;
      void main() {
        vec3 day = texture2D(uDay, vUv).rgb;
        vec3 night = texture2D(uNight, vUv).rgb;
        float spec = texture2D(uSpec, vUv).r;
        // wispy procedural clouds, stretched along the latitudes like weather bands
        vec3 q = vP * vec3(3.0, 5.5, 3.0) + vec3(uTime * 0.01, 0.0, 0.0);
        float cloud = smoothstep(0.52, 0.78, fbm(q + fbm(q * 1.7) * 0.8)) * 0.8;
        vec3 n = normalize(vN);
        float ndl = dot(n, uSun);
        float lit = smoothstep(-0.1, 0.22, ndl);
        vec3 v = normalize(cameraPosition - vW);
        float glint = pow(max(dot(reflect(-uSun, n), v), 0.0), 40.0) * spec * lit;
        vec3 col = day * (0.02 + 1.3 * max(ndl, 0.0)) + vec3(1.0, 0.92, 0.75) * glint * 0.9;
        // clouds over everything, lit by the sun, faint at night
        col = mix(col, vec3(1.0) * (0.03 + 1.2 * max(ndl, 0.0)), cloud * 0.85);
        // cities glow on the dark side
        col += night * vec3(1.0, 0.72, 0.4) * (1.0 - lit) * (1.0 - cloud * 0.7) * 1.6;
        // sunset along the terminator
        col += vec3(0.6, 0.22, 0.06) * exp(-pow(ndl / 0.06, 2.0)) * 0.3;
        // impacts: white flash → fireball → scorched crater, and a burning shock ring
        for (int i = 0; i < ${MAX_IMPACTS}; i++) {
          float age = uNow - uImpT[i];
          if (age < 0.0) continue;
          float d = acos(clamp(dot(vP, uImp[i]), -1.0, 1.0));
          float fire = exp(-d * d / (0.0015 + age * 0.025)) * exp(-age * 0.25);
          float flash = exp(-d * 45.0) * exp(-age * 5.0) * 5.0;
          float ring = exp(-pow((d - age * 0.25) / 0.018, 2.0)) * exp(-age * 1.2);
          float scar = smoothstep(0.05 + age * 0.06, 0.0, d);
          col = mix(col, vec3(0.04, 0.03, 0.025), scar * 0.8 * min(1.0, age * 2.0));
          col += vec3(1.0, 0.5, 0.12) * fire * 3.0 + vec3(1.0, 0.95, 0.85) * flash + vec3(1.0, 0.42, 0.1) * ring * 2.2;
        }
        col += vec3(0.7, 0.15, 0.03) * uHot * 0.18;
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const ball = new THREE.Mesh(new THREE.SphereGeometry(R, 128, 96), surface);
  ball.name = `${name}-surface`;
  ball.rotation.y = rotY;
  group.add(ball);

  const atmo = new THREE.Mesh(
    new THREE.SphereGeometry(R * 1.025, 96, 72),
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms,
      vertexShader: /* glsl */ `varying vec3 vN; varying vec3 vW; void main(){ vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uSun; uniform float uHot; varying vec3 vN; varying vec3 vW;
        void main() {
          vec3 v = normalize(cameraPosition - vW);
          vec3 n = normalize(vN);
          float rim = pow(1.0 - max(dot(n, v), 0.0), 4.0);
          float lit = smoothstep(-0.35, 0.4, dot(n, uSun));
          vec3 col = mix(vec3(0.3, 0.6, 1.0), vec3(1.0, 0.42, 0.12), uHot);
          gl_FragColor = vec4(col * rim * lit * 2.4, 1.0);
          #include <colorspace_fragment>
        }`,
    }),
  );
  atmo.name = `${name}-atmosphere`;
  atmo.userData.pickable = false;
  group.add(atmo);

  const inv = new THREE.Euler(0, -rotY, 0);
  /** Schedule impacts: world-space unit directions and their song times. */
  const setImpacts = (dirs: THREE.Vector3[], times: number[]) => {
    for (let i = 0; i < MAX_IMPACTS; i++) {
      impDirs[i].copy(dirs[i] ?? dirs[0]).normalize().applyEuler(inv);
      impT[i] = times[i] ?? 1e6;
    }
  };
  const update = (t: number, hot: number) => {
    uniforms.uTime.value = t;
    uniforms.uNow.value = t;
    uniforms.uHot.value = hot;
  };
  return { group, update, setImpacts, sun, R };
}
