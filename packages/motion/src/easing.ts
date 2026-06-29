export type EasingFunction = (t: number) => number;

function cubicBezier(x1: number, y1: number, x2: number, y2: number): EasingFunction {
  // Newton-Raphson solve for t given x, then evaluate y — standard CSS cubic-bezier
  const ax = 3 * x1 - 3 * x2 + 1;
  const bx = 3 * x2 - 6 * x1;
  const cx = 3 * x1;
  const ay = 3 * y1 - 3 * y2 + 1;
  const by = 3 * y2 - 6 * y1;
  const cy = 3 * y1;

  const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sampleY = (t: number) => ((ay * t + by) * t + cy) * t;
  const sampleDerivX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;

  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) {
      const err = sampleX(t) - x;
      if (Math.abs(err) < 1e-6) break;
      const d = sampleDerivX(t);
      if (Math.abs(d) < 1e-6) break;
      t -= err / d;
    }
    return sampleY(Math.min(1, Math.max(0, t)));
  };
}

const linear: EasingFunction = (t) => t;
const quad: EasingFunction = (t) => t * t;
const cubic: EasingFunction = (t) => t * t * t;
const quart: EasingFunction = (t) => t * t * t * t;
const quint: EasingFunction = (t) => t * t * t * t * t;
const sin: EasingFunction = (t) => 1 - Math.cos((t * Math.PI) / 2);
const circle: EasingFunction = (t) => 1 - Math.sqrt(1 - t * t);
const exp: EasingFunction = (t) => (t === 0 ? 0 : Math.pow(2, 10 * (t - 1)));

const bounce: EasingFunction = (t) => {
  const n1 = 7.5625;
  const d1 = 2.75;
  if (t < 1 / d1) return n1 * t * t;
  if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
  if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
  return n1 * (t -= 2.625 / d1) * t + 0.984375;
};

function elastic(bounciness = 1): EasingFunction {
  const p = bounciness * Math.PI;
  return (t) =>
    1 - Math.pow(Math.cos((t * Math.PI) / 2), 3) * Math.cos(t * p);
}

function back(s = 1.70158): EasingFunction {
  return (t) => t * t * ((s + 1) * t - s);
}

function flip(e: EasingFunction): EasingFunction {
  return (t) => 1 - e(1 - t);
}

export const Easing = {
  linear,
  quad,
  cubic,
  quart,
  quint,
  sin,
  circle,
  exp,
  bounce,
  elastic,
  back,
  bezier: cubicBezier,
  in: (e: EasingFunction): EasingFunction => e,
  out: flip,
  inOut:
    (e: EasingFunction): EasingFunction =>
    (t) =>
      t < 0.5 ? e(t * 2) / 2 : 1 - e((1 - t) * 2) / 2,
  // Ready-made favorites
  outQuad: flip(quad),
  outCubic: flip(cubic),
  outQuart: flip(quart),
  outQuint: flip(quint),
  outExpo: flip(exp),
  outBounce: bounce,
  inOutCubic: ((t: number) =>
    t < 0.5 ? cubic(t * 2) / 2 : 1 - cubic((1 - t) * 2) / 2) as EasingFunction,
  /** The "Linear app" feel — fast start, soft landing. */
  outSmooth: cubicBezier(0.25, 1, 0.5, 1),
};
