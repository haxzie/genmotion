"use client";

import { forwardRef } from "react";

/** Absolutely-positioned, full-size flex container — the canvas of every scene. */
export const AbsoluteFill = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(function AbsoluteFill({ style, ...props }, ref) {
  return (
    <div
      ref={ref}
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        ...style,
      }}
      {...props}
    />
  );
});
