// Android only — iOS Safari has no navigator.vibrate, so these are no-ops there.
function buzz(pattern) {
  if (typeof navigator === "undefined" || !navigator.vibrate) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    // some browsers reject vibration outside a user gesture
  }
}

export function tapFeedback() {
  buzz(10);
}

export function successFeedback() {
  buzz([14, 40, 26]);
}

export function errorFeedback() {
  buzz([32, 60, 32]);
}
