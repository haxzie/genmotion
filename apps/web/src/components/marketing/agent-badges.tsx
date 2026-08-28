/**
 * Local, because `cx` lives in a "use client" module and this renders on the
 * server — importing it makes Next refuse the build at prerender time. Same
 * reason `download-button.tsx` keeps its own.
 */
function join(...parts: (string | false | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

/**
 * Claude Code's mark, from simple-icons (CC0). Inlined rather than pulling in
 * the package for one path — 3,453 icons is a lot of bundle for one glyph.
 * Same path the desktop harness picker draws.
 */
const CLAUDE_PATH =
  "M21 10.5h3v3h-3v3h-1.5v3H18v-3h-1.5v3H15v-3H9v3H7.5v-3H6v3H4.5v-3H3v-3H0v-3h3v-6h18Zm-15 0h1.5v-3H6Zm10.5 0H18v-3h-1.5z";

/**
 * One glyph in its own disc. No border and a translucent fill, so where the
 * discs overlap the one underneath shows through rather than being cut out —
 * the stack reads as glass, not as stickers.
 */
function Disc({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={join(
        "flex size-9 items-center justify-center rounded-full bg-surface-raised/70 backdrop-blur-sm",
        className,
      )}
    >
      {children}
    </span>
  );
}

/**
 * The two agents GenMotion drives, as overlapping discs beside a line of copy.
 *
 * The marks keep their own identity rather than being flattened to one tint:
 * Claude's is its brand orange, Codex's the monochrome mark OpenAI ships. That
 * is the point of showing them at all — they are the thing a visitor already
 * recognises and already pays for.
 */
export function AgentBadges({ className }: { className?: string }) {
  return (
    <div className={join("flex items-center gap-3", className)}>
      {/* Negative gap is what stacks them. With no ring to separate the two,
          the overlap is a deliberate part of the look. */}
      <span className="flex -space-x-2.5">
        <Disc>
          <svg viewBox="0 0 24 24" className="size-[1.15rem]" fill="#D97757" aria-hidden>
            <path d={CLAUDE_PATH} />
          </svg>
        </Disc>
        <Disc>
          {/* OpenAI ships no public SVG of this mark and it isn't in the icon
              set we use, so the glyph is the template image the Codex app puts
              in the macOS menu bar, painted through a mask so it takes a colour
              like any other icon here. */}
          <span
            role="img"
            aria-hidden
            className="size-[1.05rem] bg-text-primary"
            style={{
              maskImage: "url(/codex-mark.png)",
              WebkitMaskImage: "url(/codex-mark.png)",
              maskSize: "contain",
              WebkitMaskSize: "contain",
              maskRepeat: "no-repeat",
              WebkitMaskRepeat: "no-repeat",
              maskPosition: "center",
              WebkitMaskPosition: "center",
            }}
          />
        </Disc>
      </span>
      <span className="text-left text-[0.95rem] text-text-secondary">
        Runs on your own{" "}
        <span className="text-text-primary">Claude Code or Codex</span>{" "}
        subscription
      </span>
    </div>
  );
}
