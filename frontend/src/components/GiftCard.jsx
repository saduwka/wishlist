import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useCallback, useMemo, useRef } from "react";
import { formatPrice } from "../api.js";
import { tapFeedback } from "../lib/haptics.js";
import { isCoarsePointer, prefersReducedMotion } from "../lib/motion.js";
import PriorityMeter from "./PriorityMeter.jsx";

const MAX_TILT = 7;
const TAP = { scale: 0.96 };
const WHATSAPP_PHONE = "77078481563";

function isWhatsAppFallback(kaspiUrl) {
  return String(kaspiUrl || "").trim() === "-";
}

function whatsappHref(title) {
  const text = `Здравствуйте! По поводу подарка: «${title}»`;
  return `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(text)}`;
}

export default function GiftCard({
  item,
  busy,
  canUnreserve,
  onReserve,
  onUnreserve,
}) {
  const taken = Boolean(item.reserved_by);
  const priority = Number(item.priority) || 5;
  const priceLabel = formatPrice(item.price);
  const useWhatsApp = isWhatsAppFallback(item.kaspi_url);
  const cardRef = useRef(null);

  const interactive = useMemo(
    () => !isCoarsePointer() && !prefersReducedMotion(),
    []
  );

  const pointerX = useMotionValue(0.5);
  const pointerY = useMotionValue(0.5);
  const springConfig = { stiffness: 220, damping: 22, mass: 0.6 };
  const rotateX = useSpring(
    useTransform(pointerY, [0, 1], [MAX_TILT, -MAX_TILT]),
    springConfig
  );
  const rotateY = useSpring(
    useTransform(pointerX, [0, 1], [-MAX_TILT, MAX_TILT]),
    springConfig
  );

  const onPointerMove = useCallback(
    (event) => {
      if (!interactive) return;
      const node = cardRef.current;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      pointerX.set(x);
      pointerY.set(y);
      node.style.setProperty("--mx", `${x * 100}%`);
      node.style.setProperty("--my", `${y * 100}%`);
    },
    [interactive, pointerX, pointerY]
  );

  const onPointerLeave = useCallback(() => {
    pointerX.set(0.5);
    pointerY.set(0.5);
  }, [pointerX, pointerY]);

  return (
    <motion.div
      className="card-tilt"
      layout
      initial={{ opacity: 0, y: 24, scale: 0.97 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-40px" }}
      exit={{ opacity: 0, y: -12, scale: 0.97 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      style={
        interactive
          ? { rotateX, rotateY, transformPerspective: 900 }
          : undefined
      }
      whileHover={interactive ? { y: -6 } : undefined}
      onMouseMove={onPointerMove}
      onMouseLeave={onPointerLeave}
    >
      <article
        ref={cardRef}
        className={`card ${taken ? "taken" : ""} ${
          !taken && priority >= 9 ? "hot" : ""
        }`}
      >
        <div className="card-image">
          {item.image_url ? (
            <>
              <img
                className="card-image-bg"
                src={item.image_url}
                alt=""
                aria-hidden="true"
                loading="lazy"
              />
              <img
                className="card-image-main"
                src={item.image_url}
                alt={item.title}
                loading="lazy"
              />
            </>
          ) : (
            <div className="placeholder">Нет фото</div>
          )}
          <div className="card-badges">
            <span className={`badge ${taken ? "badge-taken" : "badge-free"}`}>
              {taken ? `Выбрал(а): ${item.reserved_by}` : "Свободен"}
            </span>
          </div>
        </div>
        <div className="card-body">
          <PriorityMeter priority={priority} />
          <h2>{item.title}</h2>
          <p className="card-price">{priceLabel || "\u00a0"}</p>
          {item.notes && <p className="notes">{item.notes}</p>}
          <div className="card-actions">
            <motion.a
              className="btn ghost"
              href={
                useWhatsApp ? whatsappHref(item.title) : item.kaspi_url
              }
              target="_blank"
              rel="noreferrer"
              whileTap={TAP}
            >
              {useWhatsApp ? "Написать в WhatsApp" : "Открыть в Kaspi"}
            </motion.a>
            {taken ? (
              canUnreserve ? (
                <motion.button
                  className="btn secondary"
                  type="button"
                  disabled={busy}
                  onClick={onUnreserve}
                  onTapStart={tapFeedback}
                  whileTap={TAP}
                >
                  {busy ? "…" : "Снять выбор"}
                </motion.button>
              ) : null
            ) : (
              <motion.button
                className="btn primary"
                type="button"
                disabled={busy}
                onClick={onReserve}
                onTapStart={tapFeedback}
                whileTap={TAP}
              >
                {busy ? "…" : "Выбрать"}
              </motion.button>
            )}
          </div>
        </div>
      </article>
    </motion.div>
  );
}
