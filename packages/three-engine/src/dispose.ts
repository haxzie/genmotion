import * as THREE from "three";

/**
 * Free the geometry, materials, and textures a scene graph is holding.
 *
 * Called on every scene switch (the host reuses one renderer/canvas across
 * the whole composition — see `render-host.ts` — so this is split out from
 * disposing the renderer itself, which happens once, at host teardown).
 */
export function disposeSceneGraph(scene: THREE.Scene): void {
  scene.traverse((object) => {
    const mesh = object as Partial<THREE.Mesh>;
    mesh.geometry?.dispose();
    const material = mesh.material;
    for (const m of Array.isArray(material) ? material : material ? [material] : []) {
      for (const value of Object.values(m)) {
        if (value instanceof THREE.Texture) value.dispose();
      }
      m.dispose();
    }
  });
}

/**
 * Hand the GPU context back.
 *
 * A browser only keeps a handful of WebGL contexts alive — call this once,
 * when the whole render host is torn down, rather than waiting for GC to
 * notice, or a long-running process runs out of contexts mid-session.
 */
export function disposeRenderer(renderer: THREE.WebGLRenderer): void {
  renderer.dispose();
  renderer.forceContextLoss();
}
