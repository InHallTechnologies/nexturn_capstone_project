import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import Notice from '../components/Notice';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function update(key, value) {
    setForm({ ...form, [key]: value });
  }

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await register(form.name, form.email, form.password);
      navigate('/login', { state: { email: form.email }, replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="form-panel">
      <p className="eyebrow">Join the campus calendar</p><h1>Create an account</h1>
      <p className="muted">Student accounts can be created here. Organizers and admins are added by an admin.</p>
      <Notice type="error">{error}</Notice>
      <form onSubmit={submit} className="stack-form">
        <label>Name<input autoComplete="name" value={form.name} onChange={(e) => update('name', e.target.value)} required /></label>
        <label>Email<input type="email" autoComplete="email" value={form.email} onChange={(e) => update('email', e.target.value)} required /></label>
        <label>Password<input type="password" autoComplete="new-password" minLength="8" value={form.password} onChange={(e) => update('password', e.target.value)} required /><small>Use at least 8 characters.</small></label>
        <button className="button button-primary" disabled={busy}>{busy ? 'Creating account…' : 'Create account'}</button>
      </form>
      <p className="form-foot">Already registered? <Link to="/login">Sign in</Link></p>
    </section>
  );
}
