import SkeletonPage from "../../components/Skeleton";
import { useEffect, useState } from "react";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";

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

const HOUSING_OPTIONS = [
  "Own apartment in a supported building",
  "Shared home with peers",
  "Small group home",
  "Intentional community",
  "Host family / homeshare",
];
const TAG_OPTIONS   = ["Supported Housing", "Life Skills", "Employment", "Day Program", "Legal Aid", "Cultural Services", "Mental Health"];
const REGION_OPTIONS = ["Toronto (GTA)", "North York", "Thornhill / Vaughan", "Scarborough", "Etobicoke / Mississauga", "York Region", "Durham Region", "Other Ontario"];

function toggle(arr, val) {
  return arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val];
}

export default function ResourceDirectory() {
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
    if (!form.name) { setError("Organization name is required."); return; }
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
    if (!window.confirm(`Delete "${org.name}"? This cannot be undone.`)) return;
    await deleteDoc(doc(db, "organizations", org.id));
    await load();
  }

  function setF(key, val) { setForm((f) => ({ ...f, [key]: val })); }

  if (loading) return <SkeletonPage />;

  return (
    <div className="page-wide">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--navy)" }}>Resource Directory</h1>
          <p style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 4 }}>{orgs.length} organizations · These are used in the matching algorithm</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Organization</button>
      </div>

      {orgs.length === 0 && (
        <div className="alert alert-warn">
          No organizations yet. Add some to enable family matching. Use the seed button below to add real Ontario organizations.
        </div>
      )}

      <div className="card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Organization</th>
              <th>Support Level</th>
              <th>Tags</th>
              <th>Regions</th>
              <th>Openings</th>
              <th>Min Readiness</th>
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
                <td><div className="tag-row">{(org.tags || []).map((t) => <span key={t} className="tag tag-teal" style={{ fontSize: 10 }}>{t}</span>)}</div></td>
                <td style={{ fontSize: 12 }}>{(org.regions || []).join(", ") || "—"}</td>
                <td>
                  <span className={`tag ${org.hasOpenings ? "tag-success" : "tag-danger"}`} style={{ fontSize: 11 }}>
                    {org.hasOpenings ? `Yes (${org.openingCount || "?"})` : "No"}
                  </span>
                </td>
                <td style={{ fontFamily: "Syne", fontWeight: 700, color: "var(--accent)" }}>{org.minReadiness || 0}</td>
                <td>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="btn btn-sm btn-secondary" onClick={() => openEdit(org)}>Edit</button>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(org)}>Delete</button>
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
              <h3 style={{ margin: 0 }}>{modal === "add" ? "Add Organization" : `Edit: ${modal.name}`}</h3>
              <button
                onClick={() => setModal(null)}
                style={{ background: "none", border: "none", fontSize: 22, lineHeight: 1, cursor: "pointer", color: "var(--text-muted)", padding: "0 0 0 12px" }}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <p className="modal-sub">This organization will appear in family resource matches based on the matching algorithm.</p>

            {error && <div className="alert alert-danger">{error}</div>}

            <div className="field"><label>Organization Name *</label><input type="text" value={form.name} onChange={(e) => setF("name", e.target.value)} placeholder="e.g. Reena Community Residence" /></div>
            <div className="field"><label>Short Name (for logo)</label><input type="text" value={form.shortName} onChange={(e) => setF("shortName", e.target.value)} placeholder="e.g. REENA" maxLength={8} /></div>
            <div className="field"><label>Description</label><textarea value={form.description} onChange={(e) => setF("description", e.target.value)} placeholder="Brief description of services offered…" /></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="field"><label>Phone</label><input type="tel" value={form.phone} onChange={(e) => setF("phone", e.target.value)} placeholder="(416) 555-0100" /></div>
              <div className="field"><label>Website</label><input type="url" value={form.website} onChange={(e) => setF("website", e.target.value)} placeholder="https://…" /></div>
            </div>

            <div className="field">
              <label>Support Level Provided</label>
              <select value={form.supportLevel} onChange={(e) => setF("supportLevel", e.target.value)}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <div className="field">
              <label>Minimum Readiness Score (0–100)</label>
              <input type="number" min={0} max={100} value={form.minReadiness} onChange={(e) => setF("minReadiness", Number(e.target.value))} />
              <p className="field-hint">Families below this score won't be matched here.</p>
            </div>

            <div className="field">
              <label>Current Openings</label>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 400 }}>
                  <input type="checkbox" checked={form.hasOpenings} onChange={(e) => setF("hasOpenings", e.target.checked)} />
                  Has openings
                </label>
                {form.hasOpenings && (
                  <input type="number" min={0} max={99} value={form.openingCount} onChange={(e) => setF("openingCount", Number(e.target.value))} style={{ width: 80 }} placeholder="Count" />
                )}
              </div>
            </div>

            <div className="field">
              <label>Housing Types Offered</label>
              <div className="chip-group">
                {HOUSING_OPTIONS.map((h) => (
                  <div key={h} className={`chip${form.housingTypes.includes(h) ? " selected" : ""}`} onClick={() => setF("housingTypes", toggle(form.housingTypes, h))}>{h}</div>
                ))}
              </div>
            </div>

            <div className="field">
              <label>Service Tags</label>
              <div className="chip-group">
                {TAG_OPTIONS.map((t) => (
                  <div key={t} className={`chip${form.tags.includes(t) ? " selected" : ""}`} onClick={() => setF("tags", toggle(form.tags, t))}>{t}</div>
                ))}
              </div>
            </div>

            <div className="field">
              <label>Regions Served</label>
              <div className="chip-group">
                {REGION_OPTIONS.map((r) => (
                  <div key={r} className={`chip${form.regions.includes(r) ? " selected" : ""}`} onClick={() => setF("regions", toggle(form.regions, r))}>{r}</div>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save Organization"}</button>
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
