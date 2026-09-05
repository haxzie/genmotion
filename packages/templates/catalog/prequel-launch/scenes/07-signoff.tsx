import {
  AbsoluteFill,
  Img,
  TextAnimation,
  Easing,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "@genmotion/motion";
import { font, brand, squircle } from "../components/brand";
import prequelLogo from "../assets/prequel-logo.svg";

/* opens on exactly what scene 6 hands over: the mark, centred, on white */
const LOGO = 200;
const FROM_CY = 540;
const TO_CY = 372;
/* once the copy clears, the mark settles down to sit with the URL */
const REST_CY = 430;
const COPY_OUT = 120;
const URL_IN = 140;

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export default function Scene() {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  /* the mark eases up to make room for the copy, then settles back down once
     the copy clears so it sits as a lockup with the URL */
  const lift = interpolate(frame, [8, 46], [0, 1], { easing: Easing.outSmooth, ...clamp });
  const settle = interpolate(frame, [URL_IN - 4, URL_IN + 30], [0, 1], {
    easing: Easing.outSmooth,
    ...clamp,
  });
  const drift = Math.sin(frame / 38) * 6;
  const base = FROM_CY + (TO_CY - FROM_CY) * lift + (REST_CY - TO_CY) * settle;
  const logoCY = base + drift * lift;
  const glow = interpolate(frame, [0, 70, 140, durationInFrames], [0.35, 1, 0.55, 1], {
    easing: Easing.inOutCubic,
    ...clamp,
  });

  /* the copy clears, and the download URL takes its place */
  const exit = { at: COPY_OUT, duration: 10 } as const;

  return (
    <AbsoluteFill style={{ background: "#ffffff" }}>
      {/* a whisper of the brand gradient behind the mark */}
      <div
        style={{
          position: "absolute",
          left: 960 - 340,
          top: logoCY - 340,
          width: 680,
          height: 680,
          borderRadius: "50%",
          background: `radial-gradient(circle, rgba(225,75,21,${0.1 * glow}) 0%, rgba(172,24,96,${0.05 * glow}) 45%, rgba(255,255,255,0) 72%)`,
        }}
      />

      <div
        id="signoff-mark"
        style={{
          position: "absolute",
          left: 960 - LOGO / 2,
          top: logoCY - LOGO / 2,
          width: LOGO,
          height: LOGO,
          borderRadius: `${squircle * 100}%`,
          overflow: "hidden",
          boxShadow: "0 26px 60px rgba(20,12,30,0.22), 0 2px 6px rgba(20,12,30,0.10)",
        }}
      >
        <Img
          src={prequelLogo}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      </div>

      <h1
        id="signoff-headline"
        style={{
          position: "absolute",
          left: 0,
          top: 548,
          width: 1920,
          margin: 0,
          textAlign: "center",
          fontSize: 78,
          fontWeight: 500,
          letterSpacing: "-0.03em",
          lineHeight: 1.1,
          color: brand.text,
          fontFamily: font,
        }}
      >
        <TextAnimation
          text="Create Cinematic Screen Recordings"
          by="word"
          preset="blurUp"
          startFrom={30}
          stagger={3}
          duration={14}
          exit={exit}
        />
      </h1>

      <p
        id="signoff-sub"
        style={{
          position: "absolute",
          left: 0,
          top: 672,
          width: 1920,
          margin: 0,
          textAlign: "center",
          fontSize: 36,
          fontWeight: 400,
          letterSpacing: "-0.01em",
          color: brand.textMuted,
          fontFamily: font,
        }}
      >
        <TextAnimation
          text="Made for Apple Silicon"
          by="word"
          preset="fadeUp"
          startFrom={52}
          stagger={2}
          duration={12}
          exit={exit}
        />
      </p>

      {/* revealed once the copy has cleared — the last thing on screen */}
      <div
        id="signoff-url"
        style={{
          position: "absolute",
          left: 0,
          top: 566,
          width: 1920,
          textAlign: "center",
          fontSize: 64,
          fontWeight: 500,
          letterSpacing: "-0.02em",
          color: brand.text,
          fontFamily: font,
        }}
      >
        <TextAnimation
          text="prequel.sh"
          by="char"
          preset="blurUp"
          startFrom={URL_IN}
          stagger={2}
          duration={14}
        />
      </div>
    </AbsoluteFill>
  );
}
