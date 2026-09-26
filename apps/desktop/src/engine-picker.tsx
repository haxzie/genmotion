import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ProjectEngine } from "@genmotion/project/schema";
import { api as loopback } from "@/lib/api";
import { cx, Spinner } from "@/components/ui";

/** The stored defaults, as `/api/preferences` returns them. */
interface Preferences {
  width: number;
  height: number;
  fps: number;
  engine: ProjectEngine;
}

/**
 * "GenMotion" is what the React engine is called to the user: it is the app's
 * original way of making a video, and `react` is only what the manifest calls
 * it. The mapping lives here alone; everything below the picker speaks the
 * manifest's names.
 */
type EngineRow = "genmotion" | "hyperframes" | "three";

const ENGINES: { id: EngineRow; engine: ProjectEngine; label: string; detail: string }[] = [
  {
    id: "genmotion",
    engine: "react",
    label: "GenMotion",
    detail: "React scenes on the frame-driven @genmotion/motion runtime",
  },
  {
    id: "hyperframes",
    engine: "hyperframes",
    label: "HyperFrames",
    detail: "HTML compositions with GSAP, authored with the HyperFrames skills",
  },
  {
    id: "three",
    engine: "three",
    label: "Three.js",
    detail: "Three.js scenes, driven frame by frame — no React, no GSAP",
  },
];

function EngineIcon({ id, className }: { id: EngineRow; className?: string }) {
  if (id === "genmotion") {
    return <img src="/logo.svg" alt="" aria-hidden className={className} />;
  }
  if (id === "hyperframes") {
    return <img src="/hyperframes-mark.png" alt="" aria-hidden className={className} />;
  }
  return <img src="/threejs-mark.svg" alt="" aria-hidden className={className} />;
}

/**
 * Which engine a new project is written for.
 *
 * Sits beside the model picker on the start screen and looks like it, because
 * it is the same kind of choice: made once, remembered on this machine, and
 * applied to whatever the composer creates next. Three.js is the default;
 * GenMotion is the React runtime every project used to be.
 */
export function EnginePicker({ placement = "down" }: { placement?: "up" | "down" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ["preferences"],
    queryFn: () => loopback<Preferences>("/api/preferences"),
  });
  const choose = useMutation({
    mutationFn: (engine: ProjectEngine) =>
      loopback<Preferences>("/api/preferences", { json: { engine } }),
    onSuccess: (next) => queryClient.setQueryData(["preferences"], next),
  });

  // Close on an outside click or Escape, like the other menus in the editor.
  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const active = data ? ENGINES.find((e) => e.engine === data.engine) : undefined;

  return (
    <div ref={ref} className="relative min-w-0 shrink">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title={active ? `${active.label} · ${active.detail}` : "Choose the engine"}
        className={cx(
          "flex h-8 min-w-0 items-center gap-1.5 rounded-full pl-2 pr-2 text-[0.786rem] transition-colors",
          "text-text-secondary hover:bg-surface-hover hover:text-text-primary",
          open && "bg-surface-hover text-text-primary",
        )}
      >
        {active ? (
          <EngineIcon id={active.id} className="size-[0.95rem] shrink-0" />
        ) : (
          <Spinner className="size-3 shrink-0" />
        )}
        <span className="min-w-0 flex-1 truncate">{active?.label ?? "Engine"}</span>
        <svg viewBox="0 0 16 16" className={cx("size-3 shrink-0 opacity-60 transition-transform", open && "rotate-180")} fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M4 6.5L8 10.5 12 6.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && data && (
        <div
          className={cx(
            "absolute left-0 z-50 w-72 overflow-hidden rounded-xl border border-border bg-surface-raised shadow-[0_16px_50px_rgba(0,0,0,0.5)]",
            placement === "up" ? "bottom-full mb-2" : "top-full mt-2",
          )}
        >
          <p className="px-3 pb-1 pt-2.5 text-[0.72rem] uppercase tracking-wider text-text-tertiary">
            Engine
          </p>
          {ENGINES.map((engine) => {
            const isActive = engine.id === active?.id;
            return (
              <button
                key={engine.id}
                type="button"
                role="menuitem"
                disabled={choose.isPending}
                onClick={() =>
                  !isActive &&
                  choose.mutate(engine.engine, { onSuccess: () => setOpen(false) })
                }
                className="flex w-full items-start gap-2.5 px-3 py-2 text-left transition-colors hover:bg-surface-hover"
              >
                <EngineIcon id={engine.id} className="mt-0.5 size-4 shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-[0.929rem] text-text-primary">{engine.label}</span>
                    {isActive && (
                      <svg viewBox="0 0 16 16" className="size-3 shrink-0 text-success" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 8.5l3.5 3.5L13 5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                  <span className="mt-0.5 block truncate text-[0.786rem] leading-snug text-text-tertiary">
                    {engine.detail}
                  </span>
                </span>
              </button>
            );
          })}
          {choose.error && (
            <p className="border-t border-border px-3 py-2 text-[0.786rem] text-warning">
              {choose.error instanceof Error ? choose.error.message : "Couldn't switch"}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
