import { emit, EVENTS } from "./bus.js";

const KEY = "co:hall-of-shame";
const MAX_ENTRIES = 50;

function safeRead() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function safeWrite(entries) {
  try {
    localStorage.setItem(KEY, JSON.stringify(entries));
  } catch {
    // out of space, ignore
  }
}

function snippet(text, n) {
  if (!text) return "";
  const clean = String(text).replace(/\s+/g, " ").trim();
  return clean.length <= n ? clean : clean.slice(0, n - 1) + "…";
}

export function getEntries() {
  return safeRead();
}

export function addEntry({ mode, original, result, tone }) {
  if (!result || result.safety_override) return;
  const level = Number(result.danger_level) || 0;
  if (level < 4) return; // not shameful enough

  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    ts: Date.now(),
    mode,
    tone: tone || null,
    danger_level: level,
    danger_label: result.danger_label || "",
    original_snippet: snippet(original, 100),
    officers_note: snippet(result.officers_note, 160),
  };

  const next = [entry, ...safeRead()].slice(0, MAX_ENTRIES);
  safeWrite(next);
  emit(EVENTS.HALL_UPDATED, { count: next.length });
}

export function removeEntry(id) {
  const next = safeRead().filter((e) => e.id !== id);
  safeWrite(next);
  emit(EVENTS.HALL_UPDATED, { count: next.length });
}

export function clearAll() {
  safeWrite([]);
  emit(EVENTS.HALL_UPDATED, { count: 0 });
}
