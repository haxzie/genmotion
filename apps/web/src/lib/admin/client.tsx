"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
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
type Status = "loading" | "signed-out" | "forbidden" | "ready";

interface AdminContextValue {
  status: Status;
  user: AdminUser | null;
  signInGoogle: () => void;
  signOutAdmin: () => Promise<void>;
}

const AdminContext = createContext<AdminContextValue | null>(null);

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [user, setUser] = useState<AdminUser | null>(null);

  const bootstrap = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/session`, {
        method: "POST",
        credentials: "include",
      });
      if (res.status === 403) return setStatus("forbidden");
      if (!res.ok) return setStatus("signed-out");
      const data = (await res.json()) as { token: string; user: AdminUser };
      adminToken = data.token;
      try {
        localStorage.setItem(TOKEN_KEY, data.token);
      } catch {
        /* private mode */
      }
      setUser(data.user);
      setStatus("ready");
    } catch {
      setStatus("signed-out");
    }
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
      callbackURL: "/admin",
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
    setStatus("signed-out");
  }, []);

  return (
    <AdminContext.Provider value={{ status, user, signInGoogle, signOutAdmin }}>
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
