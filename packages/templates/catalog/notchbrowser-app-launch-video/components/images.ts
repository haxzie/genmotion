/** Every image the film uses, keyed by name. Loaded once through ctx.manager. */
import wallpaper from "../assets/wallpaper.jpg";
import dock from "../assets/dock.jpg";
import i_1password from "../assets/icons/1password.svg";
import i_chrome from "../assets/icons/chrome.svg";
import i_claude_icon from "../assets/icons/claude-icon.svg";
import i_discord_icon from "../assets/icons/discord-icon.svg";
import i_docker_icon from "../assets/icons/docker-icon.svg";
import i_figma from "../assets/icons/figma.svg";
import i_gemini from "../assets/icons/gemini.svg";
import i_git_icon from "../assets/icons/git-icon.svg";
import i_github_icon from "../assets/icons/github-icon.svg";
import i_google_drive from "../assets/icons/google-drive.svg";
import i_google_gmail from "../assets/icons/google-gmail.svg";
import i_grok_icon from "../assets/icons/grok-icon.svg";
import i_hugging_face_icon from "../assets/icons/hugging-face-icon.svg";
import i_linear_icon from "../assets/icons/linear-icon.svg";
import i_loom_icon from "../assets/icons/loom-icon.svg";
import i_notion_icon from "../assets/icons/notion-icon.svg";
import i_obsidian_icon from "../assets/icons/obsidian-icon.svg";
import i_openai_icon from "../assets/icons/openai-icon.svg";
import i_perplexity_icon from "../assets/icons/perplexity-icon.svg";
import i_python from "../assets/icons/python.svg";
import i_reddit_icon from "../assets/icons/reddit-icon.svg";
import i_replit_icon from "../assets/icons/replit-icon.svg";
import i_sentry_icon from "../assets/icons/sentry-icon.svg";
import i_slack_icon from "../assets/icons/slack-icon.svg";
import i_spotify_icon from "../assets/icons/spotify-icon.svg";
import i_terminal from "../assets/icons/terminal.svg";
import i_vercel_icon from "../assets/icons/vercel-icon.svg";
import i_x from "../assets/icons/x.svg";
import i_zapier_icon from "../assets/icons/zapier-icon.svg";

export const IMAGE_URLS: Record<string, string> = {
  wallpaper,
  dock,
  "1password": i_1password,
  "chrome": i_chrome,
  "claude-icon": i_claude_icon,
  "discord-icon": i_discord_icon,
  "docker-icon": i_docker_icon,
  "figma": i_figma,
  "gemini": i_gemini,
  "git-icon": i_git_icon,
  "github-icon": i_github_icon,
  "google-drive": i_google_drive,
  "google-gmail": i_google_gmail,
  "grok-icon": i_grok_icon,
  "hugging-face-icon": i_hugging_face_icon,
  "linear-icon": i_linear_icon,
  "loom-icon": i_loom_icon,
  "notion-icon": i_notion_icon,
  "obsidian-icon": i_obsidian_icon,
  "openai-icon": i_openai_icon,
  "perplexity-icon": i_perplexity_icon,
  "python": i_python,
  "reddit-icon": i_reddit_icon,
  "replit-icon": i_replit_icon,
  "sentry-icon": i_sentry_icon,
  "slack-icon": i_slack_icon,
  "spotify-icon": i_spotify_icon,
  "terminal": i_terminal,
  "vercel-icon": i_vercel_icon,
  "x": i_x,
  "zapier-icon": i_zapier_icon,
};
