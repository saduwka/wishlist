import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchItems, reserveItem, unreserveItem } from "../api.js";
import GiftCard from "../components/GiftCard.jsx";
import GiftCardSkeleton from "../components/GiftCardSkeleton.jsx";
import ProgressStats from "../components/ProgressStats.jsx";
import ReserveModal from "../components/ReserveModal.jsx";
import ToastStack from "../components/ToastStack.jsx";
import useToasts from "../hooks/useToasts.js";
import { celebrate } from "../lib/confetti.js";
import { errorFeedback, successFeedback } from "../lib/haptics.js";

const NAME_KEY = "wishlist_guest_name";
const MY_ITEMS_KEY = "wishlist_my_items";

const FILTERS = [
  { id: "all", label: "Все" },
  { id: "free", label: "Свободные" },
  { id: "taken", label: "Занятые" },
];

function readMyItems() {
  try {
    const raw = localStorage.getItem(MY_ITEMS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map(Number).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function saveMyItems(ids) {
  localStorage.setItem(MY_ITEMS_KEY, JSON.stringify(ids));
}

export default function HomePage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [myItemIds, setMyItemIds] = useState(() => readMyItems());
  const [busyId, setBusyId] = useState(null);
  const [filter, setFilter] = useState("all");
  const [modal, setModal] = useState(null);
  const [modalStep, setModalStep] = useState("name");
  const [modalName, setModalName] = useState("");
  const [modalPin, setModalPin] = useState("");
  const [modalError, setModalError] = useState("");
  const { toasts, pushToast, dismissToast } = useToasts();

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
    return item.reserved_by && myItemIds.includes(Number(item.id));
  }

  function openReserveModal(item) {
    setModalError("");
    setModalStep("name");
    setModalPin("");
    setModalName(localStorage.getItem(NAME_KEY) || "");
    setModal({ mode: "reserve", itemId: item.id, itemTitle: item.title });
  }

  function openUnreserveModal(item) {
    setModalError("");
    setModalStep("pin");
    setModalPin("");
    setModal({ mode: "unreserve", itemId: item.id, itemTitle: item.title });
  }

  function closeModal() {
    if (busyId) return;
    setModal(null);
    setModalError("");
    setModalPin("");
    setModalStep("name");
  }

  function onModalNext() {
    const name = modalName.trim();
    if (name.length < 2) {
      setModalError("Укажите имя (минимум 2 символа)");
      return;
    }
    setModalError("");
    setModalStep("pin");
  }

  function onModalBack() {
    setModalError("");
    setModalPin("");
    setModalStep("name");
  }

  async function onModalConfirm() {
    if (!modal) return;

    if (modal.mode === "reserve" && modalStep === "name") {
      onModalNext();
      return;
    }

    const pin = modalPin.trim();
    if (!/^\d{4}$/.test(pin)) {
      setModalError("PIN должен состоять из 4 цифр");
      return;
    }

    setBusyId(modal.itemId);
    setModalError("");
    try {
      if (modal.mode === "reserve") {
        const name = modalName.trim();
        const data = await reserveItem(modal.itemId, name, pin);
        setItems((prev) =>
          prev.map((it) => (it.id === modal.itemId ? data.item : it))
        );
        localStorage.setItem(NAME_KEY, name);
        const nextIds = [...new Set([...myItemIds, Number(modal.itemId)])];
        setMyItemIds(nextIds);
        saveMyItems(nextIds);
        celebrate();
        successFeedback();
        pushToast("Подарок ваш! Не забудьте PIN — он нужен, чтобы снять выбор.", "ok");
      } else {
        const data = await unreserveItem(modal.itemId, pin);
        setItems((prev) =>
          prev.map((it) => (it.id === modal.itemId ? data.item : it))
        );
        const nextIds = myItemIds.filter((id) => id !== Number(modal.itemId));
        setMyItemIds(nextIds);
        saveMyItems(nextIds);
        pushToast("Выбор снят — подарок снова свободен", "info");
      }
      setModal(null);
      setModalPin("");
      setModalStep("name");
    } catch (err) {
      setModalError(err.message);
      errorFeedback();
      await load();
    } finally {
      setBusyId(null);
    }
  }

  const takenCount = items.filter((i) => i.reserved_by).length;
  const freeCount = items.length - takenCount;

  const visibleItems = useMemo(() => {
    if (filter === "free") return items.filter((i) => !i.reserved_by);
    if (filter === "taken") return items.filter((i) => i.reserved_by);
    return items;
  }, [items, filter]);

  const counts = {
    all: items.length,
    free: freeCount,
    taken: takenCount,
  };

  const modalItem = modal ? items.find((it) => it.id === modal.itemId) : null;

  return (
    <section className="page">
      <div className="hero">
        <p className="hero-eyebrow">Список подарков</p>
        <h1>Наше новоселье!</h1>
        <p>
          Мы очень рады, что вы будете с нами в этот день. Если хотите порадовать
          нас подарком — ниже список вещей, которые нам действительно нужны в
          новом доме. Отметьте, что уже выбрали, чтобы никто не подарил то же
          самое 💚
        </p>
        <p className="important">Обратите внимание на важность подарка 😅</p>
        {!loading && !error && items.length > 0 && (
          <ProgressStats taken={takenCount} total={items.length} />
        )}
      </div>

      {error && <div className="banner error">{error}</div>}

      {!loading && !error && items.length > 0 && (
        <div className="filters" role="tablist" aria-label="Фильтр подарков">
          {FILTERS.map((f) => (
            <motion.button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={filter === f.id}
              className={`chip ${filter === f.id ? "active" : ""}`}
              onClick={() => setFilter(f.id)}
              whileTap={{ scale: 0.96 }}
            >
              {filter === f.id && (
                <motion.span
                  className="chip-glow"
                  layoutId="chip-glow"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
              <span className="chip-label">
                {f.label}
                <span className="chip-count">{counts[f.id]}</span>
              </span>
            </motion.button>
          ))}
        </div>
      )}

      {loading && (
        <div className="grid">
          {Array.from({ length: 6 }, (_, i) => (
            <GiftCardSkeleton key={i} />
          ))}
        </div>
      )}

      {!loading && (
        <motion.div className="grid" layout>
          <AnimatePresence mode="popLayout">
            {visibleItems.map((item) => (
              <GiftCard
                key={item.id}
                item={item}
                busy={busyId === item.id}
                canUnreserve={canUnreserve(item)}
                onReserve={() => openReserveModal(item)}
                onUnreserve={() => openUnreserveModal(item)}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="empty-state">
          <span className="empty-state-mark">🎁</span>
          <strong>Список пока пуст</strong>
          <span>Загляните чуть позже — мы ещё собираем идеи.</span>
        </div>
      )}

      {!loading && !error && items.length > 0 && visibleItems.length === 0 && (
        <div className="empty-state">
          <span className="empty-state-mark">🔍</span>
          <strong>Здесь пока пусто</strong>
          <span>В этой категории подарков нет — попробуйте другой фильтр.</span>
        </div>
      )}

      <ReserveModal
        open={Boolean(modal && modalItem)}
        mode={modal?.mode || "reserve"}
        step={modalStep}
        itemTitle={modal?.itemTitle || ""}
        name={modalName}
        pin={modalPin}
        busy={Boolean(busyId)}
        error={modalError}
        onNameChange={setModalName}
        onPinChange={setModalPin}
        onNext={onModalNext}
        onBack={onModalBack}
        onConfirm={onModalConfirm}
        onClose={closeModal}
      />

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </section>
  );
}
