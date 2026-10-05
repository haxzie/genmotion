---
title: "How do I add a voiceover and captions to a HyperFrames video?"
description: "Generate narration locally or ask your agent for it, transcribe it into word-level timestamps, turn the transcript into readable captions, and mix music under the voice without cutting words."
tool: hyperframes
kind: how-to
date: "2026-10-05"
updated: "2026-10-05"
tags: ["audio", "captions", "voiceover", "tts"]
related:
  - hyperframes-install-failed-npx-skills-add
  - hyperframes-render-looks-different-from-preview
  - hyperframes-determinism-rules
sources:
  - label: "HyperFrames: Use voice, music, sound, and captions"
    url: "https://hyperframes.heygen.com/guides/voice-and-audio"
  - label: "HyperFrames: CLI reference (tts, transcribe)"
    url: "https://hyperframes.heygen.com/packages/cli"
  - label: "HyperFrames: Add captions or repackage talking-head footage"
    url: "https://hyperframes.heygen.com/guides/captions-and-recuts"
genmotion:
  heading: "Voiceover that is timed to the scene"
  body: |-
    GenMotion generates narration per scene with text to speech and gives the agent the timings, so motion can be cued to the words. You hear it in the preview and see its waveform on the timeline under the scene it belongs to, and you fix a bad read by changing the script rather than cutting around it.
faqs:
  - q: "Do I need an API key to generate a voiceover?"
    a: "Not for the local route. npx hyperframes tts uses a local model (Kokoro-82M), needs no API key, and nothing leaves the machine. Hosted voice providers are optional and have their own costs."
  - q: "Can I use captions from another tool?"
    a: "Yes. npx hyperframes transcribe can import an existing .srt, .vtt or supported transcript JSON file instead of transcribing audio."
  - q: "How do I keep music from drowning the voice?"
    a: "Duck the music under speech rather than lowering the whole track. HyperFrames has a voiceover carve that takes only the frequency bands the voice occupies out of the music, so the bed keeps its low end and its top instead of going limp for the whole voiceover."
---

Give each audio layer one job. Voiceover carries the explanation, source audio preserves speech from footage, music shapes pace, sound effects reinforce an action, and captions make the spoken words readable on screen.

## 1. Generate the voiceover

**Ask your agent.** Give it the approved wording and voice direction:

```text
Generate the approved SCRIPT.md as a warm, direct voiceover.
Natural pace, no announcer energy. Keep the product-name pronunciation exact.
```

Keep the script, the audio and the word-level transcript as separate files. That lets you regenerate the voice without losing the timing and caption work built on it.

**Or generate it yourself, locally:**

```bash
npx hyperframes tts "Welcome to HyperFrames"
npx hyperframes tts "Intro" --voice bf_emma --output narration.wav
npx hyperframes tts "Slow and clear" --speed 0.8
npx hyperframes tts script.txt
npx hyperframes tts --list
```

It uses a local Kokoro-82M model: no API key, and nothing leaves the machine. `--list` shows the voices.

Listen before building the final edit. Fix wording, pronunciation or delivery in the script or the voice direction rather than cutting around a bad read.

## 2. Place the audio in the composition

Audio is timed with the same attributes as everything else:

```html
<audio id="vo" data-start="0" data-duration="8" data-track-index="2" src="./assets/narration.wav"></audio>
```

HyperFrames owns playback. Do not call `play()` or set `currentTime` from a script. A video that carries its own sound keeps it on the `<video>` with `data-has-audio="true"` and no `muted`; use a separate `<audio>` for music and voiceover.

## 3. Transcribe

Transcription turns audio or video into timed words. Start with the automatic engine: it uses Parakeet when installed and falls back to Whisper.

```bash
npx hyperframes transcribe interview.mp4
npx hyperframes transcribe interview.mp4 --language es
npx hyperframes transcribe interview.mp4 --engine whisper --model medium.en
npx hyperframes transcribe interview.mp4 --engine whisper --model large-v3
```

Pass the language when you know it, which filters non-target speech and lets the Whisper fallback pick a multilingual model. Use `medium.en` for difficult English audio and `large-v3` when the language is unknown. A larger model takes longer and does not remove the need to read the result.

You can also import a transcript you already have:

```bash
npx hyperframes transcribe subtitles.srt
```

## 4. Turn the transcript into captions

1. Read the whole transcript.
2. Correct names, product terms, numbers, punctuation and obvious recognition errors.
3. Group words into short phrases that break on meaning.
4. Open the captions in Studio to inspect rhythm and adjust placement, scale or rotation. Make lasting wording, timing, style and animation changes in the caption source, or ask the agent to update it.
5. Watch once with sound for sync and once muted for readability.

Captions should follow what was said, and they should not cover a face, a product control or anything else important. Use emphasis on the few words that carry the point instead of making every word compete.

## 5. Mix for understanding

- Keep the voice clear above the music.
- Duck the music under important speech, rather than reducing the whole track equally. A voiceover carve takes only the bands the voice occupies out of the music.
- Use sound effects for meaningful events, not every movement.
- Do not cut words, breaths or reverb tails at scene boundaries.
- Let a deliberate silence stay silent.

When narration drives the video, time the visual changes to the real transcript rather than to estimated scene lengths.

## Check it worked

Render a review file, then listen once without watching. Audio problems are easier to hear when the visuals are not competing:

```bash
npx hyperframes render --quality draft --output review.mp4
```

Check that speech stays clear through the loudest musical section, names and claims in the captions are accurate, and the music ends on purpose rather than at the edge of the file.
