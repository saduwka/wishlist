import { useCallback, useEffect, useState } from "react";
import { fetchItems, reserveItem, unreserveItem } from "../api.js";
import GiftCard from "../components/GiftCard.jsx";

const NAME_KEY = "wishlist_guest_name";

export default function HomePage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [name, setName] = useState(() => localStorage.getItem(NAME_KEY) || "");
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setError("");
    try {
      const data = await fetchItems();
      setItems(data.items || []);
    } catch (err) {
      setError(
        /Failed to fetch|Network|fetch|Invalid supabase/i.test(err.message)
          ? "Не удалось загрузить список. Проверьте интернет или настройки Supabase."
          : err.message
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    localStorage.setItem(NAME_KEY, name);
  }, [name]);

  async function onReserve(id) {
    if (name.trim().length < 2) {
      setError("Сначала укажите своё имя (минимум 2 символа)");
      return;
    }
    setBusyId(id);
    setError("");
    try {
      const data = await reserveItem(id, name.trim());
      setItems((prev) => prev.map((it) => (it.id === id ? data.item : it)));
    } catch (err) {
      setError(err.message);
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function onUnreserve(id) {
    if (name.trim().length < 2) {
      setError("Укажите то же имя, которым выбирали подарок");
      return;
    }
    setBusyId(id);
    setError("");
    try {
      const data = await unreserveItem(id, name.trim());
      setItems((prev) => prev.map((it) => (it.id === id ? data.item : it)));
    } catch (err) {
      setError(err.message);
      await load();
    } finally {
      setBusyId(null);
    }
  }

  const free = items.filter((i) => !i.reserved_by).length;

  return (
    <section className="page">
      <div className="hero">
        <h1>Подарки на новоселье</h1>
        <p>
          Выберите, что хотите подарить, и отметьте карточку своим именем — так
          другие гости не купят то же самое.
        </p>
        <label className="name-field">
          <span>Ваше имя</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Например, Айгуль"
            maxLength={80}
          />
        </label>
        {!loading && !error && (
          <p className="meta">
            Свободно: <strong>{free}</strong> из {items.length}
          </p>
        )}
      </div>

      {error && <div className="banner error">{error}</div>}
      {loading && <div className="banner">Загрузка…</div>}

      <div className="grid">
        {items.map((item) => (
          <GiftCard
            key={item.id}
            item={item}
            busy={busyId === item.id}
            onReserve={() => onReserve(item.id)}
            onUnreserve={() => onUnreserve(item.id)}
          />
        ))}
      </div>

      {!loading && items.length === 0 && !error && (
        <div className="banner">Список пока пуст — загляните позже.</div>
      )}
    </section>
  );
}
