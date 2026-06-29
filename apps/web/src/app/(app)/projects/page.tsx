"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button, Spinner } from "@/components/ui";

interface Project {
  id: string;
  name: string;
  thumbnailUrl: string | null;
  fps: number;
  width: number;
  height: number;
  updatedAt: string;
}

export default function ProjectsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: projects, isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: () => api<Project[]>("/api/projects"),
  });

  const createProject = useMutation({
    mutationFn: () => api<Project>("/api/projects", { json: {} }),
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      router.push(`/p/${project.id}`);
    },
  });

  const deleteProject = useMutation({
    mutationFn: (id: string) => api(`/api/projects/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projects"] }),
  });

  return (
    <div className="mx-auto max-w-5xl px-8 pb-20 pt-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-medium">Projects</h1>
        <Button
          variant="primary"
          size="sm"
          onClick={() => createProject.mutate()}
          disabled={createProject.isPending}
        >
          {createProject.isPending ? (
            <Spinner className="text-background" />
          ) : (
            "Blank project"
          )}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : projects && projects.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <div
              key={project.id}
              className="group cursor-pointer rounded-md border border-border bg-surface-raised p-4 transition-colors duration-150 hover:border-border-strong hover:bg-surface-hover"
              onClick={() => router.push(`/p/${project.id}`)}
            >
              <div className="mb-6 flex aspect-video items-center justify-center overflow-hidden rounded bg-background text-text-tertiary">
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
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{project.name}</p>
                  <p className="text-[0.857rem] text-text-tertiary">
                    {new Date(project.updatedAt).toLocaleDateString()}
                  </p>
                </div>
                <Button
                  variant="danger"
                  size="sm"
                  className="opacity-0 transition-opacity group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Delete "${project.name}"?`)) {
                      deleteProject.mutate(project.id);
                    }
                  }}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-border py-14 text-center text-text-tertiary">
          No projects yet — head to Create to start one.
        </div>
      )}
    </div>
  );
}
