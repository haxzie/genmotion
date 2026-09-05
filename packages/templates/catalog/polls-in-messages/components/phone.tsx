import React from "react";

/**
 * iPhone shell. `screenW` / `screenH` are the inner screen size in px;
 * the bezel is added around it.
 */
export function PhoneShell({
  left,
  top,
  screenW,
  screenH,
  children,
  id = "phone",
  islandOpacity = 1,
}: {
  left: number;
  top: number;
  screenW: number;
  screenH: number;
  children?: React.ReactNode;
  id?: string;
  islandOpacity?: number;
}) {
  const bezel = 24;
  const S = screenW / 780;
  return (
    <div
      id={id}
      style={{
        position: "absolute",
        left: left - bezel,
        top: top - bezel,
        width: screenW + bezel * 2,
        height: screenH + bezel * 2,
        borderRadius: 104 * S,
        padding: bezel,
        boxSizing: "border-box",
        background:
          "linear-gradient(152deg, #e7e7ec 0%, #fbfbfd 22%, #c6c6cf 52%, #f2f2f6 78%, #d3d3da 100%)",
        boxShadow:
          "0 70px 130px rgba(15,17,26,0.16), 0 14px 40px rgba(15,17,26,0.10), inset 0 0 0 1px rgba(255,255,255,0.6)",
      }}
    >
      <div
        style={{
          position: "relative",
          width: screenW,
          height: screenH,
          borderRadius: 82 * S,
          overflow: "hidden",
          backgroundColor: "#ffffff",
        }}
      >
        {children}
        {/* dynamic island */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: 26 * S,
            marginLeft: -105 * S,
            width: 210 * S,
            height: 58 * S,
            borderRadius: 29 * S,
            backgroundColor: "#0a0a0c",
            opacity: islandOpacity,
          }}
        />
      </div>
    </div>
  );
}
