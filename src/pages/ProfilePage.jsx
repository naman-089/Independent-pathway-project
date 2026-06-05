import { useState } from "react";
import { useAuth } from "../hooks/useAuth";

export default function ProfilePage() {
  const { user, profile, updateDisplayName } = useAuth();
  const [name, setName]       = useState(profile?.displayName || "");
  const [saving, setSaving]   = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError]     = useState("");

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true); setError(""); setSuccess(false);
    try {
      await updateDisplayName(name.trim());
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page">
      <div style={{ maxWidth: 480 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--navy)", marginBottom: 4 }}>My Profile</h1>
        <p style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 28 }}>Update your account details.</p>

        {success && <div className="alert alert-success">Profile updated successfully.</div>}
        {error   && <div className="alert alert-danger">{error}</div>}

        <form onSubmit={handleSave}>
          <div className="field">
            <label>Display name</label>
            <input
              type="text" required
              placeholder="Your full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Email address</label>
            <input type="email" value={user?.email || ""} disabled style={{ opacity: 0.6 }} />
            <p className="field-hint">Email cannot be changed here.</p>
          </div>
          <div className="field">
            <label>Role</label>
            <input
              type="text" value={profile?.role || ""} disabled
              style={{ opacity: 0.6, textTransform: "capitalize" }}
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={saving || !name.trim()}>
            {saving ? "Saving…" : "Save changes"}
          </button>
        </form>
      </div>
    </div>
  );
}
