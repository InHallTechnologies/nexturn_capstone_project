import { useEffect, useState } from 'react';
import { get, patch, post } from '../api';
import Notice from '../components/Notice';

const emptyUser = { name: '', email: '', password: '', role: 'organizer' };

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyUser);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const matchingUsers = users.filter((user) =>
    [user.name, user.email, user.role].some((value) =>
      String(value || '').toLowerCase().includes(search.trim().toLowerCase()),
    ),
  );

  function loadUsers() { return get('/admin/users').then(({ data }) => setUsers(data.users)); }
  useEffect(() => { loadUsers().catch((err) => setError(err.message)).finally(() => setLoading(false)); }, []);
  function update(key, value) { setForm({ ...form, [key]: value }); }

  async function createUser(event) {
    event.preventDefault(); setError(''); setMessage('');
    try {
      await post('/admin/users', form);
      setForm(emptyUser); setMessage('User created.'); await loadUsers();
    } catch (err) { setError(err.message); }
  }

  async function changeRole(user, role) {
    setError('');
    try { await patch(`/admin/users/${user.id}/role`, { role }); setMessage(`Updated ${user.name}'s role.`); await loadUsers(); }
    catch (err) { setError(err.message); }
  }

  return (
    <>
      <div className="page-heading"><div><p className="eyebrow">Admin workspace</p><h1>Users</h1><p>Create organizer accounts and manage account roles.</p></div></div>
      <section className="panel"><h2>Add a user</h2><Notice>{message}</Notice><Notice type="error">{error}</Notice>
        <form className="inline-form" onSubmit={createUser}>
          <label>Name<input value={form.name} onChange={(e) => update('name', e.target.value)} required /></label>
          <label>Email<input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} required /></label>
          <label>Temporary password<input type="password" minLength="8" value={form.password} onChange={(e) => update('password', e.target.value)} required /></label>
          <label>Role<select value={form.role} onChange={(e) => update('role', e.target.value)}><option value="organizer">Organizer</option><option value="admin">Admin</option><option value="student">Student</option></select></label>
          <button className="button button-primary">Create user</button>
        </form>
      </section>
      <section className="filter-bar user-search"><label className="search-field">Search users<input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, email, or role" /></label></section>
      {loading ? <p className="page-message">Loading users…</p> : matchingUsers.length ? <div className="table-list">{matchingUsers.map((user) => <article className="list-row" key={user.id}><div className="list-main"><h2>{user.name}</h2><p>{user.email}</p></div><label className="role-control">Role<select value={user.role} onChange={(e) => changeRole(user, e.target.value)}><option value="admin">Admin</option><option value="organizer">Organizer</option><option value="student">Student</option></select></label></article>)}</div> : <div className="empty-panel"><h2>No users found</h2><p>Try another name, email, or role.</p></div>}
    </>
  );
}
