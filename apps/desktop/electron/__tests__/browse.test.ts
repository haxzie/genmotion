import { describe, expect, it } from "vitest";
import { BrowseError, parseBrowseUrl } from "../browse/url";
import { PAGE_DESIGN, PAGE_TEXT, findTarget, isPresent } from "../browse/scripts";
import { parseBrowseInput, toCdpCalls } from "../browse/input";

/**
 * What the agent's browser may open.
 *
 * The rest of the browsing path needs Electron and a real page, so it is
 * checked by running the app; this is the part that is a rule rather than
 * machinery, and the one worth pinning — the tool takes a URL straight from
 * a model, and `file:///Users/...` would turn a page-reader into a
 * file-reader with no containment at all.
 */
describe("parseBrowseUrl", () => {
  it("takes http and https", () => {
    expect(parseBrowseUrl("https://stripe.com/pricing").href).toBe("https://stripe.com/pricing");
    expect(parseBrowseUrl("http://localhost:3000/").href).toBe("http://localhost:3000/");
  });

  it("assumes https for a bare host, as a person would type it", () => {
    expect(parseBrowseUrl("stripe.com").href).toBe("https://stripe.com/");
    expect(parseBrowseUrl("  linear.app/features  ").href).toBe("https://linear.app/features");
  });

  it("refuses everything that is not a web page", () => {
    for (const raw of [
      "file:///Users/someone/.ssh/id_rsa",
      "FILE:///etc/passwd",
      "data:text/html,<script>fetch('/etc/passwd')</script>",
      "javascript:alert(1)",
      "blob:https://example.com/abc",
      "chrome://settings",
      "devtools://devtools/bundled/inspector.html",
      "gm-asset://project/assets/logo.svg",
      "mailto:someone@example.com",
    ]) {
      expect(() => parseBrowseUrl(raw), raw).toThrow(BrowseError);
    }
  });

  it("refuses nothing at all", () => {
    expect(() => parseBrowseUrl("")).toThrow(BrowseError);
    expect(() => parseBrowseUrl("   ")).toThrow(BrowseError);
  });
});

/**
 * The scripts that run inside the page are strings, so nothing type-checks
 * them and a stray quote is a tool that fails every time it is called with
 * "Script failed to execute" — which is what happened: a `[alt*="logo" i]`
 * selector written with double quotes inside a double-quoted string. Parsing
 * each one here costs nothing and catches exactly that.
 */
describe("page scripts", () => {
  const scripts: Record<string, string> = {
    PAGE_TEXT,
    PAGE_DESIGN,
    findTarget: findTarget('a[href="/pricing"]'),
    findTargetByText: findTarget('Say "hello" — now'),
    isPresent: isPresent(".price'quote"),
  };

  for (const [name, script] of Object.entries(scripts)) {
    it(`${name} parses as JavaScript`, () => {
      expect(() => new Function(`return ${script}`)).not.toThrow();
    });
  }

  it("passes the target through as data, not as code", () => {
    // The target reaches the page as a JSON string literal: a model that asks
    // to click `"; fetch(evil); //` gets a fruitless search, not an eval.
    expect(findTarget('"; window.pwned = 1; //')).toContain(
      JSON.stringify('"; window.pwned = 1; //'),
    );
  });
});

/**
 * The virtual key code for a typed character.
 *
 * This shipped wrong: the code was taken from the character itself, and ASCII
 * is not a virtual-key table. `.` is 46, which is VK_DELETE, so typing a full
 * stop deleted the character in front of the caret instead. The physical key
 * (`KeyboardEvent.code`) is what maps; the character never did.
 */
describe("keyboard input", () => {
  const viewport = { width: 1280, height: 800 };
  const press = (key: string, code?: string, modifiers = 0) => {
    const event = parseBrowseInput({ kind: "key", action: "down", key, code, modifiers });
    expect(event, `${key} was rejected`).not.toBeNull();
    return toCdpCalls(event!, viewport)[0]!;
  };

  it("never sends a command key for a punctuation character", () => {
    for (const [key, code, wrong] of [
      [".", "Period", 46], // VK_DELETE
      [",", "Comma", 44], // VK_SNAPSHOT
      ["-", "Minus", 45], // VK_INSERT
      ["/", "Slash", 47],
      [";", "Semicolon", 59],
    ] as const) {
      const call = press(key, code);
      expect(call.params.windowsVirtualKeyCode, `${key} must not be ${wrong}`).not.toBe(wrong);
      expect(call.params.text, `${key} must type itself`).toBe(key);
    }
  });

  it("maps letters and digits off the physical key", () => {
    expect(press("a", "KeyA").params.windowsVirtualKeyCode).toBe(65);
    expect(press("A", "KeyA", 8).params.windowsVirtualKeyCode).toBe(65);
    expect(press("7", "Digit7").params.windowsVirtualKeyCode).toBe(55);
    expect(press("%", "Digit5", 8).params.text).toBe("%");
  });

  it("sends keys that act, not type, without a text payload", () => {
    for (const [key, code, vk] of [
      ["Enter", "Enter", 13],
      ["Backspace", "Backspace", 8],
      ["ArrowLeft", "ArrowLeft", 37],
      ["Escape", "Escape", 27],
      ["Delete", "Delete", 46],
    ] as const) {
      const call = press(key, code);
      expect(call.params.windowsVirtualKeyCode, key).toBe(vk);
      expect(call.params.text, `${key} must not type a character`).toBeUndefined();
      expect(call.params.type).toBe("rawKeyDown");
    }
  });

  it("inserts a character no physical key can name", () => {
    const call = press("é");
    expect(call.method).toBe("Input.insertText");
    expect(call.params.text).toBe("é");
  });

  it("treats a Ctrl or Command chord as a command, not as typing", () => {
    expect(press("a", "KeyA", 2).params.text, "Ctrl-A must not type an 'a'").toBeUndefined();
  });
});
