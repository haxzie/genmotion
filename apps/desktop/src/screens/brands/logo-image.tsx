import { useEffect, useState } from "react";
import { cx } from "@/components/ui";

/**
 * Showing somebody else's logo.
 *
 * A mark taken off a page header is drawn for that page's background, and we
 * do not know what that was: Stripe's is `#031323` and disappears on anything
 * dark, Linear's is near-white and disappears on anything light. This app is
 * dark, so a logo on a plain surface is invisible exactly half the time — and
 * it was, in the detail panel, the cards and the composer's picker.
 *
 * So the mark is measured. It is drawn to a small offscreen canvas and its
 * average brightness read, weighted by alpha so the transparent half of a
 * square PNG does not count as black. A light mark gets a dark ground and the
 * other way round.
 *
 * Remote images can taint the canvas and make that read throw, which is why
 * the hook starts on the safe answer rather than waiting: most marks are dark,
 * so a light ground is the better guess while nothing is known.
 */

/** Big enough to average fairly, small enough to be free. */
const PROBE = 32;

export function useMarkIsLight(src: string | null): boolean {
  const [light, setLight] = useState(false);

  useEffect(() => {
    if (!src) return;
    let live = true;
    const image = new Image();
    // Gives a CDN that sends CORS headers a chance; without them the read
    // below throws and the fallback stands.
    image.crossOrigin = "anonymous";
    image.onload = () => {
      if (!live) return;
      try {
        const canvas = document.createElement("canvas");
        canvas.width = PROBE;
        canvas.height = PROBE;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return;
        ctx.drawImage(image, 0, 0, PROBE, PROBE);
        const { data } = ctx.getImageData(0, 0, PROBE, PROBE);
        let sum = 0;
        let weight = 0;
        for (let i = 0; i < data.length; i += 4) {
          const alpha = data[i + 3]! / 255;
          if (alpha < 0.05) continue;
          sum += (0.299 * data[i]! + 0.587 * data[i + 1]! + 0.114 * data[i + 2]!) * alpha;
          weight += alpha;
        }
        // Nothing opaque to judge: leave the fallback alone.
        if (weight > 0) setLight(sum / weight / 255 > 0.55);
      } catch {
        // Tainted canvas. The fallback is already the likelier answer.
      }
    };
    image.src = src;
    return () => {
      live = false;
    };
  }, [src]);

  return light;
}

export function LogoPlate({ src }: { src: string | null }) {
  const light = useMarkIsLight(src);
  if (!src) return null;

  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-8">
      <div
        className={
          // Frosted rather than solid: the pattern stays visible through it,
          // which is the point of showing them together.
          light
            ? "flex items-center justify-center rounded-2xl border border-white/10 bg-black/45 px-8 py-6 shadow-[0_8px_40px_rgba(0,0,0,0.35)] backdrop-blur-md"
            : "flex items-center justify-center rounded-2xl border border-black/5 bg-white/80 px-8 py-6 shadow-[0_8px_40px_rgba(0,0,0,0.25)] backdrop-blur-md"
        }
      >
        <img src={src} alt="" className="max-h-16 max-w-48 object-contain" />
      </div>
    </div>
  );
}

/**
 * A logo on a ground it can actually be seen against.
 *
 * Everywhere a brand's mark is shown small: the file grid, the logo rows, the
 * cards, the composer's picker.
 */
export function LogoTile({
  src,
  className,
  alt = "",
}: {
  src: string;
  className?: string;
  alt?: string;
}) {
  const light = useMarkIsLight(src);
  return (
    <span
      className={cx(
        "flex items-center justify-center overflow-hidden rounded-md border p-1",
        // Not the app's own surface: that is what made a near-black mark
        // invisible. The ground is chosen for the mark rather than the panel.
        light ? "border-white/10 bg-black/60" : "border-black/10 bg-white",
        className,
      )}
    >
      <img src={src} alt={alt} className="max-h-full max-w-full object-contain" />
    </span>
  );
}
