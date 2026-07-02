# Workbench E2B template

The AI chat's `workbench` tool (`packages/ai/src/sandbox-tools.ts`) runs bash /
python in an E2B sandbox seeded with the project's files. This template gives
that sandbox a full **audio/video/image** toolchain so the agent can transcode,
probe, edit, and analyze media.

## What's included

- **CLI:** `ffmpeg`, `ffprobe`, `imagemagick`
- **Python:** `moviepy`, `pydub`, `imageio` + `imageio-ffmpeg`, `soundfile`,
  `librosa`, `opencv-python-headless`, `pillow`, `numpy`, `scipy`, `matplotlib`,
  `mutagen`

Built on `e2bdev/code-interpreter` so the `python` path (E2B `runCode`) keeps
working.

## Build & enable

Authenticate the e2b CLI once (building/publishing needs an **access token**, not
the `E2B_API_KEY` — get it from https://e2b.dev/dashboard?tab=keys):

```bash
npx -y @e2b/cli auth login        # or: export E2B_ACCESS_TOKEN=e2b_...
```

Then build & publish the template (scripts live in `packages/ai/package.json`):

```bash
pnpm --filter @genmotion/ai e2b:build
pnpm --filter @genmotion/ai e2b:publish
```

Finally set on the **API** process (that's where the chat tools run) and restart it:

```
E2B_WORKBENCH_TEMPLATE=genmotion-workbench
```

## Fallback

If `E2B_WORKBENCH_TEMPLATE` is unset, the workbench falls back to the E2B
code-interpreter base image (existing behaviour) — no ffmpeg/A-V packages
guaranteed. Setting the var is what enables this toolchain. If the var is set
but the template can't be created (not built/published yet, or misnamed), the
workbench logs a warning and falls back to the base image rather than failing —
so `ffmpeg`/`ffprobe` will be "command not found" until the template is live.

> Scaffold note: verify the `e2bdev/code-interpreter` base tag and adjust the
> package list to taste; the Dockerfile runs a build-time sanity check that
> ffmpeg/ffprobe and all imports work.
