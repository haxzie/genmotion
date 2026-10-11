import { useQuery } from "@tanstack/react-query";
import { API_URL, api } from "@/lib/api";
import { SoundPickerPanel, type SoundOption } from "./sound-picker";

/**
 * The agent's "which voice?" — asked above the chatbox, the way its questions
 * are (see `ComposerPanel`).
 *
 * The harness is parked in `canUseTool` while this panel is up (see `pick_voice`
 * in `electron/agent/tools.ts`); the click posts to the same answer route a
 * question does, with the voice's id and name, and the tool runs with them.
 *
 * The list, the play buttons and the answering all live in `SoundPickerPanel`,
 * which the keyboard picker uses too. What is left here is what is specific to
 * a voice: where the list comes from, and how its labels read as a sentence.
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
  onDone: () => void;
}) {
  const voices = useVoices();

  const options: SoundOption[] = (voices.data?.voices ?? []).map((voice) => ({
    id: voice.id,
    name: voice.name,
    description: describe(voice),
    // Played through the loopback server, not the provider: the renderer's CSP
    // plays media from this server only.
    previewUrl: voice.previewUrl ? `${API_URL}/api/voices/${encodeURIComponent(voice.id)}/preview` : null,
  }));

  return (
    <SoundPickerPanel
      title="Voice"
      question={question}
      sections={[{ options }]}
      loading={voices.isLoading}
      error={
        voices.isError || !voices.data
          ? voices.error instanceof Error && voices.error.message
            ? voices.error.message
            : "Couldn't load the voices. Check your connection and try again."
          : null
      }
      answerFor={(option) => ({ voiceId: option.id, voiceName: option.name })}
      toolCallId={toolCallId}
      onDone={onDone}
    />
  );
}
