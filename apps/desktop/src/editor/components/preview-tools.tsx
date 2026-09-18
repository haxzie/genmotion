"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { usePlaybackStoreApi } from "@genmotion/player";
import { api } from "@/lib/api";
import { cx } from "@/components/ui";
import { useEditorStore, type PreviewTool } from "@/stores/editor-store";
import { useTabActive } from "../../tabs/active-tab";
import { flyToExports } from "../../tabs/fly-to-exports";

/* Solar "Cursor" (bold duotone). CC BY 4.0, 480 Design. */
function CursorIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-[18px]" fill="currentColor">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="m11.433 16.464l1.203-1.202l2.626-2.626l1.202-1.203c1.232-1.23 1.847-1.846 1.702-2.508s-.963-.963-2.596-1.565l-5.45-2.007C6.861 4.152 5.232 3.55 4.392 4.39s-.24 2.47.962 5.73l2.006 5.45c.602 1.633.903 2.45 1.565 2.596s1.277-.47 2.508-1.702"
      />
      <path
        opacity=".5"
        d="m12.636 15.262l3.938 3.938c.408.408.612.612.84.706c.302.126.643.126.946 0c.228-.094.432-.298.84-.706c.407-.408.611-.612.706-.84a1.24 1.24 0 0 0 0-.946c-.095-.228-.299-.432-.706-.84l-3.939-3.938z"
      />
    </svg>
  );
}

/* Material "Draw" (two-tone). Apache 2.0, Material Design Authors. */
function DrawIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-[18px]" fill="currentColor">
      <path opacity=".3" d="M14.61 11.81L7.41 19H6v-1.41l7.19-7.2z" />
      <path d="m18.85 10.39l1.06-1.06c.78-.78.78-2.05 0-2.83L18.5 5.09c-.78-.78-2.05-.78-2.83 0l-1.06 1.06zm-4.24 1.42L7.41 19H6v-1.41l7.19-7.19zm-1.42-4.25L4 16.76V21h4.24l9.19-9.19zM19 17.5c0 2.19-2.54 3.5-5 3.5c-.55 0-1-.45-1-1s.45-1 1-1c1.54 0 3-.73 3-1.5c0-.47-.48-.87-1.23-1.2l1.48-1.48c1.07.63 1.75 1.47 1.75 2.68M4.58 13.35C3.61 12.79 3 12.06 3 11c0-1.8 1.89-2.63 3.56-3.36C7.59 7.18 9 6.56 9 6c0-.41-.78-1-2-1c-1.26 0-1.8.61-1.83.64c-.35.41-.98.46-1.4.12a.99.99 0 0 1-.15-1.38C3.73 4.24 4.76 3 7 3s4 1.32 4 3c0 1.87-1.93 2.72-3.64 3.47C6.42 9.88 5 10.5 5 11c0 .31.43.6 1.07.86z" />
    </svg>
  );
}

/* Solar "Camera Minimalistic" (bold duotone). CC BY 4.0, 480 Design. */
function CameraIcon() {
  // The glyph is a mask; its id has to be unique per mounted copy or one
  // stage's mask answers for another's.
  const mask = useId();
  return (
    <svg viewBox="0 0 24 24" className="size-[18px]" fill="currentColor">
      <defs>
        <mask id={mask}>
          <g fill="none">
            <path
              fill="#fff"
              opacity=".5"
              d="M9.778 21h4.444c3.121 0 4.682 0 5.803-.722a4.4 4.4 0 0 0 1.226-1.183C22 18.015 22 16.51 22 13.5s0-4.514-.75-5.595a4.4 4.4 0 0 0-1.225-1.183C18.904 6 17.343 6 14.222 6H9.778c-3.121 0-4.682 0-5.803.722A4.4 4.4 0 0 0 2.75 7.905C2 8.985 2 10.49 2 13.498v.002c0 3.01 0 4.514.749 5.595c.324.468.74.87 1.226 1.183C5.096 21 6.657 21 9.778 21"
            />
            <path fill="#fff" fillRule="evenodd" clipRule="evenodd" d="M8 4c0-.552.413-1 .923-1h6.154c.51 0 .923.448.923 1s-.413 1-.923 1H8.923C8.413 5 8 4.552 8 4" />
            <path fill="#000" fillRule="evenodd" clipRule="evenodd" d="M17.278 10.286c0-.444.373-.804.833-.804h.556c.46 0 .833.36.833.804s-.373.804-.833.804h-.556c-.46 0-.833-.36-.833-.804" />
            <path
              fill="#fff"
              fillRule="evenodd"
              clipRule="evenodd"
              d="M7.834 13.5c0-2.219 1.865-4.018 4.166-4.018s4.167 1.8 4.167 4.018c0 2.22-1.866 4.018-4.167 4.018S7.834 15.72 7.834 13.5m1.666 0c0-1.331 1.12-2.41 2.5-2.41s2.5 1.079 2.5 2.41s-1.12 2.411-2.5 2.411s-2.5-1.08-2.5-2.41m8.611-4.019c-.46 0-.833.36-.833.804s.373.804.833.804h.556c.46 0 .833-.36.833-.804s-.373-.804-.833-.804z"
            />
          </g>
        </mask>
      </defs>
      <path d="M0 0h24v24H0z" mask={`url(#${mask})`} />
    </svg>
  );
}

const TOOLS: {
  id: PreviewTool;
  label: string;
  hint: string;
  key: string;
  icon: () => React.ReactElement;
}[] = [
  {
    id: "select",
    label: "Select & comment",
    hint: "Click or drag over elements, then say what to change",
    key: "V",
    icon: CursorIcon,
  },
  {
    id: "draw",
    label: "Draw & comment",
    hint: "Sketch on the frame — hold ⇧ for a box — then say what to change",
    key: "D",
    icon: DrawIcon,
  },
];

const button = "flex size-8 items-center justify-center rounded-lg transition-colors";
const idle = "text-text-secondary hover:bg-surface-hover hover:text-text-primary";

/** How long the pointer rests on a button before its tooltip shows. */
const TIP_DELAY_MS = 350;

/**
 * A tooltip over a dock button: what it does, a line on how, and its key.
 *
 * Shown above the button since the dock sits under the preview. Its
 * own component rather than a `title` because a native tooltip can't carry
 * the key as a keycap or match the app, and appears on its own slow clock.
 */
function Tip({ label, hint, shortcut }: { label: string; hint: string; shortcut?: string }) {
  return (
    <motion.div
      role="tooltip"
      initial={{ opacity: 0, y: 4, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 4, scale: 0.97 }}
      transition={{ duration: 0.14, ease: [0.25, 1, 0.5, 1] }}
      className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2.5 w-max max-w-[220px] -translate-x-1/2 rounded-lg border border-border bg-surface-raised px-2.5 py-2 text-left shadow-[0_8px_28px_rgba(0,0,0,0.4)]"
    >
      <div className="flex items-center gap-2">
        <span className="text-[0.857rem] font-medium text-text-primary">{label}</span>
        {shortcut && (
          <kbd className="rounded border border-border bg-surface px-1.5 py-px font-mono text-[0.7rem] leading-4 text-text-secondary">
            {shortcut}
          </kbd>
        )}
      </div>
      <p className="mt-0.5 text-[0.75rem] leading-snug text-text-tertiary">{hint}</p>
      {/* The little arrow, pointing at the button. */}
      <span
        aria-hidden
        className="absolute left-1/2 top-full size-2 -translate-x-1/2 -translate-y-1/2 rotate-45 border-b border-r border-border bg-surface-raised"
      />
    </motion.div>
  );
}

/**
 * Hover and keyboard focus each open the tooltip; the pointer waits the
 * delay so sweeping across the dock doesn't flash three of them.
 */
function useTip() {
  const [open, setOpen] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clear = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  useEffect(() => clear, []);
  return {
    open,
    props(id: string) {
      return {
        onPointerEnter: () => {
          clear();
          timer.current = setTimeout(() => setOpen(id), TIP_DELAY_MS);
        },
        onPointerLeave: () => {
          clear();
          setOpen((current) => (current === id ? null : current));
        },
        // A click focuses the button too; only keyboard focus should open it,
        // or the tooltip would sit there after every press.
        onFocus: (e: React.FocusEvent<HTMLElement>) => {
          if (!e.currentTarget.matches(":focus-visible")) return;
          clear();
          setOpen(id);
        },
        onPointerDown: () => {
          clear();
          setOpen(null);
        },
        onBlur: () => setOpen((current) => (current === id ? null : current)),
      };
    },
  };
}

/**
 * The preview's tool dock, in the transport row under the stage.
 *
 * Two modes for the pointer and one action. Select is the inspector — hover,
 * click or marquee an element and say what to change about it. Draw is for
 * feedback that isn't about one element: circle a region, scribble where
 * something should go, and the marks go to the agent as a picture with the
 * note. Screenshot is not a mode: it files the frame under the playhead as a
 * PNG with the exports, and the chip flies to the Exports button to say so.
 *
 * Lives in the transport row under the preview, beside the frame readout —
 * never over the picture, so no part of the video is behind a button.
 */
export function PreviewTools({ projectId, className }: { projectId: string; className?: string }) {
  const tool = useEditorStore((s) => s.previewTool);
  const setTool = useEditorStore((s) => s.setPreviewTool);
  const playback = usePlaybackStoreApi();
  const tabActive = useTabActive();
  const [shooting, setShooting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const shotRef = useRef<HTMLButtonElement>(null);
  const tip = useTip();

  // Single-letter shortcuts, the way a design tool does it — and only when
  // nothing is being typed and this tab is the one in front.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!tabActive || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return;
      }
      const hit = TOOLS.find((t) => t.key.toLowerCase() === e.key.toLowerCase());
      if (hit) setTool(hit.id);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tabActive, setTool]);

  // A failed shot says why for a moment, then gets out of the way.
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 4000);
    return () => clearTimeout(t);
  }, [error]);

  async function screenshot() {
    if (shooting) return;
    setShooting(true);
    setError(null);
    // Hold the frame: the picture is of where the playhead is now.
    playback.getState().pause();
    const frame = playback.getState().frame;
    try {
      await api(`/api/projects/${projectId}/screenshot`, { json: { frame } });
      const from = shotRef.current?.getBoundingClientRect();
      if (from) flyToExports(from, "png");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't capture the frame");
    } finally {
      setShooting(false);
    }
  }

  return (
    <div className={cx("flex flex-col items-center gap-1.5", className)}>
      {error && (
        <span className="max-w-xs truncate rounded-md border border-danger/40 bg-surface/95 px-2 py-1 text-[0.75rem] text-danger backdrop-blur-md">
          {error}
        </span>
      )}
      <div
        data-gm-tools
        className="flex items-center gap-0.5 rounded-xl border border-border bg-surface/90 p-1 shadow-[0_6px_24px_rgba(0,0,0,0.3)] backdrop-blur-md"
      >
        {TOOLS.map(({ id, label, hint, key, icon: Icon }) => (
          <div key={id} className="relative">
            <button
              type="button"
              onClick={() => setTool(id)}
              aria-label={label}
              aria-pressed={tool === id}
              className={cx(button, tool === id ? "bg-accent text-white" : idle)}
              {...tip.props(id)}
            >
              <Icon />
            </button>
            <AnimatePresence>
              {tip.open === id && <Tip label={label} hint={hint} shortcut={key} />}
            </AnimatePresence>
          </div>
        ))}
        <span aria-hidden className="mx-0.5 h-5 w-px bg-border" />
        <div className="relative">
          <button
            ref={shotRef}
            type="button"
            onClick={() => void screenshot()}
            disabled={shooting}
            aria-label="Screenshot this frame"
            className={cx(button, idle, "disabled:opacity-60")}
            {...tip.props("screenshot")}
          >
            {shooting ? (
              <span className="size-3.5 animate-spin rounded-full border-2 border-text-tertiary/40 border-t-text-primary" />
            ) : (
              <CameraIcon />
            )}
          </button>
          <AnimatePresence>
            {tip.open === "screenshot" && (
              <Tip label="Screenshot" hint="Save this frame as a PNG, filed with your exports" />
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
