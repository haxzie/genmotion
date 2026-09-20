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

/** The mark on its own, in brand orange, for use inline in copy. */
export function ClaudeMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="#D97757" aria-hidden>
      <path d={CLAUDE_PATH} />
    </svg>
  );
}

const CODEX_PATH =
  "M84.3 5.1q3.7-1.5 7.7-2.6 3.9-1 7.9-1.6 4-0.5 8.1-0.6 4 0 8 0.5 20.7 2.4 37.1 17.7 0.1 0.1 0.4 0.3 0.1 0 0.2 0 0 0 0.2 0 0 0 0.1 0 0 0 0.1 0 5.2-1.4 10.7-1.9 5.4-0.4 10.7 0.1 5.5 0.4 10.7 1.9 5.2 1.3 10.1 3.6l0.6 0.4 1.6 0.8q5.2 2.5 9.7 6.1 4.7 3.4 8.6 7.7 3.8 4.3 6.9 9.2 3 4.8 5.2 10.2 4.3 10.5 4.3 22.1 0.2 2.1 0 4.2-0.1 2.2-0.2 4.3-0.3 2.1-0.7 4.3-0.4 2.1-0.9 4.1 0 0.2 0 0.4 0 0.2 0 0.5 0 0.1 0.1 0.4 0.1 0.1 0.3 0.3 12.3 12.6 16.3 30 6 29.7-12.2 53.5l-1.9 2.2q-3 3.5-6.5 6.4-3.4 3.1-7.3 5.5-3.8 2.4-8.1 4.2-4.1 1.9-8.5 3.2-0.3 0-0.4 0.2-0.3 0-0.4 0.1-0.1 0.1-0.3 0.4 0 0.1-0.1 0.3c-2.7 7.7-5.3 14.2-10.2 20.7-12.5 16.5-30.8 25.5-51.5 25.5q-24.6-0.1-43.6-18.1-0.2-0.1-0.4-0.2-0.2-0.1-0.4-0.1-0.2 0-0.3 0-0.3 0-0.4 0c-5.4 1.7-10.9 1.9-16.7 1.9q-3.5 0-7-0.5-3.4-0.4-6.9-1.2-3.3-0.8-6.6-2-3.3-1.2-6.4-2.8-3.3-1.6-6.4-3.6-3-2-5.8-4.3-3-2.3-5.5-5-2.5-2.6-4.6-5.6c-2.2-2.7-4.3-5.4-5.8-8.5q-0.8-1.6-1.6-3.2-0.6-1.7-1.3-3.3-0.7-1.7-1.2-3.4-0.5-1.6-1-3.4-1.1-4-1.6-7.9-0.6-4-0.6-8 0-4 0.6-8 0.4-4 1.4-8 0 0 0-0.1 0-0.1 0-0.1 0.2-0.2 0.2-0.3 0-0.1-0.2-0.1 0-0.2 0-0.3 0-0.1-0.1-0.1 0-0.2 0-0.2-0.1-0.1-0.1-0.1-2.4-2.5-4.6-5.2-2.1-2.7-4-5.4-1.7-3-3.2-6-1.5-3.1-2.6-6.3-0.8-2-1.3-4.1-0.7-2-1.1-4-0.4-2.1-0.7-4.2-0.2-2.2-0.4-4.3-0.2-2.8-0.1-5.6 0-2.8 0.3-5.4 0.1-2.8 0.6-5.6 0.4-2.8 1.1-5.5 7-23.1 26.9-36.3 4.3-2.9 8.2-4.5 4.5-1.9 9-3.2 0.2 0 0.3-0.1 0.1-0.2 0.3-0.3 0.1 0 0.1-0.3 0.1-0.1 0.1-0.2 1-3.1 2.2-6 1-2.9 2.5-5.7 1.5-3 3.2-5.6 1.7-2.7 3.7-5.1 2.5-3.2 5.3-5.9 3-2.8 6.1-5.4 3.2-2.4 6.8-4.4 3.5-2 7.2-3.5zm48.3 146.4c-2.3 0.1-4.4 1-6 2.8-1.5 1.6-2.4 3.7-2.4 5.9 0 2.3 0.9 4.4 2.4 6.2 1.6 1.6 3.7 2.5 6 2.6h50.4c2.4 0.1 4.8-0.6 6.5-2.4 1.7-1.6 2.8-4 2.8-6.4 0-2.4-1.1-4.7-2.8-6.3-1.7-1.8-4.1-2.6-6.5-2.4zm-56.7-64.9c-1.2-1.9-3-3.4-5.3-3.9-2.2-0.5-4.5-0.3-6.5 0.9-2 1.1-3.5 3-4.1 5.2-0.7 2.2-0.4 4.6 0.6 6.5l17.7 30.9-17.5 29.5c-1.2 2-1.6 4.5-1.1 6.8 0.7 2.3 2.1 4.1 4.1 5.3 2 1.2 4.4 1.6 6.7 0.9 2.2-0.5 4.2-1.9 5.4-3.9l20.1-34.1q0.7-0.9 0.9-2.1 0.3-1.1 0.3-2.3 0-1.2-0.3-2.2-0.2-1.2-0.8-2.2z";

/**
 * Codex's mark, in its own violet-to-blue gradient. `gradientId` must be
 * unique per render — SVG gradient ids are document-global, so two instances
 * on the same page (hero + badge row) would otherwise fight over one def.
 */
export function CodexMark({
  className,
  gradientId,
}: {
  className?: string;
  gradientId: string;
}) {
  return (
    <svg viewBox="0 0 250 250" className={className} aria-hidden>
      <defs>
        <linearGradient
          id={gradientId}
          gradientUnits="userSpaceOnUse"
          gradientTransform="matrix(0,249.335,-249.128,0,125,.332)"
          x2="1"
        >
          <stop stopColor="#b1a7ff" />
          <stop offset="0.5" stopColor="#7a9dff" />
          <stop offset="1" stopColor="#3941ff" />
        </linearGradient>
      </defs>
      <path fill={`url(#${gradientId})`} d={CODEX_PATH} />
    </svg>
  );
}

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
 * Claude's is its brand orange, Codex's its violet-to-blue gradient. That is
 * the point of showing them at all — they are the thing a visitor already
 * recognises and already pays for.
 */
export function AgentBadges({ className }: { className?: string }) {
  return (
    <div className={join("flex items-center gap-3", className)}>
      {/* Negative gap is what stacks them. With no ring to separate the two,
          the overlap is a deliberate part of the look. */}
      <span className="flex -space-x-2.5">
        <Disc>
          <ClaudeMark className="size-[1.15rem]" />
        </Disc>
        <Disc>
          <CodexMark className="size-[1.05rem]" gradientId="codex-badge" />
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
