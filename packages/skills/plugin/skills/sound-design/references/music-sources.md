# Music sources: where a legal track comes from

Read this when the `music` decision ladder in SKILL.md gets past "the user's own file": to search the free libraries (the default when nothing is connected), verify a licence, write the credit, pick a generator or recommend a connector. Sources and API shapes verified 2026-10-03; **licences, prices and limits change, so verify on the source's own page before relying on any of them.**

## The ladder, restated

1. The user's file or licence (a subscription library, a composer, a stock purchase).
2. A generator that is **already connected** (ElevenLabs Music; Stable Audio, MusicGen or Lyria through fal or Replicate).
3. **The default when nothing is connected: a CC0 / public-domain / CC BY track from the web**, searched with `web-research`, 2–3 candidates downloaded with `save-asset`, analysed with `ffmpeg` (`beat-sync.md`), the best fit credited in `VIDEO.md`. Do not stop to ask first: fetch, fit, and tell the user what you used and how to swap it.
4. The web is unreachable or nothing fits: say which sources failed, ask the user for a track, and offer a generator with `recommend-integration` (ElevenLabs first).
5. Last resort, said to the user as a fallback: an SFX-led film with natural tails and designed silence. Never a synthesised noise bed, and never a synthesised sine "beat" passed off as music (if you build a placeholder pulse to time the cut, label it a placeholder and replace it).

## Write the brief first (1–2 lines in `VIDEO.md`)

From the Direction: tempo range, energy and instrumentation, whether it needs a drop (and where the peak is in seconds), how it ends (a button, not a fade), the length needed (the film plus 2–3 s), instrumental if any voice. Example: *"110–125 BPM electronic, kick-driven, a clear drop for the reveal at ~8 s, a hard ending; 20 s; instrumental."* The search terms come from it (genre + mood + instrument + "instrumental").

## Where to search, best first

| # | Source | Licences to accept | How to query (with `web-research`) | What comes back | Notes |
|---|---|---|---|---|---|
| 1 | **Openverse** (indexes Jamendo, Freesound and Wikimedia Commons audio; not ccMixter) | `cc0`, `pdm`, `by` | `https://api.openverse.org/v1/audio/?q=<terms>&license=cc0,pdm,by&category=music&page_size=20&format=json` (keyless) | per result: `title`, `creator`, `license` + `license_version` + `license_url`, `foreign_landing_url` (the track's own page: verify there), `url` (a direct file: Jamendo MP3 or Freesound HQ preview), `duration` in **ms**, `genres`, `tags`, a ready-made `attribution` line, `waveform` | anonymous: 20 requests/min, 200/day, at most 240 results per query (response headers). Jamendo tags carry `instrumental` and `speed_low` … `speed_veryhigh`, a free tempo hint. The `length` filter is coarse (`medium` returned 4–8 min tracks): filter on `duration` yourself. For SFX drop `category=music` and add `source=freesound`. |
| 2 | **Incompetech** (Kevin MacLeod) | CC BY 4.0 | the track page `https://incompetech.com/music/royalty-free/index.html?isrc=<ISRC>`; the whole catalogue as JSON at `https://incompetech.com/music/royalty-free/pieces.json` (large) | genre, length, feel, instruments, **tempo in BPM**, and the attribution code to paste verbatim; the MP3 carries a `TBP` BPM tag | well produced, clean buttons, very widely used: it can feel familiar |
| 3 | **Free Music Archive** | only tracks marked CC BY, CC BY-SA (see below) or CC0 | search the site; open each track page | per-track licence badge | much of the catalogue is NC: check every track |
| 4 | **ccMixter** "free for commercial use" (`dig.ccmixter.org`) | CC BY | web only | | was returning 502 on 2026-10-03; try it, move on if down |
| 5 | **Mixkit** | Mixkit Stock Music Free License | web only, direct downloads | | commercial web, social and online ads, no attribution; not broadcast, games or physical media; the licence differs per item type, read the music one before use |
| 6 | **Pixabay Music** | Pixabay Content License | web only (the API covers images and video) | | some tracks are registered with Content ID: **warn the user before a YouTube upload** |
| 7 | Wikimedia Commons audio (through Openverse) | `pdm`, `cc0`, `by` | as row 1 without `category`, `source=wikimedia_audio` | | public-domain classical recordings: both the composition and the recording must be free |
| SFX | **Freesound** | CC0, CC BY | through Openverse (row 1), keyless HQ previews; its own API needs a token | | previews are enough for SFX; reject CC BY-NC |
| SFX | **Kenney** audio packs (Interface, UI, Impact, RPG …) | CC0 | kenney.nl (also mirrored on GitHub with the pack's `License.txt`) | | clean, consistent families of clicks, taps, impacts, glass |

Reachability differs per machine. If a host is blocked, say so in one line and take the next row; a mirror of a known library (a GitHub repo that vendors Incompetech or Kenney files) is fine as a *download* source as long as the licence is verified on the original page.

### Other sources (still valid, used less often)

| Source | Licence | Access | Verdict |
|---|---|---|---|
| **Jamendo** directly | per-track CC (BY, BY-SA, BY-NC, ND); NC tracks need a paid Jamendo Licensing deal | API v3 (`/tracks`, `client_id`, returns licence and download URL) | Openverse already serves its CC BY tracks keyless; use the API only with a key |
| **Freesound** directly | per sound CC0, CC BY, CC BY-NC | API v2: token for search and HQ previews, OAuth for originals; ~60 req/min, 2,000/day | only when Openverse lacks a sound |
| **Uppbeat** | free plan needs a per-video credit code | no API | manual |
| **Bensound** | free tier requires credit and **excludes ads** | no API | not for ads without a paid licence |
| **Sonniss GDC bundles** (SFX) | royalty-free, commercial, no attribution, no AI training | direct downloads, no API | an excellent local SFX library the user downloads once |
| **Epidemic Sound** (paid) | subscription | Partner API and an official MCP (beta): search, Soundmatch, beat detection, cut a track to a target duration, stems | the strongest option when a brand wants human-made music |

Suno has no public API (an invite-only partner programme was announced 2026-07) and Udio became a closed walled garden after its label settlements: never use either through an unofficial wrapper. The YouTube Audio Library's CC BY tracks are fine with credit; its "YouTube licence" tracks are for YouTube only.

## Licence checks (before anything is placed)

- **Verify on the track's own page** (`foreign_landing_url`, the Incompetech or FMA page), never on a mirror, an aggregator's summary or a blog list. Tested: one GitHub mirror labelled a ccMixter track "CC-BY-NC" in one file and linked its source; another track carried "CC BY" in its text file and "CC-BY-NC-SA" in its metadata. Conflicts and unknowns are rejections.
- **Accept** CC0, the public-domain mark and CC BY (any version, including ported ones such as `by/2.0/de`).
- **Reject** NC (any commercial or promotional film), ND (CC 4.0 counts music synchronised to moving images as an adaptation, so an ND track cannot be cut to picture and shared), and **BY-SA for anything the user will not release under BY-SA** (the same rule makes the whole film an adaptation of the track). Reject no licence, "free for personal use", "royalty free" without terms, YouTube Audio Library "YouTube licence" tracks outside YouTube, BBC Sound Effects (RemArc: personal and educational only), commercial songs, soundboard rips, and unofficial Suno or Udio wrappers.
- Lyrics under a voice are a rejection on taste, not licence: prefer results tagged `instrumental` and say in `VIDEO.md` that the track is instrumental per its page.

## Candidates: pick 2–3, analyse, choose

Pick by description, tags, the BPM hint and `duration` (long enough for the film, with a drop and a real ending). Download each with `save-asset` into `assets/` (`music-cand-1.mp3` …), run the detector in `beat-sync.md` on each, and choose the one whose section map matches the film's energy curve: a KICK-IN or UP bar where the peak goes, a quiet bar before it for the breath, a measured final hit for the end card. Delete the losers from `assets/` and say which you kept and why.

## Credit formats

- Openverse results carry an `attribution` field: use it as given, then add the source URL.
- Incompetech: `"<Title>" Kevin MacLeod (incompetech.com) Licensed under Creative Commons: By Attribution 4.0 License http://creativecommons.org/licenses/by/4.0/`
- Generic CC BY: `"<Title>" by <Creator> (<track page URL>), licensed under CC BY <version> (<license_url>)`
- CC0 / public domain: no credit required; record it anyway for provenance.

Record in `VIDEO.md` and tell the user where the credit must appear (description or end card):

```
## Music
Brief: <the 1–2 lines above>
Track: "<Title>", <Creator> — <track page URL> — <licence + version>
Grid: <BPM> (<f/beat>), first downbeat <s>, check <ms> median; drop bar <n> (<s>); button <s>
Edit: <in/out points and joins>; pre-mastered <LUFS / dBTP>
## Credits
- Music: <exact attribution line> — in the video description
- SFX: <pack or sound, creator, URL, licence>
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
