"use client";

import { Spinner } from "@/components/ui";
import { InfiniteSentinel, useAdminInfinite } from "@/lib/admin/client";

type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  projectCount: number;
  createdAt: string;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function AdminUsers() {
  const { items, isLoading, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useAdminInfinite<AdminUserRow>(["users"], "/users");

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
          <div key={u.id} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-raised">
            {u.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={u.image} alt="" className="size-9 rounded-full object-cover" />
            ) : (
              <div className="flex size-9 items-center justify-center rounded-full bg-surface-hover text-[0.85rem] font-medium text-text-secondary">
                {(u.name || u.email).slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate text-[0.95rem] font-medium">{u.name || "—"}</div>
              <div className="truncate text-[0.85rem] text-text-tertiary">{u.email}</div>
            </div>
            <div className="shrink-0 text-right text-[0.8rem] text-text-tertiary">
              <div>{u.projectCount} projects</div>
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
    </div>
  );
}
