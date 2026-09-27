import { AnimatePresence, motion, useDragControls } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import useMediaQuery, { TOUCH_QUERY } from "../hooks/useMediaQuery.js";
import { prefersReducedMotion } from "../lib/motion.js";
import PinInput from "./PinInput.jsx";

const PIN_HINT_RESERVE =
  "Для подтверждения вашего выбора и чтобы никто не снял ваш выбор, введите PIN из 4 цифр. Запомните его — он понадобится, если захотите снять бронь.";

const PIN_HINT_UNRESERVE =
  "Введите PIN, который вы задавали при выборе этого подарка.";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const TAP = { scale: 0.96 };
const STACK_MS = 520;
const SUCCESS_MS = 850;
const ERROR_MS = 650;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
  const cardRef = useRef(null);
  const seqRef = useRef(0);
  const isSheet = useMediaQuery(TOUCH_QUERY);
  const dragControls = useDragControls();
  const [pinPhase, setPinPhase] = useState("input");

  const isReserve = mode === "reserve";
  const isNameStep = isReserve && step === "name";
  const animating = pinPhase !== "input";
  const locked = busy || animating;

  useEffect(() => {
    if (!open) {
      setPinPhase("input");
      seqRef.current += 1;
    }
  }, [open]);

  useEffect(() => {
    setPinPhase("input");
    seqRef.current += 1;
  }, [step, mode]);

  useEffect(() => {
    if (!open) return undefined;

    const onKey = (e) => {
      if (e.key === "Escape") {
        if (!locked) onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const nodes = cardRef.current?.querySelectorAll(FOCUSABLE);
      if (!nodes?.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, locked]);

  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  // Delayed so focus lands after the step transition has swapped the field in.
  // The sheet needs longer, otherwise the keyboard fights the slide-up.
  useEffect(() => {
    if (!open || animating) return undefined;
    const timer = setTimeout(() => inputRef.current?.focus(), isSheet ? 420 : 260);
    return () => clearTimeout(timer);
  }, [open, step, mode, isSheet, animating]);

  async function onSubmit(e) {
    e.preventDefault();
    if (locked) return;

    if (isNameStep) {
      onNext();
      return;
    }

    if (!/^\d{4}$/.test(pin.trim())) {
      await onConfirm();
      return;
    }

    const seq = ++seqRef.current;
    const reduced = prefersReducedMotion();

    setPinPhase("stacking");
    if (!reduced) await sleep(STACK_MS);
    if (seq !== seqRef.current) return;

    setPinPhase("loading");
    const result = await onConfirm();
    if (seq !== seqRef.current) return;

    if (result?.ok) {
      setPinPhase("success");
      await sleep(reduced ? 120 : SUCCESS_MS);
      if (seq !== seqRef.current) return;
      onClose({ force: true });
      return;
    }

    setPinPhase("error");
    await sleep(reduced ? 80 : ERROR_MS);
    if (seq !== seqRef.current) return;
    setPinPhase("input");
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="modal-overlay"
          role="presentation"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !locked) onClose();
          }}
        >
          <motion.div
            ref={cardRef}
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reserve-modal-title"
            initial={
              isSheet
                ? { y: "100%" }
                : { opacity: 0, y: 28, scale: 0.94 }
            }
            animate={isSheet ? { y: 0 } : { opacity: 1, y: 0, scale: 1 }}
            exit={
              isSheet ? { y: "100%" } : { opacity: 0, y: 16, scale: 0.96 }
            }
            transition={{ type: "spring", stiffness: 420, damping: 36 }}
            drag={isSheet && !locked ? "y" : false}
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => {
              if (locked) return;
              if (info.offset.y > 120 || info.velocity.y > 500) onClose();
            }}
          >
            <div
              className="sheet-grip"
              aria-hidden="true"
              onPointerDown={(e) => isSheet && !locked && dragControls.start(e)}
            >
              <span className="sheet-handle" />
            </div>
            <h2 id="reserve-modal-title">
              {isReserve
                ? isNameStep
                  ? "Введите своё имя"
                  : "Придумайте PIN"
                : "Снять выбор?"}
            </h2>
            <p className="modal-text">
              {isNameStep
                ? `Чтобы отметить подарок: ${itemTitle}`
                : isReserve
                  ? PIN_HINT_RESERVE
                  : PIN_HINT_UNRESERVE}
            </p>
            <form onSubmit={onSubmit}>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={isNameStep ? "name" : "pin"}
                  initial={{ opacity: 0, x: isNameStep ? -16 : 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: isNameStep ? 16 : -16 }}
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                >
                  {isNameStep ? (
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
                        disabled={locked}
                      />
                    </label>
                  ) : (
                    <PinInput
                      ref={inputRef}
                      label="PIN (4 цифры)"
                      value={pin}
                      onChange={onPinChange}
                      disabled={locked}
                      phase={pinPhase}
                    />
                  )}
                </motion.div>
              </AnimatePresence>

              <AnimatePresence>
                {error && pinPhase === "input" && (
                  <motion.div
                    className="banner error modal-banner"
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.22 }}
                  >
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              <div
                className="row modal-actions"
                hidden={animating && !isNameStep}
                aria-hidden={animating && !isNameStep ? true : undefined}
              >
                {isReserve && step === "pin" && (
                  <motion.button
                    className="btn ghost"
                    type="button"
                    disabled={locked}
                    onClick={onBack}
                    whileTap={TAP}
                  >
                    Назад
                  </motion.button>
                )}
                <motion.button
                  className="btn primary"
                  type="submit"
                  disabled={locked}
                  whileTap={TAP}
                >
                  {busy
                    ? "…"
                    : isReserve
                      ? isNameStep
                        ? "Далее"
                        : "Выбрать"
                      : "Снять выбор"}
                </motion.button>
                <motion.button
                  className="btn ghost"
                  type="button"
                  disabled={locked}
                  onClick={() => onClose()}
                  whileTap={TAP}
                >
                  Отмена
                </motion.button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
