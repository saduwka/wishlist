import { useCallback, useEffect, useState } from "react";
import { fetchItems, reserveItem, unreserveItem } from "../api.js";
import GiftCard from "../components/GiftCard.jsx";
import ReserveModal from "../components/ReserveModal.jsx";

const NAME_KEY = "wishlist_guest_name";

export default function HomePage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savedName, setSavedName] = useState(
    () => localStorage.getItem(NAME_KEY) || ""
  );
  const [busyId, setBusyId] = useState(null);
  const [modal, setModal] = useState(null);
  const [modalName, setModalName] = useState("");
  const [modalError, setModalError] = useState("");

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

  function canUnreserve(item) {
    if (!item.reserved_by || !savedName.trim()) return false;
    return (
      savedName.trim().toLowerCase() === item.reserved_by.trim().toLowerCase()
    );
  }

  function openReserveModal(item) {
    setModalError("");
    setModalName(savedName);
    setModal({ mode: "reserve", itemId: item.id, itemTitle: item.title });
  }

  function openUnreserveModal(item) {
    setModalError("");
    setModalName(savedName);
    setModal({ mode: "unreserve", itemId: item.id, itemTitle: item.title });
  }

  function closeModal() {
    if (busyId) return;
    setModal(null);
    setModalError("");
  }

  async function onModalConfirm() {
    if (!modal) return;
    const name = modalName.trim();
    if (name.length < 2) {
      setModalError("Укажите имя (минимум 2 символа)");
      return;
    }

    setBusyId(modal.itemId);
    setModalError("");
    try {
      if (modal.mode === "reserve") {
        const data = await reserveItem(modal.itemId, name);
        setItems((prev) =>
          prev.map((it) => (it.id === modal.itemId ? data.item : it))
        );
      } else {
        const data = await unreserveItem(modal.itemId, name);
        setItems((prev) =>
          prev.map((it) => (it.id === modal.itemId ? data.item : it))
        );
      }
      localStorage.setItem(NAME_KEY, name);
      setSavedName(name);
      setModal(null);
    } catch (err) {
      setModalError(err.message);
      await load();
    } finally {
      setBusyId(null);
    }
  }

  const free = items.filter((i) => !i.reserved_by).length;
  const modalItem = modal
    ? items.find((it) => it.id === modal.itemId)
    : null;

  return (
    <section className="page">
      <div className="hero">
        <h1>Подарки на новоселье</h1>
        <p>
          Выберите, что хотите подарить, и отметьте карточку своим именем — так
          другие гости не купят то же самое.
        </p>
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
            canUnreserve={canUnreserve(item)}
            onReserve={() => openReserveModal(item)}
            onUnreserve={() => openUnreserveModal(item)}
          />
        ))}
      </div>

      {!loading && items.length === 0 && !error && (
        <div className="banner">Список пока пуст — загляните позже.</div>
      )}

      <ReserveModal
        open={Boolean(modal && modalItem)}
        mode={modal?.mode || "reserve"}
        itemTitle={modal?.itemTitle || ""}
        name={modalName}
        busy={Boolean(busyId)}
        error={modalError}
        onNameChange={setModalName}
        onConfirm={onModalConfirm}
        onClose={closeModal}
      />
    </section>
  );
}
