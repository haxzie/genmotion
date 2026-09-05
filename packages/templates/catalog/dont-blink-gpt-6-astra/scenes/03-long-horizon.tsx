import { Cards, Card } from "../components/kinetic";

// 9 units = 90 frames. Long-horizon work: 40-minute tasks, and notes it
// carries with it so nothing is lost between runs.
const SCRIPT: Card[] = [
  { t: "Give", u: 0.5 },
  { t: "it", u: 0.5 },
  { t: "a", u: 0.5 },
  { t: "task.", u: 0.75 },
  { t: "Walk", u: 0.5 },
  { t: "away.", u: 0.75 },
  { t: "Forty", u: 0.5 },
  { t: "minutes", u: 0.5 },
  { t: "later:", u: 0.5 },
  { t: "Done.", u: 1.5, size: "lg", invert: true, flash: true },
  { t: "It", u: 0.5 },
  { t: "doesn’t", u: 0.5 },
  { t: "forget.", u: 1.5, size: "lg" },
];

export default function Scene() {
  return <Cards script={SCRIPT} />;
}
