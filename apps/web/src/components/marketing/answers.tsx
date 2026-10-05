import Link from "next/link";
import { Container, Section, Eyebrow } from "@/components/marketing/primitives";
import { DownloadButton } from "@/components/marketing/download-button";
import { Prose } from "@/components/marketing/prose";
import { SidebarCard } from "@/components/marketing/sidebar-card";
import { KIND_HEADING, KIND_LABEL, KIND_ORDER, TOOL_META } from "@/lib/marketing/answers";
import type { Answer, AnswerKind, AnswerTool } from "@/lib/marketing/content";

/** Which tool an answer is about, as a small pill. */
export function ToolPill({ tool }: { tool: AnswerTool }) {
  return (
    <span className="rounded-full border border-border px-2.5 py-0.5 text-[0.786rem] text-text-tertiary">
      {TOOL_META[tool].name}
    </span>
  );
}

/** A grid of answer cards: the error on top when there is one, else the question. */
export function AnswerGrid({ answers, showTool = false }: { answers: Answer[]; showTool?: boolean }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {answers.map((a) => (
        <Link
          key={a.slug}
          href={`/answers/${a.slug}`}
          className="group flex flex-col rounded-xl border border-border bg-surface p-5 transition-colors duration-150 hover:border-border-strong hover:bg-surface-hover"
        >
          <div className="flex items-center gap-2 text-[0.786rem] text-text-tertiary">
            {showTool && <ToolPill tool={a.tool} />}
            <span>{KIND_LABEL[a.kind]}</span>
          </div>
          <h3 className="mt-2.5 text-[1.05rem] font-medium leading-snug transition-colors group-hover:text-text-primary">
            {a.title}
          </h3>
          <p className="mt-1.5 text-[0.95rem] text-text-secondary">{a.description}</p>
        </Link>
      ))}
    </div>
  );
}

/** Answers grouped by kind, skipping any kind with nothing in it. */
export function AnswerSections({ answers, showTool = false }: { answers: Answer[]; showTool?: boolean }) {
  const byKind = new Map<AnswerKind, Answer[]>();
  for (const a of answers) byKind.set(a.kind, [...(byKind.get(a.kind) ?? []), a]);

  return (
    <div className="flex flex-col gap-12">
      {KIND_ORDER.filter((k) => byKind.has(k)).map((kind) => (
        <div key={kind}>
          <h2 className="font-display text-xl font-semibold tracking-tight">{KIND_HEADING[kind]}</h2>
          <div className="mt-5">
            <AnswerGrid answers={byKind.get(kind)!} showTool={showTool} />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * The last section of an answer: GenMotion as the solution to this answer's
 * problem. The words come from the answer's own frontmatter, so every one says
 * something specific to its article; the studio image sits under the heading
 * to keep the section from reading as another block of text.
 */
export function AnswerGenMotion({ heading, body }: { heading: string; body: string }) {
  return (
    <section className="mt-16 border-t border-border pt-12">
      <Eyebrow>GenMotion</Eyebrow>
      <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight text-text-primary">{heading}</h2>
      {/* eslint-disable-next-line @next/next/no-img-element -- static asset, same as the rest of the marketing site */}
      <img
        src="/answers/studio.webp"
        width={1800}
        height={953}
        alt="The GenMotion studio: an agent chat on the left, and on the right a video preview above its timeline"
        loading="lazy"
        className="mt-6 w-full rounded-xl border border-border"
      />
      <div className="mt-6">
        <Prose>{body}</Prose>
      </div>
      <div className="mt-6">
        <DownloadButton label="Download for Mac" />
      </div>
    </section>
  );
}

/**
 * A mid-article offer. It sits inside the tutorial at the point the reader has
 * just done something by hand, and shows what the same step is in GenMotion:
 * the prompt to type. Visually it is a card, not prose, so it reads as an aside
 * the reader can skip without losing the thread.
 */
export function AnswerCallout({ heading, body, prompt }: { heading: string; body: string; prompt?: string }) {
  return (
    <aside className="rounded-2xl border border-border-strong bg-surface p-6 sm:p-7">
      <Eyebrow>GenMotion</Eyebrow>
      <h3 className="mt-3 font-display text-xl font-semibold tracking-tight text-text-primary">{heading}</h3>
      <div className="mt-3">
        <Prose>{body}</Prose>
      </div>
      {prompt && (
        <div className="mt-5 rounded-xl border border-border bg-surface-raised p-4">
          <p className="text-[0.75rem] font-medium uppercase tracking-[0.12em] text-text-tertiary">The prompt</p>
          <p className="mt-2 whitespace-pre-wrap font-mono text-[0.88rem] leading-relaxed text-text-primary">{prompt}</p>
        </div>
      )}
      <div className="mt-5">
        <DownloadButton label="Download for Mac" />
      </div>
    </aside>
  );
}

/** Heading block shared by the index and the two tool hubs. */
export function AnswersHeader({
  eyebrow,
  title,
  lede,
  tool,
}: {
  eyebrow: string;
  title: string;
  lede: string;
  tool?: AnswerTool | "all";
}) {
  const tabs: { id: AnswerTool | "all"; label: string; href: string }[] = [
    { id: "all", label: "All answers", href: "/answers" },
    { id: "hyperframes", label: "HyperFrames", href: "/answers/hyperframes" },
    { id: "remotion", label: "Remotion", href: "/answers/remotion" },
  ];
  return (
    <div className="max-w-3xl">
      <Eyebrow className="mb-4">{eyebrow}</Eyebrow>
      <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">{title}</h1>
      <p className="mt-5 text-lg text-text-secondary">{lede}</p>
      <nav aria-label="Filter answers by tool" className="mt-8 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <Link
            key={t.id}
            href={t.href}
            aria-current={t.id === (tool ?? "all") ? "page" : undefined}
            className={
              t.id === (tool ?? "all")
                ? "rounded-full border border-border-strong bg-surface-raised px-4 py-1.5 text-[0.9rem] text-text-primary"
                : "rounded-full border border-border px-4 py-1.5 text-[0.9rem] text-text-secondary transition-colors hover:border-border-strong hover:text-text-primary"
            }
          >
            {t.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

/** The sticky card beside an answer. The same card sits beside every blog post. */
export const AnswerSidebarCard = SidebarCard;

export { Container, Section };
