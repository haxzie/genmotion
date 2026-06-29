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

interface Project {
  id: string;
  name: string;
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
  onSubmit: (prompt: string) => void;
  pending: boolean;
}) {
  const [input, setInput] = useState("");
  const placeholder = useTypewriter(USE_CASES);

  function submit() {
    const prompt = input.trim();
    if (!prompt || pending) return;
    onSubmit(prompt);
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
    </form>
  );
}

export default function CreatePage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const createWithPrompt = useMutation({
    mutationFn: (_prompt: string) => api<Project>("/api/projects", { json: {} }),
    onSuccess: (project, prompt) => {
      // The editor chat picks this up and sends it as the first message.
      sessionStorage.setItem(`gm-initial-prompt-${project.id}`, prompt);
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
          onSubmit={(prompt) => createWithPrompt.mutate(prompt)}
          pending={createWithPrompt.isPending}
        />
      </div>
    </div>
  );
}
