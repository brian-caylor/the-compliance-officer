import { useState, useRef, useEffect } from "react";
import { emit, EVENTS } from "../lib/bus.js";

const VERBS = [
  "Leverage", "Synergize", "Optimize", "Disrupt", "Monetize",
  "Incubate", "Benchmark", "Synthesize", "Empower", "Scale",
  "Architect", "Conceptualize", "Pivot", "Streamline", "Operationalize"
];

const ADJECTIVES = [
  "synergistic", "paradigm-shifting", "value-added", "holistic", "frictionless",
  "robust", "next-generation", "world-class", "impactful", "cross-platform",
  "low-hanging", "mission-critical", "proactive", "dynamic", "scalable"
];

const NOUNS = [
  "paradigms", "deliverables", "workflows", "mindshare", "pain points",
  "synergies", "growth-hacks", "solutions", "bandwidth", "inflection points",
  "KPIs", "deliverables", "action items", "ecosystems", "platforms"
];

const ADVERBS = [
  "dynamically", "proactively", "seamlessly", "holistically", "synergistically",
  "frictionlessly", "robustly", "efficiently", "strategically", "globally"
];

const TEMPLATES = [
  (v1, adj1, n1, adv, v2, adj2, n2) => `${v1} ${adj1} ${n1} to ${adv} optimize ${adj2} ${n2}.`,
  (v1, adj1, n1, adv, v2, adj2, n2) => `We must ${v1.toLowerCase()} our ${adj1} ${n1} in order to maximize ${adj2} ${n2}.`,
  (v1, adj1, n1, adv, v2, adj2, n2) => `Going forward, we will ${adv} ${v1.toLowerCase()} ${adj1} ${n1} while driving ${adj2} ${n2}.`,
  (v1, adj1, n1, adv, v2, adj2, n2) => `To survive the paradigm shift, we must ${v1.toLowerCase()} ${adj1} ${n1} and benchmark ${adj2} ${n2}.`
];

function generateJargon() {
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const v1 = pick(VERBS);
  const v2 = pick(VERBS);
  const adj1 = pick(ADJECTIVES);
  const adj2 = pick(ADJECTIVES);
  const n1 = pick(NOUNS);
  const n2 = pick(NOUNS);
  const adv = pick(ADVERBS);
  const temp = pick(TEMPLATES);
  return temp(v1, adj1, n1, adv, v2, adj2, n2);
}

export default function JargonSynergizer({ onClose }) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [isCentered, setIsCentered] = useState(true);
  const [jargon, setJargon] = useState("");
  const [copied, setCopied] = useState(false);
  const dragStateRef = useRef(null);

  // Generate initial jargon and center on mount
  useEffect(() => {
    setJargon(generateJargon());
    const w = 400;
    const h = 240;
    const x = Math.max(20, Math.floor((window.innerWidth - w) / 2));
    const y = Math.max(20, Math.floor((window.innerHeight - h) / 2));
    setPos({ x, y });
    setIsCentered(false);
    emit(EVENTS.PLAY_SOUND, { name: "chimes" });
  }, []);

  const handleSynthesize = () => {
    setJargon(generateJargon());
    setCopied(false);
    emit(EVENTS.PLAY_SOUND, { name: "tada" });
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

  const handleCopy = async () => {
    if (!jargon) return;
    try {
      await navigator.clipboard.writeText(jargon);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = jargon;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } finally {
        document.body.removeChild(ta);
      }
    }
  };

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
          width: 400,
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
          <div className="title-bar-text">Corporate Jargon Synergizer</div>
          <div className="title-bar-controls">
            <button aria-label="Close" onClick={onClose}></button>
          </div>
        </div>

        <div className="window-body" style={{ margin: 10, display: "flex", flexDirection: "column", gap: 10 }}>
          <p style={{ margin: 0, fontSize: 12, lineHeight: 1.4, color: "#000000" }}>
            Optimize your corporate posture by injecting high-impact, synergistic jargon into active stakeholder reviews.
          </p>

          <div className="synergizer-box" style={{ fontSize: 13, userSelect: "text" }}>
            {jargon}
          </div>

          <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={handleSynthesize}
              style={{ minWidth: 100, height: 23 }}
            >
              ↻ Synthesize
            </button>
            <button
              type="button"
              onClick={handleCopy}
              disabled={!jargon}
              style={{ minWidth: 100, height: 23 }}
            >
              {copied ? "✓ Copied" : "📋 Copy Jargon"}
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{ minWidth: 80, height: 23 }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
