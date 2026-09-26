"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Container, Eyebrow, Section } from "@/components/marketing/primitives";

/**
 * How it works: three steps, each one shown rather than described.
 *
 * Every panel is a scaled-down replica of the real editor chrome doing the
 * step: the chat composer taking a drop (`editor/components/chat-panel.tsx`),
 * the element prompt in the preview (`preview-inspector.tsx`), the export
 * dialog running (`export-button.tsx`). Borders, radii, accent colors and
 * copy are lifted from those components, so the graphics age with the app
 * instead of drifting into generic shapes.
 *
 * The motion is the `hiw-*` keyframes in globals.css on one shared 7s clock.
 * Nothing here runs on the main thread, and the section stays paused until it
 * scrolls into view, so the first loop a visitor sees starts at its beginning.
 */

/**
 * The window the panels are drawn in. Fixed pixel geometry inside a scaled
 * box: the mock is laid out once at 320x200 and scaled to whatever the card
 * is, so a 9px label stays proportional at every breakpoint instead of the
 * chrome growing while the type does not.
 */
const MOCK_W = 320;
const MOCK_H = 200;

function Panel({
  camera,
  children,
}: {
  /** Name of the `hiw-cam-*` keyframes that move the camera for this step. */
  camera: string;
  children: React.ReactNode;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);

  // The mock is laid out once at MOCK_W x MOCK_H and scaled to the card, so a
  // 8px label keeps its proportion to the chrome around it at every
  // breakpoint instead of the boxes growing while the type stays put. A
  // container query would express this without JS, but the scale factor is a
  // length divided by a length, which calc() will not do.
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => setScale(el.getBoundingClientRect().width / MOCK_W);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={box}
      aria-hidden
      className="relative w-full overflow-hidden bg-background"
      style={{ aspectRatio: `${MOCK_W} / ${MOCK_H}` }}
    >
      <div
        className="absolute left-0 top-0 origin-top-left"
        style={{
          width: MOCK_W,
          height: MOCK_H,
          transform: `scale(${scale})`,
          // Nothing to show until the first measurement, which lands before
          // paint; without this the mock flashes at full size on hydration.
          opacity: scale ? 1 : 0,
        }}
      >
        {/* The camera. One transform between the window and the mock, so the
            shot can move without anything inside the mock knowing. */}
        <div
          className="hiw-anim size-full origin-top-left"
          style={{ animationName: camera }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

/** The macOS-style pointer the cursor animations carry. */
function Cursor({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 12 18"
      className={className}
      style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.6))", ...style }}
    >
      <path
        d="M1 1l9.5 7.2H6.1l2.4 5.4-1.9.9-2.5-5.5L1 12.6z"
        fill="#ffffff"
        stroke="#08080a"
        strokeWidth="1"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** A file being dragged in: the app accepts image, video and audio. */
function FileTile({
  label,
  tone,
  kind,
  className,
  style,
}: {
  label: string;
  tone: string;
  kind: "video" | "image";
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`flex w-[74px] items-center gap-1.5 rounded-md border border-border-strong bg-surface-raised p-1 shadow-[0_8px_20px_rgba(0,0,0,0.5)] ${className ?? ""}`}
      style={style}
    >
      <span
        className={`flex size-5 shrink-0 items-center justify-center rounded-[3px] bg-gradient-to-br ${tone}`}
      >
        {kind === "video" ? (
          <svg viewBox="0 0 24 24" className="size-2.5 text-white/90" fill="currentColor">
            <path d="M8 5l11 7-11 7z" />
          </svg>
        ) : (
          <svg
            viewBox="0 0 24 24"
            className="size-2.5 text-white/90"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <circle cx="9" cy="9" r="2" />
            <path d="M3 17l5-5 4 4 3-3 6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <span className="truncate text-[8px] text-text-secondary">{label}</span>
    </div>
  );
}

/**
 * Step 1: three clips dragged onto the composer, dropped, and a prompt typed
 * over them. The composer is the real one, down to its drag-over state.
 */
function StartGraphic() {
  const prompt = "Make a 30 second launch video from these clips";
  return (
    <Panel camera="hiw-cam-1">
      {/* The transcript, stacked up from just above the composer: the wide
          shot opens on a chat with history, and the close-up on the input
          still has messages behind it instead of empty background. */}
      <div className="absolute inset-x-4 bottom-[78px] top-3 flex flex-col justify-end gap-2">
        <div className="space-y-1">
          <div className="h-[3px] w-[168px] rounded-full bg-border-strong" />
          <div className="h-[3px] w-[184px] rounded-full bg-border-strong" />
          <div className="h-[3px] w-[104px] rounded-full bg-border" />
        </div>
        <div className="ml-auto w-[116px] rounded-lg rounded-br-sm bg-green-muted px-2 py-1.5">
          <div className="h-[3px] w-[78px] rounded-full bg-green/70" />
          <div className="mt-1 h-[3px] w-[46px] rounded-full bg-green/40" />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[8px] leading-none text-green">✓</span>
          <span className="text-[8px] leading-none text-text-tertiary">6 tool calls</span>
        </div>
        <div className="space-y-1">
          <div className="h-[3px] w-[192px] rounded-full bg-border-strong" />
          <div className="h-[3px] w-[150px] rounded-full bg-border-strong" />
          <div className="h-[3px] w-[172px] rounded-full bg-border-strong" />
          <div className="h-[3px] w-[88px] rounded-full bg-border" />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[8px] leading-none text-green">✓</span>
          <span className="text-[8px] leading-none text-text-tertiary">
            Wrote file · scenes/01-inbox.ts
          </span>
        </div>
      </div>

      {/* Where the files come from, and the cursor carrying them. Positioned
          where they land; the keyframes bring them in from up and to the left. */}
      <div
        className="hiw-anim absolute left-[74px] top-[74px]"
        style={{ animationName: "hiw-drag", opacity: 0 }}
      >
        <div className="relative">
          <FileTile
            label="b-roll.mp4"
            kind="video"
            tone="from-purple/70 to-sky/50"
            className="absolute left-2 top-2 rotate-[6deg]"
          />
          <FileTile
            label="shot-01.png"
            kind="image"
            tone="from-pink/70 to-orange/50"
            className="absolute left-1 top-1 rotate-[-3deg]"
          />
          <FileTile label="hero.mp4" kind="video" tone="from-green/70 to-mint/50" />
          {/* The count badge a multi-file drag gets. */}
          <span className="absolute -right-1.5 -top-1.5 flex size-4 items-center justify-center rounded-full bg-accent text-[8px] font-medium text-white">
            3
          </span>
          <Cursor className="absolute -bottom-3 right-0 h-[15px] w-[10px]" />
        </div>
      </div>

      {/* The composer, copied from the chat panel: same radius, same border,
          same bottom row, same placeholder. */}
      <div className="absolute inset-x-4 bottom-4">
        <div className="relative rounded-[12px] border border-[#1f1f24] bg-surface px-2.5 py-2">
          {/* The drag-over state the form switches to when files are over it. */}
          <div
            className="hiw-anim pointer-events-none absolute inset-0 rounded-[12px] border border-accent bg-accent-muted/40 ring-2 ring-accent/30"
            style={{ animationName: "hiw-dropzone", opacity: 0 }}
          />

          {/* What the dropped files become: the upload pills, mid-upload. */}
          <div
            className="hiw-anim mb-1.5 flex gap-1 px-0.5"
            style={{ animationName: "hiw-attach" }}
          >
            {[
              ["hero.mp4", "100%"],
              ["shot-01.png", "100%"],
              ["b-roll.mp4", "64%"],
            ].map(([name, pct]) => (
              <span
                key={name}
                className="inline-flex items-center gap-1 rounded-full border border-accent/40 bg-accent-muted py-[1px] pl-1.5 pr-2 text-[8px] text-accent"
              >
                <span className="max-w-[46px] truncate">{name}</span>
                <span className="tabular-nums text-accent/70">{pct}</span>
              </span>
            ))}
          </div>

          {/* The line itself: placeholder underneath, the prompt revealed over
              it a character at a time, caret riding the same steps. */}
          <div className="relative h-[13px] px-0.5">
            <span
              className="hiw-anim absolute inset-0 text-[10px] leading-[13px] text-text-tertiary"
              style={{ animationName: "hiw-placeholder", opacity: 0 }}
            >
              Describe the video you want to make…
            </span>
            <span className="absolute inset-y-0 left-0.5 inline-flex items-center">
              <span className="relative">
                <span
                  className="hiw-anim block whitespace-nowrap text-[10px] leading-[13px] text-text-primary"
                  style={{
                    animationName: "hiw-typein",
                    animationTimingFunction: `steps(${prompt.length}, end)`,
                    clipPath: "inset(0 0 0 0)",
                  }}
                >
                  {prompt}
                </span>
                {/* Full-width wrapper, so the caret's percentage translate is a
                    percentage of the line rather than of the 1px caret. */}
                <span
                  className="hiw-anim absolute inset-y-0 left-0 w-full"
                  style={{
                    animationName: "hiw-caret",
                    animationTimingFunction: `steps(${prompt.length}, end)`,
                    opacity: 0,
                  }}
                >
                  <span className="block h-full w-px bg-text-primary" />
                </span>
              </span>
            </span>
          </div>

          {/* The composer's bottom row: attach, the send hint, the send key. */}
          <div className="flex items-center gap-2 pt-1.5">
            <span className="flex size-[15px] items-center justify-center rounded-full border border-border text-[10px] leading-none text-text-tertiary">
              +
            </span>
            <span className="min-w-0 flex-1 text-center text-[8px] text-text-tertiary">
              ⏎ to send
            </span>
            <span
              className="hiw-anim flex size-[17px] items-center justify-center rounded-full bg-cta text-background"
              style={{ animationName: "hiw-send", opacity: 1 }}
            >
              <svg viewBox="0 0 24 24" className="size-2.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 19V5M5 12l7-7 7 7" />
              </svg>
            </span>
          </div>
        </div>
      </div>
    </Panel>
  );
}

/**
 * Step 2: an element picked straight out of the preview and prompted in
 * place, then the scene restaging when the agent answers.
 */
function DirectGraphic() {
  const note = "make the logo bigger";
  return (
    <Panel camera="hiw-cam-2">
      {/* The preview surface, with the scene on it. */}
      <div className="absolute inset-0 overflow-hidden bg-surface">
        <div className="absolute left-0 right-0 top-0 flex items-center gap-2 border-b border-border px-2.5 py-1.5">
          <span className="text-[8px] text-text-secondary">Preview</span>
          <span className="font-mono text-[8px] text-text-tertiary">
            00:05.21 / 00:32.00
          </span>
        </div>

        {/* The frame being previewed. */}
        <div className="absolute inset-x-3 bottom-3 top-[30px] overflow-hidden rounded-[3px] bg-gradient-to-b from-[#141419] to-[#0c0c10]">
          <div
            className="hiw-anim absolute left-4 top-5 h-[5px] w-[104px] origin-left rounded-full bg-text-secondary"
            style={{ animationName: "hiw-extend", transform: "scaleX(1)" }}
          />
          <div className="absolute left-4 top-[34px] h-[4px] w-[66px] rounded-full bg-border-strong" />

          {/* The element under the cursor: selection outline, the prompt
              anchored to it, and the restage once the agent answers. */}
          <div className="absolute bottom-[26px] left-[26px]">
            {/* Element and its outline restage together: in the app the
                selection tracks what it has hold of, so a ring left behind at
                the old position would be a bug on screen. */}
            <div
              className="hiw-anim relative size-9"
              style={{ animationName: "hiw-restage" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.svg" alt="" className="size-full rounded-lg" />
              <div
                className="hiw-anim absolute -inset-[3px] rounded-[10px] ring-1 ring-[#a855f7]"
                style={{ animationName: "hiw-select", opacity: 1 }}
              />
            </div>
            <Cursor
              className="hiw-anim absolute bottom-1 right-1 h-[15px] w-[10px]"
              style={{ animationName: "hiw-point" }}
            />
          </div>

          {/* The element prompt, styled as the inspector draws it. */}
          <div
            className="hiw-anim absolute bottom-[30px] left-[72px] w-[124px] rounded-[9px] border border-[#a855f7]/50 bg-surface/95 px-1.5 py-1.5 shadow-[0_12px_36px_rgba(0,0,0,0.5)] backdrop-blur-md"
            style={{ animationName: "hiw-popin" }}
          >
            <span className="block truncate text-[8px]" style={{ color: "#cba3f5" }}>
              #Logo-1<span className="text-[#a855f7]/70"> · 00:05.21</span>
            </span>
            <div className="mt-1 flex items-center gap-1.5">
              <span className="relative min-w-0 flex-1">
                <span
                  className="hiw-anim block whitespace-nowrap text-[9px] text-text-primary"
                  style={{
                    animationName: "hiw-typein-2",
                    animationTimingFunction: `steps(${note.length}, end)`,
                    clipPath: "inset(0 0 0 0)",
                  }}
                >
                  {note}
                </span>
                <span
                  className="hiw-anim absolute inset-y-0 left-0 w-full"
                  style={{
                    animationName: "hiw-caret-2",
                    animationTimingFunction: `steps(${note.length}, end)`,
                    opacity: 0,
                  }}
                >
                  <span className="block h-full w-px bg-text-primary" />
                </span>
              </span>
              <span className="flex size-[14px] shrink-0 items-center justify-center rounded-full bg-cta text-background">
                <svg viewBox="0 0 24 24" className="size-2" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 19V5M5 12l7-7 7 7" />
                </svg>
              </span>
            </div>
          </div>

          {/* What the agent is doing about it, in the app's own wording. */}
          <div
            className="hiw-anim absolute inset-x-2.5 bottom-2 flex items-center gap-1.5"
            style={{ animationName: "hiw-working" }}
          >
            <span className="size-1.5 rounded-full bg-green" />
            <span className="text-[8px] text-text-secondary">
              Rewrote scene · 2 tool calls
            </span>
          </div>
        </div>
      </div>
    </Panel>
  );
}

/** Step 3: the export dialog running, and the file it leaves behind. */
function ExportGraphic() {
  return (
    <Panel camera="hiw-cam-3">
      {/* The editor's top strip, so the Export button sits where it really is. */}
      {/* Runs past the mock on both sides: the camera pans to the Export
          button, and a border that stopped at the mock's edge would end in
          mid-air inside the shot. */}
      <div className="absolute -inset-x-24 top-0 flex items-center gap-3 border-b border-border pl-[120px] pr-[108px] py-2">
        <span className="text-[8px] text-text-primary">Preview</span>
        <span className="text-[8px] text-text-tertiary">Assets</span>
        <span className="text-[8px] text-text-tertiary">Code</span>
        <span className="flex-1" />
        <span className="rounded-md bg-cta px-2 py-[3px] text-[8px] font-medium text-background">
          Export
        </span>
      </div>

      {/* The editor underneath: the frame being previewed and the timeline,
          dimmed by the dialog's scrim the way a modal dims the app. */}
      <div className="absolute bottom-[52px] left-3 right-[-96px] top-[36px] rounded-[3px] bg-gradient-to-b from-[#141419] to-[#0c0c10]">
        <div className="absolute left-4 top-4 h-[5px] w-[104px] rounded-full bg-text-secondary/60" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.svg" alt="" className="absolute bottom-5 left-4 size-9 rounded-lg opacity-80" />
      </div>
      <div className="absolute bottom-0 left-0 right-[-96px] flex h-[46px] gap-1 border-t border-border bg-surface px-3 pt-2">
        {["w-[34%]", "w-[22%]", "w-[26%]", "flex-1"].map((w, i) => (
          <div
            key={w}
            className={`${w} rounded-[3px] border border-border bg-surface-raised/80`}
          >
            <div className="mx-1 mt-1 h-[3px] rounded-full bg-border-strong" />
            <div className="mx-1 mt-1 h-[3px] w-1/2 rounded-full bg-border" />
            {i === 0 && <div className="mx-1 mt-1 h-[3px] w-2/3 rounded-full bg-green/40" />}
          </div>
        ))}
      </div>
      <div
        className="hiw-anim absolute -inset-x-24 inset-y-0 bg-black/55"
        style={{ animationName: "hiw-dialog", opacity: 1 }}
      />

      {/* The export dialog, with the details grid the real one shows. */}
      <div
        className="hiw-anim absolute inset-x-5 top-[36px] overflow-hidden rounded-lg border border-border bg-surface shadow-[0_16px_40px_rgba(0,0,0,0.55)]"
        style={{ animationName: "hiw-dialog", opacity: 1 }}
      >
        <div className="border-b border-border px-2.5 py-1.5 text-[9px] font-semibold text-text-primary">
          Export video
        </div>
        <div className="p-2.5">
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[5px] border border-border bg-border">
            {[
              ["Resolution", "1920 × 1080"],
              ["Frame rate", "30 fps"],
            ].map(([label, value]) => (
              <div key={label} className="bg-surface-raised px-2 py-1">
                <div className="text-[7px] text-text-tertiary">{label}</div>
                <div className="text-[8px] tabular-nums text-text-primary">{value}</div>
              </div>
            ))}
          </div>

          {/* Format row: MP4 selected, the way it opens. */}
          <div className="mt-1.5 flex gap-1 rounded-[5px] border border-border bg-surface-raised p-[3px]">
            {["MP4", "WebM", "GIF"].map((f, i) => (
              <span
                key={f}
                className={`flex-1 rounded-[3px] py-[3px] text-center text-[8px] ${
                  i === 0
                    ? "bg-surface text-text-primary ring-1 ring-border-strong"
                    : "text-text-secondary"
                }`}
              >
                {f}
              </span>
            ))}
          </div>

          {/* The render itself, and the status line the dialog swaps through. */}
          <div className="mt-2 h-[3px] overflow-hidden rounded-full bg-surface-raised">
            <div
              className="hiw-anim h-full w-full origin-left rounded-full bg-green"
              style={{ animationName: "hiw-render", transform: "scaleX(1)" }}
            />
          </div>
          <div className="relative mt-1.5 h-[10px]">
            {[
              ["Rendering frames…", "hiw-status-a", "text-text-secondary"],
              ["Encoding…", "hiw-status-b", "text-text-secondary"],
              ["Done · 960 frames", "hiw-status-done", "text-green"],
            ].map(([label, name, tone]) => (
              <span
                key={label}
                className={`hiw-anim absolute inset-0 text-[8px] ${tone}`}
                // Only the finished line rests visible; the two the dialog
                // passes through on the way there would overlap it.
                style={{ animationName: name, opacity: name === "hiw-status-done" ? 1 : 0 }}
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* The finished file, landing and then flying up to the Exports tab. */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
        <div
          className="hiw-anim flex items-center gap-1.5 rounded-lg border border-border bg-surface-raised px-2 py-1 shadow-[0_10px_28px_rgba(0,0,0,0.6)]"
          style={{ animationName: "hiw-land" }}
        >
          <span className="flex size-3.5 items-center justify-center rounded-full bg-green-muted">
            <svg viewBox="0 0 24 24" className="size-2 text-green" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 13l4 4L19 7" />
            </svg>
          </span>
          <span className="font-mono text-[8px] text-text-secondary">launch.mp4</span>
        </div>
      </div>

      {/* The pointer that clicked Export and then the render. */}
      <Cursor
        className="hiw-anim absolute right-[26px] top-[22px] h-[15px] w-[10px]"
        style={{ animationName: "hiw-point-3", opacity: 0 }}
      />
    </Panel>
  );
}

const STEPS = [
  {
    title: "Start with an idea or a template",
    body: "Drop your clips and images straight into the chat, describe the video you want, or open a finished template and make it yours.",
    Graphic: StartGraphic,
  },
  {
    title: "Direct the scene with AI prompts",
    body: "Click any element in the preview and ask for the change in plain language. The agent rewrites the scene and the preview follows.",
    Graphic: DirectGraphic,
  },
  {
    title: "Export your scene and share it",
    body: "A headless render gives you a pixel identical MP4 in any aspect ratio, ready to post wherever your audience is.",
    Graphic: ExportGraphic,
  },
];

export function HowItWorks() {
  const ref = useRef<HTMLDivElement>(null);
  const [play, setPlay] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Latch on: once the loops have started there is nothing to gain from
    // stopping them again, and someone scrolling back up to re-read a step
    // should not find three frozen panels.
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setPlay(true);
          observer.disconnect();
        }
      },
      { threshold: 0.25 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Section>
      <Container>
        <div ref={ref} data-hiw-play={play}>
          <div className="mx-auto max-w-2xl text-center">
            <Eyebrow className="mb-4">How it works</Eyebrow>
            <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              From idea to video in three steps
            </h2>
          </div>
          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {STEPS.map(({ title, body, Graphic }, i) => (
              <div
                key={title}
                className="overflow-hidden rounded-xl border border-border bg-surface transition-colors duration-150 hover:border-border-strong"
              >
                {/* Full bleed: the mock runs to the card's own edges, so the
                    card reads as a window onto the app rather than a
                    screenshot pasted inside one. */}
                <Graphic />
                <div className="flex items-start justify-between gap-4 px-5 pt-5">
                  <h3 className="text-[1.05rem] font-medium">{title}</h3>
                  <span className="mt-0.5 shrink-0 font-mono text-[0.786rem] text-text-tertiary">
                    0{i + 1}
                  </span>
                </div>
                <p className="px-5 pb-5 pt-1.5 text-[0.95rem] text-text-secondary">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </Section>
  );
}
