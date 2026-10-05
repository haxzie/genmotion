import type { Metadata } from "next";
import { Container, Section } from "@/components/marketing/primitives";
import { AnswerSections, AnswersHeader } from "@/components/marketing/answers";
import { FaqSection } from "@/components/marketing/faq";
import { JsonLd } from "@/components/marketing/json-ld";
import { getAllAnswers } from "@/lib/marketing/content";
import { pageMetadata } from "@/lib/marketing/seo";
import { SITE_NAME, SITE_URL } from "@/lib/marketing/site";
import type { Faq } from "@/lib/marketing/faq";

const FAQS: Faq[] = [
  {
    q: "What are GenMotion Answers?",
    a: "Short, sourced answers to the specific errors and questions people hit when they make video with code, starting with HyperFrames and Remotion. Each one names the real cause, gives the fix, and says how to check it worked.",
  },
  {
    q: "Where do the answers come from?",
    a: "From the projects' own issue trackers, discussions, documentation and changelogs. Every answer lists its sources, so you can check the cause yourself instead of taking our word for it.",
  },
  {
    q: "Are these answers only useful if I use GenMotion?",
    a: "No. They are written for anyone using HyperFrames or Remotion. GenMotion is mentioned once at the foot of an answer, and only where it is relevant.",
  },
  {
    q: "Can an AI agent read these?",
    a: "Yes. Every answer has a plain Markdown twin one suffix away, for example /answers/<slug>.md, and every answer is listed in llms.txt.",
  },
];

export const metadata: Metadata = pageMetadata({
  title: "Answers: HyperFrames and Remotion errors, fixed — GenMotion",
  description:
    "Sourced answers to HyperFrames and Remotion render errors, black frames, slow renders, blurry text and licensing questions. The real cause, the fix, and how to verify it.",
  path: "/answers",
});

export default function AnswersIndexPage() {
  const answers = getAllAnswers();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${SITE_NAME} Answers`,
    url: `${SITE_URL}/answers`,
    hasPart: answers.map((a) => ({
      "@type": "TechArticle",
      headline: a.title,
      description: a.description,
      url: `${SITE_URL}/answers/${a.slug}`,
    })),
  };

  return (
    <>
      <JsonLd data={jsonLd} />
      <Section>
        <Container>
          <AnswersHeader
            eyebrow="Answers"
            title="Fix the render, not the guesswork"
            lede="Sourced answers to the errors and questions people hit when they make video with code. Start with the tool you use."
            tool="all"
          />
          <div className="mt-14">
            <AnswerSections answers={answers} showTool />
          </div>
        </Container>
      </Section>
      <FaqSection items={FAQS} />
    </>
  );
}
