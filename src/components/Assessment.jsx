import { useState } from "react";
import { getDangerEntry } from "../lib/dangerScale.js";

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
      return true;
    } finally {
      document.body.removeChild(ta);
    }
  }
}

export default function Assessment({
  sanitized_translation,
  danger_level,
  danger_label,
  flagged_phrases,
  officers_note,
  safety_override,
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!sanitized_translation) return;
    const ok = await copyText(sanitized_translation);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (safety_override) {
    return (
      <div style={{ marginTop: 12 }}>
        <p style={{ fontSize: 13, margin: 0 }}>{sanitized_translation}</p>
      </div>
    );
  }

  const entry = getDangerEntry(danger_level);
  const colorClass = entry.colorClass;
  const litLevel = Math.max(1, Math.min(10, danger_level || 1));

  return (
    <div style={{ marginTop: 12 }}>
      {danger_level >= 4 && (
        <div className="warning-banner">
          COMPLIANCE REVIEW COMPLETE — INTERVENTION RECOMMENDED
        </div>
      )}

      {sanitized_translation && (
        <fieldset>
          <legend>Sanitized Translation</legend>
          <p style={{ fontSize: 13, margin: 0, whiteSpace: "pre-wrap" }}>
            {sanitized_translation}
          </p>
          <div className="field-row" style={{ marginTop: 8, gap: 6 }}>
            <button type="button" onClick={handleCopy}>
              {copied ? "✓ Copied" : "📋 Copy to Clipboard"}
            </button>
          </div>
        </fieldset>
      )}

      <fieldset style={{ marginTop: 8 }}>
        <legend>Assessment</legend>

        <div className="field-row" style={{ alignItems: "center" }}>
          <span style={{ fontSize: 13, marginRight: 6 }}>Danger Level:</span>
          <span className={colorClass} style={{ fontSize: 13 }}>
            {danger_level} — {danger_label || entry.label}
          </span>
        </div>

        <div className="field-row" style={{ alignItems: "center" }}>
          <span style={{ fontSize: 13, marginRight: 6 }}>Severity Meter:</span>
          <span className="danger-meter" aria-label={`Danger level ${litLevel} of 10`}>
            {Array.from({ length: 10 }, (_, i) => {
              const segLevel = i + 1;
              const lit = segLevel <= litLevel;
              return (
                <span
                  key={segLevel}
                  className={`segment ${lit ? `lit-${litLevel}` : "dim"}`}
                />
              );
            })}
          </span>
        </div>

        {Array.isArray(flagged_phrases) && flagged_phrases.length > 0 && (
          <div style={{ marginTop: 6 }}>
            <div style={{ fontSize: 13, marginBottom: 4 }}>Flagged Phrases:</div>
            <ul style={{ fontSize: 13, margin: "0 0 0 18px", padding: 0 }}>
              {flagged_phrases.map((fp, i) => (
                <li key={i} style={{ marginBottom: 2 }}>
                  <span className="flagged"><b>{fp.phrase}</b></span>
                  {" — "}
                  {fp.reason}
                </li>
              ))}
            </ul>
          </div>
        )}

        {officers_note && (
          <div style={{ marginTop: 8 }}>
            <div className="officers-note">
              <b>Officer's Note: </b>
              {officers_note}
            </div>
          </div>
        )}
      </fieldset>
    </div>
  );
}
