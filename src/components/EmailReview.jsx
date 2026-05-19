import { useState } from "react";
import { apiReview } from "../lib/api.js";
import { TONES, DEFAULT_TONE } from "../lib/tones.js";
import { addEntry } from "../lib/hallOfShame.js";
import { emit, EVENTS } from "../lib/bus.js";
import Assessment from "./Assessment.jsx";
import Revision from "./Revision.jsx";

function makeVersion(tone, data) {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    tone,
    subject: data.recommended_subject || null,
    revision: data.recommended_revision || "",
    safety_override: !!data.safety_override,
  };
}

export default function EmailReview() {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [tone, setTone] = useState(DEFAULT_TONE);

  const [loading, setLoading] = useState(false);
  const [retoneLoading, setRetoneLoading] = useState(false);
  const [error, setError] = useState(null);
  const [retoneError, setRetoneError] = useState(null);

  // Assessment is set ONCE per fresh submission and not re-rendered during re-tones.
  const [assessmentResult, setAssessmentResult] = useState(null);
  const [versions, setVersions] = useState([]);
  const [versionIndex, setVersionIndex] = useState(0);

  const runFresh = async () => {
    if (!body.trim() || loading || retoneLoading) return;
    setLoading(true);
    setError(null);
    setRetoneError(null);
    emit(EVENTS.LOADING_START, { kind: "fresh" });
    try {
      const data = await apiReview({
        mode: "email",
        message: body,
        subject: subject.trim() || undefined,
        tone: tone === DEFAULT_TONE ? undefined : tone,
      });
      setAssessmentResult(data);
      const v = data.safety_override ? [] : [makeVersion(tone, data)];
      setVersions(v);
      setVersionIndex(0);
      addEntry({ mode: "email", original: body, result: data, tone });
      emit(EVENTS.SUBMISSION, { mode: "email", result: data });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      emit(EVENTS.LOADING_END);
    }
  };

  const runRetone = async (newToneKey) => {
    if (!body.trim() || loading || retoneLoading) return;
    if (!assessmentResult || assessmentResult.safety_override) return;
    setRetoneLoading(true);
    setRetoneError(null);
    emit(EVENTS.LOADING_START, { kind: "retone" });
    try {
      const data = await apiReview({
        mode: "email",
        message: body,
        subject: subject.trim() || undefined,
        tone: newToneKey === DEFAULT_TONE ? undefined : newToneKey,
      });
      if (data.safety_override) {
        // unlikely on same input, but bail safely
        setRetoneError("The Compliance Officer declined to re-tone this message.");
        return;
      }
      const v = makeVersion(newToneKey, data);
      setVersions((prev) => {
        const next = [...prev, v];
        setVersionIndex(next.length - 1);
        return next;
      });
      setTone(newToneKey);
    } catch (err) {
      setRetoneError(err.message);
    } finally {
      setRetoneLoading(false);
      emit(EVENTS.LOADING_END);
    }
  };

  const handleTyping = (e) => {
    const v = e.target.value;
    setBody(v);
    emit(EVENTS.TYPING, { text: v });
  };

  const goPrev = () => setVersionIndex((i) => Math.max(0, i - 1));
  const goNext = () =>
    setVersionIndex((i) => Math.min(versions.length - 1, i + 1));
  const goTo = (i) => setVersionIndex(Math.max(0, Math.min(versions.length - 1, i)));

  const currentVersion = versions[versionIndex] || null;

  return (
    <div className="co-form" role="group" aria-label="Email Review">
      <div className="field-row-stacked" style={{ width: "100%" }}>
        <label htmlFor="co-email-subj">Subject (optional):</label>
        <input
          id="co-email-subj"
          name="co-subj"
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          disabled={loading}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={true}
          data-1p-ignore
          data-lpignore="true"
          data-form-type="other"
        />
      </div>

      <div className="field-row-stacked co-grow-row" style={{ width: "100%", marginTop: 6 }}>
        <label htmlFor="co-email-msg">Email body:</label>
        <textarea
          id="co-email-msg"
          name="co-msg"
          rows={16}
          value={body}
          onChange={handleTyping}
          placeholder="Paste the message you're worried about sending."
          disabled={loading}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={true}
          data-1p-ignore
          data-lpignore="true"
          data-form-type="other"
        />
      </div>

      <div className="field-row" style={{ marginTop: 6, alignItems: "center", gap: 6 }}>
        <label htmlFor="co-email-tone" style={{ fontSize: 13 }}>Target tone:</label>
        <select
          id="co-email-tone"
          name="co-tone"
          value={tone}
          onChange={(e) => setTone(e.target.value)}
          disabled={loading}
        >
          {TONES.map((t) => (
            <option key={t.key} value={t.key}>{t.label}</option>
          ))}
        </select>
        <div style={{ flex: 1 }} />
        <button
          type="button"
          onClick={() => runFresh()}
          disabled={loading || !body.trim()}
        >
          ▶ Submit for Review
        </button>
      </div>

      {error && (
        <fieldset style={{ marginTop: 8 }}>
          <legend>⚠ Error</legend>
          <p style={{ fontSize: 13, margin: 0 }}>{error}</p>
        </fieldset>
      )}

      {assessmentResult && <Assessment {...assessmentResult} />}

      {currentVersion && !currentVersion.safety_override && (
        <Revision
          version={currentVersion}
          totalVersions={versions.length}
          versionIndex={versionIndex}
          versions={versions}
          onPrev={goPrev}
          onNext={goNext}
          onSelect={goTo}
          onTryTone={runRetone}
          busy={retoneLoading}
          retoneError={retoneError}
        />
      )}
    </div>
  );
}
