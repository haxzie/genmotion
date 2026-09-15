import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { API_URL, api } from "@/lib/api";
import { Spinner, cx } from "@/components/ui";

/**
 * The agent's "which voice?" — answered in place, the way its questions are.
 *
 * The harness is parked in `canUseTool` while this card is up (see
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
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M8 5.5v13l11-6.5z" />
    </svg>
  );
}

function StopGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
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

export function VoicePickerCard({
  toolCallId,
  question,
  answered,
  output,
}: {
  toolCallId: string;
  question: string;
  /** The tool already ran — a reloaded transcript, a stopped turn, or this window's own click. */
  answered: boolean;
  output: string;
}) {
  const voices = useVoices();
  const [playing, setPlaying] = useState<string | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);

  // One player for the card; whatever is playing stops when another starts,
  // when the pick is made, or when the card goes away.
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
    try {
      const res = await fetch(`${API_URL}/api/chat/answer`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ toolCallId, answers: { voiceId: voice.id, voiceName: voice.name } }),
      });
      if (!res.ok) {
        setChosen(null);
        setFailed(
          res.status === 410
            ? "This question is no longer waiting for an answer."
            : `Could not send the choice (${res.status}).`,
        );
      }
    } catch (err) {
      setChosen(null);
      setFailed(err instanceof Error ? err.message : String(err));
    } finally {
      setSending(false);
    }
  }

  if (answered) {
    return <p className="whitespace-pre-wrap px-3 py-2 text-[0.821rem] text-text-secondary">{output}</p>;
  }

  return (
    <div className="px-3 py-2.5">
      <p className="mb-2 text-[0.857rem] leading-relaxed text-text-secondary">{question}</p>
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
        <ul className="flex max-h-72 flex-col gap-1 overflow-y-auto pr-1">
          {voices.data.voices.map((voice) => {
            const isChosen = chosen === voice.id;
            const isPlaying = playing === voice.id;
            const locked = sending || chosen !== null;
            return (
              // One row, one card: the name is the pick, the play button
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
                  "group flex cursor-pointer items-center gap-3 rounded-md border px-2.5 py-1.5 outline-none transition-colors",
                  "focus-visible:ring-2 focus-visible:ring-accent/40",
                  isChosen
                    ? "border-accent bg-accent-muted"
                    : locked
                      ? "cursor-default border-border opacity-50"
                      : isPlaying
                        ? "border-accent/60 bg-surface-raised"
                        : "border-border hover:border-text-tertiary hover:bg-surface-raised",
                )}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[0.821rem] text-text-primary">{voice.name}</span>
                  <span className="block truncate text-[0.75rem] leading-snug text-text-tertiary">{describe(voice)}</span>
                </span>
                {isChosen && sending ? (
                  <Spinner className="size-3.5 shrink-0 text-text-tertiary" />
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
                    className={cx(
                      "flex size-7 shrink-0 items-center justify-center rounded-full border transition-colors outline-none",
                      "focus-visible:ring-2 focus-visible:ring-accent/40 disabled:opacity-40",
                      isPlaying
                        ? "border-accent bg-accent text-white hover:bg-accent-hover"
                        : "border-border bg-surface text-text-secondary hover:border-accent hover:bg-accent-muted hover:text-accent",
                    )}
                  >
                    {isPlaying ? <StopGlyph className="size-3.5" /> : <PlayGlyph className="size-3.5" />}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {failed && <p className="pt-2 text-[0.786rem] text-warning">{failed}</p>}
    </div>
  );
}
