import type { ReactNode } from "react";
import { API_URL } from "@/lib/api";
import { cx } from "@/components/ui";

/**
 * The chrome shared by everything the agent parks a turn on.
 *
 * A tool that has to be answered — a question, a voice to pick — opens as an
 * extension of the chatbox rather than a card in the transcript: it is a prompt
 * aimed at the user, not a log line, and it should be where the user is already
 * looking. The panel is squared off at the bottom and the composer form is
 * squared off at the top, so the two read as one surface.
 *
 * The harness is blocked inside `canUseTool` while a panel is up (see
 * `electron/agent/claude-code.ts`), which is why every one of them needs a
 * dismiss that *answers* rather than hides: see `sendAnswers`.
 */

/** Question text (or tool-specific keys) → the chosen value. */
export type Answers = Record<string, string>;

/**
 * Hand the answers to the turn waiting on this tool call.
 *
 * An empty map is the dismissal: the route delivers it, the harness reads it as
 * "nobody answered", and the tool runs unanswered — a state the model already
 * knows how to narrate.
 */
export async function sendAnswers(
  toolCallId: string | undefined,
  answers: Answers,
): Promise<{ ok: boolean; status?: number; error?: string }> {
  try {
    const res = await fetch(`${API_URL}/api/chat/answer`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ toolCallId, answers }),
    });
    return { ok: res.ok, status: res.status };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** What a failed send should say. 410 is the common one: the turn was stopped. */
export function describeSendFailure(res: { status?: number; error?: string }): string {
  if (res.status === 410) return "This is no longer waiting for an answer.";
  return res.error ?? `Could not send your answer (${res.status}).`;
}

function CloseGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden>
      <path d="M4 4l8 8M12 4l-8 8" />
    </svg>
  );
}

/**
 * The radio or checkbox in front of a row.
 *
 * Which one it is says whether the list takes one answer or several — the rows
 * themselves are borderless, so the mark is the only thing carrying that.
 */
export function Mark({ on, multi }: { on: boolean; multi?: boolean }) {
  return (
    <span
      className={cx(
        "mt-[0.15rem] flex size-3.5 shrink-0 items-center justify-center border transition-colors",
        multi ? "rounded-[0.25rem]" : "rounded-full",
        on ? "border-accent bg-accent text-white" : "border-text-tertiary",
      )}
    >
      {on &&
        (multi ? (
          <svg viewBox="0 0 12 12" className="size-2.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M2.5 6.2l2.2 2.2L9.5 3.6" />
          </svg>
        ) : (
          <span className="size-1.5 rounded-full bg-white" />
        ))}
    </span>
  );
}

export function ComposerPanel({
  title,
  meta,
  onDismiss,
  children,
}: {
  title: string;
  /** A short right-aligned note in the bar — the page counter, a count. */
  meta?: ReactNode;
  onDismiss: () => void;
  children: ReactNode;
}) {
  return (
    <div className="mb-[-1px] overflow-hidden rounded-2xl rounded-b-none border border-[#1f1f24] border-b-0 bg-surface-raised shadow-[0_16px_50px_rgba(0,0,0,0.5)]">
      <div className="flex items-center gap-2 border-b border-[#1f1f24] px-3 py-2">
        <span className="min-w-0 flex-1 truncate text-[0.786rem] font-medium text-text-secondary">
          {title}
        </span>
        {meta && <span className="shrink-0 text-[0.714rem] tabular-nums text-text-tertiary">{meta}</span>}
        <button
          type="button"
          aria-label="Dismiss"
          title="Dismiss"
          onClick={onDismiss}
          className="flex size-5 shrink-0 items-center justify-center rounded text-text-tertiary transition-colors hover:bg-surface-hover hover:text-text-primary"
        >
          <CloseGlyph className="size-3.5" />
        </button>
      </div>
      {children}
    </div>
  );
}
