import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { API_URL, api } from "@/lib/api";
import { Spinner, cx } from "@/components/ui";
import {
  ComposerPanel,
  Mark,
  describeSendFailure,
  sendAnswers,
} from "./composer-panel";

/**
 * The agent's "which voice?" — asked above the chatbox, the way its questions
 * are (see `ComposerPanel`).
 *
 * The harness is parked in `canUseTool` while this panel is up (see
 * `pick_voice` in `electron/agent/tools.ts`); the click posts to the same
 * answer route a question does, with the voice's id and name, and the tool
 * runs with them. Each voice has a play button: hearing three seconds beats
 * reading "warm, middle-aged, British" every time.
 */

export interface VoiceOption {
  id: string;
  name: string;
  labels: Record<string, string>;
  category: string;
  previewUrl: string | null;
}

/** Which tags to show, in the order they read best. */
const LABELS = ["gender", "age", "accent", "use_case", "description", "descriptive"] as const;

function describe(voice: VoiceOption): string {
  const seen = new Set<string>();
  const words: string[] = [];
  for (const key of LABELS) {
    const value = voice.labels[key]?.trim();
    if (!value || seen.has(value.toLowerCase())) continue;
    seen.add(value.toLowerCase());
    words.push(value.replace(/_/g, " "));
  }
  return words.join(" · ");
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

export function useVoices() {
  return useQuery({
    queryKey: ["voices"],
    queryFn: () => api<{ voices: VoiceOption[] }>("/api/voices"),
    staleTime: 10 * 60 * 1000,
  });
}

export function VoicePickerPanel({
  toolCallId,
  question,
  onDone,
}: {
  toolCallId: string | undefined;
  question: string;
  /** Called once the panel is finished with — picked or dismissed. */
  onDone: () => void;
}) {
  const voices = useVoices();
  const [playing, setPlaying] = useState<string | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);

  // One player for the panel; whatever is playing stops when another starts,
  // when the pick is made, or when the panel goes away.
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

  function play(voice: VoiceOption) {
    if (playing === voice.id) {
      stop();
      return;
    }
    stop();
    const el = new Audio(`${API_URL}/api/voices/${encodeURIComponent(voice.id)}/preview`);
    el.onended = () => setPlaying((current) => (current === voice.id ? null : current));
    el.onerror = () => setPlaying((current) => (current === voice.id ? null : current));
    audio.current = el;
    setPlaying(voice.id);
    void el.play().catch(() => setPlaying(null));
  }

  async function pick(voice: VoiceOption) {
    stop();
    setChosen(voice.id);
    setSending(true);
    setFailed(null);
    const res = await sendAnswers(toolCallId, { voiceId: voice.id, voiceName: voice.name });
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
    // Release the parked turn: `pick_voice` runs without a voice and says so.
    void sendAnswers(toolCallId, {});
    onDone();
  };

  const list = voices.data?.voices ?? [];

  return (
    <ComposerPanel title="Voice" onDismiss={dismiss}>
      <div className="px-3 py-2.5">
        <p className="mb-2 text-[0.857rem] leading-relaxed text-text-primary">{question}</p>
        {voices.isLoading ? (
          <p className="flex items-center gap-2 py-2 text-[0.821rem] text-text-tertiary">
            <Spinner className="size-3.5" /> Loading voices…
          </p>
        ) : voices.isError || !voices.data ? (
          <p className="py-2 text-[0.821rem] text-warning">
            {voices.error instanceof Error && voices.error.message
              ? voices.error.message
              : "Couldn't load the voices. Check your connection and try again."}
          </p>
        ) : (
          <ul className="flex max-h-64 flex-col gap-1 overflow-y-auto">
            {list.map((voice) => {
              const isChosen = chosen === voice.id;
              const isPlaying = playing === voice.id;
              const locked = sending || chosen !== null;
              return (
                // One row, one pick: the name is the choice, the play button
                // sits inside it on the right. A div rather than nested
                // buttons — a button in a button is invalid — with the row
                // itself clickable and the play control stopping the click.
                <li
                  key={voice.id}
                  role="button"
                  tabIndex={locked ? -1 : 0}
                  aria-disabled={locked}
                  onClick={() => !locked && void pick(voice)}
                  onKeyDown={(e) => {
                    if (locked) return;
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      void pick(voice);
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
                    <span className="block truncate text-[0.821rem] text-text-primary">{voice.name}</span>
                    <span className="block truncate text-[0.75rem] leading-snug text-text-tertiary">
                      {describe(voice)}
                    </span>
                  </span>
                  {isChosen && sending ? (
                    <Spinner className="size-4 shrink-0 self-center text-text-tertiary" />
                  ) : (
                    <button
                      type="button"
                      aria-label={isPlaying ? `Stop ${voice.name}` : `Play ${voice.name}`}
                      disabled={!voice.previewUrl || locked}
                      onClick={(e) => {
                        e.stopPropagation();
                        play(voice);
                      }}
                      onKeyDown={(e) => e.stopPropagation()}
                      // Solid green, on every row: the preview is the whole
                      // point of the list, and a muted circle read as chrome.
                      className={cx(
                        "flex size-7 shrink-0 items-center justify-center self-center rounded-full text-background transition-colors outline-none disabled:opacity-30",
                        // Playing flips to the off-white chip: the row that is
                        // making noise is the one that stands out, not the
                        // eleven green ones waiting their turn.
                        isPlaying ? "bg-cta hover:bg-cta-hover" : "bg-green hover:bg-green-strong",
                      )}
                    >
                      {/* A triangle centred by its bounding box reads as
                          sitting left of centre — its mass is all on the flat
                          edge. A pixel to the right balances it; the square
                          needs nothing. */}
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
        )}
        {failed && <p className="pt-2 text-[0.786rem] text-warning">{failed}</p>}
      </div>
    </ComposerPanel>
  );
}
