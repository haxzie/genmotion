---
name: three-look
description: "The look of a Three.js video: lighting setups (product, dramatic, soft, neon), backgrounds and fog, palettes with one accent, materials that read on camera, glow and grain built from planes and shaders, and how to keep the look consistent across scenes. Load it when a Three.js scene looks flat, muddy, dark or cheap, or when setting the visual direction for a new video."
---

# The look of a Three.js video

A scene can be built correctly and still look amateur. Almost always it is the lighting, then the palette, then too many materials. This skill is the short list of setups that work.

## When to use

- Setting the visual direction at the start of a video.
- A captured frame looks flat, muddy, too dark or plasticky.
- Scenes look like they came from different videos.

## One look file

Put the palette, lights and shared materials in `components/look.ts` and import them everywhere:

```ts
export const PALETTE = {
  bg: "#07070c",
  surface: "#14141c",
  text: "#f4f4f7",
  muted: "#8b8b99",
  accent: "#c6f91e",
} as const;
```

One accent colour. Everything else is neutral. If the brand has colours, the accent is the brand colour and the rest stays neutral around it.

## Lighting setups

| Setup | Lights | Use for |
| --- | --- | --- |
| **Product** | Key `DirectionalLight` 2.5–3.5 front-left high; fill 0.8–1.2 front-right low; rim 2–3 from behind; ambient 0.3 | Devices, logos, hero objects |
| **Soft** | `HemisphereLight` (sky light, ground slightly darker) at 1.5 plus a weak key | Friendly explainers, pastel palettes |
| **Dramatic** | One strong key from the side, ambient 0.1, dark background | Reveals, launches, serious tone |
| **Neon** | Dark scene, no ambient, coloured `PointLight`s near the subject, emissive materials on key shapes | Tech, gaming, night |

A rim light from behind is what separates a subject from a dark background. Add one before you brighten anything else.

## Backgrounds and depth

- Set `scene.background` explicitly. The canvas is transparent.
- Add `THREE.Fog` in the background colour so floors and far objects fade instead of ending in a hard line.
- A large, dim gradient plane far behind the subject (a `CanvasTexture` of a radial gradient) gives depth for free.
- Three depths: background, subject, a little foreground. A flat line-up of objects at one distance looks like a slide.

## Materials that read

- `MeshStandardMaterial` with `roughness` 0.3–0.6 for most things. Fully glossy (0) or fully rough (1) both look cheap without an environment map.
- `metalness` above 0.5 needs something to reflect. Without an environment, metal goes black. Keep it low unless you build a `PMREMGenerator` environment from a simple scene in the builder.
- Reuse a handful of material instances. Twenty slightly different greys read as noise.
- Emissive colour (`emissive` plus `emissiveIntensity`) is the cheap way to make an accent glow.

## Glow and grain

- **Glow:** a soft radial-gradient `CanvasTexture` on a plane behind the object, additive blending (`blending: THREE.AdditiveBlending`, `depthWrite: false`). No post-processing pass is needed or available.
- **Grain:** a full-screen plane in front of the camera with a `ShaderMaterial` that hashes UVs plus the frame number into noise at very low opacity. Seed it from `frame`, which keeps it deterministic.
- **Vignette:** the same full-screen plane, darkening toward the edges.

## Requirements

| Need | What | Fallback when it is missing |
| --- | --- | --- |
| Judging the look | `capture-frames`, one frame per scene | None. Lighting is only judged by looking |

## Checks before you finish

1. `capture-frames` on one frame per scene and compare them: same palette, same light direction, same background family.
2. Nothing important is pure black or blown out to white.
3. Text sits on a calm area with enough contrast. Fade or darken what is behind it if not.
4. `validate` passes.
