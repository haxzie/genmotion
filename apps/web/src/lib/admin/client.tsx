"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001";
const TOKEN_KEY = "gm-admin-token";

// Module-level so the plain adminApi() fetcher can read it without prop-drilling.
let adminToken: string | null = null;

export class AdminApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Fetch an admin API path, attaching the Bearer admin token. */
export async function adminApi<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}/api/admin${path}`, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      ...(adminToken ? { authorization: `Bearer ${adminToken}` } : {}),
    },
  });
  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      /* non-JSON */
    }
    throw new AdminApiError(res.status, message);
  }
  return res.json() as Promise<T>;
}

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  image: string | null;
};
/**
 * `unreachable` is deliberately distinct from `signed-out`: a CORS rejection or
 * a down API used to surface as "please sign in", which sends you off signing in
 * again over and over for a problem no sign-in can fix.
 */
type Status = "loading" | "signed-out" | "forbidden" | "unreachable" | "ready";

interface AdminContextValue {
  status: Status;
  user: AdminUser | null;
  /** Why the bootstrap failed — the server's message, shown on the gate. */
  reason: string | null;
  /** The signed-in address, when it's the reason we were refused. */
  deniedEmail: string | null;
  signInGoogle: () => void;
  signOutAdmin: () => Promise<void>;
}

const AdminContext = createContext<AdminContextValue | null>(null);

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [user, setUser] = useState<AdminUser | null>(null);
  const [reason, setReason] = useState<string | null>(null);
  const [deniedEmail, setDeniedEmail] = useState<string | null>(null);

  const bootstrap = useCallback(async () => {
    let res: Response;
    try {
      res = await fetch(`${API_URL}/api/admin/session`, {
        method: "POST",
        credentials: "include",
      });
    } catch (err) {
      // Never reached the API at all — wrong NEXT_PUBLIC_API_URL, a CORS origin
      // mismatch, or the server being down. Signing in again cannot help.
      setReason(
        `Couldn't reach the API at ${API_URL}. ${
          err instanceof Error ? err.message : "Network request failed."
        }`,
      );
      return setStatus("unreachable");
    }

    const body = (await res.json().catch(() => null)) as
      | { token?: string; user?: AdminUser; error?: string; email?: string }
      | null;

    if (res.status === 403) {
      setDeniedEmail(body?.email ?? null);
      setReason(body?.error ?? "This account isn't authorized for the admin area.");
      return setStatus("forbidden");
    }
    if (!res.ok || !body?.token || !body.user) {
      setReason(body?.error ?? `Sign-in check failed (HTTP ${res.status}).`);
      return setStatus("signed-out");
    }

    adminToken = body.token;
    try {
      localStorage.setItem(TOKEN_KEY, body.token);
    } catch {
      /* private mode */
    }
    setUser(body.user);
    setReason(null);
    setStatus("ready");
  }, []);

  useEffect(() => {
    // Hydrate any prior token so adminApi() works before bootstrap resolves.
    try {
      adminToken = localStorage.getItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
    void bootstrap();
  }, [bootstrap]);

  const signInGoogle = useCallback(() => {
    void authClient.signIn.social({
      provider: "google",
      // Must be absolute: the auth client's baseURL is the API origin, so a
      // relative path would send the browser to <api-host>/admin, which 404s.
      callbackURL: `${window.location.origin}/admin`,
    });
  }, []);

  const signOutAdmin = useCallback(async () => {
    adminToken = null;
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
    await authClient.signOut();
    setUser(null);
    setReason(null);
    setDeniedEmail(null);
    setStatus("signed-out");
  }, []);

  return (
    <AdminContext.Provider
      value={{ status, user, reason, deniedEmail, signInGoogle, signOutAdmin }}
    >
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin(): AdminContextValue {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used within AdminProvider");
  return ctx;
}

export type AdminPage<T> = { items: T[]; nextCursor: string | null };

/**
 * Keyset-paginated admin list → infinite scroll. `path` is the admin API path
 * (may include a query string). Returns the flattened `items` plus the raw query
 * (fetchNextPage/hasNextPage/…). Pass `refetchInterval(items)` to poll.
 */
export function useAdminInfinite<T>(
  key: string[],
  path: string,
  refetchInterval?: (items: T[]) => number | false,
) {
  const query = useInfiniteQuery({
    queryKey: ["admin", ...key],
    queryFn: ({ pageParam }) => {
      const sep = path.includes("?") ? "&" : "?";
      const url = pageParam
        ? `${path}${sep}cursor=${encodeURIComponent(pageParam)}`
        : path;
      return adminApi<AdminPage<T>>(url);
    },
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    ...(refetchInterval
      ? {
          refetchInterval: (q: {
            state: { data?: { pages: AdminPage<T>[] } };
          }) =>
            refetchInterval((q.state.data?.pages ?? []).flatMap((p) => p.items)),
        }
      : {}),
  });
  const items = query.data?.pages.flatMap((p) => p.items) ?? [];
  return { ...query, items };
}

/**
 * Single admin record, fetched lazily. Pass `null` for `path` while nothing is
 * selected so opening a list doesn't fetch a detail nobody asked for.
 */
export function useAdminDetail<T>(key: Array<string | null>, path: string | null) {
  return useQuery({
    queryKey: ["admin", ...key],
    queryFn: () => adminApi<T>(path!),
    enabled: Boolean(path),
    staleTime: 30_000,
  });
}

/**
 * Sentinel that calls `onReach` when scrolled into view (with a 300px margin) —
 * drop it at the end of a list to trigger the next page. `enabled` is typically
 * `hasNextPage`.
 */
export function InfiniteSentinel({
  onReach,
  enabled,
}: {
  onReach: () => void;
  enabled: boolean;
}) {
  const cb = useRef(onReach);
  cb.current = onReach;
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!enabled) return;
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) cb.current();
      },
      { rootMargin: "300px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [enabled]);
  return <div ref={ref} aria-hidden className="h-1 w-full" />;
}
