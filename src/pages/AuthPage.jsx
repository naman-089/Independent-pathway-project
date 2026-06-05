import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { getAuthErrorMessage } from "../utils/errorMessages";

const ROLES = [
  { value: "family",     label: "Family / Individual", icon: "🏠", desc: "Complete intake & track your pathway" },
  { value: "caseworker", label: "Caseworker",           icon: "👤", desc: "Manage family profiles & matches" },
  { value: "admin",      label: "Admin",                icon: "⚙️", desc: "Manage resource directory" },
];

export default function AuthPage() {
  const [mode, setMode]             = useState("login");
  const [email, setEmail]           = useState("");
  const [password, setPassword]     = useState("");
  const [name, setName]             = useState("");
  const [role, setRole]             = useState("family");
  const [remember, setRemember]     = useState(false);
  const [error, setError]           = useState("");
  const [loading, setLoading]       = useState(false);
  const { login, signup, profile }  = useAuth();
  const navigate                    = useNavigate();

  function redirect(r) {
    if (r === "caseworker") navigate("/caseworker");
    else if (r === "admin") navigate("/admin");
    else navigate("/family");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      if (mode === "login") {
        const cred = await login(email, password, remember);
        // profile is fetched in the login function; read it back
        const { getDoc: gd, doc: d2 } = await import("firebase/firestore");
        const { db: db2 } = await import("../firebase.js");
        const snap = await gd(d2(db2, "users", cred.user.uid));
        redirect(snap.data()?.role || "family");
      } else {
        await signup(email, password, role, name);
        redirect(role);
      }
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-logo">IP<em>P</em></div>
        <h2 className="auth-title">
          {mode === "login" ? "Welcome back" : "Create your account"}
        </h2>
        <p className="auth-sub">
          {mode === "login"
            ? "Sign in to access your Independence Pathway Platform"
            : "Join the platform and start building your pathway to independence"
        }
        </p>

        {error && <div className="alert alert-danger">{error}</div>}

        {mode === "signup" && (
          <>
            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 10 }}>
              I am signing up as a:
            </p>
            <div className="role-picker">
              {ROLES.map((r) => (
                <div
                  key={r.value}
                  className={`role-option${role === r.value ? " selected" : ""}`}
                  onClick={() => setRole(r.value)}
                >
                  <div className="role-icon">{r.icon}</div>
                  <div className="role-label">{r.label}</div>
                </div>
              ))}
            </div>
          </>
        )}

        <form onSubmit={handleSubmit}>
          {mode === "signup" && (
            <div className="field">
              <label>Full name</label>
              <input
                type="text" required
                placeholder="Your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          )}
          <div className="field">
            <label>Email address</label>
            <input
              type="email" required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Password</label>
            <input
              type="password" required
              placeholder={mode === "signup" ? "At least 6 characters" : "Your password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {mode === "login" && (
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-muted)", marginBottom: 16, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                style={{ width: 15, height: 15, accentColor: "var(--accent)", cursor: "pointer" }}
              />
              Remember me on this device
            </label>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-full"
            disabled={loading}
          >
            {loading ? "Please wait…" : mode === "login" ? "Sign in →" : "Create account →"}
          </button>
        </form>

        <div className="divider" style={{ margin: "24px 0" }} />
        <p style={{ textAlign: "center", fontSize: 14, color: "var(--text-muted)" }}>
          {mode === "login" ? "Don't have an account? " : "Already have an account? "}
          <button
            onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); }}
            style={{ background: "none", border: "none", color: "var(--teal)", fontWeight: 600, fontSize: 14, cursor: "pointer" }}
          >
            {mode === "login" ? "Sign up" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}
