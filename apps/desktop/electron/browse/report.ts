import type { NativeImage } from "electron";
import { saveAssetBytes } from "../agent/asset-writer";
import { browsingFor, type TargetHit, type TargetMiss } from "./session";
import { BrowseError } from "./url";

/**
 * What the browsing tools hand back to the model.
 *
 * Structurally a `ToolResult` from `agent/tools.ts` without importing it:
 * that module reaches the session registry and the export service, and these
 * functions have no business pulling either in (the same reason
 * `asset-writer.ts` lives on its own).
 */
interface Reported {
  text: string;
  isError?: boolean;
  image?: { base64: string; mimeType: string };
}

/**
 * How wide a page reaches the model.
 *
 * A vision model resolves nothing past about 1500px, and the screenshot comes
 * back at the display's pixel ratio — twice the viewport on a Retina Mac. So
 * every shot is scaled once, here, for both the model and the file.
 */
const MODEL_WIDTH = 1200;

/** And how tall, which is what keeps a full-page shot from being a monster. */
const MODEL_HEIGHT = 2400;

const JPEG_QUALITY = 78;

function jpeg(image: NativeImage): { base64: string; mimeType: string } {
  const { width, height } = image.getSize();
  const scale = Math.min(1, MODEL_WIDTH / width, MODEL_HEIGHT / height);
  const sized = scale < 1 ? image.resize({ width: Math.round(width * scale), quality: "good" }) : image;
  return { base64: sized.toJPEG(JPEG_QUALITY).toString("base64"), mimeType: "image/jpeg" };
}

function failed(err: unknown): Reported {
  const message = err instanceof BrowseError ? err.message : err instanceof Error ? err.message : String(err);
  return { text: `FAILED — ${message}`, isError: true };
}

/** A miss, said in a way the model can act on: here is what *is* on the page. */
function missText(target: string, miss: TargetMiss): string {
  const offered = miss.offered.slice(0, 10);
  return [
    `Nothing on the page matches "${target}".`,
    offered.length
      ? `Clickable things here: ${offered.join(", ")}. Or pass a CSS selector.`
      : "Nothing clickable was found — the page may not have finished loading, or the content may be in an iframe.",
  ].join(" ");
}

function hitText(verb: string, hit: TargetHit): string {
  return `${verb} <${hit.tag}> "${hit.label || "(no text)"}" at ${Math.round(hit.x)},${Math.round(hit.y)}.`;
}

export async function browsePage(
  projectDir: string,
  args: { url: string; width?: number; height?: number; wait_for?: string; full_page?: boolean },
): Promise<Reported> {
  const browser = browsingFor(projectDir);
  return browser.serial(async () => {
    try {
      // Only what the model actually asked for: passing a default here would
      // pin the viewport on every navigation and override the panel's size,
      // which is what the page is otherwise laid out at.
      const { slow } = await browser.goto(
        args.url,
        args.width || args.height ? { width: args.width, height: args.height } : undefined,
      );
      const waited = args.wait_for ? await browser.waitFor(args.wait_for) : null;
      const page = await browser.read();
      const shot = await browser.capture({ fullPage: args.full_page });
      const { width, height } = browser.size;

      const lines = [
        `${page.title || "(untitled)"} — ${page.url}`,
        `Viewport ${width}×${height}, page ${page.scrollHeight}px tall${
          args.full_page ? `, shot covers the top ${shot.height}px` : " (scroll with browse_act)"
        }${args.full_page && (shot.pageHeight ?? 0) > shot.height ? " — scroll and look again for the rest" : ""}`,
        ...(slow ? ["The page was still loading after 30s; this is what had arrived."] : []),
        ...(waited === false ? [`Waited 10s for "${args.wait_for}" and it never appeared.`] : []),
        "",
        page.text || "(the page rendered no text — it may be canvas, an iframe, or blocked)",
        ...(page.truncated ? ["", "[text truncated]"] : []),
      ];
      return { text: lines.join("\n"), image: jpeg(shot.image) };
    } catch (err) {
      return failed(err);
    }
  });
}

export async function browseAct(
  projectDir: string,
  args: {
    click?: string;
    type?: string;
    into?: string;
    press?: string;
    scroll?: string;
    wait_for?: string;
  },
): Promise<Reported> {
  const browser = browsingFor(projectDir);
  return browser.serial(async () => {
    const done: string[] = [];
    try {
      if (!browser.open) throw new BrowseError("No page is open — call browse_page with a URL first.");

      if (args.click) {
        const hit = await browser.click(args.click);
        if (!hit.ok) return { text: missText(args.click, hit), isError: true };
        done.push(hitText("Clicked", hit));
      }
      if (args.type !== undefined) {
        const hit = await browser.type(args.type, args.into);
        if (hit && !hit.ok) return { text: missText(args.into ?? "", hit), isError: true };
        done.push(
          hit ? `${hitText("Typed into", hit)} Text: "${args.type}"` : `Typed "${args.type}" into the focused field.`,
        );
      }
      if (args.press) {
        await browser.press(args.press);
        done.push(`Pressed ${args.press}.`);
      }
      if (args.scroll) {
        const by = args.scroll === "top" || args.scroll === "bottom" ? args.scroll : Number(args.scroll);
        if (typeof by === "number" && !Number.isFinite(by)) {
          throw new BrowseError(`scroll takes "top", "bottom", or a number of viewports like "1" or "-0.5".`);
        }
        // Clamped: a page is scrolled to look at it, and 200 viewports in one
        // call is a typo, not an intention.
        await browser.scroll(typeof by === "number" ? Math.max(-20, Math.min(20, by)) : by);
        done.push(`Scrolled ${typeof by === "number" ? `${by} viewport(s)` : `to the ${by}`}.`);
      }
      if (args.wait_for) {
        const found = await browser.waitFor(args.wait_for);
        done.push(found ? `"${args.wait_for}" is on the page.` : `Waited 10s for "${args.wait_for}" — never appeared.`);
      }
      if (done.length === 0) {
        throw new BrowseError("Nothing to do — pass at least one of click, type, press, scroll or wait_for.");
      }

      const page = await browser.read();
      const shot = await browser.capture({});
      return {
        text: [
          done.join(" "),
          `Now on ${page.title || "(untitled)"} — ${page.url} (scrolled ${page.scrollY}px of ${page.scrollHeight})`,
          "",
          page.text.slice(0, 4000),
          ...(page.text.length > 4000 ? ["", "[text truncated — browse_page the URL again for all of it]"] : []),
        ].join("\n"),
        image: jpeg(shot.image),
      };
    } catch (err) {
      return failed(err);
    }
  });
}

export async function browseCapture(
  projectDir: string,
  args: { filename?: string; selector?: string; full_page?: boolean },
): Promise<Reported> {
  const browser = browsingFor(projectDir);
  return browser.serial(async () => {
    try {
      if (!browser.open) throw new BrowseError("No page is open — call browse_page with a URL first.");
      const shot = await browser.capture({ fullPage: args.full_page, selector: args.selector });
      const { width, height } = shot.image.getSize();
      const saved = await saveAssetBytes(projectDir, shot.image.toPNG(), args.filename ?? "page", ".png");
      return {
        text: [
          `Saved ${saved} — ${width}×${height} PNG${
            shot.clipped
              ? ` of "${shot.clipped}"`
              : args.full_page
                ? ` of the top ${shot.height}px of the page${(shot.pageHeight ?? 0) > shot.height ? ` (of ${shot.pageHeight}px — scroll and shoot again for the rest)` : ""}`
                : " of the viewport"
          }, from ${browser.url}.`,
          "",
          "This is a real screenshot, so treat it as footage: show it full-bleed, inside a device or browser frame, or pan across it. It is already in the project — import the path above; never hot-link the site.",
        ].join("\n"),
        image: jpeg(shot.image),
      };
    } catch (err) {
      return failed(err);
    }
  });
}

interface Design {
  title: string;
  url: string;
  description: string | null;
  themeColor: string | null;
  colors: {
    background: string | null;
    text: string | null;
    heading: string | null;
    accent: string | null;
    accentFrom: string | null;
  };
  fonts: { body: string | null; heading: string | null };
  logos: { url: string; alt: string }[];
  inlineLogo: string | null;
  headings: string[];
  links: { url: string; label: string }[];
}

export async function browseInspect(projectDir: string): Promise<Reported> {
  const browser = browsingFor(projectDir);
  return browser.serial(async () => {
    try {
      if (!browser.open) throw new BrowseError("No page is open — call browse_page with a URL first.");
      const design = (await browser.design()) as Design;
      const { colors, fonts } = design;
      const lines = [
        `${design.title || "(untitled)"} — ${design.url}`,
        ...(design.description ? [`Description: ${design.description}`] : []),
        "",
        "Colours (computed, exact — these are the site's own values, not sampled from a picture):",
        `- background ${colors.background ?? "?"} · text ${colors.text ?? "?"} · headings ${colors.heading ?? "?"}`,
        `- accent ${colors.accent ?? "none found"}${colors.accentFrom ? ` (from "${colors.accentFrom}")` : ""}`,
        ...(design.themeColor ? [`- theme-color ${design.themeColor}`] : []),
        "",
        `Type: body ${fonts.body ?? "?"} · headings ${fonts.heading ?? "?"}`,
        "",
        ...(design.logos.length
          ? [
              "Logo and image files (pass one to save_asset — never redraw a mark):",
              ...design.logos.map((l) => `- ${l.url}${l.alt ? ` (${l.alt})` : ""}`),
            ]
          : ["No logo file found in the header or nav."]),
        ...(design.inlineLogo
          ? [
              "",
              "The mark in the header is inline SVG, so there is no file to download — read it out of the page's markup and use the paths:",
              design.inlineLogo,
            ]
          : []),
        ...(design.headings.length ? ["", "Headings:", ...design.headings.map((h) => `- ${h}`)] : []),
        ...(design.links.length
          ? ["", "Nav links (browse_page one of these for more):", ...design.links.map((l) => `- ${l.label} → ${l.url}`)]
          : []),
        "",
        "Put the colours and the typeface into the project's brand tokens so the whole video re-skins from one place. A font name here is the site's choice, not a licence to use it: substitute a web-safe or bundled face if you do not have the file.",
      ];
      return { text: lines.join("\n") };
    } catch (err) {
      return failed(err);
    }
  });
}
