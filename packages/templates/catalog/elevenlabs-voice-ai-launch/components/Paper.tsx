import React from "react";
import { brand } from "./brand";

/** Warm off-white background with the faint drafting grid from the reference. */
export function Paper({ children, style }: { children?: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        backgroundColor: brand.paper,
        overflow: "hidden",
        ...style,
      }}
    >
      <div
        id="paper-grid"
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `linear-gradient(${brand.paperGrid} 1px, transparent 1px), linear-gradient(90deg, ${brand.paperGrid} 1px, transparent 1px)`,
          backgroundSize: "160px 160px",
          backgroundPosition: "80px 60px",
        }}
      />
      {children}
    </div>
  );
}
