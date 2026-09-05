import type { TemplateSummary } from "@genmotion/templates/types";
import type { TemplateCategory } from "./template-categories";
import type { Faq } from "./faq";

function article(phrase: string): "a" | "an" {
  return /^[aeiou]/i.test(phrase) ? "an" : "a";
}

/**
 * Strips the trailing " Template — GenMotion" every `metaTitle` carries
 * (hand-written or the schema's own fallback), leaving the keyword phrase the
 * template was actually written to rank for — "WhatsApp Chat Video", "AI
 * Model Launch Video" — the same phrase a real search for it would use.
 */
function templateKeyword(summary: TemplateSummary): string {
  return summary.metaTitle.replace(/ Template — GenMotion$/, "");
}

/**
 * Strips the trailing " templates" every category `heading` carries
 * ("Launch video templates" → "Launch video"), leaving the noun phrase to
 * build a question around.
 */
function categoryKeyword(category: TemplateCategory): string {
  return category.heading.replace(/\s+templates$/i, "");
}

/**
 * FAQ for one template's detail page, built from its own `metaTitle` and
 * dimensions — every template gets questions phrased around the exact
 * keyword it's trying to rank for, not one generic block reused site-wide.
 * `FaqSection` turns this straight into FAQPage JSON-LD.
 */
export function templateFaqs(summary: TemplateSummary): Faq[] {
  const kw = templateKeyword(summary).toLowerCase();
  const a = article(kw);
  return [
    {
      q: `How do I make ${a} ${kw}?`,
      a: `Press Remix this template above. It opens in GenMotion as a real project with the exact scenes, timing, and assets you see playing here — ready to edit by chat instead of starting from a blank canvas.`,
    },
    {
      q: `Can I edit this ${kw} template after remixing it?`,
      a: `Yes. A remix is an ordinary GenMotion project from the moment it lands — change any line, swap any asset, or retime any scene by describing the change in chat.`,
    },
    {
      q: `Do I need video editing experience to make ${a} ${kw}?`,
      a: `No. Remixing hands you a finished ${summary.width}×${summary.height} video already assembled — changes happen by describing what you want in chat, not by learning a timeline.`,
    },
    {
      q: `Is it free to remix this ${kw} template?`,
      a: `Yes — downloading GenMotion and remixing this template is free. A paid plan is only needed if you go on to want more renders, longer videos, or higher-resolution exports.`,
    },
  ];
}

/**
 * FAQ for one category landing page, built from its own `heading` — the same
 * keyword the page's own `<h1>` and `metaTitle` are built around, so the
 * questions read like real searches for that category rather than a generic
 * "what is a template" block reused across every category.
 */
export function categoryFaqs(category: TemplateCategory): Faq[] {
  const kw = categoryKeyword(category).toLowerCase();
  const a = article(kw);
  return [
    {
      q: `What is ${a} ${kw} template?`,
      a: `A finished, working ${kw} — real scenes, real assets, nothing stubbed out. Open one below, watch it play, and remix it into a project of your own.`,
    },
    {
      q: `How do I make ${a} ${kw}?`,
      a: `Pick one of the templates below and press Remix — it opens in GenMotion as an editable project with the same scenes and assets, ready to change by chat.`,
    },
    {
      q: `Can I customize ${a} ${kw} template after remixing it?`,
      a: `Yes. Once remixed it's an ordinary GenMotion project — edit any line, swap any asset, or retime any scene by describing the change in chat.`,
    },
    {
      q: `Do I need the GenMotion desktop app to use ${a} ${kw} template?`,
      a: `You can preview every ${kw} template right here for free. Remixing one into an editable project happens in the GenMotion desktop app.`,
    },
  ];
}
