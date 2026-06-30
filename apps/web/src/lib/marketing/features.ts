import type { IconKey } from "@/components/marketing/icons";
import type { Faq } from "@/lib/marketing/faq";

export type FeatureSection = {
  heading: string;
  body: string;
};

export type Feature = {
  slug: string;
  name: string;
  /** One-line value prop, used on cards and as the page sub-headline. */
  tagline: string;
  /** Longer paragraph for the feature page hero. */
  description: string;
  icon: IconKey;
  sections: FeatureSection[];
  faqs: Faq[];
};

export const FEATURES: Feature[] = [
  {
    slug: "ai-scene-authoring",
    name: "AI Scene Authoring",
    tagline: "Describe a scene in plain language — the agent writes the animation.",
    description:
      "Chat with an agent that turns your prompt into real animated scenes, authored as React/TSX with a deterministic motion runtime. No keyframing by hand — describe the idea and iterate by talking.",
    icon: "chat",
    sections: [
      {
        heading: "From prompt to motion",
        body: "Ask for “animated quarterly stats” or “a product launch teaser matching our brand” and the agent composes the scene, choosing timing, easing, and layout for you.",
      },
      {
        heading: "Iterate by conversation",
        body: "Refine anything in natural language — “slow the intro down,” “make the headline rise instead of fade.” Each change re-renders instantly in the preview.",
      },
      {
        heading: "Real code under the hood",
        body: "Every scene is plain React/TSX using our motion primitives, so output stays inspectable, editable, and version-controllable — never a black box.",
      },
    ],
    faqs: [
      {
        q: "Do I need to know how to code to use AI scene authoring?",
        a: "No. You describe what you want in plain language and the agent writes the animated scenes for you. The underlying code is there if you ever want to inspect or fine-tune it, but it's never required.",
      },
      {
        q: "Can I edit a scene the agent created?",
        a: "Yes. Keep refining by conversation — ask to change timing, layout, colors, or copy — and every change re-renders instantly in the preview.",
      },
      {
        q: "What does the agent actually produce?",
        a: "Real React/TSX scenes built on GenMotion's deterministic motion runtime, so the output is inspectable, editable, and version-controllable rather than a locked black box.",
      },
    ],
  },
  {
    slug: "frame-accurate-preview",
    name: "Frame-Accurate Preview",
    tagline: "Scrub frame-by-frame in the browser — what you see is what renders.",
    description:
      "A deterministic player drives every animation from a single frame clock, so the preview in your browser is identical to the final export — down to the pixel and the frame.",
    icon: "frame",
    sections: [
      {
        heading: "Deterministic by design",
        body: "Motion is a pure function of the current frame. No wall-clock timers, no randomness drift — replays are bit-for-bit identical every time.",
      },
      {
        heading: "Scrub and inspect",
        body: "Drag the playhead to any frame and see exactly that moment. Perfect for nailing timing on a specific beat.",
      },
      {
        heading: "WYSIWYG, literally",
        body: "Because the preview and the renderer share the same runtime, there are no surprises when you export.",
      },
    ],
    faqs: [
      {
        q: "Is the browser preview really identical to the export?",
        a: "Yes. The preview and the renderer run the same deterministic runtime, so what you scrub in the browser is pixel-for-pixel and frame-for-frame what the exported MP4 contains.",
      },
      {
        q: "What does frame-accurate mean?",
        a: "Every animation is a pure function of the current frame — no wall-clock timers or randomness drift — so any given frame always looks exactly the same on every replay.",
      },
      {
        q: "Can I scrub to a specific frame?",
        a: "Yes. Drag the playhead to any frame to see precisely that moment, which makes it easy to nail timing on a specific beat.",
      },
    ],
  },
  {
    slug: "timeline-editor",
    name: "Timeline Editor",
    tagline: "Rearrange scenes and tune durations on a visual timeline.",
    description:
      "Drag scenes to reorder them, trim durations measured in frames at your project's FPS, and choreograph the whole sequence without touching code.",
    icon: "timeline",
    sections: [
      {
        heading: "Direct manipulation",
        body: "Drag-and-drop scene blocks to reorder; grab an edge to change a scene's length. The preview updates as you go.",
      },
      {
        heading: "Frame-precise durations",
        body: "Durations are counted in frames at the project's frame rate, so timing is exact and predictable.",
      },
      {
        heading: "Audio-aware",
        body: "Waveforms render under scenes with sound, so you can line up motion to the beat by eye.",
      },
    ],
    faqs: [
      {
        q: "How do I reorder scenes?",
        a: "Drag scene blocks on the timeline to reorder them, and drag a block's edge to change its duration. The preview updates as you go.",
      },
      {
        q: "How are scene durations measured?",
        a: "Durations are counted in frames at the project's frame rate, so timing is exact and predictable rather than approximate.",
      },
      {
        q: "Can I sync motion to audio?",
        a: "Yes. Waveforms render beneath scenes that have sound, so you can line animation up to the beat by eye.",
      },
    ],
  },
  {
    slug: "pixel-identical-export",
    name: "Pixel-Identical Export",
    tagline: "Export MP4s rendered by a headless worker — pixel-perfect, every time.",
    description:
      "A headless Chromium + ffmpeg worker renders each frame off the same runtime you previewed, then encodes a clean MP4. The file matches your preview exactly.",
    icon: "export",
    sections: [
      {
        heading: "Server-side rendering",
        body: "Rendering runs on a dedicated worker, so quality never depends on your laptop and long exports don't block your editor.",
      },
      {
        heading: "Pixel-for-pixel fidelity",
        body: "The renderer shares the preview's deterministic runtime, guaranteeing the export is identical to what you reviewed.",
      },
      {
        heading: "Standard MP4 out",
        body: "Get a broadcast-friendly H.264 MP4 ready to post anywhere — no proprietary formats.",
      },
    ],
    faqs: [
      {
        q: "What format do exports come in?",
        a: "A standard H.264 MP4 that's ready to upload anywhere — no proprietary or platform-locked formats.",
      },
      {
        q: "Where does rendering happen?",
        a: "On a dedicated headless worker, so export quality never depends on your computer and long renders don't block your editor.",
      },
      {
        q: "Will the export match what I previewed?",
        a: "Exactly. The renderer shares the preview's deterministic runtime, so the MP4 is pixel-identical to what you reviewed.",
      },
    ],
  },
  {
    slug: "text-animation-presets",
    name: "Text Animation Presets",
    tagline: "Beautiful kinetic typography from a single component.",
    description:
      "A library of polished text-animation presets — blur-up, rise-mask, word reveal, scramble, typewriter and more — that look hand-tuned with zero fiddling.",
    icon: "type",
    sections: [
      {
        heading: "Presets that just look right",
        body: "Drop in a preset like blurUp, riseMask, or wordReveal and get production-quality kinetic type with sensible timing out of the box.",
      },
      {
        heading: "Composable",
        body: "Combine presets with sequencing and staggering to choreograph multi-line titles and lower-thirds.",
      },
      {
        heading: "On brand",
        body: "Presets respect your fonts and colors, so titles match the rest of your video automatically.",
      },
    ],
    faqs: [
      {
        q: "What text animation presets are included?",
        a: "Polished kinetic-type presets such as blur-up, rise-mask, word reveal, scramble, and typewriter — each tuned to look hand-crafted out of the box.",
      },
      {
        q: "Can I combine presets?",
        a: "Yes. Pair presets with sequencing and staggering to choreograph multi-line titles, lower-thirds, and more.",
      },
      {
        q: "Will the type match my brand?",
        a: "Presets respect your project's fonts and colors, so animated titles stay consistent with the rest of your video automatically.",
      },
    ],
  },
  {
    slug: "ai-voiceover",
    name: "AI Voiceover",
    tagline: "Add natural narration per scene — synced to your animation.",
    description:
      "Generate per-scene narration with lifelike text-to-speech, pick from a range of voices, and get beat timings back so motion can sync to the words.",
    icon: "mic",
    sections: [
      {
        heading: "Lifelike voices",
        body: "Choose from a range of natural-sounding voices and generate narration for any scene from a line of text.",
      },
      {
        heading: "Auto-timed",
        body: "Scenes extend automatically to fit the narration, and per-sentence beat timings let you cue animation to the voice.",
      },
      {
        heading: "Iterate fast",
        body: "Rewrite a line and regenerate in seconds — no studio, no microphone.",
      },
    ],
    faqs: [
      {
        q: "How does AI voiceover work?",
        a: "Write a line of narration for any scene and GenMotion generates lifelike text-to-speech from it — choose from a range of natural-sounding voices.",
      },
      {
        q: "Does the narration sync to the animation?",
        a: "Yes. Scenes extend automatically to fit the narration, and per-sentence beat timings let you cue animation to the voice.",
      },
      {
        q: "Can I change the script later?",
        a: "Absolutely — rewrite a line and regenerate in seconds. No studio or microphone required.",
      },
    ],
  },
  {
    slug: "brand-extraction",
    name: "Brand Extraction",
    tagline: "Point at a website and pull its logo, colors, and fonts.",
    description:
      "Give the agent a URL and it analyzes the site's branding — logo, color palette, and typography — so your video matches a brand from the first draft.",
    icon: "palette",
    sections: [
      {
        heading: "One URL, full palette",
        body: "The agent inspects a site and extracts its logo, dominant colors, and fonts into a reusable style for your project.",
      },
      {
        heading: "On-brand drafts",
        body: "Generated scenes adopt the extracted palette and type, so the very first cut already looks like the brand.",
      },
      {
        heading: "Assets saved for you",
        body: "Logos and icons are pulled into project storage, ready to drop into any scene.",
      },
    ],
    faqs: [
      {
        q: "How does brand extraction work?",
        a: "Give the agent a website URL and it analyzes the site's branding — logo, dominant colors, and typography — then turns that into a reusable style for your project.",
      },
      {
        q: "Will my video match the brand automatically?",
        a: "Generated scenes adopt the extracted palette and fonts, so the very first draft already looks on-brand.",
      },
      {
        q: "Does it save the brand's assets?",
        a: "Yes. Logos and icons are pulled into project storage, ready to drop into any scene.",
      },
    ],
  },
];

export function getFeature(slug: string): Feature | undefined {
  return FEATURES.find((f) => f.slug === slug);
}
