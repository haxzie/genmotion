import { Cards, Card, MarkCard } from "../components/kinetic";
import blossom from "../assets/openai-blossom.svg";

// 7 units = 70 frames. Speed, alignment, name, bleed, mark.
const SCRIPT: Card[] = [
  { t: "1.9×", u: 0.75, size: "xl" },
  { t: "faster.", u: 0.5 },
  { t: "Their", u: 0.5 },
  { t: "most", u: 0.5 },
  { t: "aligned.", u: 0.75 },
  { t: "GPT-6 Astra", u: 1, size: "lg" },
  { t: "Don’t", u: 0.5 },
  { t: "blink", u: 1.5, size: "bleed", invert: true, flash: true },
  { u: 1, node: <MarkCard src={blossom} size={300} /> },
];

export default function Scene() {
  return <Cards script={SCRIPT} />;
}
