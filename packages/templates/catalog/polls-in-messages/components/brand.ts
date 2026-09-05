// Shared design tokens for the "Polls in Messages" ad.
// Light / iOS-native palette on a white stage.

export const C = {
  stage: "#ffffff",
  ink: "#0b0b0d",
  inkSoft: "#6b6b70", // 5.2:1 on white — safe for secondary copy
  bubbleIn: "#e9e9eb",
  bubbleInText: "#0b0b0d",
  blue: "#0a7cff",
  blueDeep: "#0066e0",
  blueTint: "rgba(10,124,255,0.18)",
  neutralTint: "rgba(120,120,128,0.16)",
  field: "#f2f2f7",
  hairline: "rgba(0,0,0,0.13)",
  chrome: "rgba(250,250,251,0.96)",
  red: "#ff375f",
};

export const FONT =
  "Inter, 'SF Pro Text', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', system-ui, sans-serif";

// The chat is authored in a 780px-wide "screen" space and multiplied by S.
export const CHAT_W = 780;

// Vertical rhythm inside that space (design units).
export const M = {
  line: 46,
  font: 36,
  padY: 22,
  padX: 30,
  gap: 22,
  nameH: 40,
  avatar: 64,
  bubbleLeft: 100,
  chromeH: 286, // status bar (96) + nav header (190)
  composerH: 200,
};

export const oneLine = M.line + M.padY * 2; // 90
export const rowH = (lines: number, name: boolean) =>
  (name ? M.nameH : 0) + M.line * lines + M.padY * 2 + M.gap;
