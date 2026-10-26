import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const freelancerLinks = [
  ["⌂", "Overview", "/dashboard"],
  ["◌", "Clients", "/clients"],
  ["◇", "Projects", "/projects"],
  ["◷", "Timesheet", "/time"],
  ["□", "Invoices", "/invoices"],
  ["↗", "Payments", "/payments"],
];

const clientLinks = [
  ["□", "Invoices", "/portal"],
  ["◇", "Post Projects", "/portal/projects"],
  ["✓", "Work review", "/portal/work"],
  ["↗", "Payments", "/portal/payments"],
];

export default function AppShell({ children, portal = false }) {
  const { user, logout } = useAuth();
  const links = portal ? clientLinks : freelancerLinks;

  return (
    <div className={`workspace ${portal ? "is-portal" : "is-freelancer"}`}>
      <aside className="rail">
        <Link to={portal ? "/portal" : "/"} className="wordmark">
          <span className="wordmark-symbol">BYT</span>
          <span>
            BILLYOURTIME
            <small>{portal ? "CLIENT PORTAL" : "FREELANCE OS"}</small>
          </span>
        </Link>

        <div className="rail-label">
          {portal ? "CLIENT SPACE" : "YOUR WORKSPACE"}
        </div>
        <nav className="rail-nav">
          {links.map(([icon, label, path]) => (
            <NavLink
              key={path}
              to={path}
              end={path === "/dashboard" || path === "/portal"}
              className={({ isActive }) =>
                isActive ? "rail-link is-active" : "rail-link"
              }
            >
              <span className="rail-icon">{icon}</span>
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {!portal && (
          <NavLink
            to="/project-board"
            className={({ isActive }) =>
              isActive ? "opportunity is-active" : "opportunity"
            }
          >
            <span>↗</span>
            <b>Find your next project</b>
            <small>Browse client opportunities</small>
          </NavLink>
        )}

        <div className="rail-user">
          <div className="user-avatar">{user?.email?.[0]?.toUpperCase()}</div>
          <div>
            <strong>{user?.business_name || user?.email}</strong>
            <small>{portal ? "Client account" : "Freelancer account"}</small>
          </div>
          <button onClick={logout} aria-label="Sign out">
            ↪
          </button>
        </div>
      </aside>

      <div className="workspace-main">
        <header className="workspace-header">
          <div className="header-context">
            <span className="header-kicker">
              {portal ? "CLIENT HQ" : "STUDIO HQ"}
            </span>
            <span className="header-divider" />
            <span>
              {portal ? "Review, approve, and pay" : "Make the work move"}
            </span>
          </div>
          <div className="header-right">
            <span className="status">
              <i /> Live workspace
            </span>
            <span className="header-date">
              {new Intl.DateTimeFormat("en", {
                weekday: "short",
                month: "short",
                day: "numeric",
              }).format(new Date())}
            </span>
          </div>
        </header>
        <main className="workspace-content">{children}</main>
      </div>
    </div>
  );
}
