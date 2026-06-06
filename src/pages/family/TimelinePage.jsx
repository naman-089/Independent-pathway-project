import SkeletonPage from "../../components/Skeleton";
import { useEffect, useState } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { generateTimeline, computeReadinessScore, applyStatuses } from "../../utils/matching";

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
  const navigate     = useNavigate();
  const [intake, setIntake]     = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading]   = useState(true);

  // Reflection modal
  const [modal, setModal]             = useState(null); // { pi, ii, item }
  const [reflectDate, setReflectDate] = useState("");
  const [reflectNote, setReflectNote] = useState("");
  const [saving, setSaving]           = useState(false);

  useEffect(() => {
    async function load() {
      const snap = await getDoc(doc(db, "intakes", user.uid));
      if (!snap.exists()) { navigate("/family/intake"); return; }
      const data = snap.data();
      setIntake(data);
      setTimeline(applyStatuses(generateTimeline(data), data));
      setLoading(false);
    }
    load();
  }, [user.uid, navigate]);

  function handleMilestoneClick(pi, ii) {
    const item = timeline[pi].items[ii];
    if (item.locked) return; // auto-verified from intake data

    if (item.status === "active") {
      // Require reflection before marking Done
      setModal({ pi, ii, item });
      setReflectDate(new Date().toISOString().split("T")[0]);
      setReflectNote("");
      return;
    }

    // pending → active  or  done → pending  (direct)
    const nextStatus = item.status === "done" ? "pending" : "active";
    const updated = timeline.map((phase, p) => ({
      ...phase,
      items: phase.items.map((itm, i) =>
        p === pi && i === ii
          ? { ...itm, status: nextStatus, completedDate: undefined, note: undefined }
          : itm
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
  const name = intake?.individualName || "Your";
  const initial = name.charAt(0).toUpperCase();

  const totalItems = timeline.reduce((s, p) => s + p.items.length, 0);
  const doneItems  = timeline.reduce((s, p) => s + p.items.filter((i) => i.status === "done").length, 0);
  const pct = totalItems ? Math.round((doneItems / totalItems) * 100) : 0;

  return (
    <div className="page">
      <div className="tl-header">
        <div className="tl-avatar">{initial}</div>
        <div className="tl-header-text">
          <h2>{name}'s Independence Timeline</h2>
          <p>Personalized pathway · {doneItems} of {totalItems} milestones complete</p>
        </div>
        <div className="progress-ring">
          {pct}%
          <span>Complete</span>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24, display: "flex", gap: 24, flexWrap: "wrap", alignItems: "center" }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase", color: "var(--accent)", marginBottom: 4 }}>Readiness Score</p>
          <div className="score-ring">{readiness}<span>/ 100</span></div>
        </div>
        <div className="divider" style={{ width: 1, height: 48, margin: 0 }} />
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6 }}>
            {readiness >= 75
              ? "Great readiness — you're well prepared for the transition process."
              : readiness >= 50
              ? "Good foundation — a few more skills to build before placement."
              : "Early stage — your timeline includes skill-building milestones to get you ready."}
          </p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => navigate("/family/resources")}>
          View Matches →
        </button>
      </div>

      <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 20 }}>
        Click a milestone to start it, then click again when ready to record your completion.
        Milestones marked <strong>Auto</strong> are verified directly from your intake answers.
      </p>

      {timeline.map((phase, pi) => (
        <div className="phase-section" key={phase.phaseKey}>
          <div className="phase-label">{phase.phase}</div>
          {phase.items.map((item, ii) => (
            <div
              key={item.id}
              className={`milestone${item.locked ? " milestone-locked" : ""}`}
              onClick={() => handleMilestoneClick(pi, ii)}
              style={{ cursor: item.locked ? "default" : "pointer" }}
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
                      <span style={{ fontWeight: 600 }}>
                        {new Date(item.completedDate + "T00:00:00").toLocaleDateString("en-CA", {
                          month: "short", day: "numeric", year: "numeric",
                        })}{" · "}
                      </span>
                    )}
                    {item.note}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
                <div className={`m-badge ${item.status}`}>
                  {item.status === "done" ? "Done" : item.status === "active" ? "In Progress" : "Upcoming"}
                </div>
                {item.auto && <span className="m-auto-badge">Auto</span>}
                {item.caseworkerVerified && <span className="m-verified-badge">Caseworker ✓</span>}
              </div>
            </div>
          ))}
        </div>
      ))}

      {/* Reflection Modal */}
      {modal && (
        <div
          className="modal-overlay"
          onClick={(e) => { if (e.target === e.currentTarget && !saving) setModal(null); }}
        >
          <div className="modal">
            <h3>Mark as Complete</h3>
            <p className="modal-sub">
              <strong>{modal.item.title}</strong><br />
              Briefly describe what you did. Your caseworker will see this note as evidence of completion.
            </p>

            <div className="field">
              <label>Date completed</label>
              <input
                type="date"
                value={reflectDate}
                max={new Date().toISOString().split("T")[0]}
                onChange={(e) => setReflectDate(e.target.value)}
              />
            </div>

            <div className="field">
              <label>
                What did you do? How did it go?{" "}
                <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <textarea
                placeholder="e.g. Attended 4 budgeting sessions at Reena community centre. Learned how to create a monthly budget and track spending."
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
                {saving ? "Saving…" : "Mark as Done ✓"}
              </button>
              <button className="btn btn-secondary" onClick={() => setModal(null)} disabled={saving}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
