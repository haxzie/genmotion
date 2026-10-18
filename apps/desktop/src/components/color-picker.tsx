import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { HexColorPicker } from "react-colorful";
import { Input, cx } from "@/components/ui";

/**
 * Picking a brand colour.
 *
 * Replaces `<input type="color">`, which on macOS opens the system colour
 * panel: a separate floating window that dismisses the moment anything else
 * takes focus, so a drag that strays outside it loses the colour and the
 * panel at once. It is also disconnected from the row it belongs to.
 *
 * This is an ordinary popover instead, in the app's own window. Three things
 * it has to get right, each of which was a way the old one failed:
 *
 * - **A drag never closes it.** The outside-click check runs on `pointerdown`,
 *   so a drag that begins on the saturation square and ends anywhere on screen
 *   never looks like a click elsewhere.
 * - **It is not clipped.** The colour rows live inside a scrolling panel, which
 *   would cut off a popover opened near the bottom. So it is portalled to the
 *   body and positioned from the trigger's rect, flipping above when there is
 *   no room below.
 * - **It does not write on every frame.** Dragging emits a colour continuously,
 *   and each one here would be a PATCH that rewrites `brand.json`, regenerates
 *   `BRAND.md` and re-syncs every open project. `onChange` is debounced, and
 *   flushed on close so a value is never lost.
 */

const PANEL_WIDTH = 240;
/** Space between the trigger and the panel, and the panel and the viewport. */
const GAP = 6;
const EDGE = 8;

/**
 * How long after the last movement the value is persisted.
 *
 * Long enough that a drag across the square is one write rather than eighty,
 * short enough that letting go and looking at the row feels immediate.
 */
const COMMIT_DELAY_MS = 220;

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

/** `#abc` and `abc123` are both things people paste. */
function normalise(input: string): string | null {
  const value = input.trim().toLowerCase();
  const withHash = value.startsWith("#") ? value : `#${value}`;
  return HEX.test(withHash) ? withHash : null;
}

export function ColorPicker({
  value,
  onChange,
  label = "Pick colour",
  swatches = [],
}: {
  /** The committed colour, as `#rrggbb`. */
  value: string;
  /** Debounced, and flushed when the popover closes. Never fires per frame. */
  onChange: (hex: string) => void;
  label?: string;
  /** Offered as one-click chips: the rest of the brand's palette. */
  swatches?: string[];
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const [text, setText] = useState(value);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Read by the unmount cleanup, which must flush whatever was pending without
  // re-running every time the draft changes.
  const pending = useRef<string | null>(null);

  // Follows the committed value while closed. Not while open: a commit landing
  // mid-drag would otherwise snap the cursor back to where it had got to.
  useEffect(() => {
    if (open) return;
    setDraft(value);
    setText(value);
  }, [value, open]);

  const commit = useCallback(
    (hex: string) => {
      pending.current = null;
      onChange(hex);
    },
    [onChange],
  );

  const schedule = useCallback(
    (hex: string) => {
      setDraft(hex);
      setText(hex);
      pending.current = hex;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => commit(hex), COMMIT_DELAY_MS);
    },
    [commit],
  );

  const close = useCallback(() => {
    setOpen(false);
    // Flushed rather than dropped: closing right after a drag is the common
    // way out, and the last movement is usually the one that was wanted.
    if (timer.current) clearTimeout(timer.current);
    const last = pending.current;
    if (last) commit(last);
  }, [commit]);

  // A picker unmounted mid-interaction (the row deleted, the panel navigated
  // away from) must not strand the pending write.
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      if (pending.current) onChange(pending.current);
    },
    [onChange],
  );

  /**
   * Positioned from the trigger, and re-positioned while open: the rows sit in
   * a scrolling panel, so the trigger moves under an otherwise stationary
   * popover. `capture` on the scroll listener because that panel's scroll
   * event does not bubble to the window.
   *
   * The panel's own height is measured rather than assumed. A guessed constant
   * was wrong the moment the swatch strip rendered, and being wrong meant the
   * flip decision was wrong, which put the panel off the bottom of the screen.
   */
  useLayoutEffect(() => {
    if (!open) return;
    const update = () => {
      const trigger = triggerRef.current?.getBoundingClientRect();
      if (!trigger) return;
      const height = panelRef.current?.offsetHeight ?? 0;
      const below = trigger.bottom + GAP;
      const flip = height > 0 && below + height > window.innerHeight - EDGE;
      const top = flip
        ? Math.max(EDGE, trigger.top - GAP - height)
        : Math.min(below, Math.max(EDGE, window.innerHeight - EDGE - height));
      setPos({
        top,
        left: Math.min(Math.max(EDGE, trigger.left), window.innerWidth - PANEL_WIDTH - EDGE),
      });
    };
    update();
    // A second pass once the panel exists: the first runs before it has been
    // measured, so it has no height to flip against.
    const frame = requestAnimationFrame(update);
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    // `pointerdown`, not `click`: a drag that starts inside the saturation
    // square and finishes out on the page must not read as a click outside.
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      close();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        close();
        triggerRef.current?.focus();
      }
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => (open ? close() : setOpen(true))}
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={cx(
          "size-8 shrink-0 cursor-pointer rounded-md border border-border transition-colors",
          "outline-none hover:border-border-strong focus-visible:ring-2 focus-visible:ring-accent/40",
          open && "border-border-strong ring-2 ring-accent/30",
        )}
        // The swatch is the control, so it shows the colour being dragged
        // rather than the last one written.
        style={{ backgroundColor: draft }}
      />

      {open &&
        createPortal(
          <div
            ref={panelRef}
            role="dialog"
            aria-label={label}
            // Hidden for the frame before it has been measured, rather than
            // flashing at the wrong end of the screen and jumping.
            style={{
              position: "fixed",
              top: pos?.top ?? 0,
              left: pos?.left ?? 0,
              width: PANEL_WIDTH,
              visibility: pos ? "visible" : "hidden",
            }}
            // `gm-color-panel` is the scope the library overrides hang off;
            // see the block in styles.css for why they need one.
            className="gm-color-panel z-[60] rounded-xl border border-border bg-surface-raised p-3 shadow-[0_16px_50px_rgba(0,0,0,0.5)]"
          >
            <HexColorPicker color={draft} onChange={schedule} />

            <div className="mt-3 flex items-center gap-2">
              <span
                className="size-7 shrink-0 rounded-md border border-border"
                style={{ backgroundColor: draft }}
              />
              <Input
                value={text}
                spellCheck={false}
                aria-label="Hex value"
                className="font-mono text-[0.857rem]"
                onChange={(e) => {
                  setText(e.target.value);
                  const hex = normalise(e.target.value);
                  if (hex) schedule(hex);
                }}
                onBlur={() => setText(draft)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    close();
                  }
                }}
              />
            </div>

            {swatches.length > 0 && (
              <div className="mt-3 border-t border-border pt-3">
                <p className="mb-1.5 text-[0.714rem] uppercase tracking-wider text-text-tertiary">
                  In this brand
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {swatches.map((hex) => (
                    <button
                      key={hex}
                      type="button"
                      title={hex}
                      onClick={() => schedule(hex)}
                      style={{ backgroundColor: hex }}
                      className="size-5 rounded border border-border outline-none hover:border-border-strong focus-visible:ring-2 focus-visible:ring-accent/40"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>,
          document.body,
        )}
    </>
  );
}
