import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../firebase";
import { useNavigate } from "react-router-dom";

export default function CaseworkerDashboard() {
  const [stats, setStats]   = useState({ families: 0, submitted: 0, highSupport: 0 });
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      const [usersSnap, intakesSnap] = await Promise.all([
        getDocs(query(collection(db, "users"), where("role", "==", "family"))),
        getDocs(collection(db, "intakes")),
      ]);

      const intakes = intakesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const highSupport = intakes.filter((i) => i.supportLevel === "high").length;

      setStats({
        families:    usersSnap.size,
        submitted:   intakes.length,
        highSupport,
      });
      setRecent(intakes.slice(0, 5));
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  return (
    <div className="page">
      <div className="hero" style={{ marginBottom: 28 }}>
        <div className="hero-deco hero-deco-1" />
        <div className="hero-badge">Caseworker Dashboard</div>
        <h1>Family Transition Overview</h1>
        <p>Review intake assessments, track milestones, and manage placement matches for families in the program.</p>
        <button className="btn btn-primary" onClick={() => navigate("/caseworker/families")}>
          View All Families →
        </button>
      </div>

      <div className="stat-grid" style={{ marginBottom: 28 }}>
        <div className="stat-card">
          <div className="stat-num">{stats.families}</div>
          <div className="stat-label">Registered families</div>
        </div>
        <div className="stat-card">
          <div className="stat-num">{stats.submitted}</div>
          <div className="stat-label">Intakes submitted</div>
        </div>
        <div className="stat-card">
          <div className="stat-num" style={{ color: "var(--danger)" }}>{stats.highSupport}</div>
          <div className="stat-label">Require high support</div>
        </div>
      </div>

      <div className="section-title">Recent Intake Submissions</div>
      {recent.length === 0 && <div className="empty-state"><p>No intakes submitted yet.</p></div>}
      <div className="card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Individual</th>
              <th>Support Level</th>
              <th>Region</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {recent.map((intake) => (
              <tr key={intake.id}>
                <td style={{ fontWeight: 500 }}>{intake.individualName || "—"}</td>
                <td>
                  <span className={`tag tag-sm ${intake.supportLevel === "high" ? "tag-danger" : intake.supportLevel === "medium" ? "tag-warn" : "tag-success"}`}
                    style={{ padding: "3px 10px", borderRadius: 50, fontSize: 11 }}>
                    {intake.supportLevel || "—"}
                  </span>
                </td>
                <td>{intake.preferredRegion || "—"}</td>
                <td><span className="tag tag-teal" style={{ fontSize: 11 }}>Submitted</span></td>
                <td>
                  <button className="btn btn-sm btn-secondary" onClick={() => navigate(`/caseworker/families/${intake.id}`)}>
                    View →
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
