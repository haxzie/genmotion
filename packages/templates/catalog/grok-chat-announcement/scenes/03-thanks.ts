/**
 * Thanks + outro — one stretch of the continuous chat take.
 * The chat itself lives in components/chat.ts; this scene shows it from
 * reference frame 410 onward, so the cut either side is seamless.
 */
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { buildChat, toSourceFrame } from "../components/chat";

const OFFSET = 410;

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  const update = buildChat(ctx);
  return ({ frame, fps }) => update(toSourceFrame(frame, fps, OFFSET));
}
