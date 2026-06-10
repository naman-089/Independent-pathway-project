import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../hooks/useAuth";
import { useLanguage } from "../../hooks/useLanguage";
import SkeletonPage from "../../components/Skeleton";

const SKILL_OPTIONS = [
  { value: "full_support", labelKey: "intake.skillFullSupport" },
  { value: "some_help",    labelKey: "intake.skillSomeHelp" },
  { value: "reminders",    labelKey: "intake.skillReminders" },
  { value: "independent",  labelKey: "intake.skillIndependent" },
];

// `value` is what gets persisted to Firestore (and shown verbatim to
// caseworkers in FamilyDetail) — keep it as stable English text, and only
// translate the `labelKey` shown to the family filling out the form.
const HOUSING_TYPES = [
  { value: "Own apartment in a supported building", labelKey: "intake.housing1" },
  { value: "Shared home with peers",                labelKey: "intake.housing2" },
  { value: "Small group home",                      labelKey: "intake.housing3" },
  { value: "Intentional community",                 labelKey: "intake.housing4" },
  { value: "Host family / homeshare",               labelKey: "intake.housing5" },
];

const PRIORITIES = [
  { value: "Having friends nearby",   labelKey: "intake.priority1" },
  { value: "Employment",              labelKey: "intake.priority2" },
  { value: "Creative expression",     labelKey: "intake.priority3" },
  { value: "Routine & structure",     labelKey: "intake.priority4" },
  { value: "Community involvement",   labelKey: "intake.priority5" },
  { value: "Cultural connection",     labelKey: "intake.priority6" },
  { value: "Physical activity",       labelKey: "intake.priority7" },
  { value: "Privacy & independence",  labelKey: "intake.priority8" },
];

const REGIONS = [
  { value: "Toronto (GTA)",            labelKey: "intake.region1" },
  { value: "North York",               labelKey: "intake.region2" },
  { value: "Thornhill / Vaughan",      labelKey: "intake.region3" },
  { value: "Scarborough",              labelKey: "intake.region4" },
  { value: "Etobicoke / Mississauga",  labelKey: "intake.region5" },
  { value: "York Region",              labelKey: "intake.region6" },
  { value: "Durham Region",            labelKey: "intake.region7" },
  { value: "Other Ontario",            labelKey: "intake.region8" },
];

const EMPTY_FORM = {
  individualName: "",
  individualAge:  "",
  caregiverName:  "",
  livingSituation: "",
  visionStatement: "",
  priorities: [],
  skills: { cooking: "", budgeting: "", transit: "", medication: "", hygiene: "", communication: "" },
  sdmInPlace:      "",
  odspRegistered:  "",
  hensonTrust:     "",
  legalNotes:      "",
  supportLevel:       "",
  housingPreferences: [],
  preferredRegion:    "",
  additionalNotes:    "",
};

function SkillSelect({ label, field, value, onChange, t }) {
  return (
    <div className="field">
      <label>{label}</label>
      <select value={value || ""} onChange={(e) => onChange(field, e.target.value)}>
        <option value="">{t("intake.skillSelectPlaceholder")}</option>
        {SKILL_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{t(o.labelKey)}</option>
        ))}
      </select>
    </div>
  );
}

function Chip({ label, selected, onToggle }) {
  return (
    <div
      className={`chip${selected ? " selected" : ""}`}
      onClick={onToggle}
      onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); onToggle(); } }}
      tabIndex={0}
      role="checkbox"
      aria-checked={selected}
    >
      {label}
    </div>
  );
}

export default function IntakePage() {
  const { user, profile } = useAuth();
  const { t }             = useLanguage();
  const navigate          = useNavigate();
  const [step, setStep]   = useState(1);
  const [saving, setSaving]     = useState(false);
  const [loadingDraft, setLoadingDraft] = useState(true);
  const [existingStatus, setExistingStatus] = useState(null);
  const [error, setError]       = useState("");

  const [form, setForm] = useState({ ...EMPTY_FORM, individualName: profile?.displayName || "" });

  // Load any existing draft or submission on mount
  useEffect(() => {
    async function loadDraft() {
      try {
        const snap = await getDoc(doc(db, "intakes", user.uid));
        if (snap.exists()) {
          const data = snap.data();
          setExistingStatus(data.status || "draft");
          setForm({
            individualName:     data.individualName  || profile?.displayName || "",
            individualAge:      data.individualAge   || "",
            caregiverName:      data.caregiverName   || "",
            livingSituation:    data.livingSituation || "",
            visionStatement:    data.visionStatement || "",
            priorities:         data.priorities      || [],
            skills:             data.skills          || EMPTY_FORM.skills,
            sdmInPlace:         data.sdmInPlace      || "",
            odspRegistered:     data.odspRegistered  || "",
            hensonTrust:        data.hensonTrust     || "",
            legalNotes:         data.legalNotes      || "",
            supportLevel:       data.supportLevel    || "",
            housingPreferences: data.housingPreferences || [],
            preferredRegion:    data.preferredRegion || "",
            additionalNotes:    data.additionalNotes || "",
          });
        }
      } catch (err) {
        console.warn("Could not load draft:", err);
      } finally {
        setLoadingDraft(false);
      }
    }
    loadDraft();
  }, [user.uid]);

  const TOTAL_STEPS = 5;
  const progress = (step / TOTAL_STEPS) * 100;

  function setField(key, value) { setForm((f) => ({ ...f, [key]: value })); }
  function setSkill(field, value) { setForm((f) => ({ ...f, skills: { ...f.skills, [field]: value } })); }
  function toggleArr(key, value) {
    setForm((f) => ({
      ...f,
      [key]: f[key].includes(value) ? f[key].filter((v) => v !== value) : [...f[key], value],
    }));
  }

  function saveDraft(currentForm) {
    // Fire-and-forget draft save — doesn't block navigation
    setDoc(
      doc(db, "intakes", user.uid),
      { ...currentForm, uid: user.uid, status: existingStatus === "submitted" ? "submitted" : "draft", savedAt: serverTimestamp() },
      { merge: true }
    ).catch(console.warn);
  }

  function nextStep() {
    saveDraft(form);
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
    window.scrollTo(0, 0);
  }

  function prevStep() {
    saveDraft(form);
    setStep((s) => Math.max(s - 1, 1));
    window.scrollTo(0, 0);
  }

  async function handleSubmit() {
    setSaving(true); setError("");
    try {
      await setDoc(doc(db, "intakes", user.uid), {
        ...form,
        uid:         user.uid,
        submittedAt: serverTimestamp(),
        status:      "submitted",
      }, { merge: true });
      await setDoc(doc(db, "users", user.uid), { intakeComplete: true }, { merge: true });
      navigate("/family/timeline");
    } catch (err) {
      setError(t("intake.submitError", { message: err.message }));
    } finally {
      setSaving(false);
    }
  }

  if (loadingDraft) return <SkeletonPage />;

  const isEditing = existingStatus === "submitted";

  return (
    <div className="page">
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <div className="intake-progress-bar">
          <div className="intake-progress-fill" style={{ width: `${progress}%` }} />
        </div>

        {isEditing && (
          <div className="alert alert-warn" style={{ marginBottom: 20 }}>
            {t("intake.editingNotice")}
          </div>
        )}

        {/* ── STEP 1 ── */}
        {step === 1 && (
          <div>
            <p className="step-eyebrow">{t("intake.step1Eyebrow")}</p>
            <h2 className="step-title">{t("intake.step1Title")}</h2>
            <p className="step-sub">{t("intake.step1Sub")}</p>
            <div className="field">
              <label>{t("intake.nameLabel")}</label>
              <input type="text" placeholder={t("intake.namePlaceholder")} value={form.individualName} onChange={(e) => setField("individualName", e.target.value)} />
            </div>
            <div className="field">
              <label>{t("intake.ageLabel")}</label>
              <input type="number" placeholder={t("intake.agePlaceholder")} min={1} max={99} value={form.individualAge} onChange={(e) => setField("individualAge", e.target.value)} />
            </div>
            <div className="field">
              <label>{t("intake.caregiverLabel")}</label>
              <input type="text" placeholder={t("intake.caregiverPlaceholder")} value={form.caregiverName} onChange={(e) => setField("caregiverName", e.target.value)} />
            </div>
            <div className="field">
              <label>{t("intake.livingSituationLabel")}</label>
              <select value={form.livingSituation} onChange={(e) => setField("livingSituation", e.target.value)}>
                <option value="">{t("common.select")}</option>
                <option>{t("intake.livingFamily")}</option>
                <option>{t("intake.livingGroupHome")}</option>
                <option>{t("intake.livingSupportedApt")}</option>
                <option>{t("intake.livingHospital")}</option>
                <option>{t("intake.livingOther")}</option>
              </select>
            </div>
            <div className="step-actions">
              <button className="btn btn-primary" onClick={nextStep}>{t("common.continue")}</button>
            </div>
          </div>
        )}

        {/* ── STEP 2 ── */}
        {step === 2 && (
          <div>
            <p className="step-eyebrow">{t("intake.step2Eyebrow")}</p>
            <h2 className="step-title">{t("intake.step2Title")}</h2>
            <p className="step-sub">{t("intake.step2Sub")}</p>
            <div className="field">
              <label>{t("intake.visionLabel")}</label>
              <textarea placeholder={t("intake.visionPlaceholder")}
                value={form.visionStatement} onChange={(e) => setField("visionStatement", e.target.value)} />
            </div>
            <div className="field">
              <label>{t("intake.prioritiesLabel")}</label>
              <div className="chip-group">
                {PRIORITIES.map((p) => (
                  <Chip key={p.value} label={t(p.labelKey)} selected={form.priorities.includes(p.value)} onToggle={() => toggleArr("priorities", p.value)} />
                ))}
              </div>
            </div>
            <div className="step-actions">
              <button className="btn btn-secondary" onClick={prevStep}>{t("common.back")}</button>
              <button className="btn btn-primary" onClick={nextStep}>{t("common.continue")}</button>
            </div>
          </div>
        )}

        {/* ── STEP 3 ── */}
        {step === 3 && (
          <div>
            <p className="step-eyebrow">{t("intake.step3Eyebrow")}</p>
            <h2 className="step-title">{t("intake.step3Title")}</h2>
            <p className="step-sub">{t("intake.step3Sub")}</p>
            <SkillSelect t={t} label={t("intake.skillCooking")}       field="cooking"        value={form.skills.cooking}        onChange={setSkill} />
            <SkillSelect t={t} label={t("intake.skillBudgeting")}     field="budgeting"      value={form.skills.budgeting}      onChange={setSkill} />
            <SkillSelect t={t} label={t("intake.skillTransit")}       field="transit"        value={form.skills.transit}        onChange={setSkill} />
            <SkillSelect t={t} label={t("intake.skillMedication")}    field="medication"     value={form.skills.medication}     onChange={setSkill} />
            <SkillSelect t={t} label={t("intake.skillHygiene")}       field="hygiene"        value={form.skills.hygiene}        onChange={setSkill} />
            <SkillSelect t={t} label={t("intake.skillCommunication")} field="communication"  value={form.skills.communication}  onChange={setSkill} />
            <div className="step-actions">
              <button className="btn btn-secondary" onClick={prevStep}>{t("common.back")}</button>
              <button className="btn btn-primary" onClick={nextStep}>{t("common.continue")}</button>
            </div>
          </div>
        )}

        {/* ── STEP 4 ── */}
        {step === 4 && (
          <div>
            <p className="step-eyebrow">{t("intake.step4Eyebrow")}</p>
            <h2 className="step-title">{t("intake.step4Title")}</h2>
            <p className="step-sub">{t("intake.step4Sub")}</p>
            <div className="field">
              <label>{t("intake.sdmLabel")}</label>
              <select value={form.sdmInPlace} onChange={(e) => setField("sdmInPlace", e.target.value)}>
                <option value="">{t("common.select")}</option>
                <option value="yes">{t("intake.sdmYes")}</option>
                <option value="in_progress">{t("intake.sdmInProgress")}</option>
                <option value="no">{t("intake.sdmNo")}</option>
                <option value="unsure">{t("intake.sdmUnsure")}</option>
              </select>
            </div>
            <div className="field">
              <label>{t("intake.odspLabel")}</label>
              <select value={form.odspRegistered} onChange={(e) => setField("odspRegistered", e.target.value)}>
                <option value="">{t("common.select")}</option>
                <option value="yes">{t("intake.odspYes")}</option>
                <option value="applied">{t("intake.odspApplied")}</option>
                <option value="no">{t("intake.odspNo")}</option>
                <option value="unsure">{t("intake.odspUnsure")}</option>
              </select>
            </div>
            <div className="field">
              <label>{t("intake.hensonLabel")}</label>
              <select value={form.hensonTrust} onChange={(e) => setField("hensonTrust", e.target.value)}>
                <option value="">{t("common.select")}</option>
                <option value="yes">{t("intake.hensonYes")}</option>
                <option value="in_progress">{t("intake.hensonInProgress")}</option>
                <option value="no">{t("intake.hensonNo")}</option>
                <option value="unsure">{t("intake.hensonUnsure")}</option>
              </select>
            </div>
            <div className="field">
              <label>{t("intake.legalNotesLabel")}</label>
              <textarea placeholder={t("intake.legalNotesPlaceholder")} value={form.legalNotes} onChange={(e) => setField("legalNotes", e.target.value)} />
            </div>
            <div className="step-actions">
              <button className="btn btn-secondary" onClick={prevStep}>{t("common.back")}</button>
              <button className="btn btn-primary" onClick={nextStep}>{t("common.continue")}</button>
            </div>
          </div>
        )}

        {/* ── STEP 5 ── */}
        {step === 5 && (
          <div>
            <p className="step-eyebrow">{t("intake.step5Eyebrow")}</p>
            <h2 className="step-title">{t("intake.step5Title")}</h2>
            <p className="step-sub">{t("intake.step5Sub")}</p>
            <div className="field">
              <label>{t("intake.supportLabel")}</label>
              <select value={form.supportLevel} onChange={(e) => setField("supportLevel", e.target.value)}>
                <option value="">{t("common.select")}</option>
                <option value="low">{t("intake.supportLow")}</option>
                <option value="medium">{t("intake.supportMedium")}</option>
                <option value="high">{t("intake.supportHigh")}</option>
              </select>
            </div>
            <div className="field">
              <label>{t("intake.housingLabel")}</label>
              <div className="chip-group">
                {HOUSING_TYPES.map((h) => (
                  <Chip key={h.value} label={t(h.labelKey)} selected={form.housingPreferences.includes(h.value)} onToggle={() => toggleArr("housingPreferences", h.value)} />
                ))}
              </div>
            </div>
            <div className="field">
              <label>{t("intake.regionLabel")}</label>
              <select value={form.preferredRegion} onChange={(e) => setField("preferredRegion", e.target.value)}>
                <option value="">{t("common.select")}</option>
                {REGIONS.map((r) => <option key={r.value} value={r.value}>{t(r.labelKey)}</option>)}
              </select>
            </div>
            <div className="field">
              <label>{t("intake.notesLabel")}</label>
              <textarea placeholder={t("intake.notesPlaceholder")} value={form.additionalNotes} onChange={(e) => setField("additionalNotes", e.target.value)} />
            </div>

            {error && <div className="alert alert-danger">{error}</div>}

            <div className="step-actions">
              <button className="btn btn-secondary" onClick={prevStep}>{t("common.back")}</button>
              <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
                {saving ? t("intake.saving") : isEditing ? t("intake.update") : t("intake.generate")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
