import * as THREE from "three";

/**
 * A thin 3D ring (a torus with a hair-thin tube) drawn unlit, with an optional dash pattern
 * along its circumference and a colour gradient across the SCREEN (left -> right), the way the
 * reference's orbit lines read: the gradient stays put while the ring tumbles.
 */
export interface RingOpts {
  radius: number; // world units
  tube: number; // world units
  left: string; // colour at the left of the screen
  right: string; // colour at the right
  dashes?: number; // dash count around the ring (0 = solid)
  duty?: number; // fraction of each dash period that is drawn
  name: string;
}

const VERT = /* glsl */ `
varying vec2 vUv;
varying float vNdcX;
varying float vNdcY;
void main() {
  vUv = uv;
  vec4 clip = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  vNdcX = clip.x / clip.w;
  vNdcY = clip.y / clip.w;
  gl_Position = clip;
}`;
const FRAG = /* glsl */ `
uniform vec3 uLeft;
uniform vec3 uRight;
uniform float uDashes;
uniform float uDuty;
uniform float uOpacity;
uniform float uSpan; // ndc span of the gradient
uniform float uCenter;
varying vec2 vUv;
varying float vNdcX;
varying float vNdcY;
void main() {
  if (uDashes > 0.5) {
    float f = fract(vUv.x * uDashes);
    if (f > uDuty) discard;
  }
  float t = clamp((vNdcX - uCenter) / uSpan * 0.5 + 0.5, 0.0, 1.0);
  vec3 c = mix(uLeft, uRight, smoothstep(0.0, 1.0, t));
  gl_FragColor = vec4(c, uOpacity);
  #include <colorspace_fragment>
}`;

export type Ring = THREE.Mesh<THREE.TorusGeometry, THREE.ShaderMaterial>;

export function ring(o: RingOpts): Ring {
  const geo = new THREE.TorusGeometry(o.radius, o.tube, 6, 720);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uLeft: { value: new THREE.Color(o.left) },
      uRight: { value: new THREE.Color(o.right) },
      uDashes: { value: o.dashes ?? 0 },
      uDuty: { value: o.duty ?? 0.5 },
      uOpacity: { value: 1 },
      uSpan: { value: 1.2 },
      uCenter: { value: 0 },
    },
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthWrite: false,
  });
  const m = new THREE.Mesh(geo, mat) as Ring;
  m.name = o.name;
  m.rotation.order = "ZYX";
  return m;
}

/**
 * Pose a ring so it projects (roughly, at the stage distance) as an ellipse whose horizontal
 * semi-axis is `rxPx` px, vertical/horizontal ratio `aspect`, rolled `rollDeg` degrees, centred
 * at reference pixel (cx, cy). `aspect` > 1 gives a tall ellipse.
 */
export function poseRing(m: Ring, baseRadius: number, rxPx: number, aspect: number, rollDeg: number, cx: number, cy: number) {
  // a tall ellipse is a wide one turned 90 degrees
  let rx = rxPx, a = aspect, roll = rollDeg;
  if (a > 1) {
    rx = rxPx * a;
    a = 1 / a;
    roll += 90;
  }
  m.scale.setScalar((rx * 0.01) / baseRadius);
  m.rotation.set(Math.acos(Math.min(1, Math.max(0, a))), 0, THREE.MathUtils.degToRad(roll));
  m.position.set((cx - 960) * 0.01, (540 - cy) * 0.01, 0);
}
