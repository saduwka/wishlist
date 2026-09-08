import { motion } from "framer-motion";

export default function ThemeToggle({ theme, onToggle }) {
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={onToggle}
      role="switch"
      aria-checked={!isDark}
      aria-label={isDark ? "Включить светлую тему" : "Включить тёмную тему"}
      title={isDark ? "Светлая тема" : "Тёмная тема"}
    >
      <motion.span
        className="theme-toggle-thumb"
        animate={{ x: isDark ? 0 : "1.56rem", rotate: isDark ? 0 : 360 }}
        transition={{ type: "spring", stiffness: 480, damping: 30 }}
        aria-hidden="true"
      >
        {isDark ? "🌙" : "☀️"}
      </motion.span>
    </button>
  );
}
