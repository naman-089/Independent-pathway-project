import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../hooks/useAuth";
import { useLanguage } from "../../hooks/useLanguage";
import { useNavigate } from "react-router-dom";
import { computeReadinessScore } from "../../utils/matching";
import SkeletonPage from "../../components/Skeleton";

const SKILL_PCT = {
  independent:  100,
  reminders:     70,
  some_help:     45,
  full_support:  20,
};

export default function PortfolioPage() {
  const { user, profile } = useAuth();
  const { t }             = useLanguage();
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
  const name      = intake?.individualName || profile?.displayName || t("portfolio.notProvided");
  const initial   = name.charAt(0).toUpperCase();
  const skills    = intake?.skills || {};

  const SKILL_LABELS = {
    independent: t("portfolio.skillIndependent"),
    reminders:   t("portfolio.skillReminders"),
    some_help:   t("portfolio.skillSomeHelp"),
    full_support: t("portfolio.skillFullSupport"),
  };

  const legalTags = [];
  if (intake?.odspRegistered === "yes") legalTags.push({ label: t("portfolio.odspActive"), cls: "tag-success" });
  if (intake?.sdmInPlace === "yes")     legalTags.push({ label: t("portfolio.sdmInPlace"), cls: "tag-success" });
  if (intake?.hensonTrust === "yes")    legalTags.push({ label: t("portfolio.hensonTrust"), cls: "tag-success" });
  if (intake?.odspRegistered === "applied") legalTags.push({ label: t("portfolio.odspPending"), cls: "tag-warn" });

  return (
    <div className="page">
      <div className="portfolio-header">
        <div className="portfolio-avatar">{initial}</div>
        <div className="portfolio-info">
          <h2>{name}</h2>
          <p>{t("portfolio.subtitle")}</p>
          <div className="tag-row">
            <span className="tag tag-teal">
              {t("portfolio.readiness", { score: readiness })}
            </span>
            <span className={`tag ${readiness >= 70 ? "tag-success" : readiness >= 40 ? "tag-warn" : "tag-navy"}`}>
              {readiness >= 70 ? t("portfolio.transitionReady") : readiness >= 40 ? t("portfolio.buildingSkills") : t("portfolio.earlyStage")}
            </span>
            {legalTags.map((tag) => (
              <span key={tag.label} className={`tag ${tag.cls}`}>{tag.label}</span>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px,1fr))", gap: 16 }}>
        {/* Life Skills */}
        <div className="card">
          <div className="pcard-label">{t("portfolio.skillsTitle")}</div>
          <ul className="skill-list">
            {[
              [t("portfolio.skillCooking"),       "cooking"],
              [t("portfolio.skillBudgeting"),     "budgeting"],
              [t("portfolio.skillTransit"),       "transit"],
              [t("portfolio.skillMedication"),    "medication"],
              [t("portfolio.skillHygiene"),       "hygiene"],
              [t("portfolio.skillCommunication"), "communication"],
            ].map(([label, key]) => (
              <li key={key}>
                <span style={{ minWidth: 90, fontSize: 12 }}>{label}</span>
                <div className="skill-bar-wrap">
                  <div className="skill-bar-fill" style={{ width: `${SKILL_PCT[skills[key]] || 0}%` }} />
                </div>
                <span style={{ fontSize: 11, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                  {SKILL_LABELS[skills[key]] || t("portfolio.notProvided")}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Vision & Priorities */}
        <div className="card">
          <div className="pcard-label">{t("portfolio.visionTitle")}</div>
          <p style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.7, marginBottom: 16, fontStyle: "italic" }}>
            "{intake?.visionStatement || t("portfolio.visionEmpty")}"
          </p>
          <div className="pcard-label" style={{ marginTop: 8 }}>{t("portfolio.prioritiesTitle")}</div>
          <div className="tag-row">
            {(intake?.priorities || []).map((p) => (
              <span key={p} className="tag tag-navy" style={{ fontSize: 11 }}>{p}</span>
            ))}
            {!intake?.priorities?.length && <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{t("portfolio.prioritiesEmpty")}</span>}
          </div>
        </div>

        {/* Support Profile */}
        <div className="card">
          <div className="pcard-label">{t("portfolio.supportTitle")}</div>
          <div className="pcard-value" style={{ textTransform: "capitalize" }}>
            {t("portfolio.supportLevel", { level: intake?.supportLevel || t("portfolio.notProvided") })}
          </div>
          <div className="pcard-note" style={{ marginBottom: 16 }}>
            {{ low: t("portfolio.supportLow"), medium: t("portfolio.supportMedium"), high: t("portfolio.supportHigh") }[intake?.supportLevel] || t("portfolio.notProvided")}
          </div>
          <div className="pcard-label">{t("portfolio.housingTitle")}</div>
          <div className="tag-row">
            {(intake?.housingPreferences || []).map((h) => (
              <span key={h} className="tag tag-teal" style={{ fontSize: 11 }}>{h}</span>
            ))}
          </div>
          {intake?.preferredRegion && (
            <>
              <div className="pcard-label" style={{ marginTop: 14 }}>{t("portfolio.regionTitle")}</div>
              <div className="pcard-note">{intake.preferredRegion}</div>
            </>
          )}
        </div>

        {/* Legal & Financial */}
        <div className="card">
          <div className="pcard-label">{t("portfolio.legalTitle")}</div>
          <ul style={{ listStyle: "none", fontSize: 13 }}>
            <li style={{ padding: "6px 0", borderBottom: "0.5px solid var(--border)", display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-muted)" }}>{t("portfolio.odsp")}</span>
              <span style={{ fontWeight: 500 }}>
                {{ yes: t("portfolio.legalActive"), applied: t("portfolio.legalPending"), no: t("portfolio.legalNotApplied"), unsure: t("portfolio.legalUnknown") }[intake?.odspRegistered] || t("portfolio.notProvided")}
              </span>
            </li>
            <li style={{ padding: "6px 0", borderBottom: "0.5px solid var(--border)", display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-muted)" }}>{t("portfolio.sdm")}</span>
              <span style={{ fontWeight: 500 }}>
                {{ yes: t("portfolio.legalInPlace"), in_progress: t("portfolio.legalInProgress"), no: t("portfolio.legalNotYet"), unsure: t("portfolio.legalUnknown") }[intake?.sdmInPlace] || t("portfolio.notProvided")}
              </span>
            </li>
            <li style={{ padding: "6px 0", display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-muted)" }}>{t("portfolio.hensonTrustRow")}</span>
              <span style={{ fontWeight: 500 }}>
                {{ yes: t("portfolio.legalYes"), in_progress: t("portfolio.legalInProgress"), no: t("portfolio.legalNotYet"), unsure: t("portfolio.legalUnknown") }[intake?.hensonTrust] || t("portfolio.notProvided")}
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
          <div className="pcard-label">{t("portfolio.situationTitle")}</div>
          <div className="pcard-value">{intake?.livingSituation || t("portfolio.notProvided")}</div>
          <div className="pcard-note">{t("portfolio.age", { age: intake?.individualAge || t("portfolio.notProvided") })}</div>
          {intake?.caregiverName && (
            <>
              <div className="pcard-label" style={{ marginTop: 14 }}>{t("portfolio.caregiverTitle")}</div>
              <div className="pcard-value">{intake.caregiverName}</div>
            </>
          )}
          {intake?.additionalNotes && (
            <>
              <div className="pcard-label" style={{ marginTop: 14 }}>{t("portfolio.notesTitle")}</div>
              <div className="pcard-note">{intake.additionalNotes}</div>
            </>
          )}
        </div>
      </div>

      <div style={{ marginTop: 24, padding: "16px 0" }}>
        <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
          {t("portfolio.footerNote")}{" "}
          <button
            onClick={() => navigate("/family/intake")}
            className="btn-link" style={{ fontSize: 12 }}
          >
            {t("portfolio.updateIntake")}
          </button>
        </p>
      </div>
    </div>
  );
}
