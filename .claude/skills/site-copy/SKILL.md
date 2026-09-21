---
name: site-copy
description: Write or edit the words on the GenMotion marketing site (apps/web) — a homepage headline or lede, a feature/use-case tagline and section body, an FAQ answer, pricing copy, an about-page value, a meta description or OG title. Use this whenever someone asks to reword, tighten, rewrite or add copy anywhere under apps/web's marketing routes, or says the site reads badly. Covers the voice, the section shape, where every string lives, the claims that may not be made, and the checks before it ships.
---

# Site copy

The words a stranger reads under `apps/web/src/app/(marketing)` and the
`apps/web/src/lib/marketing/*.ts` content files behind it. Not the blog's
comparison/alternatives posts, which are `[[comparison-posts]]` and read in a
longer, more first-person register.

There is no pre-existing house style document for this — this skill is that
document, inferred from what's actually on the site today plus general
copywriting judgment. Where current copy disagrees with itself (spelling below
is the clearest case), the guidance states the convention to converge on
rather than pretending consensus already exists.

## Before writing

1. Read the file you're changing **and its neighbours**: a feature or use-case
   entry is `tagline` + `description` + `sections[]` + `faqs[]` in one object
   in `features.ts` or `use-cases.ts` (see shape below), and a tagline that
   works alone often repeats a line already used in the description.
2. Grep for the phrase you're about to write elsewhere in
   `src/lib/marketing/` and `src/app/(marketing)/`. Two pages promising
   slightly different things about the same feature is how a support ticket
   starts.
3. If the change touches a new content *type* (a new marketing route, a new
   entry list), remember `apps/web/src/app/sitemap.ts`,
   `apps/web/src/app/robots.ts` and `apps/web/src/app/llms.txt/route.ts` need
   the same addition — root `AGENTS.md`'s "Discovery files" section is explicit
   about this and it's easy to ship a page nothing can find.

## The section shape

Feature and use-case pages (`features.ts`, `use-cases.ts`) share one object
shape; write to it rather than inventing a new one:

```
name          The feature/use-case noun phrase. Title case, short.
tagline       One line. The value prop, doubles as the card blurb and the
              page sub-headline. Often two clauses joined by an em dash.
description   One paragraph for the page hero. What it does, in concrete terms.
sections      3, each a { heading, body }. Heading is a short claim,
              body is one or two sentences making it specific.
faqs          3+, conversational questions a reader would actually ask,
              answered in full sentences that stand alone.
```

The homepage (`page.tsx`) is the exception with its own hero, its own FAQ
array, and a `STEPS` list; it isn't fed by `features.ts`/`use-cases.ts`.

## The voice, as it actually exists

**Second person is the default register.** "You describe a video," "your
brand," "your project." This holds across FAQs, feature bodies and use-case
copy without exception, so keep writing to the reader who's about to use the
product, not about a generic third party.

**"We" belongs to the blog and the About page, not to feature/use-case
copy.** `about/page.tsx` and the blog posts speak as GenMotion in first person
("We sweat them so you don't have to"); `features.ts`/`use-cases.ts` stay in
second/third person almost entirely. Keep that split — a "we" dropped into a
feature FAQ reads like it wandered in from a different document.

**Em dashes are a normal part of this voice, not a violation.** They run
20-30 per file across the existing marketing copy. Use one to join a value
prop's two clauses in a tagline, or to set off an aside, the way the existing
copy already does. The failure mode to avoid is stacking two or three in one
sentence until it reads like a comment block, not banning the mark outright.

**Spelling: default to American, matching the majority of the code and copy**
("color", `toLocaleDateString("en-US")`), even though several existing blog
posts drifted into British spellings ("colour", "optimise", "centre") from
past writing sessions. Don't mass-edit those posts just to fix spelling, but
write anything new in American English, and fix a spelling inconsistency
opportunistically if you're already editing that paragraph for another reason.

**No hedging.** Not "helps you create," not "designed to make it easy," not
"can automatically." The product either does the thing or it isn't on the
page. ("You describe a video, an agent animates it" — not "an agent can help
animate it.")

**Concrete nouns over abstractions.** Frame, timeline, scene, playhead,
waveform, render. Reach for "workflow," "solution," "experience," "platform"
and you're describing something else's product, not this one — a heading
that would survive being pasted onto a different tool's page isn't about this
one.

**Value is stated as what the product removes, not just what it adds.** "No
keyframing by hand," "no upload step," "no per-render fee," "the code is real
and you can read and edit it if you want to." That pattern (a existing win
stated as an absence) reads stronger than an adjective and is already the
site's strongest recurring move — reuse it rather than reaching for
superlatives.

**Card/section titles are outcomes, not control names.** "Guide attention
automatically" beats "Layouts." A title that only names a feature leaves the
reader to work out why they'd touch it.

**No pain agitation.** Don't open by telling the reader their current videos
are bad. Where a problem is named, keep it mechanical: "keyframing by hand is
slow," not "your videos look amateur."

**No exclamation marks, no emoji, no adjective stacking.** One adjective per
noun, and only where something on the page backs it up.

## Claims that may not be made

These are the overclaim traps specific to this product, each with a real
failure mode if crossed:

- **Not a library, not an API, no per-user backend rendering.** GenMotion is a
  desktop studio, not an npm package or a render API — that boundary is stated
  explicitly and repeatedly in the comparison posts (`content/blog/hyperframes-alternatives.md`,
  `content/blog/remotion-alternatives.md`) precisely because it's the question
  developers ask first. Never imply "integrate this into your product" or
  "render video from your backend."
- **Intel Macs are not supported.** Apple Silicon only
  (`download/page.tsx`). State this as a requirement, not an apology, same as
  Prequel's macOS-version line — it's the difference between a sale and a
  refund request.
- **The HyperFrames-engine timeline is read-only in this release.** Scrub and
  select work; reordering and retiming go through the agent, not a drag
  gesture, and the HyperFrames component registry (`hyperframes add`) isn't
  wired into the app yet (`AGENTS.md`, `content/blog/hyperframes-engine-in-genmotion.md`).
  Don't write copy implying drag-to-reorder or a component picker for
  HyperFrames projects specifically — GenMotion's own native timeline (for
  non-HyperFrames scenes) does support drag-reorder and frame-level trim, so
  check which engine the copy is describing before claiming either behavior.
- **No model subscription is sold.** The user brings their own Claude Code or
  Codex subscription; GenMotion doesn't meter or resell model access
  (`README.md`). Don't write "included AI" or anything implying GenMotion is
  the one running the model.
- **The free trial is time-boxed and watermarked, and voiceover/SFX/image-gen
  are Pro-only.** 7 days, unlimited exports, small GenMotion badge on trial
  exports (`pricing/page.tsx`). Don't write "unlimited" or "free" without that
  qualifier nearby, and don't list voiceover/SFX/image-gen as something the
  free tier gets.
- **The renderer app (`apps/renderer`) is being retired** in favor of local
  desktop rendering. Don't write copy implying a persistent cloud render queue
  as a selling point going forward; existing pricing copy already says "no
  render queue on any plan" and that's the direction to write in.

## Where the strings live

| Path | What it holds |
| --- | --- |
| `src/lib/marketing/site.ts` | `SITE_URL`, `SITE_NAME` constants. No tagline lives here. |
| `src/lib/marketing/seo.ts` | `pageMetadata()`, default OG image + alt text, Twitter handle. |
| `src/lib/marketing/faq.ts` | The `Faq` type and `faqPageJsonLd()` builder. FAQ content itself lives with the page/feature/use-case it belongs to. |
| `src/lib/marketing/features.ts` | The 8 feature pages: tagline, description, sections, FAQs. |
| `src/lib/marketing/use-cases.ts` | The 7 use-case pages, same shape as features. |
| `src/app/(marketing)/page.tsx` | Homepage hero, `STEPS`, home FAQ. No separate hero component. |
| `src/app/(marketing)/pricing/page.tsx` | Pricing copy and tier blurbs (prices come from `@genmotion/shared`'s `PLANS`). |
| `src/app/(marketing)/about/page.tsx` | Mission and values copy, the one place "we" is native. |
| `src/lib/marketing/template-faq.ts`, `template-categories.ts` | Template gallery FAQ and category labels. |
| `src/lib/marketing/tools.ts` | Copy for the free `/tools` generator pages. |
| `src/lib/marketing/integrations.ts` | Marketplace/MCP-integrations section copy. |
| `src/components/marketing/faq.tsx`, `site-nav.tsx`, `site-footer.tsx`, `cta-section.tsx` | Shared components that render copy from the lib files above; don't hardcode strings here. |
| `src/app/sitemap.ts`, `robots.ts`, `llms.txt/route.ts` | Must stay in sync whenever a new content type is added (`AGENTS.md`). |

## Before it ships

```bash
# The boundary GenMotion cannot cross: backend/API/library framing.
grep -rniE "render.*from your (backend|server)|npm install genmotion|video api" apps/web/src

# Intel-Mac or "any Mac" claims that contradict the Apple Silicon requirement.
grep -rni "intel" apps/web/src/app/\(marketing\) apps/web/src/lib/marketing

# Free-tier overclaims: voiceover/SFX/image-gen listed without a Pro qualifier.
grep -rni "free" apps/web/src/app/\(marketing\)/pricing

pnpm --filter @genmotion/web typecheck
```

Read the section out loud. If you run out of breath inside one sentence, it's
two sentences.
