import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import type { TemplateSummary } from "@genmotion/templates/types";
import { Button, cx } from "@/components/ui";
import { templateAssetUrl, templateVideoSrc } from "./template-asset-url";

const enterEase = [0.25, 1, 0.5, 1] as const;

/**
 * How much of the window the video may take.
 *
 * The panel is sized from the template's own ratio rather than measured after
 * the fact: `min(width budget, height budget × ratio)` is the one expression
 * that frames a 9:16 card and a 16:9 one without letterboxing either, and it
 * resolves in CSS, so the panel is already the right shape on its first frame.
 */
const WIDTH_BUDGET = "min(92vw, 68rem)";
const HEIGHT_BUDGET = "72vh";

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M8 5.2c0-.8.9-1.3 1.6-.9l9 6.1c.6.4.6 1.3 0 1.7l-9 6.1c-.7.5-1.6 0-1.6-.8Z" />
    </svg>
  );
}

function PauseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <rect x="7" y="5" width="3.6" height="14" rx="1.2" />
      <rect x="13.4" y="5" width="3.6" height="14" rx="1.2" />
    </svg>
  );
}

function SoundIcon({ muted, className }: { muted: boolean; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 9.6v4.8a1 1 0 0 0 1 1h2.3l5 3.4V5.2l-5 3.4H5a1 1 0 0 0-1 1Z" />
      {muted ? <path d="m16.4 9.6 4.2 4.8m0-4.8-4.2 4.8" /> : <path d="M16.4 9.2a4.2 4.2 0 0 1 0 5.6M19 7a7.4 7.4 0 0 1 0 10" />}
    </svg>
  );
}

function ClapperboardEditIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path
        strokeLinecap="round"
        d="M21.998 10.5c-.016-3.732-.162-5.735-1.463-7.036C19.072 2 16.714 2 12 2S4.929 2 3.464 3.464C2 4.93 2 7.286 2 12s0 7.071 1.464 8.535c1.241 1.241 3.123 1.43 6.536 1.46"
      />
      <path strokeLinecap="round" d="M21.5 8h-19M7 8l3.5-5.5m3 5.5L17 2.5" opacity=".5" />
      <path d="m18.562 13.935l.417-.417a1.77 1.77 0 1 1 2.503 2.503l-.417.417m-2.503-2.503s.052.887.834 1.669s1.669.834 1.669.834m-2.503-2.503l-3.835 3.835c-.26.26-.39.39-.5.533a3 3 0 0 0-.338.545c-.078.164-.136.338-.252.686l-.372 1.116l-.12.36m7.92-4.572l-3.835 3.835c-.26.26-.39.39-.533.5a3 3 0 0 1-.545.338c-.164.078-.338.136-.686.252l-1.116.372l-.36.12m0 0l-.362.12a.477.477 0 0 1-.604-.603l.12-.361m.845.844l-.844-.844" />
    </svg>
  );
}

/** `0:12` — the template's length, from the frame count it was authored at. */
function formatDuration(durationInFrames: number, fps: number): string {
  const total = Math.round(durationInFrames / fps);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

/**
 * The video, with the controls the lightbox adds to it.
 *
 * Native `controls` would be the short way, and it draws Chromium's own bar —
 * a different app's furniture sitting inside this one. This is the small set
 * that a finished video actually needs: a play toggle, sound (off to start,
 * because an autoplaying video may not have it on), and a line you can press
 * to go somewhere in the timeline.
 */
function Player({ template }: { template: TemplateSummary }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(true);
  const [progress, setProgress] = useState(0);

  const toggle = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) void video.play();
    else video.pause();
  }, []);

  function seek(event: React.MouseEvent<HTMLDivElement>) {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration)) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - bounds.left) / bounds.width;
    video.currentTime = Math.min(Math.max(ratio, 0), 1) * video.duration;
  }

  return (
    <div className="group/player absolute inset-0 overflow-hidden bg-black">
      <video
        ref={videoRef}
        src={templateVideoSrc(template, "full")}
        poster={templateAssetUrl(template.posterPath, template.revision)}
        className="block size-full object-contain"
        // Muted at first by every autoplay policy there is; the sound button
        // is a gesture, so turning it on is allowed from there.
        autoPlay
        loop
        muted={muted}
        playsInline
        onClick={toggle}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(e) => {
          const video = e.currentTarget;
          if (video.duration > 0) setProgress(video.currentTime / video.duration);
        }}
      />

      {/* Over the video, out of the way until the pointer is on it — except
          while paused, when the bar is the only thing offering a way back. */}
      <div
        className={cx(
          // A heavy scrim, not a hint of one: a template can be a video on
          // white, where white controls over a light gradient were invisible.
          "absolute inset-x-0 bottom-0 flex items-center gap-3 bg-gradient-to-t from-black/90 via-black/60 to-transparent px-3 pb-2.5 pt-10",
          "transition-opacity duration-150 group-hover/player:opacity-100 focus-within:opacity-100",
          playing ? "opacity-0" : "opacity-100",
        )}
      >
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? "Pause" : "Play"}
          className="flex size-7 shrink-0 items-center justify-center rounded-full text-white/90 outline-none hover:text-white focus-visible:ring-2 focus-visible:ring-white/60"
        >
          {playing ? <PauseIcon className="size-4" /> : <PlayIcon className="size-4" />}
        </button>

        {/* A line, not a slider: pressing it is the whole interaction, and a
            drag handle on a twelve-second loop is furniture nobody uses. */}
        <div
          role="presentation"
          onClick={seek}
          className="flex h-4 flex-1 cursor-pointer items-center"
        >
          <div className="h-[3px] w-full overflow-hidden rounded-full bg-white/25">
            <div className="h-full rounded-full bg-white" style={{ width: `${progress * 100}%` }} />
          </div>
        </div>

        <button
          type="button"
          onClick={() => setMuted((m) => !m)}
          aria-label={muted ? "Unmute" : "Mute"}
          className="flex size-7 shrink-0 items-center justify-center rounded-full text-white/90 outline-none hover:text-white focus-visible:ring-2 focus-visible:ring-white/60"
        >
          <SoundIcon muted={muted} className="size-[1.1rem]" />
        </button>
      </div>
    </div>
  );
}

/**
 * One template, large, with its video playing and Remix under it.
 *
 * A card in the gallery is a thumbnail of a finished video; choosing which one
 * to take apart off a 300px hover preview is a guess. This is the look before
 * the decision: the video at a size you can read, the words the catalog
 * carries about it, and the same Remix the card offers — so the press that
 * opens it costs nothing, and the press that remixes is still deliberate.
 *
 * Its own portal rather than the app's `Modal`, which is a surface panel at a
 * text column's width. Here the video *is* the dialog: the panel is sized from
 * the template's ratio, and the backdrop blurs harder, because what is behind
 * it is a gallery of other videos competing with this one.
 */
export function TemplateLightbox({
  template,
  onClose,
  onRemix,
}: {
  /** The open template, or null for closed — so the exit animation can run. */
  template: TemplateSummary | null;
  onClose: () => void;
  onRemix: (template: TemplateSummary) => void;
}) {
  useEffect(() => {
    if (!template) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [template, onClose]);

  return createPortal(
    <AnimatePresence>
      {template && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-center justify-center p-6"
          initial="hidden"
          animate="visible"
          exit="hidden"
        >
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-xl"
            onClick={onClose}
            variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="template-lightbox-title"
            // Keyed on the id so switching templates remounts the player
            // rather than handing a new `src` to a video mid-play.
            key={template.id}
            className="relative z-10 flex max-h-full flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_24px_80px_rgba(0,0,0,0.7)]"
            style={{
              width: `min(${WIDTH_BUDGET}, calc(${HEIGHT_BUDGET} * ${template.width} / ${template.height}))`,
            }}
            variants={{
              hidden: { opacity: 0, scale: 0.96, y: 12 },
              visible: { opacity: 1, scale: 1, y: 0 },
            }}
            transition={{ duration: 0.28, ease: enterEase, delay: 0.04 }}
          >
            <div className="relative" style={{ aspectRatio: `${template.width} / ${template.height}` }}>
              <Player template={template} />
            </div>

            <div className="flex items-start gap-4 px-5 py-4">
              <div className="min-w-0 flex-1">
                <h2
                  id="template-lightbox-title"
                  className="truncate font-display text-[1.05rem] font-semibold tracking-tight text-text-primary"
                >
                  {template.title}
                </h2>
                <p className="mt-1 line-clamp-2 text-[0.857rem] text-text-secondary">
                  {template.description}
                </p>
                {/* The numbers nobody reads off a poster but everybody wants
                    before borrowing one: how long it runs, what shape it is,
                    and how many scenes there are to pull apart. */}
                <p className="mt-2 text-[0.786rem] text-text-tertiary">
                  {formatDuration(template.durationInFrames, template.fps)} ·{" "}
                  {template.width}×{template.height} · {template.sceneCount}{" "}
                  {template.sceneCount === 1 ? "scene" : "scenes"}
                  {template.tags.length > 0 && ` · ${template.tags.join(", ")}`}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <Button variant="ghost" onClick={onClose}>
                  Close
                </Button>
                <Button variant="primary" onClick={() => onRemix(template)}>
                  <ClapperboardEditIcon className="size-[1.05rem]" />
                  Remix
                </Button>
              </div>
            </div>

            {/* Also in the corner, over the video: the buttons below are a
                scroll away on a tall portrait template. */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-full border border-white/15 bg-black/65 text-white backdrop-blur-xl transition-colors duration-150 hover:bg-black/85 outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            >
              <CloseIcon className="size-3.5" />
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
