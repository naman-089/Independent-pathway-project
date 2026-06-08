import SkeletonPage from "../../components/Skeleton";
import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../firebase";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../../hooks/useLanguage";

export default function CaseworkerDashboard() {
  const { t } = useLanguage();
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

  if (loading) return <SkeletonPage />;

  return (
    <div className="page">
      <div className="hero" style={{ marginBottom: 28 }}>
        <div className="hero-deco hero-deco-1" />
        <div className="hero-badge">{t("caseworkerDashboard.heroBadge")}</div>
        <h1>{t("caseworkerDashboard.title")}</h1>
        <p>{t("caseworkerDashboard.body")}</p>
        <button className="btn btn-primary" onClick={() => navigate("/caseworker/families")}>
          {t("caseworkerDashboard.viewAllFamilies")}
        </button>
      </div>

      <div className="stat-grid" style={{ marginBottom: 28 }}>
        <div className="stat-card">
          <div className="stat-num">{stats.families}</div>
          <div className="stat-label">{t("caseworkerDashboard.statFamilies")}</div>
        </div>
        <div className="stat-card">
          <div className="stat-num">{stats.submitted}</div>
          <div className="stat-label">{t("caseworkerDashboard.statSubmitted")}</div>
        </div>
        <div className="stat-card">
          <div className="stat-num" style={{ color: "var(--danger)" }}>{stats.highSupport}</div>
          <div className="stat-label">{t("caseworkerDashboard.statHighSupport")}</div>
        </div>
      </div>

      <div className="section-title">{t("caseworkerDashboard.recentTitle")}</div>
      {recent.length === 0 && <div className="empty-state"><p>{t("caseworkerDashboard.noIntakes")}</p></div>}
      <div className="card">
        <table className="data-table">
          <thead>
            <tr>
              <th>{t("caseworkerDashboard.colIndividual")}</th>
              <th>{t("caseworkerDashboard.colSupportLevel")}</th>
              <th>{t("caseworkerDashboard.colRegion")}</th>
              <th>{t("caseworkerDashboard.colStatus")}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {recent.map((intake) => (
              <tr key={intake.id}>
                <td style={{ fontWeight: 500 }}>{intake.individualName || t("common.dash")}</td>
                <td>
                  <span className={`tag tag-sm ${intake.supportLevel === "high" ? "tag-danger" : intake.supportLevel === "medium" ? "tag-warn" : "tag-success"}`}
                    style={{ padding: "3px 10px", borderRadius: 50, fontSize: 11 }}>
                    {intake.supportLevel || t("common.dash")}
                  </span>
                </td>
                <td>{intake.preferredRegion || t("common.dash")}</td>
                <td><span className="tag tag-teal" style={{ fontSize: 11 }}>{t("caseworkerDashboard.submitted")}</span></td>
                <td>
                  <button className="btn btn-sm btn-secondary" onClick={() => navigate(`/caseworker/families/${intake.id}`)}>
                    {t("caseworkerDashboard.view")}
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
