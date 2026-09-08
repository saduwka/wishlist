import { forwardRef, useImperativeHandle, useRef } from "react";

const LENGTH = 4;

const PinInput = forwardRef(function PinInput(
  { value, onChange, label, disabled },
  ref
) {
  const boxes = useRef([]);

  useImperativeHandle(ref, () => ({
    focus: () => boxes.current[Math.min(value.length, LENGTH - 1)]?.focus(),
  }));

  const digits = value.padEnd(LENGTH, " ").slice(0, LENGTH).split("");

  function commit(next, focusIndex) {
    onChange(next.replace(/\D/g, "").slice(0, LENGTH));
    if (focusIndex !== undefined) {
      boxes.current[Math.max(0, Math.min(focusIndex, LENGTH - 1))]?.focus();
    }
  }

  function onBoxChange(index, raw) {
    const typed = raw.replace(/\D/g, "");
    if (!typed) return;

    // Typing over a filled box replaces it; pasting fills forward.
    const chars = value.split("");
    typed.split("").forEach((char, offset) => {
      if (index + offset < LENGTH) chars[index + offset] = char;
    });
    commit(chars.join(""), index + typed.length);
  }

  function onKeyDown(index, event) {
    if (event.key === "Backspace") {
      event.preventDefault();
      const chars = value.padEnd(LENGTH, " ").split("");
      if (chars[index] !== " ") {
        chars[index] = " ";
        commit(chars.join("").replace(/ /g, ""), index);
      } else if (index > 0) {
        chars[index - 1] = " ";
        commit(chars.join("").replace(/ /g, ""), index - 1);
      }
      return;
    }
    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      boxes.current[index - 1]?.focus();
    }
    if (event.key === "ArrowRight" && index < LENGTH - 1) {
      event.preventDefault();
      boxes.current[index + 1]?.focus();
    }
  }

  function onPaste(event) {
    const text = event.clipboardData.getData("text").replace(/\D/g, "");
    if (!text) return;
    event.preventDefault();
    commit(text.slice(0, LENGTH), text.length);
  }

  return (
    <div className="pin-field">
      <span id="pin-label">{label}</span>
      <div className="pin-boxes" role="group" aria-labelledby="pin-label">
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(el) => {
              boxes.current[index] = el;
            }}
            className="pin-box"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            aria-label={`Цифра ${index + 1} из ${LENGTH}`}
            maxLength={1}
            disabled={disabled}
            value={digit.trim()}
            onChange={(e) => onBoxChange(index, e.target.value)}
            onKeyDown={(e) => onKeyDown(index, e)}
            onPaste={onPaste}
            onFocus={(e) => e.target.select()}
          />
        ))}
      </div>
    </div>
  );
});

export default PinInput;
