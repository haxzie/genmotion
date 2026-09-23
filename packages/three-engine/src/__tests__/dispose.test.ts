import * as THREE from "three";
import { describe, expect, it, vi } from "vitest";
import { disposeSceneGraph } from "../dispose";

describe("disposeSceneGraph", () => {
  it("disposes geometry, materials, and textures on every mesh", () => {
    const scene = new THREE.Scene();
    const texture = new THREE.Texture();
    const geometry = new THREE.BoxGeometry();
    const material = new THREE.MeshStandardMaterial({ map: texture });
    scene.add(new THREE.Mesh(geometry, material));

    const geometryDispose = vi.spyOn(geometry, "dispose");
    const materialDispose = vi.spyOn(material, "dispose");
    const textureDispose = vi.spyOn(texture, "dispose");

    disposeSceneGraph(scene);

    expect(geometryDispose).toHaveBeenCalledOnce();
    expect(materialDispose).toHaveBeenCalledOnce();
    expect(textureDispose).toHaveBeenCalledOnce();
  });

  it("handles multi-material meshes and objects with no mesh data", () => {
    const scene = new THREE.Scene();
    const materials = [new THREE.MeshStandardMaterial(), new THREE.MeshStandardMaterial()];
    const disposes = materials.map((m) => vi.spyOn(m, "dispose"));
    scene.add(new THREE.Mesh(new THREE.BoxGeometry(), materials));
    scene.add(new THREE.Group());

    expect(() => disposeSceneGraph(scene)).not.toThrow();
    for (const dispose of disposes) expect(dispose).toHaveBeenCalledOnce();
  });
});
