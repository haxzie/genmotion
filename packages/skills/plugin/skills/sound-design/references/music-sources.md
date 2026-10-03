# Music sources: where a legal track comes from

Read this when the `music` decision ladder in SKILL.md gets past "the user's own file": to pick a generator, recommend a connector, or search a free library. Researched 2026-10. **Prices and limits change often; verify on the vendor's page before quoting any of them to a user.**

## The ladder, restated

1. The user's file or licence (a subscription library, a composer, a stock purchase).
2. A connected generator (ElevenLabs Music; Stable Audio, MusicGen or Lyria through fal or Replicate). Offer one with `recommend-integration` when none is connected.
3. A CC0 / CC BY track from a library, found with `web-research`, downloaded with `save-asset`, credited in `VIDEO.md`.
4. No music: `sfx` with natural tails, designed silence (never a synthesised noise bed).

## Free and royalty-free libraries

| Source | Licence | Programmatic access | Verdict |
|---|---|---|---|
| **Openverse** | aggregated CC and public domain (includes Jamendo, Freesound, ccMixter) | yes, keyless: `https://api.openverse.org/v1/audio/?q=<query>&license=cc0,pdm,by` (20 per page, 240 max anonymous); results carry creator and attribution text | the best first search for CC0 / CC BY music and SFX |
| **Jamendo** | per-track CC (BY, BY-SA, BY-NC, ND); NC tracks need a paid Jamendo Licensing deal for commercial use | API v3 (`/tracks`, `client_id`, returns licence and download URL) | good if filtered to CC BY / CC BY-SA and credited |
| **Free Music Archive** | per-track CC | old API is gone; web only | check each track's licence |
| **ccMixter / dig.ccmixter** | "Free Music for Commercial Projects" is CC BY; much else is BY-NC | no documented API | good instrumental-for-video category, manual |
| **Incompetech (Kevin MacLeod)** | CC BY 4.0 | direct MP3s, no API | usable with the verbatim credit below; widely recognised (overused) |
| **Mixkit** | free licence: commercial web, social and online ads, no attribution; not broadcast, games or physical media | direct downloads | fine for web promos |
| **Pixabay Music** | Pixabay Content License, commercial, no attribution | the official API covers images and video only | usable, but **some tracks are registered with Content ID** and draw YouTube claims; warn the user |
| **Uppbeat** | free plan needs a per-video credit code | no API | manual |
| **Bensound** | free tier requires credit and **excludes ads** | no API | not for ads without a paid licence |
| **Freesound** (SFX, loops) | per sound CC0, CC BY, CC BY-NC | API v2: token for search and HQ previews, OAuth for originals; ~60 req/min, 2,000/day | previews are usually enough for SFX; filter to CC0 / CC BY |
| **Sonniss GDC bundles** (SFX) | royalty-free, commercial, no attribution, no AI training | direct downloads, no API | an excellent local SFX library the user downloads once |
| **Epidemic Sound** (paid) | subscription | Partner API and an official MCP (beta): search, Soundmatch, beat detection, cut a track to a target duration, stems | the strongest option when a brand wants human-made music |

### Do not use

- **YouTube Audio Library** tracks under the "YouTube licence" anywhere but YouTube (its CC BY tracks are fine with credit). It is only reachable inside YouTube Studio anyway.
- **BBC Sound Effects** in commercial work: the RemArc licence is personal, educational and research only.
- Any **NC** (non-commercial) licence in a video that promotes a product.
- **Commercial songs**, trending TikTok sounds on a brand account (those go through TikTok's Commercial Music Library, in-app only), and **soundboard rips** of meme sounds.
- **Suno or Udio** through unofficial wrappers: Suno has no public API (an invite-only partner programme was announced 2026-07), and Udio became a closed walled garden after its label settlements.

### Attribution formats

- Incompetech: `"<Title>" Kevin MacLeod (incompetech.com) Licensed under Creative Commons: By Attribution 4.0 License http://creativecommons.org/licenses/by/4.0/`
- Generic CC BY: `"<Title>" by <Creator> (<source URL>), licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/)`

Write it into `VIDEO.md`:

```
## Credits
- Music: "Title" by Creator — https://… — CC BY 4.0 — credit goes in the video description
- SFX: generated with ElevenLabs (user's account)
```

## AI music generators

| Service | Access | Length | Price (verify) | Licence | Notes |
|---|---|---|---|---|---|
| **ElevenLabs Music** | API, hosted MCP | 3 s – 10 min | ≈ $0.30 per minute of output | paid plans: broad commercial; film, TV and large games need Enterprise | `force_instrumental`; composition plans with per-section `duration_ms` and positive/negative styles (planning is free); video-to-music scoring |
| **Google Lyria 3 / 3.5** | Gemini API | 30 s clip; ≈ 3 min Pro / 3.5 | ≈ $0.04–0.08 per song | Google terms, SynthID watermark | ask for "instrumental" in the prompt |
| **Lyria 2** | Vertex AI | fixed 30 s, 48 kHz WAV | ≈ $0.06 per 30 s | Google Cloud terms | good for beds you loop or edit |
| **Stable Audio 2.5** | Stability API, fal, Replicate | 1–190 s | ≈ $0.20 per generation | per Stability licence | music and SFX, fast |
| **Stable Audio 3.0** | API; open weights for Small / Medium | up to ≈ 6 min | ≈ $0.26 per generation | Community licence: free commercial use under $1M revenue | runs locally |
| **MusicGen** | Replicate, fal | ~30 s | ≈ $0.05–0.10 per run | weights CC BY-NC: check the host's terms on outputs | older, lower quality, melody conditioning |
| **Mubert** | REST | up to 25 min | from $49/month | sub-licensing on API plans | ambient / electronic loops |

### Prompt pattern

State, in this order: **instrumental, no vocals** → genre and instruments → **exact BPM** (a whole-frame tempo: 90, 100, 120 or 150 at 30 fps) and meter → **total length** (the film plus 2–3 s of tail) → **structure with times** → **the ending**.

| Use | Prompt |
|---|---|
| Launch | "Instrumental, no vocals. Driving electronic pop with live drums and bright synths, 120 BPM, 4/4. 32 seconds: 8-second filtered intro, 4-second riser, full drop at 0:12, steady groove to 0:29, ending on one hard hit with a 3-second tail. No fade out." |
| Explainer bed | "Instrumental, no vocals, no lead melody. Light minimal electronic, soft plucks and warm pads, 100 BPM. 75 seconds, steady and unobtrusive, sparse in the midrange so speech sits on top. Ends on a soft resolved chord." |
| Sting | "Short sonic logo, 3 seconds. A quick rising shimmer into a bright three-note synth motif ending on a sustained major chord. No drums after the first hit." |
| Trailer | "Instrumental hybrid orchestral trailer cue, 60 seconds. Act 1 quiet piano and drones at 70 BPM; Act 2 pulses and percussion building; Act 3 full drums and brass at 140 BPM; a hard stop at 0:52, 1 second of silence, then a massive final hit with a long tail." |
| UGC bed | "Instrumental lo-fi hip-hop, 90 BPM, laid-back drums, warm keys, 30 seconds, loopable, nothing busy in the midrange." |

Generate two takes; judge them on the hero moment, not the first five seconds.

## MCP servers, ranked

| # | Server | URL / install | Auth | Why |
|---|---|---|---|---|
| 1 | **ElevenLabs (hosted, official)** | `https://api.elevenlabs.io/v1/mcp` | OAuth | music at an exact length, instrumental mode, composition plans, video-to-music, plus SFX and TTS on one account. The local `elevenlabs-mcp` package was deprecated 2026-08 in favour of this |
| 2 | **Epidemic Sound (official, beta)** | `https://www.epidemicsound.com/a/mcp-service/mcp` | OAuth or API key + subscription | licensed human-made music with stems, beat data and cut-to-duration |
| 3 | **fal (official)** | `https://mcp.fal.ai/mcp` (header `Authorization: Bearer <FAL_KEY>`) | fal key | Stable Audio 2.5 / 3, MusicGen, video-to-audio models behind one key |
| 3b | **Replicate (official)** | see replicate.com/docs/reference/mcp | `REPLICATE_API_TOKEN` | the equivalent alternative to fal |
| 4 | **Freesound** (community: timjrobinson/FreesoundMCPServer, MuShan-bit/freesound-mcp) | npm / GitHub | `FREESOUND_API_KEY` | CC0 / CC BY SFX search; prefer a fork that filters by licence and downloads |
| 5 | **Music analysis** (community: hugohow/mcp-music-analysis) | librosa based | none | tempo and beat tracking beyond the `ffmpeg` heuristic |

Not recommended: Suno or Udio wrappers (they drive a logged-in browser session or cannot export), ffmpeg MCPs (the shell already has `ffmpeg`), Pixabay MCPs (images and video only).

**What to recommend**: a user who wants music generated → ElevenLabs. A brand that does not want AI music and has (or will buy) a subscription → Epidemic Sound. A user already on fal or Replicate → Stable Audio there. Nobody connected and no budget → Openverse via `web-research`, credited.
