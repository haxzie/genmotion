---
name: comparison-posts
description: Write a comparison or alternatives post for the GenMotion blog: "X alternatives", "best tools for making video with code", a roundup of competing tools with GenMotion positioned honestly among them. Use whenever someone asks for a post that compares GenMotion against other tools, adds a competitor to an existing one, or refreshes prices in one. Covers the shape of the post, the voice, how GenMotion is positioned, frontmatter and FAQ mechanics, and the checks before it ships.
---

# Comparison posts

Long-form blog posts that compare GenMotion against adjacent tools:
`content/blog/remotion-alternatives.md` and
`content/blog/hyperframes-alternatives.md` are the two that exist today and
are the reference for shape and voice. There's no separate `/alternatives`
route in this codebase (unlike some products) — these live only in `/blog`,
registered by file presence, not a separate index file. This is a different
genre from `[[site-copy]]`: that's a stranger deciding in five seconds whether
to try the product; this is a developer who already knows the category and is
choosing between named tools, so more technical detail and more hedged,
specific claims are correct here, not a defect.

## Where things go

| Path | What it is |
| --- | --- |
| `apps/web/content/blog/<slug>.md` | The whole post: YAML frontmatter plus markdown body. No separate registry file. |
| `apps/web/src/lib/marketing/content.ts` | `getAllPosts()` reads every `.md` in `content/blog/`, parses frontmatter with `gray-matter`, sorts newest-first by `date`. Nothing to register by hand. |
| `apps/web/src/lib/marketing/faq.ts` | `parseFaqs()` turns the frontmatter `faqs:` array into the page's FAQ block and its `FAQPage` JSON-LD, off one array. |
| `apps/web/src/app/sitemap.ts`, `robots.ts`, `llms.txt/route.ts` | Pick up new posts automatically via `getAllPosts()` — nothing to add per post, unlike a wholly new content *type*. |

Frontmatter shape, copied from an existing post rather than invented:

```yaml
---
title: "X Alternatives: The N Best Tools for Y (2026)"
description: "One or two sentences: the honest premise plus what the post covers. Used as the meta description and the standfirst."
date: "YYYY-MM-DD"
updated: "YYYY-MM-DD"   # bump only on a material revision; drives dateModified and sitemap freshness
author: "The GenMotion Team"
tags: ["comparisons", "developers"]
faqs:
  - q: "A question someone would actually type into search"
    a: "A full-sentence answer that stands alone without the post around it."
---
```

Six to eight FAQs is the existing norm. The body has no `## FAQ` heading of
its own — the FAQ block renders separately from the frontmatter array, so
adding one in the markdown produces two.

## The shape

Both existing posts open with an honest premise before naming any tool, then
work through each one by name. The newer of the two
(`hyperframes-alternatives.md`) leads with a `## TL;DR` comparison table
before the prose; the older one puts its table under `## Comparison at a
glance` near the end. Lead with the table on a new post: a reader who
searched for a comparison wants the ranked answer before the argument.

```
## TL;DR
<table: tool, model/pricing shape, best-at>
Prices checked on <date>, if any are quoted here too.

<one or two short paragraphs: the honest premise of the post>

## <definitional or "why look for an alternative" section, unique to this post>
<answers the question a search engine can lift out standalone>

## 1. GenMotion   (or wherever it honestly ranks — not forced to #1)
**What it is:** ...
**Choose it if:** ...
(no Trade-off line for GenMotion here if the section already carries one at the end)

## 2. <competitor>
**What it is:** what it does, genuinely.
**Choose it if:** the real use case it's actually best for.
**Trade-off:** the honest limitation, stated once, plainly.

... (repeat per tool)

## How to choose / a decision tree
## The honest summary
## Where to go next
```

**Every post answers a definitional or "why look for this" question early**,
in its own `##` section, in two short paragraphs plain enough that the first
stands alone if lifted out by a search engine or assistant. That question
must be unique across the blog — don't reuse a heading another post already
owns for the same query.

## Voice

**Directive but not a hard sell.** Tell the reader which tool fits their
situation rather than only listing facts: "If your bottleneck is engineering
time, a library helps; if your bottleneck is making a good video quickly, a
studio does." That's stronger than laying out both options and leaving the
reader to conclude.

**First person is native here**, unlike feature/use-case copy: "So here's a
proper comparison," "We built the tools we wanted." This is one of the two
places (with the About page) `we` reads as GenMotion genuinely speaking.

**Short paragraphs, but not artificially short sentences.** These posts run
long and technical (pricing tables, licensing math, a "why determinism
matters" section) and that's correct for the audience; don't flatten a
genuinely technical explanation into a slogan to match landing-page brevity.

**Em dashes are used normally**, same as the rest of the site's marketing
voice — not banned, just not stacked three to a sentence.

## Positioning GenMotion

**GenMotion is not automatically ranked first, and its own limitations are
stated by name.** This is the opposite of a hard-sell comparison and it's
deliberate: both existing posts give GenMotion an explicit `**Trade-off,
stated plainly:**` line alongside every competitor's. From
`remotion-alternatives.md`: "GenMotion is not a library and not a render API.
There's no npm package, no CI integration, and no way to generate a video per
user from your own backend. If that's your requirement, use Remotion, this
isn't a replacement for it, and pretending otherwise would waste your time."
Keep writing that way. A comparison post that only flatters GenMotion reads
as an advert, and this genre's whole premise is that it isn't one.

**The real, checkable differentiators to work in where they honestly apply,**
matching what the two existing posts actually claim:

- A studio, not a library: no code to write, an agent authors the scene.
- A real timeline plus generated voiceover with beat timings, not just
  rendering.
- Deterministic preview-equals-export, inherited from the same runtime
  argument the site makes everywhere.
- No per-render fee, unlike the usage-based cloud APIs in this category.

**The honest limitations that stay in, every time GenMotion is discussed:**
not a library or API, no per-user backend rendering, needs the reader's own
Claude Code or Codex subscription, macOS on Apple Silicon only, younger and
smaller ecosystem than Remotion. These are `[[site-copy]]`'s "claims that may
not be made" list, and in this genre the correct move is to state them, not
hide them.

## Facts

Every price or spec here is a claim about someone else's product that a
technical reader will check. Existing posts get this right by being specific
rather than rounding: Remotion's licence FAQ is quoted with its actual
thresholds ("$25 per seat per month with no minimum," "$0.01 per render with
a $100 per month minimum spend"), not summarized as "moderately priced."

- Fetch the vendor's own pricing/licensing page and read it; don't recall a
  price from memory or an older post. Prices and licence terms move.
- State the check date under the table (`updated:` in frontmatter should
  track this).
- Prefer the vendor's own docs over a review site or directory listing; the
  existing posts explicitly call out that directory pages and vendor blogs
  naming tools "whose main qualification is that the vendor sells one" are
  the low bar these posts exist to beat.

## Links

**No outbound links to any tool discussed**, including GenMotion's own site.
Both existing posts name every competitor and quote their pricing without a
single markdown link (`grep -oE '\]\(https?://[^)]+\)' content/blog/*.md`
returns nothing on either). Keep that: cite facts in prose, don't link out.

## Before it ships

```bash
grep -oE '\]\(https?://[^)]+\)' apps/web/content/blog/<slug>.md   # must be empty
grep -c "^## FAQ" apps/web/content/blog/<slug>.md                 # must be 0, FAQ is frontmatter-only
pnpm --filter @genmotion/web typecheck
```

Then load `/blog/<slug>` locally and read it. Check the FAQ block renders
from frontmatter (not duplicated in the body), that the TL;DR or
comparison-at-a-glance table is legible, and that GenMotion's own trade-off
line is still there and still true.
