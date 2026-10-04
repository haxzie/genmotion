import fs from "node:fs/promises";
import type { SceneHit, SceneQuery, SceneReference } from "@genmotion/templates/scene-search";

export { BEAT_HELP, formatSceneHits, formatSceneReference } from "@genmotion/templates/scene-search";
import { CliError } from "./output";
import { API_URL } from "./templates";
import { VERSION } from "./version";

/**
 * The scene library, for an agent building a video: find how a hook, an
 * integrations beat or a funding number was done in a template, then read
 * that scene's code and see three frames of it.
 *
 * Served by the same public endpoint as the templates (`/api/templates/scenes`)
 * so the published CLI never carries a stale copy. Set `GM_TEMPLATES_DIR` to a
 * catalog folder to read it from disk instead — inside the monorepo, that is
 * how a template author sees an edited `scenes.json` without a deploy.
 */

const local = () => (process.env.GM_TEMPLATES_DIR ? import("@genmotion/templates/scenes") : null);

const HEADERS = { "User-Agent": `genmotion-cli/${VERSION}`, "X-GenMotion-Client": `cli/${VERSION}` };

async function get(pathAndQuery: string): Promise<Response> {
  try {
    return await fetch(`${API_URL}${pathAndQuery}`, { headers: HEADERS });
  } catch (err) {
    throw new CliError(`Couldn't reach ${API_URL}: ${err instanceof Error ? err.message : String(err)}`, {
      fix: "Check your connection, or set GM_TEMPLATES_DIR to a local template catalog",
    });
  }
}

export async function searchSceneLibrary(query: SceneQuery): Promise<SceneHit[]> {
  const lib = await local();
  if (lib) return lib.findScenes(query);
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...query, q: query.query, query: undefined })) {
    if (value !== undefined && value !== "") params.set(key, String(value));
  }
  const res = await get(`/api/templates/scenes?${params}`);
  if (!res.ok) throw new CliError(`Scene search answered ${res.status}: ${await res.text()}`);
  return ((await res.json()) as { scenes: SceneHit[] }).scenes;
}

export async function readSceneReference(id: string): Promise<SceneReference> {
  const lib = await local();
  const scene = lib
    ? await lib.getScene(id)
    : await get(`/api/templates/scenes/${id.split("/").map(encodeURIComponent).join("/")}`).then((r) =>
        r.ok ? (r.json() as Promise<SceneReference>) : null,
      );
  if (!scene) throw new CliError(`No scene "${id}"`, { fix: 'Ids look like "<template>/<scene file stem>" — find one with search_scenes' });
  return scene;
}

/** The scene's three-frame filmstrip as JPEG bytes, or null when none was captured. */
export async function readSceneStill(id: string): Promise<Buffer | null> {
  const lib = await local();
  if (lib) {
    const file = await lib.getSceneStill(id);
    return file ? fs.readFile(file) : null;
  }
  const res = await get(`/api/templates/scenes/${id.split("/").map(encodeURIComponent).join("/")}/still`);
  return res.ok ? Buffer.from(await res.arrayBuffer()) : null;
}


/**
 * Where an agent with only a shell can open a scene's filmstrip: the file
 * itself in local mode, its URL otherwise. Null when none was captured.
 */
export async function sceneStillLocation(id: string): Promise<string | null> {
  const lib = await local();
  if (lib) return lib.getSceneStill(id);
  const url = `${API_URL}/api/templates/scenes/${id.split("/").map(encodeURIComponent).join("/")}/still`;
  const res = await fetch(url, { method: "HEAD", headers: HEADERS }).catch(() => null);
  return res?.ok ? url : null;
}
