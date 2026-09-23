/**
 * Enter number — film time 15.4s → 27.10s. The film is drawn as one continuous
 * timeline (components/film.ts); this scene is a window onto it.
 */
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { makeFilmScene } from "../components/core";
import { drawFilm } from "../components/film";

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  return makeFilmScene(ctx, 15.4, drawFilm);
}
