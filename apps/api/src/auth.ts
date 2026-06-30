import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { magicLink } from "better-auth/plugins";
import { db, schema } from "@genmotion/db";
import { env } from "./env";
import { sendEmail, emailEnabled } from "./mailer";
import { magicLinkEmail } from "./emails";

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
    },
  }),
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
  ],
  trustedOrigins: [WEB_URL],
});

export type AuthSession = typeof auth.$Infer.Session;
