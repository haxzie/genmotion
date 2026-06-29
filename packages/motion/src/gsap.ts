"use client";

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { useCurrentFrame, useVideoConfig } from "./context";

/**
 * Drive a GSAP timeline deterministically from the frame clock.
 *
 * The builder runs once, must return a timeline, and must NOT start
 * wall-clock animations (the hook pauses the timeline and seeks it to
 * frame/fps every frame, in both preview and export).
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
  const { fps } = useVideoConfig();

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
    // The builder is intentionally run once per mount: scene code is replaced
    // wholesale on edit, which remounts the component.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useLayoutEffect(() => {
    const tl = timelineRef.current;
    if (!tl) return;
    tl.seek(Math.min(frame / fps, tl.duration()), false);
  }, [frame, fps]);

  return containerRef;
}

export { gsap };
