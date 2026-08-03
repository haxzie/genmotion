"use client";

import { useCallback, useEffect, useState } from "react";
import {
  PLANS,
  planPrice,
  type LimitKind,
  type LimitSnapshot,
  type PlanId,
} from "@genmotion/shared";
import { api } from "@/lib/api";
import { track } from "@/lib/analytics";
import { openBillingPortal, startCheckout } from "@/lib/billing";
import { Spinner, cx } from "@/components/ui";

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

interface UsageResponse {
  plan: { id: PlanId; name: string; seats: number; canInvite: boolean };
  subscription: Subscription;
  limits: LimitSnapshot;
  period: { start: string; end: string };
  totals: UsageTotals & { estimatedCostUsd: number };
  byModel: ModelUsage[];
  byProject: ProjectUsage[];
}

/** Status pill — colour follows the state, not the plan. */
function PlanStatusPill({ subscription }: { subscription: Subscription }) {
  const dunning = subscription.status === "on_hold";
  const ending = subscription.cancelAtPeriodEnd;
  const label = dunning ? "Payment issue" : ending ? "Ending" : "Active";
  return (
    <span
      className={cx(
        "rounded-full px-2 py-0.5 text-[0.786rem]",
        dunning
          ? "bg-orange-muted text-warning"
          : ending
            ? "bg-surface-hover text-text-secondary"
            : "bg-green-muted text-success",
      )}
    >
      {label}
    </span>
  );
}

function renewalLine(s: Subscription): string | null {
  if (!s.paid || !s.currentPeriodEnd) return null;
  const when = new Date(s.currentPeriodEnd).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return s.cancelAtPeriodEnd ? `Access ends ${when}` : `Renews ${when}`;
}

const LIMIT_ROWS: Array<{ kind: LimitKind; label: string; note: string }> = [
  { kind: "projects", label: "Projects", note: "Total" },
  { kind: "exports", label: "Exports", note: "This month" },
  { kind: "aiTurns", label: "AI messages", note: "This month" },
];

/** A quota as a filled track. One hue, more-is-fuller — no colour coding until
 *  it's actually exhausted, where the state (not a series) earns a colour.
 *  An unlimited quota has no cap to fill, so it renders as a flat muted rail. */
function LimitMeter({ used, max }: { used: number; max: number | null }) {
  if (max === null) {
    return <div className="mt-2 h-1.5 rounded-full bg-surface-hover" />;
  }
  const pct = max === 0 ? 0 : Math.min(100, (used / max) * 100);
  const full = used >= max;
  return (
    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-hover">
      <div
        className={cx("h-full rounded-full", full ? "bg-warning" : "bg-accent")}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/**
 * Stack order is load-bearing, not decorative: these four hues were validated
 * for colour-vision separation in this order. Blue and purple adjacent are
 * nearly identical under deuteranopia, so green sits between them. Reordering
 * without re-validating will quietly break that.
 */
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

/** The plans a checkout can move this org to, cheapest first. */
const PURCHASABLE = ["pro", "team"] as const;

/**
 * A single plan, priced and buyable on its own. The price is repeated in the
 * button because that button starts a paid checkout — what you're about to be
 * charged should be legible at the point of commitment, not only in the
 * heading above it.
 */
function PlanCard({
  plan,
  busy,
  disabled,
  onSelect,
}: {
  plan: (typeof PURCHASABLE)[number];
  busy: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  const def = PLANS[plan];
  const featured = plan === "pro";
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
        {plan === "pro"
          ? "Every limit removed, for one person."
          : `Everything in Pro, for up to ${def.seats} seats.`}
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
        {busy ? (
          <Spinner />
        ) : (
          `Upgrade to ${def.name} — ${planPrice(plan)}/mo`
        )}
      </button>
    </div>
  );
}

export default function BillingPage() {
  const [data, setData] = useState<UsageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkoutBusy, setCheckoutBusy] = useState<"pro" | "team" | null>(null);
  const [portalBusy, setPortalBusy] = useState(false);
  const [activating, setActivating] = useState(false);

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
  }, [load]);

  /**
   * Returning from checkout, the subscription webhook usually lands within a
   * second — but it is not synchronous with the redirect, so the page can load
   * while the org is still on Free. Poll briefly rather than show a stale plan.
   */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") !== "success") return;

    setActivating(true);
    let attempts = 0;
    const timer = setInterval(async () => {
      attempts += 1;
      const fresh = await load();
      const done = fresh ? fresh.plan.id !== "free" : false;
      if (done || attempts >= 15) {
        clearInterval(timer);
        setActivating(false);
        if (done) track("upgrade_plan_activated", { plan: fresh!.plan.id });
        // Drop the query param so a refresh doesn't poll again.
        window.history.replaceState({}, "", window.location.pathname);
      }
    }, 2000);
    return () => clearInterval(timer);
  }, [load]);

  const totals = data?.totals;
  const hasUsage = (totals?.totalTokens ?? 0) > 0;
  // Never offer the plan they're already on; on Team there's nothing above it.
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
            {activating && (
              <div className="mb-4 rounded-xl border border-accent/40 bg-accent-muted/40 px-5 py-4 text-[0.9rem] text-text-secondary">
                Activating your plan… this usually takes a few seconds.
              </div>
            )}

            {/* Current plan, plus the billing portal once there's something to
                manage. Upgrade options get their own cards further down. */}
            <div
              className={cx(
                "grid gap-4",
                data.subscription.manageable && "sm:grid-cols-2",
              )}
            >
              <div className="rounded-xl border border-border bg-surface-raised p-5">
                <div className="flex items-center gap-2">
                  <span className="text-[0.857rem] text-text-tertiary">
                    Current plan
                  </span>
                  <PlanStatusPill subscription={data.subscription} />
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
                {renewalLine(data.subscription) && (
                  <p className="mt-3 text-[0.857rem] text-text-tertiary">
                    {renewalLine(data.subscription)}
                  </p>
                )}
              </div>

              {data.subscription.manageable ? (
                <div className="rounded-xl border border-border bg-surface-raised p-5">
                  <span className="text-[0.857rem] text-text-tertiary">
                    Billing
                  </span>
                  <p className="mt-1.5 font-display text-xl font-semibold tracking-tight">
                    Manage subscription
                  </p>
                  <p className="mt-2 text-[0.9rem] text-text-secondary">
                    Update your payment method, download invoices, or cancel.
                  </p>
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
                </div>
              ) : null}
            </div>

            {/* One card per purchasable plan the org isn't already on, so each
                plan states its own price and features instead of sharing a box. */}
            {upgradable.length > 0 && (
              <>
                <h2 className="mb-3 mt-10 text-[0.95rem] font-medium text-text-secondary">
                  {data.subscription.paid ? "Change plan" : "Upgrade"}
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
                      busy={checkoutBusy === p}
                      disabled={checkoutBusy !== null}
                      onSelect={async () => {
                        setCheckoutBusy(p);
                        setError(null);
                        try {
                          await startCheckout(p);
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

            {/* Plan allowances */}
            <h2 className="mb-3 mt-10 text-[0.95rem] font-medium text-text-secondary">
              Plan limits
            </h2>
            <div className="grid gap-4 sm:grid-cols-3">
              {LIMIT_ROWS.map(({ kind, label, note }) => {
                const l = data.limits[kind];
                return (
                  <div
                    key={kind}
                    className="rounded-xl border border-border bg-surface-raised px-5 py-4"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-[0.857rem] text-text-tertiary">{label}</p>
                      <p className="text-[0.786rem] text-text-tertiary">{note}</p>
                    </div>
                    <p className="mt-1 text-xl tabular-nums text-text-primary">
                      {exact.format(l.used)}
                      {!l.unlimited && (
                        <span className="text-text-tertiary">
                          {" "}
                          / {exact.format(l.max ?? 0)}
                        </span>
                      )}
                    </p>
                    <LimitMeter used={l.used} max={l.max} />
                    <p className="mt-2 text-[0.857rem] text-text-tertiary">
                      {l.unlimited
                        ? "Unlimited"
                        : (l.remaining ?? 0) > 0
                          ? `${exact.format(l.remaining ?? 0)} left`
                          : "Limit reached"}
                    </p>
                  </div>
                );
              })}
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
