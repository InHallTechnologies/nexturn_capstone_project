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
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import loginIllustration from '../../assets/login_illustration.jpg';
import './AuthPages.css';

/**
 * Clean SVG 3D Isometric Cube Logo matching the reference mockup
 */
export const RetailInventoryLogo = ({ size = 32, className = '' }) => (
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
      Retail Inventory
    </span>
  </div>
);

export const LoginPage = () => {
  const { login } = useAuth();
  const { showSuccess } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

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

  return (
    <div className="auth-page-wrapper">
      <div className="auth-split-card">
        {/* ====================================================================
            LEFT BRANDING & 3D ILLUSTRATION PANEL
            ==================================================================== */}
        <div className="auth-brand-panel">
          {/* Top Brand & Headline */}
          <div className="auth-brand-header">
            <Link to="/login" className="auth-logo-badge" aria-label="Retail Inventory home">
              <RetailInventoryLogo size={36} />
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
              alt="Retail inventory shelving and warehouse illustration"
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
          <p className="auth-form-subtitle">Sign in to your Retail Inventory account</p>

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

          {/* Footer Prompt */}
          <div className="auth-footer-prompt">
            Don't have an account?
            <Link to="/register" className="auth-footer-link">
              Create an account
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
};

export default LoginPage;
