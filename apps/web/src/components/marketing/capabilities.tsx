"use client";

import { Container, Eyebrow, Section } from "@/components/marketing/primitives";
import { AudioClip, Mock, usePlayOnView } from "@/components/marketing/app-mock";
import { AgentMarks } from "@/components/marketing/agent-badges";

/**
 * What the studio gives you, as a bento of six cells, each one a small replica
 * of the app doing the thing rather than an icon standing for it.
 *
 * The mocks are drawn at a fixed size and scaled to fill their cell by height,
 * so a wide cell shows more of the track instead of a bigger track: the same
 * trick the timeline itself plays. Motion is the `cap-*` keyframes in
 * globals.css on a 6s clock, paused until the section is seen, and every cell
 * rests on a state that still reads with the motion switched off.
 */

/* Measured, not guessed: above lg the container caps at max-w-7xl and the
   grid is three columns of 350 with a 16px gutter and 260px rows, at every
   desktop width. A cell's canvas is exactly the box it is drawn into, so the
   chrome inside renders at 1:1 and an 8px label is 8px. */
const CELL = { w: 350, h: 260 };
const WIDE_CELL = { w: 714, h: 534 };

/** A track row: the gutter icon on the left, the lane to the right of it. */
function Lane({
  icon,
  children,
  className,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-stretch gap-2 ${className ?? ""}`}>
      <span className="flex w-5 shrink-0 items-center justify-center text-text-tertiary">
        {icon}
      </span>
      <div className="relative min-w-0 flex-1">{children}</div>
    </div>
  );
}

const FilmIcon = (
  <svg viewBox="0 0 24 24" className="size-3" fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M8 4v16M16 4v16" />
  </svg>
);

const NoteIcon = (
  <svg viewBox="0 0 24 24" className="size-3" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M9 18V6l10-2v12" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="6.5" cy="18" r="2.5" />
    <circle cx="16.5" cy="16" r="2.5" />
  </svg>
);

/** The ruler the app draws above the tracks. */
function Ruler({ from = 0, ticks = 12 }: { from?: number; ticks?: number }) {
  return (
    <div className="flex h-3 items-start">
      {Array.from({ length: ticks }, (_, i) => (
        <span
          key={i}
          className="flex-1 border-l border-border pl-1 font-mono text-[8px] leading-none text-text-tertiary"
        >
          00:{String(from + i).padStart(2, "0")}
        </span>
      ))}
    </div>
  );
}

/**
 * Video clips: four takes on the track, the playhead running across them, and
 * the preview above showing whichever one it is inside.
 */
function ClipsMock() {
  // Real frames out of the template catalog, not stand-in gradients: these
  // are videos GenMotion rendered, so the track is showing actual output.
  const clips = [
    { label: "Introducing Prequel", len: "4.0s", src: "/home/clip-1.webp", grow: 3 },
    { label: "Notion launch", len: "2.3s", src: "/home/clip-2.webp", grow: 2 },
    { label: "Gojiberry", len: "2.2s", src: "/home/clip-3.webp", grow: 2 },
    { label: "Astra", len: "3.9s", src: "/home/clip-4.webp", grow: 3 },
  ];
  return (
    <div className="absolute inset-0 px-7 pt-7">
      {/* The frame the playhead is standing on. The three crossfades are the
          three clips it passes through. */}
      <div className="relative mx-auto h-[292px] w-[520px] overflow-hidden rounded-md border border-border bg-surface">
        {clips.slice(0, 3).map((clip, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={clip.src}
            src={clip.src}
            alt=""
            width={520}
            height={292}
            loading="lazy"
            decoding="async"
            className={`app-anim cap-anim absolute inset-0 size-full object-cover`}
            style={{ animationName: `cap-frame-${i + 1}`, opacity: i === 0 ? 1 : 0 }}
          />
        ))}
      </div>

      <div className="relative mt-6">
        <Ruler />
        <Lane icon={FilmIcon} className="mt-2">
          <div className="flex gap-1.5">
            {clips.map((clip, i) => (
              <div
                key={clip.label}
                // The app tiles frames across a clip; a repeating background
                // at the lane's height is the same filmstrip, cheaper.
                className="relative h-[52px] overflow-hidden rounded-[4px] border border-border bg-surface-raised"
                style={{
                  flexGrow: clip.grow,
                  flexBasis: 0,
                  backgroundImage: `url(${clip.src})`,
                  backgroundSize: "auto 100%",
                  backgroundRepeat: "repeat-x",
                }}
              >
                <div className="flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent px-2 pb-2 pt-1.5">
                  <span className="truncate text-[10px] text-white/95">{clip.label}</span>
                  <span className="font-mono text-[9px] text-white/70">{clip.len}</span>
                </div>
                {i < 3 && (
                  <div
                    className="app-anim cap-anim absolute inset-0 rounded-[4px] ring-1 ring-inset ring-white/80"
                    style={{
                      animationName: `cap-clip-${i + 1}`,
                      opacity: i === 0 ? 1 : 0,
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        </Lane>
        {/* The playhead, over both the ruler and the track. The wrapper is the
            full width, so the percentage travel is the track's, not the line's. */}
        <div className="pointer-events-none absolute inset-y-0 left-[28px] right-0">
          <div
            className="app-anim cap-anim absolute inset-y-0 left-0 w-full"
            style={{ animationName: "cap-sweep", animationTimingFunction: "linear" }}
          >
            <div className="h-full w-px bg-scrub" />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Motion graphics: type animating in, over a frame GenMotion rendered. */
function MotionMock() {
  const words = ["Launch", "day", "is here"];
  return (
    <div className="absolute inset-0 p-5">
      <div className="relative h-[150px] w-full overflow-hidden rounded-[4px] border border-border bg-[#0c0c10]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/home/motion-frame.webp"
          alt=""
          width={560}
          height={316}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 size-full object-cover opacity-25"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#08080a] via-[#08080a]/80 to-transparent" />
        <div className="absolute left-5 top-5 space-y-1.5">
          {words.map((word, i) => (
            // Each word is masked by its own line box, so it rises out of the
            // line rather than sliding over what is above it.
            <span key={word} className="block overflow-hidden">
              <span
                className="app-anim cap-anim block text-[17px] font-semibold leading-[1.15] tracking-tight text-text-primary"
                style={{ animationName: "cap-word", animationDelay: `${i * 0.18}s` }}
              >
                {word}
              </span>
            </span>
          ))}
          <span
            className="app-anim cap-anim block h-[3px] w-[96px] origin-left rounded-full bg-green"
            style={{ animationName: "cap-rule" }}
          />
        </div>
      </div>
    </div>
  );
}

/** Voice overs: a voice picked from the list, its take landing on the track. */
function VoiceMock() {
  const voices = ["Rachel · warm", "Adam · narration"];
  return (
    <div className="absolute inset-0 p-5">
      <div className="rounded-[5px] border border-border bg-surface p-1.5">
        {voices.map((voice, i) => (
          <div key={voice} className="relative flex items-center gap-1.5 rounded-[3px] px-1.5 py-1">
            <span
              className="app-anim cap-anim absolute inset-0 rounded-[3px] bg-surface-raised ring-1 ring-inset ring-border-strong"
              style={{ animationName: `cap-pick-${i + 1}`, opacity: i === 1 ? 1 : 0 }}
            />
            <span className="relative flex size-3.5 items-center justify-center rounded-full bg-green-muted">
              <svg viewBox="0 0 24 24" className="size-2 text-green" fill="currentColor">
                <path d="M8 5l11 7-11 7z" />
              </svg>
            </span>
            <span className="relative text-[9px] text-text-secondary">{voice}</span>
          </div>
        ))}
      </div>

      <Lane icon={NoteIcon} className="mt-3">
        {/* The take landing on the lane. The clip arrives first, then its
            waveform is written across it the way a render fills in. */}
        <div className="app-anim cap-anim" style={{ animationName: "cap-take" }}>
          <AudioClip
            name="vo-01-fit.mp3"
            tone="voice"
            seed={1.3}
            samples={64}
            className="h-[44px]"
            waveClassName="app-anim cap-anim h-[64%]"
            waveStyle={{ animationName: "cap-draw" }}
          />
        </div>
      </Lane>
    </div>
  );
}

/** SFX: the hits the app puts on the audio lane, under the scenes they mark. */
function SfxMock() {
  // Where each hit sits on the lane, and how wide a chip it gets.
  const hits = [
    { left: "3%", width: "20%", label: "whoosh" },
    { left: "33%", width: "15%", label: "click" },
    { left: "60%", width: "22%", label: "riser" },
  ];
  return (
    <div className="absolute inset-0 p-5">
      <Ruler ticks={7} />
      <Lane icon={FilmIcon} className="mt-2">
        <div className="flex h-[30px] gap-1.5">
          {["/home/clip-1.webp", "/home/clip-3.webp", "/home/clip-4.webp"].map((src, i) => (
            <div
              key={src}
              className="overflow-hidden rounded-[3px] border border-border"
              style={{
                flexGrow: [3, 2, 3][i],
                flexBasis: 0,
                backgroundImage: `url(${src})`,
                backgroundSize: "auto 100%",
                backgroundRepeat: "repeat-x",
              }}
            />
          ))}
        </div>
      </Lane>
      <Lane icon={NoteIcon} className="mt-1.5">
        <div className="relative h-[46px]">
          {hits.map((hit, i) => (
            <div
              key={hit.label}
              className="app-anim cap-anim absolute top-1"
              style={{
                left: hit.left,
                width: hit.width,
                animationName: "cap-hit",
                animationDelay: `${i * 0.45}s`,
              }}
            >
              <AudioClip
                name={hit.label}
                tone="sfx"
                seed={2.1 + i}
                samples={16}
                className="h-[36px]"
                waveClassName="h-[52%]"
              />
              {/* The ring the hit throws off as it lands. */}
              <span
                className="app-anim cap-anim absolute -inset-1 rounded-md border border-pink"
                style={{ animationName: "cap-ring", animationDelay: `${i * 0.45}s` }}
              />
            </div>
          ))}
        </div>
      </Lane>
    </div>
  );
}

/** Image generation: a prompt, the shimmer, and the still that comes back. */
function ImageMock() {
  return (
    <div className="absolute inset-0 p-5">
      <div className="rounded-[10px] border border-[#1f1f24] bg-surface px-2 py-1.5">
        <span className="block text-[9px] text-text-primary">
          a team working late in an open office
        </span>
      </div>

      <div className="relative mt-3 h-[96px] overflow-hidden rounded-[4px] border border-border bg-surface-raised">
        {/* The empty tile, with the shimmer the app runs over a pending card. */}
        <span
          className="app-anim cap-anim absolute inset-y-0 -left-1/2 w-1/2 bg-gradient-to-r from-transparent via-white/10 to-transparent"
          style={{ animationName: "cap-shimmer", opacity: 0 }}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/home/generated-still.webp"
          alt=""
          width={320}
          height={180}
          loading="lazy"
          decoding="async"
          className="app-anim cap-anim absolute inset-0 size-full object-cover"
          style={{ animationName: "cap-resolve" }}
        />
        <span
          className="app-anim cap-anim absolute left-1.5 top-1.5 rounded-full border border-accent/40 bg-accent-muted px-1.5 py-[1px] text-[8px] text-accent"
          style={{ animationName: "cap-resolve" }}
        >
          office-01.png
        </span>
      </div>
    </div>
  );
}

/** Background music: the bed under a voiceover, ducking where they overlap. */
function MusicMock() {
  return (
    <div className="absolute inset-0 p-5">
      <div className="flex gap-1">
        {["Upbeat", "Cinematic", "Lo-fi"].map((mood, i) => (
          <span
            key={mood}
            className={`rounded-full border px-1.5 py-[1px] text-[8px] ${
              i === 1
                ? "border-green/50 bg-green-muted text-green"
                : "border-border bg-surface text-text-tertiary"
            }`}
          >
            {mood}
          </span>
        ))}
      </div>

      <Lane icon={NoteIcon} className="mt-2">
        <AudioClip
          name="vo-01-fit.mp3"
          tone="voice"
          seed={1.3}
          samples={52}
          className="h-[30px]"
          waveClassName="h-[52%]"
        />
      </Lane>

      <Lane icon={NoteIcon} className="mt-1">
        <AudioClip
          name="music-bed.mp3"
          tone="music"
          seed={0.8}
          samples={96}
          gaps={false}
          className="h-[44px]"
          // The bed is pulled down where the voiceover sits over it: same
          // shape, less of it, which is what ducking looks like on the lane.
          waveClassName="app-anim cap-anim h-[58%] origin-bottom"
          waveStyle={{ animationName: "cap-duck" }}
        >
          {/* The automation line that did the pulling. */}
          <span
            className="app-anim cap-anim absolute inset-x-0 bottom-[24px] block h-px bg-green/70"
            style={{ animationName: "cap-envelope" }}
          />
        </AudioClip>
      </Lane>
    </div>
  );
}

const CELLS = [
  {
    title: "Video clips",
    body: "Drop your footage in and cut it on the timeline, scene by scene.",
    Graphic: ClipsMock,
    mock: WIDE_CELL,
    // Taller than the rest below lg: its mock is a whole editor pane, and at
    // the others' height the track ends up behind the copy.
    className: "h-[330px] lg:col-span-2 lg:row-span-2",
  },
  {
    title: "Motion graphics",
    body: "Kinetic type, shapes and transitions, animated by the agent.",
    Graphic: MotionMock,
  },
  {
    title: "Voice overs",
    body: "Pick a voice and get a take per scene, synced to the animation.",
    Graphic: VoiceMock,
  },
  {
    title: "SFX",
    body: "Whooshes, clicks and risers, landing on the beat you put them on.",
    Graphic: SfxMock,
  },
  {
    title: "Image generation",
    body: "Describe a still and it arrives in your assets, ready to place.",
    Graphic: ImageMock,
  },
  {
    title: "Background music",
    body: "A bed in the mood you ask for, ducking under the narration.",
    Graphic: MusicMock,
  },
];

export function Capabilities({
  eyebrow = "Everything you need",
  title,
  lede = "Everything a finished video needs, in one project and one timeline.",
  gradientId = "codex-capabilities",
}: {
  eyebrow?: string;
  title?: React.ReactNode;
  lede?: React.ReactNode;
  /** Codex's gradient is referenced by id, so each instance needs its own. */
  gradientId?: string;
} = {}) {
  const play = usePlayOnView<HTMLDivElement>();

  return (
    <Section>
      <Container className="max-w-7xl">
        <div className="mx-auto max-w-2xl text-center">
          <Eyebrow className="mb-4">{eyebrow}</Eyebrow>
          <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            {title ?? (
              <>
                A full studio controlled by{" "}
                {/* The marks and the name stay on one line: the glyph belongs
                    to the word, and a wrap between them orphans it. */}
                <span className="inline-flex items-center gap-2 whitespace-nowrap align-baseline sm:gap-3">
                  <AgentMarks gradientId={gradientId} />
                  Claude
                </span>
              </>
            )}
          </h2>
          <p className="mt-4 text-text-secondary">{lede}</p>
        </div>

        {/* The timeline itself, before the cells that break it down: scene
            clips, voiceover and a music bed with their waveforms, sound
            effects, and the playhead. Cropped out of the app and faded into
            the page at both edges, so it reads as the editor carrying on
            behind the copy rather than a screenshot dropped on the section. */}
        <div className="relative mt-12">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/editor-timeline.webp"
            alt="The GenMotion timeline: a row of scene clips, voiceover and music tracks with their waveforms below them, and the playhead at five seconds."
            width={1580}
            height={452}
            loading="lazy"
            decoding="async"
            className="block w-full"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background from-0% via-background/45 via-25% to-transparent to-60%"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background to-transparent"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-background to-transparent"
          />
        </div>

        {/* Bento: the first cell holds two columns and two rows, so the
            timeline in it has the width a timeline wants, and the five smaller
            cells fill in around it. One column on a phone, where a bento is
            just a stack. */}
        <div
          {...play}
          className="mt-12 grid gap-4 sm:grid-cols-2 lg:auto-rows-[260px] lg:grid-cols-3"
        >
          {CELLS.map(({ title, body, Graphic, mock, className }) => (
            <div
              key={title}
              className={`group relative overflow-hidden rounded-xl border border-border bg-surface transition-colors duration-150 hover:border-border-strong lg:h-auto ${className ?? "h-[260px]"}`}
            >
              <Mock
                w={(mock ?? CELL).w}
                h={(mock ?? CELL).h}
                fit="cover"
                className="absolute inset-0 size-full"
              >
                <Graphic />
              </Mock>
              {/* The copy sits on the mock behind a scrim rather than under it,
                  so every cell is one surface however tall the grid makes it. */}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-surface via-surface/95 to-transparent px-5 pb-5 pt-10">
                <h3 className="text-[1.05rem] font-medium">{title}</h3>
                <p className="mt-1 text-[0.9rem] text-text-secondary">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </Section>
  );
}
