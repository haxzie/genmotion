import { env } from "../env";

/** Parsed, lowercased allowlist of admin email domains (from ADMIN_EMAIL_DOMAINS). */
const ALLOWED = env.ADMIN_EMAIL_DOMAINS.split(",")
  .map((d) => d.trim().toLowerCase().replace(/^@/, ""))
  .filter(Boolean);

/** Whether an email belongs to an allowlisted admin domain. */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const domain = email.trim().toLowerCase().split("@")[1];
  return !!domain && ALLOWED.includes(domain);
}
