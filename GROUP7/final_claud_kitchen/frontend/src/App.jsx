import { lazy, Suspense, useEffect, useRef, useState } from "react";
import {
  BrowserRouter,
  Link,
  NavLink,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import api, { message, refreshSession, setToken } from "./api";
import { AppContext, FoodImage, Icon, useApp } from "./shared";
import Customer, { Menu } from "./Customer";
const Operations = lazy(() => import("./Operations"));
const Admin = lazy(() => import("./Admin"));
import { AnimatePresence, motion, MotionConfig } from "framer-motion";
import { Atmosphere } from "./Motion";
import { Modal, useResource } from "./shared";

const home = (user) =>
  user?.role === "customer"
    ? "/customer/menu"
    : user
      ? `/${user.role}`
      : "/menu";

function Guard({ role, children }) {
  const { user } = useApp();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to={home(user)} replace />;
  return children;
}

function AuthPage() {
  const { user, signIn, run, busy } = useApp();
  const [register, setRegister] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState("");
  const navigate = useNavigate();
  if (user) return <Navigate to={home(user)} replace />;
  async function submit(event) {
    event.preventDefault();
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    setAuthError("");
    await run(async () => {
      let response;
      try {
        response = await api.post(
          `/auth/${register ? "register" : "login"}`,
          fields,
          { skipRefresh: true },
        );
      } catch (error) {
        setAuthError(message(error));
        throw error;
      }
      const { data } = response;
      signIn(data.data);
      navigate(home(data.data.user));
    });
  }
  return (
    <div className="auth-layout">
      <div className="auth-story">
        <Atmosphere />
        <p className="eyebrow">
          <span className="small-spark">✳</span> THE EVERYDAY, ELEVATED
        </p>
        <h1>
          A little ritual.
          <br />
          <em>A lot of flavour.</em>
        </h1>
        <p>
          For the meals you look forward to. And the days that deserve something
          good.
        </p>
        <Link to="/menu" className="text-link">
          Discover the menu <Icon name="arrow" size={18} />
        </Link>
        <div className="auth-image">
          <FoodImage
            src="/images/hearth-biryani.webp"
            alt="Fragrant biryani with fresh mint in a dark ceramic bowl"
            loading="eager"
          />
          <span>
            A LITTLE CARE.
            <br />
            GREAT COMPANY.
          </span>
        </div>
      </div>
      <section className="panel auth-card">
        <span className="auth-symbol">
          <Icon name="flame" size={28} />
        </span>
        <p className="eyebrow">WELCOME TO HEARTH</p>
        <h2>{register ? "Your table awaits." : "Welcome back."}</h2>
        <p className="muted">
          {register
            ? "Create your customer account to order."
            : "Sign in to your customer or team account."}
        </p>
        <form onSubmit={submit} className="form-stack">
          {authError && (
            <p className="error" role="alert">
              {authError}
            </p>
          )}
          {register && (
            <label>
              Full name
              <input
                name="name"
                autoComplete="name"
                required
                minLength={2}
                maxLength={80}
              />
            </label>
          )}
          <label>
            Email
            <input
              type="email"
              name="email"
              autoComplete="email"
              placeholder="you@example.com"
              required
              maxLength={254}
            />
          </label>
          <label>
            Password
            <span className="password-field">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder={
                  register ? "At least 10 characters" : "Enter your password"
                }
                autoComplete={register ? "new-password" : "current-password"}
                required
                minLength={register ? 10 : 1}
                maxLength={128}
              />
              <button
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                onClick={() => setShowPassword(!showPassword)}
              >
                <Icon name="eye" size={18} />
              </button>
            </span>
          </label>
          <button className="btn" disabled={busy}>
            {busy ? (
              <>
                <span className="spinner" /> Please wait…
              </>
            ) : (
              <>
                {register ? "Create account" : "Sign in"}
                <Icon name="arrow" size={18} />
              </>
            )}
          </button>
        </form>
        <p className="auth-toggle">
          {register ? "Already have an account?" : "New to the kitchen?"}{" "}
          <button
            onClick={() => {
              setRegister(!register);
              setAuthError("");
              setShowPassword(false);
            }}
          >
            {register ? "Sign in" : "Create account"}
          </button>
        </p>
        <p className="auth-footnote">
          <Icon name="check" size={14} /> Your next good meal is one sign-in
          away.
        </p>
      </section>
    </div>
  );
}

function Shell() {
  const { user, run, signOut, busy } = useApp();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navCart = useResource("/cart", user?.role === "customer");
  const cartCount = navCart.data?.items.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );
  useEffect(() => {
    const update = () => navCart.refresh();
    window.addEventListener("hearth:cart-changed", update);
    return () => window.removeEventListener("hearth:cart-changed", update);
  }, []);
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 24);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);
  const workspace = user && user.role !== "customer";
  const navIcon = (path) =>
    path.includes("cart")
      ? "bag"
      : path.includes("addresses")
        ? "pin"
        : path.includes("agents")
          ? "team"
          : path.includes("history") || path.includes("orders")
            ? "clock"
            : path.includes("menu")
              ? "menu"
              : "grid";
  useEffect(() => {
    setMobileOpen(false);
    const target =
      location.hash && document.getElementById(location.hash.slice(1));
    if (target) target.scrollIntoView({ behavior: "instant" });
    else window.scrollTo({ top: 0, behavior: "instant" });
    const titles = {
      menu: "The menu",
      login: "Welcome",
      cart: "Your cart",
      addresses: "Delivery addresses",
      orders: "Orders",
      admin: "Overview",
      kitchen: "Kitchen",
      delivery: "Deliveries",
      history: "History",
      agents: "Delivery team",
    };
    const part = location.pathname.split("/").filter(Boolean).at(-1);
    document.title = `${titles[part] || "Your kitchen"} · Hearth`;
  }, [location.pathname, location.hash]);
  const navigationTarget = (path) =>
    !workspace && path.endsWith("menu") ? `${path}#food-menu` : path;
  function navigateMenu(path) {
    setMobileOpen(false);
    if (!workspace && path.endsWith("menu"))
      document
        .getElementById("food-menu")
        ?.scrollIntoView({
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
            .matches
            ? "instant"
            : "smooth",
        });
  }
  const links =
    user?.role === "customer"
      ? [
          ["/customer/menu", "Our menu"],
          ["/customer/cart", "Your cart"],
          ["/customer/orders", "Orders"],
          ["/customer/addresses", "Addresses"],
        ]
      : user?.role === "admin"
        ? [
            ["/admin", "Overview"],
            ["/admin/menu", "Menu"],
            ["/admin/agents", "Delivery team"],
            ["/admin/orders", "All orders"],
          ]
        : user
          ? [
              [
                `/${user.role}`,
                user.role === "kitchen" ? "Kitchen queue" : "Assignments",
              ],
              [`/${user.role}/history`, "History"],
            ]
          : [["/menu", "Our menu"]];
  return (
    <div
      className={`app-frame ${workspace ? "workspace-frame" : "storefront-frame"}`}
    >
      <header className={`site-header ${scrolled ? "is-scrolled" : ""}`}>
        <div className="header-inner">
          <Link className="brand" to={home(user)} aria-label="Hearth home">
            <span className="brand-mark">
              <Icon name="flame" size={24} />
            </span>
            <span>
              hearth<span className="brand-dot">.</span>
              <small>THE EVERYDAY, ELEVATED</small>
            </span>
          </Link>
          <nav className="desktop-nav" aria-label="Main navigation">
            {links.map(([path, label]) => (
              <NavLink
                key={path}
                end
                to={navigationTarget(path)}
                onClick={() => navigateMenu(path)}
              >
                <Icon name={navIcon(path)} size={16} />
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="account">
            {user?.role === "customer" && (
              <Link
                className="nav-cart"
                to="/customer/cart"
                aria-label={`Your cart${cartCount != null ? `, ${cartCount} items` : ""}`}
              >
                <Icon name="bag" size={19} />
                <span>{cartCount ?? "—"}</span>
              </Link>
            )}
            {user ? (
              <>
                <span className="avatar">{user.name[0]}</span>
                <span className="account-name">
                  {user.name}
                  <small>{user.role} portal</small>
                </span>
                <button
                  className="signout"
                  disabled={busy}
                  onClick={() => run(signOut)}
                >
                  Sign out
                </button>
              </>
            ) : (
              <Link className="btn small" to="/login">
                Sign in <Icon name="arrow" size={16} />
              </Link>
            )}
            <button
              className="mobile-menu-button icon-btn"
              aria-label="Open navigation"
              aria-expanded={mobileOpen}
              aria-haspopup="dialog"
              onClick={() => setMobileOpen(true)}
            >
              <Icon name="menu" />
            </button>
          </div>
        </div>
      </header>
      {mobileOpen && (
        <Modal title="Your hearth." onClose={() => setMobileOpen(false)}>
          <nav className="mobile-navigation" aria-label="Mobile navigation">
            {links.map(([path, label], index) => (
              <NavLink
                key={path}
                end
                to={navigationTarget(path)}
                onClick={() => navigateMenu(path)}
              >
                <span>0{index + 1}</span>
                {label}
                <Icon name="arrow" size={22} />
              </NavLink>
            ))}
            {!user && (
              <NavLink to="/login" onClick={() => setMobileOpen(false)}>
                <span>02</span>Sign in
                <Icon name="arrow" size={22} />
              </NavLink>
            )}
          </nav>
          <p className="mobile-nav-note">The everyday, elevated.</p>
        </Modal>
      )}
      {workspace && (
        <aside className="workspace-rail">
          <p className="eyebrow">YOUR WORKSPACE</p>
          <div className="workspace-label">
            {user.role === "admin"
              ? "The overview."
              : user.role === "kitchen"
                ? "Behind the pass."
                : "On the move."}
          </div>
          <nav aria-label="Workspace navigation">
            {links.map(([path, label]) => (
              <NavLink key={path} end to={path}>
                <Icon name={navIcon(path)} size={19} />
                {label}
                <span>↗</span>
              </NavLink>
            ))}
          </nav>
          <div className="rail-note">
            <Icon name="flame" size={24} />
            <p>
              Good food takes
              <br />a great team.
            </p>
            <span>THE HEARTH COLLECTIVE</span>
          </div>
        </aside>
      )}
      <main id="main" className="site-main">
        {workspace && (
          <div className="workspace-breadcrumb">
            <span>
              HEARTH / <b>{user.role.toUpperCase()}</b>
            </span>
            <span>
              {new Intl.DateTimeFormat("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
                timeZone: "Asia/Kolkata",
              }).format(new Date())}
            </span>
          </div>
        )}
        <motion.div
          key={location.pathname}
          className="route-content"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Suspense
            fallback={
              <div className="route-loading" role="status">
                <span className="spinner" /> Opening your workspace…
              </div>
            }
          >
            <Routes>
              <Route path="/" element={<Navigate to={home(user)} replace />} />
              <Route path="/menu" element={<Menu />} />
              <Route path="/login" element={<AuthPage />} />
              <Route
                path="/customer/*"
                element={
                  <Guard role="customer">
                    <Customer />
                  </Guard>
                }
              />
              <Route
                path="/kitchen/*"
                element={
                  <Guard role="kitchen">
                    <Operations role="kitchen" />
                  </Guard>
                }
              />
              <Route
                path="/delivery/*"
                element={
                  <Guard role="delivery">
                    <Operations role="delivery" />
                  </Guard>
                }
              />
              <Route
                path="/admin/*"
                element={
                  <Guard role="admin">
                    <Admin />
                  </Guard>
                }
              />
              <Route
                path="*"
                element={
                  <div className="empty">
                    <h1>Page not found</h1>
                    <Link className="btn" to={home(user)}>
                      Back to your kitchen
                    </Link>
                  </div>
                }
              />
            </Routes>
          </Suspense>
        </motion.div>
      </main>
      <footer className="site-footer">
        <span>
          hearth<span className="orange">.</span>
          <span className="footer-divider">/</span> A little care. In every
          meal.
        </span>
        <span>THOUGHTFULLY COOKED. HAPPILY DELIVERED.</span>
      </footer>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef();
  const actionLock = useRef(false);
  function notify(text, error = false) {
    window.clearTimeout(toastTimer.current);
    setToast({ text, error });
    toastTimer.current = window.setTimeout(() => setToast(null), 6000);
  }
  function signIn(session) {
    setToken(session.access_token);
    setUser(session.user);
  }
  async function signOut() {
    await api.post("/auth/logout");
    setToken(null);
    setUser(null);
  }
  async function run(action, success) {
    if (actionLock.current) return;
    actionLock.current = true;
    setBusy(true);
    try {
      const result = await action();
      if (success) notify(success);
      return result;
    } catch (error) {
      notify(message(error), true);
    } finally {
      actionLock.current = false;
      setBusy(false);
    }
  }
  useEffect(() => {
    let alive = true;
    refreshSession({ optional: true })
      .then((session) => {
        if (alive && session) signIn(session);
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setBooting(false);
      });
    const expired = () => {
      setUser(null);
      notify("Your session ended. Please sign in again.", true);
    };
    const refreshed = (event) => setUser(event.detail);
    window.addEventListener("session-expired", expired);
    window.addEventListener("session-refreshed", refreshed);
    return () => {
      alive = false;
      window.removeEventListener("session-expired", expired);
      window.removeEventListener("session-refreshed", refreshed);
      window.clearTimeout(toastTimer.current);
    };
  }, []);
  if (booting)
    return (
      <div className="boot" role="status">
        <span className="brand-mark">h.</span>
        <span className="spinner" />
        Opening the kitchen…
      </div>
    );
  return (
    <AppContext.Provider value={{ user, signIn, signOut, busy, run, notify }}>
      <MotionConfig reducedMotion="user">
        <BrowserRouter>
          <a href="#main" className="skip-link">
            Skip to content
          </a>
          <Shell />
        </BrowserRouter>
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className={`toast ${toast.error ? "toast-error" : ""}`}
              role={toast.error ? "alert" : "status"}
            >
              {toast.text}
              <button
                aria-label="Dismiss notification"
                onClick={() => setToast(null)}
              >
                ×
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </MotionConfig>
    </AppContext.Provider>
  );
}
