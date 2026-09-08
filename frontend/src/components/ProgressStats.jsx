import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import { useEffect } from "react";

export default function ProgressStats({ taken, total }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (value) => Math.round(value));
  const ratio = total > 0 ? taken / total : 0;

  useEffect(() => {
    const controls = animate(count, taken, {
      duration: 0.9,
      ease: [0.22, 1, 0.36, 1],
    });
    return () => controls.stop();
  }, [count, taken]);

  return (
    <motion.div
      className="progress"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="progress-head">
        <p className="progress-count">
          <motion.span>{rounded}</motion.span>
          <small> из {total} уже выбрали</small>
        </p>
        <span className="progress-label">
          {total - taken > 0 ? `свободно ${total - taken}` : "всё разобрали"}
        </span>
      </div>
      <div
        className="progress-track"
        role="progressbar"
        aria-valuenow={taken}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label="Сколько подарков уже выбрали"
      >
        <motion.div
          className="progress-fill"
          initial={{ width: 0 }}
          animate={{ width: `${ratio * 100}%` }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </motion.div>
  );
}
