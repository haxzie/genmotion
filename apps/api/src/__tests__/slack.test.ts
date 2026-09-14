import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The Slack transport, in isolation.
 *
 * `../slack` reads its webhook URLs from `../env` at import, so each case
 * resets the module registry and re-imports after stubbing the environment.
 * `fetch` is stubbed globally — nothing here may reach Slack.
 */

const fetchMock = vi.fn();

async function loadSlack(urls: { events?: string; signups?: string } = {}) {
  vi.resetModules();
  vi.stubEnv("SLACK_EVENTS_WEBHOOK_URL", urls.events ?? "");
  vi.stubEnv("SLACK_SIGNUPS_WEBHOOK_URL", urls.signups ?? "");
  // zod treats "" as a malformed url; an unset var must genuinely be absent.
  if (!urls.events) delete process.env.SLACK_EVENTS_WEBHOOK_URL;
  if (!urls.signups) delete process.env.SLACK_SIGNUPS_WEBHOOK_URL;
  return import("../slack");
}

/** The transport does not await the post, so the test has to. */
async function settle() {
  await new Promise((r) => setTimeout(r, 0));
  await new Promise((r) => setTimeout(r, 0));
}

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({ ok: true, status: 200, text: async () => "ok" });
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("postToSlack", () => {
  it("is inert when no webhook is configured", async () => {
    const { postToSlack, slackEnabled } = await loadSlack();
    expect(slackEnabled).toBe(false);
    postToSlack("events", "hello");
    postToSlack("signups", "hello");
    await settle();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("posts a mrkdwn text payload to the feed's webhook", async () => {
    const { postToSlack } = await loadSlack({
      events: "https://hooks.slack.test/events",
      signups: "https://hooks.slack.test/signups",
    });
    postToSlack("signups", "🎉 hi");
    await settle();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://hooks.slack.test/signups");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ text: "🎉 hi" });
  });

  it("only posts to the feeds that are configured", async () => {
    const { postToSlack } = await loadSlack({ events: "https://hooks.slack.test/events" });
    postToSlack("signups", "dropped");
    postToSlack("events", "kept");
    await settle();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]![0]).toBe("https://hooks.slack.test/events");
  });

  it("swallows a failed post rather than throwing", async () => {
    const { postToSlack } = await loadSlack({ events: "https://hooks.slack.test/events" });
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    fetchMock.mockRejectedValueOnce(new Error("ECONNRESET"));
    expect(() => postToSlack("events", "one")).not.toThrow();
    await settle();

    fetchMock.mockResolvedValueOnce({ ok: false, status: 404, text: async () => "no_service" });
    expect(() => postToSlack("events", "two")).not.toThrow();
    await settle();

    expect(error).toHaveBeenCalledTimes(2);
    error.mockRestore();
  });
});

describe("message helpers", () => {
  it("escapes Slack markup in user-supplied text", async () => {
    const { escapeSlack, person } = await loadSlack();
    expect(escapeSlack("<@U123> & co")).toBe("&lt;@U123&gt; &amp; co");
    expect(person({ name: "Ada <admin>", email: "ada@example.test" })).toBe(
      "*Ada &lt;admin&gt;* (ada@example.test)",
    );
    expect(person({ name: "  ", email: "ada@example.test" })).toBe("*ada@example.test*");
  });

  it("names the sign-up method from the auth route that created the user", async () => {
    const { signupMethod } = await loadSlack();
    expect(signupMethod({ path: "/callback/:id", params: { id: "google" } })).toBe("Google");
    expect(signupMethod({ path: "/callback/:id", params: { id: "github" } })).toBe("GitHub");
    expect(signupMethod({ path: "/magic-link/verify" })).toBe("magic link");
    expect(signupMethod(null)).toBe("unknown");
  });
});
