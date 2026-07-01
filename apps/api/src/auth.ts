import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { magicLink, organization } from "better-auth/plugins";
import { db, schema, eq, asc } from "@genmotion/db";
import { env } from "./env";
import { sendEmail, emailEnabled } from "./mailer";
import { magicLinkEmail, inviteEmail } from "./emails";

const WEB_URL = env.WEB_URL;

// Only enable a provider once its credentials exist, so the API still boots in
// dev without OAuth secrets. Add GOOGLE_/GITHUB_ client id+secret to light them up.
const socialProviders: Record<string, { clientId: string; clientSecret: string }> = {};
if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
  socialProviders.google = {
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
  };
}
if (env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET) {
  socialProviders.github = {
    clientId: env.GITHUB_CLIENT_ID,
    clientSecret: env.GITHUB_CLIENT_SECRET,
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
 * Give every new user a personal organization (named from their name/email) and
 * make them its owner, so they always have an active org. Onboarding lets them
 * rename it. Inserts directly via drizzle to avoid depending on the auth API
 * during user creation.
 */
async function createDefaultOrg(u: { id: string; name: string; email: string }) {
  const base = (u.name?.trim() || u.email.split("@")[0] || "My").trim();
  const orgName = /s$/i.test(base) ? `${base}' Team` : `${base}'s Team`;
  const orgId = crypto.randomUUID();
  await db.insert(schema.organization).values({
    id: orgId,
    name: orgName,
    slug: `${slugify(base)}-${crypto.randomUUID().slice(0, 8)}`,
  });
  await db.insert(schema.member).values({
    id: crypto.randomUUID(),
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
    }),
  ],
  trustedOrigins: [WEB_URL],
});

export type AuthSession = typeof auth.$Infer.Session;
