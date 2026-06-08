import { useEffect, useState } from "react";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../hooks/useAuth";
import { useLanguage } from "../../hooks/useLanguage";
import { matchOrganizations } from "../../utils/matching";
import { useNavigate } from "react-router-dom";
import SkeletonPage from "../../components/Skeleton";

// `value` is the filter key matched against organization tags (English text
// stored in Firestore); `labelKey` is the translated chip label shown to families.
const FILTER_TAGS = [
  { value: "All",               labelKey: "resources.filterAll" },
  { value: "Available Now",     labelKey: "resources.filterAvailable" },
  { value: "Supported Housing", labelKey: "resources.filterHousing" },
  { value: "Life Skills",       labelKey: "resources.filterLifeSkills" },
  { value: "Employment",        labelKey: "resources.filterEmployment" },
  { value: "Day Program",       labelKey: "resources.filterDayProgram" },
];

export default function ResourcesPage() {
  const { user }   = useAuth();
  const { t }      = useLanguage();
  const navigate   = useNavigate();
  const [intake, setIntake]     = useState(null);
  const [orgs, setOrgs]         = useState([]);
  const [matched, setMatched]   = useState([]);
  const [filter, setFilter]     = useState("All");
  const [search, setSearch]     = useState("");
  const [loading, setLoading]   = useState(true);

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
      setMatched(matchOrganizations(intakeData, orgsData));
      setLoading(false);
    }
    load();
  }, [user.uid]);

  const displayed = matched.filter((org) => {
    const tags = org.tags || [];
    const matchFilter = filter === "All" || tags.includes(filter) || (filter === "Available Now" && org.hasOpenings);
    const matchSearch = !search || org.name.toLowerCase().includes(search.toLowerCase()) || (org.description || "").toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  if (loading) return <SkeletonPage />;

  if (!intake) {
    return (
      <div className="page">
        <div className="empty-state">
          <h3>{t("resources.completeIntakeTitle")}</h3>
          <p style={{ marginTop: 8, fontSize: 14, color: "var(--text-muted)" }}>
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
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--navy)", marginBottom: 6 }}>
          {t("resources.title")}
        </h1>
        <p style={{ fontSize: 14, color: "var(--text-muted)" }}>
          {t("resources.subtitle")}
        </p>
      </div>

      {!intake && (
        <div className="alert alert-warn">{t("resources.completeIntakeWarn")}</div>
      )}

      <div className="search-row">
        <input
          className="search-input"
          type="text"
          placeholder={t("resources.searchPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="filter-row">
        {FILTER_TAGS.map((tag) => (
          <div
            key={tag.value}
            className={`filter-chip${filter === tag.value ? " active" : ""}`}
            onClick={() => setFilter(tag.value)}
          >
            {t(tag.labelKey)}
          </div>
        ))}
      </div>

      {displayed.length === 0 && (
        <div className="empty-state">
          <p>{t("resources.noMatches")}</p>
        </div>
      )}

      {displayed.map((org) => (
        <div className="resource-card" key={org.id}>
          <div className="resource-logo">{org.shortName || org.name.split(" ").map((w) => w[0]).join("").slice(0, 4)}</div>
          <div className="resource-info">
            <h3>{org.name}</h3>
            <p>{org.description}</p>
            <div className="tag-row">
              {org.hasOpenings && <span className="tag tag-success" style={{ fontSize: 11 }}>
                {org.openingCount ? t("resources.openings", { count: org.openingCount, plural: org.openingCount > 1 ? "s" : "" }) : t("resources.acceptingReferrals")}
              </span>}
              {(org.tags || []).map((tag) => (
                <span key={tag} className="tag tag-teal" style={{ fontSize: 11 }}>{tag}</span>
              ))}
              {(org.regions || []).slice(0, 2).map((r) => (
                <span key={r} className="tag tag-navy" style={{ fontSize: 11 }}>{r}</span>
              ))}
            </div>
            {org.phone && (
              <p style={{ fontSize: 12, color: "var(--teal)", marginTop: 8 }}>
                📞 {org.phone}
                {org.website && <> · <a href={org.website} target="_blank" rel="noreferrer" style={{ color: "var(--teal)" }}>{t("common.website")}</a></>}
              </p>
            )}
          </div>
          <div style={{ flexShrink: 0, textAlign: "right" }}>
            <div className="match-score">{org.matchScore}%</div>
            <div className="match-label">{t("resources.match")}</div>
            {org.minReadiness > 0 && (
              <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4 }}>
                {t("resources.minReadiness", { score: org.minReadiness })}
              </div>
            )}
          </div>
        </div>
      ))}

      {orgs.length === 0 && (
        <div className="alert alert-warn" style={{ marginTop: 16 }}>
          {t("resources.emptyDirectory")}
        </div>
      )}
    </div>
  );
}
