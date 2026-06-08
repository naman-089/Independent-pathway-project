import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useLanguage } from "../../hooks/useLanguage";
import { IconClipboardList, IconMap2, IconUserCircle, IconBuildingCommunity } from "@tabler/icons-react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase";

export default function FamilyHome() {
  const { profile, user } = useAuth();
  const { t }             = useLanguage();
  const navigate          = useNavigate();
  const name              = profile?.displayName?.split(" ")[0] || "there";
  const [match, setMatch] = useState(null);

  const [welcomePrefix, welcomeSuffix] = t("familyHome.welcomeBack", { name: "{{name}}" }).split("{{name}}");
  const [matchPrefix, matchSuffix] = match
    ? t("familyHome.matchConfirmed", { org: "{{org}}", score: match.score }).split("{{org}}")
    : [];

  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, "matches", user.uid))
      .then((snap) => { if (snap.exists()) setMatch(snap.data()); })
      .catch(() => {});
  }, [user]);

  return (
    <div className="page">
      {match && (
        <div className="alert alert-success" style={{ marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <span>
            {matchPrefix}<strong>{match.orgName}</strong>{matchSuffix}
          </span>
          <button className="btn btn-sm btn-secondary" onClick={() => navigate("/family/resources")}>
            {t("familyHome.viewResources")}
          </button>
        </div>
      )}

      <div className="hero">
        <div className="hero-deco hero-deco-1" />
        <div className="hero-deco hero-deco-2" />
        <div className="hero-badge">{t("familyHome.heroBadge")}</div>
        <h1>
          {welcomePrefix}<em>{name}</em>{welcomeSuffix}<br />
          {t("familyHome.heroTagline")}
        </h1>
        <p>
          {t("familyHome.heroBody")}
        </p>
        <button className="btn btn-primary" onClick={() => navigate("/family/intake")}>
          {profile?.intakeComplete ? t("familyHome.ctaContinue") : t("familyHome.ctaStart")}
        </button>
      </div>

      <div className="feature-grid">
        <div className="card card-hover feature-card" onClick={() => navigate("/family/intake")}>
          <div className="feature-icon"><IconClipboardList size={22} /></div>
          <h3>{t("familyHome.featureIntakeTitle")}</h3>
          <p>{t("familyHome.featureIntakeBody")}</p>
        </div>
        <div className="card card-hover feature-card" onClick={() => navigate("/family/timeline")}>
          <div className="feature-icon"><IconMap2 size={22} /></div>
          <h3>{t("familyHome.featureTimelineTitle")}</h3>
          <p>{t("familyHome.featureTimelineBody")}</p>
        </div>
        <div className="card card-hover feature-card" onClick={() => navigate("/family/portfolio")}>
          <div className="feature-icon"><IconUserCircle size={22} /></div>
          <h3>{t("familyHome.featurePortfolioTitle")}</h3>
          <p>{t("familyHome.featurePortfolioBody")}</p>
        </div>
        <div className="card card-hover feature-card" onClick={() => navigate("/family/resources")}>
          <div className="feature-icon"><IconBuildingCommunity size={22} /></div>
          <h3>{t("familyHome.featureResourcesTitle")}</h3>
          <p>{t("familyHome.featureResourcesBody")}</p>
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-num">52<em>K+</em></div>
          <div className="stat-label">{t("familyHome.statWaitlist")}</div>
        </div>
        <div className="stat-card">
          <div className="stat-num"><em>$</em>2.9<em>B</em></div>
          <div className="stat-label">{t("familyHome.statSpend")}</div>
        </div>
        <div className="stat-card">
          <div className="stat-num">0</div>
          <div className="stat-label">{t("familyHome.statPlatforms")}</div>
        </div>
      </div>
    </div>
  );
}
