"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";

/**
 * Drop-in on a public page: if the visitor already has a session, send them to
 * the app instead of showing marketing. Renders nothing. Mirrors the auth check
 * in the (app) layout. Logged-out visitors and crawlers keep the server HTML.
 */
export function RedirectIfAuthed({ to = "/dashboard" }: { to?: string }) {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  useEffect(() => {
    if (!isPending && session) router.replace(to);
  }, [session, isPending, router, to]);

  return null;
}
