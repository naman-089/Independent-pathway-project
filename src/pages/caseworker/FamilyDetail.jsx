import SkeletonPage from "../../components/Skeleton";
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, collection, getDocs, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";
import { computeReadinessScore, matchOrganizations, generateTimeline, applyStatuses } from "../../utils/matching";

const SKILL_LABELS = { independent: "Independent", reminders: "With reminders", some_help: "With help", full_support: "Full support" };

export default function FamilyDetail() {
  const { uid }    = useParams();
  const navigate   = useNavigate();
  const [intake, setIntake]   = useState(null);
  const [matches, setMatches] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [tab, setTab]         = useState("overview");
  const [matchNote, setMatchNote] = useState("");
  const [confirmedMatch, setConfirmedMatch] = useState(null);

  useEffect(() => {
    async function load() {
      const [intakeSnap, orgsSnap, matchSnap] = await Promise.all([
        getDoc(doc(db, "intakes", uid)),
        getDocs(collection(db, "organizations")),
        getDoc(doc(db, "matches", uid)),
      ]);
      if (!intakeSnap.exists()) { navigate("/caseworker/families"); return; }
      const intakeData = intakeSnap.data();
      const orgsData   = orgsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setIntake(intakeData);
      setMatches(matchOrganizations(intakeData, orgsData));
      setTimeline(applyStatuses(generateTimeline(intakeData), intakeData));
      if (matchSnap.exists()) {
        setConfirmedMatch(matchSnap.data());
        setMatchNote(matchSnap.data().note || "");
      }
      setLoading(false);
    }
    load();
  }, [uid, navigate]);

  async function confirmMatch(org) {
    setSaving(true);
    const matchData = {
      uid,
      orgId:   org.id,
      orgName: org.name,
      score:   org.matchScore,
      note:    matchNote,
      confirmedAt: serverTimestamp(),
      status: "confirmed",
    };
    await setDoc(doc(db, "matches", uid), matchData);
    setConfirmedMatch(matchData);
    setSaved(true);
    setSaving(false);
    setTimeout(() => setSaved(false), 3000);
  }

  async function verifyMilestone(itemId, action) {
    const currentStatuses = intake.milestoneStatuses || {};
    const raw = currentStatuses[itemId];
    const cur = raw ? (typeof raw === "string" ? { status: raw } : raw) : { status: "pending" };

    let next;
    if (action === "mark_done") {
      next = { ...cur, status: "done", caseworkerVerified: true };
    } else if (action === "verify") {
      next = { ...cur, caseworkerVerified: true };
    } else {
      // unverify
      next = { ...cur, caseworkerVerified: false };
    }

    const newStatuses = { ...currentStatuses, [itemId]: next };
    await updateDoc(doc(db, "intakes", uid), { milestoneStatuses: newStatuses });
    setIntake((prev) => ({ ...prev, milestoneStatuses: newStatuses }));
    setTimeline((prev) =>
      prev.map((phase) => ({
        ...phase,
        items: phase.items.map((itm) => {
          if (itm.id !== itemId) return itm;
          if (action === "mark_done") return { ...itm, status: "done", caseworkerVerified: true };
          if (action === "verify")   return { ...itm, caseworkerVerified: true };
          return { ...itm, caseworkerVerified: false };
        }),
      }))
    );
  }

  if (loading) return <SkeletonPage />;

  const readiness = computeReadinessScore(intake);
  const name = intake?.individualName || "—";

  const TABS = ["overview", "skills", "timeline", "matches"];

  return (
    <div className="page-wide">
      <button className="btn btn-secondary btn-sm" onClick={() => navigate("/caseworker/families")} style={{ marginBottom: 20 }}>
        ← Back to families
      </button>

      <div className="tl-header" style={{ marginBottom: 20 }}>
        <div className="tl-avatar">{name.charAt(0)}</div>
        <div className="tl-header-text">
          <h2>{name}</h2>
          <p>Caregiver: {intake?.caregiverName || "—"} · Age: {intake?.individualAge || "—"} · {intake?.livingSituation || "—"}</p>
        </div>
        <div className="progress-ring">
          {readiness}%
          <span>Readiness</span>
        </div>
      </div>

      {confirmedMatch && (
        <div className="alert alert-success" style={{ marginBottom: 16 }}>
          ✅ Confirmed match: <strong>{confirmedMatch.orgName}</strong> (Score: {confirmedMatch.score}%)
          {confirmedMatch.note && ` — ${confirmedMatch.note}`}
        </div>
      )}
      {saved && <div className="alert alert-success">Match saved successfully.</div>}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 24, borderBottom: "1px solid var(--border)", paddingBottom: 0, overflowX: "auto" }}>
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: "9px 18px", border: "none", background: "none",
              fontFamily: "DM Sans", fontSize: 14,
              color: tab === t ? "var(--accent)" : "var(--text-muted)",
              borderBottom: tab === t ? "2px solid var(--accent)" : "2px solid transparent",
              fontWeight: tab === t ? 600 : 400, cursor: "pointer",
              textTransform: "capitalize", transition: "color 0.2s",
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {tab === "overview" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px,1fr))", gap: 16 }}>
          <div className="card">
            <div className="pcard-label">Vision Statement</div>
            <p style={{ fontSize: 13, lineHeight: 1.7, fontStyle: "italic", color: "var(--text)" }}>
              "{intake?.visionStatement || "Not provided"}"
            </p>
            {intake?.priorities?.length > 0 && (
              <>
                <div className="pcard-label" style={{ marginTop: 14 }}>Priorities</div>
                <div className="tag-row">{intake.priorities.map((p) => <span key={p} className="tag tag-navy" style={{ fontSize: 11 }}>{p}</span>)}</div>
              </>
            )}
          </div>
          <div className="card">
            <div className="pcard-label">Support & Housing</div>
            <div className="pcard-value" style={{ textTransform: "capitalize" }}>{intake?.supportLevel || "—"} support</div>
            <div className="pcard-note" style={{ marginBottom: 12 }}>Preferred region: {intake?.preferredRegion || "—"}</div>
            <div className="pcard-label">Housing preferences</div>
            <div className="tag-row">{(intake?.housingPreferences || []).map((h) => <span key={h} className="tag tag-teal" style={{ fontSize: 11 }}>{h}</span>)}</div>
          </div>
          <div className="card">
            <div className="pcard-label">Legal & Financial</div>
            <ul style={{ listStyle: "none", fontSize: 13 }}>
              {[
                ["ODSP", { yes: "✅ Active", applied: "⏳ Pending", no: "❌ Not applied" }[intake?.odspRegistered]],
                ["SDM", { yes: "✅ In place", in_progress: "⏳ In progress", no: "❌ Not yet" }[intake?.sdmInPlace]],
                ["Henson Trust", { yes: "✅ Yes", in_progress: "⏳ In progress", no: "❌ No" }[intake?.hensonTrust]],
              ].map(([label, val]) => (
                <li key={label} style={{ padding: "6px 0", borderBottom: "0.5px solid var(--border)", display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-muted)" }}>{label}</span>
                  <span style={{ fontWeight: 500 }}>{val || "—"}</span>
                </li>
              ))}
            </ul>
            {intake?.legalNotes && <p style={{ marginTop: 10, fontSize: 12, color: "var(--text-muted)" }}>{intake.legalNotes}</p>}
          </div>
          {intake?.additionalNotes && (
            <div className="card">
              <div className="pcard-label">Additional Notes</div>
              <p style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.7 }}>{intake.additionalNotes}</p>
            </div>
          )}
        </div>
      )}

      {/* Skills Tab */}
      {tab === "skills" && (
        <div className="card" style={{ maxWidth: 480 }}>
          <div className="pcard-label" style={{ marginBottom: 14 }}>Life Skills Assessment</div>
          <ul className="skill-list">
            {[["Cooking", "cooking"], ["Budgeting", "budgeting"], ["Transit", "transit"], ["Medication", "medication"], ["Hygiene", "hygiene"], ["Communication", "communication"]].map(([label, key]) => {
              const val = intake?.skills?.[key];
              const pct = { independent: 100, reminders: 70, some_help: 45, full_support: 20 }[val] || 0;
              return (
                <li key={key}>
                  <span style={{ minWidth: 110, fontSize: 13 }}>{label}</span>
                  <div className="skill-bar-wrap">
                    <div className="skill-bar-fill" style={{ width: `${pct}%` }} />
                  </div>
                  <span style={{ fontSize: 12, color: "var(--text-muted)", whiteSpace: "nowrap" }}>{SKILL_LABELS[val] || "—"}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Timeline Tab */}
      {tab === "timeline" && (
        <div>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16 }}>
            Family self-reported progress shown below. Use the buttons to verify completed milestones or mark ones done on their behalf.
          </p>
          {timeline.map((phase) => (
            <div className="phase-section" key={phase.phaseKey}>
              <div className="phase-label">{phase.phase}</div>
              {phase.items.map((item) => (
                <div className="milestone" key={item.id} style={{ cursor: "default", alignItems: "flex-start" }}>
                  <div className={`m-dot ${item.status}`}>
                    {item.status === "done" ? "✓" : item.status === "active" ? "→" : "·"}
                  </div>
                  <div className="m-info" style={{ flex: 1 }}>
                    <h4>{item.title}</h4>
                    <p>{item.desc}</p>
                    {item.note && (
                      <div className="m-note">
                        {item.completedDate && (
                          <span style={{ fontWeight: 600 }}>
                            {new Date(item.completedDate + "T00:00:00").toLocaleDateString("en-CA", {
                              month: "short", day: "numeric", year: "numeric",
                            })}{" · "}
                          </span>
                        )}
                        {item.note}
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
                    <div className={`m-badge ${item.status}`}>
                      {item.status === "done" ? "Done" : item.status === "active" ? "In Progress" : "Upcoming"}
                    </div>
                    {item.auto && <span className="m-auto-badge">Auto</span>}
                    {item.status === "done" && !item.caseworkerVerified && (
                      <button
                        className="btn btn-sm btn-primary"
                        style={{ fontSize: 11, padding: "3px 10px" }}
                        onClick={() => verifyMilestone(item.id, "verify")}
                      >
                        Verify ✓
                      </button>
                    )}
                    {item.status === "done" && item.caseworkerVerified && (
                      <span className="m-verified-badge" style={{ cursor: "pointer" }} onClick={() => verifyMilestone(item.id, "unverify")} title="Click to remove verification">
                        Caseworker ✓
                      </span>
                    )}
                    {item.status !== "done" && (
                      <button
                        className="btn btn-sm btn-secondary"
                        style={{ fontSize: 11, padding: "3px 10px" }}
                        onClick={() => verifyMilestone(item.id, "mark_done")}
                      >
                        Mark Done
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Matches Tab */}
      {tab === "matches" && (
        <div>
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="pcard-label">Caseworker Notes on Match</div>
            <textarea
              className="field"
              style={{ width: "100%", marginTop: 8 }}
              placeholder="Add notes about why this match was selected, any special considerations…"
              value={matchNote}
              onChange={(e) => setMatchNote(e.target.value)}
              rows={3}
            />
          </div>
          {matches.slice(0, 8).map((org) => (
            <div className="resource-card" key={org.id}>
              <div className="resource-logo">{org.shortName || org.name.split(" ").map((w) => w[0]).join("").slice(0, 4)}</div>
              <div className="resource-info">
                <h3>{org.name}</h3>
                <p>{org.description}</p>
                <div className="tag-row">
                  {org.hasOpenings && <span className="tag tag-success" style={{ fontSize: 11 }}>Available</span>}
                  {(org.tags || []).map((t) => <span key={t} className="tag tag-teal" style={{ fontSize: 11 }}>{t}</span>)}
                </div>
              </div>
              <div style={{ flexShrink: 0, textAlign: "right", display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
                <div>
                  <div className="match-score">{org.matchScore}%</div>
                  <div className="match-label">Match</div>
                </div>
                <button
                  className={`btn btn-sm ${confirmedMatch?.orgId === org.id ? "btn-primary" : "btn-navy"}`}
                  onClick={() => confirmMatch(org)}
                  disabled={saving}
                >
                  {confirmedMatch?.orgId === org.id ? "✓ Confirmed" : "Confirm Match"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
