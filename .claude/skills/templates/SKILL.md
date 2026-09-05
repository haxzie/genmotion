---
name: templates
description: Adding, curating, or re-rendering a GenMotion template (packages/templates/catalog). Use when asked to add a project as a template, tag/retag templates, fix a template's poster or video, or run pnpm --filter @genmotion/templates poster/render-video/scaffold.
---

# GenMotion templates

A template is an ordinary GenMotion project — `project.json`, `scenes/`,
`components/`, `assets/` — plus a `template.json` sidecar, living at
`packages/templates/catalog/<id>/`. Nothing about the project format changes;
`template.json` is what makes a folder show up in the gallery.

Three things get generated from that folder and must stay in sync with it:
`poster.jpg` (a still frame), `video.mp4` (the whole thing, rendered — lives in
R2, not git), and the wire summary the API serves. This skill covers producing
all three, plus the checklist for adding a template in the first place.

## Adding a new template from an existing project

1. **Find the source project.** User projects live at
   `~/.genmotion/projects/<slug>/`. Match by the project's `name` field in
   `project.json`, not the folder slug (grep every `project.json`'s `name` — the
   folder name is often a generated prompt-slug that doesn't match what the user
   calls it). If more than one candidate matches, prefer the most recently
   modified.

2. **Find what's actually referenced**, not everything in `assets/`. Diff two
   things against the folder's real asset list:
   - `grep -rhoE 'assets/[A-Za-z0-9._ -]+\.(png|jpg|jpeg|webp|svg|mp4|mp3|gif)' scenes components`
     — every asset a scene or component actually imports.
   - `project.json`'s `audio[].file` and each `scenes[].audio` — manifest-declared
     audio, which isn't imported, just referenced by path.

   Everything else in the source `assets/` folder is orphaned (old pasted
   screenshots, unused alternate takes) — leave it behind. Copy `project.json`,
   `scenes/*`, `components/*`, and only the referenced assets into
   `packages/templates/catalog/<id>/assets/`.

3. **Curate assets under budget.** One hard limit, enforced by a test:
   **12MB total** (`MAX_REMIX_BYTES`) — the whole remix bundle. There's also a
   soft one worth respecting even though nothing enforces it: **512KB per
   image** (`TEMPLATE_INLINE_LIMIT`) is where an image stops inlining as a data
   URL into the compiled scene — over that, it becomes a `TRIPWIRE_PREFIX`
   placeholder instead. This used to be a hard requirement (an unresolved
   placeholder broke the render), but it isn't anymore — see "On-screen video
   and oversized images" below. Compress anyway where it's easy: it's what
   keeps a remix download small and the catalog light.

   Compress with `sips` (zero-dependency, already on macOS):
   ```sh
   # Resize an oversized background/wallpaper to something sane for a 1080p/1920p canvas
   sips -Z 1920 -s format jpeg -s formatOptions 78 image.jpg --out image.jpg
   # Convert a PNG screenshot to JPEG (screenshots are rarely transparent in practice)
   sips -s format jpeg -s formatOptions 82 shot.png --out shot.jpg
   ```
   Converting `.png` → `.jpg` changes the filename — grep the scene/component
   files that `import` it and update those import paths too. Verify with
   `file assets/*.jpg` that nothing is secretly still PNG-encoded bytes wearing
   a `.jpg` extension.

4. **Write `template.json`:**
   ```json
   {
     "id": "kebab-case-id-matching-the-folder-name",
     "title": "Display Title",
     "description": "One sentence for the gallery card AND the page's meta description — make it read well as both.",
     "metaTitle": "Specific SEO Title — GenMotion",
     "category": "product | social | intro | explainer | data",
     "tags": ["Two", "To three", "from TEMPLATE_TAGS"],
     "order": 100
   }
   ```
   - `metaTitle` is the `<title>` the web page renders — pack a keyword the
     plain `title` doesn't need (e.g. "Screen Recorder App Launch Video
     Template — GenMotion" rather than just "Prequel Launch"). Always suffix
     `— GenMotion`. Omit the field entirely to fall back to `"<title> Template
     — GenMotion"` if nothing more specific is warranted.
   - `tags`: 2–3 from the closed set in `packages/templates/src/schema.ts`
     (`TEMPLATE_TAGS`: Social Media, Launch Video, Announcement, Promotional,
     Educational, Tutorial). **Every 9:16 (portrait) template must include
     "Social Media"** — a catalog test enforces this. Don't force a tag that
     doesn't honestly fit; an empty category is fine.
   - `order`: one past the current highest (`grep -rh '"order"' packages/templates/catalog/*/template.json`).
   - `sampleAt` (optional, 0–1): fraction into the first scene where the poster
     samples its frame. Only set this if the default (0.6) lands mid-transition
     — check after generating the poster (step 6), don't guess ahead of time.
   - Don't write a `video` field yourself — `render-video.mjs` stamps it
     automatically (step 7) with the R2 URL its last upload landed at. It's a
     record for a human to glance at, not something any client reads; hand
     editing it does nothing but lie in the sidecar until the next render.

5. **Regenerate the scaffold** (`package.json`, `tsconfig.json`, `.npmrc`,
   `.gitignore`, `AGENTS.md` — written fresh from `@genmotion/project`'s own
   renderers, not copied from the source project):
   ```sh
   pnpm --filter @genmotion/templates scaffold <id>
   ```

6. **Generate the poster, then look at it:**
   ```sh
   pnpm --filter @genmotion/templates poster <id>
   ```
   Read the resulting `packages/templates/catalog/<id>/poster.jpg` (the Read
   tool renders images). If it lands mid-word-flip or mid-sentence, trace the
   first scene's actual `interpolate`/`Sequence` timing to find a settled,
   legible frame and set `sampleAt` in `template.json`, then regenerate.

7. **Render the video and upload to R2** — see the next section.

8. **Run the tests:**
   ```sh
   pnpm --filter @genmotion/templates test
   pnpm --filter @genmotion/templates typecheck
   ```
   Failure modes worth knowing: "bundles and smoke-renders every scene" catches
   real scene bugs; "every declared audio path resolves to a real file" catches
   a manifest audio reference that didn't get copied; "fits the remix budget"
   is the 12MB check.

## Rendering a template's video

`render-video.mjs` drives headless Chromium frame-by-frame through the same
render host `poster.mjs` uses, encodes with ffmpeg, muxes in the manifest's
audio, and uploads the result to R2 at a fixed key (`templates/<id>/video.mp4`
— re-running overwrites it in place, nothing else needs updating).

```sh
pnpm --filter @genmotion/templates render-video              # every template
pnpm --filter @genmotion/templates render-video <id>          # just one
```

Needs the root `.env`'s S3 vars set (`S3_ENDPOINT`, `S3_BUCKET`,
`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`) — same store every other upload
in this repo already uses. **Check what `S3_ENDPOINT` actually points at
before running this against every template** — in this repo's root `.env` it
is the *real* Cloudflare R2 bucket, not local MinIO, even with Docker's local
stack up (MinIO sits there unused unless something is reconfigured to point at
it). Uploading is real, hard-to-fully-undo infrastructure activity against a
production bucket — confirm with the user before a first bulk run, the same
way you'd confirm before any other outward-facing action; a single template as
a check, then the rest, is a reasonable way to do that.

This is a **manual, local step**, not something CI or a deploy runs — there is
deliberately no test that asserts a template's video already exists in R2 (that
would make the test suite depend on network/credentials it doesn't otherwise
need). A template that hasn't been rendered yet just shows its poster with no
playable video, both in the desktop app and on the web, until someone runs
this.

### On-screen video and oversized images

A scene can embed a real `<Video>` overlay (a face-cam, a screen recording), not
just `<Img>`/`<Audio>` — `prequel-launch` does. That, and any image over the
512KB inline limit, leaves the same `TRIPWIRE_PREFIX` placeholder in the
bundled scene code. `render-video.mjs` resolves every one of them during the
render: it rewrites the placeholder to a fake origin
(`https://gm-template-asset.internal`) and answers every request to it
straight from the template's own `assets/` folder via a Playwright
`context.route()` handler — no real network involved, and no size limit
enforced. This is what makes an on-screen `<Video>` actually play back
correctly frame-by-frame instead of rendering as a blank box.

If a render ever does produce a visibly broken frame for an asset, it's not
this mechanism failing silently — check first that the referenced file
actually exists on disk under `assets/` (the catalog test "every scene
bundles, and every asset it leaves unlined is real" already checks this).

## Refreshing a template after its source project changes

When the user says they've edited the source project and asks to re-add it —
don't try to patch just the bits that changed. Diff first to see the scope:

```sh
diff ~/.genmotion/projects/<slug>/project.json packages/templates/catalog/<id>/project.json
diff <(ls ~/.genmotion/projects/<slug>/scenes) <(ls packages/templates/catalog/<id>/scenes)
```

That's usually enough to tell whether it's a timing tweak or a real content
change. Then:

1. `rm -rf packages/templates/catalog/<id>/` — delete the old copy entirely.
   Patching in place risks leaving a removed scene, a renamed asset, or a
   stale import lying around from the version that's gone.
2. Redo the add-a-template checklist from step 1 (or from step 2 if the
   referenced-asset list is unchanged) against the *current* state of the
   source project.
3. `template.json`'s content (title/description/tags/category/order) usually
   doesn't need to change just because timing or an asset did — reuse it
   as-is unless the update actually changed what the template is *about*.
4. Re-render the video (it's now stale even though the file on disk is
   untouched — the composition's timing or content changed underneath it).

## Where the video actually gets served from

Nothing serves scene bundles to a client anymore — every public gallery/detail
page (desktop and web alike) just plays `GET /api/templates/:id/video`, which
proxies the R2 object (Range-aware, so seeking works). The **only** place raw
project source still travels over the wire is `GET /api/templates/:id/files`
(what a remix writes to disk) — that route is untouched by any of this and
needs no re-render to stay correct; it packages the actual source files
directly. If a template's *source* changes (a scene edit, a new asset) without
re-running `render-video`, the remix will reflect the change immediately but
the played-back video will be stale until the next render — that staleness is
expected and is why `render-video` is step 7 of the add-a-template checklist,
not a one-time setup task.
