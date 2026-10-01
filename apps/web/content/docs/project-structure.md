---
title: Project structure
seoTitle: "Project structure, project.json and the Three.js scene API"
description: "What's inside a GenMotion project: project.json, Three.js scenes, assets and VIDEO.md, plus the scene API and the determinism rules every frame follows."
group: Guides
order: 4
keywords: [GenMotion project.json, Three.js scene API, deterministic animation, video project structure, programmatic video scenes]
updated: 2026-10-01
---

A GenMotion project is an ordinary folder. Everything about the video is in files you can read, diff and commit.

## Files

```text
my-video/
├── project.json        the timeline: size, fps, scenes in order, audio
├── scenes/
│   └── 01-intro.ts     one module per scene
├── components/         pieces shared between scenes
├── assets/             images, audio, video, fonts, 3D models
├── VIDEO.md            the brief and the chosen skill
├── exports/            rendered videos
├── AGENTS.md           rules and commands for agents
└── package.json        dev, check and render scripts
```

## project.json

```json title="project.json"
{
  "name": "Moonlight launch",
  "engine": "three",
  "fps": 30,
  "width": 1920,
  "height": 1080,
  "scenes": [
    { "file": "scenes/01-intro.ts", "durationInFrames": 150 },
    { "file": "scenes/02-hero.ts", "durationInFrames": 120, "name": "Hero" }
  ],
  "audio": []
}
```

Scenes play in array order. `npx @genmotion/cli scene add "Hero" --duration 4s` creates the file and adds the entry in one step. `npx @genmotion/cli info` prints the timeline with each scene's start frame.

Audio clips sit on tracks with a `file`, `startFrame`, `durationInFrames`, and optional `volume`, `fadeInFrames` and `fadeOutFrames`. They are mixed into the export.

## A scene

A Three.js scene default-exports a builder. The builder sets up the scene once and returns an update function that runs for every frame:

```ts title="scenes/01-intro.ts"
import * as THREE from "three";
import { interpolate, Easing, type ThreeSceneContext, type ThreeSceneUpdate } from "@genmotion/three-engine";

export default function buildScene({ scene, camera }: ThreeSceneContext): ThreeSceneUpdate {
  const cube = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 1.6, 1.6),
    new THREE.MeshStandardMaterial({ color: "#6ee7ff" }),
  );
  const key = new THREE.DirectionalLight(0xffffff, 3);
  key.position.set(3, 4, 5);
  scene.add(cube, key, new THREE.AmbientLight(0xffffff, 0.6));
  camera.position.z = 5;

  // Runs once per frame. Everything is a function of time.
  return ({ time, progress }) => {
    cube.rotation.set(time * 0.6, time, 0);
    cube.scale.setScalar(interpolate(progress, [0, 0.2], [0.4, 1], Easing.easeOut));
  };
}
```

The update receives `frame`, `time` (seconds into the scene) and `progress` (0 to 1 across the scene).

## The determinism rules

Every frame is a pure function of time. That is what makes the preview, `check` and the export agree, and what lets frames render in parallel.

- No clocks: no `THREE.Clock`, `requestAnimationFrame`, `setAnimationLoop`, `Date.now` or timers.
- No unseeded randomness: use a seeded generator if you need noise.
- No hot-linked remote URLs: save files into `assets/` and import them.

`npx @genmotion/cli check` enforces these and names the line that breaks one.
