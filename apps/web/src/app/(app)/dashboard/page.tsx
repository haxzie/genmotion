"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "motion/react";
import { api } from "@/lib/api";
import { HeroComposer } from "@/components/composer";
import { consumePendingCreate } from "@/lib/pending-create";

// Gentle on-load entrance: fade + a small slide up, composer trailing the heading.
const enter = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};
const enterEase = [0.25, 1, 0.5, 1] as const;

interface Project {
  id: string;
  name: string;
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

  // A prompt submitted from the marketing home (often before signing in) is
  // stashed in localStorage and survives the auth round-trip. Pick it up on
  // arrival and continue straight into a new project with the prompt auto-sent.
  useEffect(() => {
    const pending = consumePendingCreate();
    if (pending) createWithPrompt.mutate(pending);
    // createWithPrompt.mutate is stable; run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative flex h-full flex-col items-center justify-center overflow-hidden px-6">
      {/* Lightweight animated hue blobs — two large circles half-hidden below
          the viewport, heavily blurred, drifting slowly. On load the whole hue
          slowly grows up from the bottom edge. */}
      <motion.div
        className="pointer-events-none absolute inset-0"
        style={{ transformOrigin: "bottom" }}
        initial={{ opacity: 0, scaleY: 0.6 }}
        animate={{ opacity: 1, scaleY: 1 }}
        transition={{ duration: 1.6, ease: "easeOut" }}
      >
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
      </motion.div>
      <motion.div
        className="relative mb-8 text-center"
        initial={enter.initial}
        animate={enter.animate}
        transition={{ duration: 0.45, ease: enterEase }}
      >
        <h1 className="font-display text-3xl tracking-tight">
          What do you want to create?
        </h1>
      </motion.div>
      <motion.div
        className="relative w-full max-w-2xl"
        initial={enter.initial}
        animate={enter.animate}
        transition={{ duration: 0.45, ease: enterEase, delay: 0.1 }}
      >
        <HeroComposer
          onSubmit={(prompt, dims) => createWithPrompt.mutate({ prompt, ...dims })}
          pending={createWithPrompt.isPending}
        />
      </motion.div>
    </div>
  );
}
