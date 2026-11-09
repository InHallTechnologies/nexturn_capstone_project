import React, { useState } from "react";
import { LayoutGrid, Eye, EyeOff, ArrowRight, ShieldCheck } from "lucide-react";
import { api } from "./api.jsx";

export default function Login({ onLogin }) {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (isRegister) await api("/register", "POST", { name: name.trim(), email: email.trim(), password });
      const data = await api("/login", "POST", { email: email.trim(), password });
      localStorage.setItem("token", data.token);
      localStorage.setItem("name", data.name);
      localStorage.setItem("id", data.id);
      onLogin(data.name);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-art">
        <div className="auth-brand"><div className="brand-mark"><LayoutGrid size={20}/></div><strong>Trackspace</strong></div>
        <div className="auth-art-content">
          <div className="eyebrow"><span/> WORK BETTER, TOGETHER</div>
          <h1>Great work<br/>starts with<br/><em>clear focus.</em></h1>
          <p>Bring every task, teammate, and milestone into one calm, organized workspace.</p>
          <div className="preview-board">
            <div className="preview-head"><span>SPRINT BOARD</span><span className="preview-live">● LIVE</span></div>
            <div className="preview-columns">
              <div><b><i className="status-dot todo"/>To do</b><span className="preview-card">Plan onboarding flow</span><span className="preview-card short">Update project brief</span></div>
              <div><b><i className="status-dot progress"/>In progress</b><span className="preview-card">Design system refresh</span></div>
              <div><b><i className="status-dot done"/>Done</b><span className="preview-card">API foundations</span></div>
            </div>
          </div>
        </div>
        <div className="auth-footer"><ShieldCheck size={15}/> Your workspace, organized.</div>
      </section>
      <section className="auth-panel">
        <form className="auth-form" onSubmit={submit}>
          <div className="mobile-brand"><div className="brand-mark"><LayoutGrid size={18}/></div><strong>Trackspace</strong></div>
          <span className="form-kicker">{isRegister ? "GET STARTED" : "WELCOME BACK"}</span>
          <h2>{isRegister ? "Create your account" : "Sign in to your workspace"}</h2>
          <p className="form-subtitle">{isRegister ? "Set up your account to start managing projects." : "Enter your details to pick up where you left off."}</p>
          {isRegister && <label>Full name<input autoComplete="name" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" required/></label>}
          <label>Email address<input type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" required/></label>
          <label>Password<div className="password-wrap"><input type={showPassword ? "text" : "password"} autoComplete={isRegister ? "new-password" : "current-password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" required minLength={isRegister ? 6 : undefined}/><button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={17}/> : <Eye size={17}/>}</button></div></label>
          {error && <div className="error-banner">{error}</div>}
          <button className="primary-button auth-submit" disabled={loading} type="submit">{loading ? "Please wait…" : isRegister ? "Create account" : "Sign in"}{!loading && <ArrowRight size={17}/>}</button>
          <p className="auth-switch">{isRegister ? "Already have an account?" : "New to Trackspace?"} <button type="button" onClick={() => {setIsRegister(!isRegister);setError("");}}> {isRegister ? "Sign in" : "Create an account"}</button></p>
        </form>
        <div className="auth-panel-footer">Simple project tracking for teams.</div>
      </section>
    </main>
  );
}
