"use client";

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { useCurrentFrame, useVideoConfig } from "./context";

/**
 * Drive a GSAP timeline deterministically from the frame clock.
 *
 * The builder runs once per mount (and again if the composition is resized),
 * must return a timeline, and must NOT start wall-clock animations (the hook
 * pauses the timeline and seeks it to frame/fps every frame, in both preview
 * and export).
 *
 * const ref = useGsapTimeline<HTMLDivElement>((container) => {
 *   const tl = gsap.timeline();
 *   tl.from(container.querySelectorAll(".item"), {
 *     y: 60, opacity: 0, stagger: 0.08, ease: "power3.out", duration: 0.6,
 *   });
 *   return tl;
 * });
 * return <div ref={ref}>...</div>;
 */
export function useGsapTimeline<T extends HTMLElement = HTMLDivElement>(
  builder: (container: T) => gsap.core.Timeline,
): React.RefObject<T | null> {
  const containerRef = useRef<T>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const ctx = gsap.context(() => {
      const tl = builder(containerRef.current!);
      tl.pause();
      timelineRef.current = tl;
    }, containerRef.current);
    return () => {
      timelineRef.current = null;
      ctx.revert();
    };
    // The builder runs once per mount, and again whenever the composition is
    // resized. Scene code is replaced wholesale on edit, which remounts — but a
    // resize does NOT remount, and builders close over dimensions: nearly every
    // scene derives its distances from `useVideoConfig()`. A timeline built at
    // one size then applied at another lands elements at the wrong offsets, and
    // because entrances are `.from({opacity: 0})` the visible result is a blank
    // frame. `builder` is excluded on purpose — it is a new closure every
    // render, so including it would rebuild the timeline on every frame.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height]);

  useLayoutEffect(() => {
    const tl = timelineRef.current;
    if (!tl) return;
    tl.seek(Math.min(frame / fps, tl.duration()), false);
    // `width`/`height` are deps even though the seek doesn't read them: a resize
    // rebuilds the timeline above, and a freshly built timeline sits at time 0 —
    // where every `.from()` entrance is at its start state, i.e. invisible. If
    // this only re-ran on a frame change, resizing a paused composition would
    // leave the frame blank until the clock moved.
  }, [frame, fps, width, height]);

  return containerRef;
}

export { gsap };
