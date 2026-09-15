/**
 * Chat plugins — what the composer's `+` button offers, and what backs it.
 *
 * Two layers, kept apart on purpose:
 *
 * An **integration** is a provider we pay per call (ElevenLabs, Gemini). That
 * is what carries `premium`, so a second plugin backed by an integration the
 * org already pays for inherits the answer instead of restating it.
 *
 * A **chat plugin** is the menu entry. Most map to an integration; `local-file`
 * maps to nothing, because opening a file picker costs us nothing and so is
 * free on every plan.
 *
 * Pure and browser-safe like `plans.ts` beside it: the API's gate, the desktop
 * menu, the chip and the note prepended to the message all read this one file.
 */

export type IntegrationId = "elevenlabs" | "gemini";

export interface Integration {
  id: IntegrationId;
  name: string;
  /** Provider-backed and billed to us, so it needs a paid plan. */
  premium: boolean;
}

export const INTEGRATIONS: Record<IntegrationId, Integration> = {
  elevenlabs: { id: "elevenlabs", name: "ElevenLabs", premium: true },
  gemini: { id: "gemini", name: "Google Gemini", premium: true },
};

export type ChatPluginId = "voiceover" | "image" | "local-file";

/** A connected MCP server, as a chip: `mcp:<server id>`. */
export type McpChipId = `mcp:${string}`;

export interface ChatPlugin {
  id: ChatPluginId | McpChipId;
  /**
   * Absent on the built-in plugins. `"mcp"` marks a chip made from a connected
   * MCP server by `mcpServerChip` — same shape, so the menu, the chip and the
   * note prepended to the message treat both alike.
   */
  kind?: "mcp";
  /** For an `mcp` chip: the server's icon, when it has one. */
  iconUrl?: string;
  /** Menu row title, and the chip's text. */
  label: string;
  /** Menu row subtitle — what it does, in one line. */
  hint: string;
  /** Null when the plugin needs nothing of ours. */
  integration: IntegrationId | null;
  /**
   * The agent tool a chip steers the turn toward, unqualified by transport.
   * Null for plugins the client handles alone (`local-file` opens a picker).
   */
  tool: string | null;
  /** Replaces the composer placeholder while the chip is up. */
  placeholder: string;
  /**
   * The line prepended to the message when this chip is attached. A steer, not
   * a bypass: the agent still runs its own loop, so it can size a script to the
   * scene and place the result on the timeline.
   */
  directive: string;
  /**
   * Kept out of the `+` menu. The plugin still exists — its tool stays on the
   * agent and its route on the API — but the user is not offered it. Voiceover
   * sits here while its provider is being swapped: an agent that reaches for
   * it on its own gets a clear refusal to relay, whereas a menu row that
   * fails is a broken promise.
   */
  hidden?: boolean;
}

export const CHAT_PLUGINS: ChatPlugin[] = [
  {
    id: "voiceover",
    label: "Voiceover",
    hint: "Generate narration from a script",
    integration: "elevenlabs",
    hidden: true,
    tool: "generate_voiceover",
    placeholder: "Write the script to narrate…",
    directive:
      "Generate a voiceover for this request with the `generate_voiceover` tool, then place the audio it returns on the timeline.",
  },
  {
    id: "image",
    label: "Generate Image",
    hint: "Make an image from a description",
    integration: "gemini",
    tool: "generate_image",
    placeholder: "Describe the image to generate…",
    directive:
      "Generate the image for this request with the `generate_image` tool, then import the file it returns into the scene that needs it.",
  },
  {
    id: "local-file",
    label: "Local File",
    hint: "Attach an image, video, or audio file",
    integration: null,
    tool: null,
    placeholder: "",
    directive: "",
  },
];

/**
 * A chip for a connected MCP server.
 *
 * The directive is a steer, like a plugin's: it names the server's tools so the
 * agent reaches for them first rather than guessing at what the server could
 * have told it.
 */
export function mcpServerChip(server: {
  id: string;
  name: string;
  iconUrl?: string;
  tools: { name: string }[];
}): ChatPlugin {
  const count = server.tools.length;
  return {
    kind: "mcp",
    id: `mcp:${server.id}`,
    label: server.name,
    hint: `${count} tool${count === 1 ? "" : "s"}`,
    integration: null,
    tool: null,
    iconUrl: server.iconUrl,
    placeholder: `Ask something that uses ${server.name}…`,
    directive: `Use the "${server.name}" MCP server for this request — its tools are named \`mcp__${server.id}__*\`. Call them rather than guessing at what they would return.`,
  };
}

export function isMcpChipId(id: string): id is McpChipId {
  return id.startsWith("mcp:");
}

export function chatPlugin(id: ChatPluginId): ChatPlugin {
  const found = CHAT_PLUGINS.find((p) => p.id === id);
  if (!found) throw new Error(`Unknown chat plugin: ${id}`);
  return found;
}

/**
 * Whether using this plugin requires a paid plan.
 *
 * Reads through the integration rather than being a field on the plugin, so
 * "who pays for this" is answered once per provider.
 */
export function isPremiumPlugin(plugin: ChatPlugin): boolean {
  return plugin.integration !== null && INTEGRATIONS[plugin.integration].premium;
}
