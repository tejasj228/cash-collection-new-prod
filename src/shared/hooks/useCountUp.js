import { useEffect, useRef, useState } from "react";

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

/**
 * Animate a number from 0 up to `target` on mount (and whenever `target`
 * changes). Fast by design — a short ramp that reads as a quick tally, not a
 * slow crawl. Honours reduced-motion by jumping straight to the value.
 */
export function useCountUp(target, { duration = 850 } = {}) {
  const numericTarget = Number(target) || 0;
  const [value, setValue] = useState(numericTarget ? 0 : numericTarget);
  const frame = useRef(null);

  useEffect(() => {
    if (prefersReducedMotion() || !numericTarget) {
      setValue(numericTarget);
      return undefined;
    }
    const start = performance.now();
    const tick = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      setValue(numericTarget * easeOutCubic(progress));
      if (progress < 1) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, [numericTarget, duration]);

  return value;
}
