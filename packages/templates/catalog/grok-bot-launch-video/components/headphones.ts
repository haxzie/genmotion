import * as THREE from "three";

/**
 * A procedural over-ear headphone in the style of the film's "Pendel Arc"
 * render: brushed-silver ribbon headband with S-shoulders, round pivots with a
 * copper dot, flat arms, grey knit cushions. Units are reference px; the
 * group origin sits midway between the two pivots.
 */
export function headphones(renderer: THREE.WebGLRenderer) {
  // a soft studio environment, built from core three only
  const env = new THREE.Scene();
  const room = new THREE.Mesh(
    new THREE.SphereGeometry(50, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      vertexShader: `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `varying vec3 vP; void main(){ float y = normalize(vP).y;
        vec3 n = normalize(vP);
        vec3 c = mix(vec3(0.22), vec3(0.95), smoothstep(-0.25, 0.55, y));
        c = mix(c, vec3(0.18), smoothstep(0.12, 0.0, abs(y + 0.05)) * 0.6);
        float box1 = smoothstep(0.75, 0.9, n.x) * smoothstep(-0.2, 0.2, n.y) * 1.2;
        float box2 = smoothstep(0.75, 0.9, -n.z) * 0.9;
        gl_FragColor = vec4(c + box1 + box2, 1.0); }`,
    }),
  );
  env.add(room);
  const pm = new THREE.PMREMGenerator(renderer);
  const envMap = pm.fromScene(env, 0.02).texture;
  pm.dispose();

  // knit fabric
  const N = 128;
  const fab = new OffscreenCanvas(N, N);
  const g = fab.getContext("2d")!;
  g.fillStyle = "#b6b6b8";
  g.fillRect(0, 0, N, N);
  for (let y = 0; y < N; y += 4) for (let x = 0; x < N; x += 4) {
    const h = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
    const v = h - Math.floor(h);
    g.fillStyle = v > 0.5 ? "#d0d0d2" : "#9c9c9f";
    g.fillRect(x + ((y / 4) % 2) * 2, y, 2, 2);
  }
  const fabTex = new THREE.CanvasTexture(fab as unknown as HTMLCanvasElement);
  fabTex.colorSpace = THREE.SRGBColorSpace;
  fabTex.wrapS = fabTex.wrapT = THREE.RepeatWrapping;
  fabTex.repeat.set(6, 3);

  const common = { transparent: true, envMap, envMapIntensity: 1.1 };
  const metal = new THREE.MeshStandardMaterial({ color: "#d2d2d6", metalness: 1, roughness: 0.24, ...common, envMapIntensity: 0.95 });
  const copper = new THREE.MeshStandardMaterial({ color: "#c97a4a", metalness: 0.5, roughness: 0.45, ...common });
  const knit = new THREE.MeshStandardMaterial({ color: "#ffffff", map: fabTex, metalness: 0, roughness: 1, ...common, envMapIntensity: 0.9 });
  const dark = new THREE.MeshStandardMaterial({ color: "#1d1d20", metalness: 0.4, roughness: 0.5, ...common });
  const mats = [metal, copper, knit, dark];

  const root = new THREE.Group();
  root.name = "pendel-arc-headphones";

  // headband: a ribbon swept along the arch
  const half: [number, number][] = [[547, 0], [512, 52], [474, 106], [448, 189], [405, 300], [335, 420], [225, 520], [85, 575], [0, 582]];
  const pts = [
    ...half.map(([x, y]) => new THREE.Vector3(-x, y, 0)),
    ...half.slice(0, -1).reverse().map(([x, y]) => new THREE.Vector3(x, y, 0)),
  ];
  const path = new THREE.CatmullRomCurve3(pts, false, "centripetal");
  const sec = new THREE.Shape();
  const T = 58, D = 17, r = 12;
  sec.moveTo(-T, -D + r);
  sec.lineTo(-T, D - r);
  sec.quadraticCurveTo(-T, D, -T + r, D);
  sec.lineTo(T - r, D);
  sec.quadraticCurveTo(T, D, T, D - r);
  sec.lineTo(T, -D + r);
  sec.quadraticCurveTo(T, -D, T - r, -D);
  sec.lineTo(-T + r, -D);
  sec.quadraticCurveTo(-T, -D, -T, -D + r);
  const band = new THREE.Mesh(new THREE.ExtrudeGeometry(sec, { steps: 160, bevelEnabled: false, extrudePath: path }), metal);
  band.name = "headband";
  root.add(band);

  for (const side of [-1, 1]) {
    const s = new THREE.Group();
    s.name = side < 0 ? "left-side" : "right-side";
    s.position.x = side * 547;
    // pivot (axis toward camera)
    const pivot = new THREE.Mesh(new THREE.CylinderGeometry(45, 45, 132, 48), metal);
    pivot.rotation.x = Math.PI / 2;
    const dot = new THREE.Mesh(new THREE.CylinderGeometry(7, 7, 6, 20), copper);
    dot.rotation.x = Math.PI / 2;
    dot.position.z = 67;
    const dot2 = dot.clone();
    dot2.position.z = -67;
    // arm down to the cup
    const arm = new THREE.Mesh(new THREE.BoxGeometry(30, 260, 24), metal);
    arm.position.set(-side * 14, -140, 0);
    arm.rotation.z = side * 0.1;
    // cup: axis along x, cushion facing inward
    const cup = new THREE.Group();
    cup.position.set(-side * 70, -340, 0);
    const shell = new THREE.Mesh(new THREE.CylinderGeometry(165, 165, 60, 64), metal);
    shell.rotation.z = Math.PI / 2;
    shell.position.x = side * 40;
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(120, 120, 6, 64), dark);
    ring.rotation.z = Math.PI / 2;
    ring.position.x = side * 72;
    const cushion = new THREE.Mesh(new THREE.SphereGeometry(170, 48, 24), knit);
    cushion.scale.set(0.42, 1, 1);
    cushion.position.x = -side * 10;
    cup.add(shell, ring, cushion);
    pivot.name = `${s.name}-pivot`;
    dot.name = `${s.name}-copper-dot`;
    dot2.name = `${s.name}-copper-dot-back`;
    arm.name = `${s.name}-arm`;
    cup.name = `${s.name}-ear-cup`;
    shell.name = `${s.name}-cup-shell`;
    ring.name = `${s.name}-cup-ring`;
    cushion.name = `${s.name}-cushion`;
    s.add(pivot, dot, dot2, arm, cup);
    root.add(s);
  }
  root.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) o.userData.pickable = undefined;
  });
  return {
    root,
    clip(planes: THREE.Plane[]) {
      mats.forEach((m) => (m.clippingPlanes = planes));
    },
    order(n: number) {
      root.traverse((o) => (o.renderOrder = n));
    },
  };
}
