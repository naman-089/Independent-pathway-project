import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const FAMILY_LINKS = [
  { to: "/family",            label: "Home"      },
  { to: "/family/intake",     label: "Intake"    },
  { to: "/family/timeline",   label: "Timeline"  },
  { to: "/family/portfolio",  label: "Portfolio" },
  { to: "/family/resources",  label: "Resources" },
];

const CASEWORKER_LINKS = [
  { to: "/caseworker",          label: "Dashboard" },
  { to: "/caseworker/families", label: "Families"  },
  { to: "/caseworker/matches",  label: "Matches"   },
];

const ADMIN_LINKS = [
  { to: "/admin",           label: "Dashboard"  },
  { to: "/admin/resources", label: "Directory"  },
  { to: "/admin/users",     label: "Users"      },
];

export default function Nav() {
  const { profile, logout } = useAuth();
  const location = useLocation();

  const links =
    profile?.role === "caseworker" ? CASEWORKER_LINKS :
    profile?.role === "admin"      ? ADMIN_LINKS :
    FAMILY_LINKS;

  const roleLabel =
    profile?.role === "caseworker" ? "Caseworker" :
    profile?.role === "admin"      ? "Admin" : "Family";

  return (
    <nav className="nav">
      <div className="nav-brand">IP<em>P</em></div>
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
        <button className="nav-link danger" onClick={logout}>
          Sign out
        </button>
      </div>
    </nav>
  );
}
