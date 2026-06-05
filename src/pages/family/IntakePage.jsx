import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../hooks/useAuth";

const SKILL_OPTIONS = [
  { value: "full_support", label: "I need full support" },
  { value: "some_help",    label: "I can do some with help" },
  { value: "reminders",    label: "I manage with reminders" },
  { value: "independent",  label: "I do this independently" },
];

const HOUSING_TYPES = [
  "Own apartment in a supported building",
  "Shared home with peers",
  "Small group home",
  "Intentional community",
  "Host family / homeshare",
];

const PRIORITIES = [
  "Having friends nearby",
  "Employment",
  "Creative expression",
  "Routine & structure",
  "Community involvement",
  "Cultural connection",
  "Physical activity",
  "Privacy & independence",
];

const REGIONS = [
  "Toronto (GTA)",
  "North York",
  "Thornhill / Vaughan",
  "Scarborough",
  "Etobicoke / Mississauga",
  "York Region",
  "Durham Region",
  "Other Ontario",
];

function SkillSelect({ label, field, value, onChange }) {
  return (
    <div className="field">
      <label>{label}</label>
      <select value={value || ""} onChange={(e) => onChange(field, e.target.value)}>
        <option value="">Select…</option>
        {SKILL_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

function Chip({ label, selected, onToggle }) {
  return (
    <div className={`chip${selected ? " selected" : ""}`} onClick={onToggle}>
      {label}
    </div>
  );
}

export default function IntakePage() {
  const { user, profile } = useAuth();
  const navigate          = useNavigate();
  const [step, setStep]   = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  const [form, setForm] = useState({
    // Step 1 – About
    individualName: profile?.displayName || "",
    individualAge:  "",
    caregiverName:  "",
    livingSituation: "",
    // Step 2 – Vision
    visionStatement: "",
    priorities: [],
    // Step 3 – Skills
    skills: {
      cooking: "", budgeting: "", transit: "",
      medication: "", hygiene: "", communication: "",
    },
    // Step 4 – Legal & Financial
    sdmInPlace:      "",
    odspRegistered:  false,
    hensonTrust:     "",
    legalNotes:      "",
    // Step 5 – Support
    supportLevel:       "",
    housingPreferences: [],
    preferredRegion:    "",
    additionalNotes:    "",
  });

  const TOTAL_STEPS = 5;
  const progress = (step / TOTAL_STEPS) * 100;

  function setField(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function setSkill(field, value) {
    setForm((f) => ({ ...f, skills: { ...f.skills, [field]: value } }));
  }

  function toggleArr(key, value) {
    setForm((f) => ({
      ...f,
      [key]: f[key].includes(value)
        ? f[key].filter((v) => v !== value)
        : [...f[key], value],
    }));
  }

  function nextStep() { setStep((s) => Math.min(s + 1, TOTAL_STEPS)); window.scrollTo(0,0); }
  function prevStep() { setStep((s) => Math.max(s - 1, 1)); window.scrollTo(0,0); }

  async function handleSubmit() {
    setSaving(true); setError("");
    try {
      const intakeData = {
        ...form,
        uid:        user.uid,
        submittedAt: serverTimestamp(),
        status:     "submitted",
      };
      await setDoc(doc(db, "intakes", user.uid), intakeData);
      // mark user profile as intake complete
      await setDoc(doc(db, "users", user.uid), { intakeComplete: true }, { merge: true });
      navigate("/family/timeline");
    } catch (err) {
      setError("Failed to save: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page">
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <div className="intake-progress-bar">
          <div className="intake-progress-fill" style={{ width: `${progress}%` }} />
        </div>

        {/* ── STEP 1 ── */}
        {step === 1 && (
          <div>
            <p className="step-eyebrow">Step 1 of 5 — About You</p>
            <h2 className="step-title">Let's start with the basics</h2>
            <p className="step-sub">
              This profile helps us personalize your pathway. All information is
              private and shared only with your caseworker.
            </p>
            <div className="field">
              <label>Individual's full name</label>
              <input type="text" placeholder="e.g. Jordan Chen" value={form.individualName} onChange={(e) => setField("individualName", e.target.value)} />
            </div>
            <div className="field">
              <label>Age</label>
              <input type="number" placeholder="e.g. 24" min={1} max={99} value={form.individualAge} onChange={(e) => setField("individualAge", e.target.value)} />
            </div>
            <div className="field">
              <label>Primary caregiver name</label>
              <input type="text" placeholder="e.g. Linda Chen" value={form.caregiverName} onChange={(e) => setField("caregiverName", e.target.value)} />
            </div>
            <div className="field">
              <label>Current living situation</label>
              <select value={form.livingSituation} onChange={(e) => setField("livingSituation", e.target.value)}>
                <option value="">Select…</option>
                <option>Living with family</option>
                <option>Group home</option>
                <option>Supported apartment</option>
                <option>Hospital / long-term care</option>
                <option>Other</option>
              </select>
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 28 }}>
              <button className="btn btn-primary" onClick={nextStep}>Continue →</button>
            </div>
          </div>
        )}

        {/* ── STEP 2 ── */}
        {step === 2 && (
          <div>
            <p className="step-eyebrow">Step 2 of 5 — Vision & Goals</p>
            <h2 className="step-title">What does independence look like?</h2>
            <p className="step-sub">
              There's no single definition. Tell us what matters most — we'll
              shape the pathway around it.
            </p>
            <div className="field">
              <label>Describe your vision for independent living</label>
              <textarea
                placeholder="e.g. I want to have my own apartment, cook my own meals, go to work..."
                value={form.visionStatement}
                onChange={(e) => setField("visionStatement", e.target.value)}
              />
            </div>
            <div className="field">
              <label>What matters most in daily life? (select all that apply)</label>
              <div className="chip-group">
                {PRIORITIES.map((p) => (
                  <Chip
                    key={p} label={p}
                    selected={form.priorities.includes(p)}
                    onToggle={() => toggleArr("priorities", p)}
                  />
                ))}
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 28 }}>
              <button className="btn btn-secondary" onClick={prevStep}>← Back</button>
              <button className="btn btn-primary" onClick={nextStep}>Continue →</button>
            </div>
          </div>
        )}

        {/* ── STEP 3 ── */}
        {step === 3 && (
          <div>
            <p className="step-eyebrow">Step 3 of 5 — Life Skills</p>
            <h2 className="step-title">Everyday independence skills</h2>
            <p className="step-sub">
              Rate your current comfort level. There are no wrong answers —
              this builds your readiness score and shapes your milestones.
            </p>
            <SkillSelect label="Cooking & meal preparation" field="cooking"       value={form.skills.cooking}       onChange={setSkill} />
            <SkillSelect label="Managing money & budgeting"  field="budgeting"    value={form.skills.budgeting}     onChange={setSkill} />
            <SkillSelect label="Using public transportation"  field="transit"     value={form.skills.transit}       onChange={setSkill} />
            <SkillSelect label="Managing health & medications" field="medication" value={form.skills.medication}    onChange={setSkill} />
            <SkillSelect label="Personal hygiene & self-care" field="hygiene"    value={form.skills.hygiene}       onChange={setSkill} />
            <SkillSelect label="Communication & social skills" field="communication" value={form.skills.communication} onChange={setSkill} />
            <div style={{ display: "flex", gap: 12, marginTop: 28 }}>
              <button className="btn btn-secondary" onClick={prevStep}>← Back</button>
              <button className="btn btn-primary" onClick={nextStep}>Continue →</button>
            </div>
          </div>
        )}

        {/* ── STEP 4 ── */}
        {step === 4 && (
          <div>
            <p className="step-eyebrow">Step 4 of 5 — Legal & Financial</p>
            <h2 className="step-title">Planning for the future</h2>
            <p className="step-sub">
              These questions help us add the right legal and financial
              milestones to your personalized timeline.
            </p>
            <div className="field">
              <label>Supported Decision-Making agreement or guardianship</label>
              <select value={form.sdmInPlace} onChange={(e) => setField("sdmInPlace", e.target.value)}>
                <option value="">Select…</option>
                <option value="yes">Yes, it's in place</option>
                <option value="in_progress">In progress</option>
                <option value="no">Not yet</option>
                <option value="unsure">Not sure</option>
              </select>
            </div>
            <div className="field">
              <label>Is the individual registered for ODSP?</label>
              <select value={form.odspRegistered} onChange={(e) => setField("odspRegistered", e.target.value)}>
                <option value="">Select…</option>
                <option value="yes">Yes, receiving ODSP</option>
                <option value="applied">Applied, awaiting decision</option>
                <option value="no">Not yet applied</option>
                <option value="unsure">Not sure</option>
              </select>
            </div>
            <div className="field">
              <label>Does the family have a Henson Trust or estate plan?</label>
              <select value={form.hensonTrust} onChange={(e) => setField("hensonTrust", e.target.value)}>
                <option value="">Select…</option>
                <option value="yes">Yes</option>
                <option value="in_progress">In progress</option>
                <option value="no">No</option>
                <option value="unsure">Not sure</option>
              </select>
            </div>
            <div className="field">
              <label>Any additional legal or financial notes (optional)</label>
              <textarea placeholder="Anything else we should know..." value={form.legalNotes} onChange={(e) => setField("legalNotes", e.target.value)} />
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 28 }}>
              <button className="btn btn-secondary" onClick={prevStep}>← Back</button>
              <button className="btn btn-primary" onClick={nextStep}>Continue →</button>
            </div>
          </div>
        )}

        {/* ── STEP 5 ── */}
        {step === 5 && (
          <div>
            <p className="step-eyebrow">Step 5 of 5 — Support Needs</p>
            <h2 className="step-title">What support looks like for you</h2>
            <p className="step-sub">
              This is what drives our matching algorithm — the more accurate,
              the better your organization matches will be.
            </p>
            <div className="field">
              <label>Level of daily support needed</label>
              <select value={form.supportLevel} onChange={(e) => setField("supportLevel", e.target.value)}>
                <option value="">Select…</option>
                <option value="low">Low — check-ins and reminders</option>
                <option value="medium">Medium — some on-site daily support</option>
                <option value="high">High — significant daily support needed</option>
              </select>
            </div>
            <div className="field">
              <label>Preferred type of housing (select all that apply)</label>
              <div className="chip-group">
                {HOUSING_TYPES.map((h) => (
                  <Chip
                    key={h} label={h}
                    selected={form.housingPreferences.includes(h)}
                    onToggle={() => toggleArr("housingPreferences", h)}
                  />
                ))}
              </div>
            </div>
            <div className="field">
              <label>Preferred region / location</label>
              <select value={form.preferredRegion} onChange={(e) => setField("preferredRegion", e.target.value)}>
                <option value="">Select…</option>
                {REGIONS.map((r) => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Anything else we should know?</label>
              <textarea placeholder="e.g. Close to Jewish community, needs kosher meals, wants to be near family in North York..." value={form.additionalNotes} onChange={(e) => setField("additionalNotes", e.target.value)} />
            </div>

            {error && <div className="alert alert-danger">{error}</div>}

            <div style={{ display: "flex", gap: 12, marginTop: 28 }}>
              <button className="btn btn-secondary" onClick={prevStep}>← Back</button>
              <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
                {saving ? "Saving…" : "Generate My Timeline →"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
