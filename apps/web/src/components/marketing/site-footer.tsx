import Link from "next/link";
import { Container } from "@/components/marketing/primitives";
import { USE_CASES } from "@/lib/marketing/use-cases";

const COLUMNS: { heading: string; links: { label: string; href: string }[] }[] = [
  {
    heading: "Product",
    links: [
      { label: "Features", href: "/features" },
      { label: "Pricing", href: "/pricing" },
      { label: "Free Tools", href: "/tools" },
      { label: "Dashboard", href: "/dashboard" },
    ],
  },
  {
    heading: "Use Cases",
    links: USE_CASES.map((u) => ({ label: u.navLabel, href: `/use-cases/${u.slug}` })),
  },
  {
    heading: "Resources",
    links: [
      { label: "Showcase", href: "/showcase" },
      { label: "Blog", href: "/blog" },
      { label: "Glossary", href: "/glossary" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Log in", href: "/login" },
      { label: "Start free", href: "/signup" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <Container className="py-14">
        <div className="grid gap-10 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          <div>
            <Link href="/" className="flex items-center gap-2" aria-label="GenMotion home">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.svg" alt="" className="size-6 rounded-[5px]" />
              <span className="font-display text-[1.05rem] font-semibold tracking-tight">
                GenMotion
              </span>
            </Link>
            <p className="mt-3 max-w-[14rem] text-[0.9rem] text-text-tertiary">
              The AI motion-video studio. Describe it, preview it frame-accurately,
              export a pixel-perfect MP4.
            </p>
          </div>
          {COLUMNS.map((col) => (
            <div key={col.heading}>
              <h3 className="text-[0.786rem] font-medium uppercase tracking-[0.14em] text-text-tertiary">
                {col.heading}
              </h3>
              <ul className="mt-4 flex flex-col gap-2.5">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-[0.95rem] text-text-secondary transition-colors duration-150 hover:text-green"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/footer-wordmark.svg"
            alt="GenMotion"
            className="h-auto w-full select-none"
            draggable={false}
          />
        </div>
        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-border pt-6 text-[0.857rem] text-text-tertiary sm:flex-row sm:items-center">
          <span>© {new Date().getFullYear()} GenMotion. All rights reserved.</span>
          <a
            href="https://x.com/haxzie_"
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-text-tertiary transition-colors duration-150 hover:text-green"
          >
            Made with love, by @haxzie
          </a>
        </div>
      </Container>
    </footer>
  );
}
