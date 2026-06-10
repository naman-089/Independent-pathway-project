import { useEffect, useState } from "react";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../hooks/useAuth";
import { useLanguage } from "../../hooks/useLanguage";
import { matchOrganizations } from "../../utils/matching";
import { useNavigate } from "react-router-dom";
import SkeletonPage from "../../components/Skeleton";

export default function ResourcesPage() {
  const { user }   = useAuth();
  const { t }      = useLanguage();
  const navigate   = useNavigate();
  const [intake, setIntake]   = useState(null);
  const [orgs, setOrgs]       = useState([]);
  const [matched, setMatched] = useState([]);
  const [search, setSearch]   = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [intakeSnap, orgsSnap] = await Promise.all([
        getDoc(doc(db, "intakes", user.uid)),
        getDocs(collection(db, "organizations")),
      ]);
      const intakeData = intakeSnap.exists() ? intakeSnap.data() : null;
      const orgsData   = orgsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setIntake(intakeData);
      setOrgs(orgsData);
      // Show only Day Program orgs, sorted by match score
      const allMatched = matchOrganizations(intakeData, orgsData);
      setMatched(allMatched.filter((o) => (o.tags || []).includes("Day Program")));
      setLoading(false);
    }
    load();
  }, [user.uid]);

  const displayed = matched.filter((org) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      org.name.toLowerCase().includes(q) ||
      (org.description || "").toLowerCase().includes(q)
    );
  });

  if (loading) return <SkeletonPage />;

  if (!intake) {
    return (
      <div className="page">
        <div className="empty-state">
          <h3>{t("resources.completeIntakeTitle")}</h3>
          <p style={{ marginTop: 8, fontSize: "0.875rem", color: "var(--text-muted)" }}>
            {t("resources.completeIntakeBody")}
          </p>
          <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={() => navigate("/family/intake")}>
            {t("resources.startIntake")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: "1.625rem", fontWeight: 800, color: "var(--navy)", marginBottom: 6 }}>
          {t("resources.dayProgramsTitle")}
        </h1>
        <p style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>
          {t("resources.dayProgramsSubtitle")}
        </p>
      </div>

      <div className="search-row">
        <input
          className="search-input"
          type="text"
          placeholder={t("resources.searchPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {displayed.length === 0 && (
        <div className="empty-state">
          <p>
            {orgs.length === 0
              ? t("resources.emptyDirectory")
              : t("resources.noMatches")}
          </p>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
        {displayed.map((org) => (
          <MarketplaceCard key={org.id} org={org} t={t} />
        ))}
      </div>
    </div>
  );
}

function MarketplaceCard({ org, t }) {
  const initials = org.shortName || org.name.split(" ").map((w) => w[0]).join("").slice(0, 4);
  const hasPrice = org.pricePerDay && String(org.pricePerDay).trim() !== "";

  return (
    <div
      className="card"
      style={{ display: "flex", flexDirection: "column", gap: 12, position: "relative", overflow: "hidden", transition: "box-shadow 0.15s" }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 4px 20px rgba(11,43,92,0.1)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = ""; }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div className="resource-logo" style={{ width: 44, height: 44, fontSize: "0.6875rem", borderRadius: 10, flexShrink: 0 }}>
            {initials}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--navy)", lineHeight: 1.3 }}>{org.name}</div>
            {org.hasOpenings && (
              <span className="tag tag-success" style={{ fontSize: "0.625rem", marginTop: 4, display: "inline-block" }}>
                {org.openingCount
                  ? t("resources.openings", { count: org.openingCount, plural: org.openingCount > 1 ? "s" : "" })
                  : t("resources.acceptingReferrals")}
              </span>
            )}
          </div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div className="match-score" style={{ fontSize: "1.125rem" }}>{org.matchScore}%</div>
          <div className="match-label" style={{ fontSize: "0.625rem" }}>{t("resources.match")}</div>
        </div>
      </div>

      {org.description && (
        <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)", lineHeight: 1.55, margin: 0 }}>
          {org.description}
        </p>
      )}

      {hasPrice && (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            background: "var(--teal)", color: "#fff",
            fontSize: "0.8125rem", fontWeight: 700,
            padding: "5px 12px", borderRadius: 20, letterSpacing: 0.3,
          }}>
            💵 {t("resources.pricePerDay", { price: `$${org.pricePerDay}` })}
          </span>
          <span style={{ fontSize: "0.6875rem", color: "var(--text-muted)" }}>{t("resources.passportEligible")}</span>
        </div>
      )}

      <div className="tag-row" style={{ margin: 0 }}>
        {(org.tags || []).map((tag) => (
          <span key={tag} className="tag tag-teal" style={{ fontSize: "0.625rem" }}>{tag}</span>
        ))}
        {(org.regions || []).slice(0, 2).map((r) => (
          <span key={r} className="tag tag-navy" style={{ fontSize: "0.625rem" }}>{r}</span>
        ))}
      </div>

      {(org.phone || org.website) && (
        <p style={{ fontSize: "0.75rem", color: "var(--teal)", margin: 0 }}>
          {org.phone && <>📞 {org.phone}</>}
          {org.phone && org.website && " · "}
          {org.website && (
            <a href={org.website} target="_blank" rel="noreferrer" style={{ color: "var(--teal)" }}>
              {t("common.website")}
            </a>
          )}
        </p>
      )}
    </div>
  );
}
