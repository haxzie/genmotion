# The brand video programme

Making a video for a company that did not ask for one, and shipping it three
ways.

This is the outbound motion, and it is also how the Brands feature gets
dogfooded: building a brand folder for a company is step one of making them a
video, and every build is a test of whether "attach a brand, say what the video
is" actually comes back on-brand.

It is already running by hand. `packages/templates/catalog` holds
`nike-brand-guide-video`, `stripe-payment-links-launch-video`,
`notion-launch-video`, `claude-mcp-launch`, `elevenlabs-voice-ai-launch`,
`firebase-studio-launch-video` and `samsung-pay-fintech-app-launch-video`;
`apps/web/content/showcase` has entries for xAI, Cerebras and Firecrawl. What
follows is that work written down so it repeats.

## Picking a target

A company worth a day of work has all four:

1. **It just shipped something.** A launch, a funding round, a milestone, a
   changelog entry with a real feature in it. Signals: Product Hunt, Hacker
   News launches, a YC batch, funding announcements, GitHub trending, the
   company's own changelog.
2. **It has a visible brand system.** A real mark, a palette you can name, a
   typeface. Without these the video is generic and the point is lost.
3. **Its audience overlaps ours.** Dev tools, AI infrastructure, fintech,
   consumer apps. Someone who would plausibly make videos with code.
4. **Nobody has already made this video.** If their launch film is excellent
   and everywhere, pick a different beat: the feature nobody animated, the
   number nobody celebrated.

## The loop

### 1. Build the brand folder

In the app: Brands, New brand, paste their website. The import suggests the
palette, the type and the logo, and writes nothing until it is confirmed. Fix
what it got wrong, drop in the real SVG if the one it found is a favicon, and
put anything you learn about how they talk into the notes.

Tick **someone else's brand**. It changes nothing about how the video is built;
it is what tells the agent the video is reference work and must not claim to be
from them.

Ten minutes. The folder is the durable artefact: research done once, reusable
for every later video for that company.

### 2. Make the video

New project, pick the brand from the composer, say what the video is. The
palette, the type and the real logo files are in the project before the first
message, so the opening turn is already on-brand. Let the skill pack route it
(`genmotion-skills` picks the owner) rather than describing a format yourself.

20 to 40 seconds. Their real launch copy, their real figures, their mark. A
video that could be any company's has failed before anyone watches it.

### 3. Ship it three ways

**Showcase page.** `apps/web/content/showcase/<slug>.md`. Frontmatter is
`title`, `description`, `videoUrl`, `poster`, `author`, `authorRole`, `date`,
`aspectRatio`, `category`, `tags`, `featured`; the body is a couple of `##`
sections on what the video does and why. Already wired into the sitemap and
`llms.txt`, so there is nothing else to touch. An entry is an embed plus prose:
no pipeline, no render.

**Template.** `packages/templates/catalog/<id>/`. Follow the ten-step checklist
in `.claude/skills/templates/SKILL.md` exactly; it is the procedure, not a
summary of one. Two things that bite:

- `TEMPLATE_TAGS` in `packages/templates/src/schema.ts` is a closed set of six.
  A new tag is a schema change, not a label.
- `scripts/render-video.mjs` reads the root `.env` and writes to the **real R2
  bucket**. Confirm before a bulk run.

The catalog test compiles and smoke-renders every scene and holds every
template to a README, so a template that rots fails CI. That is what makes this
the artefact that keeps paying rather than one that quietly dies.

**Outbound.** Send the finished video to the company. No ask attached, no
pitch in the first message. The video is the pitch.

### 4. Write down what happened

Add a row to the log below. Ten of these is a playbook; one is an anecdote.

## House rules

**No em dashes in anything a visitor reads.** Marketing strings, blog bodies,
frontmatter descriptions, FAQ answers, template READMEs. Use a comma, a colon,
brackets, or two sentences. En dashes in numeric ranges are fine. The template
catalog test enforces it for READMEs; everywhere else it is on you. When you
hand writing to a subagent, put the rule in the prompt and check the output
with `grep -c "—"` rather than trusting the report.

**Never put words in their mouth.** No invented quote, figure, feature or
announcement. Everything on screen is something they actually said or shipped,
or it is plainly our own framing.

## Trademark

These videos carry marks we do not own. That is reference use, and reference
use is a defence rather than an immunity: the realistic risk is a takedown
request or a letter, not anything existential. Three things keep it cheap:

- **`thirdParty: true` on the brand**, set by default when a brand is imported
  from a domain. It is what tells the agent the video is reference work.
- **A line in the template's README** naming the company as the owner of its
  marks and the video as unaffiliated. The catalog test already requires every
  template to have a README, so there is a place for it.
- **A takedown path that takes an hour, not a day.** If a request arrives,
  remove in this order and record it in the log:
  1. `packages/templates/catalog/<id>/` and its row in any tag page.
  2. The R2 object `templates/<id>/video.mp4`.
  3. `apps/web/content/showcase/<slug>.md`.
  4. Redeploy. The sitemap revalidates on its own.

## Log

One row per build. Keep it honest: the ones that went nowhere are the useful
half.

| Date | Company | Video | Skill | Shipped as | Sent to | Outcome |
| --- | --- | --- | --- | --- | --- | --- |
| | | | | | | |
