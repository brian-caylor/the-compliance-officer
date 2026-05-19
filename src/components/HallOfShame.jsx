import { useEffect, useState } from "react";
import { getEntries, removeEntry, clearAll } from "../lib/hallOfShame.js";
import { getDangerEntry } from "../lib/dangerScale.js";
import { TONES } from "../lib/tones.js";
import { on, EVENTS } from "../lib/bus.js";

function toneLabel(key) {
  const t = TONES.find((x) => x.key === key);
  return t ? t.label : "—";
}

function formatTimestamp(ts) {
  const d = new Date(ts);
  const date = d.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "2-digit" });
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${date} ${time}`;
}

export default function HallOfShame() {
  const [entries, setEntries] = useState(() => getEntries());

  useEffect(() => {
    const refresh = () => setEntries(getEntries());
    const off = on(EVENTS.HALL_UPDATED, refresh);
    return off;
  }, []);

  const handleClear = () => {
    if (entries.length === 0) return;
    if (confirm(`Permanently expunge all ${entries.length} record(s) from the Hall of Shame?\n\n(This action cannot be undone. We have a strict no-shredder policy.)`)) {
      clearAll();
    }
  };

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 6,
        }}
      >
        <div style={{ fontSize: 13 }}>
          <b>Permanent Record:</b> {entries.length} flagged submission
          {entries.length === 1 ? "" : "s"} (level 4+).
        </div>
        <button type="button" onClick={handleClear} disabled={entries.length === 0}>
          🗑 Expunge All
        </button>
      </div>

      {entries.length === 0 ? (
        <fieldset>
          <legend>Records</legend>
          <p style={{ fontSize: 13, margin: 0 }}>
            No incidents on file. Suspicious. We will keep watching.
          </p>
        </fieldset>
      ) : (
        <div className="shame-list">
          {entries.map((e) => {
            const entry = getDangerEntry(e.danger_level);
            return (
              <fieldset key={e.id} className="shame-row">
                <legend className={entry.colorClass}>
                  Level {e.danger_level} — {e.danger_label || entry.label}
                </legend>
                <div className="shame-meta">
                  <span>{formatTimestamp(e.ts)}</span>
                  <span>·</span>
                  <span>{e.mode === "email" ? "Email Review" : "Quick Translate"}</span>
                  {e.tone && e.tone !== "hr_approved" && (
                    <>
                      <span>·</span>
                      <span>Tone: {toneLabel(e.tone)}</span>
                    </>
                  )}
                  <div style={{ flex: 1 }} />
                  <button type="button" onClick={() => removeEntry(e.id)}>
                    ✕ Remove
                  </button>
                </div>
                <div className="shame-original">
                  <b>Original:</b> {e.original_snippet}
                </div>
                {e.officers_note && (
                  <div className="officers-note" style={{ marginTop: 6 }}>
                    <b>Officer's Note: </b>{e.officers_note}
                  </div>
                )}
              </fieldset>
            );
          })}
        </div>
      )}
    </div>
  );
}
