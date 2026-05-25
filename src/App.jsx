import { useState, useEffect, useRef } from "react";
import "98.css";
import "./styles.css";
import QuickTranslate from "./components/QuickTranslate.jsx";
import EmailReview from "./components/EmailReview.jsx";
import HallOfShame from "./components/HallOfShame.jsx";
import Clip from "./components/Clip.jsx";
import Level10Alert from "./components/Level10Alert.jsx";
import LoadingDialog from "./components/LoadingDialog.jsx";
import WelcomeTutorial from "./components/WelcomeTutorial.jsx";
import Win95Dialog from "./components/Win95Dialog.jsx";
import AboutDialog from "./components/AboutDialog.jsx";
import JargonSynergizer from "./components/JargonSynergizer.jsx";
import FloppySaveDialog from "./components/FloppySaveDialog.jsx";
import PrintPreviewDialog from "./components/PrintPreviewDialog.jsx";
import FeedbackDialog from "./components/FeedbackDialog.jsx";
import { STATUS_MESSAGES } from "./lib/statusMessages.js";
import { on, emit, EVENTS } from "./lib/bus.js";
import { getEntries } from "./lib/hallOfShame.js";
import { getAudioContext, playSynthChimes, playSynthChord, playSynthDing, playSynthTada, playSynthFloppyDrive } from "./lib/sounds.js";
import { apiGetStats } from "./lib/api.js";

const MENU_MESSAGES = {
  File: "This feature requires Compliance Officer Pro. Contact your administrator.",
  Edit: "Editing functionality has been disabled by Group Policy.",
  View: "View options are configured by IT and cannot be modified.",
  Tools: "Preferences cannot be modified during business hours.",
  Reports: "Reports are emailed weekly to a distribution list nobody reads.",
};

const MENU_ITEMS = ["File", "Edit", "View", "Tools", "Reports", "Help"];

function handleMenuClick(item) {
  if (item === "Help") {
    emit(EVENTS.SHOW_TUTORIAL);
    return;
  }
  emit(EVENTS.SHOW_DIALOG, {
    title: `${item} System Notice`,
    message: MENU_MESSAGES[item],
    type: "warning",
  });
}

const DEFAULT_W = 900;
const DEFAULT_H = 640;
const MIN_W = 240;
const MIN_H = 240;
const VIEWPORT_MARGIN = 8;
const CLIP_BREAKPOINT = 820;     // matches Clip's NARROW_VIEWPORT_PX
const CLIP_RESERVE_W = 100;      // horizontal room reserved for Clip on wider viewports

const formatTime = (d) =>
  d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

// Compute a centered layout that respects viewport bounds and Clip's footprint.
// curSize is the user's (or default) preferred size; we clamp it to viewport.
function layoutFor(curSize) {
  if (typeof window === "undefined") {
    return { pos: { x: 24, y: 24 }, size: curSize };
  }
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const clipReserve = vw >= CLIP_BREAKPOINT ? CLIP_RESERVE_W : 0;
  const maxW = Math.max(MIN_W, vw - clipReserve - VIEWPORT_MARGIN * 2);
  const maxH = Math.max(MIN_H, vh - VIEWPORT_MARGIN * 2);
  const w = Math.min(curSize.w, maxW);
  const h = Math.min(curSize.h, maxH);
  // Center within (viewport minus Clip area) so the window is visually centered
  // in the space that isn't occupied by Clip.
  const x = Math.max(VIEWPORT_MARGIN, Math.floor((vw - clipReserve - w) / 2));
  const y = Math.max(VIEWPORT_MARGIN, Math.floor((vh - h) / 2));
  return { pos: { x, y }, size: { w, h } };
}

export default function App() {
  const [isMobile, setIsMobile] = useState(false);
  const [activeTab, setActiveTab] = useState("quick");
  const [statusMsg] = useState(
    () => STATUS_MESSAGES[Math.floor(Math.random() * STATUS_MESSAGES.length)]
  );
  const [time, setTime] = useState(formatTime(new Date()));
  const [shameCount, setShameCount] = useState(() => getEntries().length);
  const [dialog, setDialog] = useState(null);

  // New States for Phase 2 Dropdowns & Lifecycles
  const [activeMenu, setActiveMenu] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showSynergizer, setShowSynergizer] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isClosed, setIsClosed] = useState(false);
  const [selectedIcon, setSelectedIcon] = useState(null);

  // Phase 4 States
  const [lastSubmission, setLastSubmission] = useState(null);
  const [showFloppySave, setShowFloppySave] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [pipsCount, setPipsCount] = useState(1247); // Retro baseline start count

  const initial = layoutFor({ w: DEFAULT_W, h: DEFAULT_H });
  const [pos, setPos] = useState(initial.pos);
  const [size, setSize] = useState(initial.size);
  const dragStateRef = useRef(null);
  const sizeRef = useRef(size);
  useEffect(() => {
    sizeRef.current = size;
  }, [size]);

  // On viewport resize: always recenter + shrink size if it no longer fits.
  // User's manual width preference (up to DEFAULT_W) is preserved when room allows.
  useEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth < 480;
      setIsMobile(mobile);
      const next = layoutFor(sizeRef.current);
      sizeRef.current = next.size;
      setSize(next.size);
      setPos(next.pos);
    };
    window.addEventListener("resize", onResize);
    onResize();
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const isMutedRef = useRef(isMuted);
  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  useEffect(() => {
    const off = on(EVENTS.PLAY_SOUND, (e) => {
      if (isMutedRef.current) return;
      const name = e.detail?.name;
      if (name === "chimes") playSynthChimes();
      else if (name === "chord") playSynthChord();
      else if (name === "ding") playSynthDing();
      else if (name === "tada") playSynthTada();
      else if (name === "floppy") playSynthFloppyDrive();
    });
    return off;
  }, []);

  useEffect(() => {
    let initialized = false;
    const initAudio = () => {
      if (initialized) return;
      initialized = true;
      getAudioContext();
      if (!isMutedRef.current) {
        playSynthChimes();
      }
      document.removeEventListener("click", initAudio);
      document.removeEventListener("keydown", initAudio);
    };
    document.addEventListener("click", initAudio);
    document.addEventListener("keydown", initAudio);
    return () => {
      document.removeEventListener("click", initAudio);
      document.removeEventListener("keydown", initAudio);
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setTime(formatTime(new Date())), 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const off = on(EVENTS.HALL_UPDATED, (e) => {
      setShameCount(e.detail?.count ?? getEntries().length);
    });
    return off;
  }, []);

  useEffect(() => {
    const off = on(EVENTS.SHOW_DIALOG, (e) => {
      const { title, message, type, onConfirm, onCancel } = e.detail || {};
      
      // Auto-play retro warning chord for warnings and errors
      if (type === "warning" || type === "error") {
        emit(EVENTS.PLAY_SOUND, { name: "chord" });
      }

      setDialog({
        title,
        message,
        type: type || "warning",
        onConfirm: () => {
          if (onConfirm) onConfirm();
          setDialog(null);
        },
        onCancel: onCancel ? () => {
          onCancel();
          setDialog(null);
        } : null,
      });
    });
    return off;
  }, []);

  // Global listener for closing menu dropdowns and deselecting desktop icons
  useEffect(() => {
    const handleGlobalClick = (e) => {
      if (!e.target.closest(".menubar") && !e.target.closest(".menu-dropdown")) {
        setActiveMenu(null);
      }
      if (!e.target.closest(".desktop-icon")) {
        setSelectedIcon(null);
      }
    };
    document.addEventListener("click", handleGlobalClick);
    return () => document.removeEventListener("click", handleGlobalClick);
  }, []);

  // Phase 4: Buffer last translation submission and local pip count increment
  useEffect(() => {
    const off = on(EVENTS.SUBMISSION, (e) => {
      if (e.detail) {
        setLastSubmission(e.detail);
        if (e.detail.result && typeof e.detail.result.pipsAvoided !== "number") {
          setPipsCount((prev) => prev + 1);
        }
      }
    });
    return off;
  }, []);

  // Fetch initial stats count on mount
  useEffect(() => {
    let active = true;
    async function loadStats() {
      const stats = await apiGetStats();
      if (stats && typeof stats.pipsAvoided === "number" && active) {
        setPipsCount(stats.pipsAvoided);
      }
    }
    loadStats();
    return () => {
      active = false;
    };
  }, []);

  // Listen to live stats updates
  useEffect(() => {
    const off = on(EVENTS.STATS_UPDATED, (e) => {
      const val = e.detail?.pipsAvoided;
      if (typeof val === "number") {
        setPipsCount(val);
      }
    });
    return off;
  }, []);

  // Phase 4: Ctrl+P key binding for printer preview
  useEffect(() => {
    const handleKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "p") {
        e.preventDefault();
        if (lastSubmission) {
          setShowPrintPreview(true);
        } else {
          emit(EVENTS.SHOW_DIALOG, {
            title: "Spooler Error",
            message: "Print queue empty. Please translate a thought before printing.",
            type: "warning"
          });
        }
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [lastSubmission]);

  const startDrag = (e) => {
    if (e.target.closest(".title-bar-controls")) return;
    if (e.button !== 0) return;
    e.preventDefault();
    dragStateRef.current = {
      kind: "drag",
      startX: e.clientX,
      startY: e.clientY,
      origX: pos.x,
      origY: pos.y,
    };
    document.addEventListener("mousemove", onDragMove);
    document.addEventListener("mouseup", endDrag);
  };

  const startResize = (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    dragStateRef.current = {
      kind: "resize",
      startX: e.clientX,
      startY: e.clientY,
      origW: size.w,
      origH: size.h,
    };
    document.addEventListener("mousemove", onDragMove);
    document.addEventListener("mouseup", endDrag);
  };

  const onDragMove = (e) => {
    const s = dragStateRef.current;
    if (!s) return;
    if (s.kind === "drag") {
      const dx = e.clientX - s.startX;
      const dy = e.clientY - s.startY;
      const maxX = window.innerWidth - 60;
      const maxY = window.innerHeight - 32;
      setPos({
        x: Math.max(-(size.w - 80), Math.min(maxX, s.origX + dx)),
        y: Math.max(0, Math.min(maxY, s.origY + dy)),
      });
    } else if (s.kind === "resize") {
      const dx = e.clientX - s.startX;
      const dy = e.clientY - s.startY;
      setSize({
        w: Math.max(MIN_W, s.origW + dx),
        h: Math.max(MIN_H, s.origH + dy),
      });
    }
  };

  const endDrag = () => {
    dragStateRef.current = null;
    document.removeEventListener("mousemove", onDragMove);
    document.removeEventListener("mouseup", endDrag);
  };

  const tabs = [
    { key: "quick", label: isMobile ? "Translate" : "Quick Translate" },
    { key: "email", label: isMobile ? "Review" : "Email Review" },
    {
      key: "shame",
      label: isMobile
        ? `Shame${shameCount > 0 ? ` (${shameCount})` : ""}`
        : `Hall of Shame${shameCount > 0 ? ` (${shameCount})` : ""}`,
    },
  ];

  const renderDropdown = (menuName) => {
    switch (menuName) {
      case "File":
        return (
          <div className="menu-dropdown" onClick={(e) => e.stopPropagation()}>
            <div className="menu-dropdown-list">
              <div
                className="menu-dropdown-item"
                onClick={() => {
                  setActiveTab("shame");
                  setActiveMenu(null);
                }}
              >
                <span>Open permanent record</span>
                <span className="menu-dropdown-shortcut">Ctrl+O</span>
              </div>
              <div
                className="menu-dropdown-item"
                onClick={() => {
                  setActiveMenu(null);
                  emit(EVENTS.SHOW_DIALOG, {
                    title: "Group Policy Restriction",
                    message: "Saving raw draft messages to unsecure local storage is strictly prohibited by Group Policy.",
                    type: "warning"
                  });
                }}
              >
                <span>Save draft</span>
                <span className="menu-dropdown-shortcut">Ctrl+S</span>
              </div>
              <div
                className="menu-dropdown-item"
                onClick={() => {
                  setActiveMenu(null);
                  if (lastSubmission) {
                    setShowFloppySave(true);
                  } else {
                    emit(EVENTS.SHOW_DIALOG, {
                      title: "Write Error",
                      message: "No active compliance record found in buffer. Please submit a review before attempting floppy export.",
                      type: "error"
                    });
                  }
                }}
              >
                <span>Export to floppy disk</span>
              </div>
              <div
                className="menu-dropdown-item"
                onClick={() => {
                  setActiveMenu(null);
                  if (lastSubmission) {
                    setShowPrintPreview(true);
                  } else {
                    emit(EVENTS.SHOW_DIALOG, {
                      title: "Spooler Error",
                      message: "Print queue empty. Please translate a thought before printing.",
                      type: "warning"
                    });
                  }
                }}
              >
                <span>Print review</span>
                <span className="menu-dropdown-shortcut">Ctrl+P</span>
              </div>
              <div className="menu-dropdown-separator" />
              <div
                className="menu-dropdown-item"
                onClick={() => {
                  setIsClosed(true);
                  setActiveMenu(null);
                }}
              >
                <span>Exit</span>
                <span className="menu-dropdown-shortcut">Alt+F4</span>
              </div>
            </div>
          </div>
        );
      case "Edit":
        return (
          <div className="menu-dropdown" onClick={(e) => e.stopPropagation()}>
            <div className="menu-dropdown-list">
              <div
                className="menu-dropdown-item"
                onClick={() => {
                  emit(EVENTS.CLEAR_TEXT, { scope: "input" });
                  setActiveMenu(null);
                }}
              >
                <span>Cut raw contempt</span>
                <span className="menu-dropdown-shortcut">Ctrl+X</span>
              </div>
              <div
                className="menu-dropdown-item"
                onClick={() => {
                  emit(EVENTS.COPY_TEXT);
                  setActiveMenu(null);
                }}
              >
                <span>Copy sanitized translation</span>
                <span className="menu-dropdown-shortcut">Ctrl+C</span>
              </div>
              <div
                className="menu-dropdown-item"
                onClick={() => {
                  setActiveMenu(null);
                  emit(EVENTS.SHOW_DIALOG, {
                    title: "Clipboard Confiscation Policy",
                    message: "Pasting raw, unapproved thoughts from external sources is considered a security risk. Please type your thoughts manually.",
                    type: "warning"
                  });
                }}
              >
                <span>Paste from clipboard</span>
                <span className="menu-dropdown-shortcut">Ctrl+V</span>
              </div>
              <div
                className="menu-dropdown-item"
                onClick={() => {
                  emit(EVENTS.CLEAR_TEXT, { scope: "all" });
                  setActiveMenu(null);
                }}
              >
                <span>Clear all fields</span>
                <span className="menu-dropdown-shortcut">Del</span>
              </div>
            </div>
          </div>
        );
      case "View":
        return (
          <div className="menu-dropdown" onClick={(e) => e.stopPropagation()}>
            <div className="menu-dropdown-list">
              <div
                className="menu-dropdown-item"
                onClick={() => {
                  setActiveMenu(null);
                }}
              >
                <span>
                  <span className="menu-dropdown-check">✓</span>
                  Aperture Classic Theme
                </span>
              </div>
              <div className="menu-dropdown-item disabled">
                <span>
                  <span className="menu-dropdown-check"></span>
                  Compliance Officer Pro Theme
                </span>
              </div>
            </div>
          </div>
        );
      case "Tools":
        return (
          <div className="menu-dropdown" onClick={(e) => e.stopPropagation()}>
            <div className="menu-dropdown-list">
              <div
                className="menu-dropdown-item"
                onClick={() => {
                  setShowSynergizer(true);
                  setActiveMenu(null);
                }}
              >
                <span>Corporate Jargon Synergizer</span>
              </div>
              <div
                className="menu-dropdown-item"
                onClick={() => {
                  setActiveMenu(null);
                  emit(EVENTS.SHOW_DIALOG, {
                    title: "System Parameters Locked",
                    message: "Section 4.2 of the Compliance Manual locks review weights. Please submit form A-38 to the Request for Review Board.",
                    type: "warning"
                  });
                }}
              >
                <span>Audit parameters...</span>
              </div>
              <div
                className="menu-dropdown-item"
                onClick={() => {
                  setIsMuted(!isMuted);
                  setActiveMenu(null);
                }}
              >
                <span>
                  <span className="menu-dropdown-check">{isMuted ? "✓" : ""}</span>
                  Mute sound effects
                </span>
              </div>
            </div>
          </div>
        );
      case "Reports":
        return (
          <div className="menu-dropdown" onClick={(e) => e.stopPropagation()}>
            <div className="menu-dropdown-list">
              <div className="menu-dropdown-item disabled">
                <span>Generate weekly digest</span>
              </div>
              <div
                className="menu-dropdown-item"
                onClick={() => {
                  setActiveMenu(null);
                  emit(EVENTS.SHOW_DIALOG, {
                    title: "Corporate Watchlist - Active Audits",
                    message: (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8, textAlign: "left", fontSize: 12 }}>
                        <div><b>Greg (Engineering)</b> — Flagged for excessive eye-rolling during scrums.</div>
                        <div><b>Linda (Accounting)</b> — Heavy sighing detected near the coffee machine.</div>
                        <div><b>Chad (Marketing)</b> — Suspiciously high usage of 'synergy' without proper licensing.</div>
                        <div><b>Devon (QA)</b> — Reported for refusing to sign the wellness pledge.</div>
                      </div>
                    ),
                    type: "warning"
                  });
                }}
              >
                <span>View corporate watchlist</span>
              </div>
            </div>
          </div>
        );
      case "Help":
        return (
          <div className="menu-dropdown" onClick={(e) => e.stopPropagation()}>
            <div className="menu-dropdown-list">
              <div
                className="menu-dropdown-item"
                onClick={() => {
                  emit(EVENTS.SHOW_TUTORIAL);
                  setActiveMenu(null);
                }}
              >
                <span>Launch quick tour</span>
              </div>
              <div
                className="menu-dropdown-item"
                onClick={() => {
                  setShowFeedback(true);
                  setActiveMenu(null);
                }}
              >
                <span>Submit feedback / Grievance</span>
              </div>
              <hr />
              <div
                className="menu-dropdown-item"
                onClick={() => {
                  setShowAbout(true);
                  setActiveMenu(null);
                }}
              >
                <span>About Compliance Officer</span>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="desktop">
      {/* Teal Desktop Shortcut Icons */}
      <div className="desktop-icons">
        <div
          className={`desktop-icon ${selectedIcon === "app" ? "selected" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            setSelectedIcon("app");
          }}
          onDoubleClick={(e) => {
            e.stopPropagation();
            setIsMinimized(false);
            setIsClosed(false);
            setSelectedIcon(null);
            emit(EVENTS.PLAY_SOUND, { name: "chimes" });
          }}
        >
          <div className="desktop-icon-glyph" style={{ pointerEvents: "none" }}>⚖</div>
          <div className="desktop-icon-text" style={{ pointerEvents: "none" }}>
            Compliance Officer v3.11
          </div>
        </div>

        <div
          className={`desktop-icon ${selectedIcon === "recycle" ? "selected" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            setSelectedIcon("recycle");
          }}
          onDoubleClick={(e) => {
            e.stopPropagation();
            emit(EVENTS.SHOW_DIALOG, {
              title: "Access Denied",
              message: "The Recycle Bin is managed by Corporate IT. Deleting compliance records or attempting to access purged communications is a terminable offense.",
              type: "error"
            });
            setSelectedIcon(null);
          }}
        >
          <div className="desktop-icon-glyph" style={{ pointerEvents: "none" }}>🗑</div>
          <div className="desktop-icon-text" style={{ pointerEvents: "none" }}>
            Recycle Bin
          </div>
        </div>
      </div>

      {/* Main Application Window */}
      <div
        className="app-window window"
        style={{
          left: pos.x,
          top: pos.y,
          width: size.w,
          height: size.h,
          display: isMinimized || isClosed ? "none" : "flex",
        }}
      >
        <div
          className="title-bar"
          onMouseDown={startDrag}
          style={{ cursor: "move" }}
        >
          <div className="title-bar-text">
            {isMobile ? "⚖ Compliance Officer" : "⚖ Compliance Officer v3.11 — [Untitled Review]"}
          </div>
          <div className="title-bar-controls">
            <button
              aria-label="Minimize"
              onClick={(e) => {
                e.stopPropagation();
                setIsMinimized(true);
              }}
            />
            <button
              aria-label="Maximize"
              onClick={(e) => {
                e.stopPropagation();
                emit(EVENTS.SHOW_DIALOG, {
                  title: "Aperture Standard Resolution",
                  message: "Display Mode Locked. Screen size and aspect ratio are optimized for 640x480 resolution. Window scaling has been restricted by the Administrator.",
                  type: "warning"
                });
              }}
            />
            <button
              aria-label="Close"
              onClick={(e) => {
                e.stopPropagation();
                setIsClosed(true);
              }}
            />
          </div>
        </div>

        <menu role="menubar" className="menubar">
          {MENU_ITEMS.map((item) => {
            const isOpen = activeMenu === item;
            return (
              <li
                key={item}
                role="menuitem"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveMenu(isOpen ? null : item);
                }}
                onMouseEnter={() => {
                  if (activeMenu !== null) {
                    setActiveMenu(item);
                  }
                }}
                style={{
                  background: isOpen ? "#000080" : "",
                  color: isOpen ? "#ffffff" : ""
                }}
              >
                <u>{item[0]}</u>
                {item.slice(1)}
                {isOpen && renderDropdown(item)}
              </li>
            );
          })}
        </menu>

        <div className="app-window-body window-body">
          <menu role="tablist">
            {tabs.map((t) => (
              <li
                key={t.key}
                role="tab"
                aria-selected={activeTab === t.key}
                onClick={() => setActiveTab(t.key)}
              >
                <a href="#tabs">{t.label}</a>
              </li>
            ))}
          </menu>
          <div className="window app-tabpanel" role="tabpanel">
            <div className="window-body app-tabpanel-body">
              <div className={activeTab === "quick" ? "" : "hidden"}>
                <QuickTranslate isActive={activeTab === "quick"} />
              </div>
              <div className={activeTab === "email" ? "" : "hidden"}>
                <EmailReview isActive={activeTab === "email"} />
              </div>
              <div className={activeTab === "shame" ? "" : "hidden"}>
                <HallOfShame />
              </div>
            </div>
          </div>
        </div>

        <div className="status-bar">
          <p className="status-bar-field">Ready.</p>
          <p className="status-bar-field">{pipsCount.toLocaleString()} violations prevented</p>
          {!isMobile && <p className="status-bar-field">{statusMsg}</p>}
          {!isMobile && <p className="status-bar-field">CAPS</p>}
          {!isMobile && <p className="status-bar-field">NUM</p>}
          <p className="status-bar-field">{time}</p>
        </div>

        <div
          className="resize-grip"
          onMouseDown={startResize}
          aria-label="Resize window"
          title="Drag to resize"
        />
      </div>

      <Clip />
      <Level10Alert />
      <LoadingDialog />
      <WelcomeTutorial />
      {dialog && <Win95Dialog {...dialog} />}
      {showAbout && <AboutDialog onClose={() => setShowAbout(false)} />}
      {showSynergizer && <JargonSynergizer onClose={() => setShowSynergizer(false)} />}
      {showFeedback && (
        <FeedbackDialog
          onClose={() => setShowFeedback(false)}
          isGlobalMuted={isMuted}
        />
      )}
      {showFloppySave && lastSubmission && (
        <FloppySaveDialog
          reportData={lastSubmission}
          onClose={() => setShowFloppySave(false)}
        />
      )}
      {showPrintPreview && lastSubmission && (
        <PrintPreviewDialog
          reportData={lastSubmission}
          onClose={() => setShowPrintPreview(false)}
        />
      )}
      {lastSubmission && (
        <div className="printable-tractor-paper">
          <div className="tractor-paper-header">
            <div style={{ fontWeight: "bold", fontSize: "16px", textAlign: "center" }}>THE COMPLIANCE OFFICER v3.11</div>
            <div style={{ fontSize: "12px", textAlign: "center", marginTop: "4px" }}>OFFICIAL HR CLEARANCE CERTIFICATE</div>
            <div style={{ fontSize: "10px", textAlign: "center", marginTop: "4px" }}>========================================</div>
          </div>

          <div style={{ marginBottom: "16px", fontSize: "12px" }}>
            <div>DATE      : {new Date().toLocaleString("en-US", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })}</div>
            <div>SYSTEM    : Claude Haiku 4.5 via Netlify</div>
            <div>DOCUMENT  : {lastSubmission.mode === "quick" ? "QUICK TONE TRANSLATION" : "EMAIL COMPLIANCE REVIEW"}</div>
            <div>TONE      : {lastSubmission.tone ? lastSubmission.tone.toUpperCase() : "DEFAULT PROFESSIONAL"}</div>
            <div>DANGER    : LEVEL {lastSubmission.result?.danger_level ?? 1} ({lastSubmission.result?.danger_label ?? "LOW"})</div>
            <div>STATUS    : SANITIZED & APPROVED</div>
          </div>

          <div className="tractor-paper-section">
            <div className="tractor-paper-section-title" style={{ fontWeight: "bold", borderBottom: "1px solid #003300", marginBottom: "4px" }}>[1] ORIGINAL RAW CONTEMPT</div>
            <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", padding: "4px 0" }}>
              {lastSubmission.original}
            </div>
          </div>

          <div className="tractor-paper-section">
            <div className="tractor-paper-section-title" style={{ fontWeight: "bold", borderBottom: "1px solid #003300", marginBottom: "4px" }}>[2] FLAGGED NON-COMPLIANT PHRASES</div>
            {Array.isArray(lastSubmission.result?.flagged_phrases) && lastSubmission.result.flagged_phrases.length > 0 ? (
              <ul style={{ margin: "4px 0", paddingLeft: "20px" }}>
                {lastSubmission.result.flagged_phrases.map((fp, i) => (
                  <li key={i} style={{ marginBottom: "4px" }}>
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
            <div className="tractor-paper-section-title" style={{ fontWeight: "bold", borderBottom: "1px solid #003300", marginBottom: "4px" }}>[3] APPROVED SANITIZED WORKPLACE TRANSLATION</div>
            <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", padding: "4px 0", fontWeight: "bold" }}>
              {lastSubmission.result?.sanitized_translation ?? ""}
            </div>
          </div>

          <div className="tractor-paper-section">
            <div className="tractor-paper-section-title" style={{ fontWeight: "bold", borderBottom: "1px solid #003300", marginBottom: "4px" }}>[4] SPECIAL AUDIT NOTE</div>
            <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", padding: "4px 0" }}>
              {lastSubmission.result?.officers_note ?? "Buffer clear. No intervention required."}
            </div>
          </div>

          <div className="tractor-paper-footer" style={{ borderTop: "2px dashed #003300", paddingTop: "12px", marginTop: "24px", textAlign: "center", fontSize: "11px" }}>
            <div>* WARNING: UNAUTHORIZED MODIFICATION OF THIS CLEARANCE *</div>
            <div>* RECORD IS STRICTLY PROHIBITED UNDER SECTION 9 OF *</div>
            <div>* THE APERTURE SCIENCE EMPLOYEE CONDUCT HANDBOOK. *</div>
          </div>
        </div>
      )}
    </div>
  );
}
