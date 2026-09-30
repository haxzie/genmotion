import * as THREE from "three";

/**
 * The GenMotion mark, from its real SVG outline (assets/genmotion-logo.svg,
 * 512×512 viewBox): an outer pinwheel with a round hole at its centre.
 */
const MARK_OUTER =
  "M280.083 111.725V38.5C280.083 25.2083 269.208 14.3333 255.917 14.3333C179.55 14.3333 118.65 108.1 111.642 231.833H38.4167C25.125 231.833 14.25 242.708 14.25 256C14.25 332.367 108.017 393.267 231.75 400.275V473.5C231.75 486.792 242.625 497.667 255.917 497.667C332.283 497.667 393.183 403.9 400.192 280.167H473.417C486.708 280.167 497.583 269.292 497.583 256C497.583 179.633 403.817 118.733 280.083 111.725Z";
const MARK_HOLE =
  "M255.917 292.25C235.858 292.25 219.667 276.058 219.667 256C219.667 235.942 235.858 219.75 255.917 219.75C275.975 219.75 292.167 235.942 292.167 256C292.167 276.058 275.975 292.25 255.917 292.25Z";

/** Absolute M/L/H/V/C/Z path data → a THREE.Path, centred and y-flipped. */
function toPath<T extends THREE.Path>(d: string, p: T): T {
  const tok = d.match(/[MLHVCZ]|-?\d*\.?\d+/g) ?? [];
  let i = 0;
  let cmd = "";
  let x = 0;
  let y = 0;
  const X = (v: number) => v - 256;
  const Y = (v: number) => 256 - v;
  const num = () => parseFloat(tok[i++]);
  while (i < tok.length) {
    if (/[A-Z]/.test(tok[i])) cmd = tok[i++];
    if (cmd === "M") {
      x = num();
      y = num();
      p.moveTo(X(x), Y(y));
      cmd = "L";
    } else if (cmd === "L") {
      x = num();
      y = num();
      p.lineTo(X(x), Y(y));
    } else if (cmd === "H") {
      x = num();
      p.lineTo(X(x), Y(y));
    } else if (cmd === "V") {
      y = num();
      p.lineTo(X(x), Y(y));
    } else if (cmd === "C") {
      const x1 = num(), y1 = num(), x2 = num(), y2 = num();
      x = num();
      y = num();
      p.bezierCurveTo(X(x1), Y(y1), X(x2), Y(y2), X(x), Y(y));
    } else if (cmd === "Z") {
      p.closePath();
      cmd = "";
    } else i++;
  }
  return p;
}

/** The mark as an extruded solid with the brand's lime → teal gradient. Units: SVG px (±256). */
export function createGenMotionMark(name = "genmotion-logo", depth = 70) {
  const shape = toPath(MARK_OUTER, new THREE.Shape());
  shape.holes.push(toPath(MARK_HOLE, new THREE.Path()));
  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: 10, bevelSize: 8, bevelSegments: 6, curveSegments: 48 });
  geo.translate(0, 0, -depth / 2);
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthTest: false,
    depthWrite: false,
    uniforms: { uA: { value: new THREE.Color("#C6F91E") }, uB: { value: new THREE.Color("#16F5BD") }, uOpacity: { value: 1 }, uShine: { value: 0 } },
    vertexShader: /* glsl */ `
      varying vec3 vP; varying vec3 vN;
      void main() { vP = position; vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uA, uB; uniform float uOpacity, uShine; varying vec3 vP; varying vec3 vN;
      void main() {
        // the SVG's gradient runs from top-left (61,88) to bottom-right (428,430)
        float g = clamp(dot(vP.xy - vec2(-195.0, 167.5), normalize(vec2(367.5, -341.5))) / 501.6, 0.0, 1.0);
        vec3 col = mix(uA, uB, g);
        float front = max(vN.z, 0.0);
        col *= 0.55 + 0.45 * front;                              // sides darker, face bright
        float sweep = exp(-pow((vP.x + vP.y) / 90.0 - uShine, 2.0));  // a light sweep across the face
        col += vec3(1.0) * sweep * 0.45 * front;
        gl_FragColor = vec4(col, uOpacity);
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = name;
  return { mesh, mat };
}
