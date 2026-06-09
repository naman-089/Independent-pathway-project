import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useLanguage } from "../../hooks/useLanguage";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase";

const PATH_KEY = "ipp_family_path";

export default function FamilyHome() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [match, setMatch] = useState(null);
  const [path, setPath] = useState(() => localStorage.getItem(PATH_KEY) || null);

  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, "matches", user.uid))
      .then((snap) => { if (snap.exists()) setMatch(snap.data()); })
      .catch(() => {});
  }, [user]);

  function choosePath(p) {
    localStorage.setItem(PATH_KEY, p);
    setPath(p);
  }

  function resetPath() {
    localStorage.removeItem(PATH_KEY);
    setPath(null);
  }

  const matchText = match
    ? t("familyHome.matchConfirmed", { org: "{{org}}", score: match.score })
    : "";
  const [matchPrefix, matchSuffix] = match ? matchText.split("{{org}}") : [];

  const MatchBanner = match && (
    <div className="alert alert-success" style={{ marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
      <span>
        {matchPrefix}<strong>{match.orgName}</strong>{matchSuffix}
      </span>
      <button className="btn btn-sm btn-secondary" onClick={() => navigate("/family/resources")}>
        {t("familyHome.viewResources")}
      </button>
    </div>
  );

  if (!path) {
    return (
      <div className="page">
        {MatchBanner}
        <div style={{ textAlign: "center", maxWidth: 540, margin: "40px auto 0" }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: "var(--accent)", textTransform: "uppercase", marginBottom: 14 }}>
            {t("familyHome.heroBadge")}
          </div>
          <h1 style={{ fontSize: 30, fontWeight: 900, color: "var(--navy)", lineHeight: 1.2, marginBottom: 14 }}>
            {t("familyHome.ageGateQuestion")}
          </h1>
          <p style={{ fontSize: 15, color: "var(--text-muted)", marginBottom: 36, lineHeight: 1.6 }}>
            {t("familyHome.ageGateSubtitle")}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {[
              { key: "teen",       icon: "🎓", label: t("familyHome.pathTeen"),       desc: t("familyHome.pathTeenDesc") },
              { key: "adult",      icon: "🏠", label: t("familyHome.pathAdult"),      desc: t("familyHome.pathAdultDesc") },
              { key: "registered", icon: "✅", label: t("familyHome.pathRegistered"), desc: t("familyHome.pathRegisteredDesc") },
            ].map(({ key, icon, label, desc }) => (
              <PathCard key={key} icon={icon} label={label} desc={desc} onClick={() => choosePath(key)} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      {MatchBanner}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 10 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--navy)", margin: 0 }}>
          {path === "teen"       && t("familyHome.pathTeen")}
          {path === "adult"      && t("familyHome.pathAdult")}
          {path === "registered" && t("familyHome.pathRegistered")}
        </h1>
        <button className="btn btn-secondary btn-sm" onClick={resetPath}>{t("familyHome.changePath")}</button>
      </div>

      {path === "teen"       && <TeenPath t={t} navigate={navigate} />}
      {path === "adult"      && <AdultPath t={t} navigate={navigate} />}
      {path === "registered" && <RegisteredPath t={t} navigate={navigate} />}
    </div>
  );
}

function PathCard({ icon, label, desc, onClick }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "18px 22px",
        background: "var(--white)",
        border: `2px solid ${hover ? "var(--accent)" : "var(--border)"}`,
        borderRadius: 14,
        cursor: "pointer",
        textAlign: "left",
        transition: "border-color 0.15s, box-shadow 0.15s",
        boxShadow: hover ? "0 4px 18px rgba(0,0,0,0.09)" : "none",
        width: "100%",
      }}
    >
      <span style={{ fontSize: 30, flexShrink: 0 }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 16, color: "var(--navy)", marginBottom: 4 }}>{label}</div>
        <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>{desc}</div>
      </div>
      <span style={{ color: "var(--accent)", fontSize: 18, flexShrink: 0 }}>→</span>
    </button>
  );
}

function Section({ title, children }) {
  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div style={{ fontWeight: 700, fontSize: 11, color: "var(--navy)", marginBottom: 14, textTransform: "uppercase", letterSpacing: 1 }}>{title}</div>
      {children}
    </div>
  );
}

function Step({ num, title, desc, action, onAction }) {
  return (
    <div style={{ display: "flex", gap: 14, padding: "12px 0", borderBottom: "1px solid var(--border)" }}>
      <div style={{ width: 26, height: 26, borderRadius: "50%", background: "var(--accent)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0, marginTop: 2 }}>
        {num}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text)" }}>{title}</div>
        {desc && <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4, lineHeight: 1.6 }}>{desc}</div>}
      </div>
      {action && (
        <button className="btn btn-sm btn-navy" onClick={onAction} style={{ flexShrink: 0, alignSelf: "center" }}>
          {action}
        </button>
      )}
    </div>
  );
}

function TeenPath({ t, navigate }) {
  return (
    <>
      <Section title={t("familyHome.teenSection1Title")}>
        <Step num={1} title={t("familyHome.teenStep1")} desc={t("familyHome.teenStep1Desc")} action={t("familyHome.startIntake")} onAction={() => navigate("/family/intake")} />
        <Step num={2} title={t("familyHome.teenStep2")} desc={t("familyHome.teenStep2Desc")} />
        <Step num={3} title={t("familyHome.teenStep3")} desc={t("familyHome.teenStep3Desc")} />
      </Section>
      <Section title={t("familyHome.teenSection2Title")}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 10 }}>
          {[
            { icon: "📋", label: t("familyHome.docBirthCert") },
            { icon: "🏥", label: t("familyHome.docDiagnosis") },
            { icon: "🏫", label: t("familyHome.docIEP") },
            { icon: "⚖️", label: t("familyHome.docSDM") },
            { icon: "💰", label: t("familyHome.docODSP") },
          ].map(({ icon, label }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "var(--off)", borderRadius: 10, fontSize: 13, color: "var(--text)" }}>
              <span>{icon}</span>{label}
            </div>
          ))}
        </div>
      </Section>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <button className="btn btn-primary" onClick={() => navigate("/family/timeline")}>{t("familyHome.viewMyTimeline")}</button>
        <button className="btn btn-secondary" onClick={() => navigate("/family/resources")}>{t("familyHome.exploreResources")}</button>
      </div>
    </>
  );
}

function AdultPath({ t, navigate }) {
  return (
    <>
      <Section title={t("familyHome.adultSection1Title")}>
        <Step num={1} title={t("familyHome.adultStep1")} desc={t("familyHome.adultStep1Desc")} />
        <Step num={2} title={t("familyHome.adultStep2")} desc={t("familyHome.adultStep2Desc")} action={t("familyHome.startIntake")} onAction={() => navigate("/family/intake")} />
        <Step num={3} title={t("familyHome.adultStep3")} desc={t("familyHome.adultStep3Desc")} />
        <Step num={4} title={t("familyHome.adultStep4")} desc={t("familyHome.adultStep4Desc")} />
      </Section>
      <Section title={t("familyHome.adultSection2Title")}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[
            { emoji: "🏦", bold: t("familyHome.passportWhat"), body: t("familyHome.passportWhatDesc") },
            { emoji: "✅", bold: t("familyHome.passportWho"),  body: t("familyHome.passportWhoDesc") },
            { emoji: "💡", bold: t("familyHome.passportUse"),  body: t("familyHome.passportUseDesc") },
          ].map(({ emoji, bold, body }) => (
            <div key={bold} style={{ fontSize: 13, lineHeight: 1.7, color: "var(--text)" }}>
              {emoji} <strong>{bold}</strong> {body}
            </div>
          ))}
        </div>
      </Section>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <button className="btn btn-primary" onClick={() => navigate("/family/resources")}>{t("familyHome.exploreDayPrograms")}</button>
        <button className="btn btn-secondary" onClick={() => navigate("/family/timeline")}>{t("familyHome.viewTimeline")}</button>
      </div>
    </>
  );
}

function RegisteredPath({ t, navigate }) {
  return (
    <>
      <Section title={t("familyHome.registeredSection1Title")}>
        <Step num={1} title={t("familyHome.regStep1")} desc={t("familyHome.regStep1Desc")} action={t("familyHome.viewResources")} onAction={() => navigate("/family/resources")} />
        <Step num={2} title={t("familyHome.regStep2")} desc={t("familyHome.regStep2Desc")} />
        <Step num={3} title={t("familyHome.regStep3")} desc={t("familyHome.regStep3Desc")} />
      </Section>
      <Section title={t("familyHome.registeredSection2Title")}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[
            { emoji: "💰", bold: t("familyHome.passportSpend1"), body: t("familyHome.passportSpend1Desc") },
            { emoji: "🎯", bold: t("familyHome.passportSpend2"), body: t("familyHome.passportSpend2Desc") },
            { emoji: "📋", bold: t("familyHome.passportSpend3"), body: t("familyHome.passportSpend3Desc") },
          ].map(({ emoji, bold, body }) => (
            <div key={bold} style={{ fontSize: 13, lineHeight: 1.7, color: "var(--text)" }}>
              {emoji} <strong>{bold}</strong> {body}
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}
