const TARGET = typeof window !== "undefined" ? window : null;

export function emit(name, detail) {
  if (!TARGET) return;
  TARGET.dispatchEvent(new CustomEvent(name, { detail }));
}

export function on(name, handler) {
  if (!TARGET) return () => {};
  TARGET.addEventListener(name, handler);
  return () => TARGET.removeEventListener(name, handler);
}

export const EVENTS = {
  SUBMISSION: "co:submission",
  HALL_UPDATED: "co:hall-updated",
  TYPING: "co:typing",
  LOADING_START: "co:loading-start",
  LOADING_END: "co:loading-end",
  SHOW_TUTORIAL: "co:show-tutorial",
};
