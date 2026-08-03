"use client";

import { useState } from "react";
import { Spinner } from "@/components/ui";
import { Avatar, PlanBadge } from "@/components/admin/sheet";
import { OrgSheet } from "@/components/admin/detail-sheets";
import { InfiniteSentinel, useAdminInfinite } from "@/lib/admin/client";
import { formatDate } from "@/lib/admin/format";
import type { OrgRow } from "@/lib/admin/types";

export default function AdminOrganizations() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { items, isLoading, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useAdminInfinite<OrgRow>(["organizations"], "/organizations");

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold tracking-tight">Organisations</h1>
      <p className="mt-1 text-[0.95rem] text-text-secondary">
        {items.length ? `${items.length}${hasNextPage ? "+" : ""} organisations` : " "}
      </p>

      <div className="mt-6 overflow-hidden rounded-xl border border-border">
        <table className="w-full text-[0.9rem]">
          <thead>
            <tr className="border-b border-border bg-surface text-left text-[0.8rem] text-text-tertiary">
              <th className="px-4 py-2.5 font-medium">Name</th>
              <th className="px-4 py-2.5 font-medium">Created by</th>
              <th className="px-4 py-2.5 font-medium">Members</th>
              <th className="px-4 py-2.5 font-medium">Plan</th>
              <th className="px-4 py-2.5 font-medium">Projects</th>
              <th className="px-4 py-2.5 font-medium">Created</th>
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
            {items.map((o) => (
              <tr
                key={o.id}
                tabIndex={0}
                onClick={() => setSelectedId(o.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedId(o.id);
                  }
                }}
                className="cursor-pointer border-b border-border/60 outline-none last:border-0 hover:bg-surface-raised focus-visible:bg-surface-raised"
              >
                <td className="px-4 py-2.5 font-medium">{o.name}</td>
                <td className="px-4 py-2.5">
                  {o.createdBy ? (
                    <span className="flex items-center gap-2">
                      <Avatar person={o.createdBy} className="size-6" />
                      <span className="max-w-[14rem] truncate text-text-secondary">
                        {o.createdBy.email}
                      </span>
                    </span>
                  ) : (
                    <span className="text-text-tertiary">—</span>
                  )}
                </td>
                <td className="px-4 py-2.5 tabular-nums text-text-secondary">
                  {o.memberCount}
                </td>
                <td className="px-4 py-2.5">
                  <PlanBadge plan={o.plan} planName={o.planName} />
                </td>
                <td className="px-4 py-2.5 tabular-nums text-text-secondary">
                  {o.projectCount}
                </td>
                <td className="px-4 py-2.5 text-text-tertiary">{formatDate(o.createdAt)}</td>
              </tr>
            ))}
            {!isLoading && items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-text-tertiary">
                  No organisations yet.
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

      <OrgSheet id={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}
