const TOTAL = 10;

const LABELS = {
  9: "очень нужно",
  7: "нужно",
  5: "хотелось бы",
  1: "по желанию",
};

function labelFor(priority) {
  const key = Object.keys(LABELS)
    .map(Number)
    .sort((a, b) => b - a)
    .find((threshold) => priority >= threshold);
  return LABELS[key] || LABELS[1];
}

export default function PriorityMeter({ priority }) {
  const value = Math.min(TOTAL, Math.max(1, Number(priority) || 5));

  return (
    <div
      className="priority-meter"
      title={`Важность: ${value} из ${TOTAL}`}
      aria-label={`Важность ${value} из ${TOTAL}: ${labelFor(value)}`}
    >
      <span className="priority-dots" aria-hidden="true">
        {Array.from({ length: TOTAL }, (_, i) => (
          <span
            key={i}
            className={`priority-dot ${i < value ? "on" : ""}`}
            style={{ height: `${8 + i}px` }}
          />
        ))}
      </span>
      <span>{labelFor(value)}</span>
    </div>
  );
}
