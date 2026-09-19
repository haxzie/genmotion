// Strawberry launch video — tokens sampled from the reference render.
export const brand = {
  bg: "#fdfdfd",
  surface: "#ffffff",
  panel: "#f1efeb", // message boxes / skeleton panels
  skeleton: "#e9e8e4",
  skeletonSoft: "#f1f0ec",
  border: "rgba(0,0,0,0.06)",
  text: "#131926",
  muted: "#8b8f9a",
  linkedin: "#0067c8", // Send button + "Sent" flood
  linkBlue: "#0a6bc8", // typed blue phrases in the LinkedIn half
  orangeA: "#f4562f",
  orangeB: "#f9a83a",
  coral: "#f55b5a",
  peach: "#fdbe85",
  green: "#34a853",
  purple: "#6c3cf5",
  stepBlue: "#1c8ef5",
  stepSky: "#4fb3ff",
  ring: ["#fbccc1", "#fbaf9d", "#fb9f8d", "#f78f7b"],
  font: "Poppins, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  radius: 18,
  shadow: "0 30px 70px rgba(30,20,20,0.10), 0 4px 12px rgba(30,20,20,0.05)",
  cardShadow: "0 24px 60px rgba(30,20,20,0.12), 0 2px 8px rgba(30,20,20,0.06)",
};

// Orange gradient text — the accent treatment for the second half.
export const orangeText = {
  backgroundImage: `linear-gradient(90deg, ${brand.orangeA} 0%, ${brand.orangeB} 100%)`,
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  color: "transparent",
} as const;

export const type = {
  // headline lines in the reference sit at ~24px @720p → 36px, weight 600
  line: { fontSize: 40, fontWeight: 600, letterSpacing: "-0.005em", lineHeight: 1.25, color: brand.text, fontFamily: brand.font, margin: 0 } as const,
  lineLg: { fontSize: 48, fontWeight: 600, letterSpacing: "-0.01em", lineHeight: 1.25, color: brand.text, fontFamily: brand.font, margin: 0 } as const,
  ui: { fontSize: 28, fontWeight: 400, lineHeight: 1.35, color: brand.text, fontFamily: brand.font, margin: 0 } as const,
};
