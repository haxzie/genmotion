import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { magicLink } from "better-auth/plugins";
import { db, schema } from "@genmotion/db";
import { sendEmail, emailEnabled } from "./mailer";
import { magicLinkEmail } from "./emails";

const WEB_URL = process.env.WEB_URL ?? "http://localhost:4000";

// Only enable a provider once its credentials exist, so the API still boots in
// dev without OAuth secrets. Add GOOGLE_/GITHUB_ client id+secret to light them up.
const socialProviders: Record<string, { clientId: string; clientSecret: string }> = {};
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  socialProviders.google = {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  };
}
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  socialProviders.github = {
    clientId: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
  };
}

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:4001",
  secret: process.env.BETTER_AUTH_SECRET,
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
