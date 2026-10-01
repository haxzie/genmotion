---
name: three-transitions
description: "Getting from one Three.js scene to the next without a fade to black: handoff objects, match-cuts on shape and colour, camera carries, fill-the-frame wipes, iris and shutter masks built from planes, and shader dissolves with ShaderMaterial. Covers the timing contract on both sides of the cut and the transitions to avoid. Load it when a Three.js video has more than one scene, or when cuts feel abrupt."
---

# Transitions between Three.js scenes

Scenes are separate builders, cut together back to back. The renderer does not cross-dissolve them, so every transition is something the two scenes do together, in their last and first frames. The project's authoring guide states the rule (a shared handoff element, no fade to black); this skill is the catalogue.

## When to use

- The video has two or more scenes and you are planning how each one ends.
- A cut feels like a jump.
- A format skill asks for a "seamless", "continuous" or "one-take" feel.

## The contract

- The last 10–15 frames of scene N and the first 10–15 of scene N+1 are planned as one move.
- Whatever carries the transition (an object, a colour, the camera) is at the same screen position, size and colour on both sides of the cut.
- Everything that is not the carrier has finished leaving scene N about six frames before the end.
- Shared numbers (positions, colours, distances) live in `components/` and both scenes import them.

## The catalogue

| Transition | How | Best for |
| --- | --- | --- |
| **Object handoff** | One mesh (a logo, a card, a dot) survives the cut at the same screen position. Scene N+1 builds the same mesh and starts it there | The default. Almost any pair of scenes |
| **Fill the frame** | Scene N scales an object (or pushes the camera into it) until its colour covers the whole frame. Scene N+1 opens on that solid colour and pulls back or reveals | Changing topic completely; chapter breaks |
| **Camera carry** | Scene N ends mid-move; scene N+1 continues the same move from the same framing | Fly-throughs, product tours |
| **Match-cut** | A shape in scene N (a circle) cuts to a similar shape in N+1 (a planet, a button) at the same place and size | Explainers, metaphors |
| **Wipe** | A flat plane in front of the camera sweeps across in scene N's last frames; scene N+1 starts covered and the plane sweeps off | Fast-paced lists, social cuts |
| **Iris / shutter** | A ring or two bars built from planes close in on scene N and open on N+1 | Playful, retro, reveals |
| **Shader dissolve** | A full-screen `ShaderMaterial` plane in front of the camera, driven by a uniform from 0 to 1, masks the scene with noise or a gradient | Premium or soft moods. Use sparingly |

## Building a wipe or mask plane

Put the plane in front of the camera, sized from the camera so it always covers the frame:

```ts
const dist = 0.5;
const h = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * dist;
const cover = new THREE.Mesh(
  new THREE.PlaneGeometry(h * (width / height) * 1.05, h * 1.05),
  new THREE.MeshBasicMaterial({ color: ACCENT, depthTest: false }),
);
cover.renderOrder = 999;
cover.userData.pickable = false;
camera.add(cover);
cover.position.z = -dist;
scene.add(camera);
```

Then move or scale it from the frame callback. Because it is a child of the camera, it stays put while the camera moves.

## Shader dissolve

A dissolve is a `ShaderMaterial` with a `progress` uniform you set each frame. Use deterministic noise computed from UVs in the shader (a hash of the coordinates), never a texture loaded at random. Keep it to one full-screen plane; heavy shaders multiply render time by the frame count.

## Timing

| Part | Frames at 30fps |
| --- | --- |
| Carrier's move on each side | 8–14 |
| Wipe or iris, each half | 6–10 |
| Shader dissolve, whole | 12–20 |

Faster transitions feel energetic, slower ones premium. Pick one speed for the whole video.

## What to avoid

- A fade to black between scenes. It reads as "the video ended".
- Different transitions on every cut. Pick one or two and repeat them.
- A transition longer than the beat it introduces.

## Requirements

| Need | What | Fallback when it is missing |
| --- | --- | --- |
| Checking the cut | `capture-frames` on the last frame of scene N and the first frame of N+1 | None |

## Checks before you finish

1. For every cut, `capture-frames` on the last frame of the outgoing scene and the first frame of the incoming one. Put them side by side: the carrier matches in position, size and colour.
2. Nothing but the carrier is still on screen in scene N's final frames.
3. Mask and wipe planes have `userData.pickable = false`.
4. `validate` passes.
