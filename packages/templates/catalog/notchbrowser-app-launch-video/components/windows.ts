/**
 * The app windows that pile onto the desktop. Each is painted ONCE into its
 * own cached canvas (shadow and all) and then just composited per frame, so
 * motion-blur sub-samples stay cheap.
 */
import type { Assets, G } from "./core";
import {
  appTile,
  avatar,
  bar,
  circle,
  fillRR,
  font,
  glyph,
  icon,
  line,
  measure,
  rr,
  strokeRR,
  text,
  trafficLights,
} from "./ui";

const SERIF = "'Tiempos Headline', Georgia, 'Times New Roman', serif";
const MONO = "'SF Mono', Menlo, Monaco, 'Courier New', monospace";

export interface WinSpec {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  dark: boolean;
  paint: (g: G, w: number, h: number, a: Assets) => void;
}

/* ------------------------------------------------------------------ Claude */

function paintClaude(g: G, w: number, h: number, a: Assets) {
  g.fillStyle = "#faf9f5";
  g.fillRect(0, 0, w, h);
  // sidebar
  g.fillStyle = "#f3f1ea";
  g.fillRect(0, 0, 240, h);
  line(g, 240, 0, 240, h, "#e6e3da");
  trafficLights(g, 22, 22);
  font(g, 26, 500);
  g.font = `500 26px ${SERIF}`;
  g.fillStyle = "#1f1e1d";
  g.textBaseline = "middle";
  g.textAlign = "left";
  g.fillText("Claude", 22, 70);
  circle(g, 36, 118, 14, "#c96442");
  glyph(g, "plus", 27, 109, 18, "#fff", 2.4);
  text(g, "New chat", 60, 118, 17, "#c96442", 500);
  text(g, "Chats", 22, 160, 17, "#3d3929");
  text(g, "Projects", 22, 194, 17, "#3d3929");
  text(g, "Artifacts", 22, 228, 17, "#3d3929");
  text(g, "Recents", 22, 280, 14, "#8a877d", 500);
  const rec = ["Notch launch copy", "Token budget for agents", "Refactor auth middleware", "Context window strategy", "Weekend trip ideas"];
  rec.forEach((r, i) => {
    if (i === 0) fillRR(g, 12, 298 + i * 36, 216, 32, 8, "#e8e5dc");
    text(g, r, 22, 314 + i * 36, 16, "#3d3929");
  });
  avatar(g, 36, h - 36, 16, "#5c5a52", "#3d3929", "G");
  text(g, "gov", 62, h - 36, 16, "#3d3929", 500);

  // main
  const cx = 240 + (w - 240) / 2;
  icon(g, a, "claude-icon", cx - 190, 170, 44);
  g.font = `400 40px ${SERIF}`;
  g.fillStyle = "#3d3929";
  g.textAlign = "left";
  g.fillText("Evening, gov", cx - 134, 194);
  // composer
  const bw = 580;
  const bx = cx - bw / 2;
  g.save();
  g.shadowColor = "rgba(0,0,0,0.06)";
  g.shadowBlur = 20;
  g.shadowOffsetY = 4;
  fillRR(g, bx, 250, bw, 130, 22, "#ffffff");
  g.restore();
  strokeRR(g, bx, 250, bw, 130, 22, "#e3e0d6");
  text(g, "How can I help you today?", bx + 24, 288, 19, "#8a877d");
  strokeRR(g, bx + 18, 330, 34, 34, 9, "#e3e0d6");
  glyph(g, "plus", bx + 25, 337, 20, "#6b685f", 1.8);
  text(g, "Opus 4.5", bx + bw - 120, 347, 16, "#3d3929", 500, "right");
  glyph(g, "chevDown", bx + bw - 117, 339, 16, "#6b685f", 1.8);
  fillRR(g, bx + bw - 58, 328, 40, 38, 10, "#c96442");
  glyph(g, "arrowUp", bx + bw - 49, 336, 22, "#fff", 2.2);
  const chips = ["Write", "Learn", "Code", "Life stuff", "Claude's choice"];
  let chx = cx - 250;
  chips.forEach((c) => {
    const cw = measure(g, c, 15, 500) + 36;
    strokeRR(g, chx, 402, cw, 34, 10, "#e3e0d6");
    text(g, c, chx + 18, 419, 15, "#3d3929", 500);
    chx += cw + 10;
  });
}

/* ----------------------------------------------------------------- ChatGPT */

function paintChatGPT(g: G, w: number, h: number, a: Assets) {
  g.fillStyle = "#ffffff";
  g.fillRect(0, 0, w, h);
  g.fillStyle = "#f9f9f9";
  g.fillRect(0, 0, 250, h);
  line(g, 250, 0, 250, h, "#ececec");
  trafficLights(g, 22, 22);
  icon(g, a, "openai-icon", 20, 52, 28);
  const items: [string, string][] = [
    ["edit", "New chat"],
    ["search", "Search chats"],
    ["book", "Library"],
  ];
  items.forEach(([k, s], i) => {
    glyph(g, k, 20, 104 + i * 38, 20, "#0d0d0d", 1.8);
    text(g, s, 52, 114 + i * 38, 16, "#0d0d0d");
  });
  text(g, "GPTs", 20, 240, 16, "#0d0d0d");
  text(g, "Sora", 20, 274, 16, "#0d0d0d");
  text(g, "Chats", 20, 322, 14, "#8f8f8f", 500);
  const chats = ["Cheapest model for evals", "Summarize this PDF", "Fix regex for URLs", "Prompt for release notes", "Which GPU to rent?"];
  chats.forEach((c, i) => {
    if (i === 1) fillRR(g, 10, 340 + i * 36, 230, 32, 8, "#ececec");
    text(g, c, 20, 356 + i * 36, 15.5, "#0d0d0d");
  });

  text(g, "ChatGPT 5", 276, 30, 19, "#0d0d0d", 500);
  glyph(g, "chevDown", 378, 22, 16, "#5d5d5d", 1.8);
  avatar(g, w - 34, 30, 15, "#10a37f", "#0b7a5f", "G");

  const cx = 250 + (w - 250) / 2;
  text(g, "What's on your mind today?", cx, 210, 32, "#0d0d0d", 400, "center");
  const bw = 520;
  const bx = cx - bw / 2;
  g.save();
  g.shadowColor = "rgba(0,0,0,0.10)";
  g.shadowBlur = 18;
  g.shadowOffsetY = 3;
  fillRR(g, bx, 262, bw, 60, 30, "#ffffff");
  g.restore();
  strokeRR(g, bx, 262, bw, 60, 30, "#e6e6e6");
  glyph(g, "plus", bx + 18, 280, 24, "#0d0d0d", 1.8);
  text(g, "Ask anything", bx + 54, 292, 18, "#8f8f8f");
  glyph(g, "mic", bx + bw - 94, 281, 22, "#0d0d0d", 1.8);
  circle(g, bx + bw - 32, 292, 19, "#0d0d0d");
  for (let i = 0; i < 4; i++) {
    const hh = [8, 14, 10, 6][i]!;
    fillRR(g, bx + bw - 41 + i * 5.4, 292 - hh / 2, 2.8, hh, 1.4, "#fff");
  }
}

/* -------------------------------------------------------------------- Grok */

function paintGrok(g: G, w: number, h: number, a: Assets) {
  g.fillStyle = "#0a0a0a";
  g.fillRect(0, 0, w, h);
  trafficLights(g, 22, 22);
  g.fillStyle = "#101010";
  g.fillRect(0, 44, 64, h - 44);
  ["search", "edit", "book", "user"].forEach((k, i) => glyph(g, k, 21, 80 + i * 50, 22, "#9a9a9a", 1.7));
  text(g, "Grok 4", w - 60, 28, 16, "#cfcfcf", 500, "right");
  glyph(g, "chevDown", w - 56, 20, 16, "#9a9a9a", 1.8);
  const cx = 32 + w / 2;
  g.save();
  g.filter = "invert(1)";
  icon(g, a, "grok-icon", cx - 118, 150, 58);
  g.restore();
  text(g, "Grok", cx - 44, 181, 58, "#f5f5f5", 600, "left", -1);
  const bw = 520;
  const bx = cx - bw / 2;
  fillRR(g, bx, 250, bw, 104, 26, "#1b1b1b");
  strokeRR(g, bx, 250, bw, 104, 26, "#2c2c2c");
  text(g, "What do you want to know?", bx + 24, 282, 18, "#8a8a8a");
  strokeRR(g, bx + 16, 312, 32, 30, 15, "#3a3a3a");
  glyph(g, "plus", bx + 22, 317, 20, "#bdbdbd", 1.6);
  circle(g, bx + bw - 34, 327, 17, "#f2f2f2");
  glyph(g, "arrowUp", bx + bw - 44, 317, 20, "#0a0a0a", 2.2);
  const chips = ["DeepSearch", "Create images", "Latest news"];
  let chx = cx - 230;
  chips.forEach((c) => {
    const cw = measure(g, c, 15, 500) + 36;
    strokeRR(g, chx, 376, cw, 36, 18, "#2c2c2c");
    text(g, c, chx + 18, 394, 15, "#d6d6d6", 500);
    chx += cw + 10;
  });
}

/* ------------------------------------------------------------------ Linear */

function paintLinear(g: G, w: number, h: number, a: Assets) {
  g.fillStyle = "#0f0f11";
  g.fillRect(0, 0, w, h);
  g.fillStyle = "#090909";
  g.fillRect(0, 0, 220, h);
  trafficLights(g, 22, 22);
  icon(g, a, "linear-icon", 18, 52, 22);
  text(g, "Acme", 48, 63, 16, "#e6e6e8", 600);
  const nav = ["Inbox", "My issues"];
  nav.forEach((s, i) => text(g, s, 20, 108 + i * 32, 15, "#cfcfd3"));
  text(g, "Workspace", 20, 180, 13, "#7c7c85", 500);
  ["Projects", "Views", "Initiatives"].forEach((s, i) => text(g, s, 20, 210 + i * 32, 15, "#cfcfd3"));
  text(g, "Your teams", 20, 320, 13, "#7c7c85", 500);
  fillRR(g, 14, 336, 20, 20, 5, "#5e6ad2");
  text(g, "Engineering", 42, 346, 15, "#e6e6e8", 500);
  fillRR(g, 10, 364, 200, 30, 6, "#1c1c21");
  text(g, "Issues", 42, 379, 15, "#e6e6e8");
  text(g, "Cycles", 42, 411, 15, "#cfcfd3");
  text(g, "Projects", 42, 443, 15, "#cfcfd3");

  line(g, 220, 0, 220, h, "#1e1e22");
  text(g, "Engineering", 244, 28, 15, "#8e8e96");
  glyph(g, "chevR", 336, 20, 16, "#8e8e96");
  text(g, "Active issues", 356, 28, 15, "#e6e6e8", 500);
  line(g, 220, 54, w, 54, "#1e1e22");

  const groups: { name: string; color: string; rows: [string, string, string][] }[] = [
    {
      name: "In Progress",
      color: "#f2c94c",
      rows: [
        ["ENG-2193", "Evaluate cheaper model for summaries", "AI"],
        ["ENG-2188", "Cap context window at 200k tokens", "Infra"],
        ["ENG-2171", "Agent retries flood the queue", "Bug"],
        ["ENG-2166", "Prompt cache hit rate below 40%", "AI"],
      ],
    },
    {
      name: "Todo",
      color: "#8e8e96",
      rows: [
        ["ENG-2201", "Pick default model per workspace", "AI"],
        ["ENG-2199", "Token spend dashboard", "Feature"],
        ["ENG-2196", "Review agent-generated PRs", "DX"],
      ],
    },
  ];
  let y = 70;
  groups.forEach((gr) => {
    fillRR(g, 228, y, w - 240, 36, 6, "#16161a");
    g.beginPath();
    g.arc(252, y + 18, 7, 0, Math.PI * 2);
    g.strokeStyle = gr.color;
    g.lineWidth = 2;
    g.stroke();
    if (gr.name === "In Progress") {
      g.beginPath();
      g.moveTo(252, y + 18);
      g.arc(252, y + 18, 4, -Math.PI / 2, Math.PI / 2);
      g.fillStyle = gr.color;
      g.fill();
    }
    text(g, gr.name, 270, y + 18, 15, "#e6e6e8", 500);
    text(g, String(gr.rows.length), 270 + measure(g, gr.name, 15, 500) + 10, y + 18, 15, "#7c7c85");
    y += 42;
    gr.rows.forEach(([id, t, lab], i) => {
      text(g, id, 248, y + 18, 14.5, "#7c7c85");
      g.beginPath();
      g.arc(344, y + 18, 7, 0, Math.PI * 2);
      g.strokeStyle = gr.color;
      g.lineWidth = 2;
      g.stroke();
      text(g, t, 364, y + 18, 15.5, "#e6e6e8");
      const lw = measure(g, lab, 13, 500) + 26;
      strokeRR(g, w - 150 - lw, y + 6, lw, 24, 12, "#2c2c33");
      circle(g, w - 150 - lw + 12, y + 18, 4, ["#bb87fc", "#4cb782", "#eb5757", "#5e6ad2"][i % 4]!);
      text(g, lab, w - 150 - lw + 20, y + 18, 13, "#cfcfd3", 500);
      avatar(g, w - 110, y + 18, 11, ["#f2994a", "#5e6ad2", "#4cb782"][i % 3]!, "#333", "");
      text(g, ["Sep 22", "Sep 23", "Sep 24"][i % 3]!, w - 24, y + 18, 13.5, "#7c7c85", 400, "right");
      line(g, 228, y + 36, w - 12, y + 36, "#18181c");
      y += 38;
    });
    y += 8;
  });
}

/* ------------------------------------------------------------------ Chrome */

function paintChrome(g: G, w: number, h: number, a: Assets) {
  g.fillStyle = "#dfe3e8";
  g.fillRect(0, 0, w, 88);
  trafficLights(g, 22, 22);
  const tabs: [string, string][] = [
    ["claude-icon", "Models overview - Claude Docs"],
    ["openai-icon", "Pricing | OpenAI API"],
    ["github-icon", "Pull requests · acme/app"],
  ];
  tabs.forEach(([ic, t], i) => {
    const tx = 90 + i * 250;
    if (i === 0) fillRR(g, tx, 8, 246, 38, [10, 10, 0, 0] as unknown as number, "#ffffff");
    else line(g, tx + 247, 18, tx + 247, 36, "#aeb4bb");
    icon(g, a, ic, tx + 14, 18, 18);
    g.save();
    rr(g, tx + 40, 10, 170, 34, 0);
    g.clip();
    text(g, t, tx + 40, 28, 14.5, "#1f1f1f");
    g.restore();
    glyph(g, "x", tx + 218, 20, 16, "#5f6368", 1.8);
  });
  glyph(g, "plus", 90 + 3 * 250 + 8, 18, 18, "#5f6368", 1.8);
  g.fillStyle = "#ffffff";
  g.fillRect(0, 46, w, 42);
  glyph(g, "chevL", 14, 55, 22, "#5f6368", 1.8);
  glyph(g, "chevR", 46, 55, 22, "#5f6368", 1.8);
  glyph(g, "reload", 80, 57, 18, "#5f6368", 1.8);
  fillRR(g, 112, 52, w - 170, 30, 15, "#eef1f4");
  text(g, "docs.claude.com/en/docs/about-claude/models/overview", 138, 67, 14.5, "#1f1f1f");
  avatar(g, w - 30, 67, 12, "#8ab4f8", "#1a73e8", "");
  line(g, 0, 88, w, 88, "#e2e2e2");
  // page
  g.fillStyle = "#ffffff";
  g.fillRect(0, 89, w, h - 89);
  g.fillStyle = "#faf9f5";
  g.fillRect(0, 89, 230, h - 89);
  icon(g, a, "claude-icon", 22, 110, 22);
  text(g, "Claude Docs", 52, 121, 16, "#141413", 600);
  ["Get started", "Models overview", "Choosing a model", "Pricing", "Context windows", "Prompt caching", "Token counting", "Extended thinking"].forEach((s, i) => {
    if (i === 1) fillRR(g, 12, 150 + i * 34, 206, 30, 7, "#f0eee6");
    text(g, s, 24, 165 + i * 34, 14.5, i === 1 ? "#141413" : "#5e5d59", i === 1 ? 500 : 400);
  });
  const px = 270;
  text(g, "Models overview", px, 140, 34, "#141413", 600, "left", -0.6);
  bar(g, px, 186, 560, 10, "#e7e5de");
  bar(g, px, 208, 480, 10, "#e7e5de");
  // table
  const cols = ["Model", "Context window", "Input / MTok", "Output / MTok"];
  const cx = [px, px + 190, px + 360, px + 510];
  fillRR(g, px - 10, 240, w - px - 20, 40, 8, "#f5f4ef");
  cols.forEach((c, i) => text(g, c, cx[i]!, 260, 14, "#5e5d59", 600));
  const rows = [
    ["Claude Opus 4.5", "200K", "$5", "$25"],
    ["Claude Sonnet 4.5", "1M", "$3", "$15"],
    ["Claude Haiku 4.5", "200K", "$1", "$5"],
  ];
  rows.forEach((r, j) => {
    r.forEach((c, i) => text(g, c, cx[i]!, 306 + j * 46, 15, "#141413", i === 0 ? 500 : 400));
    line(g, px - 10, 329 + j * 46, w - 30, 329 + j * 46, "#ecebe6");
  });
  bar(g, px, 482, 520, 10, "#e7e5de");
  bar(g, px, 504, 440, 10, "#e7e5de");
  bar(g, px, 526, 500, 10, "#e7e5de");
}

/* ----------------------------------------------------------------- Spotify */

function paintSpotify(g: G, w: number, h: number, a: Assets) {
  g.fillStyle = "#000000";
  g.fillRect(0, 0, w, h);
  trafficLights(g, 22, 22);
  icon(g, a, "spotify-icon", w / 2 - 170, 12, 26);
  fillRR(g, w / 2 - 130, 8, 300, 34, 17, "#1f1f1f");
  glyph(g, "search", w / 2 - 116, 16, 18, "#b3b3b3", 1.8);
  text(g, "What do you want to play?", w / 2 - 88, 25, 14, "#b3b3b3");
  // library
  fillRR(g, 8, 50, 220, h - 138, 8, "#121212");
  text(g, "Your Library", 24, 76, 15, "#ffffff", 600);
  const lib: [string, string, string][] = [
    ["Liked Songs", "#4b2fd6", "#9ad0c3"],
    ["deep focus", "#1d6b52", "#0c2c22"],
    ["lofi beats", "#c9724a", "#5b2a1c"],
    ["Coding Mode", "#2d46b9", "#0c1a4f"],
    ["Brain Food", "#b02e5b", "#3a0f20"],
  ];
  lib.forEach(([n, c1, c2], i) => {
    const y = 102 + i * 58;
    const gr = g.createLinearGradient(20, y, 66, y + 46);
    gr.addColorStop(0, c1);
    gr.addColorStop(1, c2);
    fillRR(g, 20, y, 46, 46, 5, gr);
    text(g, n, 78, y + 15, 14.5, i === 1 ? "#1ed760" : "#ffffff", 500);
    text(g, "Playlist • Spotify", 78, y + 34, 12.5, "#b3b3b3");
  });
  // main
  const mx = 236;
  const mw = w - mx - 8;
  const gr = g.createLinearGradient(0, 50, 0, 380);
  gr.addColorStop(0, "#1f6f55");
  gr.addColorStop(1, "#121212");
  fillRR(g, mx, 50, mw, h - 138, 8, gr);
  const cg = g.createLinearGradient(mx + 24, 80, mx + 184, 240);
  cg.addColorStop(0, "#9bd9c1");
  cg.addColorStop(1, "#1d6b52");
  g.save();
  g.shadowColor = "rgba(0,0,0,0.5)";
  g.shadowBlur = 30;
  fillRR(g, mx + 24, 80, 160, 160, 4, cg);
  g.restore();
  text(g, "deep", mx + 60, 130, 30, "#0b2e22", 700);
  text(g, "focus", mx + 60, 162, 30, "#0b2e22", 700);
  text(g, "Playlist", mx + 206, 110, 13, "#ffffff", 500);
  text(g, "deep focus", mx + 204, 170, 60, "#ffffff", 800, "left", -2);
  text(g, "Spotify • 5,210,448 saves, about 9 hr", mx + 206, 222, 13.5, "#e0e0e0");
  circle(g, mx + 54, 290, 26, "#1ed760");
  glyph(g, "play", mx + 43, 279, 22, "#000", 1);
  const tracks: [string, string, string][] = [
    ["Weightless", "Marconi Union", "8:09"],
    ["Clair de Lune", "Claude Debussy", "5:02"],
    ["Nuvole Bianche", "Ludovico Einaudi", "5:57"],
    ["Experience", "Ludovico Einaudi", "5:15"],
  ];
  tracks.forEach(([t, ar, d], i) => {
    const y = 338 + i * 40;
    text(g, String(i + 1), mx + 30, y, 14, "#b3b3b3", 400, "center");
    text(g, t, mx + 56, y - 8, 14.5, i === 0 ? "#1ed760" : "#ffffff", 500);
    text(g, ar, mx + 56, y + 11, 12.5, "#b3b3b3");
    text(g, d, mx + mw - 24, y, 13.5, "#b3b3b3", 400, "right");
  });
  // player bar
  const py = h - 80;
  const pc = g.createLinearGradient(16, py + 12, 66, py + 62);
  pc.addColorStop(0, "#9bd9c1");
  pc.addColorStop(1, "#1d6b52");
  fillRR(g, 16, py + 14, 52, 52, 4, pc);
  text(g, "Weightless", 80, py + 30, 14.5, "#ffffff", 500);
  text(g, "Marconi Union", 80, py + 50, 12.5, "#b3b3b3");
  const cx = w / 2 + 40;
  glyph(g, "skipB", cx - 62, py + 18, 18, "#b3b3b3");
  circle(g, cx, py + 27, 17, "#ffffff");
  glyph(g, "pause", cx - 8, py + 19, 16, "#000");
  glyph(g, "skipF", cx + 44, py + 18, 18, "#b3b3b3");
  fillRR(g, cx - 180, py + 58, 360, 4, 2, "#4d4d4d");
  fillRR(g, cx - 180, py + 58, 130, 4, 2, "#ffffff");
  text(g, "2:57", cx - 192, py + 60, 11.5, "#b3b3b3", 400, "right");
  text(g, "8:09", cx + 192, py + 60, 11.5, "#b3b3b3");
}

/* ------------------------------------------------------------------- Slack */

function paintSlack(g: G, w: number, h: number, a: Assets) {
  g.fillStyle = "#350d36";
  g.fillRect(0, 0, w, h);
  trafficLights(g, 22, 22);
  fillRR(g, w / 2 - 170, 9, 340, 30, 7, "#5a345b");
  glyph(g, "search", w / 2 - 158, 16, 16, "#e8dde8", 1.8);
  text(g, "Search Acme", w / 2 - 134, 24, 14, "#e8dde8");
  // rail
  fillRR(g, 12, 56, 38, 38, 9, "#ffffff");
  icon(g, a, "slack-icon", 19, 63, 24);
  // sidebar
  g.fillStyle = "#3f0e40";
  g.fillRect(62, 48, 220, h - 48);
  text(g, "Acme", 78, 76, 19, "#ffffff", 700);
  ["Threads", "Huddles", "Drafts & sent"].forEach((s, i) => text(g, s, 80, 116 + i * 30, 15, "#d1c3d1"));
  text(g, "Channels", 80, 222, 15, "#d1c3d1", 500);
  const chans = ["general", "ai-tools", "launches", "model-evals", "random"];
  chans.forEach((c, i) => {
    const y = 254 + i * 30;
    if (i === 1) fillRR(g, 70, y - 14, 204, 28, 6, "#1164a3");
    glyph(g, "hash", 80, y - 8, 16, i === 1 ? "#ffffff" : "#d1c3d1", 1.6);
    text(g, c, 104, y, 15, i === 1 ? "#ffffff" : i === 3 ? "#ffffff" : "#d1c3d1", i === 3 ? 700 : 400);
  });
  text(g, "Direct messages", 80, 420, 15, "#d1c3d1", 500);
  [["Maya Chen", "#e8912d"], ["Dev Patel", "#2eb67d"], ["Sam Ortiz", "#36c5f0"]].forEach(([n, c], i) => {
    fillRR(g, 80, 440 + i * 30, 20, 20, 5, c!);
    text(g, n!, 110, 450 + i * 30, 15, "#d1c3d1");
  });
  // messages
  const mx = 282;
  fillRR(g, mx, 48, w - mx - 6, h - 54, [10, 0, 0, 0] as unknown as number, "#ffffff");
  text(g, "# ai-tools", mx + 22, 80, 18, "#1d1c1d", 800);
  line(g, mx, 106, w, 106, "#e8e8e8");
  const msgs: [string, string, string, string[]][] = [
    ["Maya Chen", "#e8912d", "10:42 AM", ["burned 2M tokens before lunch.", "which model are we supposed to use for evals?"]],
    ["Dev Patel", "#2eb67d", "10:44 AM", ["context window keeps filling up on the monorepo", "going to try splitting it into smaller tasks"]],
    ["Sam Ortiz", "#36c5f0", "10:51 AM", ["wait which tab was the claude chat in", "i have 40 of them open"]],
  ];
  let y = 130;
  msgs.forEach(([n, c, t, ls]) => {
    fillRR(g, mx + 20, y, 38, 38, 8, c);
    text(g, n.split(" ")[0]![0]!, mx + 39, y + 20, 18, "#fff", 700, "center");
    text(g, n, mx + 72, y + 9, 15.5, "#1d1c1d", 800);
    text(g, t, mx + 80 + measure(g, n, 15.5, 800), y + 10, 12.5, "#616061");
    ls.forEach((l, i) => text(g, l, mx + 72, y + 34 + i * 24, 15.5, "#1d1c1d"));
    y += 50 + ls.length * 24;
  });
  strokeRR(g, mx + 20, h - 86, w - mx - 46, 70, 10, "#bbbbbb");
  text(g, "Message #ai-tools", mx + 36, h - 62, 15, "#868686");
}

/* ------------------------------------------------------------- Claude Code */

function paintClaudeCode(g: G, w: number, h: number, a: Assets) {
  g.fillStyle = "#1a1a1a";
  g.fillRect(0, 0, w, h);
  g.fillStyle = "#2a2a2a";
  g.fillRect(0, 0, w, 40);
  line(g, 0, 40, w, 40, "#111");
  trafficLights(g, 22, 20);
  icon(g, a, "terminal", w / 2 - 128, 11, 18);
  text(g, "gov — claude — 118×34", w / 2 - 100, 21, 14, "#b8b8b8", 500);
  const mono = (s: string, x: number, y: number, c: string, size = 15.5, weight = 400) => {
    g.font = `${weight} ${size}px ${MONO}`;
    g.fillStyle = c;
    g.textAlign = "left";
    g.textBaseline = "middle";
    g.fillText(s, x, y);
  };
  strokeRR(g, 20, 58, 470, 96, 8, "#d97757", 1.5);
  mono("✻", 38, 82, "#d97757", 17);
  mono("Welcome to Claude Code!", 62, 82, "#ffffff", 15.5, 700);
  mono("/help for help, /status for your setup", 62, 108, "#9a9a9a", 14);
  mono("cwd: ~/code/notch-browser", 62, 132, "#9a9a9a", 14);
  let y = 184;
  const L = 25;
  mono("> fix the flaky test in tab-restore.spec.ts", 20, y, "#e6e6e6");
  y += L * 1.6;
  circle(g, 27, y, 4.5, "#4ec07e");
  mono("Read(src/tabs/restore.ts)", 42, y, "#ffffff", 15.5, 700);
  y += L;
  mono("  ⎿  Read 214 lines", 20, y, "#9a9a9a");
  y += L * 1.4;
  circle(g, 27, y, 4.5, "#4ec07e");
  mono("Update(src/tabs/restore.ts)", 42, y, "#ffffff", 15.5, 700);
  y += L;
  mono("  ⎿  Updated with 6 additions and 2 removals", 20, y, "#9a9a9a");
  y += L;
  g.fillStyle = "#3d1f1f";
  g.fillRect(60, y - 11, w - 90, 22);
  mono("  88 -   await sleep(50);", 60, y, "#ff8f8f", 14.5);
  y += 22;
  g.fillStyle = "#1c3622";
  g.fillRect(60, y - 11, w - 90, 22);
  mono("  88 +   await tabs.whenRestored();", 60, y, "#8fe0a4", 14.5);
  y += L * 1.5;
  mono("✻", 20, y, "#d97757", 17);
  mono("Thinking… (12s · ↓ 3.1k tokens · esc to interrupt)", 44, y, "#d97757");
  strokeRR(g, 16, h - 76, w - 32, 46, 8, "#5a5a5a", 1.2);
  mono(">", 32, h - 53, "#d0d0d0");
  g.fillStyle = "#d0d0d0";
  g.fillRect(52, h - 63, 10, 20);
  mono("? for shortcuts", 20, h - 16, "#7a7a7a", 12.5);
}

/* --------------------------------------------------------- specs and cache */

/** Arrival order = stacking order (later lands on top). */
export const WINDOWS: WinSpec[] = [
  { id: "win-claude", x: 150, y: 110, w: 900, h: 560, dark: false, paint: paintClaude },
  { id: "win-chatgpt", x: 900, y: 80, w: 860, h: 540, dark: false, paint: paintChatGPT },
  { id: "win-grok", x: 90, y: 420, w: 760, h: 500, dark: true, paint: paintGrok },
  { id: "win-linear", x: 1010, y: 400, w: 860, h: 530, dark: true, paint: paintLinear },
  { id: "win-chrome", x: 470, y: 170, w: 960, h: 600, dark: false, paint: paintChrome },
  { id: "win-spotify", x: 170, y: 300, w: 820, h: 560, dark: true, paint: paintSpotify },
  { id: "win-slack", x: 1000, y: 200, w: 820, h: 580, dark: false, paint: paintSlack },
  { id: "win-claude-code", x: 600, y: 380, w: 780, h: 520, dark: true, paint: paintClaudeCode },
];

export const WIN_PAD = 70;
const SCALE = 1.5;
const cache = new Map<string, { v: number; c: OffscreenCanvas }>();

export function windowCanvas(spec: WinSpec, a: Assets): OffscreenCanvas {
  const hit = cache.get(spec.id);
  if (hit && hit.v === a.version) return hit.c;
  const c = hit?.c ?? new OffscreenCanvas(Math.ceil((spec.w + WIN_PAD * 2) * SCALE), Math.ceil((spec.h + WIN_PAD * 2) * SCALE));
  const g = c.getContext("2d") as G;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, c.width, c.height);
  g.setTransform(SCALE, 0, 0, SCALE, WIN_PAD * SCALE, WIN_PAD * SCALE);
  const R = 14;
  // shadow
  g.save();
  g.shadowColor = "rgba(0,0,0,0.45)";
  g.shadowBlur = 50;
  g.shadowOffsetY = 22;
  fillRR(g, 0, 0, spec.w, spec.h, R, "#000");
  g.restore();
  g.save();
  rr(g, 0, 0, spec.w, spec.h, R);
  g.clip();
  spec.paint(g, spec.w, spec.h, a);
  g.restore();
  strokeRR(g, 0.5, 0.5, spec.w - 1, spec.h - 1, R, spec.dark ? "rgba(255,255,255,0.16)" : "rgba(0,0,0,0.22)", 1);
  if (spec.dark) strokeRR(g, -0.5, -0.5, spec.w + 1, spec.h + 1, R + 1, "rgba(0,0,0,0.6)", 1);
  cache.set(spec.id, { v: a.version, c });
  return c;
}

export { appTile };
