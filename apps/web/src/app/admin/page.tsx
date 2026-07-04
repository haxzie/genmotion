"use client";

import { useQuery } from "@tanstack/react-query";
import { Spinner } from "@/components/ui";
import { adminApi } from "@/lib/admin/client";
import { AreaTrend, BarTrend } from "@/components/admin/charts";

type Metrics = {
  totals: { users: number; orgs: number; projects: number; exports: number };
  newUsers: Array<{ date: string; count: number }>;
  exports: Array<{ date: string; count: number }>;
};

export default function AdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "metrics"],
    queryFn: () => adminApi<Metrics>("/metrics"),
  });

  const cards = [
    { label: "Users", value: data?.totals.users },
    { label: "Organisations", value: data?.totals.orgs },
    { label: "Projects", value: data?.totals.projects },
    { label: "Exports", value: data?.totals.exports },
  ];

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold tracking-tight">Dashboard</h1>
      <p className="mt-1 text-[0.95rem] text-text-secondary">Platform health at a glance.</p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border border-border bg-surface p-4">
            <div className="text-[0.8rem] text-text-tertiary">{c.label}</div>
            <div className="mt-1 text-3xl font-semibold tabular-nums">
              {isLoading ? "—" : (c.value ?? 0).toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <ChartCard title="New users" subtitle="Last 30 days">
          {data ? <AreaTrend data={data.newUsers} /> : <ChartLoading />}
        </ChartCard>
        <ChartCard title="Exports" subtitle="Completed videos · last 30 days">
          {data ? <BarTrend data={data.exports} /> : <ChartLoading />}
        </ChartCard>
      </div>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="mb-3">
        <div className="text-[0.95rem] font-medium">{title}</div>
        <div className="text-[0.8rem] text-text-tertiary">{subtitle}</div>
      </div>
      {children}
    </div>
  );
}

function ChartLoading() {
  return (
    <div className="flex h-[220px] items-center justify-center">
      <Spinner className="size-5 text-text-tertiary" />
    </div>
  );
}
