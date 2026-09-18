import { AbsoluteFill, useCurrentFrame, useWindowDuration, interpolate, Easing } from "@genmotion/motion";
import { Headphones, CalendarCheck, LayoutGrid } from "lucide-react";
import { AgentCard, AGENT_GRADIENTS, CARD, CENTER_CARD } from "../components/AgentCard";
import { brand } from "../components/brand";

export const BAR = { left: 100, top: 526, h: 28, w: 1720 };

const AGENTS = [
  { icon: Headphones, title: "Informational agent", sub: "Answer questions, no booking needed", gradient: AGENT_GRADIENTS.informational, id: "card-informational" },
  { icon: CalendarCheck, title: "Receptionist agent", sub: "Full appointment booking system", gradient: AGENT_GRADIENTS.receptionist, id: "card-receptionist" },
  { icon: LayoutGrid, title: "Reservation agent", sub: "Bookings for spaces and equipment", gradient: AGENT_GRADIENTS.reservation, id: "card-reservation" },
];

// Beat 9 — the receptionist card is already centre-frame; its siblings slide
// out from behind it, the three hold, then squash into one gradient bar.
export default function Scene() {
  const frame = useCurrentFrame();
  const end = useWindowDuration();
  const spread = interpolate(frame, [0, 18], [0, 1], { easing: Easing.outCubic, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const textIn = interpolate(frame, [10, 22], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const textOut = interpolate(frame, [end - 36, end - 28], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const squash = interpolate(frame, [end - 30, end - 6], [0, 1], { easing: Easing.inOutCubic, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const segW = BAR.w / 3;

  return (
    <AbsoluteFill style={{ backgroundColor: brand.black }}>
      {AGENTS.map((a, i) => {
        const offset = (i - 1) * (CARD.w + CARD.gap);
        const restLeft = CENTER_CARD.left + offset * spread;
        const float = Math.sin(frame * 0.06 + i) * 3 * (1 - squash);
        const left = restLeft + (BAR.left + i * segW - restLeft) * squash;
        const top = CENTER_CARD.top + float + (BAR.top - CENTER_CARD.top) * squash;
        const w = CARD.w + (segW - CARD.w) * squash;
        const h = CARD.h + (BAR.h - CARD.h) * squash;
        return (
          <AgentCard
            key={a.id}
            id={a.id}
            icon={a.icon}
            title={a.title}
            sub={a.sub}
            gradient={a.gradient}
            textOpacity={textIn * textOut}
            style={{ left, top, width: w, height: h, borderRadius: CARD.radius * (1 - squash) + 2, zIndex: i === 1 ? 2 : 1 }}
          />
        );
      })}
    </AbsoluteFill>
  );
}
