import { useState, useEffect, useRef } from "react";
import { emit, EVENTS } from "../lib/bus.js";

const PROGRESS_TICKS = [
  { p: 0, t: "Checking for high-density diskette in Drive A:..." },
  { p: 15, t: "Reading FAT12 sector tables..." },
  { p: 30, t: "Seeking cluster availability..." },
  { p: 45, t: "Writing directory entry (COMPLY.TXT)..." },
  { p: 65, t: "Writing sector cluster streams..." },
  { p: 85, t: "Verifying sector checksums..." },
  { p: 100, t: "Flashing storage buffer. Done!" },
];

function makeTextReport(data) {
  const dateStr = new Date().toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });

  const modeName = data.mode === "quick" ? "QUICK TONE TRANSLATION" : "EMAIL COMPLIANCE REVIEW";
  const toneLabel = data.tone ? data.tone.toUpperCase() : "DEFAULT PROFESSIONAL";
  const result = data.result;
  const danger = result.danger_level ?? 1;
  const dangerLabel = result.danger_label ?? "LOW";
  const note = result.officers_note ?? "Buffer clear. No intervention required.";
  const translation = result.sanitized_translation ?? "";

  const flagged = Array.isArray(result.flagged_phrases) && result.flagged_phrases.length > 0
    ? result.flagged_phrases.map((fp) => `  * "${fp.phrase}" - ${fp.reason}`).join("\n")
    : "  No phrases flagged as offensive or non-compliant.";

  return `======================================================================
*                   THE COMPLIANCE OFFICER v3.11                     *
*                 OFFICIAL HR CLEARANCE CERTIFICATE                  *
======================================================================
Generated on   : ${dateStr}
System Engine  : Claude Haiku 4.5 via Netlify Serverless Functions
Target Storage : 3.5" Floppy Diskette A:\\ (FAT12 Format)
Verification   : PASSED - SANITIZED & APPROVED
======================================================================

[1] SYSTEM BUFFER METADATA
--------------------------
Mode of Review : ${modeName}
Target Tone    : ${toneLabel}
Assessed Danger: Level ${danger} (${dangerLabel})

[2] ORIGINAL CONTENT (RAW CONTEMPT)
-----------------------------------
${data.original}

[3] FLAGGED NON-COMPLIANT SECTIONS
----------------------------------
${flagged}

[4] APPROVED SANITIZED WORKPLACE TRANSLATION
--------------------------------------------
${translation}

[5] SPECIAL AUDIT NOTE
----------------------
${note}

======================================================================
*   Warning: Unauthorized modification of this clearance record is   *
*   strictly prohibited under Section 9 of the corporate handbook.   *
======================================================================
`;
}

export default function FloppySaveDialog({ reportData, onClose }) {
  const [step, setStep] = useState("insert"); // "insert" | "writing" | "done"
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState("");
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [isCentered, setIsCentered] = useState(true);
  const dragStateRef = useRef(null);

  useEffect(() => {
    const w = 380;
    const h = 200;
    const x = Math.max(10, Math.floor((window.innerWidth - w) / 2));
    const y = Math.max(10, Math.floor((window.innerHeight - h) / 2));
    setPos({ x, y });
    setIsCentered(false);
  }, []);

  const handleWrite = () => {
    setStep("writing");
    setProgress(0);
    setProgressText(PROGRESS_TICKS[0].t);

    // Trigger floppy motor stepper hum sound!
    emit(EVENTS.PLAY_SOUND, { name: "floppy" });

    let tickIndex = 0;
    const interval = setInterval(() => {
      tickIndex++;
      if (tickIndex < PROGRESS_TICKS.length) {
        const tick = PROGRESS_TICKS[tickIndex];
        setProgress(tick.p);
        setProgressText(tick.t);
      } else {
        clearInterval(interval);
        setStep("done");
        
        // Trigger report file download
        try {
          const reportText = makeTextReport(reportData);
          const blob = new Blob([reportText], { type: "text/plain;charset=utf-8" });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = "COMPLY.TXT";
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          
          // Play a friendly success ding when finished
          emit(EVENTS.PLAY_SOUND, { name: "tada" });
        } catch (e) {
          console.error("Floppy write error:", e);
        }
      }
    }, 250); // Ticks every 250ms for a total of ~1.7 seconds write sequence
  };

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

  const progressBlocks = Math.floor(progress / 10);

  return (
    <div className="modal-window-backdrop" style={{ zIndex: 9700 }}>
      <div
        className="window modal-window"
        style={{
          left: pos.x,
          top: pos.y,
          width: 380,
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
          <div className="title-bar-text">A:\ Save Wizard</div>
          <div className="title-bar-controls">
            <button aria-label="Close" onClick={onClose}></button>
          </div>
        </div>

        <div className="window-body" style={{ margin: 12, display: "flex", flexDirection: "column", gap: 12 }}>
          {step === "insert" && (
            <>
              <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                <div style={{ fontSize: 32, filter: "drop-shadow(1px 1px 0 #fff)" }}>💾</div>
                <p style={{ margin: 0, fontSize: 12, lineHeight: 1.4, color: "#000" }}>
                  Please insert a formatted, high-density 3.5" floppy diskette into Drive A:\ and click <b>Write File</b> to save the active compliance buffer.
                </p>
              </div>
              <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", marginTop: 8 }}>
                <button type="button" onClick={handleWrite} style={{ minWidth: 80 }}>
                  Write File
                </button>
                <button type="button" onClick={onClose} style={{ minWidth: 80 }}>
                  Cancel
                </button>
              </div>
            </>
          )}

          {step === "writing" && (
            <>
              <p style={{ margin: 0, fontSize: 12, color: "#000" }}>
                Writing compliance_report.txt to floppy drive A:\...
              </p>
              <div style={{ fontSize: 11, color: "#404040", fontStyle: "italic" }}>
                {progressText}
              </div>
              
              {/* Retro segmented blue progress bar */}
              <div
                style={{
                  display: "flex",
                  gap: 2,
                  background: "#ffffff",
                  padding: 2,
                  borderTop: "2px solid #808080",
                  borderLeft: "2px solid #808080",
                  borderRight: "2px solid #ffffff",
                  borderBottom: "2px solid #ffffff",
                  height: 22,
                  boxSizing: "border-box"
                }}
              >
                {Array.from({ length: 10 }).map((_, i) => (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      background: i < progressBlocks ? "#000080" : "transparent",
                      height: "100%"
                    }}
                  />
                ))}
              </div>
              <p style={{ margin: 0, textAlign: "right", fontSize: 11, color: "#000" }}>
                {progress}% Complete
              </p>
            </>
          )}

          {step === "done" && (
            <>
              <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                <div style={{ fontSize: 32 }}>✨</div>
                <p style={{ margin: 0, fontSize: 12, lineHeight: 1.4, color: "#000" }}>
                  Compliance clearance report <b>COMPLY.TXT</b> has been successfully written to cluster sectors on Drive A:\. You may safely eject the diskette.
                </p>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                <button type="button" onClick={onClose} style={{ minWidth: 80 }}>
                  OK
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
