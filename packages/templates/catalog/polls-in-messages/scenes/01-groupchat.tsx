import React from "react";
import {
  Camera,
  Layer,
  TextAnimation,
  useCurrentFrame,
  interpolate,
  Easing,
} from "@genmotion/motion";
import { C, FONT } from "../components/brand";
import { PhoneShell } from "../components/phone";
import { ChatChrome, ChatList, Composer } from "../components/chat";
import { SCENE1_MSGS } from "../components/script";

const SCREEN_W = 780;
const SCREEN_H = 1742;
const SCREEN_X = 150;
const SCREEN_Y = 354;
const LIST_BOTTOM = 1542; // screen-local

export default function Scene() {
  const frame = useCurrentFrame();

  const rise = interpolate(frame, [0, 18], [0, 1], {
    easing: Easing.outSmooth,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const glow = 0.55 + 0.45 * Math.sin(frame * 0.035);

  return (
    <Camera
      style={{ backgroundColor: C.stage }}
      keyframes={[
        { at: 0, x: 0.5, y: 0.5, zoom: 1 },
        { at: 125, x: 0.5, y: 0.5, zoom: 1 },
        // Push into the screen — scene 2 opens on exactly this crop.
        { at: 170, x: 0.5, y: 0.638, zoom: 1.3846154, ease: Easing.inOutCubic },
      ]}
    >
      <Layer z={2200}>
        <div
          id="stage-glow"
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: 1080,
            height: 1920,
            background:
              "radial-gradient(760px 620px at 50% 58%, rgba(10,124,255,0.13) 0%, rgba(10,124,255,0.04) 45%, rgba(255,255,255,0) 72%)",
            opacity: 0.6 + glow * 0.4,
            transform: `scale(${1 + glow * 0.03})`,
            transformOrigin: "50% 58%",
          }}
        />
      </Layer>

      <Layer>
        <div
          id="hook-headline"
          style={{
            position: "absolute",
            left: 70,
            top: 96,
            width: 940,
            textAlign: "center",
            fontFamily: FONT,
            fontSize: 76,
            lineHeight: "88px",
            fontWeight: 500,
            letterSpacing: "-0.03em",
            color: C.ink,
          }}
        >
          <TextAnimation
            text={"The group chat\ncan't decide."}
            by="word"
            preset="blurUp"
            stagger={3}
            duration={12}
            exit={{ at: 104, duration: 9 }}
            hold="float"
          />
        </div>

        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: 1080,
            height: 1920,
            transform: `translateY(${(1 - rise) * 140}px)`,
            opacity: rise,
          }}
        >
          <PhoneShell left={SCREEN_X} top={SCREEN_Y} screenW={SCREEN_W} screenH={SCREEN_H}>
            <ChatList w={SCREEN_W} bottomY={LIST_BOTTOM} msgs={SCENE1_MSGS} frame={frame} />
            <Composer w={SCREEN_W} top={LIST_BOTTOM} id="composer" />
            <ChatChrome w={SCREEN_W} id="chat-chrome" />
          </PhoneShell>
        </div>
      </Layer>
    </Camera>
  );
}
