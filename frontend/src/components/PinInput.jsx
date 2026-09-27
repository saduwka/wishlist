import { AnimatePresence, motion } from "framer-motion";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { prefersReducedMotion } from "../lib/motion.js";

const LENGTH = 4;
const TRACE_MS = 550;
const STAGGER_MS = 90;

/** Tiny card-deck offsets once cells meet in the center */
const DECK = [
  { x: -3, y: 3, rotate: -2.2, scale: 0.94 },
  { x: 2, y: -1, rotate: 1.4, scale: 0.96 },
  { x: -1, y: 2, rotate: -0.8, scale: 0.98 },
  { x: 0, y: 0, rotate: 0, scale: 1 },
];

const PinInput = forwardRef(function PinInput(
  { value, onChange, label, disabled, phase = "input" },
  ref
) {
  const boxes = useRef([]);
  const cellEls = useRef([]);
  const boxesWrap = useRef(null);
  const timers = useRef([]);
  const prevValue = useRef(value);
  const [tracing, setTracing] = useState(() => Array(LENGTH).fill(false));
  const [lit, setLit] = useState(() =>
    Array.from({ length: LENGTH }, (_, i) => Boolean(value[i]?.match(/\d/)))
  );
  const [converged, setConverged] = useState(null);

  useImperativeHandle(ref, () => ({
    focus: () => boxes.current[Math.min(value.length, LENGTH - 1)]?.focus(),
  }));

  useEffect(() => {
    return () => {
      timers.current.forEach(clearTimeout);
    };
  }, []);

  useEffect(() => {
    const prev = prevValue.current;
    prevValue.current = value;
    const reduced = prefersReducedMotion();

    const newlyFilled = [];
    for (let i = 0; i < LENGTH; i++) {
      const had = Boolean(prev[i]?.match(/\d/));
      const has = Boolean(value[i]?.match(/\d/));
      if (has && (!had || prev[i] !== value[i])) newlyFilled.push(i);
      if (!has && had) {
        setTracing((t) => {
          const next = [...t];
          next[i] = false;
          return next;
        });
        setLit((t) => {
          const next = [...t];
          next[i] = false;
          return next;
        });
      }
    }

    newlyFilled.forEach((index, order) => {
      if (reduced) {
        setLit((t) => {
          const next = [...t];
          next[index] = true;
          return next;
        });
        return;
      }

      const delay = newlyFilled.length > 1 ? order * STAGGER_MS : 0;
      const startId = setTimeout(() => {
        setTracing((t) => {
          const next = [...t];
          next[index] = true;
          return next;
        });
        setLit((t) => {
          const next = [...t];
          next[index] = false;
          return next;
        });

        const endId = setTimeout(() => {
          setTracing((t) => {
            const next = [...t];
            next[index] = false;
            return next;
          });
          setLit((t) => {
            const next = [...t];
            next[index] = true;
            return next;
          });
        }, TRACE_MS);
        timers.current.push(endId);
      }, delay);
      timers.current.push(startId);
    });
  }, [value]);

  const stacked = phase !== "input";
  const merged = phase === "loading" || phase === "success" || phase === "error";

  // Measure once on enter to stacking — cells still at rest in the flex row.
  useLayoutEffect(() => {
    if (phase === "input") {
      setConverged(null);
      return;
    }
    if (phase !== "stacking") return;

    const wrap = boxesWrap.current;
    if (!wrap) return;

    const wrapRect = wrap.getBoundingClientRect();
    const cx = wrapRect.left + wrapRect.width / 2;
    const cy = wrapRect.top + wrapRect.height / 2;

    const next = cellEls.current.map((el, index) => {
      if (!el) return { x: 0, y: 0, ...DECK[index] };
      const r = el.getBoundingClientRect();
      const cellCx = r.left + r.width / 2;
      const cellCy = r.top + r.height / 2;
      return {
        x: cx - cellCx + DECK[index].x,
        y: cy - cellCy + DECK[index].y,
        rotate: DECK[index].rotate,
        scale: DECK[index].scale,
      };
    });
    setConverged(next);
  }, [phase]);

  const digits = value.padEnd(LENGTH, " ").slice(0, LENGTH).split("");

  function commit(next, focusIndex) {
    onChange(next.replace(/\D/g, "").slice(0, LENGTH));
    if (focusIndex !== undefined && phase === "input") {
      boxes.current[Math.max(0, Math.min(focusIndex, LENGTH - 1))]?.focus();
    }
  }

  function onBoxChange(index, raw) {
    const typed = raw.replace(/\D/g, "");
    if (!typed) return;

    const chars = value.split("");
    typed.split("").forEach((char, offset) => {
      if (index + offset < LENGTH) chars[index + offset] = char;
    });
    commit(chars.join(""), index + typed.length);
  }

  function onKeyDown(index, event) {
    if (event.key === "Backspace") {
      event.preventDefault();
      const chars = value.padEnd(LENGTH, " ").split("");
      if (chars[index] !== " ") {
        chars[index] = " ";
        commit(chars.join("").replace(/ /g, ""), index);
      } else if (index > 0) {
        chars[index - 1] = " ";
        commit(chars.join("").replace(/ /g, ""), index - 1);
      }
      return;
    }
    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      boxes.current[index - 1]?.focus();
    }
    if (event.key === "ArrowRight" && index < LENGTH - 1) {
      event.preventDefault();
      boxes.current[index + 1]?.focus();
    }
  }

  function onPaste(event) {
    const text = event.clipboardData.getData("text").replace(/\D/g, "");
    if (!text) return;
    event.preventDefault();
    commit(text.slice(0, LENGTH), text.length);
  }

  const tileTone =
    phase === "success" ? "is-success" : phase === "error" ? "is-error" : "";

  return (
    <div className={`pin-field ${stacked ? "is-stacked" : ""}`}>
      <span id="pin-label">{label}</span>
      <div
        ref={boxesWrap}
        className={`pin-boxes ${stacked ? "is-stacking" : ""}`}
        role="group"
        aria-labelledby="pin-label"
        aria-busy={stacked || undefined}
      >
        {digits.map((digit, index) => {
          const filled = Boolean(digit.trim());
          const cellClass = [
            "pin-cell",
            tracing[index] ? "is-tracing" : "",
            lit[index] && filled ? "is-filled" : "",
            stacked ? "is-in-stack" : "",
            merged ? "is-merged" : "",
          ]
            .filter(Boolean)
            .join(" ");

          const pose = converged?.[index];

          return (
            <motion.div
              key={index}
              ref={(el) => {
                cellEls.current[index] = el;
              }}
              className={cellClass}
              initial={false}
              animate={
                stacked && pose
                  ? {
                      x: pose.x,
                      y: pose.y,
                      rotate: pose.rotate,
                      scale: merged ? pose.scale * 0.88 : pose.scale,
                      opacity: merged ? 0 : 1,
                      zIndex: index + 1,
                    }
                  : { x: 0, y: 0, rotate: 0, scale: 1, opacity: 1, zIndex: 1 }
              }
              transition={{
                type: "spring",
                stiffness: 420,
                damping: 32,
                delay: stacked ? index * 0.035 : (LENGTH - 1 - index) * 0.025,
                opacity: { duration: 0.18, delay: merged ? 0.12 : 0 },
              }}
            >
              <svg className="pin-cell-neon" viewBox="0 0 100 64" aria-hidden="true">
                <defs>
                  <linearGradient
                    id={`pin-neon-${index}`}
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="100%"
                  >
                    <stop offset="0%" stopColor="var(--accent)" />
                    <stop offset="50%" stopColor="var(--glow-c)" />
                    <stop offset="100%" stopColor="var(--accent-2)" />
                  </linearGradient>
                </defs>
                <rect
                  className="pin-cell-neon-path"
                  x="2"
                  y="2"
                  width="96"
                  height="60"
                  rx="12"
                  ry="12"
                  pathLength="100"
                  stroke={`url(#pin-neon-${index})`}
                />
              </svg>
              <input
                ref={(el) => {
                  boxes.current[index] = el;
                }}
                className="pin-box"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                aria-label={`Цифра ${index + 1} из ${LENGTH}`}
                maxLength={1}
                disabled={disabled || stacked}
                value={digit.trim()}
                onChange={(e) => onBoxChange(index, e.target.value)}
                onKeyDown={(e) => onKeyDown(index, e)}
                onPaste={onPaste}
                onFocus={(e) => e.target.select()}
                tabIndex={stacked ? -1 : undefined}
              />
            </motion.div>
          );
        })}

        <AnimatePresence>
          {merged && (
            <motion.div
              key="stack-tile"
              className={`pin-stack-tile ${tileTone}`}
              initial={{ opacity: 0, scale: 0.78 }}
              animate={{
                opacity: 1,
                scale: 1,
                x: phase === "error" ? [0, -7, 7, -5, 5, 0] : 0,
              }}
              exit={{ opacity: 0, scale: 0.82 }}
              transition={{
                type: "spring",
                stiffness: 400,
                damping: 28,
                x: { duration: 0.4 },
              }}
              aria-hidden="true"
            >
              <span className="pin-stack-tile-glow" />
              <AnimatePresence mode="wait">
                {phase === "loading" && (
                  <motion.span
                    key="loader"
                    className="pin-spinner"
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    transition={{ duration: 0.18 }}
                  />
                )}
                {(phase === "success" || phase === "error") && (
                  <motion.span
                    key={phase}
                    className="pin-stack-icon-wrap"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.7 }}
                    transition={{ type: "spring", stiffness: 440, damping: 24 }}
                  >
                    {phase === "success" ? (
                      <svg viewBox="0 0 24 24" className="pin-status-icon">
                        <path
                          d="M5 12.5l4.5 4.5L19 7.5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" className="pin-status-icon">
                        <path
                          d="M7 7l10 10M17 7L7 17"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.6"
                          strokeLinecap="round"
                        />
                      </svg>
                    )}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
});

export default PinInput;
