import type { ReactNode } from "react";
import { Button, cx } from "@/components/ui";

/**
 * The shape both onboarding steps take: what this is on the left, what to do
 * about it on the right.
 *
 * The pitch stays still while the list beside it changes, so the two steps
 * read as one screen with its right half turning over rather than as two
 * screens that happen to look alike.
 */
export function OnboardingStep({
  title,
  children,
  rows,
  hint,
  action,
  onAction,
  actionDisabled = false,
}: {
  title: string;
  /** The paragraphs under the title. */
  children: ReactNode;
  rows: ReactNode;
  /** The line beside the forward button — why skipping is fine. */
  hint: string;
  action: string;
  onAction: () => void;
  actionDisabled?: boolean;
}) {
  return (
    <main className="flex h-screen items-center justify-center overflow-hidden bg-background px-10 text-text-primary">
      {/* `items-stretch` over a row whose height is its own content: that is
          what makes the rule as tall as the two columns and no taller — a
          full-bleed divider cuts the window in half, which is a layout for a
          page with two halves rather than for one idea and its list. */}
      <div className="flex w-full max-w-[64rem] items-stretch gap-12 py-10">
        <div className="flex w-full max-w-[25rem] shrink-0 flex-col justify-center">
          <img src="/logo.svg" alt="" className="mb-10 size-11" />
          <h1 className="font-display text-[1.65rem] font-semibold leading-tight tracking-tight">
            {title}
          </h1>
          <div className="mt-4 flex flex-col gap-4 text-[1.05rem] leading-relaxed text-text-secondary">
            {children}
          </div>
        </div>

        <div className="w-px shrink-0 bg-border" aria-hidden />

        {/* The floor keeps the two steps close in height, so the rule and the
            footer don't jump when one list is a row longer than the other. */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="min-h-[17rem] flex-1 overflow-y-auto">
            <ul className="flex flex-col gap-1">{rows}</ul>
          </div>
          <div className="mt-6 flex items-center justify-between gap-4 border-t border-border pt-5">
            <p className="text-[0.929rem] text-text-tertiary">{hint}</p>
            <Button
              onClick={onAction}
              disabled={actionDisabled}
              className="h-9 shrink-0 gap-2 rounded-full px-5"
            >
              {action}
              <ArrowIcon className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}

/**
 * One line of either list: a mark, a name over its address, and the one
 * action it offers.
 *
 * Shared by the two steps because an agent and an MCP server are the same
 * thing here — something this machine either has or could have — and a row
 * that drifted between the steps would make the walkthrough look assembled
 * rather than designed.
 */
export function OnboardingRow({
  icon,
  name,
  subtitle,
  subtitleLines = 1,
  note,
  action,
  selected = false,
  onSelect,
}: {
  icon: ReactNode;
  name: string;
  /** What the thing is: an address for an agent, a sentence for a server. */
  subtitle: string;
  /** A sentence needs two lines where an address only ever needs one. */
  subtitleLines?: 1 | 2;
  /** A failure, under the row, in place of nothing when all is well. */
  note?: string | null;
  action: ReactNode;
  selected?: boolean;
  /** Present only when the row itself means something — picking a default agent. */
  onSelect?: () => void;
}) {
  const Tag = onSelect ? "button" : "div";
  return (
    <li>
      <Tag
        {...(onSelect ? { type: "button" as const, onClick: onSelect } : {})}
        className={cx(
          "flex w-full items-center gap-4 rounded-xl border px-3 py-3 text-left transition-colors duration-150",
          "outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
          selected ? "border-accent/50 bg-accent-muted/40" : "border-transparent",
          onSelect && !selected && "hover:border-border hover:bg-surface-raised",
        )}
      >
        {icon}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[1.02rem] text-text-primary">{name}</span>
          <span
            title={subtitle}
            className={cx(
              "text-[0.857rem] leading-snug text-text-tertiary",
              // `line-clamp-2` is itself a `display` rule (`-webkit-box`), so
              // the one-line case is the only one that may also say `block`.
              subtitleLines === 2 ? "line-clamp-2" : "block truncate",
            )}
          >
            {subtitle}
          </span>
          {note && (
            <span className="mt-1 block text-[0.857rem] leading-snug text-warning">{note}</span>
          )}
        </span>
        <span className="shrink-0">{action}</span>
      </Tag>
    </li>
  );
}

function ArrowIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 12h15M13 6l6 6-6 6" />
    </svg>
  );
}

/** The flat pill a row shows when the thing is already done — installed, connected. */
export function DoneBadge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-surface-hover px-3.5 text-[0.929rem] text-text-secondary">
      {children}
    </span>
  );
}

/**
 * A row that isn't offering anything: bare text, no pill.
 *
 * "Coming soon" in a pill reads as a button, and a button that does nothing
 * when pressed is worse than no button — so the shape itself has to say that
 * there is nothing here to press.
 */
export function PendingNote({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex h-8 items-center gap-1.5 px-1 text-[0.929rem] text-text-tertiary">
      {children}
    </span>
  );
}
