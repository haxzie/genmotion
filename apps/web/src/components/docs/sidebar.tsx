"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavGroup } from "@/lib/docs/content";
import { cx } from "@/lib/cx";

export function DocsSidebarNav({ nav, onNavigate }: { nav: NavGroup[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Documentation" className="flex flex-col gap-7 text-[0.9rem]">
      {nav.map((group) => (
        <div key={group.group}>
          <h2 className="mb-2 px-3 text-[0.75rem] font-semibold uppercase tracking-[0.12em] text-text-tertiary">
            {group.group}
          </h2>
          <ul className="flex flex-col gap-0.5">
            {group.items.map((item) => {
              const active = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cx(
                      "block rounded-lg px-3 py-1.5 transition-colors duration-150",
                      active
                        ? "bg-green-muted font-medium text-green"
                        : "text-text-secondary hover:bg-surface-raised hover:text-text-primary",
                    )}
                  >
                    {item.title}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
