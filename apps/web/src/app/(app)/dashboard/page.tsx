"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "motion/react";
import { api } from "@/lib/api";
import { track } from "@/lib/analytics";
import { HeroComposer } from "@/components/composer";
import { consumePendingCreate } from "@/lib/pending-create";

// Gentle on-load entrance: fade + a small slide up, composer trailing the heading.
const enter = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};
const enterEase = [0.25, 1, 0.5, 1] as const;

const GRID = "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3";

// Staggered entrance for the project cards.
const listVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};
const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: enterEase },
  },
};

interface Project {
  id: string;
  name: string;
  thumbnailUrl: string | null;
  fps: number;
  width: number;
  height: number;
  updatedAt: string;
  sceneCount: number;
  totalFrames: number;
}

function formatDuration(seconds: number): string {
  const total = Math.round(seconds);
  if (total < 60) return `${total}s`;
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

/** Placeholder card shown while the project list loads. */
function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-md border border-border bg-surface-raised">
      <div className="aspect-video animate-pulse bg-surface-hover" />
      <div className="p-3">
        <div className="h-3.5 w-2/5 animate-pulse rounded bg-surface-hover" />
        <div className="mt-2 h-3 w-1/4 animate-pulse rounded bg-surface-hover" />
      </div>
    </div>
  );
}

/**
 * The app home ("Projects"): the create composer up top, then the user's
 * existing projects listed below in a dark card. Creating happens through the
 * composer, so the list has no separate "new project" action.
 */
export default function ProjectsHomePage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const createWithPrompt = useMutation({
    mutationFn: (vars: { prompt: string; width: number; height: number }) =>
      api<Project>("/api/projects", {
        json: { width: vars.width, height: vars.height },
      }),
    onSuccess: (project, vars) => {
      track("project_created", { fromPrompt: !!vars.prompt });
      // The editor chat picks this up and sends it as the first message.
      sessionStorage.setItem(`gm-initial-prompt-${project.id}`, vars.prompt);
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      router.push(`/p/${project.id}`);
    },
  });

  const { data: projects, isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: () => api<Project[]>("/api/projects"),
  });

  const deleteProject = useMutation({
    mutationFn: (id: string) => api(`/api/projects/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projects"] }),
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
    <div className="relative">
      {/* ── Create composer ────────────────────────────────────────────── */}
      <section className="relative flex min-h-[72vh] flex-col items-center justify-center overflow-hidden px-6">
        {/* Lightweight animated hue blobs — two large circles half-hidden below
            the section, heavily blurred, drifting slowly. On load the whole hue
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
        {/* Dark-to-transparent overlay so the hue gradient slowly fades down
            into the background toward the projects card below. */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />
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
      </section>

      {/* ── Projects listing ───────────────────────────────────────────── */}
      {/* Pulled up with a negative margin so the card overlaps the composer
          section above; z-10 keeps it over the hue blobs. */}
      <section className="relative z-10 mx-auto -mt-28 w-full max-w-6xl px-6 pb-24">
        <div className="rounded-2xl border border-border bg-background p-5 sm:p-6 shadow-[0_-8px_40px_rgba(10,10,20,0.35)]">
          <div className="mb-5 flex items-center gap-2">
            <h2 className="text-xl font-medium">Projects</h2>
            {projects && projects.length > 0 && (
              <span className="text-[0.857rem] text-text-tertiary">
                {projects.length}
              </span>
            )}
          </div>

          {isLoading ? (
            <div className={GRID}>
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : projects && projects.length > 0 ? (
            <motion.div
              className={GRID}
              variants={listVariants}
              initial="hidden"
              animate="show"
            >
              {projects.map((project) => (
                <motion.div
                  key={project.id}
                  variants={cardVariants}
                  className="group cursor-pointer overflow-hidden rounded-md border border-border bg-surface-raised transition-colors duration-150 hover:border-border-strong hover:bg-surface-hover"
                  onClick={() => router.push(`/p/${project.id}`)}
                >
                  <div className="flex aspect-video items-center justify-center overflow-hidden bg-background text-text-tertiary">
                    {project.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={project.thumbnailUrl}
                        alt={project.name}
                        className="size-full object-cover"
                      />
                    ) : (
                      <span className="font-mono text-[0.857rem]">
                        {project.width}×{project.height} · {project.fps}fps
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between p-3">
                    <div>
                      <p className="font-medium">{project.name}</p>
                      <p className="text-[0.857rem] text-text-tertiary">
                        {project.sceneCount}{" "}
                        {project.sceneCount === 1 ? "scene" : "scenes"}
                        {project.totalFrames > 0 &&
                          ` · ${formatDuration(project.totalFrames / project.fps)}`}
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-label={`Delete ${project.name}`}
                      title="Delete project"
                      className="flex size-8 shrink-0 items-center justify-center rounded-md text-text-tertiary opacity-0 transition-all duration-150 hover:bg-danger/10 hover:text-danger focus-visible:opacity-100 group-hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Delete "${project.name}"?`)) {
                          deleteProject.mutate(project.id);
                        }
                      }}
                    >
                      <svg viewBox="0 0 24 24" className="size-[1.05rem]" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 7h16" />
                        <path d="M10 11v6M14 11v6" />
                        <path d="M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13" />
                        <path d="M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3" />
                      </svg>
                    </button>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <div className="rounded-md border border-dashed border-border py-14 text-center text-text-tertiary">
              No projects yet — describe one above to get started.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
