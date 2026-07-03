import { Container, Section, LinkButton } from "@/components/marketing/primitives";

/**
 * Closing call-to-action shown near the bottom of every marketing page.
 * Rendered once by the marketing layout, just above the footer.
 */
export function CtaSection() {
  return (
    <Section className="border-t border-border">
      <Container>
        <div className="text-center">
          <h2 className="mx-auto max-w-3xl font-display text-4xl font-semibold tracking-tight sm:text-6xl">
            Ready to tell your story?
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-lg text-text-secondary sm:text-xl">
            Start free — describe an idea and watch the agent animate it in
            minutes.
          </p>
          <div className="mt-10 flex justify-center">
            <LinkButton href="/signup" size="lg">
              Start creating free
            </LinkButton>
          </div>
        </div>
      </Container>
    </Section>
  );
}
