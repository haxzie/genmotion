"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { cx } from "@/components/ui";
import type { PluginUsage } from "@genmotion/shared";

/** /api/billing/plugin-usage — the month's meters, and who spent them. */
interface PluginUsageResponse extends PluginUsage {
  members: {
    userId: string;
    name: string;
    email: string;
    characters: number;
    sfx: number;
    images: number;
  }[];
}

const METERS: { id: "characters" | "sfx" | "images"; label: string; format: (n: number) => string }[] = [
  { id: "characters", label: "Voiceover", format: (n) => `${n.toLocaleString("en-US")} chars` },
  { id: "sfx", label: "Sound effects", format: (n) => n.toLocaleString("en-US") },
  { id: "images", label: "Images", format: (n) => n.toLocaleString("en-US") },
];

function Meter({ label, format, used, limit }: { label: string; format: (n: number) => string; used: number; limit: number }) {
  const ratio = limit > 0 ? Math.min(1, used / limit) : 0;
  const spent = used >= limit;
  const nearly = !spent && ratio >= 0.8;
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="text-[0.9rem] text-text-primary">{label}</span>
        <span className={cx("text-[0.857rem] tabular-nums", spent ? "text-danger" : nearly ? "text-warning" : "text-text-secondary")}>
          {format(used)} <span className="text-text-tertiary">/ {format(limit)}</span>
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-hover" role="progressbar" aria-valuemin={0} aria-valuemax={limit} aria-valuenow={used} aria-label={label}>
        <div className={cx("h-full rounded-full", spent ? "bg-danger" : nearly ? "bg-warning" : "bg-accent")} style={{ width: `${ratio * 100}%` }} />
      </div>
    </div>
  );
}

/**
 * The generation meters — what the chat's voiceover, sound-effect and image
 * tools have used this month against the plan's allowance — and the same
 * split by member, so a team can see where it went.
 */
function PluginUsageSection({ usage, seats }: { usage: PluginUsageResponse; seats: number }) {
  const resets = new Date(usage.period.end).toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" });
  const showMembers = usage.members.length > 1;
  return (
    <>
      <h2 className="mb-3 mt-10 text-[0.95rem] font-medium text-text-secondary">Generation this month</h2>
      <div className="rounded-xl border border-border bg-surface-raised p-5">
        <p className="mb-4 text-[0.857rem] text-text-tertiary">
          Resets on {resets}. Your plan includes {usage.characters.limit.toLocaleString("en-US")} characters of voiceover,{" "}
          {usage.sfx.limit} sound effects and {usage.images.limit} images a month
          {seats > 1 ? ", shared across the team" : ""}.
        </p>
        <div className="flex flex-col gap-4">
          {METERS.map((m) => (
            <Meter key={m.id} label={m.label} format={m.format} used={usage[m.id].used} limit={usage[m.id].limit} />
          ))}
        </div>
        {showMembers && (
          <table className="mt-6 w-full text-[0.857rem]">
            <thead>
              <tr className="text-left text-text-tertiary">
                <th className="pb-2 font-normal">Member</th>
                <th className="pb-2 text-right font-normal">Voiceover</th>
                <th className="pb-2 text-right font-normal">Sound effects</th>
                <th className="pb-2 text-right font-normal">Images</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {usage.members.map((m) => (
                <tr key={m.userId}>
                  <td className="py-2 pr-3">
                    <span className="block truncate text-text-primary">{m.name || m.email}</span>
                    {m.name && m.email && <span className="block truncate text-[0.786rem] text-text-tertiary">{m.email}</span>}
                  </td>
                  <td className="py-2 text-right tabular-nums text-text-secondary">{m.characters.toLocaleString("en-US")}</td>
                  <td className="py-2 text-right tabular-nums text-text-secondary">{m.sfx}</td>
                  <td className="py-2 text-right tabular-nums text-text-secondary">{m.images}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

const exact = new Intl.NumberFormat("en-US");

/**
 * The month's generation, and the seats: what an account has and how much
 * of it is used. Lives on the account page; billing is about paying.
 */
export function GenerationAndSeats({
  plan,
  seats,
  team,
}: {
  plan: { id: string; name: string; seats: number };
  seats: { used: number; max: number };
  team?: { message: string };
}) {
  const usage = useQuery({
    queryKey: ["plugin-usage"],
    queryFn: () => api<PluginUsageResponse>("/api/billing/plugin-usage"),
    staleTime: 60_000,
  });
  return (
    <>
      {usage.data && <PluginUsageSection usage={usage.data} seats={plan.seats} />}

      <h2 className="mb-3 mt-10 text-[0.95rem] font-medium text-text-secondary">Seats</h2>
      <div className="rounded-xl border border-border bg-surface-raised px-5 py-4">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-[0.857rem] text-text-tertiary">People in this organization</p>
          <p className="text-xl tabular-nums text-text-primary">
            {exact.format(seats.used)}
            <span className="text-text-tertiary"> / {exact.format(seats.max)}</span>
          </p>
        </div>
        <p className="mt-2 text-[0.857rem] text-text-tertiary">
          {team?.message ?? `${plan.name} covers ${plan.seats} ${plan.seats === 1 ? "seat" : "seats"}.`}
        </p>
      </div>
    </>
  );
}
