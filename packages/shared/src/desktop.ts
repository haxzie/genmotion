/**
 * Contract between the desktop app and the API's device-authorization flow.
 *
 * The client id is checked server-side (`validateClient`), so it has to be the
 * same string on both sides — hence one constant rather than two literals.
 */

/** Identifies the desktop app to `POST /api/auth/device/code`. */
export const DESKTOP_CLIENT_ID = "genmotion-desktop";

/** What the desktop asks for. Purely informational today; recorded on the row. */
export const DESKTOP_SCOPE = "desktop";

/** Custom URL scheme the browser uses to raise the app once login is approved. */
export const DESKTOP_PROTOCOL = "genmotion";

/** Where the browser lands after approval — raises the window, nothing more. */
export const DESKTOP_AUTH_DONE_URL = `${DESKTOP_PROTOCOL}://auth/done`;

/**
 * "Open in the app" from a template's web page — raises the window (or
 * launches the app, if the OS starts it fresh to handle the link) and remixes
 * the template exactly as pressing Remix inside the app would.
 */
export function desktopRemixUrl(templateId: string): string {
  return `${DESKTOP_PROTOCOL}://templates/${templateId}/remix`;
}

/** Sign-in methods the desktop login screen offers, mirroring the web app. */
export type DesktopAuthProvider = "google" | "github" | "magic";

/**
 * A user code is 8 characters; showing it as two groups of four is far easier
 * to compare against the browser at a glance. Both are accepted server-side —
 * the endpoints strip `-` before lookup.
 */
export function formatUserCode(code: string): string {
  const clean = code.replace(/-/g, "").toUpperCase();
  return clean.length === 8 ? `${clean.slice(0, 4)}-${clean.slice(4)}` : clean;
}
