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

  if (loading) return <SkeletonPage />;

  return (
    <div className="page-wide">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--navy)" }}>{t("resourceDirectory.title")}</h1>
          <p style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 4 }}>{t("resourceDirectory.subtitle", { count: orgs.length })}</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>{t("resourceDirectory.addOrganization")}</button>
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
