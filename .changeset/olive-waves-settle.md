---
"@genmotion/desktop": patch
---

Fix the editor running out of memory on a project with a long audio clip. The timeline's waveforms decoded every audio file in full, at full rate, once per component asking for one — so a project carrying an hour-long music bed drove the renderer to ~8.8GB and killed it (taking every open tab with it) as soon as a second project was opened. A file now decodes once however many strips want it, long files decode at a rate the strip can actually use, and anything over twenty minutes shows its length without a shape. The same project now peaks at ~270MB.
