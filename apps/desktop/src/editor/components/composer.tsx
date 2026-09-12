"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Spinner, cx } from "@/components/ui";
import { useTypewriter } from "@/hooks/use-typewriter";

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h13M13 6l6 6-6 6" />
    </svg>
  );
}

function PaperclipIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m21 11.5-8.6 8.6a5 5 0 0 1-7-7l9.2-9.2a3.3 3.3 0 0 1 4.7 4.7L10.1 17.8a1.6 1.6 0 0 1-2.3-2.3l8-8" />
    </svg>
  );
}

function FolderIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 7a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.6.8l.9 1.2H19a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

/** "image" / "video" / "audio" / "file" — the same words the chat's chips use. */
export function fileKind(file: File): "image" | "video" | "audio" | "file" {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  return "file";
}

/**
 * The `+` on the start screen: what a first message can carry besides text.
 *
 * Two rows, because that is all there is before a project exists — the chat
 * composer's menu also lists generative plugins, which need somewhere to put
 * their output. "Share a folder" is here rather than as its own pill so the
 * row holds the two pickers and nothing else; a folder already shared still
 * shows as a pill (`FolderAccess` with `hideWhenEmpty`), since that is the
 * only place to see or revoke it.
 */
function AddMenu({
  onAttachFile,
  onShareFolder,
  sharingFolder,
}: {
  onAttachFile: () => void;
  onShareFolder?: () => void;
  sharingFolder?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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

  const row =
    "flex w-full items-start gap-2.5 px-3 py-2 text-left transition-colors hover:bg-surface-hover disabled:opacity-60";

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        aria-label="Add"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cx(
          "flex size-8 items-center justify-center rounded-full bg-surface-raised text-text-secondary transition-colors duration-150 hover:bg-surface-hover hover:text-text-primary",
          open && "bg-surface-hover text-text-primary",
        )}
      >
        <PlusIcon className={cx("size-[1.15rem] transition-transform duration-150", open && "rotate-45")} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute left-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-xl border border-border bg-surface-raised shadow-[0_16px_50px_rgba(0,0,0,0.5)]"
        >
          <p className="px-3 pb-1 pt-2.5 text-[0.72rem] uppercase tracking-wider text-text-tertiary">
            Add
          </p>
          <button
            type="button"
            role="menuitem"
            className={row}
            onClick={() => {
              setOpen(false);
              onAttachFile();
            }}
          >
            <PaperclipIcon className="mt-0.5 size-4 shrink-0 text-text-tertiary" />
            <span className="min-w-0 flex-1">
              <span className="truncate text-[0.929rem] text-text-primary">Attach a file</span>
              <span className="mt-0.5 block text-[0.786rem] leading-snug text-text-tertiary">
                Image, video, audio or any file. You can also drop it here.
              </span>
            </span>
          </button>
          {onShareFolder && (
            <button
              type="button"
              role="menuitem"
              disabled={sharingFolder}
              className={cx(row, "border-t border-border")}
              onClick={() => {
                setOpen(false);
                onShareFolder();
              }}
            >
              <FolderIcon className="mt-0.5 size-4 shrink-0 text-text-tertiary" />
              <span className="min-w-0 flex-1">
                <span className="truncate text-[0.929rem] text-text-primary">
                  {sharingFolder ? "Choosing a folder…" : "Share a folder"}
                </span>
                <span className="mt-0.5 block text-[0.786rem] leading-snug text-text-tertiary">
                  Let the agent read it. It still can&rsquo;t write outside the
                  project.
                </span>
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export const ASPECT_RATIOS = [
  { label: "16:9", width: 1920, height: 1080 },
  { label: "9:16", width: 1080, height: 1920 },
  { label: "1:1", width: 1080, height: 1080 },
  { label: "4:5", width: 1080, height: 1350 },
] as const;

export type AspectRatio = (typeof ASPECT_RATIOS)[number];

/** Small rectangle drawn to the given proportions, fit inside a 16×16 box. */
function RatioGlyph({
  width,
  height,
  className,
}: {
  width: number;
  height: number;
  className?: string;
}) {
  const max = 13;
  const rw = width >= height ? max : Math.round((width / height) * max);
  const rh = height >= width ? max : Math.round((height / width) * max);
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" stroke="currentColor" strokeWidth="1.4">
      <rect x={(16 - rw) / 2} y={(16 - rh) / 2} width={rw} height={rh} rx="1.5" />
    </svg>
  );
}

function AspectDropdown({
  value,
  onChange,
}: {
  value: AspectRatio;
  onChange: (ratio: AspectRatio) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        title="Aspect ratio"
        onClick={() => setOpen((o) => !o)}
        className="flex h-8 items-center gap-1.5 rounded-full border border-[#1f1f24] px-2.5 text-[0.857rem] text-text-secondary transition-colors duration-150 hover:border-[#2a2a31] hover:text-text-primary"
      >
        <RatioGlyph width={value.width} height={value.height} className="size-3.5 shrink-0" />
        {value.label}
        <ChevronDownIcon
          className={cx("size-3 shrink-0 transition-transform duration-150", open && "rotate-180")}
        />
      </button>
      {open && (
        <>
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div
            role="menu"
            className="absolute bottom-full right-0 z-50 mb-1.5 w-32 overflow-hidden rounded-lg border border-border bg-surface-raised py-1 shadow-[0_12px_40px_rgba(0,0,0,0.5)]"
          >
            {ASPECT_RATIOS.map((ratio) => (
              <button
                key={ratio.label}
                type="button"
                role="menuitem"
                onClick={() => {
                  onChange(ratio);
                  setOpen(false);
                }}
                className={cx(
                  "flex w-full items-center gap-2 px-3 py-1.5 text-left text-[0.857rem] transition-colors duration-150",
                  value.label === ratio.label
                    ? "text-text-primary"
                    : "text-text-secondary hover:bg-surface-hover hover:text-text-primary",
                )}
              >
                <RatioGlyph width={ratio.width} height={ratio.height} className="size-3.5 shrink-0" />
                {ratio.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export const USE_CASES = [
  "A product launch video for my SaaS…",
  "An animated intro for my YouTube channel…",
  "A 30-second ad for a specialty coffee brand…",
  "An explainer showing how our API works…",
  "Animated stats for our quarterly report…",
  "A cinematic title sequence for my podcast…",
  "A feature announcement matching stripe.com's branding…",
];

/**
 * The prompt-first composer used on both the dashboard and the marketing home.
 * Owns its own input + aspect-ratio state; hands the trimmed prompt, chosen
 * dimensions, and any files attached to `onSubmit`.
 *
 * Files come in three ways — the `+` menu, a drop, a paste — and are held
 * here as chips until the message is sent: there is no project to upload
 * them into yet. The shell creates the project, copies them in as assets,
 * and attaches them to the first message the way the chat composer would.
 *
 * `accessory` is an extra control for the action row — the same slot the chat
 * composer has. The hosted app has nothing to put there; the desktop app puts
 * the agent-harness picker in it, so the choice is available before a project
 * exists rather than only once the editor is open.
 *
 * `defaultAspect` is what Settings stores. It seeds the picker rather than
 * controlling it: someone who changes the ratio for one video has changed it
 * for that video, not for every video after it.
 */
export function HeroComposer({
  onSubmit,
  pending,
  accessory,
  defaultAspect,
  onShareFolder,
  sharingFolder,
}: {
  onSubmit: (prompt: string, dims: { width: number; height: number }, files: File[]) => void;
  pending: boolean;
  accessory?: ReactNode;
  defaultAspect?: { width: number; height: number };
  /** "Share a folder" in the `+` menu. Absent on a host with no filesystem to share. */
  onShareFolder?: () => void;
  sharingFolder?: boolean;
}) {
  const [input, setInput] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [aspect, setAspect] = useState<AspectRatio>(
    () =>
      ASPECT_RATIOS.find(
        (r) => r.width === defaultAspect?.width && r.height === defaultAspect?.height,
      ) ?? ASPECT_RATIOS[0],
  );
  const placeholder = useTypewriter(USE_CASES);

  function addFiles(list: FileList | File[] | null) {
    const incoming = Array.from(list ?? []);
    if (incoming.length === 0) return;
    setFiles((current) => {
      // The same file twice is one chip: a drop of a folder's worth and a
      // second drop of the same are a habit, not a request for duplicates.
      const seen = new Set(current.map((f) => `${f.name}:${f.size}`));
      return [...current, ...incoming.filter((f) => !seen.has(`${f.name}:${f.size}`))];
    });
  }

  // Light up as a drop target the moment a file drag starts anywhere in the
  // window, and swallow drops that miss the box so the browser doesn't open
  // the file — the same handling the chat composer has.
  useEffect(() => {
    const hasFiles = (e: DragEvent) => Boolean(e.dataTransfer?.types?.includes("Files"));
    let depth = 0;
    const onEnter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth += 1;
      setDragging(true);
    };
    const onLeave = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth = Math.max(0, depth - 1);
      if (depth === 0) setDragging(false);
    };
    const onOver = (e: DragEvent) => {
      if (hasFiles(e)) e.preventDefault();
    };
    const onDrop = (e: DragEvent) => {
      if (hasFiles(e)) e.preventDefault();
      depth = 0;
      setDragging(false);
    };
    window.addEventListener("dragenter", onEnter);
    window.addEventListener("dragleave", onLeave);
    window.addEventListener("dragover", onOver);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragenter", onEnter);
      window.removeEventListener("dragleave", onLeave);
      window.removeEventListener("dragover", onOver);
      window.removeEventListener("drop", onDrop);
    };
  }, []);

  /** A pasted screenshot has no name — every one is `image.png` — so stamp it. */
  function handlePaste(event: React.ClipboardEvent) {
    const pasted = Array.from(event.clipboardData?.items ?? [])
      .filter((item) => item.kind === "file")
      .map((item) => item.getAsFile())
      .filter((file): file is File => !!file && (file.type.startsWith("image/") || file.type.startsWith("video/")))
      .map((file) => {
        if (file.name && file.name !== "image.png") return file;
        const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
        const ext = file.type.split("/")[1]?.split("+")[0] ?? "png";
        return new File([file], `pasted-${stamp}.${ext}`, { type: file.type });
      });
    if (pasted.length === 0) return;
    event.preventDefault();
    addFiles(pasted);
  }

  function submit() {
    const prompt = input.trim();
    if (!prompt || pending) return;
    onSubmit(prompt, { width: aspect.width, height: aspect.height }, files);
    // Both belong to the new project now. Clearing here rather than on the
    // shell's word keeps the box ready for the next video as soon as the tab
    // opens; if the create fails, the shell reports it and the prompt is one
    // paste away rather than sitting in a box that looks unsent.
    setInput("");
    setFiles([]);
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        addFiles(e.dataTransfer.files);
      }}
      className={cx(
        "w-full max-w-2xl rounded-2xl border bg-surface px-3 py-2.5 shadow-[0_12px_50px_rgba(0,0,0,0.35)] transition-colors duration-150 focus-within:border-[#2a2a31]",
        dragging ? "border-accent/60 bg-accent/5" : "border-[#1f1f24]",
      )}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = "";
        }}
      />
      {files.length > 0 && (
        <div className="mb-1.5 flex flex-wrap gap-1.5 px-1">
          {files.map((file) => (
            <span
              key={`${file.name}:${file.size}`}
              className="inline-flex max-w-[16rem] items-center gap-1.5 rounded-full border border-border bg-surface-raised py-0.5 pl-2 pr-1 text-[0.857rem] text-text-secondary"
              title={file.name}
            >
              <PaperclipIcon className="size-3.5 shrink-0 text-text-tertiary" />
              <span className="truncate">{file.name}</span>
              <span className="shrink-0 text-text-tertiary">{fileKind(file)}</span>
              <button
                type="button"
                aria-label={`Remove ${file.name}`}
                onClick={() => setFiles((current) => current.filter((f) => f !== file))}
                className="flex size-5 shrink-0 items-center justify-center rounded-full text-text-tertiary hover:bg-surface-hover hover:text-text-primary"
              >
                <CloseIcon className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex items-start gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo.svg"
          alt="GenMotion"
          className="ml-1 mt-1.5 size-4 shrink-0 rounded-[4px]"
        />
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          onPaste={handlePaste}
          placeholder={dragging ? "Drop to attach" : placeholder}
          rows={2}
          autoFocus
          className="w-full resize-none bg-transparent px-1 py-0.5 text-base text-text-primary outline-none placeholder:text-text-tertiary"
        />
      </div>
      <div className="flex items-center justify-between gap-1.5 pt-1">
        <div className="flex min-w-0 items-center gap-1">
          <AddMenu
            onAttachFile={() => fileInputRef.current?.click()}
            onShareFolder={onShareFolder}
            sharingFolder={sharingFolder}
          />
          {accessory}
        </div>
        <div className="flex items-center gap-1.5">
          <AspectDropdown value={aspect} onChange={setAspect} />
          <button
            type="submit"
            aria-label="Create"
            disabled={pending || !input.trim()}
            className={cx(
              "flex size-8 items-center justify-center rounded-full bg-cta text-background transition-all duration-150 hover:bg-cta-hover disabled:cursor-not-allowed disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-accent/40 outline-none",
            )}
          >
            {pending ? (
              <Spinner className="size-4 text-background" />
            ) : (
              <ArrowRightIcon className="size-[1.05rem]" />
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
