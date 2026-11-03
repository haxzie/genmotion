import { eq, db, schema } from "@genmotion/db";
import { PLANS } from "@genmotion/shared";
import { entitlementsFromRow, getSubscriptionRow } from "./entitlements";
import { env } from "./env";

/**
 * The mailing list, over the Mails HTTP API — the single place the API writes
 * a contact.
 *
 * Two moments reach it, and only two: an account is created (the contact is
 * added, on the free plan) and an organization's subscription changes (the
 * contact's `plan`/`mrr` are merged into what is already stored). Everything
 * else about a person — their name, what they have made — belongs to the
 * product, not to a marketing list.
 *
 * Fire-and-forget by design, like the Slack feeds: a signup must not fail
 * because a list is down, and a webhook that has already applied its state
 * change must still be acked. Failures go to the log, not the caller — which
 * is why nothing here throws.
 *
 * Inert until `MAILS_API_KEY` is set, so local and test runs write nothing.
 */

const BASE_URL = env.MAILS_API_URL.replace(/\/+$/, "");

export const mailsEnabled = Boolean(env.MAILS_API_KEY);

/**
 * `POST` creates or overwrites; `PATCH` merges. Updates are always PATCH, so
 * a property we don't send (and anything the list itself keeps, like consent)
 * survives — an upgrade must not wipe a contact's other keys.
 */
async function request(
  method: "POST" | "PATCH",
  path: string,
  body: unknown,
): Promise<void> {
  const key = env.MAILS_API_KEY;
  if (!key) return;
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${key}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) {
      console.error(
        `[mails] ${method} ${path} answered ${res.status}: ${(await res.text()).slice(0, 200)}`,
      );
    }
  } catch (err) {
    console.error(
      `[mails] ${method} ${path} failed:`,
      err instanceof Error ? err.message : err,
    );
  }
}

/**
 * Split a display name into the two fields the list stores. better-auth gives
 * us one string (and OAuth sometimes gives us nothing), so the last word is
 * the surname and everything before it the first name.
 */
function splitName(name: string | null | undefined): {
  firstName?: string;
  lastName?: string;
} {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return {};
  if (parts.length === 1) return { firstName: parts[0] };
  return {
    firstName: parts.slice(0, -1).join(" "),
    lastName: parts.at(-1),
  };
}

/**
 * Add a new account to the list. Called from the user-created database hook —
 * the one place a signup is seen exactly once — so this is a create, not an
 * upsert in disguise: `POST` replaces the stored properties, which is correct
 * for an address that has just come into existence.
 */
export function addContact(user: {
  email: string;
  name?: string | null;
  createdAt?: Date;
}): void {
  if (!mailsEnabled) return;
  void request("POST", "/v1/contacts", {
    email: user.email,
    ...splitName(user.name),
    properties: {
      plan: "free",
      signed_up_at: (user.createdAt ?? new Date()).toISOString(),
    },
    ...(env.MAILS_LIST_ID ? { lists: [env.MAILS_LIST_ID] } : {}),
  });
}

/** Merge properties into one contact, leaving every other key alone. */
export function updateContact(
  email: string,
  properties: Record<string, unknown>,
): void {
  if (!mailsEnabled) return;
  void request("PATCH", `/v1/contacts/${encodeURIComponent(email)}`, {
    properties,
  });
}

/**
 * Push an organization's subscription state onto its members' contacts.
 *
 * The plan comes from `getEntitlements`, not from the webhook payload: it is
 * the same answer the product gates on — so a cancelled subscription with
 * paid days left is still Pro on the list, and the churn shows up as
 * `plan_status` instead. Reading committed state also means a stale or
 * superseded delivery cannot move a contact backwards.
 *
 * `plan` goes on every member — a teammate on Max is a customer, and that is
 * what segmentation is for — but `mrr` goes on the owner alone, because the
 * organization pays once. Summing `mrr` across contacts should give the actual
 * monthly revenue, not five copies of it.
 */
export async function syncSubscription(organizationId: string): Promise<void> {
  if (!mailsEnabled) return;

  const row = await getSubscriptionRow(organizationId);
  // No row means the org never bought anything, which is nothing to report:
  // the contact has been on `free` since it was added.
  if (!row) return;

  const entitlements = entitlementsFromRow(organizationId, row);
  const { plan } = entitlements;

  const members = await db
    .select({ email: schema.user.email, role: schema.member.role })
    .from(schema.member)
    .innerJoin(schema.user, eq(schema.member.userId, schema.user.id))
    .where(eq(schema.member.organizationId, organizationId));
  const mrr = plan === "free" ? 0 : PLANS[plan].priceUsd;
  // Who the mrr is attributed to. An org always has an owner; fall back to the
  // first member rather than dropping the revenue on the floor if it somehow
  // does not.
  const billed =
    members.find((m) => m.role === "owner")?.email ?? members[0]?.email;

  for (const m of members) {
    updateContact(m.email, {
      plan,
      plan_status: entitlements.status,
      cancels_at_period_end: entitlements.cancelAtPeriodEnd,
      ...(m.email === billed ? { mrr } : {}),
    });
  }
}
