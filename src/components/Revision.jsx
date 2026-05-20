import { useState } from "react";
import { TONES, DEFAULT_TONE } from "../lib/tones.js";

function toneLabel(key) {
  return TONES.find((t) => t.key === key)?.label || "Custom";
}

export default function Revision({
  version,
  totalVersions,
  versionIndex,
  versions,
  onPrev,
  onNext,
  onSelect,
  onTryTone,
  busy = false,
  retoneError = null,
}) {
  const [copied, setCopied] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [pickedTone, setPickedTone] = useState(DEFAULT_TONE);

  if (!version) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(version.revision);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = version.revision;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } finally {
        document.body.removeChild(ta);
      }
    }
  };

  const applyTone = () => {
    if (onTryTone && pickedTone) {
      onTryTone(pickedTone);
      setShowPicker(false);
    }
  };

  const atFirst = versionIndex <= 0;
  const atLast = versionIndex >= totalVersions - 1;

  return (
    <fieldset style={{ marginTop: 8 }}>
      <legend>✉ Recommended Revision</legend>

      <div
        className="field-row field-row-responsive"
        style={{ alignItems: "center", gap: 6, marginBottom: 6 }}
      >
        <button type="button" onClick={onPrev} disabled={atFirst || busy}>
          ◀
        </button>
        <button type="button" onClick={onNext} disabled={atLast || busy}>
          ▶
        </button>
        <span style={{ fontSize: 13 }}>
          Version {versionIndex + 1} of {totalVersions} —{" "}
          <b>{toneLabel(version.tone)}</b>
        </span>
        {totalVersions > 1 && (
          <>
            <div className="spacer" style={{ flex: 1 }} />
            <label htmlFor="version-select" style={{ fontSize: 13 }}>
              Jump to:
            </label>
            <select
              id="version-select"
              value={versionIndex}
              onChange={(e) => onSelect(Number(e.target.value))}
              disabled={busy}
            >
              {versions.map((v, i) => (
                <option key={v.id} value={i}>
                  {i + 1}. {toneLabel(v.tone)}
                </option>
              ))}
            </select>
          </>
        )}
      </div>

      {version.subject && (
        <div className="field-row" style={{ alignItems: "center" }}>
          <span style={{ fontSize: 13, marginRight: 6 }}>Suggested Subject:</span>
          <span style={{ fontSize: 13 }}>{version.subject}</span>
        </div>
      )}

      <div className="email-body" style={{ marginTop: 6 }}>
        {version.revision}
      </div>

      {retoneError && !busy && (
        <p style={{ fontSize: 13, color: "#800000", margin: "6px 0 0 0" }}>
          ⚠ {retoneError}
        </p>
      )}

      <div className="field-row" style={{ marginTop: 8, gap: 6, flexWrap: "wrap" }}>
        <button type="button" onClick={handleCopy} disabled={busy}>
          {copied ? "✓ Copied" : "📋 Copy to Clipboard"}
        </button>
        <button
          type="button"
          onClick={() => setShowPicker((v) => !v)}
          disabled={busy || !onTryTone}
        >
          ↻ Try Different Tone
        </button>
        <button type="button" disabled>⚠ Send Anyway</button>
      </div>

      {showPicker && (
        <div
          className="tone-picker"
          style={{
            marginTop: 8,
            padding: 6,
            border: "1px solid #808080",
            background: "#c0c0c0",
            display: "flex",
            alignItems: "center",
            gap: 6,
            flexWrap: "wrap",
          }}
        >
          <label htmlFor="retone-select" style={{ fontSize: 13 }}>
            Re-translate as:
          </label>
          <select
            id="retone-select"
            value={pickedTone}
            onChange={(e) => setPickedTone(e.target.value)}
            disabled={busy}
          >
            {TONES.map((t) => (
              <option key={t.key} value={t.key}>{t.label}</option>
            ))}
          </select>
          <button type="button" onClick={applyTone} disabled={busy}>
            Apply
          </button>
          <button type="button" onClick={() => setShowPicker(false)} disabled={busy}>
            Cancel
          </button>
        </div>
      )}
    </fieldset>
  );
}
