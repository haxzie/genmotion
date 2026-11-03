/** GenMotion's own motion-graphics frames (template posters), shared by every shot. */
import claude from "../assets/frames/claude-mcp-launch.jpg";
import astra from "../assets/frames/dont-blink-gpt-6-astra.jpg";
import stars from "../assets/frames/github-star-count-announcement.jpg";
import google from "../assets/frames/google-generative-ai.jpg";
import instagram from "../assets/frames/instagram-chat-video.jpg";
import lovable from "../assets/frames/lovable-funding-announcement.jpg";
import messenger from "../assets/frames/messenger-chat-video.jpg";
import polls from "../assets/frames/polls-in-messages.jpg";
import prequel from "../assets/frames/prequel-launch.jpg";
import whatsapp from "../assets/frames/whatsapp-chat-video.jpg";

export interface FrameAsset {
  url: string;
  /** Short scene-style label shown in the UI. */
  label: string;
  portrait: boolean;
}

export const FRAMES = {
  astra: { url: astra, label: "01-astra.ts", portrait: false },
  prequel: { url: prequel, label: "02-prequel.ts", portrait: false },
  stars: { url: stars, label: "03-stars.ts", portrait: false },
  google: { url: google, label: "04-ideas.ts", portrait: false },
  claude: { url: claude, label: "05-brain.ts", portrait: false },
  lovable: { url: lovable, label: "06-funding.ts", portrait: false },
  whatsapp: { url: whatsapp, label: "07-chat.ts", portrait: true },
  messenger: { url: messenger, label: "08-messenger.ts", portrait: true },
  instagram: { url: instagram, label: "09-dm.ts", portrait: true },
  polls: { url: polls, label: "10-polls.ts", portrait: true },
} satisfies Record<string, FrameAsset>;

/** A 16:9 window into a 1920x3414 portrait frame, starting `top` of the way down. */
export function portraitCrop(top = 0.18) {
  return { x: 0, y: top, w: 1, h: 1080 / 3414 };
}
