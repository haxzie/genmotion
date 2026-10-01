import Link from "next/link";
import { DownloadButton } from "@/components/marketing/download-button";
import { DocsSearch } from "@/components/docs/search";
import { DocsSidebarNav } from "@/components/docs/sidebar";
import { DocsMobileNav } from "@/components/docs/mobile-nav";
import { getDocsNav, getSearchIndex } from "@/lib/docs/content";
import { DOCS_PATH } from "@/lib/marketing/setup";

const GITHUB_URL = "https://github.com/haxzie/genmotion";

/**
 * The docs get their own chrome rather than the marketing layout: a slim top
 * bar with search, a sidebar of every page, and no closing CTA band between a
 * reader and the next page.
 */
export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const nav = getDocsNav();
  const index = getSearchIndex();

  return (
    <div className="min-h-screen bg-background text-text-primary">
      <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[90rem] items-center gap-4 px-4 sm:px-6">
          <div className="flex shrink-0 items-center gap-3">
            <Link href="/" className="group flex items-center gap-2" aria-label="GenMotion home">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.svg" alt="" className="size-6 rounded-[5px]" />
              <span className="font-logo text-[1.2rem] tracking-tight">GenMotion</span>
            </Link>
            <span aria-hidden className="h-5 w-px bg-border" />
            <Link href={DOCS_PATH} className="text-[0.95rem] font-medium text-text-secondary hover:text-text-primary">
              Docs
            </Link>
          </div>
          <div className="flex flex-1 justify-end sm:justify-center">
            <DocsSearch index={index} />
          </div>
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <Link href="/download" className="hidden rounded-md px-3 py-1.5 text-[0.9rem] text-text-secondary transition-colors hover:text-text-primary md:block">
              Download
            </Link>
            <a href={GITHUB_URL} target="_blank" rel="noreferrer" aria-label="GenMotion on GitHub" className="hidden rounded-md p-2 text-text-secondary transition-colors hover:text-text-primary sm:block">
              <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden>
                <path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.53-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.41-2.69 5.38-5.26 5.67.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5z" />
              </svg>
            </a>
            <DownloadButton className="hidden sm:inline-flex" label="Get the app" />
          </div>
        </div>
        <DocsMobileNav nav={nav} />
      </header>

      <div className="mx-auto flex max-w-[90rem] px-4 sm:px-6">
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-64 shrink-0 overflow-y-auto border-r border-border py-8 pr-4 lg:block">
          <DocsSidebarNav nav={nav} />
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
