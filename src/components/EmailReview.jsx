import { useState, useEffect } from "react";
import { apiReview, checkClientRateLimit } from "../lib/api.js";
import { TONES, DEFAULT_TONE } from "../lib/tones.js";
import { addEntry } from "../lib/hallOfShame.js";
import { emit, on, EVENTS } from "../lib/bus.js";
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

export default function EmailReview({ isActive }) {
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

  const currentVersion = versions[versionIndex] || null;

  useEffect(() => {
    if (!isActive) return;

    const handleCopyText = async (text) => {
      if (!text) return;
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        const ta = document.createElement("textarea");
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        try {
          document.execCommand("copy");
        } finally {
          document.body.removeChild(ta);
        }
      }
    };

    const unsubscribeClear = on(EVENTS.CLEAR_TEXT, (e) => {
      const scope = e.detail?.scope || "all";
      setBody("");
      emit(EVENTS.TYPING, { text: "" });
      if (scope === "all") {
        setSubject("");
        setAssessmentResult(null);
        setVersions([]);
        setVersionIndex(0);
        setError(null);
        setRetoneError(null);
      }
    });

    const unsubscribeCopy = on(EVENTS.COPY_TEXT, () => {
      if (currentVersion && currentVersion.revision) {
        handleCopyText(currentVersion.revision);
      }
    });

    return () => {
      unsubscribeClear();
      unsubscribeCopy();
    };
  }, [isActive, currentVersion]);

  const runFresh = async () => {
    if (!body.trim() || loading || retoneLoading) return;

    const { allowed } = checkClientRateLimit();
    if (!allowed) {
      setError("WARNING: SUBMISSION OVERLOAD. You have submitted 5 or more requests within a 2-minute window. Please pause and allow the Compliance Officer to finish reading the existing printouts.");
      emit(EVENTS.PLAY_SOUND, { name: "chord" });
      return;
    }

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
      emit(EVENTS.SUBMISSION, {
        mode: "email",
        original: body,
        subject: subject.trim() || undefined,
        tone: tone,
        result: data,
      });

      if (data.safety_override || data.danger_level >= 4) {
        emit(EVENTS.PLAY_SOUND, { name: "chord" });
      } else {
        emit(EVENTS.PLAY_SOUND, { name: "tada" });
      }
    } catch (err) {
      setError(err.message);
      emit(EVENTS.PLAY_SOUND, { name: "chord" });
    } finally {
      setLoading(false);
      emit(EVENTS.LOADING_END);
    }
  };

  const runRetone = async (newToneKey) => {
    if (!body.trim() || loading || retoneLoading) return;
    if (!assessmentResult || assessmentResult.safety_override) return;

    const { allowed } = checkClientRateLimit();
    if (!allowed) {
      setRetoneError("WARNING: SUBMISSION OVERLOAD. You have submitted 5 or more requests within a 2-minute window. Please pause and allow the Compliance Officer to finish reading the existing printouts.");
      emit(EVENTS.PLAY_SOUND, { name: "chord" });
      return;
    }

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
        emit(EVENTS.PLAY_SOUND, { name: "chord" });
        return;
      }
      const v = makeVersion(newToneKey, data);
      setVersions((prev) => {
        const next = [...prev, v];
        setVersionIndex(next.length - 1);
        return next;
      });
      setTone(newToneKey);
      emit(EVENTS.PLAY_SOUND, { name: "tada" });
    } catch (err) {
      setRetoneError(err.message);
      emit(EVENTS.PLAY_SOUND, { name: "chord" });
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <label htmlFor="co-email-msg">Email body:</label>
          <span style={{ fontSize: 11, color: body.length > 2500 ? "red" : "#555" }}>
            {body.length} / 2500
          </span>
        </div>
        <textarea
          id="co-email-msg"
          name="co-msg"
          rows={16}
          value={body}
          onChange={handleTyping}
          maxLength={2500}
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

      <div className="field-row field-row-responsive" style={{ marginTop: 6, alignItems: "center", gap: 6 }}>
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
        <div className="spacer" style={{ flex: 1 }} />
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
