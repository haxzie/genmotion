import {
  AbsoluteFill,
  Easing,
  interpolate,
  useCurrentFrame,
} from "@genmotion/motion";
import {
  C,
  HOLD_END,
  LABEL,
  METRICS,
  RULES,
  RULE_X,
  SPECIMEN,
  TYPE_DUR,
  WORD_DUR,
  mix,
} from "../components/brand";

// Beat 3 — the type specimen. Words type onto the baseline rules character by
// character; the freshly-typed characters trail through the specimen's accent
// back down to ink, with a block cursor riding the leading edge. Each word
// backspaces away to make room for the next.
//
// Opens on the paper field 02 flooded in. Ends holding the final word + rules,
// which 04-collage opens on top of.

const TRAIL = 4; // how many characters back the colour trail reaches

export default function Scene() {
  const frame = useCurrentFrame();

  const idx = Math.min(Math.floor(frame / WORD_DUR), SPECIMEN.length - 1);
  const local = frame - idx * WORD_DUR;
  const word = SPECIMEN[idx];
  // Size and baseline nudge come from the face's own metrics, so every
  // specimen fills the cap→baseline band exactly.
  const m = METRICS[word.metrics];
  const isLast = idx === SPECIMEN.length - 1;
  const n = word.text.length;

  // How many characters are currently on screen.
  let shown: number;
  if (local < TYPE_DUR) {
    shown = Math.floor(
      interpolate(local, [0, TYPE_DUR], [0, n], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      }),
    );
  } else if (local < HOLD_END || isLast) {
    shown = n;
  } else {
    shown = Math.ceil(
      interpolate(local, [HOLD_END, WORD_DUR], [n, 0], {
        easing: Easing.inOutCubic,
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      }),
    );
  }

  // Rules draw out from the left as the scene opens, and hold thereafter.
  const ruleDraw = interpolate(frame, [0, 16], [0, 1], {
    easing: Easing.outSmooth,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const chrome = interpolate(frame, [2, 14], [0, 1], {
    easing: Easing.outSmooth,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Cursor pulses only while the word is sitting still.
  const resting = local >= TYPE_DUR && local < HOLD_END;
  const blink = resting
    ? interpolate(local % 8, [0, 4, 8], [1, 0.35, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 1;

  const ruleStyle = (top: number, delay: number) => {
    const d = interpolate(ruleDraw, [delay, 1], [0, 1], {
      easing: Easing.outSmooth,
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    return {
      position: "absolute" as const,
      left: RULE_X.from,
      top,
      width: (RULE_X.to - RULE_X.from) * d,
      height: 1.5,
      backgroundColor: C.rule,
    };
  };

  return (
    <AbsoluteFill style={{ backgroundColor: C.paper, overflow: "hidden" }}>
      <div id="rule-cap" style={ruleStyle(RULES.cap, 0)} />
      <div id="rule-median" style={ruleStyle(RULES.median, 0.15)} />
      <div id="rule-baseline" style={ruleStyle(RULES.baseline, 0.3)} />

      {/* Specimen chrome: the constant labels above and below the rules. */}
      <div
        id="specimen-caption"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: RULES.cap - 90,
          textAlign: "center",
          fontFamily: LABEL,
          fontSize: 30,
          fontWeight: 500,
          letterSpacing: "0.08em",
          color: C.ink,
          opacity: chrome,
        }}
      >
        GUIDELINES
      </div>

      <div
        id="specimen-face"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: RULES.baseline + 64,
          textAlign: "center",
          fontFamily: LABEL,
          fontSize: 30,
          fontWeight: 500,
          letterSpacing: "0.08em",
          color: C.ink,
          opacity: chrome,
          textTransform: "uppercase",
        }}
      >
        {word.face}
      </div>

      {/* The word itself, left-aligned to the start of the rules. The row has
          zero height and bottom-aligns at the baseline rule, then the glyph box
          is nudged down by its own baseline offset so the letters actually sit
          on the rule rather than hanging under it. */}
      <div
        id="specimen-word"
        style={{
          position: "absolute",
          left: RULE_X.from,
          top: RULES.baseline,
          height: 0,
          display: "flex",
          alignItems: "flex-end",
        }}
      >
        <span
          style={{
            fontFamily: word.family,
            fontWeight: word.weight,
            fontStyle: word.italic ? "italic" : "normal",
            fontSize: m.size,
            letterSpacing: word.tracking,
            lineHeight: 1,
            whiteSpace: "pre",
            display: "block",
            transform: `translateY(${m.shift})`,
          }}
        >
          {/* Only the typed characters are rendered at all. Hiding them with
              opacity leaves them occupying layout, which pins the cursor at
              the full word's width instead of letting it ride the caret. */}
          {word.text
            .slice(0, shown)
            .split("")
            .map((ch, i) => {
              const dist = shown - 1 - i;
              // dist 0 is the newest character: full accent, cooling to ink.
              const color =
                dist <= 0
                  ? word.accent
                  : mix(word.accent, C.ink, Math.min(1, dist / TRAIL));
              return (
                <span key={i} style={{ color }}>
                  {ch}
                </span>
              );
            })}
        </span>

        <div
          id="specimen-cursor"
          style={{
            width: 14,
            height: RULES.baseline - RULES.cap + 46,
            backgroundColor: word.accent,
            marginLeft: 12,
            transform: "translateY(26px)",
            opacity: blink,
            flex: "none",
          }}
        />
      </div>
    </AbsoluteFill>
  );
}
