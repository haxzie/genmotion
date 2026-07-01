"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "motion/react";
import { api } from "@/lib/api";

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
    transition: { duration: 0.35, ease: [0.25, 1, 0.5, 1] as const },
  },
};

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

export default function ProjectsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: projects, isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: () => api<Project[]>("/api/projects"),
  });

  const deleteProject = useMutation({
    mutationFn: (id: string) => api(`/api/projects/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projects"] }),
  });

  return (
    <div className="mx-auto max-w-5xl px-8 pb-20 pt-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-medium">Projects</h1>
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="inline-flex items-center gap-1.5 rounded-full bg-cta px-4 py-2 text-[0.857rem] font-medium text-background transition-colors duration-150 hover:bg-cta-hover"
        >
          <svg viewBox="0 0 24 24" className="size-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          New project
        </button>
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
          No projects yet — head to Create to start one.
        </div>
      )}
    </div>
  );
}
