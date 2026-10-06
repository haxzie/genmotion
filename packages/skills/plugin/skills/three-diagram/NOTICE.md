# Attribution

The `three-diagram` skill's **design system and layout grammar** — the visual-type
routing, the per-kind node treatments, the semantic colour roles, the complexity
budget, the structural grid, and the six mandatory connector rules — are **adapted
from** the open-source **Diagram Design** skill by Cathryn Lavery:

> https://github.com/cathrynlavery/diagram-design

Adaptations for this repo: the output is a Three.js scene graph rather than a
self-contained HTML page, so every SVG primitive (markers, mask rects, `stroke-dasharray`,
the accessible-SVG contract, the `overflow-x` wrapper) is replaced by its scene-graph
equivalent; the type ramp and structural grid are doubled, because a 1920x1080 frame
needs type above the 28px legibility floor where a blog figure does not; node-name weight
caps at 500 to match this repo's house typography; `verify-geometry.py` is replaced by
`audit()`, which checks the same rules against the scene graph and fails `genmotion check`;
and connectors gained draw-on reveal, port snapping and corridor deconfliction, which a
static figure does not need. Diagram types beyond `architecture` are not ported.

The original is MIT-licensed; its notice is retained below as required.

```
MIT License

Copyright (c) 2025 Cathryn Lavery

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
