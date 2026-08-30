import { useEffect, useRef } from "react";

export default function ReserveModal({
  open,
  mode,
  itemTitle,
  name,
  busy,
  error,
  onNameChange,
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
    if (open && mode === "reserve") {
      inputRef.current?.focus();
    }
  }, [open, mode]);

  if (!open) return null;

  const isReserve = mode === "reserve";

  function onSubmit(e) {
    e.preventDefault();
    onConfirm();
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
          {isReserve ? "Введите своё имя" : "Снять выбор?"}
        </h2>
        <p className="modal-text">
          {isReserve
            ? `Чтобы отметить подарок: ${itemTitle}`
            : `Подтвердите, что снимаете выбор с «${itemTitle}»`}
        </p>
        <form onSubmit={onSubmit}>
          {isReserve ? (
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
            <p className="modal-name-preview">Имя: {name}</p>
          )}
          {error && <div className="banner error">{error}</div>}
          <div className="row modal-actions">
            <button className="btn primary" type="submit" disabled={busy}>
              {busy ? "…" : isReserve ? "Выбрать" : "Снять выбор"}
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
