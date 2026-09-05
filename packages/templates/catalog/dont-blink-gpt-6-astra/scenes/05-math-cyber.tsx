import { Cards, Card } from "../components/kinetic";

// 9 units = 90 frames. Frontier reasoning, and the capability OpenAI
// itself rated "Critical."
const SCRIPT: Card[] = [
  { t: "Math.", u: 0.75, size: "lg" },
  { t: "Primes.", u: 0.5 },
  { t: "Untouched", u: 0.5 },
  { t: "since", u: 0.5 },
  { t: "the", u: 0.5 },
  { t: "1930s.", u: 1, size: "lg" },
  { t: "It", u: 0.5 },
  { t: "finds", u: 0.5 },
  { t: "flaws", u: 0.5 },
  { t: "nobody", u: 0.5 },
  { t: "knew", u: 0.5 },
  { t: "existed.", u: 0.75, size: "lg" },
  { t: "OpenAI’s", u: 0.5 },
  { t: "rating:", u: 0.5 },
  { t: "Critical.", u: 1, size: "bleed", fs: 580, invert: true, flash: true },
];

export default function Scene() {
  return <Cards script={SCRIPT} />;
}
