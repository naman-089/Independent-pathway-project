import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getDoc, doc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../hooks/useAuth";
import { getAuthErrorMessage } from "../utils/errorMessages";

const ROLES = [
  { value: "family",     label: "Family / Individual", icon: "🏠" },
  { value: "caseworker", label: "Caseworker",           icon: "👤" },
  { value: "admin",      label: "Admin",                icon: "⚙️" },
];

const STAFF_ROLES = new Set(["caseworker", "admin"]);

function validateStaffCode(role, code) {
  if (!STAFF_ROLES.has(role)) return true;
  const expected =
    role === "admin"
      ? import.meta.env.VITE_ADMIN_CODE
      : import.meta.env.VITE_CASEWORKER_CODE;
  return expected && code === expected;
}

const TITLES = {
  login:  "Welcome back",
  signup: "Create your account",
  reset:  "Reset your password",
};
const SUBS = {
  login:  "Sign in to access your Independence Pathway Platform",
  signup: "Join the platform and start building your pathway to independence",
  reset:  "Enter your email and we'll send you a reset link.",
};

export default function AuthPage() {
  const [mode, setMode]               = useState("login");
  const [email, setEmail]             = useState("");
  const [password, setPassword]       = useState("");
  const [name, setName]               = useState("");
  const [role, setRole]               = useState("family");
  const [staffCode, setStaffCode]     = useState("");
  const [remember, setRemember]       = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [resetSent, setResetSent]     = useState(false);
  const [error, setError]             = useState("");
  const [loading, setLoading]         = useState(false);

  const { login, signup, resetPassword, connectionIssue } = useAuth();
  const navigate = useNavigate();

  function redirect(r) {
    if (r === "caseworker") navigate("/caseworker");
    else if (r === "admin") navigate("/admin");
    else navigate("/family");
  }

  function switchMode(m) { setMode(m); setError(""); setResetSent(false); setStaffCode(""); }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      if (mode === "login") {
        const cred = await login(email, password, remember);
        const snap = await getDoc(doc(db, "users", cred.user.uid));
        redirect(snap.data()?.role || "family");
      } else {
        if (!validateStaffCode(role, staffCode)) {
          setError("Invalid access code for this role. Contact your administrator.");
          setLoading(false);
          return;
        }
        await signup(email, password, role, name);
        redirect(role);
      }
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleReset(e) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      await resetPassword(email);
      setResetSent(true);
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
        <h2 className="auth-title">{TITLES[mode]}</h2>
        <p className="auth-sub">{SUBS[mode]}</p>

        {connectionIssue && (
          <div className="alert alert-warn">
            We couldn't reach the server in time, so we couldn't check whether you're already signed in.
            Check your connection and sign in again — your account is fine.
          </div>
        )}
        {error && <div className="alert alert-danger">{error}</div>}

        {/* ── RESET MODE ── */}
        {mode === "reset" && (
          <>
            {resetSent ? (
              <div className="alert alert-success">
                Check your inbox for a reset link — check spam if you don't see it.
              </div>
            ) : (
              <form onSubmit={handleReset}>
                <div className="field">
                  <label>Email address</label>
                  <input type="email" required placeholder="you@example.com"
                    value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
                  {loading ? "Sending…" : "Send reset email →"}
                </button>
              </form>
            )}
            <div className="divider" style={{ margin: "24px 0" }} />
            <p style={{ textAlign: "center", fontSize: 14, color: "var(--text-muted)" }}>
              <button onClick={() => switchMode("login")} className="btn-link">
                ← Back to sign in
              </button>
            </p>
          </>
        )}

        {/* ── SIGNUP: role picker ── */}
        {mode === "signup" && (
          <>
            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 10 }}>
              I am signing up as a:
            </p>
            <div className="role-picker" role="radiogroup" aria-label="Select your role">
              {ROLES.map((r) => (
                <div
                  key={r.value}
                  className={`role-option${role === r.value ? " selected" : ""}`}
                  onClick={() => setRole(r.value)}
                  onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); setRole(r.value); } }}
                  tabIndex={0}
                  role="radio"
                  aria-checked={role === r.value}
                >
                  <div className="role-icon">{r.icon}</div>
                  <div className="role-label">{r.label}</div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── LOGIN / SIGNUP FORM ── */}
        {mode !== "reset" && (
          <form onSubmit={handleSubmit}>
            {mode === "signup" && (
              <div className="field">
                <label>Full name</label>
                <input type="text" required placeholder="Your full name"
                  value={name} onChange={(e) => setName(e.target.value)} />
              </div>
            )}

            {mode === "signup" && STAFF_ROLES.has(role) && (
              <div className="field">
                <label>Staff access code</label>
                <input
                  type="password" required
                  placeholder="Enter your access code"
                  value={staffCode}
                  onChange={(e) => setStaffCode(e.target.value)}
                  autoComplete="off"
                />
                <p className="field-hint">Required for caseworker and admin accounts. Contact your administrator.</p>
              </div>
            )}

            <div className="field">
              <label>Email address</label>
              <input type="email" required placeholder="you@example.com"
                value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>

            <div className="field">
              <label>Password</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"} required
                  placeholder={mode === "signup" ? "At least 6 characters" : "Your password"}
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  style={{ paddingRight: 56 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  style={{
                    position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", color: "var(--text-muted)",
                    fontSize: 12, fontWeight: 500, cursor: "pointer",
                    fontFamily: "DM Sans, sans-serif", padding: "0 4px",
                  }}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {mode === "login" && (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, marginTop: -4 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-muted)", cursor: "pointer" }}>
                    <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)}
                      style={{ width: 15, height: 15, accentColor: "var(--accent)", cursor: "pointer" }} />
                    Remember me
                  </label>
                  <button type="button" onClick={() => switchMode("reset")}
                    className="btn-link" style={{ fontWeight: 500, fontSize: 13 }}>
                    Forgot password?
                  </button>
                </div>
              </>
            )}

            <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
              {loading ? "Please wait…" : mode === "login" ? "Sign in →" : "Create account →"}
            </button>
          </form>
        )}

        {mode !== "reset" && (
          <>
            <div className="divider" style={{ margin: "24px 0" }} />
            <p style={{ textAlign: "center", fontSize: 14, color: "var(--text-muted)" }}>
              {mode === "login" ? "Don't have an account? " : "Already have an account? "}
              <button
                onClick={() => switchMode(mode === "login" ? "signup" : "login")}
                className="btn-link"
              >
                {mode === "login" ? "Sign up" : "Sign in"}
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
