import { useState, useEffect, useRef } from "react";

export default function PrintPreviewDialog({ reportData, onClose }) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [isCentered, setIsCentered] = useState(true);
  const dragStateRef = useRef(null);

  // Center the window on mount
  useEffect(() => {
    const w = 550;
    const h = 480;
    const x = Math.max(10, Math.floor((window.innerWidth - w) / 2));
    const y = Math.max(10, Math.floor((window.innerHeight - h) / 2));
    setPos({ x, y });
    setIsCentered(false);
  }, []);

  const startDrag = (e) => {
    if (e.target.closest(".title-bar-controls")) return;
    if (e.button !== 0) return;
    e.preventDefault();
    dragStateRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: pos.x,
      origY: pos.y,
    };
    document.addEventListener("mousemove", onDragMove);
    document.addEventListener("mouseup", endDrag);
  };

  const onDragMove = (e) => {
    const s = dragStateRef.current;
    if (!s) return;
    setPos({
      x: s.origX + (e.clientX - s.startX),
      y: s.origY + (e.clientY - s.startY),
    });
  };

  const endDrag = () => {
    dragStateRef.current = null;
    document.removeEventListener("mousemove", onDragMove);
    document.removeEventListener("mouseup", endDrag);
  };

  useEffect(() => {
    return () => {
      document.removeEventListener("mousemove", onDragMove);
      document.removeEventListener("mouseup", endDrag);
    };
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const dateStr = new Date().toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });

  const modeName = reportData.mode === "quick" ? "QUICK TONE TRANSLATION" : "EMAIL COMPLIANCE REVIEW";
  const toneLabel = reportData.tone ? reportData.tone.toUpperCase() : "DEFAULT PROFESSIONAL";
  const result = reportData.result || {};
  const danger = result.danger_level ?? 1;
  const dangerLabel = result.danger_label ?? "LOW";
  const note = result.officers_note ?? "Buffer clear. No intervention required.";
  const translation = result.sanitized_translation ?? "";

  const flaggedPhrases = Array.isArray(result.flagged_phrases) ? result.flagged_phrases : [];

  return (
    <div className="modal-window-backdrop" style={{ zIndex: 9600 }}>
      <div
        className="window modal-window"
        style={{
          left: pos.x,
          top: pos.y,
          width: 550,
          opacity: isCentered ? 0 : 1,
          visibility: isCentered ? "hidden" : "visible",
          transition: "opacity 0.05s ease-out",
        }}
      >
        <div
          className="title-bar"
          onMouseDown={startDrag}
          style={{ cursor: "move", userSelect: "none" }}
        >
          <div className="title-bar-text">APERTURE-LPT1 Print Spooler - Preview</div>
          <div className="title-bar-controls">
            <button aria-label="Close" onClick={onClose}></button>
          </div>
        </div>

        <div className="window-body" style={{ margin: 12, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, fontWeight: "bold" }}>Spooler Status: Ready (1 document in queue)</span>
            <span style={{ fontSize: 11, color: "#404040" }}>LPT1: (Continuous Form)</span>
          </div>

          <div className="tractor-paper-container">
            <div className="tractor-paper">
              <div className="tractor-paper-header">
                <div style={{ fontWeight: "bold", fontSize: 14 }}>THE COMPLIANCE OFFICER v3.11</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>OFFICIAL HR CLEARANCE CERTIFICATE</div>
                <div style={{ fontSize: 10, marginTop: 4 }}>========================================</div>
              </div>

              <div style={{ marginBottom: 12, fontSize: 11 }}>
                <div>DATE      : {dateStr}</div>
                <div>SYSTEM    : Claude Haiku 4.5 via Netlify</div>
                <div>DOCUMENT  : {modeName}</div>
                <div>TONE      : {toneLabel}</div>
                <div>DANGER    : LEVEL {danger} ({dangerLabel})</div>
                <div>STATUS    : SANITIZED & APPROVED</div>
              </div>

              <div className="tractor-paper-section">
                <div className="tractor-paper-section-title">[1] ORIGINAL RAW CONTEMPT</div>
                <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", padding: "4px 0" }}>
                  {reportData.original}
                </div>
              </div>

              <div className="tractor-paper-section">
                <div className="tractor-paper-section-title">[2] FLAGGED NON-COMPLIANT PHRASES</div>
                {flaggedPhrases.length > 0 ? (
                  <ul style={{ margin: "4px 0", paddingLeft: 20 }}>
                    {flaggedPhrases.map((fp, i) => (
                      <li key={i} style={{ marginBottom: 4 }}>
                        <strong>"{fp.phrase}"</strong>: {fp.reason}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div style={{ padding: "4px 0", fontStyle: "italic" }}>
                    No phrases flagged as offensive or non-compliant.
                  </div>
                )}
              </div>

              <div className="tractor-paper-section">
                <div className="tractor-paper-section-title">[3] APPROVED SANITIZED WORKPLACE TRANSLATION</div>
                <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", padding: "4px 0", fontWeight: "bold" }}>
                  {translation}
                </div>
              </div>

              <div className="tractor-paper-section">
                <div className="tractor-paper-section-title">[4] SPECIAL AUDIT NOTE</div>
                <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", padding: "4px 0" }}>
                  {note}
                </div>
              </div>

              <div className="tractor-paper-footer">
                <div>* WARNING: UNAUTHORIZED MODIFICATION OF THIS CLEARANCE *</div>
                <div>* RECORD IS STRICTLY PROHIBITED UNDER SECTION 9 OF *</div>
                <div>* THE APERTURE SCIENCE EMPLOYEE CONDUCT HANDBOOK. *</div>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
            <button type="button" onClick={handlePrint} style={{ minWidth: 100, fontWeight: "bold" }}>
              Print to System
            </button>
            <button type="button" onClick={onClose} style={{ minWidth: 80 }}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
