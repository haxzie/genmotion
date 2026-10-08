import { cx } from "@/components/ui";

/**
 * A coding agent's mark.
 *
 * Takes any id from `HARNESS_CATALOG`, not just the two we can drive, because
 * onboarding draws the announced ones too. Claude's and Codex's marks are
 * local — they sit in the composer, where a network round trip for a 16px
 * glyph would be absurd — and the rest come off a CDN, which the renderer's
 * CSP allows for images the same way the marketplace's icons do.
 */

/** Claude Code's mark, from simple-icons (CC0). Inlined rather than pulling in
 *  the package for one path — 3,453 icons is a lot of bundle for one glyph. */
const CLAUDE_PATH =
  "M21 10.5h3v3h-3v3h-1.5v3H18v-3h-1.5v3H15v-3H9v3H7.5v-3H6v3H4.5v-3H3v-3H0v-3h3v-6h18Zm-15 0h1.5v-3H6Zm10.5 0H18v-3h-1.5z";

/** The ones that aren't local: a brand mark, or the site's own favicon. */
const REMOTE_MARK: Record<string, string> = {
  opencode: "https://cdn.simpleicons.org/opencode/FFFFFF",
  grok: "https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://grok.com&size=128",
};

export function HarnessIcon({ id, className }: { id: string; className?: string }) {
  if (id === "claude-code") {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="#D97757" aria-hidden>
        <path d={CLAUDE_PATH} />
      </svg>
    );
  }
  if (id === "codex") {
    // OpenAI ships no public SVG of this mark and it isn't in the icon set we
    // use, so the glyph is the template image from the installed Codex app —
    // the same monochrome mark it puts in the macOS menu bar. Painted through
    // a mask so it inherits `currentColor` like the other icons here.
    return (
      <span
        role="img"
        aria-hidden
        className={className}
        style={{
          display: "inline-block",
          backgroundColor: "currentColor",
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
    );
  }
  const remote = REMOTE_MARK[id];
  if (remote) return <img src={remote} alt="" className={cx("object-contain", className)} />;
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <circle cx="8.5" cy="12" r="4" />
      <path d="M12 12h9M17.5 12v3M20.5 12v2.5" strokeLinecap="round" />
    </svg>
  );
}

/** The rounded tile onboarding sets a mark in, next to the MCP server icons. */
export function HarnessTile({ id, className }: { id: string; className?: string }) {
  return (
    <span
      className={cx(
        "flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-text-primary",
        className,
      )}
    >
      <HarnessIcon id={id} className="size-5" />
    </span>
  );
}
