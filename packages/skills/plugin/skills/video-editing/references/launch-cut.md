# Launch cut: founder footage, product footage and UI

Read this when the user has real footage for a launch (a founder on camera, product shots, screen recordings) and wants it cut into a launch film, a crowdfunding video or social cutdowns. If there is no footage and the film is built from screenshots and motion graphics, `launch-playbook` owns it instead. Recipe numbers (§) refer to `ffmpeg-recipes.md`.

## The shared skeleton (60–120 s)

| Time | Beat | Footage |
|---|---|---|
| 0–5 s | Hook: the problem's tension, or the most striking product moment | the best 1–2 shots |
| 5–20 s | Problem / the old way | founder soundbite + a visual of the pain |
| 20–30 s | Reveal: hero product shot or the UI's magic moment | hold 3–6 s |
| 30–80 s | 3 features, each feature → benefit → proof shot, 10–15 s each | UI and product, founder lines between |
| 80–100 s | Proof: customers, numbers, press, the founder's conviction | |
| last 3–5 s | Logo + CTA with the URL on screen ("available today", price) | logo hold per `motion-language` (75–120 f) |

## Founder plus product (the default)

- The founder is there for credibility (why we built it). Cut them to **2–4 s soundbites between product visuals**; never more than 10 s on the talking head without product on screen.
- Paper edit the founder's interview first: pick the 5–8 lines that carry problem → insight → promise. Ethics rule applies: no stitched claims.
- **UI footage** (load `screen-capture`): recorded at 2× display resolution; clean (no notifications, real-looking data); focus pushes to the region of action at 1.5–2.5× (`ugc-craft`'s focus push); typing and loading speed-ramped (§8 stepped segments). Present it full-bleed or in a device frame or a floating rounded window with a soft shadow built in the scene.
- Music: modern and upbeat, 110–128 BPM; the feature montage cuts on beats; under the founder the bed ducks to 18–25 dB below the voice.
- Captions burned in for social cutdowns (word pop per `ugc-craft`); a clean subtitle style or none on the website master.

## Apple-style (product-led, little talk)

- Sections: **hero reveal** (slow: the product enters as the light changes, building with the music) → **details** (macro shots of materials and features) → **in context** (the product in use) → finale montage → hold on product + logo.
- Black or seamless backgrounds; one idea per shot; very little text: one-word claim cards ("Thin." "Fast.") on hits.
- Every motion, swipe and click lands on a musical event (the beat grid from `sound-design`); UI sounds may be replaced by musical notes.
- Narration, if any, is calm and sparse: short sentences with silence between.
- Cut rhythm: hero holds 3–6 s (90–180 f); details 1–2 s on the beat; the finale faster; the logo hold long.
- With user footage: slow pushes on the best product shots (1.0 → 1.08 over 3–6 s in the scene), a dark grade with lifted contrast (§8), match cuts on shape or motion between shots, and type cards.

## Crowdfunding (Kickstarter-style, 1:30–3:00)

1. Hook + the product in use: the first 30 s must show what it is and why it matters.
2. Founders introduce themselves, direct to camera, authentic.
3. The problem.
4. The solution and how it works.
5. Proof: prototypes, testing, press, team.
6. What the money does: rewards, timeline.
7. Thank-you and a "back us" CTA with the URL.

Campaign videos overwhelmingly feature the founders; sincerity beats a sales voice. Keep the founder on camera longer here than in a launch film (5–15 s blocks), but still cover every claim with a proof shot.

## Social cutdowns

From the master: 30 s (hook → reveal → best feature → CTA) and 15 s (hook → reveal → CTA), each re-cut to its own music edit, 9:16 and 1:1, captions burned, frame 0 already showing the product or the founder mid-line. Treat each as a short-form edit in the main skill's table.

## Mistakes

A feature list with no benefits; tiny unreadable UI; 60 s of talking head before the product appears; music that doesn't fit the brand; a CTA without a URL on screen; dev data or notifications visible in the UI; a founder line edited into a claim they didn't make.
