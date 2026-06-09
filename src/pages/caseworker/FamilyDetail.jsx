import SkeletonPage from "../../components/Skeleton";
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, collection, getDocs, setDoc, updateDoc, onSnapshot, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";
import { useLanguage } from "../../hooks/useLanguage";
import { computeReadinessScore, matchOrganizations, generateTimeline, applyStatuses } from "../../utils/matching";

export default function FamilyDetail() {
  const { uid }    = useParams();
  const navigate   = useNavigate();
  const { t, lang } = useLanguage();
  const [intake, setIntake]   = useState(null);
  const [matches, setMatches] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [tab, setTab]         = useState("overview");
  const [matchNote, setMatchNote] = useState("");
  const [confirmedMatch, setConfirmedMatch] = useState(null);
  const [waitlist, setWaitlist]   = useState(null);
  const [cwNote, setCwNote]       = useState("");
  const [cwNoteSaving, setCwNoteSaving] = useState(false);
  const [cwNoteSaved, setCwNoteSaved]   = useState(false);

  useEffect(() => {
    if (!uid) return;
    const unsub = onSnapshot(doc(db, "waitlists", uid), (snap) => {
      const d = snap.exists() ? snap.data() : null;
      setWaitlist(d);
      if (d) setCwNote(d.caseworkerNotes || "");
    });
    return unsub;
  }, [uid]);

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
      setTimeline(applyStatuses(generateTimeline(intakeData, t), intakeData, t));
      if (matchSnap.exists()) {
        setConfirmedMatch(matchSnap.data());
        setMatchNote(matchSnap.data().note || "");
      }
      setLoading(false);
    }
    load();
  }, [uid, navigate, lang]);

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

  async function setMilestoneVerified(itemId, verified) {
    const currentStatuses = intake.milestoneStatuses || {};
    const raw = currentStatuses[itemId];
    const cur = raw ? (typeof raw === "string" ? { status: raw } : raw) : { status: "pending" };
    const next = { ...cur, caseworkerVerified: verified };

    const newStatuses = { ...currentStatuses, [itemId]: next };
    await updateDoc(doc(db, "intakes", uid), { milestoneStatuses: newStatuses });
    setIntake((prev) => ({ ...prev, milestoneStatuses: newStatuses }));
    setTimeline((prev) =>
      prev.map((phase) => ({
        ...phase,
        items: phase.items.map((itm) =>
          itm.id === itemId ? { ...itm, caseworkerVerified: verified } : itm
        ),
      }))
    );
  }

  if (loading) return <SkeletonPage />;

  const readiness = computeReadinessScore(intake);
  const name = intake?.individualName || t("common.dash");

  const SKILL_LABELS = {
    independent: t("familyDetail.skillIndependent"),
    reminders:   t("familyDetail.skillReminders"),
    some_help:   t("familyDetail.skillSomeHelp"),
    full_support: t("familyDetail.skillFullSupport"),
  };

  async function saveCwNote() {
    setCwNoteSaving(true);
    await setDoc(doc(db, "waitlists", uid), { caseworkerNotes: cwNote }, { merge: true });
    setCwNoteSaving(false);
    setCwNoteSaved(true);
    setTimeout(() => setCwNoteSaved(false), 3000);
  }

  const TABS = ["overview", "skills", "timeline", "matches", "waitlist"];
  const TAB_LABELS = {
    overview: t("familyDetail.tabOverview"),
    skills:   t("familyDetail.tabSkills"),
    timeline: t("familyDetail.tabTimeline"),
    matches:  t("familyDetail.tabMatches"),
    waitlist: t("familyDetail.tabWaitlist"),
  };

  const [confirmedPrefix, confirmedSuffix] = confirmedMatch
    ? t("familyDetail.confirmedMatch", { org: "{{org}}", score: confirmedMatch.score }).split("{{org}}")
    : [];

  return (
    <div className="page-wide">
      <button className="btn btn-secondary btn-sm" onClick={() => navigate("/caseworker/families")} style={{ marginBottom: 20 }}>
        {t("familyDetail.backToFamilies")}
      </button>

      <div className="tl-header" style={{ marginBottom: 20 }}>
        <div className="tl-avatar">{name.charAt(0)}</div>
        <div className="tl-header-text">
          <h2>{name}</h2>
          <p>{t("familyDetail.caregiverLine", {
            caregiver: intake?.caregiverName || t("common.dash"),
            age: intake?.individualAge || t("common.dash"),
            situation: intake?.livingSituation || t("common.dash"),
          })}</p>
        </div>
        <div className="progress-ring">
          {readiness}%
          <span>{t("familyDetail.readiness")}</span>
        </div>
      </div>

      {confirmedMatch && (
        <div className="alert alert-success" style={{ marginBottom: 16 }}>
          {confirmedPrefix}<strong>{confirmedMatch.orgName}</strong>{confirmedSuffix}
          {confirmedMatch.note && ` — ${confirmedMatch.note}`}
        </div>
      )}
      {saved && <div className="alert alert-success">{t("familyDetail.matchSaved")}</div>}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 24, borderBottom: "1px solid var(--border)", paddingBottom: 0, overflowX: "auto" }}>
        {TABS.map((tabKey) => (
          <button
            key={tabKey}
            onClick={() => setTab(tabKey)}
            style={{
              padding: "9px 18px", border: "none", background: "none",
              fontFamily: "DM Sans", fontSize: 14,
              color: tab === tabKey ? "var(--accent)" : "var(--text-muted)",
              borderBottom: tab === tabKey ? "2px solid var(--accent)" : "2px solid transparent",
              fontWeight: tab === tabKey ? 600 : 400, cursor: "pointer",
              textTransform: "capitalize", transition: "color 0.2s",
            }}
          >
            {TAB_LABELS[tabKey]}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {tab === "overview" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px,1fr))", gap: 16 }}>
          <div className="card">
            <div className="pcard-label">{t("familyDetail.visionTitle")}</div>
            <p style={{ fontSize: 13, lineHeight: 1.7, fontStyle: "italic", color: "var(--text)" }}>
              "{intake?.visionStatement || t("familyDetail.visionEmpty")}"
            </p>
            {intake?.priorities?.length > 0 && (
              <>
                <div className="pcard-label" style={{ marginTop: 14 }}>{t("familyDetail.prioritiesTitle")}</div>
                <div className="tag-row">{intake.priorities.map((p) => <span key={p} className="tag tag-navy" style={{ fontSize: 11 }}>{p}</span>)}</div>
              </>
            )}
          </div>
          <div className="card">
            <div className="pcard-label">{t("familyDetail.supportHousingTitle")}</div>
            <div className="pcard-value" style={{ textTransform: "capitalize" }}>{t("familyDetail.supportLevel", { level: intake?.supportLevel || t("common.dash") })}</div>
            <div className="pcard-note" style={{ marginBottom: 12 }}>{t("familyDetail.preferredRegion", { region: intake?.preferredRegion || t("common.dash") })}</div>
            <div className="pcard-label">{t("familyDetail.housingPreferences")}</div>
            <div className="tag-row">{(intake?.housingPreferences || []).map((h) => <span key={h} className="tag tag-teal" style={{ fontSize: 11 }}>{h}</span>)}</div>
          </div>
          <div className="card">
            <div className="pcard-label">{t("familyDetail.legalTitle")}</div>
            <ul style={{ listStyle: "none", fontSize: 13 }}>
              {[
                [t("familyDetail.odsp"), { yes: t("familyDetail.legalActive"), applied: t("familyDetail.legalPending"), no: t("familyDetail.legalNotApplied") }[intake?.odspRegistered]],
                [t("familyDetail.sdm"), { yes: t("familyDetail.legalInPlace"), in_progress: t("familyDetail.legalInProgress"), no: t("familyDetail.legalNotYet") }[intake?.sdmInPlace]],
                [t("familyDetail.hensonTrust"), { yes: t("familyDetail.legalYes"), in_progress: t("familyDetail.legalInProgress"), no: t("familyDetail.legalNo") }[intake?.hensonTrust]],
              ].map(([label, val]) => (
                <li key={label} style={{ padding: "6px 0", borderBottom: "0.5px solid var(--border)", display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-muted)" }}>{label}</span>
                  <span style={{ fontWeight: 500 }}>{val || t("common.dash")}</span>
                </li>
              ))}
            </ul>
            {intake?.legalNotes && <p style={{ marginTop: 10, fontSize: 12, color: "var(--text-muted)" }}>{intake.legalNotes}</p>}
          </div>
          {intake?.additionalNotes && (
            <div className="card">
              <div className="pcard-label">{t("familyDetail.additionalNotesTitle")}</div>
              <p style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.7 }}>{intake.additionalNotes}</p>
            </div>
          )}
        </div>
      )}

      {/* Skills Tab */}
      {tab === "skills" && (
        <div className="card" style={{ maxWidth: 480 }}>
          <div className="pcard-label" style={{ marginBottom: 14 }}>{t("familyDetail.skillsTitle")}</div>
          <ul className="skill-list">
            {[
              [t("familyDetail.skillCooking"), "cooking"],
              [t("familyDetail.skillBudgeting"), "budgeting"],
              [t("familyDetail.skillTransit"), "transit"],
              [t("familyDetail.skillMedication"), "medication"],
              [t("familyDetail.skillHygiene"), "hygiene"],
              [t("familyDetail.skillCommunication"), "communication"],
            ].map(([label, key]) => {
              const val = intake?.skills?.[key];
              const pct = { independent: 100, reminders: 70, some_help: 45, full_support: 20 }[val] || 0;
              return (
                <li key={key}>
                  <span style={{ minWidth: 110, fontSize: 13 }}>{label}</span>
                  <div className="skill-bar-wrap">
                    <div className="skill-bar-fill" style={{ width: `${pct}%` }} />
                  </div>
                  <span style={{ fontSize: 12, color: "var(--text-muted)", whiteSpace: "nowrap" }}>{SKILL_LABELS[val] || t("common.dash")}</span>
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
            {t("familyDetail.timelineHint")}
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
                  <div className="m-status-col">
                    <div className={`m-badge ${item.status}`}>
                      {item.status === "done" ? t("familyDetail.statusDone") : item.status === "active" ? t("familyDetail.statusActive") : t("familyDetail.statusPending")}
                    </div>
                    {item.auto && <span className="m-auto-badge">{t("familyDetail.autoBadge")}</span>}
                    {item.status === "done" && !item.caseworkerVerified && (
                      <button
                        className="btn btn-sm btn-primary"
                        style={{ fontSize: 11, padding: "3px 10px" }}
                        onClick={() => setMilestoneVerified(item.id, true)}
                      >
                        {t("familyDetail.verify")}
                      </button>
                    )}
                    {item.status === "done" && item.caseworkerVerified && (
                      <span className="m-verified-badge" style={{ cursor: "pointer" }} onClick={() => setMilestoneVerified(item.id, false)} title={t("familyDetail.removeVerificationTitle")}>
                        {t("familyDetail.caseworkerVerified")}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Waitlist Tab */}
      {tab === "waitlist" && (
        <div>
          {!waitlist ? (
            <div className="empty-state">
              <p style={{ color: "var(--text-muted)", fontSize: 14 }}>{t("familyDetail.waitlistEmpty")}</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px,1fr))", gap: 16, marginBottom: 20 }}>
              <div className="card">
                <div className="pcard-label">{t("familyDetail.waitlistStatus")}</div>
                <div className="pcard-value" style={{ textTransform: "capitalize" }}>
                  {t(`waitlist.status_${waitlist.status || "not_started"}`)}
                </div>
                {waitlist.appliedDate && (
                  <div className="pcard-note">{t("familyDetail.waitlistApplied")} {waitlist.appliedDate}</div>
                )}
                {waitlist.clientId && (
                  <div className="pcard-note" style={{ marginTop: 4 }}>ID: {waitlist.clientId}</div>
                )}
              </div>
              <div className="card">
                <div className="pcard-label">{t("familyDetail.waitlistNeeds")}</div>
                <div className="tag-row" style={{ marginTop: 8 }}>
                  {(waitlist.supportNeeds || []).length === 0 && (
                    <span style={{ fontSize: 13, color: "var(--text-muted)" }}>—</span>
                  )}
                  {(waitlist.supportNeeds || []).map((n) => (
                    <span key={n} className="tag tag-teal" style={{ fontSize: 11 }}>
                      {t(`waitlist.need_${n}`)}
                    </span>
                  ))}
                </div>
              </div>
              {waitlist.notes && (
                <div className="card">
                  <div className="pcard-label">{t("familyDetail.waitlistFamilyNotes")}</div>
                  <p style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.7, marginTop: 4 }}>{waitlist.notes}</p>
                </div>
              )}
            </div>
          )}

          <div className="card">
            <div className="pcard-label" style={{ marginBottom: 8 }}>{t("familyDetail.waitlistCwNotesTitle")}</div>
            <textarea
              className="field"
              style={{ width: "100%", marginTop: 4 }}
              rows={4}
              placeholder={t("familyDetail.waitlistCwNotesPlaceholder")}
              value={cwNote}
              onChange={(e) => setCwNote(e.target.value)}
            />
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 10 }}>
              <button className="btn btn-primary btn-sm" onClick={saveCwNote} disabled={cwNoteSaving}>
                {cwNoteSaving ? t("common.saving") : t("common.save")}
              </button>
              {cwNoteSaved && <span style={{ fontSize: 12, color: "var(--success)" }}>✓ {t("familyDetail.waitlistCwNoteSaved")}</span>}
            </div>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 8 }}>
              {t("familyDetail.waitlistCwNotesHint")}
            </p>
          </div>
        </div>
      )}

      {/* Matches Tab */}
      {tab === "matches" && (
        <div>
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="pcard-label">{t("familyDetail.matchNotesTitle")}</div>
            <textarea
              className="field"
              style={{ width: "100%", marginTop: 8 }}
              placeholder={t("familyDetail.matchNotesPlaceholder")}
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
                  {org.hasOpenings && <span className="tag tag-success" style={{ fontSize: 11 }}>{t("familyDetail.available")}</span>}
                  {(org.tags || []).map((tag) => <span key={tag} className="tag tag-teal" style={{ fontSize: 11 }}>{tag}</span>)}
                </div>
              </div>
              <div style={{ flexShrink: 0, textAlign: "right", display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
                <div>
                  <div className="match-score">{org.matchScore}%</div>
                  <div className="match-label">{t("familyDetail.matchScoreLabel")}</div>
                </div>
                <button
                  className={`btn btn-sm ${confirmedMatch?.orgId === org.id ? "btn-primary" : "btn-navy"}`}
                  onClick={() => confirmMatch(org)}
                  disabled={saving}
                >
                  {confirmedMatch?.orgId === org.id ? t("familyDetail.confirmed") : t("familyDetail.confirmMatch")}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
