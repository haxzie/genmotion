# Release campaigns

One email per release, sent from the mailing list (the service behind
`MAILS_API_URL`). Nothing here is sent by the app: `apps/api/src/emails.ts`
holds the transactional mail, and these are the campaign bodies, kept in the
repo so each release's copy is reviewed with the release.

## Files

- `release-email.html`: the body. One column, tables only, inline styles
  only, no media queries and no web fonts, so Gmail, Outlook and Apple Mail
  all render it the same. Light palette: `#f6f6f7` page, `#ffffff` card,
  `#e5e5e8` hairlines, `#0a0a0c` ink, with the button inverted.
- `email-logo.png`: the mark, rasterized from `apps/web/public/logo.svg` at
  2x (144px, shown at 28px). It has to be a PNG, because Gmail strips SVG.
  The email loads it from the assets bucket, already uploaded and live at
  `https://assets.genmotion.dev/brand/email-logo.png`, so the campaign does
  not wait on a web deploy. The copy here is the source: re-upload it to that
  same key if it ever changes, and keep the file name stable, because the
  object is served `immutable` with a one year cache.
- `release-email.txt`: the plain-text twin. Send both; a campaign with no
  text part lands in spam more often.

## Subject and preheader (0.6.0)

Subject: `Demo your product without a screen recorder`
Alternates: `Your agent can use a browser now` / `Your product demo, minus the screen recorder`
Preheader: `Your agent clicks through it for you.`
Alternates: `No camera, no retakes.` / `It opens your product and gets the shots.`

Keep the subject under about 45 characters so it survives a phone inbox, and
the preheader under about 45 too: a phone shows one line of it. Never repeat
the subject in it, and leave the `&zwnj;&nbsp;` padding after it in place, or
the client pulls the lede in behind it.

## Sending

1. Paste the HTML into the campaign composer and the text into its text part.
2. Replace `{{unsubscribe_url}}` with whatever merge tag the list uses. It is
   the only required tag, and the one thing that must not ship unresolved.
3. Segment on the `plan` property if the release is plan-specific. By default
   send to the whole list.
4. Send yourself a test first and read it on a phone.

## Reusing it for the next release

Swap these and nothing else:

- the preheader (the hidden div at the top of `<body>`)
- the version pill
- the headline and the lede
- the What's new rows (five is the cap, keep each to two or three sentences;
  the connector rows go first if it needs trimming)
- the version in the release-notes link, and `utm_campaign` in both links

Copy rules: no em dashes, and no claim the app does not already do. Write it
the way you would say it out loud: contractions, one idea per sentence, and
the reader's problem before the feature. The What's new rows are rewritten
from `apps/desktop/CHANGELOG.md` for someone who does not read changelogs,
never pasted from it, and the lede leads on what the release lets people
make, not on the mechanism.
