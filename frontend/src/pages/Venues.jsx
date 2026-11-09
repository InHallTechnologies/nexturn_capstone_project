import { useEffect, useState } from 'react';
import { get, patch, post, remove } from '../api';
import Notice from '../components/Notice';

const emptyVenue = { name: '', location: '', capacity: '' };

export default function Venues() {
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyVenue);
  const [editingId, setEditingId] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  function loadVenues() {
    return get('/admin/venues').then(({ data }) => setVenues(data.venues));
  }

  useEffect(() => { loadVenues().catch((err) => setError(err.message)).finally(() => setLoading(false)); }, []);

  function update(key, value) { setForm({ ...form, [key]: value }); }

  async function save(event) {
    event.preventDefault(); setError(''); setMessage('');
    const body = { ...form, name: form.name.trim(), location: form.location.trim(), capacity: Number(form.capacity) };
    if (!body.name || !Number.isInteger(body.capacity) || body.capacity < 1) return setError('Enter a name and a positive whole-number capacity.');
    try {
      if (editingId) await patch(`/admin/venues/${editingId}`, body);
      else await post('/admin/venues', body);
      setForm(emptyVenue); setEditingId(''); setMessage(editingId ? 'Venue updated.' : 'Venue added.'); await loadVenues();
    } catch (err) { setError(err.message); }
  }

  function edit(venue) {
    setEditingId(venue.id);
    setForm({ name: venue.name, location: venue.location || '', capacity: String(venue.capacity) });
  }

  async function deleteVenue(venue) {
    if (!window.confirm(`Delete ${venue.name}?`)) return;
    setError('');
    try { await remove(`/admin/venues/${venue.id}`); setMessage('Venue deleted.'); await loadVenues(); }
    catch (err) { setError(err.message); }
  }

  return (
    <>
      <div className="page-heading"><div><p className="eyebrow">Admin workspace</p><h1>Venues</h1><p>Set the places and seat limits organizers can use.</p></div></div>
      <section className="panel"><h2>{editingId ? 'Edit venue' : 'Add a venue'}</h2>
        <Notice type="error">{error}</Notice><Notice>{message}</Notice>
        <form className="inline-form" onSubmit={save}>
          <label>Name<input value={form.name} onChange={(e) => update('name', e.target.value)} required /></label>
          <label>Location<input value={form.location} onChange={(e) => update('location', e.target.value)} /></label>
          <label>Capacity<input type="number" min="1" value={form.capacity} onChange={(e) => update('capacity', e.target.value)} required /></label>
          <div className="button-row"><button className="button button-primary">{editingId ? 'Save venue' : 'Add venue'}</button>{editingId && <button type="button" className="button button-light" onClick={() => { setEditingId(''); setForm(emptyVenue); }}>Cancel</button>}</div>
        </form>
      </section>
      {loading ? <p className="page-message">Loading venues…</p> : <div className="table-list">{venues.map((venue) => <article className="list-row" key={venue.id}><div className="list-main"><h2>{venue.name}</h2><p>{venue.location || 'Location not set'} · {venue.capacity} seats</p><code>{venue.id}</code></div><div className="button-row"><button className="button button-light" onClick={() => edit(venue)}>Edit</button><button className="button button-danger" onClick={() => deleteVenue(venue)}>Delete</button></div></article>)}</div>}
    </>
  );
}
