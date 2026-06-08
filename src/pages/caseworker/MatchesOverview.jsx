import SkeletonPage from "../../components/Skeleton";
import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../../hooks/useLanguage";

export default function MatchesOverview() {
  const { t } = useLanguage();
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
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--navy)" }}>{t("matchesOverview.title")}</h1>
        <p style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 4 }}>{t("matchesOverview.subtitle", { count: matches.length })}</p>
      </div>

      {matches.length === 0 && (
        <div className="empty-state">
          <p>{t("matchesOverview.noMatches")}</p>
        </div>
      )}

      <div className="card">
        <table className="data-table">
          <thead>
            <tr>
              <th>{t("matchesOverview.colIndividual")}</th>
              <th>{t("matchesOverview.colOrganization")}</th>
              <th>{t("matchesOverview.colScore")}</th>
              <th>{t("matchesOverview.colStatus")}</th>
              <th>{t("matchesOverview.colNotes")}</th>
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
                  <span className="tag tag-success" style={{ fontSize: 11 }}>{t("matchesOverview.confirmed")}</span>
                </td>
                <td style={{ maxWidth: 200, fontSize: 12, color: "var(--text-muted)" }}>
                  {m.note || t("common.dash")}
                </td>
                <td>
                  <button className="btn btn-sm btn-secondary" onClick={() => navigate(`/caseworker/families/${m.uid}`)}>
                    {t("matchesOverview.view")}
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
