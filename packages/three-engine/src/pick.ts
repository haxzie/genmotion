import * as THREE from "three";

/**
 * One object in the active scene, as a box in composition pixels.
 *
 * The editor's preview tools — hover highlight, marquee, the comment bubble,
 * the Draw tool's "what did I scribble on" — all work by reading the DOM under
 * the pointer. A Three.js scene has no DOM: it is one canvas. So the scene
 * graph is projected to these boxes and the editor lays an invisible element
 * over each one, which makes every one of those tools work without knowing it
 * is looking at WebGL.
 */
export interface ThreeObjectBox {
  /**
   * `object.name`, or a synthesised `Mesh-3` when the scene didn't name it,
   * and suffixed (`card-2`) when two objects would otherwise collide.
   */
  id: string;
  /** `Mesh`, `Group`, `Sprite`… */
  type: string;
  /** Composition pixels, origin top-left. */
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * What a scene can say about one of its own objects, through `userData`.
 *
 * Everything here is optional, and a scene that sets none of it still gets the
 * default behaviour below. It exists because the two cases the geometry cannot
 * answer are both authorial: a backdrop the user should never be able to grab,
 * and a visual whose real extent only the shader that draws it knows.
 */
export interface ThreePickHints {
  /**
   * `false` takes this object *and everything under it* out of the preview —
   * a backdrop, a floor grid, a light rig's helper geometry.
   */
  pickable?: boolean;
  /**
   * The box this object actually draws into, in its own local space, used in
   * place of the measured one. This is how a vertex-shader-driven visual
   * becomes selectable: the CPU can't know where its instances land, so the
   * scene says.
   */
  pickBounds?: THREE.Box3;
}

/** Object types worth offering as a selection even when they have no name. */
const PICKABLE_TYPES = new Set([
  "Mesh",
  "SkinnedMesh",
  "InstancedMesh",
  "Points",
  "Line",
  "LineSegments",
  "LineLoop",
  "Sprite",
]);

/**
 * A scene can hold thousands of objects (one per particle, per instance). Past
 * this many the overlay costs more than the picking is worth, so it stops —
 * the first N in traversal order, which is the order the scene was built in.
 */
const MAX_DESCRIBED_OBJECTS = 200;

/**
 * Smallest box worth offering, per side, in composition pixels.
 *
 * Below this there is nothing a pointer can reasonably hit, and a speck is
 * usually not a small object but a wrongly-measured one — see `isMeasurable`.
 */
const MIN_PICK_PX = 6;


/**
 * A world-space box projected into composition pixels.
 *
 * All eight corners are projected rather than just two, because a rotated or
 * perspective-distorted box has no two corners that bound it. Anything partly
 * behind the camera projects to nonsense — `project()` divides by a negative
 * w — so a box whose nearest corner is behind the lens is dropped rather than
 * drawn somewhere wrong.
 */
function projectToFrame(
  object: THREE.Object3D,
  camera: THREE.Camera,
  width: number,
  height: number,
): { left: number; top: number; width: number; height: number } | null {
  const declared = hintsOf(object).pickBounds;
  const bounds = declared
    ? new THREE.Box3().copy(declared).applyMatrix4(object.matrixWorld)
    : new THREE.Box3().setFromObject(object);
  if (bounds.isEmpty()) return null;

  const corner = new THREE.Vector3();
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (let i = 0; i < 8; i++) {
    corner.set(
      i & 1 ? bounds.max.x : bounds.min.x,
      i & 2 ? bounds.max.y : bounds.min.y,
      i & 4 ? bounds.max.z : bounds.min.z,
    );
    corner.applyMatrix4(camera.matrixWorldInverse);
    // Behind the lens (or exactly on it): there is no honest screen position.
    if (corner.z > -1e-6 && (camera as THREE.PerspectiveCamera).isPerspectiveCamera) return null;
    corner.applyMatrix4(camera.projectionMatrix);
    minX = Math.min(minX, corner.x);
    maxX = Math.max(maxX, corner.x);
    minY = Math.min(minY, corner.y);
    maxY = Math.max(maxY, corner.y);
  }

  const left = (minX * 0.5 + 0.5) * width;
  const right = (maxX * 0.5 + 0.5) * width;
  // NDC y grows upward, the frame's grows down.
  const top = (0.5 - maxY * 0.5) * height;
  const bottom = (0.5 - minY * 0.5) * height;

  // Entirely outside the frame: nothing to point at.
  if (right <= 0 || bottom <= 0 || left >= width || top >= height) return null;

  const clampedLeft = Math.max(0, left);
  const clampedTop = Math.max(0, top);
  return {
    left: clampedLeft,
    top: clampedTop,
    width: Math.min(width, right) - clampedLeft,
    height: Math.min(height, bottom) - clampedTop,
  };
}

/**
 * Can this object's bounds be believed?
 *
 * A bounding box is computed on the CPU from the geometry's own vertices, so
 * it only describes what is drawn when the GPU draws those vertices where
 * they are. An `InstancedBufferGeometry` on a plain mesh is the common
 * exception: the geometry is one prototype at the origin and a vertex shader
 * scatters copies of it across the frame from per-instance attributes the CPU
 * never reads. Measuring one reports a speck at the centre of the picture
 * with the real drawing nowhere near it — worse than not offering it at all.
 *
 * `InstancedMesh` is fine: its instance matrices live on the object itself,
 * and `Box3` expands over them.
 */
function isMeasurable(object: THREE.Object3D): boolean {
  // The scene declared the box itself, which is the whole point of the hint.
  if (hintsOf(object).pickBounds) return true;
  const geometry = (object as THREE.Mesh).geometry as THREE.BufferGeometry | undefined;
  if (!geometry) return true;
  const instanced = (geometry as THREE.InstancedBufferGeometry).isInstancedBufferGeometry;
  return !instanced || (object as THREE.InstancedMesh).isInstancedMesh === true;
}

function hintsOf(object: THREE.Object3D): ThreePickHints {
  return (object.userData ?? {}) as ThreePickHints;
}

/**
 * Did the scene ask for this object — or anything containing it — to be left
 * out? Checked up the chain rather than on the object alone, so
 * `backdrop.userData.pickable = false` covers the whole backdrop and the
 * author doesn't have to repeat themselves on every piece of it.
 */
function isOptedOut(object: THREE.Object3D): boolean {
  for (let node: THREE.Object3D | null = object; node; node = node.parent) {
    if (hintsOf(node).pickable === false) return true;
  }
  return false;
}

/** Is this an object a user could mean when they click? */
function isPickable(object: THREE.Object3D): boolean {
  if (!object.visible || !isMeasurable(object) || isOptedOut(object)) return false;
  // A named group is a thing the scene's author thought of as one thing.
  return PICKABLE_TYPES.has(object.type) || object.name !== "";
}


/**
 * Every object in `scene` a user could point at, as a box in composition
 * pixels, for the frame the camera is currently looking at.
 *
 * Traversal order is build order, which is also roughly back-to-front in a
 * hand-written scene, so the cap keeps the parts authored first.
 */
export function describeSceneObjects(
  scene: THREE.Object3D,
  camera: THREE.Camera,
  width: number,
  height: number,
): ThreeObjectBox[] {
  camera.updateMatrixWorld();
  scene.updateMatrixWorld(true);

  const boxes: ThreeObjectBox[] = [];
  const counts = new Map<string, number>();
  const taken = new Set<string>();
  scene.traverse((object) => {
    if (boxes.length >= MAX_DESCRIBED_OBJECTS) return;
    if (object === scene || !isPickable(object)) return;
    const box = projectToFrame(object, camera, width, height);
    if (!box || box.width < MIN_PICK_PX || box.height < MIN_PICK_PX) return;
    const seen = (counts.get(object.type) ?? 0) + 1;
    counts.set(object.type, seen);
    boxes.push({
      // Whitespace is not allowed in a DOM id, and the editor lays these out
      // as elements; the name still reads back plainly in chat.
      id: unique((object.name || `${object.type}-${seen}`).replace(/\s+/g, "-"), taken),
      type: object.type,
      ...box,
    });
  });
  return boxes;
}

/**
 * The id under which this object goes into the overlay, made unique.
 *
 * Two objects sharing a name would otherwise become two elements sharing a DOM
 * id, and a user clicking either would send the agent a reference that matches
 * both. Suffixing says plainly which one was meant — and the collision itself
 * is a sign the scene should have named them apart.
 */
function unique(id: string, taken: Set<string>): string {
  let candidate = id;
  for (let n = 2; taken.has(candidate); n++) candidate = `${id}-${n}`;
  taken.add(candidate);
  return candidate;
}
