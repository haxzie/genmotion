"use client";

import { useEffect, useSyncExternalStore } from "react";
import { api } from "../../api";
import type { FilmstripData } from "../../../electron/shared";

/**
 * The scene filmstrips the main process has rendered, per project.
 *
 * One module-level store rather than state in each card: the strips arrive by
 * push (`onFilmstripChanged`) whenever the main process rebuilds one, and a
 * project's cards all read from the same map. On the first card of a project
 * the map is seeded with whatever was already rendered — reopening a project
 * finds its strips on disk, and they should show without waiting for a change.
 */

type Strips = Record<string, FilmstripData>;

const byProject = new Map<string, Strips>();
const listeners = new Set<() => void>();
let subscribed = false;

function emit(): void {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function ensureSubscribed(): void {
  if (subscribed) return;
  subscribed = true;
  api.onFilmstripChanged((dir, sceneId, strip) => {
    const next = { ...byProject.get(dir) };
    if (strip) next[sceneId] = strip;
    else delete next[sceneId];
    byProject.set(dir, next);
    emit();
  });
}

const EMPTY: Strips = {};

export function useFilmstrip(dir: string, sceneId: string): FilmstripData | null {
  useEffect(() => {
    ensureSubscribed();
    if (byProject.has(dir)) return;
    byProject.set(dir, EMPTY);
    void api.filmstrips(dir).then((seed) => {
      // Pushes that landed while the seed was on its way are newer than it.
      byProject.set(dir, { ...seed, ...byProject.get(dir) });
      emit();
    });
  }, [dir]);

  return useSyncExternalStore(subscribe, () => byProject.get(dir)?.[sceneId] ?? null);
}
