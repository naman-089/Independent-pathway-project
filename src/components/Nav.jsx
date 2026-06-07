import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

// Maps each nav route to the dynamic import behind its lazy() in App.jsx, so we
// can warm up the JS chunk in the background — by the time the user clicks a
// link, the page is already downloaded instead of loading on demand.
const CHUNK_LOADERS = {
  "/family":           () => import("../pages/family/FamilyHome"),
  "/family/intake":    () => import("../pages/family/IntakePage"),
  "/family/timeline":  () => import("../pages/family/TimelinePage"),
  "/family/portfolio": () => import("../pages/family/PortfolioPage"),
  "/family/resources": () => import("../pages/family/ResourcesPage"),
  "/family/profile":   () => import("../pages/ProfilePage"),

  "/caseworker":          () => import("../pages/caseworker/CaseworkerDashboard"),
  "/caseworker/families": () => import("../pages/caseworker/FamiliesList"),
  "/caseworker/matches":  () => import("../pages/caseworker/MatchesOverview"),
  "/caseworker/profile":  () => import("../pages/ProfilePage"),

  "/admin":           () => import("../pages/admin/AdminDashboard"),
  "/admin/resources": () => import("../pages/admin/ResourceDirectory"),
  "/admin/users":     () => import("../pages/admin/UsersPage"),
  "/admin/profile":   () => import("../pages/ProfilePage"),
};

const prefetched = new Set();
function prefetchChunk(to) {
  if (prefetched.has(to)) return;
  const load = CHUNK_LOADERS[to];
  if (!load) return;
  prefetched.add(to);
  load();
}

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

  // Warm up the other pages' chunks once the dashboard is idle, so navigating
  // between sections feels instant instead of waiting on a fresh download.
  useEffect(() => {
    const idle = window.requestIdleCallback || ((cb) => setTimeout(cb, 200));
    const cancel = window.cancelIdleCallback || clearTimeout;
    const id = idle(() => links.forEach((l) => prefetchChunk(l.to)));
    return () => cancel(id);
  }, [profile?.role]);

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
              onMouseEnter={() => prefetchChunk(l.to)}
              onTouchStart={() => prefetchChunk(l.to)}
              onFocus={() => prefetchChunk(l.to)}
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
              onTouchStart={() => prefetchChunk(l.to)}
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
