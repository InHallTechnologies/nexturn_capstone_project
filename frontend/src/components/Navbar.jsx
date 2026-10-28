import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import {
  FaBars,
  FaBuilding,
  FaHeart,
  FaHome,
  FaPlus,
  FaShieldAlt,
  FaSignOutAlt,
  FaTimes,
  FaUser,
} from "react-icons/fa";
import { useAuth } from "../context/AuthContext";

function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    setMobileMenuOpen(false);
    navigate("/login");
  };

  const navLinkClass = ({ isActive }) =>
    `px-3 py-2 rounded-xl text-sm font-semibold transition-all duration-150 ${
      isActive
        ? "text-blue-600 bg-blue-50/80 font-bold"
        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
    }`;

  const mobileNavLinkClass = ({ isActive }) =>
    `block px-4 py-2.5 rounded-xl text-base font-semibold transition-all ${
      isActive
        ? "text-blue-600 bg-blue-50 font-bold"
        : "text-slate-700 hover:bg-slate-100"
    }`;

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/80 transition-shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <Link
            to="/"
            className="flex items-center gap-2.5 group"
            onClick={() => setMobileMenuOpen(false)}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/30 group-hover:scale-105 transition-transform">
              <FaHome className="text-xl" />
            </div>
            <div>
              <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 to-blue-900 bg-clip-text text-transparent">
                Rent<span className="text-blue-600">Ease</span>
              </span>
              <span className="block text-[10px] font-semibold text-slate-400 tracking-wider uppercase -mt-1">
                Property Platform
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1.5">
            <NavLink to="/" className={navLinkClass}>
              Home
            </NavLink>
            <NavLink to="/properties" className={navLinkClass}>
              Browse Properties
            </NavLink>

            {/* Seeker Links */}
            {user?.role === "seeker" && (
              <>
                <NavLink to="/favorites" className={navLinkClass}>
                  <span className="inline-flex items-center gap-1.5">
                    <FaHeart className="text-rose-500 text-xs" />
                    Favorites
                  </span>
                </NavLink>
                <NavLink to="/my-enquiries" className={navLinkClass}>
                  My Enquiries
                </NavLink>
              </>
            )}

            {/* Owner Links */}
            {user?.role === "owner" && (
              <>
                <NavLink to="/owner/dashboard" className={navLinkClass}>
                  <span className="inline-flex items-center gap-1.5">
                    <FaBuilding className="text-blue-500 text-xs" />
                    My Listings
                  </span>
                </NavLink>
                <NavLink to="/owner/enquiries" className={navLinkClass}>
                  Enquiries
                </NavLink>
                <Link
                  to="/owner/properties/new"
                  className="ml-1 inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold transition-colors"
                >
                  <FaPlus className="text-[10px]" />
                  <span>Add Property</span>
                </Link>
              </>
            )}

            {/* Admin Links */}
            {user?.role === "admin" && (
              <NavLink to="/admin/dashboard" className={navLinkClass}>
                <span className="inline-flex items-center gap-1.5">
                  <FaShieldAlt className="text-amber-500 text-xs" />
                  Admin Portal
                </span>
              </NavLink>
            )}
          </nav>

          {/* Desktop Auth / User Action Buttons */}
          <div className="hidden md:flex items-center gap-3">
            {!user ? (
              <>
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm font-semibold text-slate-700 hover:text-blue-600 transition-colors"
                >
                  Log in
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl transition-all shadow-sm shadow-blue-500/20"
                >
                  Get Started
                </Link>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 pl-2 pr-3 py-1 bg-slate-100 rounded-full text-xs font-semibold text-slate-700">
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">
                    <FaUser />
                  </div>
                  <span className="max-w-[120px] truncate">{user.username || user.email}</span>
                  <span
                    className={`ml-1 px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider font-bold ${
                      user.role === "admin"
                        ? "bg-amber-100 text-amber-800"
                        : user.role === "owner"
                        ? "bg-indigo-100 text-indigo-800"
                        : "bg-emerald-100 text-emerald-800"
                    }`}
                  >
                    {user.role}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                  title="Log out"
                >
                  <FaSignOutAlt />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center md:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <FaTimes className="text-lg" /> : <FaBars className="text-lg" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 space-y-2 animate-in slide-in-from-top-2 duration-150">
          <NavLink
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className={mobileNavLinkClass}
          >
            Home
          </NavLink>
          <NavLink
            to="/properties"
            onClick={() => setMobileMenuOpen(false)}
            className={mobileNavLinkClass}
          >
            Browse Properties
          </NavLink>

          {user?.role === "seeker" && (
            <>
              <NavLink
                to="/favorites"
                onClick={() => setMobileMenuOpen(false)}
                className={mobileNavLinkClass}
              >
                Saved Favorites
              </NavLink>
              <NavLink
                to="/my-enquiries"
                onClick={() => setMobileMenuOpen(false)}
                className={mobileNavLinkClass}
              >
                My Enquiries
              </NavLink>
            </>
          )}

          {user?.role === "owner" && (
            <>
              <NavLink
                to="/owner/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className={mobileNavLinkClass}
              >
                My Properties
              </NavLink>
              <NavLink
                to="/owner/enquiries"
                onClick={() => setMobileMenuOpen(false)}
                className={mobileNavLinkClass}
              >
                Property Enquiries
              </NavLink>
              <NavLink
                to="/owner/properties/new"
                onClick={() => setMobileMenuOpen(false)}
                className={mobileNavLinkClass}
              >
                + Add New Property
              </NavLink>
            </>
          )}

          {user?.role === "admin" && (
            <NavLink
              to="/admin/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className={mobileNavLinkClass}
            >
              Admin Dashboard
            </NavLink>
          )}

          <div className="pt-4 border-t border-slate-100">
            {!user ? (
              <div className="grid grid-cols-2 gap-2">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-center py-2.5 px-4 rounded-xl text-sm font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50"
                >
                  Log in
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-center py-2.5 px-4 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700"
                >
                  Register
                </Link>
              </div>
            ) : (
              <div className="flex items-center justify-between pt-2">
                <div className="text-xs">
                  <p className="font-bold text-slate-800">{user.username}</p>
                  <span className="text-slate-400 capitalize">{user.role} account</span>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-rose-600 bg-rose-50"
                >
                  <FaSignOutAlt />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

export default Navbar;
