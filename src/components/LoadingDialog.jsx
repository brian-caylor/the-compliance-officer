import { useEffect, useState } from "react";
import { on, EVENTS } from "../lib/bus.js";

const MESSAGES = [
  "Reviewing your submission. Please remain calm.",
  "Consulting the 1995 Employee Handbook…",
  "Cross-referencing the corporate watchlist…",
  "Pulling up your permanent record…",
  "Loading appropriate level of disappointment…",
];

const QUIPS_FOR_RETONE = [
  "Adjusting the tone. Sigh.",
  "Re-translating with renewed reluctance…",
  "Workshopping a softer version of your contempt…",
];

export default function LoadingDialog() {
  const [info, setInfo] = useState(null);

  useEffect(() => {
    const offStart = on(EVENTS.LOADING_START, (e) => {
      const kind = e.detail?.kind || "fresh";
      const pool = kind === "retone" ? QUIPS_FOR_RETONE : MESSAGES;
      setInfo({
        kind,
        message: pool[Math.floor(Math.random() * pool.length)],
      });
    });
    const offEnd = on(EVENTS.LOADING_END, () => setInfo(null));
    return () => {
      offStart();
      offEnd();
    };
  }, []);

  if (!info) return null;

  return (
    <div className="loading-backdrop" aria-live="polite">
      <div className="window loading-dialog">
        <div className="title-bar">
          <div className="title-bar-text">
            ⏳ Compliance Officer — Reviewing…
          </div>
        </div>
        <div className="window-body">
          <p style={{ fontSize: 13, margin: "4px 0 10px 0" }}>
            {info.message}
          </p>
          <div className="win95-progress" aria-hidden="true">
            <div className="win95-progress-seg" />
          </div>
          <p
            style={{
              fontSize: 13,
              margin: "10px 0 0 0",
              color: "#404040",
              fontStyle: "italic",
            }}
          >
            Estimated time remaining: a moment of your professional dignity.
          </p>
        </div>
      </div>
    </div>
  );
}
