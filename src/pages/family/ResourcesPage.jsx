import { useEffect, useState } from "react";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../hooks/useAuth";
import { matchOrganizations } from "../../utils/matching";
import { useNavigate } from "react-router-dom";
import SkeletonPage from "../../components/Skeleton";

const FILTER_TAGS = ["All", "Available Now", "Supported Housing", "Life Skills", "Employment", "Day Program"];

export default function ResourcesPage() {
  const { user }   = useAuth();
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
          <h3>Complete your intake first</h3>
          <p style={{ marginTop: 8, fontSize: 14, color: "var(--text-muted)" }}>
            Your resource matches are based on your intake assessment answers.
          </p>
          <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={() => navigate("/family/intake")}>
            Start Intake →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--navy)", marginBottom: 6 }}>
          Your Resource Matches
        </h1>
        <p style={{ fontSize: 14, color: "var(--text-muted)" }}>
          Ranked by how well each organization fits your intake profile — support level, housing preference, location, and readiness.
        </p>
      </div>

      {!intake && (
        <div className="alert alert-warn">Complete your intake to get personalized match scores.</div>
      )}

      <div className="search-row">
        <input
          className="search-input"
          type="text"
          placeholder="Search organizations or services…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="filter-row">
        {FILTER_TAGS.map((tag) => (
          <div
            key={tag}
            className={`filter-chip${filter === tag ? " active" : ""}`}
            onClick={() => setFilter(tag)}
          >
            {tag}
          </div>
        ))}
      </div>

      {displayed.length === 0 && (
        <div className="empty-state">
          <p>No organizations match this filter. Try clearing the search or changing the filter.</p>
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
                {org.openingCount ? `${org.openingCount} Opening${org.openingCount > 1 ? "s" : ""}` : "Accepting Referrals"}
              </span>}
              {(org.tags || []).map((t) => (
                <span key={t} className="tag tag-teal" style={{ fontSize: 11 }}>{t}</span>
              ))}
              {(org.regions || []).slice(0, 2).map((r) => (
                <span key={r} className="tag tag-navy" style={{ fontSize: 11 }}>{r}</span>
              ))}
            </div>
            {org.phone && (
              <p style={{ fontSize: 12, color: "var(--teal)", marginTop: 8 }}>
                📞 {org.phone}
                {org.website && <> · <a href={org.website} target="_blank" rel="noreferrer" style={{ color: "var(--teal)" }}>Website ↗</a></>}
              </p>
            )}
          </div>
          <div style={{ flexShrink: 0, textAlign: "right" }}>
            <div className="match-score">{org.matchScore}%</div>
            <div className="match-label">Match</div>
            {org.minReadiness > 0 && (
              <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4 }}>
                Min readiness: {org.minReadiness}
              </div>
            )}
          </div>
        </div>
      ))}

      {orgs.length === 0 && (
        <div className="alert alert-warn" style={{ marginTop: 16 }}>
          The resource directory is empty. Ask your admin to add organizations.
        </div>
      )}
    </div>
  );
}
