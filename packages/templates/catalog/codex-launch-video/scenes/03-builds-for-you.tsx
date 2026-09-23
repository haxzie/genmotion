import { AbsoluteFill } from "@genmotion/motion";
import { C, FONT } from "../components/brand";
import { BlurWord } from "../components/BlurWord";

// 4.17–5.17s — "and it builds for you". "for you" stays light blue.
export default function Scene() {
  const words: [string, number, string][] = [
    ["and", -3, C.ink],
    ["it", 1, C.ink],
    ["builds", 5, C.ink],
    ["for", 6, C.lightBlue],
    ["you", 10, C.lightBlue],
  ];
  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <div
        id="builds-line"
        style={{ display: "flex", gap: 30, fontFamily: FONT.sans, fontSize: 125, fontWeight: 400, letterSpacing: "-0.015em", lineHeight: 1.2 }}
      >
        {words.map(([w, s, to]) => (
          <BlurWord key={w} id={`w-${w}`} text={w} start={s} dur={8} from={"#8fb4e8"} to={to} blur={10} />
        ))}
      </div>
    </AbsoluteFill>
  );
}
