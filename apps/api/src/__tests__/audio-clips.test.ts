import { beforeEach, describe, expect, it } from "vitest";
import { db, schema } from "@genmotion/db";
import { dbReady, truncateAll } from "./helpers/db";
import { createOrg, createProject } from "./helpers/factories";
import { createSession, requestJson } from "./helpers/http";

/**
 * Timeline audio clips.
 *
 * The rule worth pinning down is the trim on create: a clip is cut off at the
 * end of the last scene, because an asset is usually far longer than the video
 * it is being dropped onto. It is a ceiling and nothing more — a short clip is
 * never stretched to reach the end, and with no end to trim to the asset keeps
 * its natural length.
 */

const FPS = 30;

/** A project with `count` one-second scenes, and a session that owns it. */
async function projectWithScenes(count: number) {
  const { orgId, ownerId } = await createOrg();
  const project = await createProject(orgId, { userId: ownerId });
  if (count > 0) {
    await db.insert(schema.scenes).values(
      Array.from({ length: count }, (_, i) => ({
        projectId: project.id,
        name: `Scene ${i + 1}`,
        code: "export default function Scene() { return null }",
        durationInFrames: FPS,
        order: i,
      })),
    );
  }
  return { project, session: await createSession(ownerId, orgId) };
}

describe.skipIf(!dbReady)("POST /api/projects/:id/audio-clips", () => {
  beforeEach(truncateAll);

  it("trims a clip that runs past the last scene", async () => {
    // 3s of scenes, a 60s song.
    const { project, session } = await projectWithScenes(3);

    const { status, body } = await requestJson<{ durationInFrames: number }>(
      `/api/projects/${project.id}/audio-clips`,
      {
        as: session,
        json: { url: "https://example.test/song.mp3", durationInFrames: 60 * FPS },
      },
    );
    expect(status).toBe(201);
    expect(body.durationInFrames).toBe(3 * FPS);
  });

  it("trims against the space left after the start frame, not the whole timeline", async () => {
    const { project, session } = await projectWithScenes(10);

    const { body } = await requestJson<{ durationInFrames: number }>(
      `/api/projects/${project.id}/audio-clips`,
      {
        as: session,
        json: {
          url: "https://example.test/song.mp3",
          startFrame: 4 * FPS,
          durationInFrames: 60 * FPS,
        },
      },
    );
    expect(body.durationInFrames).toBe(6 * FPS);
  });

  it("leaves a clip that already fits at its own length", async () => {
    const { project, session } = await projectWithScenes(10);

    const { body } = await requestJson<{ durationInFrames: number }>(
      `/api/projects/${project.id}/audio-clips`,
      {
        as: session,
        json: { url: "https://example.test/sfx.mp3", durationInFrames: 2 * FPS },
      },
    );
    expect(body.durationInFrames).toBe(2 * FPS);
  });

  it("leaves a clip alone when the project has no scenes to trim to", async () => {
    const { project, session } = await projectWithScenes(0);

    const { body } = await requestJson<{ durationInFrames: number }>(
      `/api/projects/${project.id}/audio-clips`,
      {
        as: session,
        json: { url: "https://example.test/song.mp3", durationInFrames: 60 * FPS },
      },
    );
    // Trimming to zero would be a clip you cannot see, let alone drag back out.
    expect(body.durationInFrames).toBe(60 * FPS);
  });

  it("leaves a clip dropped past the end alone", async () => {
    const { project, session } = await projectWithScenes(3);

    const { body } = await requestJson<{ durationInFrames: number }>(
      `/api/projects/${project.id}/audio-clips`,
      {
        as: session,
        json: {
          url: "https://example.test/song.mp3",
          startFrame: 10 * FPS,
          durationInFrames: 5 * FPS,
        },
      },
    );
    expect(body.durationInFrames).toBe(5 * FPS);
  });
});
