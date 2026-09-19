import React from "react";
import { UserPlus, Send, MessageSquare, Repeat } from "lucide-react";
import { brand } from "./brand";

// Campaign step card: coloured header with an icon disc, title, "Step n",
// and a skeleton body. 461×346 at the reference's scale.
export const STEP_W = 461;
export const STEP_H = 346;

const ICONS = { invite: UserPlus, message: Send, followup: MessageSquare, repeat: Repeat };

export function StepCard({ title, step, icon = "invite", color = brand.linkedin, bodyLines = [200, 260, 230], style, children }: { title: string; step: number; icon?: keyof typeof ICONS; color?: string; bodyLines?: number[]; style?: React.CSSProperties; children?: React.ReactNode }) {
  const Icon = ICONS[icon];
  return (
    <div style={{ width: STEP_W, height: STEP_H, borderRadius: 16, overflow: "hidden", backgroundColor: "#fff", boxShadow: brand.cardShadow, fontFamily: brand.font, ...style }}>
      <div style={{ height: 123, backgroundColor: color, display: "flex", alignItems: "center", padding: "0 30px", gap: 22 }}>
        <div style={{ width: 66, height: 66, borderRadius: 33, backgroundColor: "rgba(255,255,255,0.22)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon size={30} color="#fff" strokeWidth={2} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 30, fontWeight: 500, color: "#fff" }}>{title}</span>
          <span style={{ fontSize: 22, fontWeight: 400, color: "rgba(255,255,255,0.85)" }}>Step {step}</span>
        </div>
      </div>
      <div style={{ padding: "40px 38px", display: "flex", flexDirection: "column", gap: 20 }}>
        {bodyLines.map((w, i) => (
          <div key={i} style={{ width: w, height: 12, borderRadius: 6, backgroundColor: "#e6e6e4" }} />
        ))}
        {children}
      </div>
    </div>
  );
}
