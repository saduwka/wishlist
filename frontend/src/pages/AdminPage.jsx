import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import {
  createItem,
  deleteItem,
  fetchItems,
  formatPrice,
  parseKaspiLink,
  refreshAllPrices,
  updateItem,
  verifyAdmin,
} from "../api.js";

const TOKEN_KEY = "wishlist_admin_token";

const emptyForm = {
  title: "",
  kaspi_url: "",
  image_url: "",
  notes: "",
  priority: 5,
  price: "",
};

export default function AdminPage() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || "");
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    const data = await fetchItems();
    setItems(data.items || []);
  }

  useEffect(() => {
    if (!token) return;
    verifyAdmin(token)
      .then(async () => {
        setAuthed(true);
        await load();
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        setToken("");
        setAuthed(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onLogin(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await verifyAdmin(password);
      localStorage.setItem(TOKEN_KEY, password);
      setToken(password);
      setAuthed(true);
      setPassword("");
      await load();
      setMessage("Вход выполнен");
    } catch (err) {
      setError(err.message);
      setAuthed(false);
    } finally {
      setBusy(false);
    }
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    setToken("");
    setAuthed(false);
    setItems([]);
  }

  function startEdit(item) {
    setEditingId(item.id);
    setForm({
      title: item.title,
      kaspi_url: item.kaspi_url,
      image_url: item.image_url || "",
      notes: item.notes || "",
      priority: Number(item.priority) || 5,
      price: item.price ?? "",
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    setBusy(true);
    try {
      if (editingId) {
        await updateItem(token, editingId, form);
        setMessage("Подарок обновлён");
      } else {
        await createItem(token, form);
        setMessage("Подарок добавлен");
      }
      resetForm();
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id) {
    if (!confirm("Удалить этот подарок?")) return;
    setBusy(true);
    setError("");
    try {
      await deleteItem(token, id);
      if (editingId === id) resetForm();
      await load();
      setMessage("Удалено");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function onParseKaspi() {
    setError("");
    setMessage("");
    if (!form.kaspi_url.trim()) {
      setError("Сначала вставь ссылку Kaspi");
      return;
    }
    if (!token) {
      setError("Сначала войдите в админку");
      return;
    }
    setParsing(true);
    try {
      await verifyAdmin(token);
      const parsed = await parseKaspiLink(token, form.kaspi_url.trim());
      setForm((prev) => ({
        ...prev,
        title: parsed.title || prev.title,
        image_url: parsed.image_url || prev.image_url,
        kaspi_url: parsed.kaspi_url || prev.kaspi_url,
        price: parsed.price ?? prev.price,
      }));
      if (!parsed.title && !parsed.image_url) {
        setError("Не удалось распознать, заполни вручную");
      } else {
        setMessage("Данные подтянуты из Kaspi — проверь и сохрани");
      }
    } catch (err) {
      setError(
        err.message || "Не удалось распознать, заполни поля вручную"
      );
    } finally {
      setParsing(false);
    }
  }

  async function onRefreshAllPrices() {
    setError("");
    setMessage("");
    if (
      !confirm(
        "Обновить цены всех подарков из Kaspi? Это может занять минуту."
      )
    ) {
      return;
    }
    setRefreshing(true);
    try {
      await verifyAdmin(token);
      const result = await refreshAllPrices(token);
      const errCount = result.errors?.length || 0;
      setMessage(
        `Цены обновлены: ${result.updated ?? 0} из ${result.total ?? 0}` +
          (errCount ? `, пропущено: ${errCount}` : "")
      );
      if (errCount) {
        console.warn("Price refresh errors:", result.errors);
      }
      await load();
    } catch (err) {
      setError(err.message || "Не удалось обновить цены");
    } finally {
      setRefreshing(false);
    }
  }

  if (!authed) {
    return (
      <section className="page narrow">
        <p className="hero-eyebrow">Только для своих</p>
        <h1>Админка</h1>
        <p className="lede">Введите админ-пароль.</p>
        <motion.form
          className="panel"
          onSubmit={onLogin}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <label>
            Пароль
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          {error && <div className="banner error">{error}</div>}
          <button className="btn primary" type="submit" disabled={busy}>
            Войти
          </button>
        </motion.form>
      </section>
    );
  }

  return (
    <section className="page">
      <AnimatePresence>
        {(parsing || refreshing) && (
          <motion.div
            className="parse-overlay"
            role="status"
            aria-live="polite"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              className="parse-overlay-card"
              initial={{ opacity: 0, y: 20, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 420, damping: 32 }}
            >
              <div className="parse-spinner" aria-hidden="true" />
              <p className="parse-overlay-title">
                {refreshing
                  ? "Обновляем цены из Kaspi…"
                  : "Подтягиваем данные из Kaspi…"}
              </p>
              <p className="parse-overlay-hint">
                Обычно занимает несколько секунд
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="admin-head">
        <h1>Управление подарками</h1>
        <div className="row">
          <button
            className="btn secondary"
            type="button"
            disabled={busy || parsing || refreshing}
            onClick={onRefreshAllPrices}
          >
            {refreshing ? "…" : "Обновить цены"}
          </button>
          <button className="btn ghost" type="button" onClick={logout}>
            Выйти
          </button>
        </div>
      </div>

      {error && <div className="banner error">{error}</div>}
      {message && <div className="banner ok">{message}</div>}

      <form className="panel" onSubmit={onSubmit}>
        <h2>{editingId ? "Редактировать" : "Добавить подарок"}</h2>
        <label>
          Название
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />
        </label>
        <label>
          Ссылка Kaspi
          <div className="kaspi-row">
            <input
              value={form.kaspi_url}
              onChange={(e) => setForm({ ...form, kaspi_url: e.target.value })}
              placeholder="https://kaspi.kz/shop/... или https://l.kaspi.kz/shop/..."
              required
            />
            <button
              className="btn secondary"
              type="button"
              disabled={busy || parsing || !form.kaspi_url.trim()}
              onClick={onParseKaspi}
            >
              {parsing ? "…" : "Подтянуть"}
            </button>
          </div>
        </label>
        <label>
          URL картинки
          <input
            value={form.image_url}
            onChange={(e) => setForm({ ...form, image_url: e.target.value })}
            placeholder="https://..."
          />
        </label>
        <label>
          Цена, ₸
          <input
            type="number"
            min="1"
            step="1"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            placeholder="52970"
          />
        </label>
        <label>
          Заметка
          <input
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Цвет, размер…"
          />
        </label>
        <label>
          Важность (1–10)
          <select
            value={form.priority}
            onChange={(e) =>
              setForm({ ...form, priority: Number(e.target.value) })
            }
          >
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <div className="row">
          <button className="btn primary" type="submit" disabled={busy}>
            {editingId ? "Сохранить" : "Добавить"}
          </button>
          {editingId && (
            <button className="btn ghost" type="button" onClick={resetForm}>
              Отмена
            </button>
          )}
        </div>
      </form>

      <motion.div className="admin-list" layout>
        <AnimatePresence initial={false}>
          {items.map((item) => {
            const priceLabel = formatPrice(item.price);
            return (
              <motion.div
                key={item.id}
                className={`admin-row ${editingId === item.id ? "editing" : ""}`}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ type: "spring", stiffness: 380, damping: 34 }}
              >
                <div>
                  <strong>{item.title}</strong>
                  <div className="muted">
                    {priceLabel ? `${priceLabel} · ` : ""}
                    Важность: {item.priority ?? 5}
                    {" · "}
                    {item.reserved_by
                      ? `Выбрал(а): ${item.reserved_by}`
                      : "Свободен"}
                  </div>
                </div>
                <div className="row">
                  <button
                    className="btn ghost"
                    type="button"
                    onClick={() => startEdit(item)}
                  >
                    Изменить
                  </button>
                  <button
                    className="btn secondary"
                    type="button"
                    onClick={() => onDelete(item.id)}
                  >
                    Удалить
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>
    </section>
  );
}
