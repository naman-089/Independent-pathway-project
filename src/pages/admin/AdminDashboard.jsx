import SkeletonPage from "../../components/Skeleton";
import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../../hooks/useLanguage";

export default function AdminDashboard() {
  const { t } = useLanguage();
  const [stats, setStats] = useState({ orgs: 0, users: 0, intakes: 0, matches: 0 });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      const [orgs, users, intakes, matches] = await Promise.all([
        getDocs(collection(db, "organizations")),
        getDocs(collection(db, "users")),
        getDocs(collection(db, "intakes")),
        getDocs(collection(db, "matches")),
      ]);
      setStats({ orgs: orgs.size, users: users.size, intakes: intakes.size, matches: matches.size });
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <SkeletonPage />;

  return (
    <div className="page">
      <div className="hero" style={{ marginBottom: 28 }}>
        <div className="hero-deco hero-deco-1" />
        <div className="hero-badge">{t("adminDashboard.heroBadge")}</div>
        <h1>{t("adminDashboard.title")}</h1>
        <p>{t("adminDashboard.body")}</p>
        <button className="btn btn-primary" onClick={() => navigate("/admin/resources")}>
          {t("adminDashboard.manageResources")}
        </button>
      </div>
      <div className="stat-grid">
        <div className="stat-card"><div className="stat-num">{stats.orgs}</div><div className="stat-label">{t("adminDashboard.statOrgs")}</div></div>
        <div className="stat-card"><div className="stat-num">{stats.users}</div><div className="stat-label">{t("adminDashboard.statUsers")}</div></div>
        <div className="stat-card"><div className="stat-num">{stats.intakes}</div><div className="stat-label">{t("adminDashboard.statIntakes")}</div></div>
        <div className="stat-card"><div className="stat-num"><em>{stats.matches}</em></div><div className="stat-label">{t("adminDashboard.statMatches")}</div></div>
      </div>
    </div>
  );
}
