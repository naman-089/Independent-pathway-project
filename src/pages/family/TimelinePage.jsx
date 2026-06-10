import SkeletonPage from "../../components/Skeleton";
import { useEffect, useRef, useState } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../../hooks/useLanguage";
import { generateTimeline, computeReadinessScore, applyStatuses } from "../../utils/matching";

// Phase 2 skill-building milestone courses.
// videoId: YouTube video ID — update these with your actual curated video IDs.
// These are well-known public educational videos with embedding enabled.
const PHASE2_COURSES = {
  m4: { videoId: "8PmM6SUn7Es", title: "Budgeting & Money Management" },
  m5: { videoId: "3yxk9D2i-X4", title: "Using Public Transit Independently" },
  m6: { videoId: "QkQnHPJBEUU", title: "Essential Cooking Skills" },
  m7: { videoId: "xJY1J9PLHTE", title: "Medication Self-Management" },
};

// Singleton YouTube IFrame API loader
let _ytReadyPromise = null;
function ensureYouTubeAPI() {
  if (_ytReadyPromise) return _ytReadyPromise;
  if (window.YT?.Player) return (_ytReadyPromise = Promise.resolve());
  _ytReadyPromise = new Promise((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { prev?.(); resolve(); };
    if (!document.getElementById("yt-iframe-api")) {
      const s = document.createElement("script");
      s.id = "yt-iframe-api";
      s.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(s);
    }
  });
  return _ytReadyPromise;
}

function YouTubeLesson({ milestoneId, videoId, title, onComplete }) {
  const containerId = `yt-player-${milestoneId}`;
  const playerRef = useRef(null);
  const [videoError, setVideoError] = useState(false);

  useEffect(() => {
    let live = true;
    setVideoError(false);
    ensureYouTubeAPI().then(() => {
      if (!live || !document.getElementById(containerId)) return;
      playerRef.current = new window.YT.Player(containerId, {
        videoId,
        width: "100%",
        height: "260",
        playerVars: { rel: 0, modestbranding: 1, origin: window.location.origin },
        events: {
          onStateChange(ev) {
            if (live && ev.data === window.YT.PlayerState.ENDED) onComplete?.();
          },
          onError() {
            if (live) setVideoError(true);
          },
        },
      });
    });
    return () => {
      live = false;
      try { playerRef.current?.destroy(); } catch (_) {}
    };
  }, [videoId, milestoneId]);

  return (
    <div className="yt-lesson" onClick={(e) => e.stopPropagation()}>
      <div className="yt-lesson-header">
        🎓 {title}
        {!videoError && <span style={{ opacity: 0.7, fontWeight: 400 }}> — Watch to the end to complete automatically</span>}
      </div>
      {videoError ? (
        <div className="yt-lesson-fallback">
          <p>Video not available right now.</p>
          <button className="btn btn-primary btn-sm" onClick={() => onComplete?.()}>
            Mark as Complete
          </button>
        </div>
      ) : (
        <div id={containerId} style={{ width: "100%", display: "block" }} />
      )}
    </div>
  );
}

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
      // Phase 2 skill milestones with a video: clicking again does nothing — video completion triggers auto-done
      if (PHASE2_COURSES[item.id]) return;
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

  async function autoCompleteMilestone(pi, ii, courseTitle) {
    const today = new Date().toISOString().split("T")[0];
    const updated = timeline.map((phase, p) => ({
      ...phase,
      items: phase.items.map((itm, i) =>
        p === pi && i === ii
          ? { ...itm, status: "done", completedDate: today, note: `Course completed: ${courseTitle}` }
          : itm
      ),
    }));
    setTimeline(updated);
    await persistStatuses(user.uid, updated);
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
          {phase.items.map((item, ii) => {
            const course = PHASE2_COURSES[item.id];
            const showVideo = !!course && item.status === "active";
            return (
              <div
                key={item.id}
                className={`milestone${item.locked ? " milestone-locked" : ""}`}
                onClick={() => handleMilestoneClick(pi, ii)}
                style={{ cursor: (item.locked || item.status === "done" || showVideo) ? "default" : "pointer", flexDirection: "column" }}
              >
                <div className="milestone-main-row">
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
                {showVideo && (
                  <YouTubeLesson
                    milestoneId={item.id}
                    videoId={course.videoId}
                    title={course.title}
                    onComplete={() => autoCompleteMilestone(pi, ii, course.title)}
                  />
                )}
              </div>
            );
          })}
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
