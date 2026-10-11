import { useQuery } from "@tanstack/react-query";
import { API_URL, api } from "@/lib/api";
import { SoundPickerPanel, type SoundOption, type SoundSection } from "./sound-picker";

/**
 * The agent's "which keyboard?" — the same panel as the voice picker, over a
 * list that comes from this machine rather than a provider.
 *
 * Keystroke sounds are synthesised locally (`@genmotion/keysound`), so unlike
 * the voices there is no account, no network and no cost behind any of this: the
 * demo each play button plays is rendered on the spot by the main process. Which
 * is also why the agent should rarely ask — the default is a real choice, and
 * `pick_keyboard_sound` exists for when the user wants a different one.
 */

interface SoundProfileInfo {
  id: string;
  label: string;
  blurb: string;
  isDefault: boolean;
}

export type SoundKind = "keyboard" | "click" | "both";

export function useKeyboardSounds() {
  return useQuery({
    queryKey: ["keysound-profiles"],
    queryFn: () => api<{ keyboards: SoundProfileInfo[]; clicks: SoundProfileInfo[] }>("/api/keysound/profiles"),
    // Synthesised from a fixed table: this list cannot change while the app runs.
    staleTime: Infinity,
  });
}

function toOption(profile: SoundProfileInfo): SoundOption {
  return {
    id: profile.id,
    name: profile.isDefault ? `${profile.label} (default)` : profile.label,
    description: profile.blurb,
    previewUrl: `${API_URL}/api/keysound/demo/${encodeURIComponent(profile.id)}`,
  };
}

export function KeyboardPickerPanel({
  toolCallId,
  question,
  kind,
  onDone,
}: {
  toolCallId: string | undefined;
  question: string;
  kind: SoundKind;
  onDone: () => void;
}) {
  const profiles = useKeyboardSounds();
  const keyboards = profiles.data?.keyboards ?? [];
  const clicks = profiles.data?.clicks ?? [];

  // Labels only when both lists are up: one list needs no heading.
  const both = kind === "both";
  const sections: SoundSection[] = [
    ...(kind !== "click" ? [{ ...(both ? { label: "Keyboard" } : {}), options: keyboards.map(toOption) }] : []),
    ...(kind !== "keyboard" ? [{ ...(both ? { label: "Mouse click" } : {}), options: clicks.map(toOption) }] : []),
  ];

  return (
    <SoundPickerPanel
      title={kind === "click" ? "Mouse click" : kind === "both" ? "Sound" : "Keyboard"}
      question={question}
      sections={sections}
      loading={profiles.isLoading}
      error={
        profiles.isError || !profiles.data
          ? "Couldn't load the keyboard sounds. Restart the app and try again."
          : null
      }
      answerFor={(option) => ({ soundId: option.id, soundName: option.name })}
      toolCallId={toolCallId}
      onDone={onDone}
    />
  );
}
