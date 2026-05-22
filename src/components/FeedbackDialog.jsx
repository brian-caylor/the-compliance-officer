import { useState, useRef, useEffect } from "react";
import { emit, EVENTS } from "../lib/bus.js";
import { playSynthDialup } from "../lib/sounds.js";

const DEFAULT_W = 420;
const MAX_MESSAGE_LENGTH = 2500;

export default function FeedbackDialog({ onClose, isGlobalMuted }) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [width, setWidth] = useState(DEFAULT_W);
  const [submitState, setSubmitState] = useState("form"); // "form" | "dialup" | "success"

  // Form Inputs
  const [classification, setClassification] = useState("Compliance Efficiency Suggestion");
  const [email, setEmail] = useState("");
  const [urgency, setUrgency] = useState("Medium");
  const [message, setMessage] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);

  // Dial-up Simulation States
  const [progress, setProgress] = useState(0);
  const [dialupStatus, setDialupStatus] = useState("Dialing 1-800-COMPLY...");
  const [enableSpeaker, setEnableSpeaker] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const dragStateRef = useRef(null);
  const dialupAudioHandleRef = useRef(null);
  const progressIntervalRef = useRef(null);
  const fetchPromiseRef = useRef(null);

  // Center window on mount
  useEffect(() => {
    const w = Math.min(DEFAULT_W, window.innerWidth - 16);
    setWidth(w);
    const h = 480; // approximate initial height
    const x = Math.max(8, Math.floor((window.innerWidth - w) / 2));
    const y = Math.max(8, Math.floor((window.innerHeight - h) / 3));
    setPos({ x, y });

    emit(EVENTS.PLAY_SOUND, { name: "ding" });
  }, []);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (dialupAudioHandleRef.current) {
        dialupAudioHandleRef.current.stop();
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  // Handle speaker sound toggle in real-time
  useEffect(() => {
    if (submitState === "dialup" && !isGlobalMuted && enableSpeaker) {
      if (!dialupAudioHandleRef.current) {
        dialupAudioHandleRef.current = playSynthDialup();
      }
    } else {
      if (dialupAudioHandleRef.current) {
        dialupAudioHandleRef.current.stop();
        dialupAudioHandleRef.current = null;
      }
    }
  }, [submitState, enableSpeaker, isGlobalMuted]);

  // Window dragging mechanics
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
    const dx = e.clientX - s.startX;
    const dy = e.clientY - s.startY;
    setPos({
      x: s.origX + dx,
      y: s.origY + dy,
    });
  };

  const endDrag = () => {
    dragStateRef.current = null;
    document.removeEventListener("mousemove", onDragMove);
    document.removeEventListener("mouseup", endDrag);
  };

  // Close safety
  const handleClose = () => {
    if (dialupAudioHandleRef.current) {
      dialupAudioHandleRef.current.stop();
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }
    onClose();
  };

  // Form submit handler
  const handleSubmit = (e) => {
    e.preventDefault();

    if (!message.trim()) {
      alert("Please provide a detailed deposition.");
      return;
    }
    if (!acknowledged) {
      alert("You must agree to the Mandatory Compliance Release.");
      return;
    }

    // Reset dialup status & start simulation
    setProgress(0);
    setDialupStatus("Dialing 1-800-COMPLY...");
    setErrorMsg("");
    setSubmitState("dialup");

    // Start serverless POST in background concurrently
    const payload = {
      classification,
      email: email.trim(),
      urgency,
      message,
      anonymous,
      acknowledged,
    };

    fetchPromiseRef.current = fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to submit grievance.");
        }
        return data;
      })
      .catch((err) => {
        console.error("Grievance submission error:", err);
        return { error: err.message };
      });

    // Start progress interval
    let curProgress = 0;
    progressIntervalRef.current = setInterval(() => {
      curProgress += 1.5; // increments to 100 in about 6.6 seconds
      if (curProgress >= 100) {
        curProgress = 100;
        clearInterval(progressIntervalRef.current);

        // Progress complete: wait for serverless call to finish
        fetchPromiseRef.current.then((result) => {
          if (dialupAudioHandleRef.current) {
            dialupAudioHandleRef.current.stop();
            dialupAudioHandleRef.current = null;
          }

          if (result.error) {
            setErrorMsg(result.error);
            setSubmitState("form"); // drop back to form to fix
            emit(EVENTS.PLAY_SOUND, { name: "chord" });
          } else {
            setSubmitState("success");
            emit(EVENTS.PLAY_SOUND, { name: "tada" });
          }
        });
      }

      setProgress(Math.floor(curProgress));

      // Dynamic retro connection statuses
      if (curProgress < 15) {
        setDialupStatus("Dialing 1-800-COMPLY...");
      } else if (curProgress >= 15 && curProgress < 32) {
        setDialupStatus("Line busy... Redialing 1-800-COMPLY...");
      } else if (curProgress >= 32 && curProgress < 50) {
        setDialupStatus("Carrier detected. Negotiating (14,400 Baud)...");
      } else if (curProgress >= 50 && curProgress < 70) {
        setDialupStatus("Protocol handshaking (V.34 connection)...");
      } else if (curProgress >= 70 && curProgress < 90) {
        setDialupStatus("Connected. Sending deposition packets...");
      } else if (curProgress >= 90) {
        setDialupStatus("Verifying transmission checksums...");
      }
    }, 100);
  };

  // Segmented progress rendering logic
  const progressBlocks = Math.floor(progress / 5); // 20 segments total

  return (
    <div
      className="window modal-window win95-dialog"
      style={{
        position: "absolute",
        left: pos.x,
        top: pos.y,
        width: width,
        zIndex: 30,
        boxShadow: "4px 4px 10px rgba(0, 0, 0, 0.4)",
      }}
    >
      <div className="title-bar" onMouseDown={startDrag} style={{ cursor: "move" }}>
        <div className="title-bar-text">⚖ Submit Policy Grievance</div>
        <div className="title-bar-controls">
          <button aria-label="Close" onClick={handleClose} />
        </div>
      </div>

      <div className="window-body" style={{ margin: 8 }}>
        {submitState === "form" && (
          <form onSubmit={handleSubmit}>
            <p style={{ margin: "0 0 10px 0", fontSize: 12, lineHeight: "1.4" }}>
              Please file your feedback or compliance report below. In accordance with
              company guidelines, your grievance will be secured and processed by internal staff.
            </p>

            {errorMsg && (
              <div
                style={{
                  background: "#ffcccc",
                  border: "1px solid #d9534f",
                  padding: 8,
                  marginBottom: 10,
                  fontSize: 11,
                  color: "#a94442",
                  fontWeight: "bold",
                }}
              >
                ⚠ {errorMsg}
              </div>
            )}

            {/* Classification */}
            <div className="field-row-responsive" style={{ display: "flex", flexDirection: "column", gap: 2, marginBottom: 8 }}>
              <label style={{ fontSize: 11, fontWeight: "bold" }}>Grievance Classification:</label>
              <select
                value={classification}
                onChange={(e) => setClassification(e.target.value)}
                style={{ width: "100%", padding: 2, fontSize: 12 }}
              >
                <option>System Bug / Technical Malfunction</option>
                <option>Compliance Efficiency Suggestion</option>
                <option>Tractor-feed Printer Misalignment</option>
                <option>General Feedback / HR Commendation</option>
              </select>
            </div>

            {/* Submitter Email */}
            <div className="field-row-responsive" style={{ display: "flex", flexDirection: "column", gap: 2, marginBottom: 8 }}>
              <label style={{ fontSize: 11, fontWeight: "bold" }}>
                Corporate Email Address <span style={{ fontWeight: "normal", color: "#666" }}>(Optional)</span>:
              </label>
              <input
                type="email"
                placeholder={anonymous ? "anonymous@corporate.internal" : "brian@yourcompany.com"}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={anonymous}
                style={{ width: "100%", boxSizing: "border-box", padding: 3, fontSize: 12 }}
              />
            </div>

            {/* Threat Level */}
            <fieldset style={{ margin: "0 0 10px 0", padding: "6px 10px" }}>
              <legend style={{ fontSize: 11, fontWeight: "bold" }}>Threat Level to Shareholder Value</legend>
              <div className="field-row-responsive" style={{ display: "flex", gap: 15, flexWrap: "wrap", fontSize: 12 }}>
                <div className="field-row">
                  <input
                    type="radio"
                    id="low"
                    name="urgency"
                    value="Low"
                    checked={urgency === "Low"}
                    onChange={(e) => setUrgency(e.target.value)}
                  />
                  <label htmlFor="low">Low (Minor irritation)</label>
                </div>
                <div className="field-row">
                  <input
                    type="radio"
                    id="medium"
                    name="urgency"
                    value="Medium"
                    checked={urgency === "Medium"}
                    onChange={(e) => setUrgency(e.target.value)}
                  />
                  <label htmlFor="medium">Medium (Moderate sighing)</label>
                </div>
                <div className="field-row">
                  <input
                    type="radio"
                    id="high"
                    name="urgency"
                    value="High"
                    checked={urgency === "High"}
                    onChange={(e) => setUrgency(e.target.value)}
                  />
                  <label htmlFor="high" style={{ color: "#c00", fontWeight: "bold" }}>High (HR Intervention)</label>
                </div>
              </div>
            </fieldset>

            {/* Deposition Textarea */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <label style={{ fontSize: 11, fontWeight: "bold" }}>Detailed Deposition:</label>
              <span
                style={{
                  fontSize: 10,
                  color: message.length > MAX_MESSAGE_LENGTH ? "#c00" : "#404040",
                  fontWeight: message.length > MAX_MESSAGE_LENGTH ? "bold" : "normal",
                }}
              >
                {message.length} / {MAX_MESSAGE_LENGTH}
              </span>
            </div>
            <textarea
              rows={4}
              maxLength={MAX_MESSAGE_LENGTH}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Record policy violations, technical errors, or efficiency initiatives here..."
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: 4,
                fontFamily: "monospace",
                fontSize: 12,
                resize: "none",
                marginBottom: 8,
              }}
            />

            {/* Checkboxes */}
            <div className="field-row" style={{ alignItems: "flex-start", marginBottom: 6 }}>
              <input
                type="checkbox"
                id="anonymous"
                checked={anonymous}
                onChange={(e) => setAnonymous(e.target.checked)}
              />
              <label htmlFor="anonymous" style={{ fontSize: 11, lineHeight: "1.3" }}>
                I wish to remain anonymous (Note: System IP and coffee logs will be forwarded to HR anyway).
              </label>
            </div>

            <div className="field-row" style={{ alignItems: "flex-start", marginBottom: 12 }}>
              <input
                type="checkbox"
                id="acknowledged"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
              />
              <label htmlFor="acknowledged" style={{ fontSize: 11, lineHeight: "1.3", fontWeight: "bold" }}>
                Mandatory Release: All submissions are exclusive property of the Compliance Department and may be cited during performance audits.
              </label>
            </div>

            {/* Actions */}
            <div className="field-row-responsive" style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
              <button type="submit" className="default" style={{ minWidth: 100 }}>
                Submit Grievance
              </button>
              <button type="button" onClick={handleClose} style={{ minWidth: 80 }}>
                Cancel
              </button>
            </div>
          </form>
        )}

        {submitState === "dialup" && (
          <div style={{ padding: "10px 15px", display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", gap: 15, alignItems: "center" }}>
              {/* Dial-up connection retro icon */}
              <div
                style={{
                  fontSize: 28,
                  background: "#ffffff",
                  borderTop: "2px solid #808080",
                  borderLeft: "2px solid #808080",
                  borderRight: "2px solid #ffffff",
                  borderBottom: "2px solid #ffffff",
                  padding: "4px 8px",
                  display: "inline-block",
                  borderRadius: 2,
                }}
              >
                📞📟
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: "bold", color: "#000000" }}>
                  Dial-up Connection
                </p>
                <p style={{ margin: "2px 0 0 0", fontSize: 11, color: "#555" }}>
                  Connecting to Compliance Mainframe...
                </p>
              </div>
            </div>

            {/* Status Lines */}
            <div
              style={{
                background: "#000000",
                color: "#00ff00",
                fontFamily: "monospace",
                fontSize: 11,
                padding: "8px 10px",
                borderTop: "2px solid #808080",
                borderLeft: "2px solid #808080",
                borderRight: "2px solid #ffffff",
                borderBottom: "2px solid #ffffff",
                height: 48,
                boxSizing: "border-box",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
              }}
            >
              <div>{dialupStatus}</div>
              <div style={{ fontSize: 9, opacity: 0.7 }}>Baud Rate: 14400 bps | Line: Active</div>
            </div>

            {/* Speaker Sound escape hatch checkbox */}
            <div className="field-row" style={{ fontSize: 11, justifyContent: "flex-end", margin: "2px 0" }}>
              <input
                type="checkbox"
                id="speaker"
                checked={enableSpeaker}
                onChange={(e) => setEnableSpeaker(e.target.checked)}
              />
              <label htmlFor="speaker" style={{ fontWeight: "bold" }}>⚡ Enable Speaker Audio (Modem Speaker)</label>
            </div>

            {/* Retro Segmented blue progress bar */}
            <div>
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
                  boxSizing: "border-box",
                }}
              >
                {Array.from({ length: 20 }).map((_, i) => (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      background: i < progressBlocks ? "#000080" : "transparent",
                      height: "100%",
                    }}
                  />
                ))}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#555", marginTop: 2 }}>
                <span>BPS: 14400</span>
                <span>{progress}% Transmitted</span>
              </div>
            </div>

            {/* Cancel Dial-up Action */}
            <div style={{ display: "flex", justifyContent: "center", marginTop: 4 }}>
              <button
                type="button"
                onClick={() => {
                  if (dialupAudioHandleRef.current) {
                    dialupAudioHandleRef.current.stop();
                    dialupAudioHandleRef.current = null;
                  }
                  if (progressIntervalRef.current) {
                    clearInterval(progressIntervalRef.current);
                  }
                  setSubmitState("form");
                  emit(EVENTS.PLAY_SOUND, { name: "chord" });
                }}
                style={{ minWidth: 100 }}
              >
                Disconnect
              </button>
            </div>
          </div>
        )}

        {submitState === "success" && (
          <div style={{ padding: "10px 15px", display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
            <div style={{ fontSize: 32 }}>📁✅</div>
            <div style={{ textAlign: "center" }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: "bold", color: "#000" }}>
                Grievance Filed Successfully
              </p>
              <p style={{ margin: "6px 0 0 0", fontSize: 11, color: "#404040", lineHeight: "1.4" }}>
                Your policy grievance deposition has been secure-dispatched and filed with the compliance officer. 
                Thank you for your active compliance. Keep up the good work!
              </p>
            </div>
            <button type="button" className="default" onClick={handleClose} style={{ minWidth: 100, marginTop: 4 }}>
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
