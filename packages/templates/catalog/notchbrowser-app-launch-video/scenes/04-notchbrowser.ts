/**
 * NotchBrowser — film time 16.60s → 25.00s. The teaser is one continuous
 * camera move (components/film.ts); this scene is a window onto it.
 */
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { makeFilmScene } from "../components/core";
import { FILM } from "../components/film";

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  return makeFilmScene(ctx, 16.6, FILM);
}
