"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "@/lib/auth-client";
import { cx } from "@/components/ui";

type IconProps = { className?: string };

function SparklesIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6.3 6.3l2.4 2.4M15.3 15.3l2.4 2.4M17.7 6.3l-2.4 2.4M8.7 15.3l-2.4 2.4" />
    </svg>
  );
}
function GridIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}
function PaletteIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3a9 9 0 1 0 0 18c1 0 1.6-.8 1.6-1.7 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.1 0-.9.8-1.6 1.7-1.6H16a5 5 0 0 0 5-5c0-3.9-4-7.4-9-7.4Z" />
      <circle cx="7.5" cy="10.5" r="1" />
      <circle cx="12" cy="7.5" r="1" />
      <circle cx="16.5" cy="10.5" r="1" />
    </svg>
  );
}
function ZapIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2 4.5 13.5H11l-1 8.5L18.5 10.5H12l1-8.5Z" />
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
  { label: "Create", href: "/", Icon: SparklesIcon },
  { label: "Projects", href: "/projects", Icon: GridIcon },
  { label: "Brand Assets", href: "/brand-assets", Icon: PaletteIcon },
  { label: "Skills", href: "/skills", Icon: ZapIcon },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
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
          "flex h-8 items-center gap-0.5 rounded-md px-1.5 transition-colors duration-150",
          open
            ? "bg-surface-raised text-text-primary"
            : "text-text-secondary hover:bg-surface-raised hover:text-text-primary",
        )}
      >
        <UserIcon className="size-[1.15rem]" />
        <ChevronDownIcon
          className={cx("size-3.5 transition-transform duration-150", open && "rotate-180")}
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
            className="absolute right-0 top-9 z-50 w-52 overflow-hidden rounded-lg border border-border bg-surface-raised py-1 shadow-[0_12px_40px_rgba(0,0,0,0.5)]"
          >
            {session?.user.email && (
              <div className="truncate border-b border-border px-3 py-2 text-[0.857rem] text-text-tertiary">
                {session.user.email}
              </div>
            )}
            <button
              type="button"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[0.95rem] text-text-secondary transition-colors duration-150 hover:bg-surface-hover hover:text-text-primary"
            >
              <SettingsIcon className="size-[1.05rem] shrink-0" />
              Settings
            </button>
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
      <div className="flex h-14 items-center justify-between px-3">
        <Link href="/" className="group flex items-center px-2" aria-label="Home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.svg"
            alt="GenMotion"
            className="size-6 rounded-[5px] group-hover:animate-[spin-once_0.6s_ease-in-out]"
          />
        </Link>
        <UserMenu />
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
