"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { cx } from "@/components/ui";

const LINKS = [
  { label: "Features", href: "/features" },
  { label: "Showcase", href: "/showcase" },
  { label: "Pricing", href: "/pricing" },
  { label: "Blog", href: "/blog" },
  { label: "About", href: "/about" },
] as const;

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
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
          "inline-flex h-9 items-center justify-center rounded-md px-3 text-[1rem] font-medium text-text-secondary transition-colors duration-150 hover:text-text-primary",
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
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cx(
                  "rounded-md px-3 py-1.5 text-[0.95rem] transition-colors duration-150",
                  isActive(pathname, link.href)
                    ? "text-text-primary"
                    : "text-text-secondary hover:text-text-primary",
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
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={cx(
                  "rounded-md px-3 py-2 text-[0.95rem] transition-colors duration-150",
                  isActive(pathname, link.href)
                    ? "bg-surface-raised text-text-primary"
                    : "text-text-secondary hover:bg-surface-raised hover:text-text-primary",
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
