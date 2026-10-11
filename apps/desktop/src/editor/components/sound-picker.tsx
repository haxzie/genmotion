import { useEffect, useRef, useState } from "react";
import { Spinner, cx } from "@/components/ui";
import {
  ComposerPanel,
  Mark,
  describeSendFailure,
  sendAnswers,
  type Answers,
} from "./composer-panel";

/**
 * "Which of these?", for anything the user picks by *hearing* it.
 *
 * The voice picker was the first of these and the keyboard picker is the second;
 * they are the same panel. A row is a name, a line of description and a play
 * button, one click is the answer, and whatever is playing stops when another
 * starts or when the panel goes away. Hearing three seconds beats reading "warm,
 * middle-aged, British" every time, which is the whole reason the list is not an
 * `AskUserQuestion`.
 *
 * The harness is parked in `canUseTool` while a panel is up (see
 * `electron/agent/claude-code.ts`), so like every `ComposerPanel` the dismiss
 * *answers* with an empty map rather than hiding: the tool then runs unanswered,
 * which is a state the model already knows how to narrate.
 */

export interface SoundOption {
  id: string;
  name: string;
  /** One line under the name: what it sounds like, or who the voice is. */
  description: string;
  /**
   * What the play button plays. `null` disables it — a voice the provider has no
   * sample for. It must be a URL on the loopback server: the renderer's CSP
   * plays media from there only.
   */
  previewUrl: string | null;
}

export interface SoundSection {
  /** Shown above the rows. Left out for a single ungrouped list. */
  label?: string;
  options: SoundOption[];
}

function PlayGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="7.5 5 12 14" className={className} fill="currentColor" aria-hidden>
      <path d="M8 5.5v13l11-6.5z" />
    </svg>
  );
}

function StopGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="6 6 12 12" className={className} fill="currentColor" aria-hidden>
      <rect x="6.5" y="6.5" width="11" height="11" rx="1.5" />
    </svg>
  );
}

export function SoundPickerPanel({
  title,
  question,
  sections,
  loading,
  error,
  answerFor,
  toolCallId,
  onDone,
}: {
  /** The panel's bar — "Voice", "Keyboard". */
  title: string;
  question: string;
  sections: SoundSection[];
  loading?: boolean;
  /** Why the list is empty, if it is. */
  error?: string | null;
  /** The answer map for a chosen option. The tool's input names these keys. */
  answerFor: (option: SoundOption) => Answers;
  toolCallId: string | undefined;
  /** Called once the panel is finished with — picked or dismissed. */
  onDone: () => void;
}) {
  const [playing, setPlaying] = useState<string | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);

  // One player for the panel; whatever is playing stops when the panel goes away.
  useEffect(() => {
    return () => {
      audio.current?.pause();
      audio.current = null;
    };
  }, []);

  function stop() {
    audio.current?.pause();
    audio.current = null;
    setPlaying(null);
  }

  function play(option: SoundOption) {
    if (playing === option.id) {
      stop();
      return;
    }
    stop();
    if (!option.previewUrl) return;
    const el = new Audio(option.previewUrl);
    el.onended = () => setPlaying((current) => (current === option.id ? null : current));
    el.onerror = () => setPlaying((current) => (current === option.id ? null : current));
    audio.current = el;
    setPlaying(option.id);
    void el.play().catch(() => setPlaying(null));
  }

  async function pick(option: SoundOption) {
    stop();
    setChosen(option.id);
    setSending(true);
    setFailed(null);
    const res = await sendAnswers(toolCallId, answerFor(option));
    setSending(false);
    if (res.ok) {
      onDone();
      return;
    }
    setChosen(null);
    setFailed(describeSendFailure(res));
  }

  const dismiss = () => {
    stop();
    // Release the parked turn: the tool runs without a choice and says so.
    void sendAnswers(toolCallId, {});
    onDone();
  };

  const locked = sending || chosen !== null;

  return (
    <ComposerPanel title={title} onDismiss={dismiss}>
      <div className="px-3 py-2.5">
        <p className="mb-2 text-[0.857rem] leading-relaxed text-text-primary">{question}</p>
        {loading ? (
          <p className="flex items-center gap-2 py-2 text-[0.821rem] text-text-tertiary">
            <Spinner className="size-3.5" /> Loading…
          </p>
        ) : error ? (
          <p className="py-2 text-[0.821rem] text-warning">{error}</p>
        ) : (
          <div className="flex max-h-64 flex-col gap-1 overflow-y-auto">
            {sections.map((section, index) => (
              <div key={section.label ?? index}>
                {section.label && (
                  <p className="px-2.5 pt-1.5 pb-1 text-[0.714rem] font-medium tracking-wide text-text-tertiary uppercase">
                    {section.label}
                  </p>
                )}
                <ul className="flex flex-col gap-1">
                  {section.options.map((option) => {
                    const isChosen = chosen === option.id;
                    const isPlaying = playing === option.id;
                    return (
                      // One row, one pick: the name is the choice, the play
                      // button sits inside it on the right. A div rather than
                      // nested buttons — a button in a button is invalid — with
                      // the row itself clickable and the play control stopping
                      // the click.
                      <li
                        key={option.id}
                        role="button"
                        tabIndex={locked ? -1 : 0}
                        aria-disabled={locked}
                        onClick={() => !locked && void pick(option)}
                        onKeyDown={(e) => {
                          if (locked) return;
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            void pick(option);
                          }
                        }}
                        className={cx(
                          "group flex cursor-pointer items-start gap-2 rounded-md px-2.5 py-1.5 outline-none transition-colors",
                          "focus-visible:bg-surface-hover",
                          isChosen
                            ? "bg-accent-muted"
                            : locked
                              ? "cursor-default opacity-50"
                              : isPlaying
                                ? "bg-surface-hover"
                                : "hover:bg-surface-hover",
                        )}
                      >
                        <Mark on={isChosen} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[0.821rem] text-text-primary">{option.name}</span>
                          <span className="block text-[0.75rem] leading-snug text-text-tertiary">
                            {option.description}
                          </span>
                        </span>
                        {isChosen && sending ? (
                          <Spinner className="size-4 shrink-0 self-center text-text-tertiary" />
                        ) : (
                          <button
                            type="button"
                            aria-label={isPlaying ? `Stop ${option.name}` : `Play ${option.name}`}
                            disabled={!option.previewUrl || locked}
                            onClick={(e) => {
                              e.stopPropagation();
                              play(option);
                            }}
                            onKeyDown={(e) => e.stopPropagation()}
                            // Solid green, on every row: the preview is the
                            // whole point of the list, and a muted circle read
                            // as chrome.
                            className={cx(
                              "flex size-7 shrink-0 items-center justify-center self-center rounded-full text-background transition-colors outline-none disabled:opacity-30",
                              // Playing flips to the off-white chip: the row
                              // that is making noise is the one that stands
                              // out, not the eleven green ones waiting.
                              isPlaying ? "bg-cta hover:bg-cta-hover" : "bg-green hover:bg-green-strong",
                            )}
                          >
                            {/* A triangle centred by its bounding box reads as
                                sitting left of centre — its mass is all on the
                                flat edge. A pixel to the right balances it; the
                                square needs nothing. */}
                            {isPlaying ? (
                              <StopGlyph className="size-3" />
                            ) : (
                              <PlayGlyph className="size-3.5 translate-x-[1px]" />
                            )}
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
        {failed && <p className="pt-2 text-[0.786rem] text-warning">{failed}</p>}
      </div>
    </ComposerPanel>
  );
}
