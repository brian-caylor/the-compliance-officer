import { useEffect, useRef, useState } from "react";
import { on, emit, EVENTS } from "../lib/bus.js";
import {
  INTRO_HINTS,
  IDLE_HINTS,
  KEYWORD_HINTS,
  HIGH_DANGER_HINTS,
} from "../lib/officerHints.js";

const IDLE_INTERVAL_MS = 90_000;
const COOLDOWN_AFTER_DISMISS_MS = 30_000;
const KEYWORD_DEBOUNCE_MS = 1200;
const KEYWORD_COOLDOWN_MS = 15_000;
const NARROW_VIEWPORT_PX = 820;

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export default function Clip() {
  const [message, setMessage] = useState(null);
  const [hidden, setHidden] = useState(false);
  const [narrow, setNarrow] = useState(
    typeof window !== "undefined" && window.innerWidth < NARROW_VIEWPORT_PX
  );

  const dismissedUntilRef = useRef(0);
  const lastKeywordAtRef = useRef(0);
  const lastFiredKeywordRef = useRef(null);
  const typingTimerRef = useRef(null);

  useEffect(() => {
    const onResize = () => setNarrow(window.innerWidth < NARROW_VIEWPORT_PX);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const canShow = () => Date.now() >= dismissedUntilRef.current;

  const showMessage = (text) => {
    if (!canShow()) return;
    setMessage(text);
    setHidden(false);
    emit(EVENTS.PLAY_SOUND, { name: "ding" });
  };

  // intro after a short delay
  useEffect(() => {
    const t = setTimeout(() => showMessage(pick(INTRO_HINTS)), 2000);
    return () => clearTimeout(t);
  }, []);

  // periodic idle hints
  useEffect(() => {
    const interval = setInterval(() => {
      if (!canShow() || message) return;
      showMessage(pick(IDLE_HINTS));
    }, IDLE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [message]);

  // react to submissions
  useEffect(() => {
    const off = on(EVENTS.SUBMISSION, (e) => {
      const r = e.detail?.result;
      if (!r || r.safety_override) return;
      const level = Number(r.danger_level) || 0;
      if (level >= 7 && level < 10) {
        showMessage(pick(HIGH_DANGER_HINTS));
      }
    });
    return off;
  }, []);

  // react to typing (debounced)
  useEffect(() => {
    const off = on(EVENTS.TYPING, (e) => {
      const text = e.detail?.text || "";
      if (text.length < 8) return;
      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => {
        const now = Date.now();
        if (now - lastKeywordAtRef.current < KEYWORD_COOLDOWN_MS) return;
        for (const k of KEYWORD_HINTS) {
          if (k.test.test(text) && lastFiredKeywordRef.current !== k.message) {
            lastKeywordAtRef.current = now;
            lastFiredKeywordRef.current = k.message;
            showMessage(k.message);
            break;
          }
        }
      }, KEYWORD_DEBOUNCE_MS);
    });
    return () => {
      off();
      clearTimeout(typingTimerRef.current);
    };
  }, []);

  const handleDismiss = () => {
    setMessage(null);
    dismissedUntilRef.current = Date.now() + COOLDOWN_AFTER_DISMISS_MS;
  };

  const handleHideClip = () => {
    setHidden(true);
    setMessage(null);
    dismissedUntilRef.current = Date.now() + 5 * 60_000;
  };

  if (hidden || narrow) return null;

  return (
    <div className="clip-wrap" aria-live="polite">
      {message && (
        <div className="clip-bubble">
          <button
            type="button"
            className="clip-close"
            aria-label="Dismiss"
            onClick={handleDismiss}
          >
            ×
          </button>
          <div className="clip-bubble-text">{message}</div>
        </div>
      )}
      <button
        type="button"
        className="clip-character"
        onClick={() => (message ? handleDismiss() : showMessage(pick(IDLE_HINTS)))}
        onContextMenu={(e) => {
          e.preventDefault();
          handleHideClip();
        }}
        title="Clip — Your Compliance Companion (right-click to hide for 5 min)"
        aria-label="Clip the Compliance Companion"
      >
        <span className="clip-glyph" aria-hidden="true">📎</span>
      </button>
    </div>
  );
}
