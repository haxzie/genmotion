"use client";

import { useState } from "react";
import { Spinner } from "@/components/ui";
import { Avatar, PlanBadge } from "@/components/admin/sheet";
import { ProjectSheet } from "@/components/admin/project-sheet";
import { InfiniteSentinel, useAdminInfinite } from "@/lib/admin/client";
import { formatDuration } from "@/lib/admin/format";
import type { ProjectRow } from "@/lib/admin/types";

export default function AdminProjects() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { items, isLoading, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useAdminInfinite<ProjectRow>(["projects"], "/projects");

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold tracking-tight">Projects</h1>
      <p className="mt-1 text-[0.95rem] text-text-secondary">
        {items.length ? `${items.length}${hasNextPage ? "+" : ""} projects` : " "}
      </p>

      <div className="mt-6 overflow-hidden rounded-xl border border-border">
        <table className="w-full text-[0.9rem]">
          <thead>
            <tr className="border-b border-border bg-surface text-left text-[0.8rem] text-text-tertiary">
              <th className="px-4 py-2.5 font-medium">Name</th>
              <th className="px-4 py-2.5 font-medium">Duration</th>
              <th className="px-4 py-2.5 font-medium">Messages</th>
              <th className="px-4 py-2.5 font-medium">Exports</th>
              <th className="px-4 py-2.5 font-medium">Created by</th>
              <th className="px-4 py-2.5 font-medium">Organisation</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center">
                  <Spinner className="mx-auto size-5 text-text-tertiary" />
                </td>
              </tr>
            )}
            {items.map((p) => (
              <tr
                key={p.id}
                tabIndex={0}
                onClick={() => setSelectedId(p.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedId(p.id);
                  }
                }}
                className="cursor-pointer border-b border-border/60 outline-none last:border-0 hover:bg-surface-raised focus-visible:bg-surface-raised"
              >
                <td className="px-4 py-2.5">
                  <span className="flex items-center gap-2.5">
                    <span className="h-7 w-12 shrink-0 overflow-hidden rounded border border-border bg-surface-raised">
                      {p.thumbnailUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.thumbnailUrl} alt="" className="size-full object-cover" />
                      )}
                    </span>
                    <span className="max-w-[16rem] truncate font-medium">{p.name}</span>
                  </span>
                </td>
                <td className="px-4 py-2.5 tabular-nums text-text-secondary">
                  {formatDuration(p.durationSeconds)}
                </td>
                <td className="px-4 py-2.5 tabular-nums text-text-secondary">
                  {p.messageCount}
                </td>
                <td className="px-4 py-2.5 tabular-nums text-text-secondary">
                  {p.exportCount}
                </td>
                <td className="px-4 py-2.5">
                  <span className="flex items-center gap-2">
                    <Avatar person={p.createdBy} className="size-6" />
                    <span className="max-w-[12rem] truncate text-text-secondary">
                      {p.createdBy.email}
                    </span>
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  {p.organization ? (
                    <span className="flex items-center gap-2">
                      <span className="max-w-[10rem] truncate text-text-secondary">
                        {p.organization.name}
                      </span>
                      <PlanBadge
                        plan={p.organization.plan}
                        planName={p.organization.planName}
                      />
                    </span>
                  ) : (
                    <span className="text-text-tertiary">—</span>
                  )}
                </td>
              </tr>
            ))}
            {!isLoading && items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-text-tertiary">
                  No projects yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isFetchingNextPage && (
        <div className="flex justify-center py-4">
          <Spinner className="size-4 text-text-tertiary" />
        </div>
      )}
      <InfiniteSentinel
        enabled={hasNextPage && !isFetchingNextPage}
        onReach={() => fetchNextPage()}
      />

      <ProjectSheet id={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}
