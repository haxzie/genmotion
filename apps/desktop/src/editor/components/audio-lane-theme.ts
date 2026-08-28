/**
 * The colour of an audio lane, in one place.
 *
 * Every surface that stands for a clip reads from here — the clip on the
 * timeline, the chip above the composer, the pill inside a sent message — so a
 * clip is the same colour wherever you meet it. Split out of the timeline
 * because the composer is nowhere near it in the tree and a second copy of
 * these strings would drift.
 *
 * They have to be literal classes: Tailwind scans the source and can't build a
 * name at runtime.
 */
export interface LaneTheme {
  /** Border + fill while selected. */
  selected: string;
  /** Border + fill at rest, and on hover. */
  idle: string;
  /** Icon and label. */
  text: string;
  textIdle: string;
  /** Waveform fill. */
  wave: string;
  waveIdle: string;
  /** Alt-drag copy badge and the upload ghost. */
  solid: string;
  /** Mute toggle. */
  button: string;
  /**
   * `currentColor` for the gain line, its fade ramps and the fade handles —
   * they all draw with `*-current`. Pitched at the clip's own border: `handle`
   * matches the selected border, `handleIdle` the hover border, which is the
   * only unselected state in which any of it is visible.
   */
  handle: string;
  handleIdle: string;
  /** Context chip / pill: border, fill and text in one. */
  chip: string;
  /** The chip's remove button, on hover. */
  chipHover: string;
}

/**
 * One hue per lane.
 *
 * Every lane used to be orange, so four stacked clips read as one undivided
 * block and the only way to tell which lane a clip was on was to trace the row
 * it sat in. Lane 1 keeps the orange the timeline has always used for audio;
 * the rest are far enough apart in hue to separate at a glance and close enough
 * in brightness that none of them shouts.
 */
export const LANE_THEMES: LaneTheme[] = [
  {
    selected: "border-orange bg-orange-muted",
    idle: "border-orange/25 bg-orange/[0.06] hover:border-orange/45 hover:bg-orange/12",
    text: "text-orange",
    textIdle: "text-orange/80",
    wave: "text-orange",
    waveIdle: "text-orange/55",
    solid: "bg-orange",
    button: "text-orange/70 hover:text-orange",
    handle: "text-orange",
    handleIdle: "text-orange/45",
    chip: "border-orange/40 bg-orange-muted text-orange",
    chipHover: "hover:bg-orange/25",
  },
  {
    selected: "border-mint bg-mint-muted",
    idle: "border-mint/25 bg-mint/[0.06] hover:border-mint/45 hover:bg-mint/12",
    text: "text-mint",
    textIdle: "text-mint/80",
    wave: "text-mint",
    waveIdle: "text-mint/55",
    solid: "bg-mint",
    button: "text-mint/70 hover:text-mint",
    handle: "text-mint",
    handleIdle: "text-mint/45",
    chip: "border-mint/40 bg-mint-muted text-mint",
    chipHover: "hover:bg-mint/25",
  },
  {
    selected: "border-pink bg-pink-muted",
    idle: "border-pink/25 bg-pink/[0.06] hover:border-pink/45 hover:bg-pink/12",
    text: "text-pink",
    textIdle: "text-pink/80",
    wave: "text-pink",
    waveIdle: "text-pink/55",
    solid: "bg-pink",
    button: "text-pink/70 hover:text-pink",
    handle: "text-pink",
    handleIdle: "text-pink/45",
    chip: "border-pink/40 bg-pink-muted text-pink",
    chipHover: "hover:bg-pink/25",
  },
  {
    selected: "border-sky bg-sky-muted",
    idle: "border-sky/25 bg-sky/[0.06] hover:border-sky/45 hover:bg-sky/12",
    text: "text-sky",
    textIdle: "text-sky/80",
    wave: "text-sky",
    waveIdle: "text-sky/55",
    solid: "bg-sky",
    button: "text-sky/70 hover:text-sky",
    handle: "text-sky",
    handleIdle: "text-sky/45",
    chip: "border-sky/40 bg-sky-muted text-sky",
    chipHover: "hover:bg-sky/25",
  },
];

/**
 * The lane's colours. Wraps, so it survives MAX_AUDIO_TRACKS growing, and
 * tolerates a missing track — a message sent before clips carried one still
 * renders, in lane 1's orange, which is what it was drawn in at the time.
 */
export function laneTheme(track: number | null | undefined): LaneTheme {
  const index = typeof track === "number" && track >= 0 ? track : 0;
  return LANE_THEMES[index % LANE_THEMES.length]!;
}
