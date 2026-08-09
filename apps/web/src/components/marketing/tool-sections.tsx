import Link from "next/link";
import { Container, Eyebrow, Section } from "@/components/marketing/primitives";
import { FeatureIcon } from "@/components/marketing/icons";
import { TOOLS, type Tool, type ToolCard } from "@/lib/marketing/tools";

/** Slugs that generate a video, as opposed to the calculators and references. */
const GENERATOR_SLUGS = new Set([
  "github-star-count",
  "npm-downloads",
  "youtube-subscribers",
]);

/**
 * The marketing strips every tool page carries below its tool: how it works,
 * who it's for, and a way across to the others.
 *
 * All three are driven from the `TOOLS` registry, so a new tool gets them by
 * filling in `steps` and `personas` — there is no per-page markup to copy.
 */
export function ToolSections({ tool }: { tool: Tool }) {
  return (
    <>
      <HowItWorks tool={tool} />
      <WhoItsFor tool={tool} />
    </>
  );
}

function HowItWorks({ tool }: { tool: Tool }) {
  return (
    <Section className="border-t border-border">
      <Container>
        <div className="max-w-2xl">
          <Eyebrow className="mb-4">How it works</Eyebrow>
          <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            How GenMotion&apos;s free {tool.shortName} works
          </h2>
          <p className="mt-4 text-lg text-text-secondary">
            Three steps, no account, and nothing to install.
          </p>
        </div>

        <ol className="mt-12 grid gap-5 md:grid-cols-3">
          {tool.steps.map((step, i) => (
            <li key={step.title}>
              <CardBody card={step} step={i + 1} />
            </li>
          ))}
        </ol>
      </Container>
    </Section>
  );
}

function WhoItsFor({ tool }: { tool: Tool }) {
  return (
    <Section className="border-t border-border">
      <Container>
        <div className="max-w-2xl">
          <Eyebrow className="mb-4">Who it&apos;s for</Eyebrow>
          <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Who is GenMotion&apos;s free {tool.shortName} for?
          </h2>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {tool.personas.map((persona) => (
            <CardBody key={persona.title} card={persona} />
          ))}
        </div>
      </Container>
    </Section>
  );
}

function CardBody({ card, step }: { card: ToolCard; step?: number }) {
  return (
    <div className="h-full rounded-xl border border-border bg-surface p-6">
      <div className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-raised text-text-primary">
          <FeatureIcon name={card.icon} className="size-5" />
        </span>
        {step && (
          <span className="font-mono text-[0.786rem] text-text-tertiary">
            Step {step}
          </span>
        )}
      </div>
      <h3 className="mt-5 text-[1.1rem] font-medium">{card.title}</h3>
      <p className="mt-2 text-[0.95rem] leading-relaxed text-text-secondary">
        {card.body}
      </p>
    </div>
  );
}

/**
 * Cross-links to the rest of the free tools, video generators first.
 *
 * Sits at the very bottom of a tool page, below the FAQ — by then the visitor
 * has either got what they came for or hasn't, and either way the useful next
 * thing is another tool.
 */
export function MoreTools({ current }: { current: string }) {
  const others = TOOLS.filter((t) => t.slug !== current);
  const generators = others.filter((t) => GENERATOR_SLUGS.has(t.slug));
  const rest = others.filter((t) => !GENERATOR_SLUGS.has(t.slug));

  return (
    <Section className="border-t border-border">
      <Container>
        <div className="max-w-2xl">
          <Eyebrow className="mb-4">More free tools</Eyebrow>
          <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Explore more free tools by GenMotion
          </h2>
          <p className="mt-4 text-lg text-text-secondary">
            All free, all no sign-up. Everything runs in your browser.
          </p>
        </div>

        {generators.length > 0 && (
          <>
            <h3 className="mt-12 text-[0.9rem] font-medium text-text-tertiary">
              Video generators
            </h3>
            <ToolGrid tools={generators} />
          </>
        )}

        {rest.length > 0 && (
          <>
            <h3 className="mt-10 text-[0.9rem] font-medium text-text-tertiary">
              Calculators and references
            </h3>
            <ToolGrid tools={rest} />
          </>
        )}

        <div className="mt-10">
          <Link
            href="/tools"
            className="text-[0.95rem] text-text-secondary underline-offset-4 transition-colors hover:text-green hover:underline"
          >
            See all free tools →
          </Link>
        </div>
      </Container>
    </Section>
  );
}

function ToolGrid({ tools }: { tools: Tool[] }) {
  return (
    <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {tools.map((tool) => (
        <Link
          key={tool.slug}
          href={`/tools/${tool.slug}`}
          className="group flex items-start gap-3.5 rounded-xl border border-border bg-surface p-5 transition-colors duration-150 hover:border-border-strong hover:bg-surface-hover"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-raised text-text-primary">
            <FeatureIcon name={tool.icon} className="size-4.5" />
          </span>
          <span>
            <span className="block text-[1rem] font-medium">{tool.name}</span>
            <span className="mt-1 block text-[0.9rem] text-text-secondary">
              {tool.description}
            </span>
          </span>
        </Link>
      ))}
    </div>
  );
}
