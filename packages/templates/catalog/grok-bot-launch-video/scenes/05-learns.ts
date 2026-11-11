import { withFonts, type ThreeSceneContext, type ThreeSceneUpdate } from "@genmotion/three-engine";
import interUrl from "../assets/Inter.woff2";
import { C } from "../components/brand";
import { setupStage } from "../components/stage";
import { interstitial } from "../components/title";

/** 0:19.37–0:20.93 (ref 581–628): "Learns and makes recommendations". */
export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  return withFonts(ctx, [{ family: "Inter", url: interUrl }], () => {
    const { scene } = setupStage(ctx, C.white);
    const t = interstitial("Learns and makes recommendations", 966);
    t.mesh.name = "learns-and-makes-recommendations";
    scene.add(t.mesh);
    return ({ frame }) => t.update(frame, 1);
  });
}
