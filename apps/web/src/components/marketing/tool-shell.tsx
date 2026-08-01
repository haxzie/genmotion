import Link from "next/link";
import { Container, Section } from "@/components/marketing/primitives";

/** Consistent header + back link + centered column for an individual tool. */
export function ToolShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Section>
      <Container className="max-w-2xl">
        <Link
          href="/tools"
          className="inline-flex items-center gap-1.5 text-[0.9rem] text-text-tertiary transition-colors hover:text-green"
        >
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H6M11 6l-6 6 6 6" />
          </svg>
          All tools
        </Link>
        <h1 className="mt-8 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          {title}
        </h1>
        <p className="mt-4 text-lg text-text-secondary">{description}</p>
        <div className="mt-10">{children}</div>
      </Container>
    </Section>
  );
}

/** Labeled number field used across the tools. */
export function Field({
  label,
  suffix,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  suffix?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[0.857rem] text-text-secondary">{label}</span>
      <span className="relative flex items-center">
        <input
          {...props}
          className="h-11 w-full rounded-md border border-border bg-surface px-3.5 pr-14 text-text-primary tabular-nums outline-none transition-colors duration-150 focus:border-accent/60 focus:ring-2 focus:ring-accent/20"
        />
        {suffix && (
          <span className="pointer-events-none absolute right-3.5 text-[0.857rem] text-text-tertiary">
            {suffix}
          </span>
        )}
      </span>
    </label>
  );
}
