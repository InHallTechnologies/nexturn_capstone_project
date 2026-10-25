import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  ArrowRight,
  Package,
  FileText,
  TrendingUp,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import loginIllustration from '../../assets/login_illustration.jpg';
import './AuthPages.css';

/**
 * Clean SVG 3D Isometric Cube Logo matching the reference mockup
 */
export const StockPilotLogo = ({ size = 32, className = '' }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }} className={className}>
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
      {/* Outer Hexagonal Shield */}
      <polygon
        points="18,3 32,10.5 32,25.5 18,33 4,25.5 4,10.5"
        fill="#595F39"
      />
      {/* Top Facet */}
      <polygon
        points="18,5.5 29,11.5 18,17.5 7,11.5"
        fill="#798252"
      />
      {/* Left Facet */}
      <polygon
        points="7,13.5 17,19 17,30.5 7,24.5"
        fill="#4A502E"
      />
      {/* Right Facet */}
      <polygon
        points="19,19 29,13.5 29,24.5 19,30.5"
        fill="#5E663B"
      />
      {/* Geometric Inner Cube Accent */}
      <polygon
        points="18,9 23,12 18,15 13,12"
        fill="#E4E4DE"
      />
    </svg>
    <span
      style={{
        fontSize: '1.35rem',
        fontWeight: 800,
        color: '#1B1B1B',
        letterSpacing: '-0.03em',
      }}
    >
      StockPilot
    </span>
  </div>
);

/**
 * Official Google Multicolored "G" SVG
 */
export const GoogleIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="#4285F4"
      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.15z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.28v3.15C3.26 21.36 7.34 24 12 24z"
    />
    <path
      fill="#FBBC05"
      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.28C.46 8.2.0 10.04.0 12s.46 3.8.1.28 5.42l4-3.15z"
    />
    <path
      fill="#EA4335"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.28 6.58l4 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
    />
  </svg>
);

export const LoginPage = () => {
  const { login } = useAuth();
  const { showSuccess, showInfo } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [showDemoDrawer, setShowDemoDrawer] = useState(false);

  const from = location.state?.from?.pathname || '/dashboard';

  const validate = () => {
    const errors = {};
    if (!email.trim()) {
      errors.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Please enter a valid work email address.';
    }

    if (!password) {
      errors.password = 'Password is required.';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setError('');
    setLoading(true);
    try {
      const user = await login(email.trim(), password);
      showSuccess(`Welcome back, ${user.name}! Signed in as ${user.role}.`);
      navigate(from, { replace: true });
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Invalid email or password. Please verify your credentials.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setFieldErrors({});
    setError('');
    setLoading(true);
    try {
      const user = await login(demoEmail, demoPassword);
      showSuccess(`Welcome back, ${user.name}! Signed in as ${user.role}.`);
      navigate(from, { replace: true });
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Demo login failed. Please ensure the backend is running.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleClick = () => {
    showInfo(
      'Google single sign-on is not currently enabled for this tenant. Please sign in with email and password.'
    );
  };

  const handleForgotPassword = (e) => {
    e.preventDefault();
    showInfo(
      'Please contact your organization administrator or store owner to reset operator credentials.'
    );
  };

  return (
    <div className="auth-page-wrapper">
      <div className="auth-split-card">
        {/* ====================================================================
            LEFT BRANDING & 3D ILLUSTRATION PANEL
            ==================================================================== */}
        <div className="auth-brand-panel">
          {/* Top Brand & Headline */}
          <div className="auth-brand-header">
            <Link to="/" className="auth-logo-badge" aria-label="StockPilot Home">
              <StockPilotLogo size={36} />
            </Link>

            <h1 className="auth-brand-headline">
              Manage Inventory.
              <br />
              Simplify Operations.
              <br />
              Grow Your Business.
            </h1>
          </div>

          {/* Center 3D Isometric Warehouse Illustration */}
          <div className="auth-illustration-container">
            <img
              src={loginIllustration}
              alt="StockPilot 3D Inventory Shelving and Warehouse Illustration"
              className="auth-illustration-img"
            />
          </div>

          {/* Bottom Features Section */}
          <div className="auth-features-section">
            <div className="auth-features-caption">Trusted by modern retail businesses</div>

            <div className="auth-features-row">
              <div className="auth-feature-badge">
                <div className="auth-feature-icon-box">
                  <Package size={20} strokeWidth={1.8} />
                </div>
                <span className="auth-feature-title">Track Stock</span>
              </div>

              <div className="auth-feature-badge">
                <div className="auth-feature-icon-box">
                  <FileText size={20} strokeWidth={1.8} />
                </div>
                <span className="auth-feature-title">Manage Orders</span>
              </div>

              <div className="auth-feature-badge">
                <div className="auth-feature-icon-box">
                  <TrendingUp size={20} strokeWidth={1.8} />
                </div>
                <span className="auth-feature-title">Grow Faster</span>
              </div>
            </div>
          </div>
        </div>

        {/* ====================================================================
            RIGHT AUTHENTICATION FORM CARD
            ==================================================================== */}
        <div className="auth-form-panel">
          <h2 className="auth-form-title">Welcome Back</h2>
          <p className="auth-form-subtitle">Sign in to your StockPilot account</p>

          {/* Error Banner */}
          {error && (
            <div className="auth-error-banner" role="alert">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            {/* Email Address Field */}
            <div className="auth-field-group">
              <div className="auth-input-wrapper">
                <Mail size={18} className="auth-input-icon" />
                <input
                  id="login-email"
                  type="email"
                  className={`auth-input-field ${fieldErrors.email ? 'has-error' : ''}`}
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: '' });
                  }}
                  autoComplete="email"
                  disabled={loading}
                  required
                />
              </div>
              {fieldErrors.email && (
                <div className="auth-field-error-text">{fieldErrors.email}</div>
              )}
            </div>

            {/* Password Field */}
            <div className="auth-field-group">
              <div className="auth-input-wrapper">
                <Lock size={18} className="auth-input-icon" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  className={`auth-input-field has-trailing ${
                    fieldErrors.password ? 'has-error' : ''
                  }`}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) setFieldErrors({ ...fieldErrors, password: '' });
                  }}
                  autoComplete="current-password"
                  disabled={loading}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="auth-password-toggle"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {fieldErrors.password && (
                <div className="auth-field-error-text">{fieldErrors.password}</div>
              )}
            </div>

            {/* Options Row: Remember Me & Forgot Password */}
            <div className="auth-options-row">
              <label className="auth-checkbox-label" htmlFor="remember-me">
                <input
                  id="remember-me"
                  type="checkbox"
                  className="auth-checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span>Remember me</span>
              </label>

              <a href="#forgot" onClick={handleForgotPassword} className="auth-link">
                Forgot password?
              </a>
            </div>

            {/* Submit Button: Sign In */}
            <button type="submit" className="auth-btn-primary" disabled={loading}>
              {loading ? (
                <span>Signing in...</span>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* Divider: OR */}
          <div className="auth-divider">
            <span className="auth-divider-line" />
            <span className="auth-divider-text">OR</span>
            <span className="auth-divider-line" />
          </div>

          {/* Google Sign In */}
          <button type="button" className="auth-btn-google" onClick={handleGoogleClick}>
            <GoogleIcon size={18} />
            <span>Continue with Google</span>
          </button>

          {/* Footer Prompt */}
          <div className="auth-footer-prompt">
            Don't have an account?
            <Link to="/register" className="auth-footer-link">
              Create an account
            </Link>
          </div>

          {/* Quick Demo Keycards Drawer (For easy evaluation) */}
          <div className="auth-demo-drawer">
            <button
              type="button"
              className="auth-demo-toggle"
              onClick={() => setShowDemoDrawer(!showDemoDrawer)}
            >
              <span>Quick Demo Accounts</span>
              {showDemoDrawer ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {showDemoDrawer && (
              <div className="auth-demo-grid">
                <button
                  type="button"
                  className="auth-demo-btn"
                  onClick={() => handleDemoLogin('owner@example.com', 'Owner@123')}
                  disabled={loading}
                >
                  <span className="auth-demo-role">
                    <CheckCircle2 size={11} style={{ display: 'inline', marginRight: 3 }} />
                    Owner
                  </span>
                  <span className="auth-demo-desc">Full Executive</span>
                </button>

                <button
                  type="button"
                  className="auth-demo-btn"
                  onClick={() => handleDemoLogin('manager@example.com', 'Manager@123')}
                  disabled={loading}
                >
                  <span className="auth-demo-role">
                    <CheckCircle2 size={11} style={{ display: 'inline', marginRight: 3 }} />
                    Manager
                  </span>
                  <span className="auth-demo-desc">Warehouse &amp; POs</span>
                </button>

                <button
                  type="button"
                  className="auth-demo-btn"
                  onClick={() => handleDemoLogin('staff@example.com', 'Staff@123')}
                  disabled={loading}
                >
                  <span className="auth-demo-role">
                    <CheckCircle2 size={11} style={{ display: 'inline', marginRight: 3 }} />
                    Staff
                  </span>
                  <span className="auth-demo-desc">POS &amp; Stock</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
