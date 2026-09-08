import { AnimatePresence, motion } from "framer-motion";

const ICONS = {
  ok: "✨",
  error: "⚠️",
  info: "💬",
};

export default function ToastStack({ toasts, onDismiss }) {
  return (
    <div className="toast-stack" role="status" aria-live="polite">
      <AnimatePresence initial={false}>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            className={`toast ${toast.tone}`}
            layout
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
          >
            <span className="toast-icon" aria-hidden="true">
              {ICONS[toast.tone] || ICONS.info}
            </span>
            <span>{toast.text}</span>
            <button
              className="toast-close"
              type="button"
              onClick={() => onDismiss(toast.id)}
              aria-label="Закрыть уведомление"
            >
              ×
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
