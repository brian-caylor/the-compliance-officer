import { useEffect, useState } from "react";
import { on, EVENTS } from "../lib/bus.js";

export default function Level10Alert() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const off = on(EVENTS.SUBMISSION, (e) => {
      const r = e.detail?.result;
      if (!r || r.safety_override) return;
      if (Number(r.danger_level) === 10) setVisible(true);
    });
    return off;
  }, []);

  useEffect(() => {
    if (!visible) return;
    const dismiss = () => setVisible(false);
    window.addEventListener("keydown", dismiss);
    return () => window.removeEventListener("keydown", dismiss);
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      className="bsod"
      role="alertdialog"
      aria-live="assertive"
      onClick={() => setVisible(false)}
    >
      <div className="bsod-inner">
        <div className="bsod-banner">Compliance Officer</div>

        <p>A fatal HR exception 0x0000000A has occurred at 0x000A:COMPLIANCE.SYS</p>

        <p>The current message has been classified as <b>CLASS_ACTION_FILED</b>.</p>

        <p>
          This is usually caused by one of the following:
        </p>
        <ul className="bsod-list">
          <li>Speaking your mind on company email</li>
          <li>Use of all caps in a subject line</li>
          <li>Hitting "Reply All" with intent</li>
          <li>An incompatible attitude driver</li>
        </ul>

        <p>
          <span style={{ marginRight: 12 }}>* Press ENTER to file a class action lawsuit.</span>
        </p>
        <p>
          <span style={{ marginRight: 12 }}>* Press SPACE to apologize sincerely.</span>
        </p>
        <p>
          <span style={{ marginRight: 12 }}>* Press CTRL+ALT+DEL to call your union.</span>
        </p>

        <p className="bsod-prompt">Press any key to continue _</p>
      </div>
    </div>
  );
}
