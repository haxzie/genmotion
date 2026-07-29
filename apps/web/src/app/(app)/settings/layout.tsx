"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@/components/ui";

type IconProps = { className?: string };

// lucide: credit-card
function CreditCardIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
    </svg>
  );
}

// lucide: users
function UsersIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

const ITEMS = [
  { label: "Members", href: "/settings/members", Icon: UsersIcon },
  { label: "Billing", href: "/settings/billing", Icon: CreditCardIcon },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    // Own the full height and keep the scroll inside the content column, so the
    // nav stays put instead of riding the page scroll from AppShell.
    <div className="flex h-full overflow-hidden">
      <aside className="w-56 shrink-0 overflow-y-auto border-r border-border p-3">
        <h2 className="px-3 pb-2 pt-2 text-[0.786rem] font-medium uppercase tracking-wide text-text-tertiary">
          Settings
        </h2>
        <nav className="flex flex-col gap-0.5">
          {ITEMS.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cx(
                  "flex items-center gap-2.5 rounded-md px-3 py-2 text-[0.95rem] transition-colors duration-150",
                  active
                    ? "bg-surface-raised text-text-primary"
                    : "text-text-secondary hover:bg-surface-raised hover:text-text-primary",
                )}
              >
                <item.Icon className="size-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="min-w-0 flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
