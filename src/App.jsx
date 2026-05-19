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
import { STATUS_MESSAGES } from "./lib/statusMessages.js";
import { on, emit, EVENTS } from "./lib/bus.js";
import { getEntries } from "./lib/hallOfShame.js";

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
  alert(MENU_MESSAGES[item]);
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
  const [activeTab, setActiveTab] = useState("quick");
  const [statusMsg] = useState(
    () => STATUS_MESSAGES[Math.floor(Math.random() * STATUS_MESSAGES.length)]
  );
  const [time, setTime] = useState(formatTime(new Date()));
  const [shameCount, setShameCount] = useState(() => getEntries().length);

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
      const next = layoutFor(sizeRef.current);
      sizeRef.current = next.size;
      setSize(next.size);
      setPos(next.pos);
    };
    window.addEventListener("resize", onResize);
    onResize();
    return () => window.removeEventListener("resize", onResize);
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
    { key: "quick", label: "Quick Translate" },
    { key: "email", label: "Email Review" },
    {
      key: "shame",
      label: `Hall of Shame${shameCount > 0 ? ` (${shameCount})` : ""}`,
    },
  ];

  return (
    <div className="desktop">
      <div
        className="app-window window"
        style={{
          left: pos.x,
          top: pos.y,
          width: size.w,
          height: size.h,
        }}
      >
        <div
          className="title-bar"
          onMouseDown={startDrag}
          style={{ cursor: "move" }}
        >
          <div className="title-bar-text">
            ⚖ Compliance Officer v3.11 — [Untitled Review]
          </div>
          <div className="title-bar-controls">
            <button aria-label="Minimize"></button>
            <button aria-label="Maximize"></button>
            <button aria-label="Close"></button>
          </div>
        </div>

        <menu role="menubar" className="menubar">
          {MENU_ITEMS.map((item) => (
            <li
              key={item}
              role="menuitem"
              tabIndex={0}
              onClick={() => handleMenuClick(item)}
            >
              <u>{item[0]}</u>
              {item.slice(1)}
            </li>
          ))}
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
                <QuickTranslate />
              </div>
              <div className={activeTab === "email" ? "" : "hidden"}>
                <EmailReview />
              </div>
              <div className={activeTab === "shame" ? "" : "hidden"}>
                <HallOfShame />
              </div>
            </div>
          </div>
        </div>

        <div className="status-bar">
          <p className="status-bar-field">Ready.</p>
          <p className="status-bar-field">{statusMsg}</p>
          <p className="status-bar-field">CAPS</p>
          <p className="status-bar-field">NUM</p>
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
    </div>
  );
}
