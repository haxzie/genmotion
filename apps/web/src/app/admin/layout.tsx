"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button, Spinner, cx } from "@/components/ui";
import { AdminProvider, useAdmin } from "@/lib/admin/client";

const NAV = [
  { href: "/admin", label: "Dashboard", exact: true, icon: GridIcon },
  { href: "/admin/organizations", label: "Organisations", icon: BuildingIcon },
  { href: "/admin/users", label: "Users", icon: UsersIcon },
  { href: "/admin/projects", label: "Projects", icon: LayersIcon },
  { href: "/admin/videos", label: "Videos", icon: FilmIcon },
  { href: "/admin/renders", label: "Render Queue", icon: QueueIcon },
];

function AdminShell({ children }: { children: React.ReactNode }) {
  const { status, user, reason, deniedEmail, signInGoogle, signOutAdmin } = useAdmin();
  const pathname = usePathname();

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Spinner className="size-6 text-text-tertiary" />
      </div>
    );
  }

  if (status !== "ready") {
    const forbidden = status === "forbidden";
    const unreachable = status === "unreachable";
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-8 text-center">
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            GenMotion Admin
          </h1>
          <p className="mt-2 text-[0.95rem] text-text-secondary">
            {forbidden
              ? "This Google account isn't on the admin allowlist."
              : unreachable
                ? "Couldn't reach the API."
                : "Sign in with your team Google account to continue."}
          </p>

          {/* The signed-in address is the answer to "why am I locked out" — it
              is almost always the wrong Google account, not a broken session. */}
          {forbidden && deniedEmail && (
            <p className="mt-3 truncate rounded-md border border-border bg-surface-raised px-3 py-2 font-mono text-[0.8rem] text-text-primary">
              {deniedEmail}
            </p>
          )}
          {unreachable && reason && (
            <p className="mt-3 break-words rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-left text-[0.78rem] text-danger">
              {reason}
            </p>
          )}

          <div className="mt-6 flex flex-col gap-2">
            {!unreachable && (
              <Button className="w-full" onClick={signInGoogle}>
                Continue with Google
              </Button>
            )}
            {forbidden && (
              <button
                onClick={() => void signOutAdmin()}
                className="text-[0.85rem] text-text-tertiary hover:text-text-primary"
              >
                Sign out and use a different account
              </button>
            )}
            {unreachable && (
              <Button className="w-full" onClick={() => window.location.reload()}>
                Retry
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background text-text-primary">
      <aside className="flex w-56 shrink-0 flex-col border-r border-border bg-surface">
        <div className="px-5 py-5">
          <span className="font-display text-[1.05rem] font-semibold tracking-tight">
            GenMotion <span className="text-text-tertiary">Admin</span>
          </span>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 px-2.5">
          {NAV.map(({ href, label, exact, icon: Icon }) => {
            const active = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cx(
                  "flex items-center gap-2.5 rounded-md px-3 py-2 text-[0.9rem] font-medium transition-colors duration-150",
                  active
                    ? "bg-surface-hover text-text-primary"
                    : "text-text-secondary hover:bg-surface-raised hover:text-text-primary",
                )}
              >
                <Icon className="size-4 shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-border px-4 py-3">
          <p className="truncate text-[0.8rem] text-text-secondary" title={user?.email}>
            {user?.email}
          </p>
          <button
            onClick={() => void signOutAdmin()}
            className="mt-1 text-[0.8rem] text-text-tertiary hover:text-text-primary"
          >
            Sign out
          </button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-8 py-8">{children}</div>
      </main>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminProvider>
      <AdminShell>{children}</AdminShell>
    </AdminProvider>
  );
}

function GridIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}
function BuildingIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="3" width="16" height="18" rx="1" /><path d="M9 8h.01M15 8h.01M9 12h.01M15 12h.01M9 16h6" />
    </svg>
  );
}
function UsersIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
function LayersIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3 9 5-9 5-9-5 9-5" /><path d="m3 13 9 5 9-5" />
    </svg>
  );
}
function FilmIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M7 3v18M17 3v18M3 8h4M17 8h4M3 16h4M17 16h4" />
    </svg>
  );
}
function QueueIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 6h16M4 12h16M4 18h10" /><circle cx="19" cy="18" r="2" />
    </svg>
  );
}
