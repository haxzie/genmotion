import { describe, expect, it } from "vitest";
import { formatHomeRoute, parseHomeRoute } from "../../src/tabs/home-route";

describe("home route hash", () => {
  it("names a view, and a settings section", () => {
    expect(parseHomeRoute("#/plugins")).toEqual({ homeView: "plugins" });
    expect(parseHomeRoute("#/settings/agent")).toEqual({ homeView: "settings", settingsSection: "agent" });
    expect(parseHomeRoute("#/settings")).toEqual({ homeView: "settings" });
  });
  it("names a brand", () => {
    expect(parseHomeRoute("#/brands")).toEqual({ homeView: "brands" });
    expect(parseHomeRoute("#/brands/acme-co")).toEqual({ homeView: "brands", brandId: "acme-co" });
  });
  it("ignores what it doesn't know", () => {
    expect(parseHomeRoute("")).toBeNull();
    expect(parseHomeRoute("#/nope")).toBeNull();
    expect(parseHomeRoute("#/settings/nope")).toEqual({ homeView: "settings" });
    // A brand id is a slug by construction, so anything else in that slot is
    // not one of ours and must not reach the fetch as a path segment.
    expect(parseHomeRoute("#/brands/..")).toEqual({ homeView: "brands" });
    expect(parseHomeRoute("#/brands/Acme")).toEqual({ homeView: "brands" });
  });
  it("round-trips", () => {
    for (const hash of ["#/create", "#/plugins", "#/settings/account", "#/brands", "#/brands/acme"]) {
      expect(formatHomeRoute(parseHomeRoute(hash)!)).toBe(hash);
    }
  });
});
