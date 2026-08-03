"use client";

import { useState } from "react";
import { Spinner } from "@/components/ui";
import { Avatar, PlanBadge } from "@/components/admin/sheet";
import { UserSheet } from "@/components/admin/detail-sheets";
import { InfiniteSentinel, useAdminInfinite } from "@/lib/admin/client";
import { formatDate } from "@/lib/admin/format";
import type { UserRow } from "@/lib/admin/types";

export default function AdminUsers() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { items, isLoading, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useAdminInfinite<UserRow>(["users"], "/users");

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold tracking-tight">Users</h1>
      <p className="mt-1 text-[0.95rem] text-text-secondary">
        {items.length ? `${items.length}${hasNextPage ? "+" : ""} users` : " "}
      </p>

      {isLoading && (
        <div className="mt-10 flex justify-center">
          <Spinner className="size-5 text-text-tertiary" />
        </div>
      )}

      <div className="mt-6 divide-y divide-border/60 overflow-hidden rounded-xl border border-border">
        {items.map((u) => (
          <div
            key={u.id}
            role="button"
            tabIndex={0}
            onClick={() => setSelectedId(u.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setSelectedId(u.id);
              }
            }}
            className="flex cursor-pointer items-center gap-3 px-4 py-3 outline-none hover:bg-surface-raised focus-visible:bg-surface-raised"
          >
            <Avatar person={u} className="size-9" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[0.95rem] font-medium">{u.email}</div>
              <div className="truncate text-[0.85rem] text-text-tertiary">
                {u.name || "—"}
              </div>
            </div>
            <div className="hidden min-w-0 shrink-0 items-center gap-2 sm:flex sm:w-56">
              {u.org ? (
                <>
                  <span className="min-w-0 flex-1 truncate text-[0.85rem] text-text-secondary">
                    {u.org.name}
                  </span>
                  <PlanBadge plan={u.org.plan} planName={u.org.planName} />
                </>
              ) : (
                <span className="text-[0.85rem] text-text-tertiary">No org</span>
              )}
            </div>
            <div className="shrink-0 text-right text-[0.8rem] text-text-tertiary">
              <div className="tabular-nums">{u.projectCount} projects</div>
              <div>Joined {formatDate(u.createdAt)}</div>
            </div>
          </div>
        ))}
        {!isLoading && items.length === 0 && (
          <div className="px-4 py-10 text-center text-text-tertiary">No users yet.</div>
        )}
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

      <UserSheet id={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}
