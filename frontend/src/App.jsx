import { AnimatePresence, motion } from "framer-motion";
import { Link, Route, Routes, useLocation } from "react-router-dom";
import AuroraBackground from "./components/AuroraBackground.jsx";
import ThemeToggle from "./components/ThemeToggle.jsx";
import useTheme from "./hooks/useTheme.js";
import AdminPage from "./pages/AdminPage.jsx";
import HomePage from "./pages/HomePage.jsx";

const pageTransition = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
};

export default function App() {
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();

  return (
    <div className="app">
      <AuroraBackground />
      <header className="topbar">
        <Link to="/" className="brand">
          <span className="brand-mark">🏡</span>
          <span>
            Wishlist
            <small>новоселье</small>
          </span>
        </Link>
        <div className="topbar-actions">
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </div>
      </header>
      <main>
        <AnimatePresence mode="wait">
          <motion.div key={location.pathname} {...pageTransition}>
            <Routes location={location}>
              <Route path="/" element={<HomePage />} />
              <Route path="/admin" element={<AdminPage />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </main>
      <footer className="footer">Выберите подарок и отметьте его своим именем</footer>
    </div>
  );
}
