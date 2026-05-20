import { useEffect, useRef } from "react";

// Inline SVGs for authentic Windows 95/98 icons, with custom retro shadows
const WARNING_SVG = (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Yellow Triangle */}
    <path d="M16 2L30 28H2L16 2Z" fill="#FFFF00" stroke="#000000" strokeWidth="2" strokeLinejoin="miter" />
    {/* Exclamation point shadow */}
    <rect x="15" y="10" width="3" height="10" fill="#808080" />
    <rect x="15" y="22" width="3" height="3" fill="#808080" />
    {/* Exclamation point black */}
    <rect x="14" y="9" width="3" height="10" fill="#000000" />
    <rect x="14" y="21" width="3" height="3" fill="#000000" />
  </svg>
);

const INFO_SVG = (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="16" cy="16" r="13" fill="#000080" stroke="#000000" strokeWidth="2" />
    <circle cx="16" cy="16" r="12" fill="#0000FF" />
    {/* White 'i' shadow */}
    <rect x="16" y="8" width="3" height="3" fill="#808080" />
    <rect x="16" y="13" width="3" height="10" fill="#808080" />
    {/* White 'i' */}
    <rect x="15" y="7" width="3" height="3" fill="#FFFFFF" />
    <rect x="15" y="12" width="3" height="10" fill="#FFFFFF" />
  </svg>
);

const CONFIRM_SVG = (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="16" cy="16" r="13" fill="#000080" stroke="#000000" strokeWidth="2" />
    <circle cx="16" cy="16" r="12" fill="#0000FF" />
    {/* Question mark shadow */}
    <path d="M13 11C13 9.3 14.3 8 16 8C17.7 8 19 9.3 19 11C19 12.5 17.5 13.5 16.5 14.5C16 15 16 16 16 17.5" stroke="#808080" strokeWidth="3" strokeLinecap="square" fill="none" />
    <rect x="16" y="21" width="3" height="3" fill="#808080" />
    {/* Question mark white */}
    <path d="M12 10C12 8.3 13.3 7 15 7C16.7 7 18 8.3 18 10C18 11.5 16.5 12.5 15.5 13.5C15 14 15 15 15 16.5" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="square" fill="none" />
    <rect x="15" y="20" width="3" height="3" fill="#FFFFFF" />
  </svg>
);

const ERROR_SVG = (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="16" cy="16" r="13" fill="#800000" stroke="#000000" strokeWidth="2" />
    <circle cx="16" cy="16" r="12" fill="#FF0000" />
    {/* White X shadow */}
    <path d="M10 10L22 22M22 10L10 22" stroke="#808080" strokeWidth="4" />
    {/* White X */}
    <path d="M9 9L21 21M21 9L9 21" stroke="#FFFFFF" strokeWidth="4" />
  </svg>
);

const ICONS = {
  warning: WARNING_SVG,
  info: INFO_SVG,
  confirm: CONFIRM_SVG,
  error: ERROR_SVG,
};

export default function Win95Dialog({
  title = "Windows Warning",
  message = "",
  type = "warning",
  onConfirm,
  onCancel,
}) {
  const confirmBtnRef = useRef(null);

  // Focus primary button on mount
  useEffect(() => {
    confirmBtnRef.current?.focus();
  }, []);

  // Keyboard controls: Escape to cancel, Enter is handled natively if button is focused
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (onCancel) {
          onCancel();
        } else if (onConfirm) {
          onConfirm(); // Close-only warning dismisses with Esc
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onConfirm, onCancel]);

  const hasCancel = !!onCancel;

  return (
    <div className="win95-dialog-backdrop">
      <div
        className="window dialog-box win95-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        aria-describedby="dialog-desc"
      >
        <div className="title-bar">
          <div className="title-bar-text" id="dialog-title">
            {title}
          </div>
          <div className="title-bar-controls">
            <button
              type="button"
              aria-label="Close"
              onClick={onCancel || onConfirm}
            />
          </div>
        </div>
        <div className="window-body dialog-body">
          <div className="dialog-content-layout">
            <div className="dialog-icon-cell" aria-hidden="true">
              {ICONS[type] || ICONS.warning}
            </div>
            <div className="dialog-text-cell" id="dialog-desc">
              {typeof message === "string" ? (
                message.split("\n").map((line, idx) => (
                  <p key={idx} style={{ margin: "0 0 6px 0", fontSize: 13, lineHeight: 1.4 }}>
                    {line}
                  </p>
                ))
              ) : (
                message
              )}
            </div>
          </div>
          <div className="dialog-action-row">
            <button
              type="button"
              ref={confirmBtnRef}
              onClick={onConfirm}
              className="dialog-button"
            >
              OK
            </button>
            {hasCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="dialog-button"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
