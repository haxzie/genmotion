import { Cards, Card } from "../components/kinetic";

// 16 units = 160 frames. Hook (held) → a slow 3, 2, 1 — one full second per
// digit, the film holding its breath → then the bleed and the name.
const SCRIPT: Card[] = [
  { t: "Your computer", u: 1.5, size: "md" },
  { t: "has a new user.", u: 2, size: "md" },
  { t: "3", u: 3, size: "bleed", fs: 900 },
  { t: "2", u: 3, size: "bleed", fs: 900, invert: true, flash: true },
  { t: "1", u: 3, size: "bleed", fs: 900 },
  { t: "Don’t", u: 0.5 },
  { t: "blink", u: 1.5, size: "bleed", invert: true, flash: true },
  { t: "Meet", u: 0.5 },
  { t: "Astra.", u: 1, size: "xl" },
];

export default function Scene() {
  return <Cards script={SCRIPT} />;
}
