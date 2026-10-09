---
"@genmotion/desktop": patch
---

The studio agent now confirms the spend before it makes a paid call. Both harnesses' prompts carry one rule: the GenMotion generators and any connected integration's tools cost real money, so the agent puts the whole plan in front of the user first (what it would generate, how many, which model, what it costs) and waits for a yes. It may only quote a price the tool or the provider's own balance tool actually states, never an invented one, and one yes covers that plan, with a fresh ask before going past it or re-generating something that already came back. Local work (capture, validate, ffmpeg, save_asset) still needs no permission.
