import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useLanguage } from "../hooks/useLanguage";
import LanguageSwitcher from "./LanguageSwitcher";

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
  { to: "/family",           labelKey: "nav.home"      },
  { to: "/family/intake",    labelKey: "nav.intake"    },
  { to: "/family/timeline",  labelKey: "nav.timeline"  },
  { to: "/family/portfolio", labelKey: "nav.portfolio" },
  { to: "/family/resources", labelKey: "nav.resources" },
  { to: "/family/profile",   labelKey: "nav.profile"   },
];

const CASEWORKER_LINKS = [
  { to: "/caseworker",            labelKey: "nav.dashboard" },
  { to: "/caseworker/families",   labelKey: "nav.families"  },
  { to: "/caseworker/matches",    labelKey: "nav.matches"   },
  { to: "/caseworker/profile",    labelKey: "nav.profile"   },
];

const ADMIN_LINKS = [
  { to: "/admin",            labelKey: "nav.dashboard" },
  { to: "/admin/resources",  labelKey: "nav.directory" },
  { to: "/admin/users",      labelKey: "nav.users"     },
  { to: "/admin/profile",    labelKey: "nav.profile"   },
];

export default function Nav() {
  const { profile, logout } = useAuth();
  const location = useLocation();
  const { t } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);

  const links =
    profile?.role === "caseworker" ? CASEWORKER_LINKS :
    profile?.role === "admin"      ? ADMIN_LINKS :
    FAMILY_LINKS;

  const roleLabel =
    profile?.role === "caseworker" ? t("nav.roleCaseworker") :
    profile?.role === "admin"      ? t("nav.roleAdmin") : t("nav.roleFamily");

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
              {t(l.labelKey)}
            </Link>
          ))}
          <button className="nav-link danger" onClick={logout}>{t("nav.signOut")}</button>
          <LanguageSwitcher />
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
              {t(l.labelKey)}
            </Link>
          ))}
          <button className="nav-link danger" onClick={() => { logout(); close(); }} role="menuitem">
            {t("nav.signOut")}
          </button>
          <LanguageSwitcher />
        </div>
      )}
    </>
  );
}
