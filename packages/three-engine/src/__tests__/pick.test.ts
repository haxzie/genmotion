import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { describeSceneObjects } from "../pick";

const W = 1920;
const H = 1080;

/** A camera looking down -z from z=5, the same one the render host starts with. */
function camera(): THREE.PerspectiveCamera {
  const cam = new THREE.PerspectiveCamera(50, W / H, 0.1, 2000);
  cam.position.z = 5;
  cam.updateMatrixWorld();
  return cam;
}

function mesh(name: string, x = 0, y = 0, z = 0): THREE.Mesh {
  const object = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
  object.name = name;
  object.position.set(x, y, z);
  return object;
}

describe("describeSceneObjects", () => {
  it("projects an object at the origin to the middle of the frame", () => {
    const scene = new THREE.Scene();
    scene.add(mesh("cube"));

    const [box] = describeSceneObjects(scene, camera(), W, H);
    expect(box?.id).toBe("cube");
    expect(box?.type).toBe("Mesh");
    // Centred, and small enough to be a thing in the frame rather than the frame.
    expect(box!.left + box!.width / 2).toBeCloseTo(W / 2, 0);
    expect(box!.top + box!.height / 2).toBeCloseTo(H / 2, 0);
    expect(box!.width).toBeLessThan(W / 2);
  });

  it("puts an object to the right of the origin on the right of the frame", () => {
    const scene = new THREE.Scene();
    scene.add(mesh("right", 2));

    const [box] = describeSceneObjects(scene, camera(), W, H);
    expect(box!.left).toBeGreaterThan(W / 2);
  });

  it("names an object the scene left unnamed by type and order", () => {
    const scene = new THREE.Scene();
    scene.add(mesh(""), mesh("", 1.5));

    const boxes = describeSceneObjects(scene, camera(), W, H);
    expect(boxes.map((b) => b.id)).toEqual(["Mesh-1", "Mesh-2"]);
  });

  it("replaces whitespace in a name, since the editor uses it as a DOM id", () => {
    const scene = new THREE.Scene();
    scene.add(mesh("the planet"));

    expect(describeSceneObjects(scene, camera(), W, H)[0]?.id).toBe("the-planet");
  });

  it("skips objects that are hidden, behind the camera, or off frame", () => {
    const scene = new THREE.Scene();
    const hidden = mesh("hidden");
    hidden.visible = false;
    scene.add(hidden);
    scene.add(mesh("behind", 0, 0, 20)); // past the camera at z=5
    scene.add(mesh("far-left", -40));

    expect(describeSceneObjects(scene, camera(), W, H)).toEqual([]);
  });

  it("describes a named group as well as the meshes inside it", () => {
    const scene = new THREE.Scene();
    const group = new THREE.Group();
    group.name = "rig";
    group.add(mesh("bulb"));
    scene.add(group);

    expect(describeSceneObjects(scene, camera(), W, H).map((b) => b.id)).toEqual(["rig", "bulb"]);
  });

  it("leaves an unnamed group out — it is structure, not a thing to point at", () => {
    const scene = new THREE.Scene();
    const group = new THREE.Group();
    group.add(mesh("bulb"));
    scene.add(group);

    expect(describeSceneObjects(scene, camera(), W, H).map((b) => b.id)).toEqual(["bulb"]);
  });

  it("clamps a box that runs past the frame's edge", () => {
    const scene = new THREE.Scene();
    const wide = mesh("wall");
    wide.scale.set(100, 100, 1);
    scene.add(wide);

    const [box] = describeSceneObjects(scene, camera(), W, H);
    expect(box).toMatchObject({ left: 0, top: 0, width: W, height: H });
  });

  it("skips a speck too small to point at", () => {
    const scene = new THREE.Scene();
    const speck = mesh("dust");
    speck.scale.setScalar(0.002);
    scene.add(speck);

    expect(describeSceneObjects(scene, camera(), W, H)).toEqual([]);
  });

  it("skips geometry a vertex shader places, whose CPU bounds are a lie", () => {
    // One prototype quad at the origin, scattered across the frame by
    // per-instance attributes — exactly how an ink/particle layer is drawn.
    const geometry = new THREE.InstancedBufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array([-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0]), 3),
    );
    geometry.instanceCount = 500;
    const strokes = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial());
    strokes.name = "ink";

    const scene = new THREE.Scene();
    scene.add(strokes);

    expect(describeSceneObjects(scene, camera(), W, H)).toEqual([]);
  });

  it("keeps an InstancedMesh, whose instance matrices the bounds do account for", () => {
    const instances = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.5, 0.5, 0.5),
      new THREE.MeshBasicMaterial(),
      3,
    );
    instances.name = "crowd";
    for (let i = 0; i < 3; i++) {
      instances.setMatrixAt(i, new THREE.Matrix4().makeTranslation(i - 1, 0, 0));
    }
    instances.instanceMatrix.needsUpdate = true;

    const scene = new THREE.Scene();
    scene.add(instances);

    const [box] = describeSceneObjects(scene, camera(), W, H);
    expect(box?.id).toBe("crowd");
    // Spans all three instances, not just the prototype at the origin.
    expect(box!.width).toBeGreaterThan(300);
  });

  it("keeps shader-placed geometry the scene declared a box for", () => {
    const geometry = new THREE.InstancedBufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array([-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0]), 3),
    );
    geometry.instanceCount = 500;
    const strokes = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial());
    strokes.name = "ink";
    strokes.userData.pickBounds = new THREE.Box3(
      new THREE.Vector3(-1, -1, 0),
      new THREE.Vector3(1, 1, 0),
    );

    const scene = new THREE.Scene();
    scene.add(strokes);

    const [box] = describeSceneObjects(scene, camera(), W, H);
    expect(box?.id).toBe("ink");
    // The declared box, not the one-quad prototype's.
    expect(box!.width).toBeGreaterThan(300);
  });

  it("applies a declared box in the object's own space", () => {
    const scene = new THREE.Scene();
    const panel = mesh("panel", 2);
    panel.userData.pickBounds = new THREE.Box3(
      new THREE.Vector3(-0.5, -0.5, 0),
      new THREE.Vector3(0.5, 0.5, 0),
    );
    scene.add(panel);

    const [box] = describeSceneObjects(scene, camera(), W, H);
    // Moved with the object rather than sitting at the origin.
    expect(box!.left).toBeGreaterThan(W / 2);
  });

  it("leaves out an object the scene opted out, and everything under it", () => {
    const scene = new THREE.Scene();
    const backdrop = new THREE.Group();
    backdrop.name = "backdrop";
    backdrop.userData.pickable = false;
    backdrop.add(mesh("stars"), mesh("horizon", 1.5));
    scene.add(backdrop, mesh("subject", -1.5));

    expect(describeSceneObjects(scene, camera(), W, H).map((b) => b.id)).toEqual(["subject"]);
  });

  it("suffixes a repeated name so two objects never share one id", () => {
    const scene = new THREE.Scene();
    scene.add(mesh("card"), mesh("card", 1.5), mesh("card", -1.5));

    expect(describeSceneObjects(scene, camera(), W, H).map((b) => b.id)).toEqual([
      "card",
      "card-2",
      "card-3",
    ]);
  });

  it("stops at the cap rather than describing a whole particle system", () => {
    const scene = new THREE.Scene();
    for (let i = 0; i < 400; i++) scene.add(mesh(`p${i}`));

    expect(describeSceneObjects(scene, camera(), W, H)).toHaveLength(200);
  });
});
