import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  User,
  ArrowRight,
  Package,
  FileText,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import registerIllustration from '../../assets/register_illustration.jpg';
import { RetailInventoryLogo } from './LoginPage';
import './AuthPages.css';

export const RegisterPage = () => {
  const { register } = useAuth();
  const { showSuccess } = useToast();
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const validate = () => {
    const errors = {};
    const trimmedFirst = firstName.trim();
    const trimmedEmail = email.trim();

    if (!trimmedFirst) {
      errors.firstName = 'First name is required.';
    }

    if (!trimmedEmail) {
      errors.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      errors.email = 'Please enter a valid work email address.';
    }

    if (!password) {
      errors.password = 'Password is required.';
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters long.';
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Please confirm your password.';
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setError('');
    setLoading(true);

    const fullName = lastName.trim()
      ? `${firstName.trim()} ${lastName.trim()}`
      : firstName.trim();

    try {
      const response = await register(fullName, email.trim(), password);
      showSuccess(response?.message || 'Account registered successfully! Please sign in.');
      navigate('/login');
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Registration failed. Please verify your details.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-wrapper">
      <div className="auth-split-card">
        {/* ====================================================================
            LEFT BRANDING & 3D LAPTOP DASHBOARD ILLUSTRATION PANEL
            ==================================================================== */}
        <div className="auth-brand-panel">
          {/* Top Brand & Headline */}
          <div className="auth-brand-header">
            <Link to="/register" className="auth-logo-badge" aria-label="Retail Inventory home">
              <RetailInventoryLogo size={36} />
            </Link>

            <h1 className="auth-brand-headline">
              Start Managing Your
              <br />
              Inventory Smarter
            </h1>

            <p className="auth-brand-subtext">
              Create your account and take control of your business with Retail Inventory.
            </p>
          </div>

          {/* Center 3D Isometric Laptop Illustration */}
          <div className="auth-illustration-container">
            <img
              src={registerIllustration}
              alt="Retail inventory dashboard illustration"
              className="auth-illustration-img"
            />
          </div>

          {/* Bottom Features Section */}
          <div className="auth-features-section">
            <div className="auth-features-caption">Everything you need in one place</div>

            <div className="auth-features-row">
              <div className="auth-feature-badge">
                <div className="auth-feature-icon-box">
                  <Package size={20} strokeWidth={1.8} />
                </div>
                <span className="auth-feature-title">Inventory Management</span>
              </div>

              <div className="auth-feature-badge">
                <div className="auth-feature-icon-box">
                  <FileText size={20} strokeWidth={1.8} />
                </div>
                <span className="auth-feature-title">Purchase Orders</span>
              </div>

              <div className="auth-feature-badge">
                <div className="auth-feature-icon-box">
                  <TrendingUp size={20} strokeWidth={1.8} />
                </div>
                <span className="auth-feature-title">Sales &amp; Analytics</span>
              </div>
            </div>
          </div>
        </div>

        {/* ====================================================================
            RIGHT REGISTRATION FORM CARD
            ==================================================================== */}
        <div className="auth-form-panel">
          <h2 className="auth-form-title">Create Your Account</h2>
          <p className="auth-form-subtitle">Join Retail Inventory and streamline your operations.</p>

          {/* Error Banner */}
          {error && (
            <div className="auth-error-banner" role="alert">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            {/* Row 1: First Name & Last Name */}
            <div className="auth-row-2col">
              {/* First Name */}
              <div className="auth-field-group" style={{ marginBottom: 0 }}>
                <div className="auth-input-wrapper">
                  <User size={18} className="auth-input-icon" />
                  <input
                    id="register-firstname"
                    type="text"
                    className={`auth-input-field ${fieldErrors.firstName ? 'has-error' : ''}`}
                    placeholder="First Name"
                    value={firstName}
                    onChange={(e) => {
                      setFirstName(e.target.value);
                      if (fieldErrors.firstName) setFieldErrors({ ...fieldErrors, firstName: '' });
                    }}
                    autoComplete="given-name"
                    disabled={loading}
                    required
                  />
                </div>
                {fieldErrors.firstName && (
                  <div className="auth-field-error-text">{fieldErrors.firstName}</div>
                )}
              </div>

              {/* Last Name */}
              <div className="auth-field-group" style={{ marginBottom: 0 }}>
                <div className="auth-input-wrapper">
                  <User size={18} className="auth-input-icon" />
                  <input
                    id="register-lastname"
                    type="text"
                    className="auth-input-field"
                    placeholder="Last Name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    autoComplete="family-name"
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            {/* Email Address Field */}
            <div className="auth-field-group">
              <div className="auth-input-wrapper">
                <Mail size={18} className="auth-input-icon" />
                <input
                  id="register-email"
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
                  id="register-password"
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
                  minLength={8}
                  autoComplete="new-password"
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

            {/* Confirm Password Field */}
            <div className="auth-field-group">
              <div className="auth-input-wrapper">
                <Lock size={18} className="auth-input-icon" />
                <input
                  id="register-confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  className={`auth-input-field has-trailing ${
                    fieldErrors.confirmPassword ? 'has-error' : ''
                  }`}
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (fieldErrors.confirmPassword) {
                      setFieldErrors({ ...fieldErrors, confirmPassword: '' });
                    }
                  }}
                  minLength={8}
                  autoComplete="new-password"
                  disabled={loading}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="auth-password-toggle"
                  aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {fieldErrors.confirmPassword && (
                <div className="auth-field-error-text">{fieldErrors.confirmPassword}</div>
              )}
            </div>

            {/* Primary Action Button: Create Account */}
            <button
              type="submit"
              className="auth-btn-primary"
              style={{ marginTop: '0.5rem' }}
              disabled={loading}
            >
              {loading ? (
                <span>Creating account...</span>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* Footer Prompt */}
          <div className="auth-footer-prompt">
            Already have an account?
            <Link to="/login" className="auth-footer-link">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
