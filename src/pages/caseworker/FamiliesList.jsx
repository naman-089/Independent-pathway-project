import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../firebase";
import { useNavigate } from "react-router-dom";
import { computeReadinessScore } from "../../utils/matching";

export default function FamiliesList() {
  const [rows, setRows]     = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      const [usersSnap, intakesSnap] = await Promise.all([
        getDocs(query(collection(db, "users"), where("role", "==", "family"))),
        getDocs(collection(db, "intakes")),
      ]);
      const intakeMap = {};
      intakesSnap.docs.forEach((d) => { intakeMap[d.id] = d.data(); });
      const combined = usersSnap.docs.map((d) => {
        const u = d.data();
        const intake = intakeMap[u.uid] || null;
        return { ...u, intake, readiness: intake ? computeReadinessScore(intake) : null };
      });
      setRows(combined);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = rows.filter((r) =>
    !search ||
    r.displayName?.toLowerCase().includes(search.toLowerCase()) ||
    r.email?.toLowerCase().includes(search.toLowerCase()) ||
    r.intake?.individualName?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  return (
    <div className="page-wide">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--navy)" }}>Registered Families</h1>
          <p style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 4 }}>{rows.length} families in the program</p>
        </div>
        <input
          className="search-input"
          style={{ width: 260 }}
          type="text"
          placeholder="Search families…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Individual</th>
              <th>Support Level</th>
              <th>Readiness</th>
              <th>Region</th>
              <th>Intake</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr key={row.uid}>
                <td style={{ fontWeight: 500 }}>{row.displayName}</td>
                <td>{row.intake?.individualName || <span style={{ color: "var(--text-muted)" }}>—</span>}</td>
                <td>
                  {row.intake?.supportLevel
                    ? <span className={`tag ${row.intake.supportLevel === "high" ? "tag-danger" : row.intake.supportLevel === "medium" ? "tag-warn" : "tag-success"}`} style={{ fontSize: 11 }}>
                        {row.intake.supportLevel}
                      </span>
                    : <span style={{ color: "var(--text-muted)" }}>—</span>
                  }
                </td>
                <td>
                  {row.readiness !== null
                    ? <span style={{ fontFamily: "Syne", fontWeight: 700, color: row.readiness >= 70 ? "var(--success)" : row.readiness >= 40 ? "var(--warn)" : "var(--danger)" }}>
                        {row.readiness}%
                      </span>
                    : <span style={{ color: "var(--text-muted)" }}>No intake</span>
                  }
                </td>
                <td>{row.intake?.preferredRegion || <span style={{ color: "var(--text-muted)" }}>—</span>}</td>
                <td>
                  <span className={`tag ${row.intake ? "tag-success" : "tag-warn"}`} style={{ fontSize: 11 }}>
                    {row.intake ? "Submitted" : "Pending"}
                  </span>
                </td>
                <td>
                  <button
                    className="btn btn-sm btn-secondary"
                    onClick={() => navigate(`/caseworker/families/${row.uid}`)}
                    disabled={!row.intake}
                  >
                    View →
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} style={{ textAlign: "center", color: "var(--text-muted)", padding: 32 }}>No families found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
