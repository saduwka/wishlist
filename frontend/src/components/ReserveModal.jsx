import { useEffect, useRef } from "react";

const PIN_HINT_RESERVE =
  "Для подтверждения вашего выбора и чтобы никто не снял ваш выбор, введите PIN из 4 цифр. Запомните его — он понадобится, если захотите снять бронь.";

const PIN_HINT_UNRESERVE =
  "Введите PIN, который вы задавали при выборе этого подарка.";

export default function ReserveModal({
  open,
  mode,
  step,
  itemTitle,
  name,
  pin,
  busy,
  error,
  onNameChange,
  onPinChange,
  onNext,
  onBack,
  onConfirm,
  onClose,
}) {
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
  }, [open, step, mode]);

  if (!open) return null;

  const isReserve = mode === "reserve";

  function onSubmit(e) {
    e.preventDefault();
    if (isReserve && step === "name") {
      onNext();
      return;
    }
    onConfirm();
  }

  function handlePinInput(value, setter) {
    setter(value.replace(/\D/g, "").slice(0, 4));
  }

  return (
    <div
      className="modal-overlay"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reserve-modal-title"
      >
        <h2 id="reserve-modal-title">
          {isReserve
            ? step === "name"
              ? "Введите своё имя"
              : "Придумайте PIN"
            : "Снять выбор?"}
        </h2>
        <p className="modal-text">
          {isReserve && step === "name"
            ? `Чтобы отметить подарок: ${itemTitle}`
            : isReserve
              ? PIN_HINT_RESERVE
              : PIN_HINT_UNRESERVE}
        </p>
        <form onSubmit={onSubmit}>
          {isReserve && step === "name" ? (
            <label>
              Ваше имя
              <input
                ref={inputRef}
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
                placeholder="Например, Иван"
                maxLength={80}
                required
                autoComplete="name"
              />
            </label>
          ) : (
            <label>
              PIN (4 цифры)
              <input
                ref={inputRef}
                className="pin-input"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={pin}
                onChange={(e) => handlePinInput(e.target.value, onPinChange)}
                placeholder="••••"
                maxLength={4}
                pattern="\d{4}"
                required
              />
            </label>
          )}
          {error && <div className="banner error">{error}</div>}
          <div className="row modal-actions">
            {isReserve && step === "pin" && (
              <button
                className="btn ghost"
                type="button"
                disabled={busy}
                onClick={onBack}
              >
                Назад
              </button>
            )}
            <button className="btn primary" type="submit" disabled={busy}>
              {busy
                ? "…"
                : isReserve
                  ? step === "name"
                    ? "Далее"
                    : "Выбрать"
                  : "Снять выбор"}
            </button>
            <button
              className="btn ghost"
              type="button"
              disabled={busy}
              onClick={onClose}
            >
              Отмена
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
