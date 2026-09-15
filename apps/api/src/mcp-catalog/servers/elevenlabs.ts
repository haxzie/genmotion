import { defineMcpCatalogEntry } from "@genmotion/shared";
import { brand, favicon } from "../icons";

export default defineMcpCatalogEntry({
  id: "elevenlabs",
  name: "ElevenLabs",
  description: "Voiceovers, sound effects and music from text — pick a voice, narrate the script, drop the audio on the timeline.",
  category: "Voice & audio",
  iconUrl: brand("elevenlabs", "FFFFFF"),
  homepage: "https://elevenlabs.io/docs/eleven-agents/operate/hosted-mcp",
  transport: "http",
  url: "https://api.elevenlabs.io/v1/mcp",
  auth: { kind: "oauth" },
  tags: ["voiceover", "sfx", "music"],
});
