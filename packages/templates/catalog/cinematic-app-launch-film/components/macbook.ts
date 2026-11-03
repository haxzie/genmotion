/**
 * A MacBook built around a Screen: black glass bezel with the camera notch,
 * a space-grey aluminium lid behind it, the hinge, and the deck with its
 * keyboard and trackpad running toward the camera from the bottom edge.
 * Everything is sized from the display's width, in the screen's local units,
 * so any Screen can be "put on a laptop". Use the screen with surround: null.
 */
import * as THREE from "three";
import type { Screen } from "./screen";

function rounded(s: THREE.Shape | THREE.Path, x: number, y: number, w: number, h: number, r: number) {
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
}

export function addMacbook(screen: Screen, name = "macbook"): THREE.Group {
  const w = screen.W / screen.ppu;
  const h = screen.H / screen.ppu;
  const side = w * 0.018;
  const top = w * 0.028;
  const bottom = w * 0.022;
  const ow = w + side * 2;
  const oh = h + top + bottom;
  const oy = -h / 2 - bottom; // outer bottom edge
  const R = w * 0.028;

  const mac = new THREE.Group();
  mac.name = name;

  // Bezel: glass with the display cut out and the notch hanging into it.
  const bezelShape = new THREE.Shape();
  rounded(bezelShape, -ow / 2, oy, ow, oh, R);
  const hole = new THREE.Path();
  const nw = w * 0.11;
  const nh = top * 0.9;
  const r = w * 0.008;
  // Display opening (clockwise), with the notch dropping down from its top edge.
  hole.moveTo(-w / 2 + r, -h / 2);
  hole.lineTo(w / 2 - r, -h / 2);
  hole.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  hole.lineTo(w / 2, h / 2 - r);
  hole.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
  hole.lineTo(nw / 2, h / 2);
  hole.lineTo(nw / 2, h / 2 - nh + r);
  hole.quadraticCurveTo(nw / 2, h / 2 - nh, nw / 2 - r, h / 2 - nh);
  hole.lineTo(-nw / 2 + r, h / 2 - nh);
  hole.quadraticCurveTo(-nw / 2, h / 2 - nh, -nw / 2, h / 2 - nh + r);
  hole.lineTo(-nw / 2, h / 2);
  hole.lineTo(-w / 2 + r, h / 2);
  hole.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
  hole.lineTo(-w / 2, -h / 2 + r);
  hole.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
  bezelShape.holes.push(hole);
  const glass = new THREE.MeshStandardMaterial({ color: "#060607", roughness: 0.18, metalness: 0.1 });
  const bezel = new THREE.Mesh(new THREE.ShapeGeometry(bezelShape, 24), glass);
  bezel.position.z = 0.0012;
  bezel.name = `${name}-bezel`;
  mac.add(bezel);

  // Aluminium lid behind the glass.
  const alu = new THREE.MeshStandardMaterial({ color: "#8c8c92", roughness: 0.38, metalness: 0.75 });
  const lidShape = new THREE.Shape();
  rounded(lidShape, -ow / 2 - w * 0.002, oy - w * 0.002, ow + w * 0.004, oh + w * 0.004, R * 1.05);
  const lidDepth = w * 0.01;
  const lid = new THREE.Mesh(
    new THREE.ExtrudeGeometry(lidShape, { depth: lidDepth, bevelEnabled: true, bevelSize: w * 0.0015, bevelThickness: w * 0.0015, bevelSegments: 3, curveSegments: 16 }),
    alu,
  );
  // The bevel grows the extrusion on both faces, so step back by it too.
  lid.position.z = -lidDepth - w * 0.0015 - 0.0015;
  lid.name = `${name}-lid`;
  mac.add(lid);

  // Hinge.
  const hinge = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.007, w * 0.007, ow * 0.82, 24), new THREE.MeshStandardMaterial({ color: "#2a2a2e", roughness: 0.5, metalness: 0.6 }));
  hinge.rotation.z = Math.PI / 2;
  hinge.position.set(0, oy - w * 0.004, -lidDepth * 0.4);
  hinge.name = `${name}-hinge`;
  mac.add(hinge);

  // Deck: a slab running toward the camera from the hinge.
  const deckD = w * 0.68;
  const deckT = w * 0.014;
  const deckShape = new THREE.Shape();
  rounded(deckShape, -ow / 2, 0, ow, deckD, R * 0.9);
  const deck = new THREE.Mesh(
    new THREE.ExtrudeGeometry(deckShape, { depth: deckT, bevelEnabled: true, bevelSize: w * 0.002, bevelThickness: w * 0.002, bevelSegments: 3, curveSegments: 16 }),
    alu,
  );
  // Shape is in x/y; lay it flat so +y of the shape runs toward +z.
  deck.rotation.x = Math.PI / 2;
  const deckTop = oy - w * 0.012;
  deck.position.set(0, deckTop - w * 0.002, -lidDepth);
  deck.name = `${name}-deck`;
  mac.add(deck);

  // Keyboard well + keys.
  const rows = 6;
  const cols = 14;
  const kbW = w * 0.84;
  const pitch = kbW / cols;
  const key = pitch * 0.86;
  const kbStart = w * 0.06; // from the hinge
  const well = new THREE.Mesh(
    new THREE.PlaneGeometry(kbW + pitch * 0.3, rows * pitch + pitch * 0.3),
    new THREE.MeshStandardMaterial({ color: "#2b2b2f", roughness: 0.7, metalness: 0.3 }),
  );
  well.rotation.x = -Math.PI / 2;
  well.position.set(0, deckTop + 0.0004, -lidDepth + kbStart + (rows * pitch) / 2);
  well.name = `${name}-keyboard-well`;
  mac.add(well);
  const keys = new THREE.InstancedMesh(
    new THREE.BoxGeometry(key, pitch * 0.12, key),
    new THREE.MeshStandardMaterial({ color: "#101012", roughness: 0.55, metalness: 0.1 }),
    rows * cols,
  );
  keys.name = `${name}-keyboard`;
  const m = new THREE.Matrix4();
  let n = 0;
  for (let rI = 0; rI < rows; rI++) {
    for (let c = 0; c < cols; c++) {
      // The bottom row is the space-bar row: one wide key in the middle.
      let sx = 1;
      let x = -kbW / 2 + pitch * (c + 0.5);
      if (rI === rows - 1 && c >= 4 && c <= 9) {
        if (c !== 4) continue;
        sx = 6;
        x = -kbW / 2 + pitch * 7;
      }
      const sz = rI === 0 ? 0.55 : 1; // function row is half height
      m.makeScale(sx + (sx - 1) * 0.16, 1, sz);
      m.setPosition(x, deckTop + pitch * 0.05, -lidDepth + kbStart + pitch * (rI + 0.5) - (rI === 0 ? pitch * 0.22 : 0));
      keys.setMatrixAt(n++, m);
    }
  }
  keys.count = n;
  keys.instanceMatrix.needsUpdate = true;
  mac.add(keys);

  // Legends: one texture laid out on the same grid, floating just above the caps.
  const LAYOUT: string[][] = [
    ["esc", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12", ""],
    ["`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "=", "delete"],
    ["tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\"],
    ["caps", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'", "", "return"],
    ["shift", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "", "", "shift"],
    ["fn", "⌃", "⌥", "⌘", "", "", "", "", "", "", "⌘", "⌥", "◀", "▶"],
  ];
  const CW = 4096;
  const CH = Math.round((CW * rows * pitch) / kbW);
  const lc = new OffscreenCanvas(CW, CH);
  const lg = lc.getContext("2d")!;
  const px = CW / kbW; // canvas px per world unit
  lg.fillStyle = "#d6d6db";
  lg.textAlign = "center";
  lg.textBaseline = "middle";
  LAYOUT.forEach((row, rI) => {
    row.forEach((label, c) => {
      if (!label) return;
      const cx = (pitch * (c + 0.5)) * px;
      const cz = (pitch * (rI + 0.5) - (rI === 0 ? pitch * 0.22 : 0)) * px;
      const word = label.length > 1 && !/^F\d+$/.test(label);
      const size = rI === 0 ? pitch * px * 0.2 : word ? pitch * px * 0.17 : pitch * px * 0.34;
      lg.font = `400 ${size}px -apple-system, "SF Pro Text", "Helvetica Neue", Arial, sans-serif`;
      if (word) {
        // Modifier words sit bottom-left on a Mac keycap.
        lg.textAlign = c >= cols / 2 ? "right" : "left";
        const dx = (c >= cols / 2 ? 0.34 : -0.34) * pitch * px;
        lg.fillText(label, cx + dx, cz + pitch * px * 0.26);
        lg.textAlign = "center";
      } else {
        lg.fillText(label, cx, cz + (rI === 0 ? 0 : -pitch * px * 0.04));
      }
    });
  });
  const lt = new THREE.CanvasTexture(lc as unknown as HTMLCanvasElement);
  lt.colorSpace = THREE.SRGBColorSpace;
  lt.anisotropy = 16;
  const legends = new THREE.Mesh(
    new THREE.PlaneGeometry(kbW, rows * pitch),
    new THREE.MeshBasicMaterial({ map: lt, transparent: true, depthWrite: false, toneMapped: false, opacity: 0.9 }),
  );
  legends.rotation.x = -Math.PI / 2;
  legends.position.set(0, deckTop + pitch * 0.112, -lidDepth + kbStart + (rows * pitch) / 2);
  legends.name = `${name}-key-legends`;
  mac.add(legends);

  // Trackpad.
  const padShape = new THREE.Shape();
  const pw = w * 0.36;
  const pd = w * 0.2;
  rounded(padShape, -pw / 2, -pd / 2, pw, pd, w * 0.012);
  const pad = new THREE.Mesh(new THREE.ShapeGeometry(padShape, 12), new THREE.MeshStandardMaterial({ color: "#7c7c82", roughness: 0.3, metalness: 0.5 }));
  pad.rotation.x = -Math.PI / 2;
  pad.position.set(0, deckTop + 0.0005, -lidDepth + kbStart + rows * pitch + w * 0.04 + pd / 2);
  pad.name = `${name}-trackpad`;
  mac.add(pad);

  screen.group.add(mac);
  return mac;
}
