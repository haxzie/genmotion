import { Container, Section } from "@/components/marketing/primitives";
import { DownloadButton } from "@/components/marketing/download-button";

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
            Describe an idea and watch the agent animate it — on your Mac, in
            minutes.
          </p>
          <div className="mt-10 flex justify-center">
            <DownloadButton size="lg" />
          </div>
        </div>
      </Container>
    </Section>
  );
}
