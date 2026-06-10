import SkeletonPage from "../../components/Skeleton";
import { useEffect, useState } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../../hooks/useLanguage";
import { generateTimeline, computeReadinessScore, applyStatuses } from "../../utils/matching";

// Update this URL to the actual Reena courses page when available
const COURSES_IFRAME_URL = "https://www.reena.org/programs/";

async function persistStatuses(uid, updated) {
  const flat = {};
  updated.forEach((phase) =>
    phase.items.forEach((item) => {
      if (item.status !== "pending" || item.completedDate || item.note || item.caseworkerVerified) {
        flat[item.id] = {
          status: item.status,
          ...(item.completedDate ? { completedDate: item.completedDate } : {}),
          ...(item.note ? { note: item.note } : {}),
          ...(item.caseworkerVerified ? { caseworkerVerified: true } : {}),
        };
      }
    })
  );
  await updateDoc(doc(db, "intakes", uid), { milestoneStatuses: flat });
}

export default function TimelinePage() {
  const { user }     = useAuth();
  const { t, lang }  = useLanguage();
  const navigate     = useNavigate();
  const [intake, setIntake]     = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading]   = useState(true);

  const [modal, setModal]             = useState(null);
  const [reflectDate, setReflectDate] = useState("");
  const [reflectNote, setReflectNote] = useState("");
  const [saving, setSaving]           = useState(false);

  useEffect(() => {
    async function load() {
      const snap = await getDoc(doc(db, "intakes", user.uid));
      if (!snap.exists()) { navigate("/family/intake"); return; }
      const data = snap.data();
      setIntake(data);
      setTimeline(applyStatuses(generateTimeline(data, t), data, t));
      setLoading(false);
    }
    load();
  }, [user.uid, navigate, lang]);

  function handleMilestoneClick(pi, ii) {
    const item = timeline[pi].items[ii];
    if (item.locked) return;
    if (item.status === "done") return;

    if (item.status === "active") {
      setModal({ pi, ii, item });
      setReflectDate(new Date().toISOString().split("T")[0]);
      setReflectNote("");
      return;
    }

    const updated = timeline.map((phase, p) => ({
      ...phase,
      items: phase.items.map((itm, i) =>
        p === pi && i === ii ? { ...itm, status: "active" } : itm
      ),
    }));
    setTimeline(updated);
    persistStatuses(user.uid, updated);
  }

  async function submitReflection() {
    if (!reflectNote.trim() || !reflectDate) return;
    setSaving(true);
    const { pi, ii } = modal;
    const updated = timeline.map((phase, p) => ({
      ...phase,
      items: phase.items.map((itm, i) =>
        p === pi && i === ii
          ? { ...itm, status: "done", completedDate: reflectDate, note: reflectNote.trim() }
          : itm
      ),
    }));
    setTimeline(updated);
    await persistStatuses(user.uid, updated);
    setSaving(false);
    setModal(null);
  }

  if (loading) return <SkeletonPage />;

  const readiness = computeReadinessScore(intake);
  const name = intake?.individualName || t("timeline.titleFallbackName");
  const initial = name.charAt(0).toUpperCase();

  const totalItems = timeline.reduce((s, p) => s + p.items.length, 0);
  const doneItems  = timeline.reduce((s, p) => s + p.items.filter((i) => i.status === "done").length, 0);
  const pct = totalItems ? Math.round((doneItems / totalItems) * 100) : 0;

  // Per-phase completion for the progress dots
  const phaseStats = timeline.map((phase) => {
    const total = phase.items.length;
    const done  = phase.items.filter((i) => i.status === "done").length;
    return { total, done, pct: total ? Math.round((done / total) * 100) : 0 };
  });

  const [instrPrefix, instrSuffix] = t("timeline.instructions", { auto: "{{auto}}" }).split("{{auto}}");

  return (
    <div className="page">
      {/* Header card */}
      <div className="tl-header">
        <div className="tl-avatar">{initial}</div>
        <div className="tl-header-text">
          <h2>{t("timeline.title", { name })}</h2>
          <p>{t("timeline.progressLine", { done: doneItems, total: totalItems })}</p>
        </div>
        <div className="progress-ring">
          {pct}%
          <span>{t("timeline.complete")}</span>
        </div>
      </div>

      {/* Visual progress bar */}
      <div className="tl-progress-wrap">
        <div className="tl-progress-label">
          <span>{t("timeline.progressLine", { done: doneItems, total: totalItems })}</span>
          <strong>{pct}% {t("timeline.complete")}</strong>
        </div>
        <div className="tl-progress-track">
          <div className="tl-progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="tl-phase-dots">
          {timeline.map((phase, idx) => {
            const stat = phaseStats[idx];
            const isDone = stat.pct === 100;
            const isPartial = stat.done > 0 && !isDone;
            return (
              <div key={phase.phaseKey} className="tl-phase-dot">
                <div className={`tl-phase-dot-circle${isDone ? " done" : isPartial ? " partial" : ""}`} />
                <span>{`P${idx + 1}`}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Readiness card */}
      <div className="card" style={{ marginBottom: 20, display: "flex", gap: 24, flexWrap: "wrap", alignItems: "center" }}>
        <div>
          <p style={{ fontSize: "0.6875rem", fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "var(--accent)", marginBottom: 4 }}>
            {t("timeline.readinessScore")}
          </p>
          <div className="score-ring">{readiness}<span>{t("timeline.of100")}</span></div>
        </div>
        <div className="divider" style={{ width: 1, height: 48, margin: 0 }} />
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)", lineHeight: 1.65 }}>
            {readiness >= 75 ? t("timeline.msgHigh") : readiness >= 50 ? t("timeline.msgMid") : t("timeline.msgLow")}
          </p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => navigate("/family/resources")}>
          {t("timeline.viewMatches")}
        </button>
      </div>

      <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: 20 }}>
        {instrPrefix}<strong>{t("timeline.autoBadge")}</strong>{instrSuffix}
      </p>

      {/* Timeline phases */}
      {timeline.map((phase, pi) => (
        <div className="phase-section" key={phase.phaseKey}>
          <div className="phase-label">{phase.phase}</div>
          {phase.items.map((item, ii) => (
            <div
              key={item.id}
              className={`milestone${item.locked ? " milestone-locked" : ""}`}
              onClick={() => handleMilestoneClick(pi, ii)}
              style={{ cursor: (item.locked || item.status === "done") ? "default" : "pointer" }}
            >
              <div className={`m-dot ${item.status}`}>
                {item.status === "done" ? "✓" : item.status === "active" ? "→" : ii + 1}
              </div>
              <div className="m-info">
                <h4>{item.title}</h4>
                <p>{item.desc}</p>
                {item.note && (
                  <div className="m-note">
                    {item.completedDate && (
                      <span style={{ fontWeight: 700 }}>
                        {new Date(item.completedDate + "T00:00:00").toLocaleDateString("en-CA", {
                          month: "short", day: "numeric", year: "numeric",
                        })}{" · "}
                      </span>
                    )}
                    {item.note}
                  </div>
                )}
              </div>
              <div className="m-status-col">
                <div className={`m-badge ${item.status}`}>
                  {item.status === "done" ? t("timeline.statusDone") : item.status === "active" ? t("timeline.statusActive") : t("timeline.statusPending")}
                </div>
                {item.auto && <span className="m-auto-badge">{t("timeline.autoBadge")}</span>}
                {item.caseworkerVerified && <span className="m-verified-badge">{t("timeline.caseworkerVerified")}</span>}
              </div>
            </div>
          ))}

          {/* Phase 2 — embedded courses iframe */}
          {pi === 1 && (
            <div className="phase-courses-wrap">
              <div className="phase-courses-header">
                <div>
                  <h4>{t("timeline.coursesTitle")}</h4>
                  <p>{t("timeline.coursesSubtitle")}</p>
                </div>
              </div>
              <iframe
                className="phase-courses-iframe"
                src={COURSES_IFRAME_URL}
                title="Reena Phase 2 Courses"
                loading="lazy"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              />
            </div>
          )}
        </div>
      ))}

      {/* Reflection Modal */}
      {modal && (
        <div
          className="modal-overlay"
          onClick={(e) => { if (e.target === e.currentTarget && !saving) setModal(null); }}
        >
          <div className="modal">
            <h3>{t("timeline.modalTitle")}</h3>
            <p className="modal-sub">
              <strong>{modal.item.title}</strong><br />
              {t("timeline.modalInstructions")}
            </p>

            <div className="field">
              <label>{t("timeline.dateCompletedLabel")}</label>
              <input
                type="date"
                value={reflectDate}
                max={new Date().toISOString().split("T")[0]}
                onChange={(e) => setReflectDate(e.target.value)}
              />
            </div>

            <div className="field">
              <label>
                {t("timeline.reflectionLabel")}{" "}
                <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <textarea
                placeholder={t("timeline.reflectionPlaceholder")}
                value={reflectNote}
                onChange={(e) => setReflectNote(e.target.value)}
                rows={4}
              />
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <button
                className="btn btn-primary"
                onClick={submitReflection}
                disabled={saving || !reflectNote.trim() || !reflectDate}
              >
                {saving ? t("timeline.saving") : t("timeline.markDone")}
              </button>
              <button className="btn btn-secondary" onClick={() => setModal(null)} disabled={saving}>
                {t("timeline.cancel")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
