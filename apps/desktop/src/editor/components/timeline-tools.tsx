"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence } from "motion/react";
import { cx } from "@/components/ui";
import { useProject, useProjectMutations } from "@/hooks/use-project";
import { useEditorStore, useEditorStoreApi, type TimelineTool } from "@/stores/editor-store";
import type { DesktopProject } from "../../../electron/shared";
import { useTabActive } from "../../tabs/active-tab";
import { Tip, toolActive, toolButton, toolIdle, useTip } from "./preview-tools";

/* A text caret (I-beam): a vertical stem between two serifs. */
function SelectIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-[18px]" fill="currentColor">
      <rect x="7" y="4" width="10" height="2" rx="1" />
      <rect x="11" y="4" width="2" height="16" rx="1" />
      <rect x="7" y="18" width="10" height="2" rx="1" />
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

/* An arrow curling back over itself, the way every editor draws an undo. */
function UndoIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-[18px]" fill="currentColor">
      <path d="M8.28 5.72a.75.75 0 0 1 0 1.06L6.81 8.25h6.44a5.75 5.75 0 0 1 0 11.5h-2.5a.75.75 0 0 1 0-1.5h2.5a4.25 4.25 0 0 0 0-8.5H6.81l1.47 1.47a.75.75 0 1 1-1.06 1.06l-2.75-2.75a.75.75 0 0 1 0-1.06l2.75-2.75a.75.75 0 0 1 1.06 0" />
    </svg>
  );
}

/* A bin: lid and handle drawn, the body filled behind them. */
function DeleteIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-[18px]" fill="currentColor">
      <path
        opacity=".5"
        d="M5.06 8.5h13.88l-.6 8.42c-.13 1.8-.19 2.7-.79 3.25c-.59.55-1.5.55-3.3.55h-4.5c-1.8 0-2.71 0-3.3-.55c-.6-.55-.66-1.45-.79-3.25z"
      />
      <path d="M3.75 5.75a.75.75 0 0 0 0 1.5h16.5a.75.75 0 0 0 0-1.5h-4.06l-.44-1.11a2.25 2.25 0 0 0-2.09-1.39h-3.32a2.25 2.25 0 0 0-2.09 1.39l-.44 1.11zm5.9-1.5h4.7l.5 1.5H9.15zM10 10.75a.75.75 0 0 1 .75.75v5a.75.75 0 0 1-1.5 0v-5a.75.75 0 0 1 .75-.75m4 0a.75.75 0 0 1 .75.75v5a.75.75 0 0 1-1.5 0v-5a.75.75 0 0 1 .75-.75" />
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
 *
 * Past a divider sit the two actions rather than modes — undo and delete —
 * because they fire on press and leave the pointer as it was.
 */
export function TimelineTools({
  projectId,
  className,
}: {
  projectId: string;
  className?: string;
}) {
  const tool = useEditorStore((s) => s.timelineTool);
  const setTool = useEditorStore((s) => s.setTimelineTool);
  const selectedSceneIds = useEditorStore((s) => s.selectedSceneIds);
  const selectedAudioClipIds = useEditorStore((s) => s.selectedAudioClipIds);
  const aiBusy = useEditorStore((s) => s.aiBusy);
  const editorStore = useEditorStoreApi();
  const tabActive = useTabActive();
  const tip = useTip();

  const { data } = useProject(projectId);
  const project = data as DesktopProject | undefined;
  const { deleteScene, deleteAudioClip, undoTimeline } = useProjectMutations(projectId);

  // A HyperFrames composition is its own source of truth: the timeline's
  // edits aren't written back into the HTML, so a delete here would go into
  // a manifest nothing reads. Slicing an audio clip is the exception, and
  // that is the one edit undo has to take back for this engine.
  const writesBack = project?.engine !== "hyperframes";
  const selectionCount = selectedSceneIds.length + selectedAudioClipIds.length;
  const undoLabel = project?.undoLabel ?? null;

  function undo() {
    if (!undoLabel || editorStore.getState().aiBusy) return;
    undoTimeline.mutate();
  }

  function deleteSelection() {
    if (editorStore.getState().aiBusy) return;
    const { selectedSceneIds: scenes, selectedAudioClipIds: clips } = editorStore.getState();
    for (const id of clips) deleteAudioClip.mutate(id);
    for (const id of scenes) deleteScene.mutate(id);
  }

  // The listener is attached once; undo's own state (is there anything to take
  // back, is the AI mid-turn) moves under it between renders.
  const undoRef = useRef(undo);
  undoRef.current = undo;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!tabActive || e.altKey) return;
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return;
      }
      // ⌘Z anywhere but a text field is the timeline's undo. Shift-⌘Z (redo)
      // is deliberately left alone rather than half-answered.
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        undoRef.current();
        return;
      }
      if (e.metaKey || e.ctrlKey) return;
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
    <div data-gm-timeline-tools className={cx("flex items-center gap-0.5", className)}>
      {TOOLS.map(({ id, label, hint, key, icon: Icon }) => (
        <div key={id} className="relative">
          <button
            type="button"
            onClick={() => setTool(id)}
            aria-label={label}
            aria-pressed={tool === id}
            className={cx(toolButton, tool === id ? toolActive : toolIdle)}
            {...tip.props(id)}
          >
            <Icon />
          </button>
          <AnimatePresence>
            {tip.open === id && <Tip label={label} hint={hint} shortcut={key} align="start" />}
          </AnimatePresence>
        </div>
      ))}

      {/* Modes on the left of the rule, one-shot actions on the right. */}
      <div aria-hidden className="mx-1.5 h-5 w-px bg-border-strong" />

      <div className="relative">
        <button
          type="button"
          onClick={undo}
          disabled={!undoLabel || aiBusy}
          aria-label="Undo"
          className={cx(toolButton, toolIdle, "disabled:pointer-events-none disabled:opacity-35")}
          {...tip.props("undo")}
        >
          <UndoIcon />
        </button>
        <AnimatePresence>
          {tip.open === "undo" && (
            <Tip
              label="Undo"
              hint={
                undoLabel
                  ? `Take back “${undoLabel}”. Only edits made here, never the agent's.`
                  : "Nothing to take back yet. Only edits made here, never the agent's."
              }
              shortcut="⌘Z"
              align="start"
            />
          )}
        </AnimatePresence>
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={deleteSelection}
          disabled={!writesBack || selectionCount === 0 || aiBusy}
          aria-label="Delete selection"
          className={cx(toolButton, toolIdle, "disabled:pointer-events-none disabled:opacity-35")}
          {...tip.props("delete")}
        >
          <DeleteIcon />
        </button>
        <AnimatePresence>
          {tip.open === "delete" && (
            <Tip
              label="Delete"
              hint={
                !writesBack
                  ? "This engine's timeline is read from the composition; edit the HTML instead"
                  : selectionCount === 0
                    ? "Pick a scene or audio clip on the timeline first"
                    : "Remove the selected scenes and audio clips from the video"
              }
              shortcut="⌫"
              align="start"
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
