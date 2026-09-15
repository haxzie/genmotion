import { describe, expect, it } from "vitest";
import { formatHomeRoute, parseHomeRoute } from "../../src/tabs/home-route";

describe("home route hash", () => {
  it("names a view, and a settings section", () => {
    expect(parseHomeRoute("#/marketplace")).toEqual({ homeView: "marketplace" });
    expect(parseHomeRoute("#/settings/agent")).toEqual({ homeView: "settings", settingsSection: "agent" });
    expect(parseHomeRoute("#/settings")).toEqual({ homeView: "settings" });
  });
  it("ignores what it doesn't know", () => {
    expect(parseHomeRoute("")).toBeNull();
    expect(parseHomeRoute("#/nope")).toBeNull();
    expect(parseHomeRoute("#/settings/nope")).toEqual({ homeView: "settings" });
  });
  it("round-trips", () => {
    for (const hash of ["#/create", "#/marketplace", "#/settings/account"]) {
      expect(formatHomeRoute(parseHomeRoute(hash)!)).toBe(hash);
    }
  });
});
