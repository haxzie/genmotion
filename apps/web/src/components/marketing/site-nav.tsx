"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { cx } from "@/components/ui";
import { ColorIcon } from "@/components/marketing/icons";
import { USE_CASES } from "@/lib/marketing/use-cases";

const LINKS = [
  { label: "Showcase", href: "/showcase" },
  { label: "Pricing", href: "/pricing" },
  { label: "Blog", href: "/blog" },
  { label: "About", href: "/about" },
] as const;

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Desktop "Use Cases" dropdown — the label links to the index, the panel lists
 *  each use case (opens on hover). */
function UseCasesMenu({ pathname }: { pathname: string }) {
  const [open, setOpen] = useState(false);
  const active = isActive(pathname, "/use-cases");
  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <Link
        href="/use-cases"
        className={cx(
          "flex items-center gap-1 rounded-md px-3 py-1.5 text-[0.95rem] transition-colors duration-150",
          active ? "text-text-primary" : "text-text-secondary hover:text-green",
        )}
      >
        Use Cases
        <svg viewBox="0 0 24 24" className={cx("size-3.5 transition-transform duration-150", open && "rotate-180")} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </Link>
      {open && (
        <div className="absolute left-0 top-full pt-2">
          <div className="grid w-[24rem] gap-0.5 rounded-xl border border-border bg-surface p-2 shadow-xl">
            {USE_CASES.map((u) => (
              <Link
                key={u.slug}
                href={`/use-cases/${u.slug}`}
                className="flex items-start gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-surface-raised"
              >
                <ColorIcon
                  name={u.icon}
                  color={u.color}
                  className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md border"
                  iconClassName="size-4"
                />
                <span className="min-w-0">
                  <span className="block text-[0.9rem] font-medium text-text-primary">
                    {u.navLabel}
                  </span>
                  <span className="block truncate text-[0.8rem] text-text-tertiary">
                    {u.tagline}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AuthCta({ stacked = false }: { stacked?: boolean }) {
  const { data: session, isPending } = useSession();

  if (!isPending && session) {
    return (
      <Link
        href="/dashboard"
        className={cx(
          "inline-flex h-9 items-center justify-center rounded-md bg-cta px-4 text-[1rem] font-medium text-background transition-colors duration-150 hover:bg-cta-hover",
          stacked && "w-full",
        )}
      >
        Go to dashboard
      </Link>
    );
  }

  return (
    <div className={cx("flex items-center gap-2", stacked && "w-full flex-col")}>
      <Link
        href="/login"
        className={cx(
          "inline-flex h-9 items-center justify-center rounded-md px-3 text-[1rem] font-medium text-text-secondary transition-colors duration-150 hover:text-green",
          stacked && "w-full",
        )}
      >
        Log in
      </Link>
      <Link
        href="/signup"
        className={cx(
          "inline-flex h-9 items-center justify-center rounded-md bg-cta px-4 text-[1rem] font-medium text-background transition-colors duration-150 hover:bg-cta-hover",
          stacked && "w-full",
        )}
      >
        Start free
      </Link>
    </div>
  );
}

export function SiteNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <nav className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-6">
        <div className="flex items-center gap-7">
          <Link href="/" className="group flex items-center gap-2" aria-label="GenMotion home">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.svg"
              alt=""
              className="size-6 rounded-[5px] group-hover:animate-[spin-once_0.6s_ease-in-out]"
            />
            <span className="font-logo text-[1.2rem] tracking-tight">
              GenMotion
            </span>
          </Link>
          <div className="hidden items-center gap-1 md:flex">
            <UseCasesMenu pathname={pathname} />
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cx(
                  "rounded-md px-3 py-1.5 text-[0.95rem] transition-colors duration-150",
                  isActive(pathname, link.href)
                    ? "text-text-primary"
                    : "text-text-secondary hover:text-green",
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="hidden md:block">
          <AuthCta />
        </div>

        <button
          type="button"
          aria-label="Toggle menu"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="flex size-9 items-center justify-center rounded-md text-text-secondary transition-colors duration-150 hover:bg-surface-raised hover:text-text-primary md:hidden"
        >
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            {open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </nav>

      {open && (
        <div className="border-t border-border bg-background px-6 py-4 md:hidden">
          <div className="flex flex-col gap-1">
            <Link
              href="/use-cases"
              onClick={() => setOpen(false)}
              className={cx(
                "rounded-md px-3 py-2 text-[0.95rem] transition-colors duration-150",
                isActive(pathname, "/use-cases")
                  ? "bg-surface-raised text-text-primary"
                  : "text-text-secondary hover:bg-surface-raised hover:text-green",
              )}
            >
              Use Cases
            </Link>
            <div className="mb-1 ml-2 flex flex-col gap-0.5 border-l border-border pl-2">
              {USE_CASES.map((u) => (
                <Link
                  key={u.slug}
                  href={`/use-cases/${u.slug}`}
                  onClick={() => setOpen(false)}
                  className="rounded-md px-3 py-1.5 text-[0.9rem] text-text-tertiary transition-colors hover:bg-surface-raised hover:text-green"
                >
                  {u.navLabel}
                </Link>
              ))}
            </div>
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={cx(
                  "rounded-md px-3 py-2 text-[0.95rem] transition-colors duration-150",
                  isActive(pathname, link.href)
                    ? "bg-surface-raised text-text-primary"
                    : "text-text-secondary hover:bg-surface-raised hover:text-green",
                )}
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-3 border-t border-border pt-3">
              <AuthCta stacked />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
