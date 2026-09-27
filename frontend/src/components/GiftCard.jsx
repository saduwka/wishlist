import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useCallback, useMemo, useRef } from "react";
import { formatPrice } from "../api.js";
import { tapFeedback } from "../lib/haptics.js";
import { isCoarsePointer, prefersReducedMotion } from "../lib/motion.js";
import PriorityMeter from "./PriorityMeter.jsx";

const MAX_TILT = 7;
const TAP = { scale: 0.96 };
const WHATSAPP_PHONE = "77078481563";
const TELEGRAM_USER = "SaduNurzhan";

function isContactFallback(kaspiUrl) {
  return String(kaspiUrl || "").trim() === "-";
}

function contactMessage(title) {
  return `Здравствуйте! По поводу подарка: «${title}»`;
}

function whatsappHref(title) {
  return `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(contactMessage(title))}`;
}

function telegramHref(title) {
  return `https://t.me/${TELEGRAM_USER}?text=${encodeURIComponent(contactMessage(title))}`;
}

function WhatsAppIcon() {
  return (
    <svg className="contact-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M17.47 14.38c-.28-.14-1.65-.81-1.9-.9-.26-.1-.44-.14-.63.14-.19.28-.72.9-.89 1.08-.16.19-.33.21-.61.07-.28-.14-1.17-.43-2.23-1.37-.82-.73-1.38-1.64-1.54-1.92-.16-.28-.02-.43.12-.57.13-.13.28-.33.42-.5.14-.16.19-.28.28-.47.1-.19.05-.35-.02-.5-.07-.14-.63-1.51-.86-2.07-.23-.55-.46-.47-.63-.48h-.54c-.19 0-.5.07-.76.35-.26.28-1 1-1 2.43s1.02 2.82 1.17 3.01c.14.19 2 3.05 4.85 4.28.68.29 1.2.47 1.61.6.68.21 1.3.18 1.79.11.55-.08 1.65-.67 1.88-1.33.23-.65.23-1.21.16-1.33-.07-.11-.26-.18-.54-.32zM12.05 21.8h-.01a9.78 9.78 0 0 1-4.97-1.36l-.36-.21-3.7.97 1-3.61-.24-.37a9.77 9.77 0 0 1-1.5-5.2 9.8 9.8 0 0 1 9.8-9.79c2.62 0 5.08 1.02 6.93 2.87a9.74 9.74 0 0 1 2.87 6.93 9.8 9.8 0 0 1-9.82 9.77zm8.3-17.96A11.56 11.56 0 0 0 12.04 0C5.45 0 .1 5.35.1 11.93c0 2.1.55 4.15 1.6 5.96L0 24l6.28-1.65a11.93 11.93 0 0 0 5.75 1.47h.01c6.58 0 11.93-5.35 11.93-11.93 0-3.19-1.24-6.18-3.5-8.44z"
      />
    </svg>
  );
}

function TelegramIcon() {
  return (
    <svg className="contact-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M11.94 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0h-.06zm4.95 7.2c.15 0 .3.05.42.14.1.08.16.2.16.33 0 .05 0 .1-.02.15l-1.72 8.1c-.12.56-.46.7-.93.43l-2.58-1.9-1.24 1.2c-.14.14-.26.26-.53.26l.19-2.67 4.86-4.39c.21-.19-.05-.3-.33-.11l-6 3.78-2.59-.81c-.56-.18-.57-.56.12-.83l10.12-3.9c.23-.1.46-.14.67-.14z"
      />
    </svg>
  );
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
  const useContactFallback = isContactFallback(item.kaspi_url);
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
            {useContactFallback ? (
              <>
                <motion.a
                  className="btn ghost contact-btn contact-btn-whatsapp"
                  href={whatsappHref(item.title)}
                  target="_blank"
                  rel="noreferrer"
                  whileTap={TAP}
                >
                  <WhatsAppIcon />
                  WhatsApp
                </motion.a>
                <motion.a
                  className="btn ghost contact-btn contact-btn-telegram"
                  href={telegramHref(item.title)}
                  target="_blank"
                  rel="noreferrer"
                  whileTap={TAP}
                >
                  <TelegramIcon />
                  Telegram
                </motion.a>
              </>
            ) : (
              <motion.a
                className="btn ghost"
                href={item.kaspi_url}
                target="_blank"
                rel="noreferrer"
                whileTap={TAP}
              >
                Открыть в Kaspi
              </motion.a>
            )}
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
