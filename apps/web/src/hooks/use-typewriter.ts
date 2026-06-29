"use client";

import { useEffect, useState } from "react";

const TYPE_MS = 45;
const DELETE_MS = 18;
const HOLD_MS = 2200;

/** Cycles through phrases with a typewriter effect (type → hold → delete → next). */
export function useTypewriter(phrases: string[]): string {
  const [text, setText] = useState("");
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const phrase = phrases[phraseIndex % phrases.length]!;

    if (!deleting && text === phrase) {
      const t = setTimeout(() => setDeleting(true), HOLD_MS);
      return () => clearTimeout(t);
    }
    if (deleting && text === "") {
      setDeleting(false);
      setPhraseIndex((i) => (i + 1) % phrases.length);
      return;
    }

    const t = setTimeout(
      () => {
        setText(
          deleting
            ? phrase.slice(0, text.length - 1)
            : phrase.slice(0, text.length + 1),
        );
      },
      deleting ? DELETE_MS : TYPE_MS,
    );
    return () => clearTimeout(t);
  }, [text, deleting, phraseIndex, phrases]);

  return text;
}
