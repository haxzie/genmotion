import React from "react";
import { Img } from "@genmotion/motion";

import eEyes from "../assets/e-eyes.svg";
import eRaise from "../assets/e-raise.svg";
import eRamen from "../assets/e-ramen.svg";
import eDown from "../assets/e-down.svg";
import eTower from "../assets/e-tower.svg";
import eTaco from "../assets/e-taco.svg";
import eChart from "../assets/e-chart.svg";
import eParty from "../assets/e-party.svg";
import eFire from "../assets/e-fire.svg";
import eSob from "../assets/e-sob.svg";
import ePlane from "../assets/e-plane.svg";
import eJp from "../assets/e-jp.svg";
import ePt from "../assets/e-pt.svg";
import eMx from "../assets/e-mx.svg";

/** Twemoji SVGs, saved locally so the export can never render tofu. */
export const EMOJI: Record<string, string> = {
  eyes: eEyes,
  raise: eRaise,
  ramen: eRamen,
  down: eDown,
  tower: eTower,
  taco: eTaco,
  chart: eChart,
  party: eParty,
  fire: eFire,
  sob: eSob,
  plane: ePlane,
  jp: eJp,
  pt: ePt,
  mx: eMx,
};

const TOKEN = /(\[[a-z]+\])/g;

/**
 * Renders a string where `[fire]` style tokens become inline emoji images.
 * "\n" starts a new line — line count stays exactly what the layout assumes.
 */
export function RichText({ text, size }: { text: string; size: number }) {
  return (
    <>
      {text.split("\n").map((line, li) => (
        <span key={li} style={{ display: "block" }}>
          {line.split(TOKEN).map((part, i) => {
            const m = /^\[([a-z]+)\]$/.exec(part);
            const src = m ? EMOJI[m[1]] : undefined;
            if (!src) return <React.Fragment key={i}>{part}</React.Fragment>;
            return (
              <Img
                key={i}
                src={src}
                style={{
                  width: size,
                  height: size,
                  objectFit: "contain",
                  display: "inline-block",
                  verticalAlign: "-0.18em",
                  marginLeft: size * 0.05,
                  marginRight: size * 0.03,
                }}
              />
            );
          })}
        </span>
      ))}
    </>
  );
}
