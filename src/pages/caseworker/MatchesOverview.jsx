import SkeletonPage from "../../components/Skeleton";
import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase";
import { useNavigate } from "react-router-dom";

export default function MatchesOverview() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      const snap = await getDocs(collection(db, "matches"));
      setMatches(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <SkeletonPage />;

  return (
    <div className="page-wide">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--navy)" }}>Confirmed Matches</h1>
        <p style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 4 }}>{matches.length} placement matches confirmed</p>
      </div>

      {matches.length === 0 && (
        <div className="empty-state">
          <p>No matches confirmed yet. Open a family profile and confirm a match from the Matches tab.</p>
        </div>
      )}

      <div className="card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Individual (UID)</th>
              <th>Organization</th>
              <th>Match Score</th>
              <th>Status</th>
              <th>Notes</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {matches.map((m) => (
              <tr key={m.id}>
                <td style={{ fontFamily: "monospace", fontSize: 12 }}>{m.uid?.slice(0, 8)}…</td>
                <td style={{ fontWeight: 500 }}>{m.orgName}</td>
                <td>
                  <span style={{ fontFamily: "Syne", fontWeight: 700, color: "var(--accent)" }}>{m.score}%</span>
                </td>
                <td>
                  <span className="tag tag-success" style={{ fontSize: 11 }}>Confirmed</span>
                </td>
                <td style={{ maxWidth: 200, fontSize: 12, color: "var(--text-muted)" }}>
                  {m.note || "—"}
                </td>
                <td>
                  <button className="btn btn-sm btn-secondary" onClick={() => navigate(`/caseworker/families/${m.uid}`)}>
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
