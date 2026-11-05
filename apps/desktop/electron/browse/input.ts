/**
 * What the Browser tab sends when the user takes control of the page.
 *
 * Coordinates arrive normalised (0–1 of the viewport) rather than in pixels:
 * the tab draws the page letterboxed at whatever size the panel happens to
 * be, and the main process has no idea what that size is. Normalising in the
 * renderer — where the drawn rectangle is actually known — is what keeps a
 * click landing where the user aimed it at every panel width.
 *
 * Everything here crosses an HTTP boundary from a renderer, so it is parsed
 * rather than trusted: `parseBrowseInput` is the only way in.
 */

export type BrowseInput =
  | { kind: "move"; x: number; y: number; buttons?: number }
  | {
      kind: "down" | "up";
      x: number;
      y: number;
      button?: "left" | "right" | "middle";
      clickCount?: number;
      modifiers?: number;
    }
  | { kind: "wheel"; x: number; y: number; deltaX: number; deltaY: number }
  | { kind: "key"; action: "down" | "up"; key: string; code?: string; modifiers?: number }
  | { kind: "text"; text: string };

/** CDP's modifier bitmask. */
export const MOD = { alt: 1, ctrl: 2, meta: 4, shift: 8 } as const;

/**
 * `KeyboardEvent.code` to the Windows virtual key code Chromium expects.
 *
 * This table is the whole reason punctuation used to be unusable. Deriving
 * the key code from the character (`".".charCodeAt(0)`) is wrong because
 * ASCII is not a virtual-key table: `.` is 46, which is VK_DELETE, so typing
 * a full stop deleted the character in front of the caret. `,` is
 * VK_SNAPSHOT, `-` is VK_INSERT, `/` is VK_HELP. The physical key maps
 * cleanly; the character never did.
 */
const CODE_TO_VK: Record<string, number> = {
  Backspace: 8, Tab: 9, Enter: 13, NumpadEnter: 13,
  ShiftLeft: 16, ShiftRight: 16, ControlLeft: 17, ControlRight: 17,
  AltLeft: 18, AltRight: 18, CapsLock: 20, Escape: 27, Space: 32,
  PageUp: 33, PageDown: 34, End: 35, Home: 36,
  ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40,
  Insert: 45, Delete: 46,
  MetaLeft: 91, MetaRight: 93,
  Semicolon: 186, Equal: 187, Comma: 188, Minus: 189, Period: 190, Slash: 191,
  Backquote: 192, BracketLeft: 219, Backslash: 220, BracketRight: 221, Quote: 222,
  NumpadMultiply: 106, NumpadAdd: 107, NumpadSubtract: 109, NumpadDecimal: 110, NumpadDivide: 111,
};

/** Named keys by `key`, for an event that arrived without a usable `code`. */
const NAMED_KEYS: Record<string, number> = {
  Backspace: 8, Tab: 9, Enter: 13, Shift: 16, Control: 17, Alt: 18,
  CapsLock: 20, Escape: 27, " ": 32, PageUp: 33, PageDown: 34, End: 35, Home: 36,
  ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40, Delete: 46, Meta: 91,
};

/** The virtual key for one event, from the physical key where possible. */
function virtualKey(key: string, code?: string): number {
  if (code) {
    const mapped = CODE_TO_VK[code];
    if (mapped !== undefined) return mapped;
    // KeyA-KeyZ and Digit0-Digit9 are their ASCII uppercase, which is also
    // the virtual key. These are the only two families where that is true.
    const letter = /^Key([A-Z])$/.exec(code);
    if (letter) return letter[1]!.charCodeAt(0);
    const digit = /^(?:Digit|Numpad)([0-9])$/.exec(code);
    if (digit) return (code.startsWith("Numpad") ? 96 : 48) + Number(digit[1]);
    const fn = /^F([0-9]{1,2})$/.exec(code);
    if (fn) return 111 + Number(fn[1]);
  }
  return NAMED_KEYS[key] ?? 0;
}

function num(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

/** 0–1, and nothing else: a click cannot be aimed outside the page. */
function unit(value: unknown): number {
  return Math.min(1, Math.max(0, num(value)));
}

export function parseBrowseInput(raw: unknown): BrowseInput | null {
  if (!raw || typeof raw !== "object") return null;
  const body = raw as Record<string, unknown>;
  const kind = body.kind;

  if (kind === "move") {
    return { kind, x: unit(body.x), y: unit(body.y), buttons: num(body.buttons) };
  }
  if (kind === "down" || kind === "up") {
    const button = body.button;
    return {
      kind,
      x: unit(body.x),
      y: unit(body.y),
      button: button === "right" || button === "middle" ? button : "left",
      clickCount: Math.min(3, Math.max(1, Math.round(num(body.clickCount, 1)))),
      modifiers: num(body.modifiers),
    };
  }
  if (kind === "wheel") {
    // Capped: a trackpad fling should scroll a page, not teleport it.
    const cap = (value: unknown) => Math.max(-600, Math.min(600, num(value)));
    return { kind, x: unit(body.x), y: unit(body.y), deltaX: cap(body.deltaX), deltaY: cap(body.deltaY) };
  }
  if (kind === "key") {
    const key = typeof body.key === "string" ? body.key : "";
    if (!key) return null;
    return {
      kind,
      action: body.action === "up" ? "up" : "down",
      key,
      code: typeof body.code === "string" ? body.code : undefined,
      modifiers: num(body.modifiers),
    };
  }
  if (kind === "text") {
    const text = typeof body.text === "string" ? body.text : "";
    // Generous, but not a paste of a whole file into a login form.
    return text && text.length <= 10_000 ? { kind, text } : null;
  }
  return null;
}

export interface CdpCall {
  method: string;
  params: Record<string, unknown>;
}

/** One input event as the CDP calls that perform it. */
export function toCdpCalls(event: BrowseInput, viewport: { width: number; height: number }): CdpCall[] {
  if (event.kind === "text") {
    return [{ method: "Input.insertText", params: { text: event.text } }];
  }

  if (event.kind === "key") {
    const { key, action, modifiers = 0 } = event;
    // A character the user meant to type, as opposed to a command: a single
    // character with no Ctrl or Command held. Shift and Alt stay, because
    // they are how capitals and symbols are typed in the first place.
    const printable = key.length === 1 && !(modifiers & (MOD.ctrl | MOD.meta));
    const vk = virtualKey(key, event.code);

    // A printable character this layout cannot name a physical key for — an
    // accented letter, anything from an IME. Inserting the text is right
    // where naming a key would be a guess.
    if (printable && vk === 0) {
      return action === "down" ? [{ method: "Input.insertText", params: { text: key } }] : [];
    }

    return [
      {
        method: "Input.dispatchKeyEvent",
        params: {
          // `keyDown` carries `text` and is what makes the character appear;
          // `rawKeyDown` is for keys that type nothing, where a text payload
          // would insert a stray character.
          type: action === "up" ? "keyUp" : printable ? "keyDown" : "rawKeyDown",
          key,
          ...(event.code ? { code: event.code } : {}),
          windowsVirtualKeyCode: vk,
          nativeVirtualKeyCode: vk,
          modifiers,
          ...(printable && action === "down" ? { text: key, unmodifiedText: key.toLowerCase() } : {}),
        },
      },
    ];
  }

  const x = Math.round(event.x * viewport.width);
  const y = Math.round(event.y * viewport.height);

  if (event.kind === "wheel") {
    return [
      {
        method: "Input.dispatchMouseEvent",
        params: { type: "mouseWheel", x, y, deltaX: event.deltaX, deltaY: event.deltaY, modifiers: 0 },
      },
    ];
  }

  if (event.kind === "move") {
    return [
      {
        method: "Input.dispatchMouseEvent",
        params: { type: "mouseMoved", x, y, button: "none", buttons: event.buttons ?? 0 },
      },
    ];
  }

  const button = event.button ?? "left";
  return [
    {
      method: "Input.dispatchMouseEvent",
      params: {
        type: event.kind === "down" ? "mousePressed" : "mouseReleased",
        x,
        y,
        button,
        buttons: event.kind === "down" ? 1 : 0,
        clickCount: event.clickCount ?? 1,
        modifiers: event.modifiers ?? 0,
      },
    },
  ];
}
