/**
 * Questions the agent is currently waiting on.
 *
 * `AskUserQuestion` is *answered*, not approved. The CLI asks permission to run
 * it, and the host replies by putting an `answers` map on the updated input;
 * hand back the input untouched and the tool reports "The user did not answer
 * the questions" to the model. So `canUseTool` has to block until somebody
 * clicks — and that click arrives on a different HTTP request than the turn it
 * belongs to, because the turn is still streaming its response. This module is
 * where the two meet.
 */

/** Question text → the chosen option's label (comma-separated when multi-select). */
export type Answers = Record<string, string>;

const pending = new Map<string, (answers: Answers | null) => void>();

/**
 * A question nobody ever answers would hold a `claude` process open forever.
 * Ten minutes is long enough to go and think about it, short enough that a
 * forgotten window doesn't leak a harness.
 */
const ANSWER_TIMEOUT_MS = 10 * 60 * 1000;

/**
 * Park until the chat sends an answer for this tool call.
 *
 * Resolves with `null` when the turn is stopped or the question goes stale —
 * the caller then lets the tool run unanswered, which is a state the model
 * already knows how to narrate.
 */
export function waitForAnswer(
  toolUseId: string,
  signal: AbortSignal,
): Promise<Answers | null> {
  return new Promise((resolve) => {
    let settled = false;
    const settle = (answers: Answers | null) => {
      if (settled) return;
      settled = true;
      pending.delete(toolUseId);
      clearTimeout(timer);
      signal.removeEventListener("abort", onAbort);
      resolve(answers);
    };
    const onAbort = () => settle(null);
    const timer = setTimeout(() => settle(null), ANSWER_TIMEOUT_MS);

    if (signal.aborted) {
      settle(null);
      return;
    }
    signal.addEventListener("abort", onAbort, { once: true });
    pending.set(toolUseId, settle);
  });
}

/**
 * Deliver an answer to whichever turn is waiting for it.
 *
 * `false` means there was nothing to answer: the turn was stopped, the question
 * timed out, or it was already answered.
 */
export function answerQuestion(toolUseId: string, answers: Answers): boolean {
  const settle = pending.get(toolUseId);
  if (!settle) return false;
  settle(answers);
  return true;
}
