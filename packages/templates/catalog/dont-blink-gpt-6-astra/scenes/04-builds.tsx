import { Cards, Card } from "../components/kinetic";

// 9 units = 90 frames. Software engineering and the new one: spatial —
// one-shot 3D reconstruction from a photo.
const SCRIPT: Card[] = [
  { t: "It", u: 0.5 },
  { t: "codes.", u: 0.5 },
  { t: "It", u: 0.5 },
  { t: "tests.", u: 0.5 },
  { t: "It", u: 0.5 },
  { t: "ships.", u: 0.5 },
  { t: "It", u: 0.5 },
  { t: "builds", u: 0.5 },
  { t: "in", u: 0.5 },
  { t: "3D.", u: 1, size: "xl" },
  { t: "From", u: 0.5 },
  { t: "a", u: 0.5 },
  { t: "photo.", u: 0.75 },
  { t: "One", u: 0.5 },
  { t: "shot.", u: 1.25, size: "lg", invert: true },
];

export default function Scene() {
  return <Cards script={SCRIPT} />;
}
