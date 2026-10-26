import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import AuthLayout from "../../components/auth/AuthLayout";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  function handleChange(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const signedInUser = await login(form.email, form.password);
      navigate(signedInUser.role === "client" ? "/portal" : "/dashboard");
    } catch {
      setError("That email and password did not match.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout
      eyebrow="WELCOME BACK"
      title="Your work, in focus."
      description="Sign in to pick up where you left off."
      footer={
        <span>
          New to BillYourTime?{" "}
          <Link to="/register">
            Create an account <b>↗</b>
          </Link>
        </span>
      }
    >
      {error && <div className="auth-alert">{error}</div>}
      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          Email address
          <input
            name="email"
            type="email"
            required
            placeholder="you@studio.com"
            autoComplete="email"
            value={form.email}
            onChange={handleChange}
          />
        </label>
        <label>
          Password
          <span className="auth-password-field">
            <input
              name="password"
              type={showPassword ? "text" : "password"}
              minLength="8"
              required
              placeholder="Enter your password"
              autoComplete="current-password"
              value={form.password}
              onChange={handleChange}
            />
            <button
              type="button"
              className="auth-password-toggle"
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              onClick={() => setShowPassword((visible) => !visible)}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </span>
        </label>
        <button className="auth-submit" disabled={isSubmitting}>
          <span>{isSubmitting ? "Logging in..." : "Login"}</span>
          <b>↗</b>
        </button>
      </form>
    </AuthLayout>
  );
}
