"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@/components/ui";

const ITEMS = [
  { label: "Brand Assets", href: "/settings/brand-assets" },
  { label: "Members", href: "/settings/members" },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-full">
      <aside className="w-56 shrink-0 border-r border-border p-3">
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
                  "rounded-md px-3 py-2 text-[0.95rem] transition-colors duration-150",
                  active
                    ? "bg-surface-raised text-text-primary"
                    : "text-text-secondary hover:bg-surface-raised hover:text-text-primary",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
