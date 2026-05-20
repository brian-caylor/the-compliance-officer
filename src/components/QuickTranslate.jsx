import { useRef, useState, useEffect } from "react";
import { apiReview, checkClientRateLimit } from "../lib/api.js";
import { TONES, DEFAULT_TONE } from "../lib/tones.js";
import { addEntry } from "../lib/hallOfShame.js";
import { emit, on, EVENTS } from "../lib/bus.js";
import Assessment from "./Assessment.jsx";

const PLACEHOLDER =
  "e.g., This deadline is ridiculous and whoever set it has clearly never written a line of code.";

export default function QuickTranslate({ isActive }) {
  const editorRef = useRef(null);
  const [hasText, setHasText] = useState(false);
  const [charCount, setCharCount] = useState(0);
  const [tone, setTone] = useState(DEFAULT_TONE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!isActive) return;

    const handleCopyText = async (text) => {
      if (!text) return;
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        const ta = document.createElement("textarea");
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        try {
          document.execCommand("copy");
        } finally {
          document.body.removeChild(ta);
        }
      }
    };

    const unsubscribeClear = on(EVENTS.CLEAR_TEXT, (e) => {
      const scope = e.detail?.scope || "all";
      if (editorRef.current) {
        editorRef.current.innerText = "";
      }
      setHasText(false);
      setCharCount(0);
      if (scope === "all") {
        setResult(null);
        setError(null);
      }
    });

    const unsubscribeCopy = on(EVENTS.COPY_TEXT, () => {
      if (result && result.sanitized_translation) {
        handleCopyText(result.sanitized_translation);
      }
    });

    return () => {
      unsubscribeClear();
      unsubscribeCopy();
    };
  }, [isActive, result]);

  const getMessage = () =>
    (editorRef.current?.innerText || "").replace(/ /g, " ");

  const handleKeyDown = (e) => {
    const allowedKeys = [
      "Backspace", "Delete", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown",
      "Tab", "Escape", "Enter", "Home", "End", "PageUp", "PageDown"
    ];
    const isControlKey = e.ctrlKey || e.metaKey;
    const isSelectOrCopyKey = isControlKey && ["a", "c", "x", "v"].includes(e.key.toLowerCase());

    if (allowedKeys.includes(e.key) || isControlKey || isSelectOrCopyKey) {
      return;
    }

    const currentText = getMessage();
    if (currentText.length >= 2500) {
      const selection = window.getSelection();
      if (selection && selection.toString().length > 0) {
        return;
      }
      e.preventDefault();
    }
  };

  const handleInput = () => {
    let v = getMessage();
    if (v.length > 2500) {
      v = v.slice(0, 2500);
      if (editorRef.current) {
        editorRef.current.innerText = v;
      }
    }
    setCharCount(v.length);
    setHasText(v.trim().length > 0);
    emit(EVENTS.TYPING, { text: v });
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData("text/plain");
    const currentText = getMessage();
    const selection = window.getSelection();
    const selectionLength = selection ? selection.toString().length : 0;
    const availableSpace = 2500 - (currentText.length - selectionLength);
    
    if (availableSpace <= 0) {
      return;
    }
    
    const truncatedText = text.slice(0, availableSpace);

    if (document.queryCommandSupported?.("insertText")) {
      document.execCommand("insertText", false, truncatedText);
    } else {
      const sel = window.getSelection();
      if (sel && sel.rangeCount) {
        const range = sel.getRangeAt(0);
        range.deleteContents();
        range.insertNode(document.createTextNode(truncatedText));
        range.collapse(false);
      }
    }
    handleInput();
  };

  const runReview = async (overrideTone) => {
    const message = getMessage();
    if (!message.trim() || loading) return;

    const { allowed } = checkClientRateLimit();
    if (!allowed) {
      setError("WARNING: SUBMISSION OVERLOAD. You have submitted 5 or more requests within a 2-minute window. Please pause and allow the Compliance Officer to finish reading the existing printouts.");
      emit(EVENTS.PLAY_SOUND, { name: "chord" });
      return;
    }

    const effectiveTone = overrideTone ?? tone;
    setLoading(true);
    setError(null);
    emit(EVENTS.LOADING_START, { kind: "fresh" });
    try {
      const data = await apiReview({
        mode: "quick",
        message,
        tone: effectiveTone === DEFAULT_TONE ? undefined : effectiveTone,
      });
      setResult(data);
      addEntry({ mode: "quick", original: message, result: data, tone: effectiveTone });
      emit(EVENTS.SUBMISSION, {
        mode: "quick",
        original: message,
        tone: effectiveTone,
        result: data,
      });

      if (data.safety_override || data.danger_level >= 4) {
        emit(EVENTS.PLAY_SOUND, { name: "chord" });
      } else {
        emit(EVENTS.PLAY_SOUND, { name: "tada" });
      }
    } catch (err) {
      setError(err.message);
      emit(EVENTS.PLAY_SOUND, { name: "chord" });
    } finally {
      setLoading(false);
      emit(EVENTS.LOADING_END);
    }
  };

  return (
    <div className="co-form" role="group" aria-label="Quick Translate">
      <div className="field-row-stacked co-grow-row" style={{ width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <label htmlFor="co-quick-editor">
            Enter your unfiltered workplace thought for HR-approved translation:
          </label>
          <span style={{ fontSize: 11, color: charCount > 2500 ? "red" : "#555" }}>
            {charCount} / 2500
          </span>
        </div>
        <div
          id="co-quick-editor"
          ref={editorRef}
          className={`co-editable ${hasText ? "" : "is-empty"}`}
          contentEditable={!loading}
          suppressContentEditableWarning
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          data-placeholder={PLACEHOLDER}
          role="textbox"
          aria-multiline="true"
          aria-label="Workplace thought"
          spellCheck
        />
      </div>

      <div className="field-row" style={{ marginTop: 6, alignItems: "center", gap: 6 }}>
        <label htmlFor="co-quick-tone" style={{ fontSize: 13 }}>Target tone:</label>
        <select
          id="co-quick-tone"
          name="co-tone"
          value={tone}
          onChange={(e) => setTone(e.target.value)}
          disabled={loading}
        >
          {TONES.map((t) => (
            <option key={t.key} value={t.key}>{t.label}</option>
          ))}
        </select>
        <div style={{ flex: 1 }} />
        <button
          type="button"
          onClick={() => runReview()}
          disabled={loading || !hasText}
        >
          ▶ Submit for Review
        </button>
      </div>

      {error && (
        <fieldset style={{ marginTop: 8 }}>
          <legend>⚠ Error</legend>
          <p style={{ fontSize: 13, margin: 0 }}>{error}</p>
        </fieldset>
      )}

      {result && <Assessment {...result} />}
    </div>
  );
}
