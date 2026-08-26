import type { ReactNode } from "react";
import { TextComponentsDemo, TextGallery } from "./gallery";

/**
 * Reference for @genmotion/motion — the primitives scenes are built from, with
 * the text effect catalog rendered live. This is where the catalog gets tuned:
 * you cannot judge a reveal by reading its `from` values.
 */
export const metadata = { title: "Motion library — GenMotion dev" };

function Section({
  id,
  title,
  intro,
  children,
}: {
  id: string;
  title: string;
  intro?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section id={id} className="flex scroll-mt-6 flex-col gap-4 border-t border-border pt-10">
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-medium text-text-primary">{title}</h2>
        {intro && <div className="max-w-3xl text-sm text-text-secondary">{intro}</div>}
      </div>
      {children}
    </section>
  );
}

function Code({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-lg border border-border bg-surface p-4 font-mono text-xs leading-relaxed text-text-primary">
      <code>{children}</code>
    </pre>
  );
}

function Api({ rows }: { rows: [string, string][] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full border-collapse text-sm">
        <tbody>
          {rows.map(([sig, desc], i) => (
            <tr key={sig} className={i > 0 ? "border-t border-border" : undefined}>
              <td className="w-[38%] min-w-[220px] px-3 py-2 align-top">
                <code className="font-mono text-xs text-accent">{sig}</code>
              </td>
              <td className="px-3 py-2 align-top text-text-secondary">{desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const NAV = [
  ["clock", "Frame clock"],
  ["math", "Animation math"],
  ["sequencing", "Sequencing"],
  ["text", "Text effects"],
  ["text-components", "Text components"],
  ["camera", "Camera"],
  ["extras", "Confetti & media"],
  ["rules", "Determinism rules"],
];

export default function MotionDevPage() {
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10">
      <header className="flex flex-col gap-3">
        <h1 className="text-2xl font-medium text-text-primary">@genmotion/motion</h1>
        <p className="max-w-3xl text-sm text-text-secondary">
          The frame-deterministic runtime every scene is built from. Everything here is a
          pure function of the current frame — the editor preview and the export renderer
          run the same tree, so what scrubs is what renders.
        </p>
        <nav className="flex flex-wrap gap-x-4 gap-y-1">
          {NAV.map(([id, label]) => (
            <a
              key={id}
              href={`#${id}`}
              className="text-sm text-accent hover:underline"
            >
              {label}
            </a>
          ))}
        </nav>
      </header>

      <Section
        id="clock"
        title="Frame clock"
        intro="Every animated value is derived from the current frame. There is no elapsed-time clock, no rAF in scene code, and no CSS transitions."
      >
        <Api
          rows={[
            ["useCurrentFrame(): number", "Current frame, relative to the nearest enclosing <Sequence>."],
            [
              "useVideoConfig()",
              "{ fps, width, height, durationInFrames } — durationInFrames is always the WHOLE scene.",
            ],
            [
              "useWindowDuration(): number",
              "Length of the window this element lives in: the enclosing <Sequence>'s duration, or the scene's. This is the number to time an exit against.",
            ],
            ["useSequenceDuration(): number | null", "The enclosing <Sequence>'s length, or null when unbounded."],
            ["useRenderMode()", '"preview" in the editor, "render" during export.'],
            ["useIsPlaying()", "Whether the player is playing rather than scrubbing. Preview only."],
          ]}
        />
      </Section>

      <Section id="math" title="Animation math">
        <Api
          rows={[
            [
              "interpolate(frame, inRange, outRange, opts?)",
              "Map a frame onto a value. Ranges can be multi-segment. Pass extrapolateLeft/Right: \"clamp\" unless you want extension.",
            ],
            [
              "spring({ frame, fps, from?, to?, config?, delay?, durationInFrames? })",
              "Physics spring. Trajectories are cached per config, so evaluating frames out of order gives identical results.",
            ],
            [
              "springPresets",
              "default | gentle | bouncy | molasses | stiff.",
            ],
            [
              "Easing",
              "outSmooth (the house ease), outCubic/outQuart/outExpo/outBounce, inOutCubic, linear, bezier(x1,y1,x2,y2), and in/out/inOut combinators.",
            ],
            ["stagger({ frame, index, each?, duration?, delay?, easing? })", "Eased 0..1 for the index-th item of a list."],
            ["timeline(frame, [{ at, dur, ease? }])", "One 0..1 progress value per segment."],
            ["progress(frame, from, to, ease?)", "Eased 0..1 between two frames."],
            ["random(seed)", "Deterministic PRNG in [0,1). The only sanctioned source of randomness."],
          ]}
        />
        <Code>{`const opacity = interpolate(frame, [0, 12], [0, 1], {
  easing: Easing.outSmooth,
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
});`}</Code>
      </Section>

      <Section
        id="sequencing"
        title="Sequencing"
        intro={
          <>
            <code className="font-mono text-xs text-accent">&lt;Sequence&gt;</code> shifts
            the frame clock and unmounts its children outside their window. It also
            publishes its own length, which is what lets{" "}
            <code className="font-mono text-xs text-accent">exit=&quot;auto&quot;</code>{" "}
            time itself correctly inside one.
          </>
        }
      >
        <Code>{`<Sequence from={0} durationInFrames={55}>
  {/* useCurrentFrame() starts at 0 here; useWindowDuration() returns 55 */}
  <TextAnimation text="First, the problem." preset="blurUp" exit="auto" />
</Sequence>`}</Code>
      </Section>

      <Section
        id="text"
        title="Text effects"
        intro={
          <>
            <code className="font-mono text-xs text-accent">&lt;TextAnimation&gt;</code> is
            how text animates. An effect declares only where a unit comes{" "}
            <em>from</em> — the settled state is always identity — so every effect works as
            both an entrance and an exit, and directional ones continue their travel on the
            way out rather than reversing.
          </>
        }
      >
        <Api
          rows={[
            ["text", 'A string; "\\n" or a string[] gives explicit lines. There is no measured wrapping.'],
            ["by", '"word" (default) | "char" | "line" | "none". Falls back to the effect\'s own preference.'],
            ["preset", "Any name from the catalog below."],
            [
              "exit",
              '"auto" (leaves the way it arrived, finishing 6 frames before the window ends) | a preset name | { at, duration, stagger, preset, transform } | false.',
            ],
            ["order", '"forward" | "reverse" | "center" | "edges" | "random".'],
            ["hold", '"float" | "breathe" | "wave" | "shimmer" | "glow" — ambient motion between enter and exit.'],
            ["startFrom / duration / stagger / easing", "Per-effect defaults are already tuned; override only for pace."],
            ["id / as / style / className", "id matters for <Camera focus> and the editor inspector."],
          ]}
        />
        <Code>{`<TextAnimation text="Ship it faster" preset="riseMask" exit="auto" hold="float" />`}</Code>
        <TextGallery />
      </Section>

      <Section
        id="text-components"
        title="Text components"
        intro="The effects that can't be expressed as a pure style function get their own components."
      >
        <TextComponentsDemo />
      </Section>

      <Section
        id="camera"
        title="Camera"
        intro="A real 2.5D camera. Use it for every push, pull, pan and parallax — never a hand-rolled scale on a wrapper, which zooms about the frame centre and multiplies any blur or shadow on the way."
      >
        <Api
          rows={[
            ["<Camera world perspective keyframes drift shake>", "The scene root; it is position:absolute inset-0, so pass the background through style."],
            ["<Layer z>", "Parallax depth. Bigger z is further away and moves less."],
            ["<Overlay>", "Screen-locked; the camera move doesn't drag it."],
            ["CameraKeyframe", "{ at, x, y, zoom, rotation, tilt, ease, path, focus, fit, fitMode } — omitted fields inherit from the previous keyframe."],
          ]}
        />
        <Code>{`<Camera
  world={2}
  keyframes={[
    { at: 0, x: 0.5, y: 0.5, zoom: 1 },
    { at: 45, focus: "pricing-card", fit: 0.75, ease: Easing.inOutCubic },
  ]}
/>`}</Code>
      </Section>

      <Section id="extras" title="Confetti & media">
        <Api
          rows={[
            [
              "<Confetti origin angle spread mode power gravity count colors seed />",
              'Frame-deterministic particles. mode="burst" | "rain"; spread={360} is a firework.',
            ],
            ["<Img src>", "Awaits decode() before the render barrier releases the frame."],
            ["<Video src startFrom volume loop>", "Seeks to an exact currentTime during export."],
            ["<Audio src volume>", "Preview only — exports mux audio with ffmpeg instead."],
            ["useGsapTimeline(builder)", "The escape hatch: build a paused timeline once, seeked per frame. No repeat: -1."],
          ]}
        />
      </Section>

      <Section
        id="rules"
        title="Determinism rules"
        intro="Frames are rendered out of real time, one at a time, by seeking. A scene that reads the wall clock or its own previous state renders differently in the editor than in the export."
      >
        <ul className="flex list-disc flex-col gap-2 pl-5 text-sm text-text-secondary">
          <li>
            Banned in scene code:{" "}
            <code className="font-mono text-xs">Math.random</code>,{" "}
            <code className="font-mono text-xs">Date.now</code>,{" "}
            <code className="font-mono text-xs">new Date</code>, timers,{" "}
            <code className="font-mono text-xs">requestAnimationFrame</code>, CSS
            animations and transitions. Use{" "}
            <code className="font-mono text-xs">random(seed)</code> for randomness.
          </li>
          <li>
            Scenes may import only <code className="font-mono text-xs">react</code>,{" "}
            <code className="font-mono text-xs">@genmotion/motion</code>,{" "}
            <code className="font-mono text-xs">gsap</code> and{" "}
            <code className="font-mono text-xs">lucide-react</code>.
          </li>
          <li>
            Inline styles only, and never a CSS shorthand alongside its longhand on one
            element.
          </li>
          <li>
            Anything locale- or environment-dependent must be pinned. The renderer is not
            guaranteed to share the editor&apos;s locale — this is why{" "}
            <code className="font-mono text-xs">CountText</code> defaults to an explicit
            one rather than calling <code className="font-mono text-xs">toLocaleString()</code>.
          </li>
          <li>
            Inside a <code className="font-mono text-xs">&lt;Camera&gt;</code>, avoid{" "}
            <code className="font-mono text-xs">willChange</code> /{" "}
            <code className="font-mono text-xs">translateZ</code>: they pin a layer&apos;s
            raster scale, so a zoom stretches a stale texture. The text components already
            handle this.
          </li>
        </ul>
      </Section>
    </main>
  );
}
