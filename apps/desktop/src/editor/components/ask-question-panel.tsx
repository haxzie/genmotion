import { useEffect, useRef, useState } from "react";
import { cx } from "@/components/ui";
import {
  ComposerPanel,
  Mark,
  describeSendFailure,
  sendAnswers,
} from "./composer-panel";

/**
 * The agent's questions, asked as an extension of the chatbox.
 *
 * The harness is parked inside `canUseTool` while this panel is up: it asked
 * permission to run `AskUserQuestion`, and the selection below is what gets
 * handed back as the tool's input (`electron/agent/claude-code.ts`). Nothing
 * else in the turn moves until the POST lands (or the ten-minute deadline
 * passes), so the panel has to be able to fail visibly rather than leave the
 * chat spinning — and dismissing it has to release the turn, not just hide a
 * card, which is what the empty-answers POST does.
 *
 * One question is on screen at a time: a turn that asks three things at once
 * used to render as a wall above the composer.
 */

export interface Choice {
  label: string;
  description?: string;
}

export interface Question {
  question: string;
  header?: string;
  options: Choice[];
  multiSelect?: boolean;
}

/** Parse the tool's input defensively — it comes off the wire, not from us. */
export function questionsOf(input: unknown): Question[] {
  const raw = (input as { questions?: unknown } | undefined)?.questions;
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((entry) => {
    const q = (entry ?? {}) as Record<string, unknown>;
    if (typeof q.question !== "string") return [];
    const options = Array.isArray(q.options)
      ? q.options.flatMap((option) => {
          const o = (option ?? {}) as Record<string, unknown>;
          return typeof o.label === "string"
            ? [{ label: o.label, description: typeof o.description === "string" ? o.description : undefined }]
            : [];
        })
      : [];
    return [{
      question: q.question,
      header: typeof q.header === "string" ? q.header : undefined,
      options,
      multiSelect: q.multiSelect === true,
    }];
  });
}

/** Sentinel label for the "Something else…" row, so it can be selected like an option. */
const FREEFORM = "\u0000other";

export function AskQuestionPanel({
  toolCallId,
  questions,
  onDone,
}: {
  toolCallId: string | undefined;
  questions: Question[];
  /** Called once the panel is finished with — answered, skipped, or dismissed. */
  onDone: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<Record<string, string[]>>({});
  const [typed, setTyped] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // A new question replaces whatever was up: start at the front of it.
  useEffect(() => {
    setIndex(0);
    setPicked({});
    setTyped({});
    setFailed(null);
  }, [toolCallId]);

  const current = questions[Math.min(index, questions.length - 1)];
  if (!current) return null;
  const last = index >= questions.length - 1;

  const answerFor = (q: Question): string =>
    (picked[q.question] ?? [])
      .map((label) => (label === FREEFORM ? (typed[q.question] ?? "").trim() : label))
      .filter(Boolean)
      .join(", ");

  const send = async (answers: Record<string, string>) => {
    setSending(true);
    setFailed(null);
    const res = await sendAnswers(toolCallId, answers);
    setSending(false);
    if (res.ok) {
      onDone();
      return;
    }
    setFailed(describeSendFailure(res));
  };

  /** Submit every answer, using `extra` for the pick that hasn't hit state yet. */
  const submit = (extra?: Record<string, string>) => {
    const answers: Record<string, string> = {};
    for (const q of questions) answers[q.question] = extra?.[q.question] ?? answerFor(q);
    void send(answers);
  };

  const advance = () => {
    setFailed(null);
    if (last) submit();
    else setIndex((i) => i + 1);
  };

  const choose = (q: Question, label: string) => {
    setFailed(null);
    if (q.multiSelect) {
      setPicked((prev) => {
        const chosen = prev[q.question] ?? [];
        return {
          ...prev,
          [q.question]: chosen.includes(label)
            ? chosen.filter((l) => l !== label)
            : [...chosen, label],
        };
      });
      return;
    }
    // Single-select: the click is the answer, so move on rather than making
    // someone confirm a choice they already made.
    setPicked((prev) => ({ ...prev, [q.question]: [label] }));
    if (last) submit({ [q.question]: label });
    else setIndex((i) => i + 1);
  };

  const dismiss = () => {
    // Release the parked turn: the model is told nobody answered and carries on,
    // so the chatbox below is usable immediately.
    void sendAnswers(toolCallId, {});
    onDone();
  };

  const chosen = picked[current.question] ?? [];
  const freeform = chosen.includes(FREEFORM);
  const ready = Boolean(answerFor(current));

  return (
    <ComposerPanel
      title={current.header || "Question"}
      meta={questions.length > 1 ? `${index + 1}/${questions.length}` : undefined}
      onDismiss={dismiss}
    >
      <div key={current.question} className="px-3 py-2.5">
        <p className="mb-2 text-[0.857rem] leading-relaxed text-text-primary">
          {current.question}
        </p>
        <div className="flex flex-col gap-1.5">
          {current.options.map((option) => {
            const on = chosen.includes(option.label);
            return (
              <button
                key={option.label}
                type="button"
                disabled={sending}
                onClick={() => choose(current, option.label)}
                className={cx(
                  "flex items-start gap-2 rounded-md px-2.5 py-1.5 text-left transition-colors disabled:opacity-50",
                  on ? "bg-accent-muted" : "hover:bg-surface-hover",
                )}
              >
                <Mark on={on} multi={current.multiSelect === true} />
                <span className="min-w-0">
                  <span className="block text-[0.821rem] text-text-primary">{option.label}</span>
                  {option.description && (
                    <span className="mt-0.5 block text-[0.75rem] leading-snug text-text-tertiary">
                      {option.description}
                    </span>
                  )}
                </span>
              </button>
            );
          })}

          <label
            className={cx(
              "flex items-start gap-2 rounded-md px-2.5 py-1.5 transition-colors",
              freeform ? "bg-accent-muted" : "hover:bg-surface-hover",
            )}
          >
            <Mark on={freeform} multi={current.multiSelect === true} />
            <input
              ref={inputRef}
              type="text"
              disabled={sending}
              placeholder="Something else…"
              value={typed[current.question] ?? ""}
              onChange={(e) => {
                const value = e.target.value;
                setFailed(null);
                setTyped((prev) => ({ ...prev, [current.question]: value }));
                setPicked((prev) => {
                  const kept = (prev[current.question] ?? []).filter((l) => l !== FREEFORM);
                  const next = value.trim()
                    ? current.multiSelect
                      ? [...kept, FREEFORM]
                      : [FREEFORM]
                    : kept;
                  return { ...prev, [current.question]: next };
                });
              }}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                e.preventDefault();
                if (answerFor(current)) advance();
              }}
              className="min-w-0 flex-1 bg-transparent text-[0.821rem] text-text-primary placeholder:text-text-tertiary focus:outline-none disabled:opacity-50"
            />
          </label>
        </div>
      </div>

      {(questions.length > 1 || current.multiSelect) && (
        <div className="flex items-center justify-between gap-3 px-3 pb-2.5 pt-0.5">
          <div className="flex items-center gap-1.5">
            {questions.length > 1 &&
              questions.map((q, i) => (
                <button
                  key={q.question}
                  type="button"
                  aria-label={`Question ${i + 1}`}
                  aria-current={i === index}
                  disabled={sending}
                  onClick={() => {
                    setFailed(null);
                    setIndex(i);
                  }}
                  className={cx(
                    "size-1.5 rounded-full transition-colors",
                    i === index
                      ? "bg-accent"
                      : answerFor(q)
                        ? "bg-text-tertiary"
                        : "bg-border hover:bg-text-tertiary",
                  )}
                />
              ))}
          </div>
          <button
            type="button"
            disabled={!ready || sending}
            onClick={advance}
            className="rounded-full bg-accent px-3 py-1 text-[0.786rem] font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-40"
          >
            {last ? (sending ? "Sending…" : "Send") : "Next"}
          </button>
        </div>
      )}

      {failed && <p className="px-3 pb-2.5 text-[0.786rem] text-warning">{failed}</p>}
    </ComposerPanel>
  );
}
