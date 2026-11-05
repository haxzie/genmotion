/**
 * What the agent's browser is allowed to open.
 *
 * Its own module with no Electron import, so the rule can be tested in a
 * plain Node suite — it is the one piece of the browsing path that is a
 * security boundary rather than a convenience.
 */

export class BrowseError extends Error {}

/**
 * Only the web, and only over the web's own protocols.
 *
 * `file:` is the one that matters: without this check a model could read any
 * file on the machine into its own context by navigating to it, which is a
 * different thing from the project-scoped file access it is given on purpose.
 * `data:`/`blob:`/`javascript:` go for the same reason — none of them is a
 * page someone could have browsed to.
 *
 * Loopback is deliberately allowed: a user making a video of their own app
 * wants the agent to be able to look at `localhost:3000`.
 */
export function parseBrowseUrl(raw: string): URL {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) throw new BrowseError("No URL given.");
  let url: URL;
  try {
    // A bare host is what people type and what a model copies out of prose;
    // anything that already names a scheme is taken at its word, so this
    // cannot be used to smuggle one past the check below.
    url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`);
  } catch {
    throw new BrowseError(`"${trimmed}" is not a URL.`);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new BrowseError(`Only http and https pages can be opened, not ${url.protocol}`);
  }
  return url;
}
