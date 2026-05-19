import { useEffect, useState } from "react";
import { on, EVENTS } from "../lib/bus.js";
import { hasSeenTutorial, markTutorialSeen } from "../lib/tutorial.js";
import tutorialImg1 from "../assets/tutorial-1.png";
import tutorialImg2 from "../assets/tutorial-2.png";
import tutorialImg3 from "../assets/tutorial-3.png";
import tutorialImg4 from "../assets/tutorial-4.png";

const PAGES = [
  {
    image: tutorialImg1,
    imageLabel: "Welcome Officer at desk",
    title: "Welcome to Compliance Officer™ v3.11",
    body: (
      <>
        <p style={{ margin: "0 0 8px 0" }}>
          Aperture Workplace Solutions, Inc. proudly presents the premier workplace
          communication compliance suite.
        </p>
        <p style={{ margin: "0 0 8px 0" }}>
          Translate your most candid workplace thoughts into corporate-approved
          communication. Software last updated 1995.
        </p>
        <p style={{ margin: 0, fontStyle: "italic", color: "#404040" }}>
          This product has not been tested on humans.
        </p>
      </>
    ),
  },
  {
    image: tutorialImg2,
    imageLabel: "Thought bubble → memo",
    title: "Quick Translate",
    body: (
      <p style={{ margin: 0 }}>
        Got a workplace thought you can't actually say out loud? Type it in and the
        Compliance Officer will return a sanitized version, a danger level on a
        10-point scale, flagged phrases, and a snarky note about your judgment.
      </p>
    ),
  },
  {
    image: tutorialImg3,
    imageLabel: "Email envelope with stamp",
    title: "Email Review",
    body: (
      <p style={{ margin: 0 }}>
        Worried an email is too aggressive? Paste it in for a full HR-approved
        rewrite. Try different target tones — Diplomatic, Chipper, Legalese,
        Passive-Aggressive — and switch between versions before copying the one
        you like.
      </p>
    ),
  },
  {
    image: tutorialImg4,
    imageLabel: "Officer pointing at clipboard",
    title: "A Few Final Notes",
    body: (
      <ul style={{ margin: 0, paddingLeft: 18 }}>
        <li style={{ marginBottom: 4 }}>
          <b>Hall of Shame</b> keeps your most flagged submissions on file.
          Locally. We promise™.
        </li>
        <li style={{ marginBottom: 4 }}>
          <b>Clip the Paperclip</b> is here to help. Right-click him to hide.
        </li>
        <li>
          <b>Re-launch this tour</b> anytime from the Help menu.
        </li>
      </ul>
    ),
  },
];

export default function WelcomeTutorial() {
  const [open, setOpen] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);
  const [dontShow, setDontShow] = useState(true);

  // Auto-open on first ever load
  useEffect(() => {
    if (!hasSeenTutorial()) {
      setOpen(true);
      setPageIndex(0);
      setDontShow(true);
    }
  }, []);

  // Re-open from Help menu
  useEffect(() => {
    const off = on(EVENTS.SHOW_TUTORIAL, () => {
      setOpen(true);
      setPageIndex(0);
      setDontShow(true);
    });
    return off;
  }, []);

  if (!open) return null;

  const page = PAGES[pageIndex];
  const isFirst = pageIndex === 0;
  const isLast = pageIndex === PAGES.length - 1;

  const dismiss = () => {
    if (dontShow) markTutorialSeen();
    setOpen(false);
  };

  const goNext = () => {
    if (isLast) {
      dismiss();
    } else {
      setPageIndex((i) => i + 1);
    }
  };

  const goBack = () => {
    if (!isFirst) setPageIndex((i) => i - 1);
  };

  return (
    <div className="tutorial-backdrop" aria-live="polite">
      <div className="window tutorial-dialog">
        <div className="title-bar">
          <div className="title-bar-text">
            ⚖ Welcome to Compliance Officer v3.11
          </div>
          <div className="title-bar-controls">
            <button aria-label="Close" onClick={dismiss}></button>
          </div>
        </div>
        <div className="window-body tutorial-body">
          <div className="tutorial-image">
            <img
              src={page.image}
              alt={page.imageLabel}
              className="tutorial-image-img"
            />
          </div>

          <div className="tutorial-content">
            <h2 className="tutorial-title">{page.title}</h2>
            <div className="tutorial-text">{page.body}</div>

            {isFirst && (
              <label className="tutorial-checkbox">
                <input
                  type="checkbox"
                  checked={dontShow}
                  onChange={(e) => setDontShow(e.target.checked)}
                />
                <span>Don't show this on startup</span>
              </label>
            )}
          </div>
        </div>

        <div className="tutorial-nav">
          <button type="button" className="tutorial-skip" onClick={dismiss}>
            Skip Tour
          </button>
          <div style={{ flex: 1 }} />
          <span className="tutorial-pagecount">
            Page {pageIndex + 1} of {PAGES.length}
          </span>
          <button type="button" onClick={goBack} disabled={isFirst}>
            ◀ Back
          </button>
          <button type="button" onClick={goNext}>
            {isLast ? "▶ Get Started" : "Next ▶"}
          </button>
        </div>
      </div>
    </div>
  );
}
