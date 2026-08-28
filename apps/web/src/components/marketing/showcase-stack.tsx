import Link from "next/link";
import { cx } from "@/lib/cx";
import type { ShowcaseVideo } from "@/lib/marketing/content";

type Slot = "left" | "center" | "right";

/**
 * Per-slot placement, expressed as custom properties so the shared transform
 * below stays one string. `--x` is a percentage of the card's own width, so the
 * fan scales with the container. Hovering the stack (the `group` wrapper) lifts
 * every card a little and pulls the two side cards further outwards. The spread
 * is capped so that even hovered — offset plus half a scaled card — the fan
 * stays inside the page gutter instead of widening the document.
 */
const SLOT: Record<Slot, string> = {
  left:
    "z-10 [--x:-40%] [--r:32deg] [--s:0.8] [--o:0.7] sm:[--x:-60%] " +
    "group-hover:[--x:-46%] sm:group-hover:[--x:-66%] " +
    "group-hover:[--s:0.83] group-hover:[--o:0.9]",
  center:
    "z-20 [--x:0%] [--r:0deg] [--s:1] [--o:1] group-hover:[--s:1.04]",
  right:
    "z-10 [--x:40%] [--r:-32deg] [--s:0.8] [--o:0.7] sm:[--x:60%] " +
    "group-hover:[--x:46%] sm:group-hover:[--x:66%] " +
    "group-hover:[--s:0.83] group-hover:[--o:0.9]",
};

function PlayBadge() {
  return (
    <span className="flex size-12 items-center justify-center rounded-full bg-background/70 text-text-primary backdrop-blur-sm transition-transform duration-300 group-hover/card:scale-110">
      <svg viewBox="0 0 24 24" className="size-5 translate-x-px" fill="currentColor">
        <path d="M8 5v14l11-7z" />
      </svg>
    </span>
  );
}

function StackCard({ video, slot }: { video: ShowcaseVideo; slot: Slot }) {
  return (
    <Link
      href={`/showcase/${video.slug}`}
      className={cx(
        "group/card absolute left-1/2 top-1/2 w-[62%] overflow-hidden rounded-xl border border-border bg-surface",
        "shadow-[0_30px_70px_rgba(4,4,12,0.55)] transition-[transform,opacity] duration-500 ease-out sm:w-[46%]",
        "[opacity:var(--o)] [transform:translate(-50%,-50%)_translateX(var(--x))_rotateY(var(--r))_scale(var(--s))]",
        SLOT[slot],
      )}
    >
      <div className="relative bg-surface-raised" style={{ aspectRatio: "16 / 9" }}>
        {video.poster ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={video.poster}
            alt=""
            className="size-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="size-full bg-surface-raised" />
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-black/70 via-black/10 to-transparent">
          {/* Only the card in focus offers to play — a badge on the turned
              side cards would read as three competing targets. */}
          {slot === "center" && <PlayBadge />}
        </div>
        {video.duration && (
          <span className="absolute right-2 top-2 rounded bg-background/80 px-1.5 py-0.5 font-mono text-[0.75rem] text-text-secondary backdrop-blur-sm">
            {video.duration}
          </span>
        )}
        {/* Caption rides on the poster: the side cards are turned and dimmed,
            so a block of body copy under them would only read as noise. */}
        <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
          {video.tags[0] && (
            <span className="text-[0.75rem] font-medium uppercase tracking-[0.12em] text-white/60">
              {video.tags[0]}
            </span>
          )}
          <h3 className="mt-1 line-clamp-1 text-[0.95rem] font-medium tracking-tight text-white sm:text-[1.05rem]">
            {video.title}
          </h3>
        </div>
      </div>
    </Link>
  );
}

/**
 * The three newest showcase videos as a perspective card stack — one facing the
 * viewer in the centre, one turned in from each side.
 */
export function ShowcaseStack({
  videos,
  className,
}: {
  videos: ShowcaseVideo[];
  className?: string;
}) {
  // Fewer than three still reads as a stack; slots are assigned centre-first so
  // a single video sits front and centre rather than off to one side.
  const [center, left, right] = videos.slice(0, 3);
  if (!center) return null;
  const cards: Array<[ShowcaseVideo, Slot]> = [[center, "center"]];
  if (left) cards.push([left, "left"]);
  if (right) cards.push([right, "right"]);

  return (
    // `perspective` only reaches direct children, so it lives on the same
    // element the cards are positioned against — not on an outer wrapper.
    <div
      className={cx(
        "group relative mx-auto aspect-[16/7] w-full [perspective:1600px] sm:aspect-[10/3]",
        className,
      )}
    >
      {cards.map(([video, slot]) => (
        <StackCard key={video.slug} video={video} slot={slot} />
      ))}
    </div>
  );
}
