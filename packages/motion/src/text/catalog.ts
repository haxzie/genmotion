import {
  TEXT_EFFECT_ALIASES,
  TEXT_EFFECTS,
  type EffectGroup,
  type TextEffect,
} from "./effects";

const GROUP_TITLES: Record<EffectGroup, string> = {
  fade: "Fades & slides",
  blur: "Blur — the house look",
  mask: "Masks & wipes",
  scale: "Scale",
  dimensional: "3D",
  rotate: "Rotate & skew",
  kinetic: "Kinetic",
  editorial: "Editorial",
};

const GROUP_ORDER: EffectGroup[] = [
  "blur",
  "mask",
  "fade",
  "scale",
  "editorial",
  "dimensional",
  "rotate",
  "kinetic",
];

/**
 * The effect list as the scene-authoring agent sees it.
 *
 * Generated from the registry so the two can never drift — adding an effect
 * makes it visible to the model with no prompt edit. Built once at module load
 * from a static object, so the string is byte-identical on every turn and stays
 * inside the cached prompt prefix.
 */
export const TEXT_EFFECT_CATALOG = (() => {
  const entries = Object.entries(TEXT_EFFECTS) as [string, TextEffect][];
  const lines: string[] = [];

  for (const group of GROUP_ORDER) {
    const inGroup = entries.filter(([, e]) => e.group === group);
    if (inGroup.length === 0) continue;
    lines.push(`${GROUP_TITLES[group]}:`);
    for (const [name, effect] of inGroup) {
      // Only call out a split granularity when it isn't the default, since
      // those effects genuinely don't work at other granularities.
      const note = effect.by && effect.by !== "word" ? ` (${effect.by}s)` : "";
      lines.push(`  \`${name}\`${note} — ${effect.blurb}`);
    }
  }

  const aliases = Object.entries(TEXT_EFFECT_ALIASES)
    .map(([from, to]) => `\`${from}\`=\`${to}\``)
    .join(", ");
  lines.push(`Aliases: ${aliases}.`);

  return lines.join("\n");
})();
