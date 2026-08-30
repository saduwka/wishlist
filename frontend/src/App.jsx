import { Link, Route, Routes } from "react-router-dom";
import AdminPage from "./pages/AdminPage.jsx";
import HomePage from "./pages/HomePage.jsx";

export default function App() {
  return (
    <div className="app">
      <header className="topbar">
        <Link to="/" className="brand">
          <span className="brand-mark">🏡</span>
          <span>
            Wishlist
            <small>новоселье</small>
          </span>
        </Link>
        <Link to="/admin" className="nav-link">
          Админка
        </Link>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </main>
      <footer className="footer">Выберите подарок и отметьте его своим именем</footer>
    </div>
  );
}
