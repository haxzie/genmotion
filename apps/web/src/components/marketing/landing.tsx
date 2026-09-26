import Link from "next/link";
import { DownloadButton } from "@/components/marketing/download-button";
import { InstallCommand } from "@/components/marketing/install-command";
import { HeroShaderBackground } from "@/components/marketing/hero-shader-background";
import { AgentBadges } from "@/components/marketing/agent-badges";
import { TiltedScreenshot } from "@/components/marketing/tilted-screenshot";
import { TemplateMasonry } from "@/components/marketing/template-masonry";
import { Container, Eyebrow, LinkButton, Section } from "@/components/marketing/primitives";
import { getLatestRelease, formatSize } from "@/lib/marketing/latest-release";
import type { TemplateSummary } from "@genmotion/templates/types";

/**
 * The marketing page, as one set of sections.
 *
 * Every landing page on the site used to hand-wire its own hero, its own
 * screenshot band, its own templates gallery and its own step cards, which is
 * how /ugc-ads and /educational-videos ended up as forks of an older homepage
 * and the use-case and feature pages ended up looking like a different
 * product. These are the pieces the homepage is built from; a page supplies
 * its own copy and gets the same structure, spacing and behaviour for free.
 *
 * Order, top to bottom, when a page uses all of it: hero, the editor, what it
 * plugs into, how it works, templates, what the studio covers, the page's own
 * detail sections, FAQ, and whatever comes next.
 */

/** The pill above the headline: a label, a line of text, and where it goes. */
export type HeroBadge = {
  label: string;
  text: string;
  href: string;
};

const ArrowRight = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M5 12h13M13 6l6 6-6 6" />
  </svg>
);

/**
 * The hero every marketing page opens on: shader background, a badge, the
 * headline, one line of lede, the agent badges and the download.
 *
 * `title` is a node rather than a string because the headline often carries
 * the stacked agent marks inline (see `AgentMarks`). The extra bottom padding
 * is the room `EditorShot` is pulled up into; pages that do not show the
 * screenshot pass `compact`.
 */
export async function LandingHero({
  badge,
  title,
  lede,
  compact = false,
  children,
}: {
  badge?: HeroBadge;
  title: React.ReactNode;
  lede: React.ReactNode;
  /** No room left under the hero for a screenshot to be pulled into. */
  compact?: boolean;
  /** Anything extra under the download, e.g. a secondary link. */
  children?: React.ReactNode;
}) {
  // Version and size under the button. Null when GitHub is unreachable or
  // nothing is published: the button still works, it just says less.
  const release = await getLatestRelease();

  return (
    <div className="relative overflow-hidden">
      <HeroShaderBackground />
      {/* Fades the hue down into the page background so whatever sits below
          can overlap it cleanly. */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />
      <Container
        className={`relative flex flex-col items-center text-center ${
          compact ? "pb-20 pt-24 sm:pb-24 sm:pt-32" : "pb-32 pt-24 sm:pb-40 sm:pt-32"
        }`}
      >
        {badge && (
          <Link
            href={badge.href}
            className="group mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 py-1 pl-1.5 pr-3 text-[0.857rem] text-text-secondary transition-colors duration-150 hover:border-border-strong hover:text-text-primary"
          >
            <span className="rounded-full bg-green-muted px-2 py-0.5 text-[0.786rem] font-medium text-green">
              {badge.label}
            </span>
            {badge.text}
            <ArrowRight className="size-3.5 shrink-0 text-text-tertiary transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-text-secondary" />
          </Link>
        )}
        {/* Balanced wrapping rather than a hardcoded break: these lines are
            long enough that a fixed one lands badly at one of the two sizes. */}
        <h1 className="max-w-4xl text-balance font-display text-4xl font-medium tracking-tight sm:text-6xl">
          {title}
        </h1>
        <p className="mt-6 max-w-xl text-lg text-text-secondary">{lede}</p>
        <AgentBadges className="mt-6" />
        <div className="mt-8 flex w-full flex-col items-center">
          {/* Above the button, deliberately quieter than it: the terminal
              install is the faster path for the people it suits, and the only
              one that leaves the `genmotion` command behind. */}
          <InstallCommand className="mb-4" />
          <DownloadButton size="lg" href={release?.downloadUrl} />
          <p className="mt-4 text-[0.9rem] text-text-secondary">
            {release ? (
              <>
                macOS · Apple silicon · v{release.version} ·{" "}
                {formatSize(release.size)}
              </>
            ) : (
              <>macOS · Apple silicon</>
            )}{" "}
            ·{" "}
            <Link
              href="/features"
              className="text-text-secondary underline underline-offset-2 hover:text-green"
            >
              explore features
            </Link>
          </p>
          {children}
        </div>
      </Container>
    </div>
  );
}

/**
 * The editor, leaning back and standing up as you scroll onto it. Pulled up
 * into the room the hero's extra bottom padding leaves, and wider than the
 * copy around it: the screenshot is the one thing on the page worth reading
 * detail in.
 */
export function EditorShot() {
  return (
    <section className="relative z-10 -mt-20 sm:-mt-28">
      <Container className="max-w-7xl">
        <TiltedScreenshot
          src="/editor-screenshot.webp"
          alt="The GenMotion editor: an AI chat panel on the left, a frame-accurate preview, and a timeline of scenes and audio tracks below."
        />
      </Container>
    </section>
  );
}

/**
 * The templates gallery. A wider container than the rest of the page: the same
 * three columns, each one bigger, so the videos read larger rather than the
 * grid growing another column.
 */
export function TemplatesStrip({
  templates,
  href = "/templates",
  eyebrow = "Templates",
  title = "Remix popular launch videos",
  body = "Finished videos you can take apart. Open one and it becomes a project of your own.",
}: {
  templates: TemplateSummary[];
  href?: string;
  eyebrow?: string;
  title?: string;
  body?: string;
}) {
  if (templates.length === 0) return null;
  return (
    <section className="relative z-10 mt-24 sm:mt-32">
      <Container className="max-w-7xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <Eyebrow className="mb-4">{eyebrow}</Eyebrow>
            <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              {title}
            </h2>
            <p className="mt-4 text-text-secondary">{body}</p>
          </div>
          <Link
            href={href}
            className="inline-flex shrink-0 items-center gap-1 text-[0.95rem] text-text-secondary transition-colors hover:text-green"
          >
            View all
            <ArrowRight className="size-4" />
          </Link>
        </div>
        <div className="mt-10">
          <TemplateMasonry templates={templates} showDetails={false} />
        </div>
        <div className="mt-10 flex justify-center">
          <LinkButton href={href} variant="secondary" size="lg">
            Browse all templates
          </LinkButton>
        </div>
      </Container>
    </section>
  );
}

/**
 * A page's own detail sections: the three numbered claims a feature or use
 * case makes for itself, in one column at reading width.
 */
export function DetailSections({
  sections,
  className,
}: {
  sections: { heading: string; body: string }[];
  className?: string;
}) {
  if (sections.length === 0) return null;
  return (
    <Section className={className}>
      <Container>
        <div className="mx-auto flex max-w-3xl flex-col gap-14">
          {sections.map((section, i) => (
            <div
              key={section.heading}
              className="flex flex-col gap-4 sm:flex-row sm:gap-8"
            >
              <span className="shrink-0 font-mono text-[0.857rem] text-text-tertiary">
                0{i + 1}
              </span>
              <div>
                <h2 className="font-display text-2xl font-semibold tracking-tight">
                  {section.heading}
                </h2>
                <p className="mt-3 text-text-secondary">{section.body}</p>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </Section>
  );
}

/** Where to go next: sibling features, sibling use cases, whatever is related. */
export function RelatedCards({
  eyebrow,
  items,
}: {
  eyebrow: string;
  items: { href: string; name: string; tagline: string; icon?: React.ReactNode }[];
}) {
  if (items.length === 0) return null;
  return (
    <Section className="border-t border-border">
      <Container>
        <Eyebrow className="mb-6">{eyebrow}</Eyebrow>
        <div className="grid gap-5 sm:grid-cols-3">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group rounded-xl border border-border bg-surface p-6 transition-colors duration-150 hover:border-border-strong hover:bg-surface-hover"
            >
              {item.icon}
              <h3 className={`text-[1.05rem] font-medium ${item.icon ? "mt-4" : ""}`}>
                {item.name}
              </h3>
              <p className="mt-1.5 text-[0.95rem] text-text-secondary">
                {item.tagline}
              </p>
              <span className="mt-4 inline-flex items-center gap-1 text-[0.9rem] text-text-tertiary transition-colors group-hover:text-text-primary">
                Learn more
                <ArrowRight className="size-4" />
              </span>
            </Link>
          ))}
        </div>
      </Container>
    </Section>
  );
}
