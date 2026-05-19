import { useRef, useState } from "react";
import { apiReview } from "../lib/api.js";
import { TONES, DEFAULT_TONE } from "../lib/tones.js";
import { addEntry } from "../lib/hallOfShame.js";
import { emit, EVENTS } from "../lib/bus.js";
import Assessment from "./Assessment.jsx";

const PLACEHOLDER =
  "e.g., This deadline is ridiculous and whoever set it has clearly never written a line of code.";

export default function QuickTranslate() {
  const editorRef = useRef(null);
  const [hasText, setHasText] = useState(false);
  const [tone, setTone] = useState(DEFAULT_TONE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const getMessage = () =>
    (editorRef.current?.innerText || "").replace(/ /g, " ");

  const handleInput = () => {
    const v = getMessage();
    setHasText(v.trim().length > 0);
    emit(EVENTS.TYPING, { text: v });
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData("text/plain");
    if (document.queryCommandSupported?.("insertText")) {
      document.execCommand("insertText", false, text);
    } else {
      const sel = window.getSelection();
      if (sel && sel.rangeCount) {
        const range = sel.getRangeAt(0);
        range.deleteContents();
        range.insertNode(document.createTextNode(text));
        range.collapse(false);
      }
    }
    handleInput();
  };

  const runReview = async (overrideTone) => {
    const message = getMessage();
    if (!message.trim() || loading) return;
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
      emit(EVENTS.SUBMISSION, { mode: "quick", result: data });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      emit(EVENTS.LOADING_END);
    }
  };

  return (
    <div className="co-form" role="group" aria-label="Quick Translate">
      <div className="field-row-stacked co-grow-row" style={{ width: "100%" }}>
        <label htmlFor="co-quick-editor">
          Enter your unfiltered workplace thought for HR-approved translation:
        </label>
        <div
          id="co-quick-editor"
          ref={editorRef}
          className={`co-editable ${hasText ? "" : "is-empty"}`}
          contentEditable={!loading}
          suppressContentEditableWarning
          onInput={handleInput}
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
