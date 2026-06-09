import SkeletonPage from "../../components/Skeleton";
import { useEffect, useState } from "react";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";
import { useLanguage } from "../../hooks/useLanguage";

const EMPTY_ORG = {
  name: "", shortName: "", description: "", phone: "", website: "",
  supportLevel: "medium",
  housingTypes: [],
  tags: [],
  regions: [],
  hasOpenings: false,
  openingCount: 0,
  minReadiness: 0,
  pricePerDay: "",
};

// `value` is persisted to Firestore and shown raw to families on ResourcesPage/FamilyDetail;
// `labelKey` is the translated chip label shown to admins editing the organization.
const HOUSING_OPTIONS = [
  { value: "Own apartment in a supported building", labelKey: "resourceDirectory.housing1" },
  { value: "Shared home with peers",                labelKey: "resourceDirectory.housing2" },
  { value: "Small group home",                      labelKey: "resourceDirectory.housing3" },
  { value: "Intentional community",                 labelKey: "resourceDirectory.housing4" },
  { value: "Host family / homeshare",               labelKey: "resourceDirectory.housing5" },
];
const TAG_OPTIONS = [
  { value: "Supported Housing", labelKey: "resourceDirectory.tag1" },
  { value: "Life Skills",       labelKey: "resourceDirectory.tag2" },
  { value: "Employment",        labelKey: "resourceDirectory.tag3" },
  { value: "Day Program",       labelKey: "resourceDirectory.tag4" },
  { value: "Legal Aid",         labelKey: "resourceDirectory.tag5" },
  { value: "Cultural Services", labelKey: "resourceDirectory.tag6" },
  { value: "Mental Health",     labelKey: "resourceDirectory.tag7" },
];
const REGION_OPTIONS = [
  { value: "Toronto (GTA)",           labelKey: "resourceDirectory.region1" },
  { value: "North York",              labelKey: "resourceDirectory.region2" },
  { value: "Thornhill / Vaughan",     labelKey: "resourceDirectory.region3" },
  { value: "Scarborough",             labelKey: "resourceDirectory.region4" },
  { value: "Etobicoke / Mississauga", labelKey: "resourceDirectory.region5" },
  { value: "York Region",             labelKey: "resourceDirectory.region6" },
  { value: "Durham Region",           labelKey: "resourceDirectory.region7" },
  { value: "Other Ontario",           labelKey: "resourceDirectory.region8" },
];

function toggle(arr, val) {
  return arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val];
}

const SAMPLE_ORGS = [
  {
    name: "Reena",
    shortName: "REENA",
    description: "Person-centred day programs, life skills coaching, and community participation for adults with developmental disabilities across the GTA. Passport funding accepted.",
    phone: "(905) 889-6484",
    website: "https://reena.org",
    tags: ["Day Program", "Life Skills", "Supported Housing", "Employment"],
    housingTypes: ["Own apartment in a supported building", "Small group home", "Intentional community"],
    regions: ["Thornhill / Vaughan", "North York", "Toronto (GTA)"],
    supportLevel: "medium",
    hasOpenings: true,
    openingCount: 4,
    pricePerDay: "85",
    minReadiness: 20,
  },
  {
    name: "Meta Centre",
    shortName: "META",
    description: "Community participation services and supported group living across 5 GTA locations. Specializes in adults with developmental and multiple disabilities. Passport dollars accepted.",
    phone: "(416) 736-0199",
    website: "https://metacentre.ca",
    tags: ["Day Program", "Supported Housing"],
    housingTypes: ["Small group home", "Shared home with peers"],
    regions: ["Toronto (GTA)", "North York", "Etobicoke / Mississauga"],
    supportLevel: "high",
    hasOpenings: true,
    openingCount: 6,
    pricePerDay: "92",
    minReadiness: 10,
  },
  {
    name: "Community Living Toronto",
    shortName: "CLT",
    description: "Day supports, employment services, and individualized Passport programs for people with intellectual disabilities across Toronto.",
    phone: "(416) 968-0650",
    website: "https://cltoronto.ca",
    tags: ["Day Program", "Employment", "Life Skills"],
    housingTypes: ["Own apartment in a supported building"],
    regions: ["Toronto (GTA)", "Scarborough", "North York"],
    supportLevel: "medium",
    hasOpenings: true,
    openingCount: 3,
    pricePerDay: "78",
    minReadiness: 30,
  },
  {
    name: "Kerry's Place Autism Services",
    shortName: "KPAS",
    description: "Ontario's largest autism service provider. Adult day supports, employment coaching, and community participation for autistic individuals and adults with developmental disabilities.",
    phone: "(905) 841-6611",
    website: "https://kerrysplace.org",
    tags: ["Day Program", "Employment", "Life Skills", "Mental Health"],
    housingTypes: [],
    regions: ["York Region", "Durham Region", "Toronto (GTA)"],
    supportLevel: "medium",
    hasOpenings: true,
    openingCount: 8,
    pricePerDay: "95",
    minReadiness: 20,
  },
  {
    name: "Corbrook",
    shortName: "CRBK",
    description: "Employment training, pre-employment programs, and learning opportunities for adults and youth with developmental disabilities in Toronto and York Region.",
    phone: "(416) 245-5565",
    website: "https://corbrook.com",
    tags: ["Day Program", "Employment", "Life Skills"],
    housingTypes: [],
    regions: ["Toronto (GTA)", "York Region"],
    supportLevel: "low",
    hasOpenings: false,
    openingCount: 0,
    pricePerDay: "65",
    minReadiness: 40,
  },
  {
    name: "L'Arche Toronto",
    shortName: "ARCH",
    description: "Inclusive community homes and day programs where people with and without intellectual disabilities live and work together. Arts, spirituality, and belonging at the core.",
    phone: "(416) 881-0066",
    website: "https://larchetoronto.org",
    tags: ["Day Program", "Supported Housing"],
    housingTypes: ["Intentional community", "Small group home"],
    regions: ["Toronto (GTA)"],
    supportLevel: "medium",
    hasOpenings: false,
    openingCount: 0,
    pricePerDay: "75",
    minReadiness: 25,
  },
  {
    name: "DramaWay",
    shortName: "DRWY",
    description: "Arts-based day programs using theatre, music, and creative expression to build communication, confidence, and life skills for adults with disabilities. Passport eligible.",
    phone: "(416) 978-0833",
    website: "https://dramaway.ca",
    tags: ["Day Program", "Life Skills", "Cultural Services"],
    housingTypes: [],
    regions: ["Toronto (GTA)"],
    supportLevel: "low",
    hasOpenings: true,
    openingCount: 10,
    pricePerDay: "55",
    minReadiness: 30,
  },
  {
    name: "Karis Disability Services",
    shortName: "KARIS",
    description: "Formerly Christian Horizons. Supported living, residential homes, and community day programs across Ontario for adults with intellectual disabilities.",
    phone: "(519) 650-0966",
    website: "https://karisds.ca",
    tags: ["Supported Housing", "Day Program", "Life Skills"],
    housingTypes: ["Small group home", "Shared home with peers", "Own apartment in a supported building"],
    regions: ["Other Ontario", "Toronto (GTA)"],
    supportLevel: "high",
    hasOpenings: true,
    openingCount: 7,
    pricePerDay: "88",
    minReadiness: 10,
  },
  {
    name: "E3 Community Services",
    shortName: "E3CS",
    description: "Day programs, vocational training, and community integration for adults with developmental disabilities in the Collingwood / South Georgian Bay area.",
    phone: "(705) 445-0120",
    website: "https://e3communityservices.ca",
    tags: ["Day Program", "Employment", "Life Skills"],
    housingTypes: [],
    regions: ["Other Ontario"],
    supportLevel: "medium",
    hasOpenings: true,
    openingCount: 3,
    pricePerDay: "68",
    minReadiness: 20,
  },
  {
    name: "LiveWorkPlay",
    shortName: "LWP",
    description: "Community inclusion, supported employment, and social participation helping people with intellectual disabilities live fully valued lives in Ottawa and region.",
    phone: "(613) 792-9400",
    website: "https://liveworkplay.ca",
    tags: ["Day Program", "Employment", "Life Skills"],
    housingTypes: [],
    regions: ["Other Ontario"],
    supportLevel: "low",
    hasOpenings: true,
    openingCount: 2,
    pricePerDay: "70",
    minReadiness: 35,
  },
  {
    name: "Extend-A-Family Waterloo Region",
    shortName: "EAFWR",
    description: "One-to-one matching, inclusive recreation, and community participation programs connecting people with disabilities to meaningful friendships and community roles.",
    phone: "(519) 886-9081",
    website: "https://extend-a-family.org",
    tags: ["Day Program", "Life Skills", "Cultural Services"],
    housingTypes: [],
    regions: ["Other Ontario"],
    supportLevel: "low",
    hasOpenings: false,
    openingCount: 0,
    pricePerDay: "60",
    minReadiness: 25,
  },
  {
    name: "Sunbeam Residential Development Centre",
    shortName: "SRDC",
    description: "Waterloo Region's day programs, employment supports, and residential services for adults with developmental disabilities. Over 70 years serving the community.",
    phone: "(519) 743-5458",
    website: "https://sunbeamcentre.com",
    tags: ["Day Program", "Supported Housing", "Employment"],
    housingTypes: ["Small group home", "Shared home with peers"],
    regions: ["Other Ontario"],
    supportLevel: "medium",
    hasOpenings: true,
    openingCount: 5,
    pricePerDay: "72",
    minReadiness: 15,
  },
];

export default function ResourceDirectory() {
  const { t } = useLanguage();
  const [orgs, setOrgs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState(null); // null | "add" | org object
  const [form, setForm]       = useState(EMPTY_ORG);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState("");

  async function load() {
    const snap = await getDocs(collection(db, "organizations"));
    setOrgs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function openAdd() { setForm(EMPTY_ORG); setModal("add"); setError(""); }
  function openEdit(org) { setForm({ ...EMPTY_ORG, ...org }); setModal(org); setError(""); }

  async function handleSave() {
    if (!form.name) { setError(t("resourceDirectory.nameRequired")); return; }
    setSaving(true); setError("");
    try {
      const payload = { ...form, updatedAt: serverTimestamp() };
      if (modal === "add") {
        await addDoc(collection(db, "organizations"), { ...payload, createdAt: serverTimestamp() });
      } else {
        await updateDoc(doc(db, "organizations", modal.id), payload);
      }
      setModal(null);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(org) {
    if (!window.confirm(t("resourceDirectory.deleteConfirm", { name: org.name }))) return;
    await deleteDoc(doc(db, "organizations", org.id));
    await load();
  }

  function setF(key, val) { setForm((f) => ({ ...f, [key]: val })); }

  const [prefilling, setPrefilling] = useState(false);
  async function handlePrefill() {
    if (!window.confirm("Add 12 sample Ontario day program organizations? Existing organizations will not be removed.")) return;
    setPrefilling(true);
    try {
      for (const org of SAMPLE_ORGS) {
        await addDoc(collection(db, "organizations"), { ...org, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      }
      await load();
    } finally {
      setPrefilling(false);
    }
  }

  if (loading) return <SkeletonPage />;

  return (
    <div className="page-wide">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--navy)" }}>{t("resourceDirectory.title")}</h1>
          <p style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 4 }}>{t("resourceDirectory.subtitle", { count: orgs.length })}</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-secondary" onClick={handlePrefill} disabled={prefilling}>
            {prefilling ? "Adding…" : "⚡ Prefill Sample Data"}
          </button>
          <button className="btn btn-primary" onClick={openAdd}>{t("resourceDirectory.addOrganization")}</button>
        </div>
      </div>

      {orgs.length === 0 && (
        <div className="alert alert-warn">
          {t("resourceDirectory.emptyWarn")}
        </div>
      )}

      <div className="card">
        <table className="data-table">
          <thead>
            <tr>
              <th>{t("resourceDirectory.colOrganization")}</th>
              <th>{t("resourceDirectory.colSupportLevel")}</th>
              <th>{t("resourceDirectory.colTags")}</th>
              <th>{t("resourceDirectory.colRegions")}</th>
              <th>{t("resourceDirectory.colOpenings")}</th>
              <th>{t("resourceDirectory.colMinReadiness")}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {orgs.map((org) => (
              <tr key={org.id}>
                <td>
                  <div style={{ fontWeight: 500 }}>{org.name}</div>
                  {org.phone && <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{org.phone}</div>}
                </td>
                <td><span className={`tag ${org.supportLevel === "high" ? "tag-danger" : org.supportLevel === "low" ? "tag-success" : "tag-warn"}`} style={{ fontSize: 11 }}>{org.supportLevel}</span></td>
                <td><div className="tag-row">{(org.tags || []).map((tag) => <span key={tag} className="tag tag-teal" style={{ fontSize: 10 }}>{tag}</span>)}</div></td>
                <td style={{ fontSize: 12 }}>{(org.regions || []).join(", ") || t("common.dash")}</td>
                <td>
                  <span className={`tag ${org.hasOpenings ? "tag-success" : "tag-danger"}`} style={{ fontSize: 11 }}>
                    {org.hasOpenings ? t("resourceDirectory.yesCount", { count: org.openingCount || "?" }) : t("resourceDirectory.no")}
                  </span>
                </td>
                <td style={{ fontFamily: "Syne", fontWeight: 700, color: "var(--accent)" }}>{org.minReadiness || 0}</td>
                <td>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="btn btn-sm btn-secondary" onClick={() => openEdit(org)}>{t("resourceDirectory.edit")}</button>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(org)}>{t("resourceDirectory.delete")}</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL */}
      {modal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setModal(null)}>
          <div className="modal">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
              <h3 style={{ margin: 0 }}>{modal === "add" ? t("resourceDirectory.modalAddTitle") : t("resourceDirectory.modalEditTitle", { name: modal.name })}</h3>
              <button
                onClick={() => setModal(null)}
                style={{ background: "none", border: "none", fontSize: 22, lineHeight: 1, cursor: "pointer", color: "var(--text-muted)", padding: "0 0 0 12px" }}
                aria-label={t("common.close")}
              >
                ×
              </button>
            </div>
            <p className="modal-sub">{t("resourceDirectory.modalSub")}</p>

            {error && <div className="alert alert-danger">{error}</div>}

            <div className="field"><label>{t("resourceDirectory.nameLabel")}</label><input type="text" value={form.name} onChange={(e) => setF("name", e.target.value)} placeholder={t("resourceDirectory.namePlaceholder")} /></div>
            <div className="field"><label>{t("resourceDirectory.shortNameLabel")}</label><input type="text" value={form.shortName} onChange={(e) => setF("shortName", e.target.value)} placeholder={t("resourceDirectory.shortNamePlaceholder")} maxLength={8} /></div>
            <div className="field"><label>{t("resourceDirectory.descriptionLabel")}</label><textarea value={form.description} onChange={(e) => setF("description", e.target.value)} placeholder={t("resourceDirectory.descriptionPlaceholder")} /></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="field"><label>{t("resourceDirectory.phoneLabel")}</label><input type="tel" value={form.phone} onChange={(e) => setF("phone", e.target.value)} placeholder={t("resourceDirectory.phonePlaceholder")} /></div>
              <div className="field"><label>{t("resourceDirectory.websiteLabel")}</label><input type="url" value={form.website} onChange={(e) => setF("website", e.target.value)} placeholder={t("resourceDirectory.websitePlaceholder")} /></div>
            </div>

            {form.tags.includes("Day Program") && (
              <div className="field">
                <label>{t("resourceDirectory.pricePerDayLabel")}</label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={form.pricePerDay}
                  onChange={(e) => setF("pricePerDay", e.target.value)}
                  placeholder={t("resourceDirectory.pricePerDayPlaceholder")}
                />
              </div>
            )}

            <div className="field">
              <label>{t("resourceDirectory.supportLevelLabel")}</label>
              <select value={form.supportLevel} onChange={(e) => setF("supportLevel", e.target.value)}>
                <option value="low">{t("resourceDirectory.supportLow")}</option>
                <option value="medium">{t("resourceDirectory.supportMedium")}</option>
                <option value="high">{t("resourceDirectory.supportHigh")}</option>
              </select>
            </div>

            <div className="field">
              <label>{t("resourceDirectory.minReadinessLabel")}</label>
              <input type="number" min={0} max={100} value={form.minReadiness} onChange={(e) => setF("minReadiness", Number(e.target.value))} />
              <p className="field-hint">{t("resourceDirectory.minReadinessHint")}</p>
            </div>

            <div className="field">
              <label>{t("resourceDirectory.openingsLabel")}</label>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 400 }}>
                  <input type="checkbox" checked={form.hasOpenings} onChange={(e) => setF("hasOpenings", e.target.checked)} />
                  {t("resourceDirectory.hasOpenings")}
                </label>
                {form.hasOpenings && (
                  <input type="number" min={0} max={99} value={form.openingCount} onChange={(e) => setF("openingCount", Number(e.target.value))} style={{ width: 80 }} placeholder={t("resourceDirectory.countPlaceholder")} />
                )}
              </div>
            </div>

            <div className="field">
              <label>{t("resourceDirectory.housingTypesLabel")}</label>
              <div className="chip-group">
                {HOUSING_OPTIONS.map((h) => (
                  <div key={h.value} className={`chip${form.housingTypes.includes(h.value) ? " selected" : ""}`} onClick={() => setF("housingTypes", toggle(form.housingTypes, h.value))}>{t(h.labelKey)}</div>
                ))}
              </div>
            </div>

            <div className="field">
              <label>{t("resourceDirectory.tagsLabel")}</label>
              <div className="chip-group">
                {TAG_OPTIONS.map((tagOpt) => (
                  <div key={tagOpt.value} className={`chip${form.tags.includes(tagOpt.value) ? " selected" : ""}`} onClick={() => setF("tags", toggle(form.tags, tagOpt.value))}>{t(tagOpt.labelKey)}</div>
                ))}
              </div>
            </div>

            <div className="field">
              <label>{t("resourceDirectory.regionsLabel")}</label>
              <div className="chip-group">
                {REGION_OPTIONS.map((r) => (
                  <div key={r.value} className={`chip${form.regions.includes(r.value) ? " selected" : ""}`} onClick={() => setF("regions", toggle(form.regions, r.value))}>{t(r.labelKey)}</div>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? t("resourceDirectory.saving") : t("resourceDirectory.saveOrganization")}</button>
              <button className="btn btn-secondary" onClick={() => setModal(null)}>{t("resourceDirectory.cancel")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
