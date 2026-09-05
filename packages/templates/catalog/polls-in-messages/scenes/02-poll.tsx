import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from "@genmotion/motion";
import { C, CHAT_W } from "../components/brand";
import { ChatChrome, ChatList, Composer, rowTop, POLL_ROW0_CY } from "../components/chat";
import { SCENE2_MSGS, POLL, PRESS_AT } from "../components/script";

const W = 1080;
const S = W / CHAT_W; // 1.3846 — matches scene 1's push-in crop
const LIST_BOTTOM = 1889;

export default function Scene() {
  const frame = useCurrentFrame();

  // The chat chrome resolves down into place out of scene 1's crop.
  const chromeTop = interpolate(frame, [4, 22], [-246, 0], {
    easing: Easing.outSmooth,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Finger tracks the live position of the first poll option.
  const pollTop = rowTop(SCENE2_MSGS, frame, "poll", W, LIST_BOTTOM);
  const targetX = 374 * S;
  const targetY = pollTop + POLL_ROW0_CY * S;

  const approach = interpolate(frame, [134, 156], [0, 1], {
    easing: Easing.outSmooth,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const leave = interpolate(frame, [172, 192], [0, 1], {
    easing: Easing.inOutCubic,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const travel = approach - leave;
  const fingerX = 880 + (targetX - 880) * travel;
  const fingerY = 2090 + (targetY - 2090) * travel;
  const pressDip = interpolate(frame, [PRESS_AT, PRESS_AT + 4, PRESS_AT + 13], [0, 1, 0], {
    easing: Easing.inOutCubic,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const ripple = interpolate(frame, [PRESS_AT + 2, PRESS_AT + 20], [0, 1], {
    easing: Easing.outCubic,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const fingerVisible = frame > 130 && frame < 194;

  return (
    <AbsoluteFill style={{ backgroundColor: C.stage }}>
      <div
        id="chat-window"
        style={{ position: "absolute", left: 0, top: 0, width: W, height: 1920, overflow: "hidden", backgroundColor: C.stage }}
      >
        <ChatList w={W} bottomY={LIST_BOTTOM} msgs={SCENE2_MSGS} frame={frame} poll={POLL} />
        <Composer w={W} top={LIST_BOTTOM} id="composer" />
        <ChatChrome w={W} top={chromeTop} id="chat-chrome" />

        {fingerVisible && (
          <>
            {ripple > 0 && ripple < 1 && (
              <div
                id="tap-ripple"
                style={{
                  position: "absolute",
                  left: fingerX,
                  top: fingerY,
                  width: 70 + ripple * 300,
                  height: 70 + ripple * 300,
                  marginLeft: -(70 + ripple * 300) / 2,
                  marginTop: -(70 + ripple * 300) / 2,
                  borderRadius: "50%",
                  border: `4px solid ${C.blue}`,
                  opacity: (1 - ripple) * 0.55,
                }}
              />
            )}
            <div
              id="tap-finger"
              style={{
                position: "absolute",
                left: fingerX,
                top: fingerY,
                width: 116,
                height: 116,
                marginLeft: -58,
                marginTop: -58,
                borderRadius: "50%",
                backgroundColor: "rgba(24,24,30,0.30)",
                border: "4px solid rgba(255,255,255,0.75)",
                boxShadow: "0 18px 44px rgba(15,17,26,0.28)",
                transform: `scale(${(0.85 + 0.15 * travel) * (1 - pressDip * 0.16)})`,
                opacity: Math.min(1, travel * 3.2),
              }}
            />
          </>
        )}
      </div>
    </AbsoluteFill>
  );
}
