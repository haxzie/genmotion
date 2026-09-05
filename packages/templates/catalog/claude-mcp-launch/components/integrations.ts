import googleAds from "../assets/googleads.svg";
import stripe from "../assets/stripe.svg";
import mixpanel from "../assets/mixpanel.svg";
import hubspot from "../assets/hubspot.svg";
import bigquery from "../assets/bigquery.svg";
// official colored logomark from posthog.com — Simple Icons only ships a
// flat-black silhouette
import posthog from "../assets/posthog-color.svg";
import googleAnalytics from "../assets/googleanalytics.svg";
import postgres from "../assets/postgresql.svg";
import meta from "../assets/meta.svg";
import googleSheets from "../assets/googlesheets.svg";
import intercom from "../assets/intercom.svg";
// current Google Search Console mark (magnifier over bars) from gstatic —
// Simple Icons still carries the retired browser-and-wrench design
import searchConsole from "../assets/search-console-color.png";
import claude from "../assets/claude.svg";
import cursor from "../assets/cursor.svg";
import gemini from "../assets/gemini.svg";
// neither is in Simple Icons (both withdrawn) — VS Code's mark is from
// Wikimedia, OpenAI's is their wordmark SVG cropped to the logomark
import vscode from "../assets/vscode.svg";
import openai from "../assets/openai.svg";

export type Integration = { id: string; name: string; src: string };

/**
 * The data sources Sequel connects, ordered for the orbit in 02-sources —
 * adjacent tiles are deliberately different hues so the ring doesn't clump.
 */
export const SOURCES: Integration[] = [
  { id: "google-ads", name: "Google Ads", src: googleAds },
  { id: "stripe", name: "Stripe", src: stripe },
  { id: "mixpanel", name: "Mixpanel", src: mixpanel },
  { id: "hubspot", name: "HubSpot", src: hubspot },
  { id: "bigquery", name: "BigQuery", src: bigquery },
  { id: "posthog", name: "PostHog", src: posthog },
  { id: "google-analytics", name: "Google Analytics", src: googleAnalytics },
  { id: "postgres", name: "Postgres", src: postgres },
  { id: "meta-ads", name: "Meta Ads", src: meta },
  { id: "google-sheets", name: "Google Sheets", src: googleSheets },
  { id: "intercom", name: "Intercom", src: intercom },
  { id: "search-console", name: "Search Console", src: searchConsole },
];

/** Look a source up by id, for scenes that only need a few of them. */
export const source = (id: string): Integration =>
  SOURCES.find((s) => s.id === id) ?? SOURCES[0];

/** Agents that speak to Sequel over MCP. */
export const AGENTS: Integration[] = [
  { id: "claude-code", name: "Claude Code", src: claude },
  { id: "codex", name: "Codex", src: openai },
  { id: "cursor", name: "Cursor", src: cursor },
  { id: "vscode", name: "VS Code", src: vscode },
  { id: "gemini", name: "Gemini", src: gemini },
];

export const agent = (id: string): Integration =>
  AGENTS.find((a) => a.id === id) ?? AGENTS[0];

/**
 * NOTE — OpenAI, Slack, Amplitude and VS Code are absent from Simple Icons
 * (withdrawn at the trademark owners' request), so there is no logo file for
 * them. Set those as wordmarks in Inter instead of substituting a lookalike.
 */
export const WORDMARK_ONLY = ["ChatGPT", "Slack", "Amplitude", "VS Code"];
