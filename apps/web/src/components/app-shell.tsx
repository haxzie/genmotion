"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { signOut, useSession, organization } from "@/lib/auth-client";
import { cx } from "@/components/ui";

function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "team"
  );
}

type IconProps = { className?: string };

function PlusIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
// lucide: play
function PlayIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="6 3 20 12 6 21 6 3" />
    </svg>
  );
}
function Layers2Icon({ className }: IconProps) {
  // lucide: layers-2
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="m16.02 12 5.48 3.13a1 1 0 0 1 0 1.74L13 21.74a2 2 0 0 1-2 0l-8.5-4.87a1 1 0 0 1 0-1.74L7.98 12" />
      <path d="M13 13.74a2 2 0 0 1-2 0L2.5 8.87a1 1 0 0 1 0-1.74L11 2.26a2 2 0 0 1 2 0l8.5 4.87a1 1 0 0 1 0 1.74Z" />
    </svg>
  );
}
function UserIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </svg>
  );
}
function ChevronDownIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
function SettingsIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="8" x2="20" y2="8" />
      <circle cx="9" cy="8" r="2.2" />
      <line x1="4" y1="16" x2="20" y2="16" />
      <circle cx="15" cy="16" r="2.2" />
    </svg>
  );
}
function LogOutIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}

const NAV = [
  { label: "Create", href: "/dashboard", Icon: PlusIcon },
  { label: "Projects", href: "/projects", Icon: PlayIcon },
  { label: "Templates", href: "/templates", Icon: Layers2Icon },
  { label: "Settings", href: "/settings", Icon: SettingsIcon },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function CheckIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function OrgPicker() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const activeOrgId = session?.session.activeOrganizationId ?? null;
  const [orgs, setOrgs] = useState<{ id: string; name: string }[]>([]);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    const res = await organization.list();
    setOrgs((res.data as { id: string; name: string }[] | undefined) ?? []);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const active = orgs.find((o) => o.id === activeOrgId) ?? orgs[0] ?? null;

  async function switchOrg(id: string) {
    setOpen(false);
    if (id === activeOrgId) return;
    await organization.setActive({ organizationId: id });
    // The active org lives in the session; every project/asset request now
    // scopes to it, so drop the cached data to refetch for the new org.
    await queryClient.invalidateQueries();
    router.push("/dashboard");
    router.refresh();
  }

  async function createTeam() {
    setOpen(false);
    const name = window.prompt("Team name")?.trim();
    if (!name) return;
    const res = await organization.create({
      name,
      slug: `${slugify(name)}-${crypto.randomUUID().slice(0, 8)}`,
    });
    if (res.data) {
      await organization.setActive({ organizationId: res.data.id });
      await load();
      await queryClient.invalidateQueries();
      router.push("/dashboard");
      router.refresh();
    }
  }

  return (
    <div className="relative min-w-0 flex-1">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cx(
          "flex w-full items-center gap-1 rounded-md px-2 py-1 transition-colors duration-150",
          open
            ? "bg-surface-raised text-text-primary"
            : "text-text-secondary hover:bg-surface-raised hover:text-text-primary",
        )}
      >
        <span className="min-w-0 flex-1 truncate text-left text-[0.95rem] font-medium">
          {active?.name ?? "…"}
        </span>
        <ChevronDownIcon
          className={cx("size-3.5 shrink-0 transition-transform duration-150", open && "rotate-180")}
        />
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div
            role="menu"
            className="absolute left-0 top-9 z-50 w-56 overflow-hidden rounded-lg border border-border bg-surface-raised py-1 shadow-[0_12px_40px_rgba(0,0,0,0.5)]"
          >
            <div className="px-3 pb-1 pt-1.5 text-[0.714rem] font-medium uppercase tracking-wide text-text-tertiary">
              Organizations
            </div>
            {orgs.map((o) => (
              <button
                key={o.id}
                type="button"
                role="menuitem"
                onClick={() => switchOrg(o.id)}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[0.95rem] text-text-secondary transition-colors duration-150 hover:bg-surface-hover hover:text-text-primary"
              >
                <span className="min-w-0 flex-1 truncate">{o.name}</span>
                {o.id === activeOrgId && (
                  <CheckIcon className="size-4 shrink-0 text-text-primary" />
                )}
              </button>
            ))}
            <div className="my-1 h-px bg-border" />
            <button
              type="button"
              role="menuitem"
              onClick={createTeam}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[0.95rem] text-text-secondary transition-colors duration-150 hover:bg-surface-hover hover:text-text-primary"
            >
              <PlusIcon className="size-4 shrink-0" />
              Create Team
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function UserMenu() {
  const router = useRouter();
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="User menu"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cx(
          "flex w-full items-center gap-2 rounded-md px-2 py-1.5 transition-colors duration-150",
          open
            ? "bg-surface-raised text-text-primary"
            : "text-text-secondary hover:bg-surface-raised hover:text-text-primary",
        )}
      >
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-raised ring-1 ring-border">
          <UserIcon className="size-[1.05rem]" />
        </span>
        <span className="min-w-0 flex-1 truncate text-left text-[0.857rem]">
          {session?.user.name?.trim() || session?.user.email || "Account"}
        </span>
        <ChevronDownIcon
          className={cx("size-3.5 shrink-0 transition-transform duration-150", open && "rotate-180")}
        />
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div
            role="menu"
            className="absolute bottom-full left-0 z-50 mb-1 w-56 overflow-hidden rounded-lg border border-border bg-surface-raised py-1 shadow-[0_12px_40px_rgba(0,0,0,0.5)]"
          >
            {session?.user.email && (
              <div className="truncate border-b border-border px-3 py-2 text-[0.857rem] text-text-tertiary">
                {session.user.email}
              </div>
            )}
            <Link
              href="/settings"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[0.95rem] text-text-secondary transition-colors duration-150 hover:bg-surface-hover hover:text-text-primary"
            >
              <SettingsIcon className="size-[1.05rem] shrink-0" />
              Settings
            </Link>
            <button
              type="button"
              role="menuitem"
              onClick={async () => {
                setOpen(false);
                await signOut();
                router.replace("/login");
              }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[0.95rem] text-text-secondary transition-colors duration-150 hover:bg-surface-hover hover:text-text-primary"
            >
              <LogOutIcon className="size-[1.05rem] shrink-0" />
              Log out
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-64 shrink-0 flex-col bg-background">
      <div className="flex h-14 items-center gap-1 px-3">
        <Link href="/dashboard" className="group flex shrink-0 items-center px-1" aria-label="Home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.svg"
            alt="GenMotion"
            className="size-6 rounded-[5px] group-hover:animate-[spin-once_0.6s_ease-in-out]"
          />
        </Link>
        <OrgPicker />
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 px-3 py-2">
        {NAV.map(({ label, href, Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              className={cx(
                "flex h-9 items-center gap-2.5 rounded-md px-3 text-[0.95rem] transition-colors duration-150",
                active
                  ? "bg-surface-raised text-text-primary"
                  : "text-text-secondary hover:bg-surface-raised hover:text-text-primary",
              )}
            >
              <Icon className="size-[1.05rem] shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-2">
        <UserMenu />
      </div>
    </aside>
  );
}

/** Sleek app chrome: sidebar + inset content panel (rounded top-left, bordered). */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-background text-text-primary">
      <Sidebar />
      <div className="min-w-0 flex-1 pt-2">
        <div className="h-full overflow-y-auto rounded-tl-lg border-l border-t border-border bg-surface">
          {children}
        </div>
      </div>
    </div>
  );
}
