import { headers } from "next/headers";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001";

interface ServerSession {
  user: { id: string; email: string; name?: string | null };
}

/**
 * Validate the caller's session on the SERVER by forwarding their cookies to the
 * API's better-auth endpoint. Lets pages (e.g. the marketing home) redirect
 * authed visitors before any HTML is sent — no client-side flash. Returns null
 * for logged-out visitors and crawlers.
 */
export async function getServerSession(): Promise<ServerSession | null> {
  const cookie = (await headers()).get("cookie") ?? "";
  if (!cookie) return null;
  try {
    const res = await fetch(`${API_URL}/api/auth/get-session`, {
      headers: { cookie },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as ServerSession | null;
    return data?.user ? data : null;
  } catch {
    // Never block rendering the public page on an auth-service hiccup.
    return null;
  }
}
