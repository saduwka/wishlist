import { useEffect, useState } from "react";
import {
  createItem,
  deleteItem,
  fetchItems,
  formatPrice,
  parseKaspiLink,
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

  if (!authed) {
    return (
      <section className="page narrow">
        <h1>Админка</h1>
        <p className="lede">
          Введите админ-пароль.
        </p>
        <form className="panel" onSubmit={onLogin}>
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
        </form>
      </section>
    );
  }

  return (
    <section className="page">
      {parsing && (
        <div className="parse-overlay" role="status" aria-live="polite">
          <div className="parse-overlay-card">
            <div className="parse-spinner" aria-hidden="true" />
            <p className="parse-overlay-title">Подтягиваем данные из Kaspi…</p>
            <p className="parse-overlay-hint">Обычно занимает несколько секунд</p>
          </div>
        </div>
      )}

      <div className="admin-head">
        <h1>Управление подарками</h1>
        <button className="btn ghost" type="button" onClick={logout}>
          Выйти
        </button>
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

      <div className="admin-list">
        {items.map((item) => (
          <div key={item.id} className="admin-row">
            <div>
              <strong>{item.title}</strong>
              <div className="muted">
                {formatPrice(item.price) ? `${formatPrice(item.price)} · ` : ""}
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
          </div>
        ))}
      </div>
    </section>
  );
}
