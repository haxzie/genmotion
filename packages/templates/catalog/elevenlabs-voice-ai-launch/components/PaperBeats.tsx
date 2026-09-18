import React from "react";
import { Easing, interpolate } from "@genmotion/motion";
import { Headset, MousePointer2, Ruler, Box, HardHat, TrafficCone, Shirt, Construction, Laptop, Pencil, Coffee, Keyboard, NotebookPen, Armchair, Calendar, SprayCan, Pipette, Cylinder, Brush, Scissors, Wind } from "lucide-react";
import { brand } from "./brand";
import { Paper } from "./Paper";
import { ScatterWords, PhoneMark, Pop } from "./Scatter";
import { IconTile, DitherTile } from "./Tile";

/**
 * The paper world is twice the frame and the camera drifts left across it,
 * so words are carried off rather than popping out. Content is authored in
 * FRAME coordinates for the camera's starting position and offset into the world.
 */
export const PAN = { world: 2, x0: 0.375, x1: 0.525, ox: 480, oy: 540 };

export function PaperCamera({
  frame,
  end,
  panFrom = 0,
  children,
  overlay,
}: {
  frame: number;
  end: number;
  panFrom?: number;
  children: React.ReactNode;
  overlay?: React.ReactNode;
}) {
  // A steady linear drift — a plain translate so the whole beat stays a cheap,
  // copyable DOM layer (the block wipe duplicates it per window).
  const p = interpolate(frame, [panFrom, end], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const shift = (PAN.x1 - PAN.x0) * PAN.world * 1920 * p;
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", backgroundColor: brand.paper }}>
      <div style={{ position: "absolute", left: -(PAN.ox + shift), top: -PAN.oy, width: PAN.world * 1920, height: PAN.world * 1080 }}>
        <Paper>
          <div style={{ position: "absolute", left: PAN.ox, top: PAN.oy, width: 1920, height: 1080 }}>{children}</div>
        </Paper>
      </div>
      {overlay ? <div style={{ position: "absolute", inset: 0 }}>{overlay}</div> : null}
    </div>
  );
}

/** Orange app tile with the receptionist glyph. */
export function AppIcon({ frame, at, x, y, id }: { frame: number; at: number; x: number; y: number; id?: string }) {
  return (
    <Pop frame={frame} at={at} x={x} y={y} id={id}>
      <div style={{ width: 96, height: 96, borderRadius: 24, backgroundColor: "#f0713a", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 12px 30px rgba(240,113,58,0.3)" }}>
        <Headset size={50} color="#fff" strokeWidth={1.8} />
      </div>
    </Pop>
  );
}

/** Small blue "book" button that a cursor glides in and clicks.
 *  Kept FLAT (button and cursor are siblings): deeper nesting inside the
 *  block-wipe copies over a WebGL canvas blanks the frame in the renderer. */
export function BookButton({ frame, at, x, y }: { frame: number; at: number; x: number; y: number }) {
  const f = frame - at;
  const arrive = interpolate(f, [4, 18], [0, 1], { easing: Easing.outCubic, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const click = interpolate(f, [20, 23, 27], [0, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  if (frame < at) return null;
  const pillScale = 1 - click * 0.06;
  return (
    <>
      <div
        id="book-button"
        style={{ position: "absolute", left: x, top: y, padding: "8px 22px", borderRadius: 10, backgroundColor: click > 0.5 ? "#1f5fd6" : "#2f7cf6", color: "#fff", fontFamily: brand.font, fontSize: 30, fontWeight: 500, transform: `scale(${pillScale})`, boxShadow: "0 8px 20px rgba(47,124,246,0.35)" }}
      >
        book
      </div>
      {arrive > 0 && (
        <div id="book-cursor" style={{ position: "absolute", left: x + 70 + (1 - arrive) * 120, top: y + 30 + (1 - arrive) * 90 }}>
          <MousePointer2 size={Math.round(40 * (1 - click * 0.1))} color="#fff" fill="#111" strokeWidth={1.5} />
        </div>
      )}
    </>
  );
}

/** Dark calendar-event card: "Meeting · Today 10:00 AM". Flat markup, see BookButton. */
export function MeetingCard({ frame, at, x, y }: { frame: number; at: number; x: number; y: number }) {
  const toggle = interpolate(frame - at, [14, 22], [0, 1], { easing: Easing.outCubic, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const knob = 3 + toggle * 34;
  return (
    <Pop frame={frame} at={at} x={x} y={y} id="meeting-card">
      <div style={{ width: 380, padding: "16px 20px 16px 24px", borderRadius: 14, backgroundColor: "#12331f", borderLeft: "6px solid #3ddc84", boxShadow: "0 16px 40px rgba(0,0,0,0.25)", fontFamily: brand.font, color: "#fff" }}>
        <div style={{ fontSize: 32, fontWeight: 500 }}>Meeting</div>
        <div style={{ fontSize: 28, color: "#b9d3c0", marginTop: 4 }}>Today 10:00 AM</div>
        {/* toggle drawn as one element: track colour + knob as a radial gradient */}
        <div
          style={{
            marginTop: 12,
            width: 64,
            height: 30,
            borderRadius: 15,
            backgroundColor: toggle > 0.5 ? "#3ddc84" : "#2a4a36",
            backgroundImage: `radial-gradient(circle at ${knob + 12}px 15px, #ffffff 11.5px, rgba(255,255,255,0) 12.5px)`,
          }}
        />
      </div>
    </Pop>
  );
}

/** "To make an appointment." — the tail of the opening sentence, salon objects. */
export function AppointmentProps({ f, until }: { f: number; until?: number }) {
  return (
    <>
      <ScatterWords frame={f} until={until} idPrefix="appt" words={[{ t: "to", x: 330, y: 700 }, { t: "make", x: 760, y: 280 }, { t: "an", x: 1240, y: 280 }, { t: "appointment.", x: 1250, y: 660 }]} start={0} gap={6} />
      <AppIcon frame={f} at={8} x={650} y={160} id="app-icon" />
      <PhoneMark frame={f} at={4} x={1080} y={600} id="phone-appt" />
      <IconTile frame={f} at={12} until={until} x={1520} y={230} size={180} icon={SprayCan} accent="#8a5ad2" id="tile-spray" />
      <IconTile frame={f} at={16} until={until} x={1180} y={780} size={200} icon={Pipette} id="tile-pump" />
      <IconTile frame={f} at={20} until={until} x={1000} y={640} size={90} icon={Cylinder} id="tile-tube" />
      <IconTile frame={f} at={24} until={until} x={1750} y={640} size={110} icon={Brush} id="tile-brush" />
      <IconTile frame={f} at={28} until={until} x={1900} y={40} size={200} icon={Scissors} id="tile-scissors" />
      <IconTile frame={f} at={32} until={until} x={2100} y={640} size={220} icon={Wind} id="tile-dryer" />
      <DitherTile frame={f} at={26} until={until} x={1780} y={330} w={90} h={90} id="dither-appt" />
    </>
  );
}

/** "To book a job." — trades: the blue book button gets clicked. */
export function BookJobPaper({ f }: { f: number }) {
  return (
    <>
      <ScatterWords frame={f} idPrefix="job" words={[{ t: "To", x: 200, y: 470 }, { t: "book", x: 520, y: 380 }, { t: "a", x: 940, y: 330 }, { t: "job.", x: 1040, y: 420 }]} start={2} gap={6} />
      <BookButton frame={f} at={0} x={160} y={220} />
      <PhoneMark frame={f} at={10} x={790} y={510} id="phone-job" />
      <IconTile frame={f} at={6} x={400} y={640} size={110} icon={Ruler} accent="#e0b02a" id="tile-tape" />
      <IconTile frame={f} at={12} x={900} y={640} size={220} icon={Box} id="tile-block" />
      <IconTile frame={f} at={18} x={1600} y={60} size={230} icon={HardHat} accent="#e8622a" id="tile-hardhat" />
      <IconTile frame={f} at={24} x={1300} y={720} size={170} icon={TrafficCone} accent="#ef7a2a" id="tile-cone" />
      <IconTile frame={f} at={30} x={1980} y={330} size={220} icon={Shirt} accent="#f0902e" id="tile-vest" />
      <IconTile frame={f} at={36} x={2060} y={720} size={340} icon={Construction} accent="#e8a02a" id="tile-crane" />
      <DitherTile frame={f} at={22} x={1880} y={640} w={110} h={220} id="dither-job" />
    </>
  );
}

/** "To schedule a meeting." — office: the Meeting card, desk objects. */
export function MeetingPaper({ f }: { f: number }) {
  return (
    <>
      <ScatterWords frame={f} idPrefix="meet" words={[{ t: "To", x: 280, y: 470 }, { t: "schedule", x: 520, y: 340 }, { t: "a", x: 1090, y: 280 }, { t: "meeting.", x: 1100, y: 470 }]} start={2} gap={6} />
      <MeetingCard frame={f} at={0} x={180} y={200} />
      <PhoneMark frame={f} at={10} x={840} y={520} id="phone-meet" />
      <IconTile frame={f} at={6} x={700} y={70} size={220} icon={Laptop} id="tile-laptop" />
      <IconTile frame={f} at={12} x={150} y={720} size={140} icon={Pencil} accent="#e0a02a" id="tile-pencil" />
      <IconTile frame={f} at={18} x={650} y={640} size={180} icon={Coffee} id="tile-mug" />
      <IconTile frame={f} at={24} x={1400} y={760} size={260} icon={Keyboard} id="tile-keyboard" />
      <IconTile frame={f} at={30} x={1600} y={420} size={140} icon={NotebookPen} id="tile-notebook" />
      <IconTile frame={f} at={36} x={2060} y={560} size={360} icon={Armchair} id="tile-chair" />
      <IconTile frame={f} at={40} x={2180} y={100} size={200} icon={Calendar} accent="#d9382c" id="tile-calendar" />
      <DitherTile frame={f} at={28} x={1900} y={160} w={260} h={220} id="dither-meet" />
    </>
  );
}

/** "But nobody's around to pickup." — objects from all three worlds. */
export function NobodyPaper({ f }: { f: number }) {
  return (
    <div style={{ position: "absolute", left: 240, top: 0, width: 1920, height: 1080 }}>
      <ScatterWords frame={f} idPrefix="nobody" words={[{ t: "But", x: 260, y: 520 }, { t: "nobody's", x: 420, y: 420 }, { t: "around", x: 820, y: 360 }, { t: "to", x: 1000, y: 470 }, { t: "pickup.", x: 1080, y: 590 }]} start={2} gap={6} />
      <PhoneMark frame={f} at={12} x={690} y={560} id="phone-nobody" />
      <IconTile frame={f} at={4} x={320} y={140} size={170} icon={Box} id="n-block" />
      <IconTile frame={f} at={8} x={800} y={110} size={100} icon={SprayCan} accent="#8a5ad2" id="n-spray" />
      <IconTile frame={f} at={12} x={100} y={470} size={90} icon={Cylinder} id="n-tube" />
      <IconTile frame={f} at={16} x={200} y={700} size={190} icon={Coffee} id="n-mug" />
      <IconTile frame={f} at={20} x={640} y={690} size={110} icon={Ruler} accent="#e0b02a" id="n-tape" />
      <IconTile frame={f} at={24} x={1460} y={700} size={300} icon={HardHat} accent="#e8622a" id="n-hat" />
      <IconTile frame={f} at={28} x={1720} y={440} size={170} icon={TrafficCone} accent="#ef7a2a" id="n-cone" />
      <IconTile frame={f} at={32} x={720} y={820} size={260} icon={Keyboard} id="n-keyboard" />
      <IconTile frame={f} at={36} x={1220} y={80} size={170} icon={Calendar} accent="#d9382c" id="n-calendar" />
      <IconTile frame={f} at={40} x={1620} y={90} size={190} icon={Pipette} id="n-pump" />
      <IconTile frame={f} at={44} x={2000} y={300} size={200} icon={Scissors} id="n-scissors" />
      <IconTile frame={f} at={48} x={2100} y={720} size={240} icon={Laptop} id="n-laptop" />
    </div>
  );
}
