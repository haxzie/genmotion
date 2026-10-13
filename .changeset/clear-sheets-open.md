---
"@genmotion/desktop": patch
---

A plugin's row now opens a sheet instead of connecting on the spot. A 28px `+` was the only target on a row 500px wide, sitting beside a description cut off mid-sentence, so the one thing you could press was the one thing you had the least to go on. The sheet says what the plugin does, what signing in actually involves and what the agent ends up holding, and then offers the button. A plugin that wants an API key asks for it there, beside the sentence explaining where the key goes, rather than in a second dialog after it.
