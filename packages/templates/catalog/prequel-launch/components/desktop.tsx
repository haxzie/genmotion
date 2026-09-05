import { Img } from "@genmotion/motion";
import wallpaperSrc from "../assets/wp2218303.jpg";

/* Shared world geometry for the desktop scenes. Scene 2 pans across this world
   and parks on DOCK_CX; scene 3 opens at exactly that camera position, which is
   what makes the cut between them invisible. */
export const WORLD = 2;
export const WORLD_W = 1920 * WORLD; // 3840
export const WORLD_H = 1080 * WORLD; // 2160

/** World x of the Prequel dock slot — the point both desktop scenes centre on. */
export const DOCK_CX = 2620;
/** Normalised camera x that frames DOCK_CX dead centre. */
export const CAM_HANDOFF = DOCK_CX / WORLD_W;

/** Scene 3 exits by swelling and defocusing; scene 4 opens from these exact
    values and settles out of them. Shared so the two sides cannot drift. */
export const OUT_SCALE = 1.34;
export const OUT_BLUR = 38;

export { wallpaperSrc };

/** The desktop itself — flat on the subject's plane, so a pan reads as
    travelling across one real screen rather than sliding layers. */
export function DesktopPlane() {
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <Img
        src={wallpaperSrc}
        style={{ width: WORLD_W, height: WORLD_H, objectFit: "cover", display: "block" }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(12,8,16,0.10) 0%, rgba(12,8,16,0.00) 38%, rgba(12,8,16,0.18) 100%)",
        }}
      />
    </div>
  );
}

/** A blurred, world-registered copy of the wallpaper, for anything that needs to
    refract the desktop behind it (the dock tray, the recording bar). */
export function FrostedBackdrop({
  left,
  top,
  blur = 48,
}: {
  left: number;
  top: number;
  blur?: number;
}) {
  return (
    <Img
      src={wallpaperSrc}
      style={{
        position: "absolute",
        left: -left,
        top: -top,
        width: WORLD_W,
        height: WORLD_H,
        objectFit: "cover",
        display: "block",
        filter: `blur(${blur}px) saturate(1.7) brightness(1.06)`,
        transform: "scale(1.12)",
      }}
    />
  );
}
