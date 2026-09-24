import boss from "../assets/av-boss.jpg";
import priya from "../assets/av-priya.jpg";
import dev from "../assets/av-dev.jpg";
import karen from "../assets/av-karen.jpg";
import marco from "../assets/av-marco.jpg";
import sam from "../assets/av-sam.jpg";

/** Image URLs, keyed the way layers look them up. */
export const AVATARS: Record<string, string> = { boss, priya, dev, karen, marco, sam };

/** Each avatar's own background colour, used as the circle fill. */
export const AV_BG: Record<string, string> = {
  boss: "#a3d0ee",
  priya: "#9fdcaa",
  dev: "#f1b3c8",
  karen: "#f6cb95",
  marco: "#f3e07c",
  sam: "#cdbdf0",
};
