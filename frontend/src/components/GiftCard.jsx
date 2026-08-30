export default function GiftCard({ item, busy, onReserve, onUnreserve }) {
  const taken = Boolean(item.reserved_by);

  return (
    <article className={`card ${taken ? "taken" : ""}`}>
      <div className="card-image">
        {item.image_url ? (
          <img src={item.image_url} alt={item.title} loading="lazy" />
        ) : (
          <div className="placeholder">Нет фото</div>
        )}
        <span className={`badge ${taken ? "badge-taken" : "badge-free"}`}>
          {taken ? `Выбрал(а): ${item.reserved_by}` : "Свободен"}
        </span>
      </div>
      <div className="card-body">
        <h2>{item.title}</h2>
        {item.notes && <p className="notes">{item.notes}</p>}
        <div className="card-actions">
          <a
            className="btn ghost"
            href={item.kaspi_url}
            target="_blank"
            rel="noreferrer"
          >
            Открыть в Kaspi
          </a>
          {taken ? (
            <button
              className="btn secondary"
              type="button"
              disabled={busy}
              onClick={onUnreserve}
            >
              {busy ? "…" : "Снять выбор"}
            </button>
          ) : (
            <button
              className="btn primary"
              type="button"
              disabled={busy}
              onClick={onReserve}
            >
              {busy ? "…" : "Выбрать"}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
