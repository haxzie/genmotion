"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
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

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

interface Project {
  id: string;
  name: string;
}

const ASPECT_RATIOS = [
  { label: "16:9", width: 1920, height: 1080 },
  { label: "9:16", width: 1080, height: 1920 },
  { label: "1:1", width: 1080, height: 1080 },
  { label: "4:5", width: 1080, height: 1350 },
] as const;

type AspectRatio = (typeof ASPECT_RATIOS)[number];

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

const USE_CASES = [
  "A product launch video for my SaaS…",
  "An animated intro for my YouTube channel…",
  "A 30-second ad for a specialty coffee brand…",
  "An explainer showing how our API works…",
  "Animated stats for our quarterly report…",
  "A cinematic title sequence for my podcast…",
  "A feature announcement matching stripe.com's branding…",
];

function HeroComposer({
  onSubmit,
  pending,
}: {
  onSubmit: (prompt: string, dims: { width: number; height: number }) => void;
  pending: boolean;
}) {
  const [input, setInput] = useState("");
  const [aspect, setAspect] = useState<AspectRatio>(ASPECT_RATIOS[0]);
  const placeholder = useTypewriter(USE_CASES);

  function submit() {
    const prompt = input.trim();
    if (!prompt || pending) return;
    onSubmit(prompt, { width: aspect.width, height: aspect.height });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="w-full max-w-2xl rounded-2xl border border-[#1f1f24] bg-surface px-3 py-2.5 shadow-[0_12px_50px_rgba(0,0,0,0.35)] transition-colors duration-150 focus-within:border-[#2a2a31]"
    >
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        placeholder={placeholder}
        rows={2}
        autoFocus
        className="w-full resize-none bg-transparent px-1 py-0.5 text-base text-text-primary outline-none placeholder:text-text-tertiary"
      />
      <div className="flex items-center justify-between gap-1.5 pt-1">
        <button
          type="button"
          aria-label="Add"
          className="flex size-8 items-center justify-center rounded-full bg-surface-raised text-text-secondary transition-colors duration-150 hover:bg-surface-hover hover:text-text-primary"
        >
          <PlusIcon className="size-[1.15rem]" />
        </button>
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

export default function CreatePage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const createWithPrompt = useMutation({
    mutationFn: (vars: { prompt: string; width: number; height: number }) =>
      api<Project>("/api/projects", {
        json: { width: vars.width, height: vars.height },
      }),
    onSuccess: (project, vars) => {
      // The editor chat picks this up and sends it as the first message.
      sessionStorage.setItem(`gm-initial-prompt-${project.id}`, vars.prompt);
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      router.push(`/p/${project.id}`);
    },
  });

  return (
    <div className="relative flex h-full flex-col items-center justify-center overflow-hidden px-6">
      {/* Lightweight animated hue blobs — two large circles half-hidden below
          the viewport, heavily blurred, drifting slowly. */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute bottom-0 left-[6%] size-[44vw] max-w-[640px] rounded-full blur-[120px] animate-[blob-a_16s_ease-in-out_infinite]"
          style={{ background: "#C6F91E", opacity: 0.4 }}
        />
        <div
          className="absolute bottom-0 right-[6%] size-[46vw] max-w-[680px] rounded-full blur-[130px] animate-[blob-b_20s_ease-in-out_infinite]"
          style={{ background: "#16F5BD", opacity: 0.38 }}
        />
        <div
          className="absolute bottom-0 left-[40%] size-[30vw] max-w-[440px] rounded-full blur-[120px] animate-[blob-c_18s_ease-in-out_infinite]"
          style={{ background: "#FFD60A", opacity: 0.28 }}
        />
      </div>
      <div className="relative mb-8 text-center">
        <h1 className="font-display text-5xl tracking-tight">
          What do you want to create?
        </h1>
        <p className="mt-3 text-lg text-text-secondary">
          Describe it. Watch it become a video.
        </p>
      </div>
      <div className="relative w-full max-w-2xl">
        <HeroComposer
          onSubmit={(prompt, dims) => createWithPrompt.mutate({ prompt, ...dims })}
          pending={createWithPrompt.isPending}
        />
      </div>
    </div>
  );
}
