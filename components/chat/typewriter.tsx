"use client";

import { useEffect, useState } from "react";

interface Props {
  text: string;
  speedMs?: number;
}

// Relies on the parent to remount this component (via a stable wrapping key)
// when a new message arrives, so initial state is always correct and the
// effect never needs to reset state on a text change mid-mount.
function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
}

export function Typewriter({ text, speedMs = 40 }: Props) {
  // Honour reduced-motion: start already showing the full text (the CSS media
  // query cannot stop this JS-driven reveal). The parent remounts this per
  // message via a stable key, so the initializer captures the right text.
  const [shown, setShown] = useState(() => (prefersReducedMotion() ? text : ""));

  useEffect(() => {
    if (prefersReducedMotion()) return; // full text already shown; no animation
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setShown(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, speedMs);
    return () => clearInterval(id);
  }, [text, speedMs]);

  return (
    <>
      {shown}
      {shown.length < text.length ? (
        <span aria-hidden="true" className="ml-0.5 inline-block animate-pulse">
          ▍
        </span>
      ) : null}
    </>
  );
}
