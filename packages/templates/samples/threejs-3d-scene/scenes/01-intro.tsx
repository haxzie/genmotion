import * as THREE from "three";
import {
  ThreeScene,
  AbsoluteFill,
  TextAnimation,
  Sequence,
  useCurrentFrame,
  useWindowDuration,
  interpolate,
  Easing,
  random,
} from "@genmotion/motion";

const GREEN = "#22e58a";
const GREEN_DIM = "#0f7a4a";
const BG = "#050807";

// City-ish points on the globe (lat, lon) — the arcs travel between these.
const NODES: [number, number][] = [
  [40.7, -74.0], // New York
  [51.5, -0.1], // London
  [35.7, 139.7], // Tokyo
  [-33.9, 151.2], // Sydney
  [19.1, 72.9], // Mumbai
  [-23.5, -46.6], // São Paulo
  [37.8, -122.4], // San Francisco
  [1.3, 103.8], // Singapore
  [55.8, 37.6], // Moscow
  [30.0, 31.2], // Cairo
  [-1.3, 36.8], // Nairobi
  [52.5, 13.4], // Berlin
];

const ARCS: [number, number][] = [
  [0, 1], [1, 4], [4, 7], [7, 2], [2, 6], [6, 0],
  [5, 0], [1, 9], [9, 10], [3, 7], [8, 2], [11, 4], [6, 3], [5, 10],
];

function latLonToVec(lat: number, lon: number, r: number) {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((lon + 180) * Math.PI) / 180;
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta),
  );
}

export default function Scene() {
  const frame = useCurrentFrame();
  const windowEnd = useWindowDuration();

  // The globe canvas itself fades in fast and never exits — it's the handoff.
  const canvasIn = interpolate(frame, [0, 14], [0, 1], {
    easing: Easing.outSmooth,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const glowPulse = interpolate(frame, [0, 60, 120, 150], [0.35, 0.6, 0.4, 0.55], {
    easing: Easing.inOutCubic,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const labelOut = interpolate(frame, [windowEnd - 16, windowEnd - 6], [1, 0], {
    easing: Easing.inOutCubic,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: BG, fontFamily: "Inter, sans-serif" }}>
      {/* Ambient green glow behind the globe */}
      <div
        id="globe-glow"
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: 1100,
          height: 1100,
          marginLeft: -550,
          marginTop: -550,
          borderRadius: "50%",
          background: `radial-gradient(circle, rgba(34,229,138,${0.18 * glowPulse}) 0%, rgba(34,229,138,0.04) 40%, rgba(5,8,7,0) 70%)`,
          opacity: canvasIn,
        }}
      />

      <div id="globe" style={{ position: "absolute", inset: 0, opacity: canvasIn }}>
        <ThreeScene
          id="globe-canvas"
          build={({ scene, camera }) => {
            const R = 2;
            const group = new THREE.Group();
            scene.add(group);

            // Dark core sphere so back-side dots are occluded
            const core = new THREE.Mesh(
              new THREE.SphereGeometry(R * 0.985, 64, 64),
              new THREE.MeshStandardMaterial({ color: "#0a1210", roughness: 0.9, metalness: 0.1 }),
            );
            group.add(core);

            // Dot-matrix surface — deterministic fibonacci sphere
            const DOTS = 3200;
            const pos = new Float32Array(DOTS * 3);
            const golden = Math.PI * (3 - Math.sqrt(5));
            for (let i = 0; i < DOTS; i++) {
              const y = 1 - (i / (DOTS - 1)) * 2;
              const rad = Math.sqrt(1 - y * y);
              const t = golden * i;
              pos[i * 3] = Math.cos(t) * rad * R;
              pos[i * 3 + 1] = y * R;
              pos[i * 3 + 2] = Math.sin(t) * rad * R;
            }
            const dotGeo = new THREE.BufferGeometry();
            dotGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
            const dots = new THREE.Points(
              dotGeo,
              new THREE.PointsMaterial({ color: GREEN_DIM, size: 0.022, transparent: true, opacity: 0.9 }),
            );
            group.add(dots);

            // Lat/long wire grid
            const wire = new THREE.Mesh(
              new THREE.SphereGeometry(R * 1.002, 36, 18),
              new THREE.MeshBasicMaterial({ color: GREEN, wireframe: true, transparent: true, opacity: 0.06 }),
            );
            group.add(wire);

            // Node markers
            const nodeVecs = NODES.map(([la, lo]) => latLonToVec(la, lo, R * 1.01));
            const nodeMat = new THREE.MeshBasicMaterial({ color: GREEN });
            const nodeGeo = new THREE.SphereGeometry(0.03, 12, 12);
            const ringGeo = new THREE.RingGeometry(0.05, 0.065, 32);
            const rings: THREE.Mesh[] = [];
            nodeVecs.forEach((v) => {
              const m = new THREE.Mesh(nodeGeo, nodeMat);
              m.position.copy(v);
              group.add(m);
              const ring = new THREE.Mesh(
                ringGeo,
                new THREE.MeshBasicMaterial({ color: GREEN, transparent: true, opacity: 0.6, side: THREE.DoubleSide }),
              );
              ring.position.copy(v);
              ring.lookAt(v.clone().multiplyScalar(2));
              group.add(ring);
              rings.push(ring);
            });

            // Arcs: full path as faint line + bright travelling segment
            const SEG = 80;
            const arcs = ARCS.map(([a, b], idx) => {
              const start = nodeVecs[a];
              const end = nodeVecs[b];
              const dist = start.distanceTo(end);
              const mid = start.clone().add(end).multiplyScalar(0.5).normalize().multiplyScalar(R + 0.25 + dist * 0.3);
              const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
              const pts = curve.getPoints(SEG);
              const faint = new THREE.Line(
                new THREE.BufferGeometry().setFromPoints(pts),
                new THREE.LineBasicMaterial({ color: GREEN, transparent: true, opacity: 0 }),
              );
              group.add(faint);
              // Full-length buffer; the visible bright segment is a draw range over it.
              const headGeo = new THREE.BufferGeometry().setFromPoints(pts);
              headGeo.setDrawRange(0, 2);
              const head = new THREE.Line(headGeo, new THREE.LineBasicMaterial({ color: GREEN, transparent: true, opacity: 1 }));
              group.add(head);
              const spark = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 8), new THREE.MeshBasicMaterial({ color: "#c8ffe4" }));
              group.add(spark);
              return {
                pts,
                faint,
                head,
                spark,
                delay: 0.25 + random("arc" + idx) * 2.6,
                speed: 1.4 + random("spd" + idx) * 0.8,
              };
            });

            // Lights
            const key = new THREE.DirectionalLight(0x9affd0, 1.6);
            key.position.set(4, 3, 5);
            const rim = new THREE.DirectionalLight(0x22e58a, 2.2);
            rim.position.set(-5, -2, -3);
            scene.add(key, rim, new THREE.AmbientLight(0x2a5a44, 0.9));

            camera.position.set(0, 0.35, 5.6);
            camera.lookAt(0, 0, 0);

            return ({ time, progress }) => {
              group.rotation.y = -0.9 + time * 0.22;
              group.rotation.x = 0.28;
              // slow push-in across the scene
              camera.position.z = 5.6 - progress * 0.7;
              camera.lookAt(0, 0, 0);

              rings.forEach((ring, i) => {
                const s = 1 + ((time * 0.8 + i * 0.37) % 1) * 1.6;
                ring.scale.setScalar(s);
                (ring.material as THREE.MeshBasicMaterial).opacity = 0.7 * (1 - ((time * 0.8 + i * 0.37) % 1));
              });

              arcs.forEach(({ pts, faint, head, spark, delay, speed }) => {
                const t = (time - delay) / speed; // 0..1 draw, then hold/loop
                const cycle = 2.2;
                const local = t < 0 ? -1 : (t % cycle);
                const draw = Math.max(0, Math.min(1, local)); // draws over 1s
                const fadeTail = local > 1.6 ? Math.max(0, 1 - (local - 1.6) / 0.5) : 1;

                const n = Math.max(2, Math.floor(draw * SEG) + 1);
                const headStart = Math.max(0, n - 22);
                head.geometry.setDrawRange(headStart, Math.max(2, n - headStart));
                (head.material as THREE.LineBasicMaterial).opacity = local < 0 ? 0 : draw < 1 ? 1 : fadeTail;

                (faint.material as THREE.LineBasicMaterial).opacity = local < 0 ? 0 : 0.28 * draw * fadeTail;

                const sp = pts[Math.min(SEG, n - 1)];
                spark.position.copy(sp);
                spark.visible = local >= 0 && draw < 1;
              });
            };
          }}
        />
      </div>

      {/* Copy — left-aligned, on a scrim so it clears the globe glow */}
      <Sequence from={8}>
        <AbsoluteFill style={{ alignItems: "flex-start", justifyContent: "flex-end", padding: "0 0 110px 120px" }}>
          <div id="eyebrow" style={{ marginBottom: 22, fontSize: 24, letterSpacing: "0.18em", textTransform: "uppercase", color: GREEN }}>
            <TextAnimation text="Global network" preset="fadeUp" exit="auto" />
          </div>
          <h1 id="hero-title" style={{ margin: 0, fontSize: 104, fontWeight: 500, letterSpacing: "-0.025em", lineHeight: 1.02, color: "#ededef" }}>
            <TextAnimation text={"Connected\neverywhere."} preset="blurUp" exit="auto" hold="float" />
          </h1>
          <p id="hero-sub" style={{ margin: "26px 0 0", fontSize: 36, color: "#8a8a93" }}>
            <TextAnimation text="Live routes across 40+ regions" preset="fadeUp" startFrom={14} exit="auto" />
          </p>
        </AbsoluteFill>
      </Sequence>

      {/* Status label, top-right */}
      <div
        id="status-label"
        style={{
          position: "absolute",
          top: 70,
          right: 120,
          display: "flex",
          alignItems: "center",
          gap: 14,
          fontSize: 28,
          color: "#8a8a93",
          opacity: canvasIn * labelOut,
          transform: `translateY(${(1 - canvasIn) * 20}px)`,
        }}
      >
        <span
          style={{
            width: 14,
            height: 14,
            borderRadius: "50%",
            backgroundColor: GREEN,
            boxShadow: `0 0 ${14 + glowPulse * 18}px ${GREEN}`,
          }}
        />
        <span>All systems live</span>
      </div>
    </AbsoluteFill>
  );
}
