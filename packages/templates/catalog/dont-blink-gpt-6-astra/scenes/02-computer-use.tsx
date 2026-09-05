import { Cards, Card } from "../components/kinetic";

// 10 units = 100 frames. The headline feature: it operates the machine itself.
const SCRIPT: Card[] = [
  { t: "It", u: 0.5 },
  { t: "uses", u: 0.5 },
  { t: "your", u: 0.5 },
  { t: "computer.", u: 1.25, size: "lg" },
  { t: "Clicks.", u: 0.5 },
  { t: "Types.", u: 0.5 },
  { t: "Scrolls.", u: 0.5 },
  { t: "Any", u: 0.5 },
  { t: "app.", u: 0.75 },
  { t: "No", u: 0.5 },
  { t: "API", u: 0.5 },
  { t: "needed.", u: 1.25, size: "lg", invert: true, flash: true },
  { t: "Just", u: 0.5 },
  { t: "a", u: 0.5 },
  { t: "cursor.", u: 1.25, size: "lg" },
];

export default function Scene() {
  return <Cards script={SCRIPT} />;
}
