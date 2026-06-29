/**
 * Dev utility: seed test scenes into the newest project.
 * Run: pnpm --filter @genmotion/api seed
 */
import { db, schema, desc } from "@genmotion/db";

const GOOD_SCENE = `import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate, TextAnimation, Easing } from "@genmotion/motion";

export default function Scene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: { stiffness: 220, damping: 14 } });
  const fade = interpolate(frame, [60, 90], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.outSmooth });

  return (
    <AbsoluteFill style={{ background: "linear-gradient(135deg, #101225 0%, #0a0a0c 100%)", gap: 40 }}>
      <div style={{ transform: \`scale(\${pop})\`, fontSize: 120, fontWeight: 700, color: "#ededef", fontFamily: "Inter, sans-serif", letterSpacing: "-0.03em" }}>
        <TextAnimation text="Hello GenMotion" by="word" preset="fadeUp" />
      </div>
      <div style={{ opacity: fade, fontSize: 36, color: "#8a8a93", fontFamily: "Inter, sans-serif" }}>
        Seeded scene · edit me with AI
      </div>
    </AbsoluteFill>
  );
}
`;

const GSAP_SCENE = `import { AbsoluteFill, useGsapTimeline, gsap } from "@genmotion/motion";

export default function Scene() {
  const ref = useGsapTimeline<HTMLDivElement>((container) => {
    const tl = gsap.timeline();
    tl.from(container.querySelectorAll(".dot"), {
      scale: 0, opacity: 0, stagger: 0.06, duration: 0.5, ease: "back.out(2)",
    });
    tl.to(container.querySelectorAll(".dot"), {
      y: -40, stagger: { each: 0.05, yoyo: true, repeat: 1 }, duration: 0.4, ease: "power2.inOut",
    });
    return tl;
  });

  return (
    <AbsoluteFill style={{ background: "#0c0e1a" }}>
      <div ref={ref} style={{ display: "flex", gap: 28 }}>
        {Array.from({ length: 9 }, (_, i) => (
          <div key={i} className="dot" style={{ width: 60, height: 60, borderRadius: 30, background: \`hsl(\${230 + i * 8} 70% 60%)\` }} />
        ))}
      </div>
    </AbsoluteFill>
  );
}
`;

const BROKEN_SCENE = `import { AbsoluteFill } from "@genmotion/motion";

export default function Scene() {
  return (
    <AbsoluteFill>
      <h1>Oops</h1>
  );
}
`;

const [project] = await db
  .select()
  .from(schema.projects)
  .orderBy(desc(schema.projects.createdAt))
  .limit(1);

if (!project) {
  console.error("No project found — create one from the dashboard first.");
  process.exit(1);
}

await db.insert(schema.scenes).values([
  { projectId: project.id, name: "Hello", code: GOOD_SCENE, durationInFrames: 120, order: 1000 },
  { projectId: project.id, name: "GSAP Dots", code: GSAP_SCENE, durationInFrames: 90, order: 2000 },
  { projectId: project.id, name: "Broken", code: BROKEN_SCENE, durationInFrames: 60, order: 3000 },
]);

console.log(`Seeded 3 scenes into project "${project.name}" (${project.id})`);
process.exit(0);
