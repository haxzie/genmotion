import React from "react";
import {
  Img,
  interpolate,
  Easing,
  spring,
  springPresets,
  useVideoConfig,
} from "@genmotion/motion";
import { ChevronLeft, ChevronRight, Video, Wifi, BarChart3, Check, Plus, ArrowUp, Heart, ThumbsUp } from "lucide-react";
import { C, FONT, M, CHAT_W } from "./brand";
import { RichText } from "./emoji";

import mayaPic from "../assets/avatar-maya.jpg";
import jordanPic from "../assets/avatar-jordan.jpg";
import priyaPic from "../assets/avatar-priya.jpg";
import samPic from "../assets/avatar-sam.jpg";
import tessPic from "../assets/avatar-tess.jpg";

export const PEOPLE: Record<string, { name: string; pic: string }> = {
  maya: { name: "Maya", pic: mayaPic },
  jordan: { name: "Jordan", pic: jordanPic },
  priya: { name: "Priya", pic: priyaPic },
  sam: { name: "Sam", pic: samPic },
  tess: { name: "Tess", pic: tessPic },
};

export type Msg = {
  id: string;
  from: string; // "me" | key of PEOPLE
  kind?: "text" | "typing" | "poll";
  text?: string; // "\n" gives explicit line breaks
  h: number; // design units, INCLUDING the trailing gap
  at: number;
  until?: number; // row collapses again (typing indicator)
  name?: boolean;
  reaction?: { at: number; kind: "heart" | "like" };
};

/* ------------------------------------------------------------------ */
/* layout                                                              */
/* ------------------------------------------------------------------ */

// A touch of overshoot so the whole thread settles when a message lands.
const SETTLE = Easing.bezier(0.2, 1.1, 0.3, 1);

export function rowGrow(frame: number, m: Msg) {
  const inP = interpolate(frame, [m.at, m.at + 11], [0, 1], {
    easing: SETTLE,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const outP =
    m.until == null
      ? 0
      : interpolate(frame, [m.until, m.until + 8], [0, 1], {
          easing: Easing.inOutCubic,
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
  return inP * (1 - outP);
}

export function layout(msgs: Msg[], frame: number) {
  const tops: number[] = [];
  let y = 0;
  for (const m of msgs) {
    tops.push(y);
    y += m.h * rowGrow(frame, m);
  }
  return { tops, total: y };
}

/* poll geometry, in design units inside the card */
export const POLL_H = 500;
export const POLL_W = 620;
export const POLL_ROW0_CY = 208;
export const POLL_ROW_PITCH = 106;

export type Vote = { who: string; opt: number; at: number };

/* ------------------------------------------------------------------ */
/* chrome                                                              */
/* ------------------------------------------------------------------ */

export function ChatChrome({ w, top = 0, id }: { w: number; top?: number; id?: string }) {
  const S = w / CHAT_W;
  const stack = ["maya", "jordan", "priya"];
  return (
    <div
      id={id}
      style={{
        position: "absolute",
        left: 0,
        top,
        width: w,
        height: M.chromeH * S,
        background: C.chrome,
        borderBottom: `1px solid ${C.hairline}`,
        fontFamily: FONT,
      }}
    >
      {/* status bar */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: w,
          height: 96 * S,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: `0 ${58 * S}px`,
          boxSizing: "border-box",
        }}
      >
        <span style={{ fontSize: 30 * S, fontWeight: 600, color: C.ink, letterSpacing: "-0.01em" }}>9:41</span>
        <div style={{ display: "flex", alignItems: "center", gap: 10 * S }}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 3 * S }}>
            {[8, 12, 16, 20].map((h, i) => (
              <div key={i} style={{ width: 5 * S, height: h * S, borderRadius: 2 * S, backgroundColor: C.ink }} />
            ))}
          </div>
          <Wifi size={26 * S} color={C.ink} strokeWidth={2.4} />
          <div
            style={{
              width: 40 * S,
              height: 20 * S,
              borderRadius: 6 * S,
              border: `${2 * S}px solid rgba(0,0,0,0.4)`,
              padding: 3 * S,
              boxSizing: "border-box",
            }}
          >
            <div style={{ width: "72%", height: "100%", borderRadius: 3 * S, backgroundColor: C.ink }} />
          </div>
        </div>
      </div>

      {/* nav bar */}
      <div style={{ position: "absolute", left: 24 * S, top: 128 * S }}>
        <ChevronLeft size={48 * S} color={C.blue} strokeWidth={2.6} />
      </div>
      <div style={{ position: "absolute", right: 34 * S, top: 132 * S }}>
        <Video size={42 * S} color={C.blue} strokeWidth={2} />
      </div>

      <div
        style={{
          position: "absolute",
          left: 0,
          top: 104 * S,
          width: w,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", height: 66 * S }}>
          {stack.map((k, i) => (
            <div
              key={k}
              style={{
                width: 62 * S,
                height: 62 * S,
                borderRadius: "50%",
                overflow: "hidden",
                border: `${3 * S}px solid #ffffff`,
                marginLeft: i === 0 ? 0 : -22 * S,
                boxSizing: "border-box",
              }}
            >
              <Img src={PEOPLE[k].pic} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 * S, marginTop: 6 * S }}>
          <span style={{ fontSize: 28 * S, color: C.ink, fontWeight: 500, letterSpacing: "-0.01em" }}>Trip Squad</span>
          <ChevronRight size={24 * S} color={C.inkSoft} strokeWidth={2.6} />
        </div>
      </div>
    </div>
  );
}

export function Composer({ w, top, id }: { w: number; top: number; id?: string }) {
  const S = w / CHAT_W;
  return (
    <div
      id={id}
      style={{
        position: "absolute",
        left: 0,
        top,
        width: w,
        height: M.composerH * S,
        backgroundColor: "#ffffff",
        display: "flex",
        alignItems: "flex-start",
        gap: 18 * S,
        padding: `${22 * S}px ${26 * S}px 0`,
        boxSizing: "border-box",
        fontFamily: FONT,
      }}
    >
      <div
        style={{
          width: 66 * S,
          height: 66 * S,
          borderRadius: "50%",
          backgroundColor: C.field,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Plus size={36 * S} color={C.inkSoft} strokeWidth={2.4} />
      </div>
      <div
        style={{
          flex: 1,
          height: 66 * S,
          borderRadius: 33 * S,
          border: `1px solid ${C.hairline}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: `0 ${8 * S}px 0 ${26 * S}px`,
          boxSizing: "border-box",
        }}
      >
        <span style={{ fontSize: 30 * S, color: C.inkSoft }}>iMessage</span>
        <div
          style={{
            width: 50 * S,
            height: 50 * S,
            borderRadius: "50%",
            backgroundColor: "#d6d6db",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ArrowUp size={30 * S} color="#ffffff" strokeWidth={3} />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* bubbles                                                             */
/* ------------------------------------------------------------------ */

function Tapback({ S, kind, p, side }: { S: number; kind: "heart" | "like"; p: number; side: "in" | "out" }) {
  const s = 0.4 + 0.6 * p;
  return (
    <div
      style={{
        position: "absolute",
        top: -34 * S,
        [side === "in" ? "right" : "left"]: -22 * S,
        transform: `scale(${s})`,
        transformOrigin: "bottom center",
        opacity: Math.min(1, p * 1.6),
      }}
    >
      <div
        style={{
          width: 62 * S,
          height: 62 * S,
          borderRadius: "50%",
          backgroundColor: "#ffffff",
          border: `${2 * S}px solid rgba(0,0,0,0.07)`,
          boxShadow: `0 ${4 * S}px ${12 * S}px rgba(0,0,0,0.10)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {kind === "heart" ? (
          <Heart size={30 * S} color={C.red} fill={C.red} strokeWidth={0} />
        ) : (
          <ThumbsUp size={30 * S} color={C.blue} fill={C.blue} strokeWidth={0} />
        )}
      </div>
    </div>
  );
}

function TypingBubble({ S, frame }: { S: number; frame: number }) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 12 * S,
        padding: `${26 * S}px ${30 * S}px`,
        borderRadius: 40 * S,
        backgroundColor: C.bubbleIn,
      }}
    >
      {[0, 1, 2].map((i) => {
        const t = (frame * 0.16 + i * 0.7) % (Math.PI * 2);
        const a = 0.35 + 0.45 * (0.5 + 0.5 * Math.sin(t));
        return (
          <div
            key={i}
            style={{
              width: 18 * S,
              height: 18 * S,
              borderRadius: "50%",
              backgroundColor: "#8e8e93",
              opacity: a,
              transform: `scale(${0.86 + a * 0.16})`,
            }}
          />
        );
      })}
    </div>
  );
}

function Row({
  m,
  S,
  frame,
  poll,
}: {
  m: Msg;
  S: number;
  frame: number;
  poll?: PollProps;
}) {
  const { fps } = useVideoConfig();
  const isMe = m.from === "me";
  const person = PEOPLE[m.from];
  const t = frame - m.at;

  // Bubble arrival: springy scale + a short rise, tilt and blur that resolve.
  const pop = spring({
    frame: t,
    fps,
    config: { mass: 0.85, stiffness: 170, damping: 13 },
    durationInFrames: 18,
  });
  const settle = interpolate(t, [0, 16], [1, 0], {
    easing: Easing.outQuart,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const scale = 0.62 + 0.38 * pop;
  const opacity = Math.min(1, Math.max(0, t / 4));
  const rise = settle * 26 * S;
  const tilt = settle * (isMe ? 3.2 : -3.2);
  const blur = settle * 9 * S;
  const emphasis = interpolate(t, [2, 22], [0, 1], {
    easing: Easing.outCubic,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const avatarPop = spring({
    frame: t - 2,
    fps,
    config: springPresets.bouncy,
    durationInFrames: 15,
  });
  const plain = m.kind == null || m.kind === "text";
  const reactP = m.reaction
    ? interpolate(frame, [m.reaction.at, m.reaction.at + 10], [0, 1], {
        easing: Easing.outBounce,
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 0;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: isMe ? "flex-end" : "flex-start",
        paddingBottom: M.gap * S,
        paddingLeft: isMe ? 0 : 20 * S,
        paddingRight: isMe ? 26 * S : 0,
        boxSizing: "border-box",
        fontFamily: FONT,
      }}
    >
      {!isMe && (
        <div
          style={{
            width: M.avatar * S,
            height: M.avatar * S,
            borderRadius: "50%",
            overflow: "hidden",
            flexShrink: 0,
            marginRight: 16 * S,
            opacity,
            transform: `scale(${0.5 + 0.5 * avatarPop})`,
          }}
        >
          {person ? (
            <Img src={person.pic} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : null}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", alignItems: isMe ? "flex-end" : "flex-start", minWidth: 0 }}>
        {m.name && person && (
          <span
            style={{
              fontSize: 26 * S,
              color: C.inkSoft,
              marginLeft: 16 * S,
              marginBottom: 8 * S,
              opacity,
              transform: `translateY(${settle * 10 * S}px)`,
            }}
          >
            {person.name}
          </span>
        )}

        <div
          style={{
            position: "relative",
            transformOrigin: isMe ? "bottom right" : "bottom left",
            transform: `translateY(${rise}px) scale(${scale}) rotate(${tilt}deg)`,
            filter: blur > 0.4 ? `blur(${blur}px)` : "none",
            opacity,
          }}
        >
          {/* emphasis ring — the bubble lands with a soft pulse */}
          {plain && emphasis > 0 && emphasis < 1 && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: 40 * S,
                backgroundColor: isMe ? C.blue : "#c9c9cf",
                transform: `scale(${1 + emphasis * 0.24})`,
                opacity: (1 - emphasis) * 0.4,
              }}
            />
          )}
          {m.kind === "typing" ? (
            <TypingBubble S={S} frame={frame} />
          ) : m.kind === "poll" && poll ? (
            <PollCard S={S} frame={frame} {...poll} />
          ) : (
            <div
              style={{
                position: "relative",
                display: "inline-block",
                maxWidth: 640 * S,
                padding: `${M.padY * S}px ${M.padX * S}px`,
                borderRadius: 40 * S,
                background: isMe
                  ? `linear-gradient(180deg, #37a2ff 0%, ${C.blue} 100%)`
                  : C.bubbleIn,
                color: isMe ? "#ffffff" : C.bubbleInText,
                fontSize: M.font * S,
                lineHeight: `${M.line * S}px`,
                letterSpacing: "-0.01em",
                whiteSpace: "pre",
                boxShadow: `0 ${10 * S}px ${26 * S}px rgba(15,17,26,${0.20 * settle})`,
              }}
            >
              <RichText text={m.text ?? ""} size={M.font * S} />
            </div>
          )}
          {m.reaction && reactP > 0 && (
            <Tapback S={S} kind={m.reaction.kind} p={reactP} side={isMe ? "out" : "in"} />
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* poll card                                                           */
/* ------------------------------------------------------------------ */

export type PollProps = {
  question: string;
  options: string[];
  votes: Vote[];
  optionsAt: number;
  press?: { at: number; opt: number };
  idPrefix?: string;
};

export function PollCard({
  S,
  frame,
  question,
  options,
  votes,
  optionsAt,
  press: pressCfg,
  idPrefix = "poll",
}: PollProps & { S: number; frame: number }) {
  const vp = (v: Vote) =>
    interpolate(frame, [v.at, v.at + 11], [0, 1], {
      easing: Easing.outCubic,
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });

  const counts = options.map((_, i) =>
    votes.filter((v) => v.opt === i).reduce((a, v) => a + vp(v), 0),
  );
  const total = counts.reduce((a, b) => a + b, 0);
  const shown = options.map((_, i) => votes.filter((v) => v.opt === i && vp(v) > 0.55).length);
  const totalShown = shown.reduce((a, b) => a + b, 0);
  const maxCount = Math.max(...counts);
  const myVote = votes.find((v) => v.who === "me" && vp(v) > 0.4);

  return (
    <div
      id={idPrefix + "-card"}
      style={{
        width: POLL_W * S,
        height: POLL_H * S,
        boxSizing: "border-box",
        padding: 34 * S,
        borderRadius: 44 * S,
        backgroundColor: "#ffffff",
        border: `1px solid rgba(0,0,0,0.10)`,
        boxShadow: `0 ${10 * S}px ${34 * S}px rgba(15,17,26,0.10)`,
        fontFamily: FONT,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 18 * S, height: 56 * S }}>
        <div
          style={{
            width: 52 * S,
            height: 52 * S,
            borderRadius: 16 * S,
            backgroundColor: "rgba(10,124,255,0.13)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <BarChart3 size={30 * S} color={C.blue} strokeWidth={2.4} />
        </div>
        <span style={{ fontSize: 34 * S, fontWeight: 600, color: C.ink, letterSpacing: "-0.015em" }}>{question}</span>
      </div>

      <div style={{ height: 14 * S }} />
      <div style={{ fontSize: 28 * S, color: C.inkSoft, height: 36 * S, display: "flex", alignItems: "center" }}>
        {totalShown === 0 ? "Tap to vote · 5 people" : `${totalShown} of 5 voted`}
      </div>
      <div style={{ height: 22 * S }} />

      <div style={{ display: "flex", flexDirection: "column", gap: 14 * S }}>
        {options.map((label, i) => {
          const appear = interpolate(frame, [optionsAt + i * 4, optionsAt + i * 4 + 10], [0, 1], {
            easing: Easing.outCubic,
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const pct = total > 0.02 ? counts[i] / total : 0;
          const leading = total > 2.2 && counts[i] >= maxCount - 0.001;
          const mine = myVote?.opt === i;
          const press =
            pressCfg != null && pressCfg.opt === i
              ? interpolate(frame, [pressCfg.at, pressCfg.at + 4, pressCfg.at + 13], [0, 1, 0], {
                  easing: Easing.inOutCubic,
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                })
              : 0;
          const pulse = leading ? 0.5 + 0.5 * Math.sin(frame * 0.09) : 0;
          const voters = votes.filter((v) => v.opt === i);

          return (
            <div
              key={label}
              id={`${idPrefix}-opt-${i}`}
              style={{
                position: "relative",
                height: 92 * S,
                borderRadius: 26 * S,
                overflow: "hidden",
                backgroundColor: C.field,
                opacity: appear,
                transform: `translateY(${(1 - appear) * 16 * S}px) scale(${1 - press * 0.025})`,
                boxShadow: mine ? `inset 0 0 0 ${3 * S}px ${C.blue}` : "none",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: `${Math.max(0, pct) * 100}%`,
                  backgroundColor: leading ? C.blueTint : C.neutralTint,
                  opacity: leading ? 0.75 + 0.25 * pulse : 1,
                }}
              />
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  padding: `0 ${22 * S}px 0 ${20 * S}px`,
                  gap: 16 * S,
                }}
              >
                <div
                  style={{
                    width: 38 * S,
                    height: 38 * S,
                    borderRadius: "50%",
                    flexShrink: 0,
                    border: mine ? "none" : `${3 * S}px solid #c2c2c8`,
                    backgroundColor: mine ? C.blue : "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxSizing: "border-box",
                  }}
                >
                  {mine && <Check size={24 * S} color="#ffffff" strokeWidth={3.4} />}
                </div>
                <span
                  style={{
                    fontSize: 32 * S,
                    lineHeight: `${42 * S}px`,
                    color: C.ink,
                    fontWeight: leading ? 600 : 500,
                    letterSpacing: "-0.01em",
                    whiteSpace: "pre",
                  }}
                >
                  <RichText text={label} size={32 * S} />
                </span>
                <div style={{ flex: 1 }} />
                <div style={{ display: "flex", alignItems: "center" }}>
                  {voters.map((v) => {
                    const p = vp(v);
                    if (p <= 0.02) return null;
                    return (
                      <div
                        key={v.who + v.at}
                        style={{
                          width: 42 * S,
                          height: 42 * S,
                          borderRadius: "50%",
                          overflow: "hidden",
                          marginLeft: -10 * S,
                          border: `${3 * S}px solid #ffffff`,
                          boxSizing: "border-box",
                          transform: `scale(${0.3 + 0.7 * p})`,
                          backgroundColor: C.blue,
                        }}
                      >
                        {PEOPLE[v.who] ? (
                          <Img src={PEOPLE[v.who].pic} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 20 * S, fontWeight: 600 }}>
                            Me
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <span style={{ fontSize: 30 * S, color: C.inkSoft, marginLeft: 14 * S, minWidth: 26 * S, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                    {shown[i]}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* list                                                                */
/* ------------------------------------------------------------------ */

export function ChatList({
  w,
  bottomY,
  msgs,
  frame,
  poll,
}: {
  w: number;
  bottomY: number;
  msgs: Msg[];
  frame: number;
  poll?: PollProps;
}) {
  const S = w / CHAT_W;
  const { tops, total } = layout(msgs, frame);
  const listTop = bottomY - total * S;

  return (
    <>
      {msgs.map((m, i) => {
        const g = rowGrow(frame, m);
        if (g <= 0.004) return null;
        return (
          <div
            key={m.id}
            id={"msg-" + m.id}
            style={{
              position: "absolute",
              left: 0,
              top: listTop + tops[i] * S,
              width: w,
              height: m.h * S,
              overflow: g < 0.999 ? "hidden" : "visible",
            }}
          >
            <Row m={m} S={S} frame={frame} poll={poll} />
          </div>
        );
      })}
    </>
  );
}

/** Frame-space y of the top of a given message row. */
export function rowTop(msgs: Msg[], frame: number, id: string, w: number, bottomY: number) {
  const S = w / CHAT_W;
  const { tops, total } = layout(msgs, frame);
  const i = msgs.findIndex((m) => m.id === id);
  return bottomY - total * S + tops[i] * S;
}
