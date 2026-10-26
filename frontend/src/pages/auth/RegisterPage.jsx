import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, apiError } from "../../app/api";
import { useAuth } from "../../context/AuthContext";
import AuthLayout from "../../components/auth/AuthLayout";

export default function RegisterPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    business_name: "",
    email: "",
    password: "",
    role: "freelancer",
  });
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
      await api.post("/auth/register", form);
      await login(form.email, form.password);
      navigate(form.role === "client" ? "/portal" : "/dashboard");
    } catch (requestError) {
      setError(apiError(requestError, "Could not create your account."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout
      eyebrow="CREATE YOUR SPACE"
      title="Make space for good work."
      description="Set up your workspace and keep every project moving."
      footer={
        <span>
          Already have an account?{" "}
          <Link to="/login">
            Sign in <b>↗</b>
          </Link>
        </span>
      }
    >
      {error && <div className="auth-alert">{error}</div>}
      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          Your name or business
          <input
            name="business_name"
            required
            placeholder="BillYourTime Studio"
            value={form.business_name}
            onChange={handleChange}
          />
        </label>
        <label>
          Email address
          <input
            name="email"
            type="email"
            required
            placeholder="you@studio.com"
            value={form.email}
            onChange={handleChange}
          />
        </label>
        <div className="auth-form-row">
          <label>
            Password
            <span className="auth-password-field">
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                minLength="8"
                required
                placeholder="8+ characters"
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
          <label>
            Your role
            <select name="role" value={form.role} onChange={handleChange}>
              <option value="freelancer">Freelancer</option>
              <option value="client">Client</option>
            </select>
          </label>
        </div>
        <button className="auth-submit" disabled={isSubmitting}>
          <span>
            {isSubmitting ? "Registering..." : "Register"}
          </span>
          <b>↗</b>
        </button>
      </form>
    </AuthLayout>
  );
}
