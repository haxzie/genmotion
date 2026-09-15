import { SEAT_PRICE_USD, planPrice, type MeterUsage, type PluginMeter } from "@genmotion/shared";
import { Button, Spinner, cx } from "@/components/ui";
import { useUpgrade } from "@/components/upgrade-modal";
import { api as desktop } from "../../api";
import { Section } from "./section";

/**
 * The plan, and what it has been used for this month.
 *
 * Three meters, the ones the API enforces: characters of voiceover, sound
 * effects, images. Drawn from the same `/api/billing/limits` read the rest
 * of the app polls, so the bar here and the refusal the agent relays when
 * one runs out are the same number. Checkout and the portal stay on the
 * web — they need the browser's session — so the buttons open it.
 */

const METERS: { id: PluginMeter; label: string; unit: (n: number) => string; note: string }[] = [
  {
    id: "characters",
    label: "Voiceover",
    unit: (n) => `${n.toLocaleString("en-US")} characters`,
    note: "Roughly 1,500 characters per minute of narration.",
  },
  { id: "sfx", label: "Sound effects", unit: (n) => `${n.toLocaleString("en-US")}`, note: "One per generated effect." },
  { id: "images", label: "Images", unit: (n) => `${n.toLocaleString("en-US")}`, note: "One per generated image." },
];

function Meter({ label, unit, note, usage }: { label: string; unit: (n: number) => string; note: string; usage: MeterUsage }) {
  const ratio = usage.limit > 0 ? Math.min(1, usage.used / usage.limit) : 0;
  const spent = usage.used >= usage.limit;
  const nearly = !spent && ratio >= 0.8;
  return (
    <div className="py-3 first:pt-0 last:pb-0">
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="text-[0.929rem] text-text-primary">{label}</span>
        <span className={cx("text-[0.857rem] tabular-nums", spent ? "text-danger" : nearly ? "text-warning" : "text-text-secondary")}>
          {unit(usage.used)} <span className="text-text-tertiary">/ {unit(usage.limit)}</span>
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-hover" role="progressbar" aria-valuemin={0} aria-valuemax={usage.limit} aria-valuenow={usage.used} aria-label={label}>
        <div
          className={cx("h-full rounded-full transition-[width] duration-300", spent ? "bg-danger" : nearly ? "bg-warning" : "bg-accent")}
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
      <p className="mt-1 text-[0.786rem] text-text-tertiary">{note}</p>
    </div>
  );
}

function resetLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" });
}

export function BillingSection() {
  const { plan, seats, trial, subscription, usage, openUpgrade } = useUpgrade();
  const paid = subscription?.paid ?? false;
  const renews = subscription?.currentPeriodEnd ? resetLabel(subscription.currentPeriodEnd) : null;

  return (
    <>
      <Section title="Plan" description="Checkout and invoices live on the web, where the browser's session is.">
        {!plan ? (
          <Spinner className="size-4 text-text-tertiary" />
        ) : (
          <>
            <div className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="text-lg text-text-primary">{paid ? plan.name : trial?.active ? "Free trial" : "Trial ended"}</span>
              {paid ? (
                <span className="text-[0.857rem] text-text-secondary">
                  {planPrice(plan.id)} a month · {plan.seats} {plan.seats === 1 ? "seat" : "seats"}
                  {renews && (subscription?.cancelAtPeriodEnd ? ` · ends ${renews}` : ` · renews ${renews}`)}
                </span>
              ) : trial?.active ? (
                <span className="text-[0.857rem] text-text-secondary">
                  {trial.daysLeft} {trial.daysLeft === 1 ? "day" : "days"} left · voiceover, sound effects and images need Pro
                </span>
              ) : (
                <span className="text-[0.857rem] text-text-secondary">Upgrade to keep exporting.</span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {paid ? (
                <Button size="sm" onClick={() => void desktop.openWeb("/settings/billing")}>
                  Manage billing
                </Button>
              ) : (
                <Button size="sm" variant="primary" onClick={() => openUpgrade("plugin")}>
                  Upgrade to Pro — ${SEAT_PRICE_USD}/month
                </Button>
              )}
              {seats && plan.canInvite && (
                <span className="text-[0.786rem] text-text-tertiary">
                  {seats.used} of {seats.max} {seats.max === 1 ? "seat" : "seats"} in use
                </span>
              )}
            </div>
          </>
        )}
      </Section>

      <Section
        title="Usage this month"
        description={
          usage
            ? `Resets on ${resetLabel(usage.period.end)}.${(seats?.max ?? 1) > 1 ? " Shared across your team." : ""}`
            : "What the chat's voiceover, sound-effect and image tools have generated."
        }
      >
        {!usage ? (
          <Spinner className="size-4 text-text-tertiary" />
        ) : (
          <div className="divide-y divide-border">
            {METERS.map((m) => (
              <Meter key={m.id} label={m.label} unit={m.unit} note={m.note} usage={usage[m.id]} />
            ))}
          </div>
        )}
        {!paid && (
          <p className="mt-4 text-[0.786rem] text-text-tertiary">
            These tools are part of Pro; the meters fill once you upgrade.
          </p>
        )}
      </Section>
    </>
  );
}
