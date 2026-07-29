import { randomUUID } from "node:crypto";
import { db, schema } from "@genmotion/db";
import type { PlanId, SubscriptionStatus } from "@genmotion/shared";

/**
 * Row builders for the integration suite.
 *
 * Every factory that writes a dated row takes an explicit `createdAt` so tests
 * can straddle the LIMITS_LIVE_AT cutoff and month boundaries without stubbing
 * the clock.
 */

let seq = 0;
/** Short, collision-free ids — the suite truncates between tests anyway. */
function uid(prefix: string): string {
  seq += 1;
  return `${prefix}-${seq}-${randomUUID().slice(0, 8)}`;
}

export async function createUser(
  overrides: Partial<typeof schema.user.$inferInsert> = {},
) {
  const id = overrides.id ?? uid("user");
  const [row] = await db
    .insert(schema.user)
    .values({
      id,
      name: overrides.name ?? "Test User",
      email: overrides.email ?? `${id}@example.test`,
      emailVerified: true,
      onboardingCompleted: true,
      ...overrides,
    })
    .returning();
  return row!;
}

/**
 * An organization plus its owner member row — the same pair better-auth's
 * `createDefaultOrg` hook writes on signup, so tests start from the shape the
 * app actually produces.
 */
export async function createOrg(
  opts: { ownerId?: string; name?: string } = {},
): Promise<{ orgId: string; ownerId: string }> {
  const ownerId = opts.ownerId ?? (await createUser()).id;
  const id = uid("org");
  await db.insert(schema.organization).values({
    id,
    name: opts.name ?? "Test Org",
    slug: id,
  });
  await db.insert(schema.member).values({
    id: uid("member"),
    organizationId: id,
    userId: ownerId,
    role: "owner",
  });
  return { orgId: id, ownerId };
}

export async function addMember(
  organizationId: string,
  role: "owner" | "admin" | "member" = "member",
  userId?: string,
): Promise<string> {
  const uidToAdd = userId ?? (await createUser()).id;
  await db.insert(schema.member).values({
    id: uid("member"),
    organizationId,
    userId: uidToAdd,
    role,
  });
  return uidToAdd;
}

/** Adds `count` extra members, so seat-cap tests read as one line. */
export async function addMembers(
  organizationId: string,
  count: number,
): Promise<void> {
  for (let i = 0; i < count; i++) await addMember(organizationId);
}

export async function createPendingInvitation(
  organizationId: string,
  opts: { email?: string; inviterId: string; expiresAt?: Date; status?: string },
) {
  const [row] = await db
    .insert(schema.invitation)
    .values({
      id: uid("invite"),
      organizationId,
      email: opts.email ?? `${uid("invitee")}@example.test`,
      role: "member",
      status: opts.status ?? "pending",
      // Default well into the future; pass a past date to test expiry.
      expiresAt: opts.expiresAt ?? new Date(Date.now() + 48 * 3600 * 1000),
      inviterId: opts.inviterId,
    })
    .returning();
  return row!;
}

export async function createProject(
  organizationId: string,
  opts: { userId: string; createdAt?: Date; name?: string },
) {
  const [row] = await db
    .insert(schema.projects)
    .values({
      userId: opts.userId,
      organizationId,
      name: opts.name ?? "Test project",
      ...(opts.createdAt ? { createdAt: opts.createdAt } : {}),
    })
    .returning();
  return row!;
}

export async function createExportJob(
  projectId: string,
  opts: {
    userId: string;
    status?: "queued" | "rendering" | "done" | "failed" | "cancelled";
    createdAt?: Date;
  },
) {
  const [row] = await db
    .insert(schema.exportJobs)
    .values({
      projectId,
      userId: opts.userId,
      status: opts.status ?? "done",
      ...(opts.createdAt ? { createdAt: opts.createdAt } : {}),
    })
    .returning();
  return row!;
}

export async function createChatMessage(
  projectId: string,
  opts: { role?: "user" | "assistant" | "system"; createdAt?: Date } = {},
) {
  const [row] = await db
    .insert(schema.chatMessages)
    .values({
      id: uid("msg"),
      projectId,
      role: opts.role ?? "user",
      parts: [{ type: "text", text: "hello" }],
      ...(opts.createdAt ? { createdAt: opts.createdAt } : {}),
    })
    .returning();
  return row!;
}

/** Puts an org on a plan directly, bypassing checkout and webhooks. */
export async function setSubscription(
  organizationId: string,
  opts: {
    plan: PlanId;
    status: SubscriptionStatus | string;
    currentPeriodEnd?: Date | null;
    cancelAtPeriodEnd?: boolean;
    dodoCustomerId?: string | null;
    dodoSubscriptionId?: string | null;
    dodoProductId?: string | null;
    seats?: number;
    lastEventAt?: Date | null;
  },
) {
  const [row] = await db
    .insert(schema.organizationSubscriptions)
    .values({
      organizationId,
      plan: opts.plan,
      status: opts.status,
      seats: opts.seats ?? 1,
      currentPeriodEnd: opts.currentPeriodEnd ?? null,
      cancelAtPeriodEnd: opts.cancelAtPeriodEnd ?? false,
      dodoCustomerId: opts.dodoCustomerId ?? null,
      dodoSubscriptionId: opts.dodoSubscriptionId ?? null,
      dodoProductId: opts.dodoProductId ?? null,
      lastEventAt: opts.lastEventAt ?? null,
    })
    .returning();
  return row!;
}
