import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const FAMILY_LINKS = [
  { to: "/family",           label: "Home"      },
  { to: "/family/intake",    label: "Intake"    },
  { to: "/family/timeline",  label: "Timeline"  },
  { to: "/family/portfolio", label: "Portfolio" },
  { to: "/family/resources", label: "Resources" },
  { to: "/family/profile",   label: "Profile"   },
];

const CASEWORKER_LINKS = [
  { to: "/caseworker",            label: "Dashboard" },
  { to: "/caseworker/families",   label: "Families"  },
  { to: "/caseworker/matches",    label: "Matches"   },
  { to: "/caseworker/profile",    label: "Profile"   },
];

const ADMIN_LINKS = [
  { to: "/admin",            label: "Dashboard" },
  { to: "/admin/resources",  label: "Directory" },
  { to: "/admin/users",      label: "Users"     },
  { to: "/admin/profile",    label: "Profile"   },
];

export default function Nav() {
  const { profile, logout } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const links =
    profile?.role === "caseworker" ? CASEWORKER_LINKS :
    profile?.role === "admin"      ? ADMIN_LINKS :
    FAMILY_LINKS;

  const roleLabel =
    profile?.role === "caseworker" ? "Caseworker" :
    profile?.role === "admin"      ? "Admin" : "Family";

  function close() { setMenuOpen(false); }

  return (
    <>
      <nav className="nav" role="navigation" aria-label="Main navigation">
        <div className="nav-brand">IP<em>P</em></div>
        <button
          className="nav-hamburger"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="Toggle navigation menu"
          aria-expanded={menuOpen}
          aria-controls="nav-mobile-menu"
        >
          {menuOpen ? "✕" : "☰"}
        </button>
        <div className="nav-links">
          <span className="nav-role-badge">{roleLabel}</span>
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={`nav-link${location.pathname === l.to ? " active" : ""}`}
            >
              {l.label}
            </Link>
          ))}
          <button className="nav-link danger" onClick={logout}>Sign out</button>
        </div>
      </nav>

      {menuOpen && (
        <div id="nav-mobile-menu" className="nav-mobile-menu" role="menu">
          <span className="nav-role-badge" style={{ marginBottom: 6, alignSelf: "flex-start" }}>{roleLabel}</span>
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={`nav-link${location.pathname === l.to ? " active" : ""}`}
              onClick={close}
              role="menuitem"
            >
              {l.label}
            </Link>
          ))}
          <button className="nav-link danger" onClick={() => { logout(); close(); }} role="menuitem">
            Sign out
          </button>
        </div>
      )}
    </>
  );
}
