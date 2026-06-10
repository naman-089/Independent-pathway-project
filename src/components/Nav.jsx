import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useLanguage } from "../hooks/useLanguage";
import LanguageSwitcher from "./LanguageSwitcher";

const CHUNK_LOADERS = {
  "/family":           () => import("../pages/family/FamilyHome"),
  "/family/intake":    () => import("../pages/family/IntakePage"),
  "/family/timeline":  () => import("../pages/family/TimelinePage"),
  "/family/portfolio": () => import("../pages/family/PortfolioPage"),
  "/family/resources":  () => import("../pages/family/ResourcesPage"),
  "/family/community":  () => import("../pages/family/CommunityPage"),

  "/caseworker":          () => import("../pages/caseworker/CaseworkerDashboard"),
  "/caseworker/families": () => import("../pages/caseworker/FamiliesList"),
  "/caseworker/matches":  () => import("../pages/caseworker/MatchesOverview"),

  "/admin":           () => import("../pages/admin/AdminDashboard"),
  "/admin/resources": () => import("../pages/admin/ResourceDirectory"),
  "/admin/users":     () => import("../pages/admin/UsersPage"),
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
  { to: "/family/resources",  labelKey: "nav.resources"  },
  { to: "/family/community",  labelKey: "nav.community"  },
];

const CASEWORKER_LINKS = [
  { to: "/caseworker",            labelKey: "nav.dashboard" },
  { to: "/caseworker/families",   labelKey: "nav.families"  },
  { to: "/caseworker/matches",    labelKey: "nav.matches"   },
];

const ADMIN_LINKS = [
  { to: "/admin",            labelKey: "nav.dashboard" },
  { to: "/admin/resources",  labelKey: "nav.directory" },
  { to: "/admin/users",      labelKey: "nav.users"     },
];

const ZOOM_LEVELS = [
  { level: 1, label: "A",  title: "Normal text size"  },
  { level: 2, label: "A",  title: "Large text size"   },
  { level: 3, label: "A",  title: "Largest text size" },
];

export default function Nav() {
  const { profile, logout } = useAuth();
  const location = useLocation();
  const { t, zoom, setZoom } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);

  const links =
    profile?.role === "caseworker" ? CASEWORKER_LINKS :
    profile?.role === "admin"      ? ADMIN_LINKS :
    FAMILY_LINKS;

  const roleLabel =
    profile?.role === "caseworker" ? t("nav.roleCaseworker") :
    profile?.role === "admin"      ? t("nav.roleAdmin") : t("nav.roleFamily");

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
          <div className="font-zoom-group" role="group" aria-label="Text size">
            {ZOOM_LEVELS.map(({ level, label, title }) => (
              <button
                key={level}
                className={`font-zoom-btn${zoom === level ? " active" : ""}`}
                onClick={() => setZoom(level)}
                title={title}
                aria-pressed={zoom === level}
              >
                {label}
              </button>
            ))}
          </div>
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
          <div className="font-zoom-group" style={{ marginTop: 4 }}>
            {ZOOM_LEVELS.map(({ level, label, title }) => (
              <button
                key={level}
                className={`font-zoom-btn${zoom === level ? " active" : ""}`}
                onClick={() => setZoom(level)}
                title={title}
              >
                {label}
              </button>
            ))}
          </div>
          <LanguageSwitcher />
        </div>
      )}
    </>
  );
}
