import { useEffect, useState, useRef } from "react";
import { doc, onSnapshot, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../hooks/useAuth";
import { useLanguage } from "../../hooks/useLanguage";

const STATUSES = ["not_started", "in_progress", "submitted", "active"];
const SUPPORT_NEEDS = ["community_participation", "sil", "group_living", "complex_needs"];

const STATUS_COLORS = {
  not_started: "var(--text-muted)",
  in_progress: "var(--warn)",
  submitted:   "var(--teal)",
  active:      "var(--success)",
};

export default function WaitlistPage() {
  const { user } = useAuth();
  const { t }    = useLanguage();

  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [savedAt, setSavedAt] = useState(null);

  const [clientId, setClientId]       = useState("");
  const [status, setStatus]           = useState("not_started");
  const [appliedDate, setAppliedDate] = useState("");
  const [needs, setNeeds]             = useState([]);
  const [notes, setNotes]             = useState("");

  const initialized = useRef(false);

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, "waitlists", user.uid), (snap) => {
      const d = snap.exists() ? snap.data() : null;
      setData(d);
      if (!initialized.current) {
        initialized.current = true;
        if (d) {
          setClientId(d.clientId   || "");
          setStatus(d.status       || "not_started");
          setAppliedDate(d.appliedDate || "");
          setNeeds(d.supportNeeds  || []);
          setNotes(d.notes         || "");
        }
      }
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, [user]);

  function toggleNeed(n) {
    setNeeds((prev) => prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    await setDoc(doc(db, "waitlists", user.uid), {
      clientId,
      status,
      appliedDate,
      supportNeeds: needs,
      notes,
      updatedAt: serverTimestamp(),
      caseworkerNotes: data?.caseworkerNotes || "",
    }, { merge: true });
    setSaving(false);
    setSavedAt(new Date());
  }

  if (loading) {
    return <div className="page"><p style={{ color: "var(--text-muted)" }}>{t("common.loading")}</p></div>;
  }

  const statusColor = STATUS_COLORS[status] || "var(--text-muted)";

  return (
    <div className="page">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--navy)", marginBottom: 6 }}>
          {t("waitlist.title")}
        </h1>
        <p style={{ fontSize: 14, color: "var(--text-muted)" }}>
          {t("waitlist.subtitle")}
        </p>
      </div>

      {/* Status banner */}
      <div className="card" style={{ marginBottom: 20, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <div style={{
          width: 12, height: 12, borderRadius: "50%",
          background: statusColor, flexShrink: 0,
        }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{t(`waitlist.status_${status}`)}</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{t("waitlist.dsoFullName")}</div>
        </div>
        {data?.updatedAt && (
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
            {t("waitlist.lastUpdated")}{" "}
            {data.updatedAt.toDate?.().toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" }) || "—"}
          </div>
        )}
      </div>

      <form onSubmit={handleSave}>
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 14, color: "var(--navy)" }}>
            {t("waitlist.registrationSection")}
          </div>

          <div className="field">
            <label>{t("waitlist.clientIdLabel")}</label>
            <input
              type="text"
              placeholder={t("waitlist.clientIdPlaceholder")}
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
            />
            <p className="field-hint">{t("waitlist.clientIdHint")}</p>
          </div>

          <div className="field">
            <label>{t("waitlist.statusLabel")}</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
              {STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  style={{
                    padding: "7px 14px",
                    borderRadius: "var(--radius-sm)",
                    border: `2px solid ${status === s ? STATUS_COLORS[s] : "var(--border)"}`,
                    background: status === s ? `${STATUS_COLORS[s]}18` : "var(--white)",
                    color: status === s ? STATUS_COLORS[s] : "var(--text-muted)",
                    fontWeight: status === s ? 700 : 400,
                    fontSize: 13, cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  {t(`waitlist.status_${s}`)}
                </button>
              ))}
            </div>
          </div>

          {(status === "submitted" || status === "active") && (
            <div className="field">
              <label>{t("waitlist.appliedDateLabel")}</label>
              <input
                type="date"
                value={appliedDate}
                onChange={(e) => setAppliedDate(e.target.value)}
              />
            </div>
          )}
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 14, color: "var(--navy)" }}>
            {t("waitlist.supportNeedsSection")}
          </div>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 12 }}>
            {t("waitlist.supportNeedsSub")}
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px,1fr))", gap: 10 }}>
            {SUPPORT_NEEDS.map((n) => (
              <label
                key={n}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 14px", borderRadius: "var(--radius-sm)",
                  border: `2px solid ${needs.includes(n) ? "var(--accent)" : "var(--border)"}`,
                  background: needs.includes(n) ? "var(--accent-pale)" : "var(--white)",
                  cursor: "pointer", fontSize: 13, fontWeight: needs.includes(n) ? 600 : 400,
                  transition: "all 0.15s",
                }}
              >
                <input
                  type="checkbox"
                  checked={needs.includes(n)}
                  onChange={() => toggleNeed(n)}
                  style={{ accentColor: "var(--accent)", width: 15, height: 15 }}
                />
                {t(`waitlist.need_${n}`)}
              </label>
            ))}
          </div>
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          <div className="field" style={{ margin: 0 }}>
            <label>{t("waitlist.notesLabel")}</label>
            <textarea
              rows={4}
              placeholder={t("waitlist.notesPlaceholder")}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{ width: "100%", marginTop: 6 }}
            />
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? t("common.saving") : t("waitlist.save")}
          </button>
          {savedAt && !saving && (
            <span style={{ fontSize: 12, color: "var(--success)" }}>
              ✓ {t("waitlist.savedAt")} {savedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
        </div>
      </form>

      {data?.caseworkerNotes && (
        <div className="card" style={{ marginTop: 20, borderLeft: "3px solid var(--teal)" }}>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, color: "var(--teal)" }}>
            {t("waitlist.caseworkerNotesTitle")}
          </div>
          <p style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.7 }}>
            {data.caseworkerNotes}
          </p>
        </div>
      )}

      <div className="card" style={{ marginTop: 20, background: "var(--off)", border: "none" }}>
        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10, color: "var(--navy)" }}>
          {t("waitlist.infoTitle")}
        </div>
        <ul style={{ paddingLeft: 16, fontSize: 13, color: "var(--text-muted)", lineHeight: 2 }}>
          <li>{t("waitlist.info1")}</li>
          <li>{t("waitlist.info2")}</li>
          <li>{t("waitlist.info3")}</li>
          <li>{t("waitlist.info4")}</li>
        </ul>
      </div>
    </div>
  );
}
