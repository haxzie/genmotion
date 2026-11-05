/**
 * The scripts that run inside a page the agent is looking at.
 *
 * They are strings because they are evaluated in the page's own world, not
 * this process's: `executeJavaScript` compiles them there, so nothing in here
 * can reach Electron, the project, or the user's machine. Each one is an IIFE
 * that returns JSON-serialisable data — the only thing that crosses back.
 */

/** Characters of page text handed to the model. Past this it is noise. */
export const MAX_PAGE_TEXT = 12_000;

/**
 * The page as a person reads it.
 *
 * `innerText` rather than `textContent` on purpose: it is layout-aware, so a
 * cookie banner that is `display:none` and a nav hidden behind a media query
 * are absent, which is exactly what a screenshot shows. The main-content
 * element is preferred when it carries most of the words, so a 200-link
 * footer does not crowd out the headline the video needs.
 */
export const PAGE_TEXT = `(() => {
  const pick = () => {
    const main = document.querySelector("main, article, [role=main]");
    const mainText = main instanceof HTMLElement ? main.innerText : "";
    const bodyText = document.body ? document.body.innerText : "";
    return mainText.length > 400 && mainText.length > bodyText.length * 0.4 ? mainText : bodyText;
  };
  const raw = (pick() || "").replace(/[ \\t]+/g, " ").replace(/\\n{3,}/g, "\\n\\n").trim();
  return {
    title: document.title || "",
    url: location.href,
    text: raw.slice(0, ${MAX_PAGE_TEXT}),
    truncated: raw.length > ${MAX_PAGE_TEXT},
    scrollHeight: Math.max(
      document.documentElement ? document.documentElement.scrollHeight : 0,
      document.body ? document.body.scrollHeight : 0,
    ),
    scrollY: Math.round(window.scrollY),
    viewportHeight: window.innerHeight,
  };
})()`;

/**
 * Find what the agent asked for and report where it is on screen.
 *
 * Takes a CSS selector or the visible text of something clickable, because
 * those are the two ways anyone describes a target: `#email` or "Pricing".
 * Text matching prefers an interactive element and then the innermost match,
 * so "Pricing" finds the nav link and not the `<header>` that contains it.
 *
 * The element is scrolled into view before it is measured, and the point that
 * comes back is in CSS pixels of the viewport — which is the coordinate space
 * CDP's input domain takes, so the click lands where the picture shows it.
 */
export function findTarget(target: string): string {
  return `(() => {
  const want = ${JSON.stringify(target)};
  const visible = (el) => {
    const rect = el.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return false;
    const style = getComputedStyle(el);
    return style.visibility !== "hidden" && style.display !== "none" && Number(style.opacity) > 0.05;
  };

  let found = null;
  try {
    const bySelector = document.querySelector(want);
    if (bySelector instanceof HTMLElement && visible(bySelector)) found = bySelector;
  } catch {
    // Not a selector, then — fall through to the text search.
  }

  if (!found) {
    const needle = want.trim().toLowerCase();
    const clickable = "a, button, [role=button], [role=link], [role=tab], input, select, textarea, summary, label, [onclick], [tabindex]";
    const candidates = [...document.querySelectorAll("a, button, [role=button], [role=link], [role=tab], input, select, textarea, summary, label, [onclick], [tabindex], h1, h2, h3, h4, span, div, p, li, td")]
      .filter((el) => el instanceof HTMLElement && visible(el))
      .map((el) => {
        const label = ((el.innerText || el.getAttribute("aria-label") || el.getAttribute("placeholder") || el.getAttribute("value") || "") + "").trim();
        return { el, label, flat: label.toLowerCase() };
      })
      .filter(({ flat }) => flat && flat.length < 200 && (flat === needle || flat.includes(needle)));
    candidates.sort((a, b) => {
      const interactive = (c) => (c.el.closest(clickable) ? 0 : 1);
      if (interactive(a) !== interactive(b)) return interactive(a) - interactive(b);
      const exact = (c) => (c.flat === needle ? 0 : 1);
      if (exact(a) !== exact(b)) return exact(a) - exact(b);
      // Innermost wins: the shortest label is the tightest match.
      return a.flat.length - b.flat.length;
    });
    found = candidates.length ? candidates[0].el : null;
  }

  if (!found) {
    const offered = [...document.querySelectorAll("a, button, [role=button]")]
      .filter((el) => el instanceof HTMLElement && visible(el))
      .map((el) => (el.innerText || el.getAttribute("aria-label") || "").trim())
      .filter((label) => label && label.length < 40)
      .slice(0, 20);
    return { ok: false, offered: [...new Set(offered)] };
  }

  found.scrollIntoView({ block: "center", inline: "center", behavior: "instant" });
  const rect = found.getBoundingClientRect();
  const label = (found.innerText || found.getAttribute("aria-label") || found.getAttribute("placeholder") || "").trim();
  return {
    ok: true,
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
    rect: { x: rect.left, y: rect.top, width: rect.width, height: rect.height },
    tag: found.tagName.toLowerCase(),
    label: label.slice(0, 80),
    editable: ["input", "textarea", "select"].includes(found.tagName.toLowerCase()) || found.isContentEditable,
  };
})()`;
}

/** Is something on the page yet? A selector, or text anywhere in the body. */
export function isPresent(target: string): string {
  return `(() => {
  const want = ${JSON.stringify(target)};
  try {
    const el = document.querySelector(want);
    if (el instanceof HTMLElement && el.getBoundingClientRect().height > 0) return true;
  } catch {}
  const text = document.body ? document.body.innerText : "";
  return text.toLowerCase().includes(want.trim().toLowerCase());
})()`;
}

/**
 * The design facts of the page, read from the CSSOM.
 *
 * These are the *declared* values — `getComputedStyle` and real `src`
 * attributes — not colours eyedroppered out of a screenshot. That distinction
 * is the whole point of the tool: a hex sampled from a JPEG is a slightly
 * wrong brand colour, which reads worse than an obviously neutral one, and
 * the prompt forbids it. Here the agent gets the exact value the site ships.
 */
export const PAGE_DESIGN = `(() => {
  const abs = (href) => {
    try { return new URL(href, location.href).href; } catch { return null; }
  };
  const hex = (value) => {
    const m = /rgba?\\(([^)]+)\\)/.exec(value || "");
    if (!m) return value || null;
    const parts = m[1].split(",").map((p) => parseFloat(p.trim()));
    if (parts.length < 3 || parts.some((p) => Number.isNaN(p))) return value;
    if (parts.length > 3 && parts[3] === 0) return null;
    const to = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
    return "#" + to(parts[0]) + to(parts[1]) + to(parts[2]);
  };
  const family = (el) => (el ? getComputedStyle(el).fontFamily.split(",")[0].replace(/['"]/g, "").trim() : null);
  const meta = (name) => {
    const el = document.querySelector('meta[name="' + name + '"], meta[property="' + name + '"]');
    return el ? (el.getAttribute("content") || "").trim().slice(0, 300) : null;
  };

  const body = document.body;
  const bodyStyle = body ? getComputedStyle(body) : null;

  // The page's real surface colour. A modern site often paints neither
  // <html> nor <body> -- the background belongs to the first full-width
  // section -- and the computed value on <body> then reads rgba(0,0,0,0),
  // which is not a colour anyone can put in a video. So walk outwards-in
  // until something opaque turns up.
  let background = null;
  for (const el of [document.documentElement, body, ...document.querySelectorAll("body > *, main, main > *")]) {
    if (!(el instanceof HTMLElement)) continue;
    const rect = el.getBoundingClientRect();
    if (el !== document.documentElement && el !== body && (rect.width < innerWidth * 0.6 || rect.height < 80)) continue;
    const value = hex(getComputedStyle(el).backgroundColor);
    if (value) {
      background = value;
      break;
    }
  }

  // The heading colour and face come from the biggest type on the page, not
  // from the first <h1>: that one is often a screen-reader-only line or a
  // ticker whose colour says nothing about the design. Biggest wins because
  // the hero headline is what anyone means by "the headings".
  let h1 = null;
  let widest = 0;
  for (const el of [...document.querySelectorAll("h1, h2")].slice(0, 60)) {
    if (!(el instanceof HTMLElement)) continue;
    const rect = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    if (rect.width < 80 || rect.height < 16 || style.visibility === "hidden") continue;
    const size = parseFloat(style.fontSize) || 0;
    if (size > widest) {
      widest = size;
      h1 = el;
    }
  }
  h1 = h1 || document.querySelector("h1");

  // The accent: what the page paints its primary action with. A filled button
  // first, then a link — that is the colour a brand spends on its one call to
  // action, which is the one a video needs most.
  let accent = null;
  for (const el of [...document.querySelectorAll("button, a[class], [role=button]")].slice(0, 120)) {
    const style = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    if (rect.width < 40 || rect.height < 20) continue;
    const bg = hex(style.backgroundColor);
    if (bg && bg !== background && bg !== "#ffffff" && bg !== "#000000") {
      accent = { color: bg, from: (el.innerText || "").trim().slice(0, 40) || el.tagName.toLowerCase() };
      break;
    }
  }
  if (!accent) {
    const link = document.querySelector("a[href]");
    if (link) accent = { color: hex(getComputedStyle(link).color), from: "link" };
  }

  // Logo candidates, best first. "Everything in the header" is too loose on a
  // real site — a sticky header holds product shots — so a file that says
  // logo, wordmark or brand in its src, alt or class wins, then an image that
  // is small and near the top left, which is where a mark lives.
  const logos = [];
  const named = /logo|wordmark|brand[-_]?mark/i;
  const marks = [...document.querySelectorAll("img, [style*='background-image']")].slice(0, 400).map((el) => {
    const src = el.getAttribute("src") || el.getAttribute("data-src") || "";
    const alt = el.getAttribute("alt") || "";
    const cls = el.getAttribute("class") || "";
    const rect = el.getBoundingClientRect();
    const inChrome = !!el.closest("header, nav, [class*=header], [class*=nav]");
    const score =
      (named.test(src) || named.test(alt) || named.test(cls) ? 0 : 1) +
      (inChrome ? 0 : 1) +
      (rect.top < 160 && rect.width < 300 && rect.width > 8 ? 0 : 1);
    return { src, alt, score };
  });
  marks.sort((a, b) => a.score - b.score);
  for (const mark of marks) {
    if (!mark.src || mark.score > 1) continue;
    const url = abs(mark.src);
    if (url && !logos.some((l) => l.url === url)) logos.push({ url, alt: mark.alt.slice(0, 60) });
    if (logos.length >= 4) break;
  }

  // Half the web draws its mark as inline SVG, which has no file to download.
  // Saying so is the difference between an agent reading the markup for the
  // paths and an agent deciding to redraw the logo.
  const inlineMark = [...document.querySelectorAll("header svg, nav svg, a[href='/'] svg, [class*=logo] svg")].find(
    (el) => el.getBoundingClientRect().width > 12,
  );
  const icon = document.querySelector('link[rel~="icon"], link[rel="apple-touch-icon"]');
  if (icon) {
    const url = abs(icon.getAttribute("href") || "");
    if (url) logos.push({ url, alt: "favicon" });
  }
  const og = meta("og:image");
  if (og) {
    const url = abs(og);
    if (url) logos.push({ url, alt: "og:image" });
  }

  const headings = [...document.querySelectorAll("h1, h2")]
    .map((el) => el.innerText.replace(/\\s+/g, " ").trim())
    .filter((t) => t)
    .slice(0, 12);

  const links = [];
  const seen = new Set();
  for (const a of [...document.querySelectorAll("header a[href], nav a[href]")].slice(0, 60)) {
    const url = abs(a.getAttribute("href") || "");
    const label = a.innerText.replace(/\\s+/g, " ").trim();
    if (!url || !label || seen.has(url)) continue;
    seen.add(url);
    links.push({ url, label: label.slice(0, 50) });
  }

  return {
    title: document.title || "",
    url: location.href,
    description: meta("description") || meta("og:description"),
    themeColor: meta("theme-color"),
    colors: {
      background: background,
      text: hex(bodyStyle ? bodyStyle.color : null),
      heading: h1 ? hex(getComputedStyle(h1).color) : null,
      accent: accent ? accent.color : null,
      accentFrom: accent ? accent.from : null,
    },
    fonts: {
      body: family(body),
      heading: family(h1),
      declared: [...document.styleSheets].length,
    },
    logos: logos.slice(0, 6),
    inlineLogo: inlineMark ? inlineMark.outerHTML.slice(0, 400) : null,
    headings,
    links: links.slice(0, 20),
  };
})()`;
