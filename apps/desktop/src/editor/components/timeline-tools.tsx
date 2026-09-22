"use client";

import { useEffect } from "react";
import { AnimatePresence } from "motion/react";
import { cx } from "@/components/ui";
import { useEditorStore, type TimelineTool } from "@/stores/editor-store";
import { useTabActive } from "../../tabs/active-tab";
import { Tip, toolButton, toolIdle, useTip } from "./preview-tools";

/* Solar "Cursor" (bold duotone). CC BY 4.0, 480 Design. */
function SelectIcon() {
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

/* Solar "Scissors" (bold duotone). CC BY 4.0, 480 Design. */
function SliceIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-[18px]" fill="currentColor">
      <path
        opacity=".5"
        d="M6.5 22a3.5 3.5 0 1 0 0-7a3.5 3.5 0 0 0 0 7m0-13a3.5 3.5 0 1 0 0-7a3.5 3.5 0 0 0 0 7"
      />
      <path d="M21.53 3.47a.75.75 0 0 1 0 1.06L10.28 15.78l-.03.03A3.5 3.5 0 0 0 9.03 14.5l.03-.03L20.47 3.47a.75.75 0 0 1 1.06 0M9.03 9.5a3.5 3.5 0 0 1 1.22-1.31l.03.03l3.19 3.19l-1.06 1.06l-3.35-3.35zm6.2 4.68l1.06-1.06l5.24 5.24a.75.75 0 1 1-1.06 1.06z" />
    </svg>
  );
}

const TOOLS: {
  id: TimelineTool;
  label: string;
  hint: string;
  key: string;
  icon: () => React.JSX.Element;
}[] = [
  {
    id: "select",
    label: "Select",
    hint: "Pick, drag and trim scenes and audio clips on the timeline",
    key: "A",
    icon: SelectIcon,
  },
  {
    id: "slice",
    label: "Slice",
    hint: "Click a scene or audio clip to cut it in two where the pointer is",
    key: "C",
    icon: SliceIcon,
  },
];

/**
 * The timeline's tool dock, at the left of the transport row.
 *
 * Two modes for the pointer on the tracks: select is everything the timeline
 * did before (pick, drag, trim), slice cuts whatever clip is clicked at the
 * frame under the pointer. Escape returns to select, the way a razor tool
 * does in any editor, so a cut never lingers on the pointer by accident.
 */
export function TimelineTools({ className }: { className?: string }) {
  const tool = useEditorStore((s) => s.timelineTool);
  const setTool = useEditorStore((s) => s.setTimelineTool);
  const tabActive = useTabActive();
  const tip = useTip();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!tabActive || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return;
      }
      if (e.key === "Escape") {
        setTool("select");
        return;
      }
      const hit = TOOLS.find((t) => t.key.toLowerCase() === e.key.toLowerCase());
      if (hit) setTool(hit.id);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tabActive, setTool]);

  return (
    <div
      data-gm-timeline-tools
      className={cx(
        "flex items-center gap-0.5 rounded-xl border border-border bg-surface/90 p-1 shadow-[0_6px_24px_rgba(0,0,0,0.3)] backdrop-blur-md",
        className,
      )}
    >
      {TOOLS.map(({ id, label, hint, key, icon: Icon }) => (
        <div key={id} className="relative">
          <button
            type="button"
            onClick={() => setTool(id)}
            aria-label={label}
            aria-pressed={tool === id}
            className={cx(
              toolButton,
              tool === id ? (id === "slice" ? "bg-danger text-white" : "bg-accent text-white") : toolIdle,
            )}
            {...tip.props(id)}
          >
            <Icon />
          </button>
          <AnimatePresence>
            {tip.open === id && <Tip label={label} hint={hint} shortcut={key} align="start" />}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}
