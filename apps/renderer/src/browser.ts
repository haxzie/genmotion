import { chromium, type Browser } from "playwright";

/** Headless Chromium tuned for deterministic rendering (matches the preview). */
export function launchBrowser(): Promise<Browser> {
  return chromium.launch({
    headless: true,
    args: ["--force-color-profile=srgb", "--font-render-hinting=none"],
  });
}
