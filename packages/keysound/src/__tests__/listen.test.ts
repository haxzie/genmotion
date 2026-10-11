/**
 * Not a test: a listening harness.
 *
 * `GM_KEYSOUND_LISTEN=1 pnpm --filter @genmotion/keysound test` prints the
 * rhythm of a sentence keystroke by keystroke and writes every profile's demo
 * into `.context/keysound/`, which is how a change to the tables or the timing
 * model gets checked by ear. Skipped otherwise: the suite should not write files
 * on an ordinary run, and the numbers it prints are for a person, not an assert.
 */
import fs from "node:fs";
import path from "node:path";
import { it } from "vitest";
import { CLICKS, KEYBOARDS, planTyping, renderDemo, renderTyping } from "../index";

it.skipIf(!process.env.GM_KEYSOUND_LISTEN)("writes samples to listen to", () => {
  const out = path.resolve(import.meta.dirname, "../../../../.context/keysound");
  fs.mkdirSync(out, { recursive: true });

  const text = "The quick brown fox jumps over the lazy dog.";
  const plan = planTyping(text, { seed: "probe", typoRate: 0 });
  let prev = 0;
  const rows = plan.keystrokes.map((k) => {
    const row = `${String(k.atMs).padStart(6)}  +${String(k.atMs - prev).padStart(4)}  ${k.kind.padEnd(9)} ${JSON.stringify(k.char)}`;
    prev = k.atMs;
    return row;
  });
  console.log(rows.join("\n"));
  console.log(`\n${text.length} chars · ${plan.durationMs}ms · ${plan.effectiveWpm} wpm`);

  const slip = planTyping("const total = count;", { seed: "slip-demo", typoRate: 0.12 });
  console.log("\n--- with slips ---");
  console.log(
    slip.keystrokes
      .map((k) => `${String(k.atMs).padStart(6)} ${k.kind.padEnd(9)} ${String(JSON.stringify(k.char)).padEnd(5)} "${k.text}"`)
      .join("\n"),
  );
  console.log(`mistakes: ${slip.mistakes}`);

  for (const profile of [...KEYBOARDS, ...CLICKS]) {
    fs.writeFileSync(path.join(out, `${profile.id}.wav`), renderDemo(profile.id).wav);
  }
  const long = renderTyping("npm install && npm run dev", { profile: "thock", seed: "cli", typoRate: 0.06 });
  fs.writeFileSync(path.join(out, "typing-thock.wav"), long.wav);
  console.log(`\nwrote ${KEYBOARDS.length + CLICKS.length + 1} files to ${out}`);
});
