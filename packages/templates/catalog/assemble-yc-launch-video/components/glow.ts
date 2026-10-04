import * as THREE from "three";

/**
 * The film's second-half atmosphere: a soft teal glow welling up from the bottom edge (an
 * ellipse centred below the frame) plus an optional faint wash over the whole frame. Drawn
 * once into a canvas; animate `strength` / `rise` per frame. Screen-space at z = 0.
 */
export function bottomGlow(name = "bottom-glow") {
  const W = 960, H = 540;
  const c = new OffscreenCanvas(W, H);
  const g = c.getContext("2d")!;
  // ellipse: centre x mid, y 1.45H, radii 1.05W x 0.95H
  g.save();
  g.translate(W / 2, H * 1.45);
  g.scale(1.05 * W, 0.95 * H);
  const rg = g.createRadialGradient(0, 0, 0, 0, 0, 1);
  rg.addColorStop(0.0, "rgba(60,130,145,1)");
  rg.addColorStop(0.45, "rgba(92,152,163,0.95)");
  rg.addColorStop(0.62, "rgba(140,184,192,0.75)");
  rg.addColorStop(0.78, "rgba(200,222,226,0.35)");
  rg.addColorStop(1.0, "rgba(253,253,253,0)");
  g.fillStyle = rg;
  g.fillRect(-1, -1, 2, 2);
  g.restore();
  const tex = new THREE.CanvasTexture(c as unknown as HTMLCanvasElement);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(19.2, 10.8), mat);
  mesh.name = name;
  mesh.userData.pickable = false;
  mesh.renderOrder = -10;

  const washMat = new THREE.MeshBasicMaterial({ color: "#d7e7ea", transparent: true, opacity: 0, depthWrite: false, depthTest: false });
  const wash = new THREE.Mesh(new THREE.PlaneGeometry(19.2, 10.8), washMat);
  wash.name = `${name}-wash`;
  wash.userData.pickable = false;
  wash.renderOrder = -11;

  const group = new THREE.Group();
  group.name = name;
  group.add(wash, mesh);
  group.position.z = -0.05;
  return {
    group,
    /** strength 0..1, rise in px (how far the glow's top edge sits above its rest), wash 0..1 */
    set(strength: number, rise = 0, washAmt = 0) {
      mat.opacity = strength;
      mesh.visible = strength > 0.002;
      mesh.position.y = rise * 0.01;
      washMat.opacity = washAmt * 0.45;
      wash.visible = washAmt > 0.002;
    },
  };
}
