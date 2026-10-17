// Lets hero animations wait until the intro has handed over to the page.
let running = false;
const listeners = new Set<() => void>();

export const isIntroRunning = () => running;

export function setIntroRunning(value: boolean) {
  running = value;
  if (!value) {
    listeners.forEach(fn => fn());
    listeners.clear();
  }
}

/** Calls `fn` once the intro is done (immediately if no intro is playing). Returns an unsubscribe. */
export function whenIntroDone(fn: () => void) {
  if (!running) {
    fn();
    return () => {};
  }
  listeners.add(fn);
  return () => listeners.delete(fn);
}
