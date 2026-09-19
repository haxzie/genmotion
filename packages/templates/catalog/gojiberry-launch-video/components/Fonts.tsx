import React from "react";
import { poppinsRegular, poppinsMedium, poppinsSemiBold } from "./fontData";

// Drop <Fonts /> once at the root of every scene. The @font-face rules point at
// inlined data URLs, so the face is available synchronously on the first frame.
export function Fonts() {
  return (
    <style>{`
      @font-face { font-family: "Poppins"; font-weight: 400; font-style: normal; src: url("${poppinsRegular}") format("truetype"); }
      @font-face { font-family: "Poppins"; font-weight: 500; font-style: normal; src: url("${poppinsMedium}") format("truetype"); }
      @font-face { font-family: "Poppins"; font-weight: 600; font-style: normal; src: url("${poppinsSemiBold}") format("truetype"); }
    `}</style>
  );
}
