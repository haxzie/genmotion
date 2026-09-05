import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import {
  bearer,
  deviceAuthorization,
  magicLink,
  organization,
} from "better-auth/plugins";
import { APIError } from "better-auth/api";
import { db, schema, eq, asc } from "@genmotion/db";
import { DESKTOP_CLIENT_ID, TEAM_SEATS } from "@genmotion/shared";
import { assertCanInvite } from "./entitlements";
import { releaseSeats, syncSeats } from "./billing/seats";
import { env } from "./env";
import { trackServer } from "./analytics";
import { sendEmail, emailEnabled } from "./mailer";
import { magicLinkEmail, inviteEmail } from "./emails";

const WEB_URL = env.WEB_URL;

// Only enable a provider once its credentials exist, so the API still boots in
// dev without OAuth secrets. Add GOOGLE_/GITHUB_ client id+secret to light them up.
const socialProviders: Record<string, { clientId: string; clientSecret: string }> = {};
if (env.GOOGLE_OAUTH_CLIENT_ID && env.GOOGLE_OAUTH_CLIENT_SECRET) {
  socialProviders.google = {
    clientId: env.GOOGLE_OAUTH_CLIENT_ID,
    clientSecret: env.GOOGLE_OAUTH_CLIENT_SECRET,
  };
}
if (env.GITHUB_OAUTH_CLIENT_ID && env.GITHUB_OAUTH_CLIENT_SECRET) {
  socialProviders.github = {
    clientId: env.GITHUB_OAUTH_CLIENT_ID,
    clientSecret: env.GITHUB_OAUTH_CLIENT_SECRET,
  };
}

function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "org"
  );
}

/**
 * Short, URL-friendly random id (base62). At size 12 that's 62^12 ≈ 3×10^21
 * possibilities — collision-safe for our scale, and far shorter than a UUID.
 * Optionally namespaced (e.g. shortId("org") → "org_a1B2c3D4e5F6").
 */
const ID_ALPHABET =
  "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
function shortId(prefix?: string, size = 12): string {
  const bytes = crypto.getRandomValues(new Uint8Array(size));
  let out = "";
  for (let i = 0; i < size; i++) out += ID_ALPHABET[bytes[i]! % ID_ALPHABET.length];
  return prefix ? `${prefix}_${out}` : out;
}

/**
 * Give every new user a personal organization (named from their name/email) and
 * make them its owner, so they always have an active org. Onboarding lets them
 * rename it. Inserts directly via drizzle to avoid depending on the auth API
 * during user creation.
 */
async function createDefaultOrg(u: { id: string; name: string; email: string }) {
  const base = (u.name?.trim() || u.email.split("@")[0] || "My").trim();
  const orgName = /s$/i.test(base) ? `${base}' Team` : `${base}'s Team`;
  const orgId = shortId("org");
  await db.insert(schema.organization).values({
    id: orgId,
    name: orgName,
    slug: `${slugify(base)}-${shortId(undefined, 6)}`,
  });
  await db.insert(schema.member).values({
    id: shortId("mem"),
    organizationId: orgId,
    userId: u.id,
    role: "owner",
  });
}

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
      organization: schema.organization,
      member: schema.member,
      invitation: schema.invitation,
      deviceCode: schema.deviceCode,
    },
  }),
  user: {
    additionalFields: {
      onboardingCompleted: {
        type: "boolean",
        required: false,
        defaultValue: false,
        input: true,
      },
      jobRole: { type: "string", required: false, input: true },
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (createdUser) => {
          try {
            await createDefaultOrg(createdUser);
          } catch (err) {
            console.error("[auth] default org creation failed:", err);
          }
          // The one place a signup can be counted exactly once. Magic link and
          // OAuth both land on the same callback, so the browser cannot tell a
          // new account from a returning login; this hook runs only on insert.
          trackServer("user_signed_up", {
            distinctId: createdUser.id,
            person: {
              email: createdUser.email,
              name: createdUser.name,
              signed_up_at: createdUser.createdAt,
            },
          });
        },
      },
    },
    session: {
      create: {
        // Default the session's active org to the user's first membership.
        before: async (session) => {
          const [m] = await db
            .select({ organizationId: schema.member.organizationId })
            .from(schema.member)
            .where(eq(schema.member.userId, session.userId))
            .orderBy(asc(schema.member.createdAt))
            .limit(1);
          return {
            data: { ...session, activeOrganizationId: m?.organizationId ?? null },
          };
        },
      },
    },
  },
  // Email/password is intentionally disabled — sign-in is magic link + OAuth only.
  socialProviders,
  plugins: [
    /**
     * Lets `Authorization: Bearer <session token>` stand in for the session
     * cookie. The desktop app has no cookie jar and no shared registrable
     * domain with the API, so this is how it authenticates; the token it sends
     * is the very one `/device/token` hands back.
     */
    bearer(),

    /**
     * OAuth 2.0 Device Authorization Grant (RFC 8628) — how the desktop app
     * signs in. It cannot receive a redirect, so the browser does the sign-in
     * on the web app and the app polls for the resulting session.
     */
    deviceAuthorization({
      // Long enough to sign up from scratch in a browser, short enough that an
      // abandoned code is not left lying around.
      expiresIn: "10m",
      interval: "3s",
      verificationUri: `${WEB_URL}/device`,
      // Only our own desktop build may open a device request.
      validateClient: (clientId) => clientId === DESKTOP_CLIENT_ID,
      // Not a customization: the plugin validates its own options with a zod
      // schema that forgot to mark this field optional, so omitting it throws
      // at startup. An empty override merges to the plugin's own table.
      schema: {},
    }),

    magicLink({
      sendMagicLink: async ({ email, url }) => {
        // Dev fallback: with no SES sender configured, print the link to the
        // API logs so local sign-in works without email delivery.
        if (!emailEnabled) {
          console.log(`\n[auth] Magic link for ${email}:\n${url}\n`);
          return;
        }
        const { subject, html, text } = magicLinkEmail(url);
        await sendEmail({ to: email, subject, html, text });
      },
    }),
    organization({
      sendInvitationEmail: async (data) => {
        const url = `${WEB_URL}/accept-invitation/${data.id}`;
        const inviterName =
          data.inviter.user.name?.trim() || data.inviter.user.email;
        if (!emailEnabled) {
          console.log(
            `\n[auth] Invite ${data.email} to "${data.organization.name}":\n${url}\n`,
          );
          return;
        }
        const { subject, html, text } = inviteEmail({
          orgName: data.organization.name,
          inviterName,
          url,
        });
        await sendEmail({ to: data.email, subject, html, text });
      },

      /**
       * A hard ceiling, NOT the per-plan seat count. better-auth reuses this
       * value as the page size when listing members, so deriving it from the
       * org's plan would truncate the members list of an org whose plan later
       * lapsed. Plan-awareness lives in the hooks below.
       */
      membershipLimit: TEAM_SEATS,

      organizationHooks: {
        /**
         * The invite gate, and where seats are bought. better-auth awaits this
         * inline — before the invitation row is written and before the email
         * is sent — so throwing here rejects the invite cleanly, leaving no
         * row and sending nothing.
         *
         * A Pro org whose seats are all taken is not refused: the invite IS
         * the purchase. The subscription is resized to cover one more person
         * (prorated from today) and the invite goes ahead. Only when there is
         * nothing to resize — trial, on hold, ending — or the provider says no
         * does the invite fail, and then nothing has been charged.
         */
        beforeCreateInvitation: async ({ invitation }) => {
          const gate = await assertCanInvite(invitation.organizationId);
          if (gate.ok) return;

          if (gate.code === "SEAT_LIMIT_REACHED") {
            const bought = await syncSeats(invitation.organizationId, {
              minimum: gate.seats.used + 1,
              reason: "invite",
            });
            if (bought.ok) return;
            throw APIError.from(
              bought.code === "PROVIDER_ERROR" ? "BAD_GATEWAY" : "FORBIDDEN",
              {
                code:
                  bought.code === "PROVIDER_ERROR"
                    ? "SEAT_PURCHASE_FAILED"
                    : "SEAT_LIMIT_REACHED",
                message: bought.message,
              },
            );
          }

          throw APIError.from("FORBIDDEN", {
            code: gate.code,
            message: gate.message,
          });
        },

        /**
         * The other direction: someone leaving frees their seat, and the
         * subscription shrinks to match so the org stops paying for it. All
         * three are after-hooks and best-effort — the person is already gone,
         * and a provider hiccup must not fail the removal.
         */
        afterRemoveMember: async ({ member }) => {
          await releaseSeats(member.organizationId, "remove-member");
        },
        afterCancelInvitation: async ({ invitation }) => {
          await releaseSeats(invitation.organizationId, "cancel-invitation");
        },
        afterRejectInvitation: async ({ invitation }) => {
          await releaseSeats(invitation.organizationId, "reject-invitation");
        },

        /**
         * Backstop: an invitation can outlive the plan that authorised it, and
         * a race between two invitees can oversubscribe the last seat. Pending
         * invitations are excluded from the count here because the one being
         * accepted is itself pending and would otherwise count against itself.
         */
        beforeAcceptInvitation: async ({ invitation }) => {
          const gate = await assertCanInvite(invitation.organizationId, {
            includePendingInvitations: false,
          });
          if (!gate.ok) {
            throw APIError.from("FORBIDDEN", {
              code: gate.code,
              message: gate.message,
            });
          }
        },
      },
    }),
  ],
  trustedOrigins: [WEB_URL],
});

export type AuthSession = typeof auth.$Infer.Session;
