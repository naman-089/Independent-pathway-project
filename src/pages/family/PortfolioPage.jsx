import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { computeReadinessScore } from "../../utils/matching";
import SkeletonPage from "../../components/Skeleton";

const SKILL_LABELS = {
  independent: "Independent",
  reminders:   "With reminders",
  some_help:   "With some help",
  full_support: "Full support",
};

const SKILL_PCT = {
  independent:  100,
  reminders:     70,
  some_help:     45,
  full_support:  20,
};

export default function PortfolioPage() {
  const { user, profile } = useAuth();
  const navigate          = useNavigate();
  const [intake, setIntake] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const snap = await getDoc(doc(db, "intakes", user.uid));
      if (!snap.exists()) { navigate("/family/intake"); return; }
      setIntake(snap.data());
      setLoading(false);
    }
    load();
  }, [user.uid, navigate]);

  if (loading) return <SkeletonPage />;

  const readiness = computeReadinessScore(intake);
  const name      = intake?.individualName || profile?.displayName || "—";
  const initial   = name.charAt(0).toUpperCase();
  const skills    = intake?.skills || {};

  const legalTags = [];
  if (intake?.odspRegistered === "yes") legalTags.push({ label: "ODSP Active", cls: "tag-success" });
  if (intake?.sdmInPlace === "yes")     legalTags.push({ label: "SDM in Place", cls: "tag-success" });
  if (intake?.hensonTrust === "yes")    legalTags.push({ label: "Henson Trust", cls: "tag-success" });
  if (intake?.odspRegistered === "applied") legalTags.push({ label: "ODSP Pending", cls: "tag-warn" });

  return (
    <div className="page">
      <div className="portfolio-header">
        <div className="portfolio-avatar">{initial}</div>
        <div className="portfolio-info">
          <h2>{name}</h2>
          <p>Independence Profile · Reena Partnership Program</p>
          <div className="tag-row">
            <span className="tag tag-teal">
              Readiness: {readiness}%
            </span>
            <span className={`tag ${readiness >= 70 ? "tag-success" : readiness >= 40 ? "tag-warn" : "tag-navy"}`}>
              {readiness >= 70 ? "Transition Ready" : readiness >= 40 ? "Building Skills" : "Early Stage"}
            </span>
            {legalTags.map((t) => (
              <span key={t.label} className={`tag ${t.cls}`}>{t.label}</span>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px,1fr))", gap: 16 }}>
        {/* Life Skills */}
        <div className="card">
          <div className="pcard-label">Life Skills Assessment</div>
          <ul className="skill-list">
            {[
              ["Cooking",       "cooking"],
              ["Budgeting",     "budgeting"],
              ["Transit",       "transit"],
              ["Medication",    "medication"],
              ["Hygiene",       "hygiene"],
              ["Communication", "communication"],
            ].map(([label, key]) => (
              <li key={key}>
                <span style={{ minWidth: 90, fontSize: 12 }}>{label}</span>
                <div className="skill-bar-wrap">
                  <div className="skill-bar-fill" style={{ width: `${SKILL_PCT[skills[key]] || 0}%` }} />
                </div>
                <span style={{ fontSize: 11, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                  {SKILL_LABELS[skills[key]] || "—"}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Vision & Priorities */}
        <div className="card">
          <div className="pcard-label">Vision Statement</div>
          <p style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.7, marginBottom: 16, fontStyle: "italic" }}>
            "{intake?.visionStatement || "Not yet completed."}"
          </p>
          <div className="pcard-label" style={{ marginTop: 8 }}>Priorities</div>
          <div className="tag-row">
            {(intake?.priorities || []).map((p) => (
              <span key={p} className="tag tag-navy" style={{ fontSize: 11 }}>{p}</span>
            ))}
            {!intake?.priorities?.length && <span style={{ fontSize: 12, color: "var(--text-muted)" }}>None selected</span>}
          </div>
        </div>

        {/* Support Profile */}
        <div className="card">
          <div className="pcard-label">Support Profile</div>
          <div className="pcard-value" style={{ textTransform: "capitalize" }}>
            {intake?.supportLevel || "—"} support level
          </div>
          <div className="pcard-note" style={{ marginBottom: 16 }}>
            {{ low: "Check-ins and reminders only", medium: "Some on-site daily support", high: "Significant daily support needed" }[intake?.supportLevel] || "—"}
          </div>
          <div className="pcard-label">Housing Preferences</div>
          <div className="tag-row">
            {(intake?.housingPreferences || []).map((h) => (
              <span key={h} className="tag tag-teal" style={{ fontSize: 11 }}>{h}</span>
            ))}
          </div>
          {intake?.preferredRegion && (
            <>
              <div className="pcard-label" style={{ marginTop: 14 }}>Preferred Region</div>
              <div className="pcard-note">{intake.preferredRegion}</div>
            </>
          )}
        </div>

        {/* Legal & Financial */}
        <div className="card">
          <div className="pcard-label">Legal & Financial</div>
          <ul style={{ listStyle: "none", fontSize: 13 }}>
            <li style={{ padding: "6px 0", borderBottom: "0.5px solid var(--border)", display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-muted)" }}>ODSP</span>
              <span style={{ fontWeight: 500 }}>
                {{ yes: "✅ Active", applied: "⏳ Pending", no: "Not applied", unsure: "Unknown" }[intake?.odspRegistered] || "—"}
              </span>
            </li>
            <li style={{ padding: "6px 0", borderBottom: "0.5px solid var(--border)", display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-muted)" }}>SDM / Guardianship</span>
              <span style={{ fontWeight: 500 }}>
                {{ yes: "✅ In place", in_progress: "⏳ In progress", no: "Not yet", unsure: "Unknown" }[intake?.sdmInPlace] || "—"}
              </span>
            </li>
            <li style={{ padding: "6px 0", display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-muted)" }}>Henson Trust</span>
              <span style={{ fontWeight: 500 }}>
                {{ yes: "✅ Yes", in_progress: "⏳ In progress", no: "Not yet", unsure: "Unknown" }[intake?.hensonTrust] || "—"}
              </span>
            </li>
          </ul>
          {intake?.legalNotes && (
            <div style={{ marginTop: 12, padding: "10px 12px", background: "var(--off)", borderRadius: "var(--radius-sm)", fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6 }}>
              {intake.legalNotes}
            </div>
          )}
        </div>

        {/* Current Living Situation */}
        <div className="card">
          <div className="pcard-label">Current Situation</div>
          <div className="pcard-value">{intake?.livingSituation || "—"}</div>
          <div className="pcard-note">Age: {intake?.individualAge || "—"}</div>
          {intake?.caregiverName && (
            <>
              <div className="pcard-label" style={{ marginTop: 14 }}>Primary Caregiver</div>
              <div className="pcard-value">{intake.caregiverName}</div>
            </>
          )}
          {intake?.additionalNotes && (
            <>
              <div className="pcard-label" style={{ marginTop: 14 }}>Additional Notes</div>
              <div className="pcard-note">{intake.additionalNotes}</div>
            </>
          )}
        </div>
      </div>

      <div style={{ marginTop: 24, padding: "16px 0" }}>
        <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
          This portfolio is shared with your assigned caseworker at Reena. To update it, redo your intake assessment.{" "}
          <button
            onClick={() => navigate("/family/intake")}
            className="btn-link" style={{ fontSize: 12 }}
          >
            Update intake →
          </button>
        </p>
      </div>
    </div>
  );
}
