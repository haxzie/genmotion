import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { fitCamera, PX, rx, ry } from "../components/stage";
import { glide, prog, outCubic, inCubic } from "../components/ease";
import { withInter } from "../components/type";
import { svgTexture } from "../components/svg";
import { panel, rrect, text } from "../components/ui";
import awsUrl from "../assets/aws.svg";

/**
 * Global f1142–f1205 (scene frame = global - 1142).
 * An "AWS" node slides in, carried by a collaborator cursor tagged "Assemble". The tag flies
 * off, the node opens into an architecture group (Databricks, Networking & Edge,
 * Microservices) while the view pulls back, then the diagram dissolves.
 * Diagram is laid out in base px (y down, origin = card top-left); `s` scales it on screen.
 */
const G0 = 1142;
const INK = "#1f2a3a";

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  return withInter(ctx, () => {
    const { scene, camera, height } = ctx;
    scene.background = new THREE.Color("#f1f5f8");
    fitCamera(camera, height, 50);

    const dia = new THREE.Group();
    dia.name = "aws-diagram";
    scene.add(dia);
    const put = (m: THREE.Object3D, bx: number, by: number, z = 0) => m.position.set(bx * PX, -by * PX, z);
    const quad = new THREE.PlaneGeometry(1, 1);
    quad.translate(0.5, -0.5, 0); // anchored top-left

    // card body + border, resized per frame
    const bodyMat = new THREE.MeshBasicMaterial({ color: "#fdfdfd", transparent: true, depthWrite: false });
    const body = new THREE.Mesh(quad, bodyMat);
    body.name = "aws-node";
    const borderMat = new THREE.MeshBasicMaterial({ color: "#dfe5ea", transparent: true, depthWrite: false });
    const borders = [0, 1, 2, 3].map(() => new THREE.Mesh(quad, borderMat));
    dia.add(body, ...borders);
    const tintMat = new THREE.MeshBasicMaterial({ color: "#dcebf3", transparent: true, depthWrite: false });
    const tint = new THREE.Mesh(quad, tintMat);
    tint.position.z = 0.001;
    dia.add(tint);

    // header
    const icon = new THREE.Group();
    const iconBg = new THREE.Mesh(new THREE.PlaneGeometry(56 * PX, 56 * PX), new THREE.MeshBasicMaterial({ color: "#232f3e" }));
    const iconMark = new THREE.Mesh(new THREE.PlaneGeometry(40 * PX, 40 * PX), new THREE.MeshBasicMaterial({ map: svgTexture(ctx, awsUrl, 120, "#ffffff"), transparent: true, depthWrite: false }));
    iconMark.position.z = 0.001;
    icon.add(iconBg, iconMark);
    icon.name = "aws-icon";
    put(icon, 22 + 28, 16 + 28, 0.002);
    const awsLabel = panel(120, 50, (g) => text(g, "AWS", 4, 26, 30, INK, 500), 6, "aws-label");
    put(awsLabel, 92 + 60, 44, 0.002);
    dia.add(icon, awsLabel);

    // ports and the outgoing wire
    const dotMat = new THREE.MeshBasicMaterial({ color: "#1d2329" });
    const dotGeo = new THREE.CircleGeometry(5 * PX, 16);
    const portL = new THREE.Mesh(dotGeo, dotMat);
    const portR = new THREE.Mesh(dotGeo, dotMat);
    const wire = new THREE.Mesh(quad, new THREE.MeshBasicMaterial({ color: "#5c656c", transparent: true }));
    wire.name = "aws-wire";
    dia.add(portL, portR, wire);

    // children (base px from the expanded layout)
    const box = (name: string, w: number, h: number, label: string, stroke: string, size: number, weight = 500, colour = INK) =>
      panel(w, h, (g) => {
        rrect(g, 1.5, 1.5, w - 3, h - 3, 8, "#fdfdfd", stroke, 2.5);
        text(g, label, 26, h / 2, size, colour, weight);
        g.fillStyle = "#1d2329";
        g.beginPath(); g.arc(4, h / 2, 4, 0, Math.PI * 2); g.arc(w - 4, h / 2, 4, 0, Math.PI * 2); g.fill();
      }, 3, name);
    const group = (name: string, w: number, h: number, title: string) =>
      panel(w, h, (g) => {
        g.setLineDash([3, 4]);
        g.strokeStyle = "#8fa3ae";
        g.lineWidth = 1.6;
        g.strokeRect(1, 1, w - 2, h - 2);
        g.setLineDash([]);
        text(g, title, 22, 50, 28, INK, 600);
      }, 3, name);

    const databricks = box("databricks", 396, 97, "Databricks", "#e1e6ea", 30);
    put(databricks, 73 + 198, 156 + 48.5, 0.003);
    const net = group("networking-edge", 1419, 341, "Networking & Edge");
    put(net, 69 + 709.5, 296 + 170.5, 0.003);
    const PUR = "#a26ad8";
    const netBoxes = ["VPC + Transit Gateway", "CloudFront CDN", "Application Load Balancer"].map((l, i) => {
      const b = box(`net-${i + 1}`, 393, 97, l, PUR, 28);
      put(b, [121, 581, 1039][i]! + 196.5, 458 + 48.5, 0.004);
      return b;
    });
    const micro = group("microservices-eks", 1419, 360, "Microservices (EKS)");
    put(micro, 69 + 709.5, 695 + 180, 0.003);
    const ORA = "#e7a26a";
    const microBoxes = [["E-comm & Order Mgmt", INK], ["Pricing & Promo Engine", "#8b9399"], ["Replenish & Store-Ops API", INK]].map(([l, c], i) => {
      const b = box(`eks-${i + 1}`, 393, 97, l!, ORA, 28, 500, c!);
      put(b, [121, 581, 1039][i]! + 196.5, 860 + 48.5, 0.004);
      return b;
    });
    dia.add(databricks, net, ...netBoxes, micro, ...microBoxes);
    const reveal: [THREE.Mesh, number][] = [
      [databricks, 1175], [net, 1178], [netBoxes[0]!, 1181], [netBoxes[1]!, 1182], [netBoxes[2]!, 1183],
      [micro, 1189], [microBoxes[0]!, 1192], [microBoxes[1]!, 1193], [microBoxes[2]!, 1194],
    ];

    // the collaborator cursor
    const tag = new THREE.Group();
    tag.name = "assemble-cursor";
    const tagLabel = panel(330, 130, (g) => {
      g.fillStyle = "#4a83a0";
      g.fillRect(0, 0, 330, 130);
      text(g, "Assemble", 165, 66, 52, "#ffffff", 500, undefined, "center");
    }, 2, "assemble-cursor-label");
    tagLabel.position.set(165 * PX, -65 * PX, 0);
    const arrow = panel(90, 90, (g) => {
      g.fillStyle = "#4a83a0";
      g.beginPath(); g.moveTo(4, 4); g.lineTo(80, 36); g.lineTo(42, 46); g.lineTo(30, 84); g.closePath(); g.fill();
    }, 3, "assemble-cursor-arrow");
    arrow.position.set(-28 * PX, 30 * PX, 0);
    tag.add(tagLabel, arrow);
    tag.scale.setScalar(0.5);
    scene.add(tag);

    // screen-space keys
    const S = glide([[1142, 2.5], [1167, 2.5], [1170, 2.3], [1173, 1.9], [1176, 1.5], [1179, 1.27], [1185, 1.04], [1194, 1.0], [1206, 0.97]]);
    const X = glide([[1142, 1300], [1144, 1060], [1146, 972], [1150, 760], [1155, 575], [1160, 530], [1167, 501], [1170, 450], [1173, 369], [1179, 238], [1185, 196], [1194, 179], [1206, 190]]);
    const Y = glide([[1142, 449], [1155, 449], [1167, 432], [1170, 390], [1173, 317], [1179, 210], [1185, 173], [1194, 158], [1206, 165]]);
    const W = glide([[1142, 312], [1169, 312], [1173, 415], [1179, 900], [1185, 1575]]);
    const H = glide([[1142, 90], [1169, 90], [1173, 239], [1179, 700], [1185, 1060]]);
    const TX = glide([[1142, 1450], [1146, 1242], [1155, 1140], [1162, 1250], [1167, 1475], [1170, 1900], [1172, 2300]]);
    const TY = glide([[1142, 900], [1146, 812], [1155, 683], [1162, 560], [1167, 389], [1170, 150], [1172, -100]]);

    return ({ frame: local }) => {
      const f = local + G0;
      const s = S(f);
      dia.scale.setScalar(s);
      dia.position.set(rx(X(f)), ry(Y(f)), 0);
      const w = W(f), h = H(f);
      body.scale.set(w * PX, h * PX, 1);
      tint.scale.set(w * PX, h * PX, 1);
      tintMat.opacity = 1 - prog(f, 1146, 7, outCubic);
      const t = 2 / s;
      borders[0]!.position.set(0, 0, 0.001); borders[0]!.scale.set(w * PX, t * PX, 1);
      borders[1]!.position.set(0, -(h - t) * PX, 0.001); borders[1]!.scale.set(w * PX, t * PX, 1);
      borders[2]!.position.set(0, 0, 0.001); borders[2]!.scale.set(t * PX, h * PX, 1);
      borders[3]!.position.set((w - t) * PX, 0, 0.001); borders[3]!.scale.set(t * PX, h * PX, 1);
      const midY = Math.min(45, h / 2);
      put(portL, 0, midY, 0.003);
      put(portR, w, midY, 0.003);
      put(wire, w, midY - 1.5 / s, 0.002);
      wire.scale.set(3000 * PX, (3 / s) * PX, 1);

      // blur-in: the node arrives soft (opacity stands in for the motion blur)
      const pin = prog(f, 1142, 4, outCubic);
      const out = prog(f, 1196, 12, inCubic);
      const op = pin * (1 - out);
      bodyMat.opacity = borderMat.opacity = op;
      for (const m of [awsLabel, iconBg, iconMark] as THREE.Mesh[]) (m.material as THREE.MeshBasicMaterial).opacity = op;
      (iconBg.material as THREE.MeshBasicMaterial).transparent = true;
      (wire.material as THREE.MeshBasicMaterial).opacity = op * (1 - prog(f, 1173, 6));
      dotMat.transparent = true;
      dotMat.opacity = op;
      for (const [m, t0] of reveal) {
        const p = prog(f, t0, 4, outCubic);
        m.visible = p > 0.01;
        (m.material as THREE.MeshBasicMaterial).opacity = p * (1 - out);
      }

      tag.visible = f < 1172;
      tag.position.set(rx(TX(f)), ry(TY(f)), 0.1);
      tag.rotation.z = f > 1162 ? -THREE.MathUtils.degToRad(Math.min(1, (f - 1162) / 6) * 4) : 0;
      tag.scale.setScalar(1);
    };
  });
}
