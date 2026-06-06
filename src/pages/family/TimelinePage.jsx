import SkeletonPage from "../../components/Skeleton";
import { useEffect, useState } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { generateTimeline, computeReadinessScore } from "../../utils/matching";

export default function TimelinePage() {
  const { user }     = useAuth();
  const navigate     = useNavigate();
  const [intake, setIntake]     = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    async function load() {
      const snap = await getDoc(doc(db, "intakes", user.uid));
      if (!snap.exists()) { navigate("/family/intake"); return; }
      const data    = snap.data();
      const saved   = data.milestoneStatuses || {};
      const generated = generateTimeline(data).map((phase) => ({
        ...phase,
        items: phase.items.map((item) => ({
          ...item,
          status: saved[item.id] ?? item.status,
        })),
      }));
      setIntake(data);
      setTimeline(generated);
      setLoading(false);
    }
    load();
  }, [user.uid, navigate]);

  async function toggleMilestone(phaseIdx, itemIdx) {
    const updated = timeline.map((phase, pi) => ({
      ...phase,
      items: phase.items.map((item, ii) => {
        if (pi === phaseIdx && ii === itemIdx) {
          const next = item.status === "done" ? "pending" : item.status === "pending" ? "active" : "done";
          return { ...item, status: next };
        }
        return item;
      }),
    }));
    setTimeline(updated);
    // Persist milestone statuses
    const flat = {};
    updated.forEach((phase) => phase.items.forEach((item) => { flat[item.id] = item.status; }));
    await updateDoc(doc(db, "intakes", user.uid), { milestoneStatuses: flat });
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
        Click a milestone to cycle its status: Pending → In Progress → Done
      </p>

      {timeline.map((phase, pi) => (
        <div className="phase-section" key={phase.phaseKey}>
          <div className="phase-label">{phase.phase}</div>
          {phase.items.map((item, ii) => (
            <div className="milestone" key={item.id} onClick={() => toggleMilestone(pi, ii)}>
              <div className={`m-dot ${item.status}`}>
                {item.status === "done" ? "✓" : item.status === "active" ? "→" : ii + 1}
              </div>
              <div className="m-info">
                <h4>{item.title}</h4>
                <p>{item.desc}</p>
              </div>
              <div className={`m-badge ${item.status}`}>
                {item.status === "done" ? "Done" : item.status === "active" ? "In Progress" : "Upcoming"}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
