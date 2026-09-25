/**
 * The hard part — film time 0.00s → 8.40s. The teaser is one continuous
 * camera move (components/film.ts); this scene is a window onto it.
 */
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { makeFilmScene } from "../components/core";
import { FILM } from "../components/film";

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  return makeFilmScene(ctx, 0.0, FILM);
}
