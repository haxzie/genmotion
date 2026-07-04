"use client";

import { Spinner } from "@/components/ui";
import { InfiniteSentinel, useAdminInfinite } from "@/lib/admin/client";

type Org = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  memberCount: number;
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

export default function AdminOrganizations() {
  const { items, isLoading, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useAdminInfinite<Org>(["organizations"], "/organizations");

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
              <th className="px-4 py-2.5 font-medium">Users</th>
              <th className="px-4 py-2.5 font-medium">Plan</th>
              <th className="px-4 py-2.5 font-medium">Projects</th>
              <th className="px-4 py-2.5 font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center">
                  <Spinner className="mx-auto size-5 text-text-tertiary" />
                </td>
              </tr>
            )}
            {items.map((o) => (
              <tr key={o.id} className="border-b border-border/60 last:border-0 hover:bg-surface-raised">
                <td className="px-4 py-2.5 font-medium">{o.name}</td>
                <td className="px-4 py-2.5 tabular-nums text-text-secondary">{o.memberCount}</td>
                <td className="px-4 py-2.5">
                  <span className="rounded-full border border-border px-2 py-0.5 text-[0.75rem] text-text-secondary">
                    {o.plan}
                  </span>
                </td>
                <td className="px-4 py-2.5 tabular-nums text-text-secondary">{o.projectCount}</td>
                <td className="px-4 py-2.5 text-text-tertiary">{formatDate(o.createdAt)}</td>
              </tr>
            ))}
            {!isLoading && items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-text-tertiary">
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
    </div>
  );
}
