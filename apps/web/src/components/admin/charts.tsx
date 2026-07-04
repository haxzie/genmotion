"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Point = { date: string; count: number };

const AXIS = { stroke: "#6b6b71", fontSize: 11 };
const GRID = "rgba(255,255,255,0.06)";

/** Short "Jul 4" label from an ISO yyyy-mm-dd. */
function shortDate(iso: string): string {
  const [, m, d] = iso.split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return m && d ? `${months[Number(m) - 1]} ${Number(d)}` : iso;
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value?: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-border bg-surface-raised px-2.5 py-1.5 text-[0.8rem] shadow-lg">
      <div className="text-text-tertiary">{label ? shortDate(label) : ""}</div>
      <div className="font-medium text-text-primary">{payload[0]?.value ?? 0}</div>
    </div>
  );
}

export function AreaTrend({ data }: { data: Point[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
        <defs>
          <linearGradient id="area-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b6ef6" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#3b6ef6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="date" tickFormatter={shortDate} tickLine={false} axisLine={false} tick={AXIS} minTickGap={24} />
        <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={AXIS} width={40} />
        <Tooltip content={<ChartTooltip />} cursor={{ stroke: GRID }} />
        <Area type="monotone" dataKey="count" stroke="#3b6ef6" strokeWidth={2} fill="url(#area-fill)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function BarTrend({ data }: { data: Point[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="date" tickFormatter={shortDate} tickLine={false} axisLine={false} tick={AXIS} minTickGap={24} />
        <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={AXIS} width={40} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
        <Bar dataKey="count" fill="#06c167" radius={[3, 3, 0, 0]} maxBarSize={22} />
      </BarChart>
    </ResponsiveContainer>
  );
}
