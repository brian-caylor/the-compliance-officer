import { useState, useRef, useEffect } from "react";

export default function AboutDialog({ onClose }) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [width, setWidth] = useState(360);
  const [isCentered, setIsCentered] = useState(true);
  const dragStateRef = useRef(null);

  // Center the window on mount
  useEffect(() => {
    const w = Math.min(360, window.innerWidth - 16);
    setWidth(w);
    const h = 330;
    const x = Math.max(8, Math.floor((window.innerWidth - w) / 2));
    const y = Math.max(8, Math.floor((window.innerHeight - h) / 2));
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

  useEffect(() => {
    return () => {
      document.removeEventListener("mousemove", onDragMove);
      document.removeEventListener("mouseup", endDrag);
    };
  }, []);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal-window-backdrop" onClick={handleBackdropClick}>
      <div
        className="window modal-window"
        style={{
          left: pos.x,
          top: pos.y,
          width: width,
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
          <div className="title-bar-text">About Compliance Officer</div>
          <div className="title-bar-controls">
            <button aria-label="Close" onClick={onClose}></button>
          </div>
        </div>

        <div className="window-body" style={{ margin: 10, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
            <div
              style={{
                fontSize: 36,
                background: "#ffffff",
                borderTop: "2px solid #808080",
                borderLeft: "2px solid #808080",
                borderRight: "2px solid #ffffff",
                borderBottom: "2px solid #ffffff",
                width: 48,
                height: 48,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                userSelect: "none",
              }}
            >
              ⚖
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <div style={{ fontSize: 14, fontWeight: "bold" }}>Compliance Officer™</div>
              <div style={{ fontSize: 12, color: "#404040" }}>Version 3.11 (Build 19951024)</div>
              <div style={{ fontSize: 12, color: "#404040" }}>Copyright © 1991-1995 Aperture Corp.</div>
            </div>
          </div>

          <hr style={{ borderTop: "1px solid #808080", borderBottom: "1px solid #ffffff", margin: "4px 0" }} />

          <fieldset>
            <legend style={{ fontSize: 12 }}>Product Licensing</legend>
            <div style={{ fontSize: 12, lineHeight: 1.4, color: "#000000" }}>
              This product is licensed to:<br />
              <b style={{ color: "#000080" }}>Valued Aperture Employee #2940</b><br />
              Aperture Laboratories Inc.<br /><br />
              Product ID: <span style={{ fontFamily: "monospace" }}>50402-OEM-0004952-19284</span>
            </div>
          </fieldset>

          <fieldset style={{ marginTop: 2 }}>
            <legend style={{ fontSize: 12 }}>System Resources</legend>
            <div style={{ fontSize: 12, display: "flex", flexDirection: "column", gap: 2 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Physical Memory:</span>
                <b>16,384 KB RAM</b>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>System Resources:</span>
                <b style={{ color: "#008000" }}>82% Free</b>
              </div>
            </div>
          </fieldset>

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
            <button
              type="button"
              onClick={onClose}
              style={{ minWidth: 80, height: 23, fontWeight: "bold" }}
            >
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
