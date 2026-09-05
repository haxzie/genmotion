import React from "react";
import {
  Camera,
  Layer,
  Overlay,
  Confetti,
  TextAnimation,
  useCurrentFrame,
  interpolate,
  Easing,
} from "@genmotion/motion";
import { C, FONT } from "../components/brand";
import { PhoneShell } from "../components/phone";
import { ChatChrome, ChatList, Composer } from "../components/chat";
import { SCENE3_MSGS, POLL_DONE } from "../components/script";

const SCREEN_W = 780;
const SCREEN_H = 1742;
const SCREEN_X = 150;
const SCREEN_Y = 520;
const LIST_BOTTOM = 1364; // screen-local; matches scene 2's list at the cut

export default function Scene() {
  const frame = useCurrentFrame();
  const glow = 0.55 + 0.45 * Math.sin(frame * 0.035);

  // The device only exists once we're outside the screen.
  const island = interpolate(frame, [8, 30], [0, 1], {
    easing: Easing.outSmooth,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <Camera
      style={{ backgroundColor: C.stage }}
      keyframes={[
        // opens on scene 2's exact crop — the screen filling the frame — then pulls back
        { at: 0, x: 0.5, y: 0.6318, zoom: 1.3846154 },
        { at: 52, x: 0.5, y: 0.5, zoom: 1, ease: Easing.inOutCubic },
        { at: 150, x: 0.5, y: 0.487, zoom: 1.035, ease: Easing.inOutCubic },
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
              "radial-gradient(780px 640px at 50% 62%, rgba(10,124,255,0.15) 0%, rgba(10,124,255,0.05) 45%, rgba(255,255,255,0) 72%)",
            opacity: 0.6 + glow * 0.4,
            transform: `scale(${1 + glow * 0.03})`,
            transformOrigin: "50% 62%",
          }}
        />
      </Layer>

      <Layer>
        <div
          id="eyebrow"
          style={{
            position: "absolute",
            left: 70,
            top: 152,
            width: 940,
            textAlign: "center",
            fontFamily: FONT,
            fontSize: 30,
            fontWeight: 600,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: C.blueDeep,
          }}
        >
          <TextAnimation text="New in Messages" by="word" preset="fadeUp" startFrom={58} stagger={2} duration={10} exit="auto" />
        </div>

        <div
          id="payoff-headline"
          style={{
            position: "absolute",
            left: 70,
            top: 214,
            width: 940,
            textAlign: "center",
            fontFamily: FONT,
            fontSize: 78,
            lineHeight: "90px",
            fontWeight: 500,
            letterSpacing: "-0.03em",
            color: C.ink,
          }}
        >
          <TextAnimation
            text={"Drop a poll.\nGet an answer."}
            by="word"
            preset="blurUp"
            startFrom={64}
            stagger={3}
            duration={12}
            exit="auto"
            hold="float"
          />
        </div>

        <PhoneShell
          left={SCREEN_X}
          top={SCREEN_Y}
          screenW={SCREEN_W}
          screenH={SCREEN_H}
          islandOpacity={island}
        >
          <ChatList w={SCREEN_W} bottomY={LIST_BOTTOM} msgs={SCENE3_MSGS} frame={frame} poll={POLL_DONE} />
          <Composer w={SCREEN_W} top={LIST_BOTTOM} id="composer" />
          <ChatChrome w={SCREEN_W} id="chat-chrome" />
        </PhoneShell>
      </Layer>

      <Overlay>
        <Confetti
          startFrom={54}
          duration={96}
          count={70}
          origin={{ x: 0.5, y: 0.62 }}
          spread={360}
          power={16}
          gravity={0.42}
          colors={["#0a7cff", "#ff375f", "#ffcc00", "#34c759", "#af52de"]}
        />
      </Overlay>
    </Camera>
  );
}
