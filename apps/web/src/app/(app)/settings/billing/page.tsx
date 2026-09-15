"use client";

import { useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  PLANS,
  planPrice,
  type PlanId,
} from "@genmotion/shared";
import { api } from "@/lib/api";
import { track } from "@/lib/analytics";
import { openBillingPortal, startCheckout, type PurchasablePlan } from "@/lib/billing";
import { limitsQueryKey } from "@/components/upgrade-modal";
import { Button, Spinner, cx } from "@/components/ui";
import { Modal } from "@/components/modal";
import { PLUGIN_ALLOWANCE, type PluginUsage } from "@genmotion/shared";

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

interface UsageTotals {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  totalTokens: number;
  messages: number;
}
interface ModelUsage extends UsageTotals {
  model: string;
  estimatedCostUsd: number;
}
interface ProjectUsage extends UsageTotals {
  projectId: string;
  name: string;
  estimatedCostUsd: number;
}
interface Subscription {
  status: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  manageable: boolean;
  paid: boolean;
}

interface Trial {
  active: boolean;
  daysLeft: number;
  endsAt: string | null;
}

interface UsageResponse {
  plan: { id: PlanId; name: string; seats: number; canInvite: boolean };
  seats: { used: number; max: number };
  team?: { message: string };
  subscription: Subscription;
  trial: Trial;
  entitled: boolean;
  period: { start: string; end: string };
  totals: UsageTotals & { estimatedCostUsd: number };
  byModel: ModelUsage[];
  byProject: ProjectUsage[];
}

/**
 * Status pill — colour follows the state, not the plan. An org with no
 * subscription is on its trial (or past it), never "Active": that word belongs
 * to a subscription that is being paid for.
 */
function PlanStatusPill({
  subscription,
  trial,
}: {
  subscription: Subscription;
  trial: Trial;
}) {
  let label: string;
  let tone: "good" | "warn" | "muted";
  if (!subscription.paid) {
    if (trial.active) {
      label = `${trial.daysLeft} ${trial.daysLeft === 1 ? "day" : "days"} left`;
      tone = "muted";
    } else {
      label = "Trial ended";
      tone = "warn";
    }
  } else if (subscription.status === "on_hold" || subscription.status === "failed") {
    label = "Payment issue";
    tone = "warn";
  } else if (subscription.status === "paused") {
    label = "Paused";
    tone = "muted";
  } else if (subscription.cancelAtPeriodEnd || subscription.status === "cancelled") {
    label = "Ending";
    tone = "muted";
  } else {
    label = "Active";
    tone = "good";
  }
  return (
    <span
      className={cx(
        "rounded-full px-2 py-0.5 text-[0.786rem]",
        tone === "warn"
          ? "bg-orange-muted text-warning"
          : tone === "muted"
            ? "bg-surface-hover text-text-secondary"
            : "bg-green-muted text-success",
      )}
    >
      {label}
    </span>
  );
}

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** The one line under the plan name that says what happens next. */
function statusLine(s: Subscription, trial: Trial): string | null {
  if (!s.paid) {
    if (trial.active && trial.endsAt) return `Trial ends ${shortDate(trial.endsAt)}`;
    if (!trial.active) {
      return `Your trial${trial.endsAt ? ` ended ${shortDate(trial.endsAt)}` : " has ended"}. Upgrade to keep exporting.`;
    }
    return null;
  }
  if (!s.currentPeriodEnd) return null;
  const when = shortDate(s.currentPeriodEnd);
  if (s.status === "on_hold" || s.status === "failed") {
    return `We couldn't collect the last payment. Access continues until ${when} — update your payment method to keep it.`;
  }
  if (s.status === "paused") return `Paused. Access continues until ${when}.`;
  return s.cancelAtPeriodEnd || s.status === "cancelled"
    ? `Access ends ${when}`
    : `Renews ${when}`;
}

const SEGMENTS = [
  {
    key: "uncachedInput",
    label: "Input",
    hint: "Prompt tokens billed at full rate",
    color: "#4f7df8",
  },
  {
    key: "cacheReadTokens",
    label: "Cache read",
    hint: "Reused prompt prefix — about 10% of the input rate",
    color: "#0e9d5e",
  },
  {
    key: "cacheWriteTokens",
    label: "Cache write",
    hint: "Writing the prompt prefix to cache — about 1.25x the input rate",
    color: "#8b6cf0",
  },
  {
    key: "outputTokens",
    label: "Output",
    hint: "Tokens the model generated",
    color: "#c9781f",
  },
] as const;

const compact = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});
const exact = new Intl.NumberFormat("en-US");

function money(usd: number): string {
  if (usd === 0) return "$0.00";
  if (usd < 0.01) return "<$0.01";
  return `$${usd.toFixed(2)}`;
}

function periodLabel(startIso: string): string {
  return new Date(startIso).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Input already includes the cached tokens — subtract to get the full-rate part. */
function uncachedInput(t: UsageTotals): number {
  return Math.max(0, t.inputTokens - t.cacheReadTokens - t.cacheWriteTokens);
}

function segmentValue(t: UsageTotals, key: (typeof SEGMENTS)[number]["key"]) {
  return key === "uncachedInput" ? uncachedInput(t) : t[key];
}

function Stat({
  label,
  value,
  sub,
  hero,
}: {
  label: string;
  value: string;
  sub?: string;
  hero?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface-raised px-5 py-4">
      <p className="text-[0.857rem] text-text-tertiary">{label}</p>
      <p
        className={cx(
          "mt-1 font-display tracking-tight text-text-primary tabular-nums",
          hero ? "text-4xl" : "text-2xl",
        )}
      >
        {value}
      </p>
      {sub && <p className="mt-1 text-[0.857rem] text-text-tertiary">{sub}</p>}
    </div>
  );
}

/** The plans a checkout can move this org to. There is one. */
const PURCHASABLE = ["pro", "max"] as const;

/**
 * How long to wait for the subscription webhook after checkout. It usually
 * lands within a second or two; a minute covers a slow provider without
 * leaving the page spinning indefinitely.
 */
const ACTIVATION_POLL_MS = 2000;
const ACTIVATION_ATTEMPTS = 30;

/**
 * A single plan, priced and buyable on its own. The price is repeated in the
 * button because that button starts a paid checkout — what you're about to be
 * charged should be legible at the point of commitment, not only in the
 * heading above it.
 */
function PlanCard({
  plan,
  current,
  busy,
  disabled,
  onSelect,
}: {
  plan: (typeof PURCHASABLE)[number];
  /** The plan the org is on now — decides whether this card is up, down, or a fresh start. */
  current: PlanId;
  busy: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  const def = PLANS[plan];
  const featured = plan === "pro";
  const live = current !== "free";
  const down = live && PLANS[current].priceUsd > def.priceUsd;
  const label = !live
    ? `Upgrade to ${def.name} — ${planPrice(plan)}/mo`
    : down
      ? `Switch to ${def.name} at renewal — ${planPrice(plan)}/mo`
      : `Upgrade to ${def.name} — ${planPrice(plan)}/mo`;
  return (
    <div
      className={cx(
        "flex flex-col rounded-xl border p-5",
        featured
          ? "border-accent/40 bg-accent-muted/40"
          : "border-border bg-surface-raised",
      )}
    >
      <div className="flex items-baseline justify-between gap-2">
        <p className="font-display text-xl font-semibold tracking-tight">
          {def.name}
        </p>
        <p className="text-[0.857rem] text-text-tertiary">
          <span className="text-text-primary tabular-nums">{planPrice(plan)}</span>
          {" / month"}
        </p>
      </div>
      <p className="mt-2 text-[0.9rem] text-text-secondary">
        {def.includedSeats === 1 ? "Everything, for one person." : `Everything, for a team of ${def.includedSeats}.`}
      </p>
      <ul className="mt-3 flex flex-1 flex-col gap-1.5">
        {def.features.map((f) => (
          <li key={f} className="text-[0.9rem] text-text-secondary">
            {f}
          </li>
        ))}
      </ul>
      <button
        type="button"
        disabled={disabled}
        onClick={onSelect}
        className={cx(
          "mt-4 inline-flex h-9 cursor-pointer items-center justify-center rounded-md border font-medium transition-colors disabled:opacity-60",
          featured
            ? "border-transparent bg-cta text-background hover:bg-cta-hover"
            : "border-border bg-surface text-text-primary hover:bg-surface-hover",
        )}
      >
        {busy ? <Spinner /> : label}
      </button>
    </div>
  );
}

export default function BillingPage() {
  const [data, setData] = useState<UsageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkoutBusy, setCheckoutBusy] = useState<PurchasablePlan | null>(null);
  const [portalBusy, setPortalBusy] = useState(false);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [pluginUsage, setPluginUsage] = useState<PluginUsageResponse | null>(null);
  // "polling" while we wait for the webhook after checkout; "slow" once we've
  // given up waiting but the payment may still be landing.
  const [activation, setActivation] = useState<"idle" | "polling" | "slow">("idle");
  const queryClient = useQueryClient();

  const load = useCallback(
    () =>
      api<UsageResponse>("/api/billing/usage")
        .then((d) => {
          setData(d);
          return d;
        })
        .catch((e) => {
          setError(e.message ?? "Couldn't load usage.");
          return null;
        })
        .finally(() => setLoading(false)),
    [],
  );

  useEffect(() => {
    load();
    // The meters are their own read: a failure here must not blank the plan.
    api<PluginUsageResponse>("/api/billing/plugin-usage").then(setPluginUsage).catch(() => null);
  }, [load]);

  /**
   * Schedule the cancellation, or take it back — then re-read the plan.
   * Cancelling is confirmed in the modal below, so its error shows there;
   * resuming is one click and its error shows on the page.
   */
  async function setCancelling(cancel: boolean) {
    setCancelBusy(true);
    setError(null);
    setCancelError(null);
    try {
      await api(`/api/billing/${cancel ? "cancel" : "resume"}`, { method: "POST" });
      await load();
      queryClient.invalidateQueries({ queryKey: limitsQueryKey });
      setCancelOpen(false);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Couldn't update the subscription.";
      if (cancel) setCancelError(message);
      else setError(message);
    } finally {
      setCancelBusy(false);
    }
  }

  /**
   * Returning from checkout, the subscription webhook usually lands within a
   * second — but it is not synchronous with the redirect, so the page can load
   * while the org is still on Free. Poll briefly rather than show a stale plan.
   */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") !== "success") return;

    setActivation("polling");
    let attempts = 0;
    const timer = setInterval(async () => {
      attempts += 1;
      const fresh = await load();
      const done = fresh ? fresh.plan.id !== "free" : false;
      if (done || attempts >= ACTIVATION_ATTEMPTS) {
        clearInterval(timer);
        setActivation(done ? "idle" : "slow");
        if (done) {
          track("upgrade_plan_activated", { plan: fresh!.plan.id });
          // The sidebar and dashboard read the plan through react-query; this
          // page's own fetch does not update them.
          queryClient.invalidateQueries({ queryKey: limitsQueryKey });
        }
        // Drop the query param so a refresh doesn't poll again.
        window.history.replaceState({}, "", window.location.pathname);
      }
    }, ACTIVATION_POLL_MS);
    return () => clearInterval(timer);
  }, [load, queryClient]);

  const totals = data?.totals;
  const hasUsage = (totals?.totalTokens ?? 0) > 0;
  // Never offer the plan they're already on.
  const upgradable = PURCHASABLE.filter((p) => p !== data?.plan.id);

  return (
    <div className="mx-auto max-w-3xl px-8 pb-20 pt-10">
      <h1 className="text-2xl font-medium">Billing</h1>
      <p className="mb-8 text-[0.95rem] text-text-secondary">
        Your plan and AI token usage.
      </p>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : error ? (
        <div className="rounded-md border border-dashed border-border py-14 text-center text-text-tertiary">
          {error}
        </div>
      ) : (
        data && (
          <>
            {activation === "polling" && (
              <div className="mb-4 flex items-center gap-3 rounded-xl border border-accent/40 bg-accent-muted/40 px-5 py-4 text-[0.9rem] text-text-secondary">
                <Spinner />
                Activating your plan… this usually takes a few seconds.
              </div>
            )}
            {activation === "slow" && data.plan.id === "free" && (
              <div className="mb-4 rounded-xl border border-warning/40 bg-orange-muted/40 px-5 py-4 text-[0.9rem] text-text-secondary">
                Your payment went through but the plan hasn&apos;t activated
                here yet. This can take a minute —{" "}
                <button
                  type="button"
                  onClick={() => {
                    setLoading(true);
                    load();
                    queryClient.invalidateQueries({ queryKey: limitsQueryKey });
                  }}
                  className="cursor-pointer underline underline-offset-2 hover:text-text-primary"
                >
                  refresh
                </button>
                , or contact support if it still shows the trial.
              </div>
            )}

            {/* Current plan, plus the billing portal once there's something to
                manage. Upgrade options get their own cards further down. */}
            <div
              className={cx(
                "grid gap-4",
                (data.subscription.manageable || data.subscription.status === "active") && "sm:grid-cols-2",
              )}
            >
              <div className="rounded-xl border border-border bg-surface-raised p-5">
                <div className="flex items-center gap-2">
                  <span className="text-[0.857rem] text-text-tertiary">
                    Current plan
                  </span>
                  <PlanStatusPill subscription={data.subscription} trial={data.trial} />
                </div>
                <div className="mt-1.5 flex items-baseline gap-2">
                  <p className="font-display text-xl font-semibold tracking-tight">
                    {data.plan.name}
                  </p>
                  {data.subscription.paid && (
                    <span className="text-[0.857rem] text-text-tertiary tabular-nums">
                      {planPrice(data.plan.id)} / month
                    </span>
                  )}
                </div>
                <ul className="mt-2.5 flex flex-col gap-1.5">
                  {PLANS[data.plan.id].features.map((f) => (
                    <li
                      key={f}
                      className="text-[0.9rem] text-text-secondary"
                    >
                      {f}
                    </li>
                  ))}
                </ul>
                {statusLine(data.subscription, data.trial) && (
                  <p
                    className={cx(
                      "mt-3 text-[0.857rem]",
                      !data.entitled ? "text-warning" : "text-text-tertiary",
                    )}
                  >
                    {statusLine(data.subscription, data.trial)}
                  </p>
                )}
              </div>

              {/* Anyone paying sees how to stop paying. The portal needs a
                  billing account at the provider; the cancel button only
                  needs an active subscription, and the API says so if
                  there is nothing behind it to cancel. */}
              {data.subscription.manageable || data.subscription.status === "active" ? (
                <div className="rounded-xl border border-border bg-surface-raised p-5">
                  <span className="text-[0.857rem] text-text-tertiary">
                    Billing
                  </span>
                  <p className="mt-1.5 font-display text-xl font-semibold tracking-tight">
                    Manage subscription
                  </p>
                  <p className="mt-2 text-[0.9rem] text-text-secondary">
                    {data.subscription.manageable
                      ? "Update your payment method, download invoices, or cancel."
                      : data.subscription.cancelAtPeriodEnd
                        ? "Your subscription ends at the close of this billing period."
                        : "Cancel any time; Pro stays on until the end of the period you've paid for."}
                  </p>
                  {data.subscription.manageable && (
                  <button
                    type="button"
                    disabled={portalBusy}
                    onClick={async () => {
                      setPortalBusy(true);
                      setError(null);
                      try {
                        await openBillingPortal();
                      } catch (e) {
                        setError(
                          e instanceof Error
                            ? e.message
                            : "Couldn't open the billing portal.",
                        );
                        setPortalBusy(false);
                      }
                    }}
                    className="mt-4 inline-flex h-9 w-full cursor-pointer items-center justify-center rounded-md border border-border bg-surface font-medium text-text-primary transition-colors hover:bg-surface-hover disabled:opacity-60"
                  >
                    {portalBusy ? <Spinner /> : "Manage billing"}
                  </button>
                  )}
                  {data.subscription.status === "active" && (
                    <button
                      type="button"
                      disabled={cancelBusy}
                      onClick={() => {
                        if (data.subscription.cancelAtPeriodEnd) void setCancelling(false);
                        else {
                          setCancelError(null);
                          setCancelOpen(true);
                        }
                      }}
                      className={cx(
                        "inline-flex h-9 w-full cursor-pointer items-center justify-center rounded-md border font-medium transition-colors disabled:opacity-60",
                        data.subscription.manageable ? "mt-2" : "mt-4",
                        data.subscription.cancelAtPeriodEnd
                          ? "border-border bg-surface text-text-primary hover:bg-surface-hover"
                          : "border-transparent bg-transparent text-danger hover:bg-danger/10",
                      )}
                    >
                      {cancelBusy ? (
                        <Spinner />
                      ) : data.subscription.cancelAtPeriodEnd ? (
                        "Resume subscription"
                      ) : (
                        "Cancel subscription"
                      )}
                    </button>
                  )}
                </div>
              ) : null}
            </div>

            <Modal open={cancelOpen} onClose={() => !cancelBusy && setCancelOpen(false)} dismissible={!cancelBusy} labelledBy="cancel-title">
              <div className="p-6">
                <h2 id="cancel-title" className="font-display text-lg font-semibold tracking-tight">
                  Cancel your subscription?
                </h2>
                <p className="mt-2 text-[0.9rem] text-text-secondary">
                  Pro stays on until{" "}
                  <span className="text-text-primary">
                    {data.subscription.currentPeriodEnd
                      ? new Date(data.subscription.currentPeriodEnd).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
                      : "the end of the period you've paid for"}
                  </span>
                  . After that, exports stop and the chat&rsquo;s voiceover, sound-effect and image tools turn off.
                  Your projects and files are untouched, and you can resume any time before then.
                </p>
                {cancelError && <p className="mt-3 text-[0.857rem] text-danger">{cancelError}</p>}
                <div className="mt-6 flex justify-end gap-2">
                  <Button type="button" variant="secondary" onClick={() => setCancelOpen(false)} disabled={cancelBusy} className="h-9">
                    Keep Pro
                  </Button>
                  <Button type="button" variant="danger" onClick={() => void setCancelling(true)} disabled={cancelBusy} className="h-9">
                    {cancelBusy && <Spinner className="size-3.5" />}
                    Cancel subscription
                  </Button>
                </div>
              </div>
            </Modal>

            {/* One card per purchasable plan the org isn't already on, so each
                plan states its own price and features instead of sharing a box. */}
            {upgradable.length > 0 && (
              <>
                <h2 className="mb-3 mt-10 text-[0.95rem] font-medium text-text-secondary">
                  {data.subscription.status === "active" ? "Change plan" : data.subscription.status !== "none" ? "Resubscribe" : "Upgrade"}
                </h2>
                <div
                  className={cx(
                    "grid gap-4",
                    upgradable.length > 1 && "sm:grid-cols-2",
                  )}
                >
                  {upgradable.map((p) => (
                    <PlanCard
                      key={p}
                      plan={p}
                      current={data.plan.id}
                      busy={checkoutBusy === p}
                      disabled={checkoutBusy !== null}
                      onSelect={async () => {
                        setCheckoutBusy(p);
                        setError(null);
                        try {
                          // In place for a live subscription: reload the page's
                          // data rather than leaving for a checkout that isn't.
                          if ((await startCheckout(p)) === "changed") {
                            await load();
                            queryClient.invalidateQueries({ queryKey: limitsQueryKey });
                            setCheckoutBusy(null);
                          }
                        } catch (e) {
                          setError(
                            e instanceof Error
                              ? e.message
                              : "Couldn't start checkout.",
                          );
                          setCheckoutBusy(null);
                        }
                      }}
                    />
                  ))}
                </div>
              </>
            )}

            {pluginUsage && <PluginUsageSection usage={pluginUsage} seats={data.plan.seats} />}

            {/* Seats — the only thing that scales with what you pay */}
            <h2 className="mb-3 mt-10 text-[0.95rem] font-medium text-text-secondary">
              Seats
            </h2>
            <div className="rounded-xl border border-border bg-surface-raised px-5 py-4">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-[0.857rem] text-text-tertiary">People in this organization</p>
                <p className="text-xl tabular-nums text-text-primary">
                  {exact.format(data.seats?.used ?? 0)}
                  <span className="text-text-tertiary">
                    {" "}/ {exact.format(data.seats?.max ?? 0)}
                  </span>
                </p>
              </div>
              <p className="mt-2 text-[0.857rem] text-text-tertiary">
                {data.team?.message ??
                  `${data.plan.name} covers ${data.plan.seats} ${data.plan.seats === 1 ? "seat" : "seats"}.`}
              </p>
            </div>

            {/* Usage */}
            <div className="mb-3 mt-10 flex items-baseline justify-between gap-4">
              <h2 className="text-[0.95rem] font-medium text-text-secondary">
                Usage
              </h2>
              <span className="text-[0.857rem] text-text-tertiary">
                {periodLabel(data.period.start)}
              </span>
            </div>

            {!hasUsage ? (
              <div className="rounded-xl border border-dashed border-border py-14 text-center text-text-tertiary">
                No AI usage yet this month.
              </div>
            ) : (
              totals && (
                <>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <Stat
                      label="Total tokens"
                      value={compact.format(totals.totalTokens)}
                      sub={`${exact.format(totals.totalTokens)} tokens`}
                      hero
                    />
                    <Stat
                      label="Estimated cost"
                      value={money(totals.estimatedCostUsd)}
                      sub="At list prices"
                    />
                    <Stat
                      label="AI responses"
                      value={exact.format(totals.messages)}
                      sub="Chat turns billed"
                    />
                  </div>

                  {/* Composition. Segments are separated by a 2px surface gap
                      rather than borders, and every segment is named in the
                      legend below — identity is never colour alone. */}
                  <div className="mt-4 rounded-xl border border-border bg-surface-raised p-5">
                    <p className="text-[0.857rem] text-text-tertiary">
                      Token breakdown
                    </p>
                    <div
                      className="mt-3 flex h-5 gap-[2px] overflow-hidden rounded"
                      role="img"
                      aria-label={SEGMENTS.map(
                        (s) =>
                          `${s.label}: ${exact.format(segmentValue(totals, s.key))} tokens`,
                      ).join(", ")}
                    >
                      {SEGMENTS.map((s) => {
                        const value = segmentValue(totals, s.key);
                        if (value === 0) return null;
                        const pct = (value / totals.totalTokens) * 100;
                        return (
                          <div
                            key={s.key}
                            title={`${s.label}: ${exact.format(value)} (${pct.toFixed(1)}%)`}
                            style={{
                              width: `${pct}%`,
                              backgroundColor: s.color,
                            }}
                            className="first:rounded-l last:rounded-r"
                          />
                        );
                      })}
                    </div>

                    <div className="mt-4 grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
                      {SEGMENTS.map((s) => {
                        const value = segmentValue(totals, s.key);
                        const pct = (value / totals.totalTokens) * 100;
                        return (
                          <div key={s.key} className="flex items-baseline gap-2.5">
                            <span
                              aria-hidden
                              className="mt-1 size-2.5 shrink-0 rounded-sm"
                              style={{ backgroundColor: s.color }}
                            />
                            <span
                              className="min-w-0 flex-1 truncate text-[0.9rem] text-text-secondary"
                              title={s.hint}
                            >
                              {s.label}
                            </span>
                            <span className="text-[0.9rem] tabular-nums text-text-primary">
                              {compact.format(value)}
                            </span>
                            <span className="w-11 text-right text-[0.857rem] tabular-nums text-text-tertiary">
                              {pct.toFixed(1)}%
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Table view — the same numbers, ungated by colour. */}
                  {data.byProject.length > 0 && (
                    <div className="mt-8">
                      <h3 className="mb-3 text-[0.95rem] font-medium text-text-secondary">
                        By project
                      </h3>
                      <div className="overflow-hidden rounded-xl border border-border">
                        {data.byProject.map((p, i) => (
                          <div
                            key={p.projectId}
                            className={cx(
                              "flex items-center gap-3 px-4 py-3",
                              i > 0 && "border-t border-border",
                            )}
                          >
                            <span className="min-w-0 flex-1 truncate text-[0.95rem] text-text-primary">
                              {p.name}
                            </span>
                            <span className="text-[0.857rem] tabular-nums text-text-tertiary">
                              {exact.format(p.messages)}{" "}
                              {p.messages === 1 ? "turn" : "turns"}
                            </span>
                            <span className="w-20 text-right text-[0.9rem] tabular-nums text-text-secondary">
                              {compact.format(p.totalTokens)}
                            </span>
                            <span className="w-16 text-right text-[0.9rem] tabular-nums text-text-primary">
                              {money(p.estimatedCostUsd)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {data.byModel.length > 1 && (
                    <div className="mt-8">
                      <h3 className="mb-3 text-[0.95rem] font-medium text-text-secondary">
                        By model
                      </h3>
                      <div className="overflow-hidden rounded-xl border border-border">
                        {data.byModel.map((m, i) => (
                          <div
                            key={m.model}
                            className={cx(
                              "flex items-center gap-3 px-4 py-3",
                              i > 0 && "border-t border-border",
                            )}
                          >
                            <span className="min-w-0 flex-1 truncate font-mono text-[0.857rem] text-text-primary">
                              {m.model}
                            </span>
                            <span className="w-20 text-right text-[0.9rem] tabular-nums text-text-secondary">
                              {compact.format(m.totalTokens)}
                            </span>
                            <span className="w-16 text-right text-[0.9rem] tabular-nums text-text-primary">
                              {money(m.estimatedCostUsd)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <p className="mt-6 text-[0.857rem] text-text-tertiary">
                    Costs are estimates from published model list prices, not an
                    invoice. Usage covers editor chat turns recorded since token
                    tracking was enabled.
                  </p>
                </>
              )
            )}
          </>
        )
      )}
    </div>
  );
}
