import confetti from "canvas-confetti";
import { isCoarsePointer, prefersReducedMotion } from "./motion.js";

const COLORS = ["#ffb457", "#f0776c", "#5eead4", "#7c3aed", "#f2f0ff"];

export function celebrate(origin) {
  if (prefersReducedMotion()) return;

  const light = isCoarsePointer();
  const shared = {
    colors: COLORS,
    disableForReducedMotion: true,
    scalar: 0.9,
    origin: origin || { x: 0.5, y: 0.6 },
  };

  confetti({
    ...shared,
    particleCount: light ? 36 : 70,
    spread: 62,
    startVelocity: 42,
  });

  // Second burst is desktop-only; on phones it just costs frames.
  if (light) return;
  setTimeout(() => {
    confetti({ ...shared, particleCount: 40, spread: 100, startVelocity: 28 });
  }, 130);
}
