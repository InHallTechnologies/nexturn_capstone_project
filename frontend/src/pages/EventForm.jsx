import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { get, post, patch } from '../api';
import Notice from '../components/Notice';
import { eventIsComplete } from '../eventTime';

const emptyForm = { title: '', description: '', category: '', tags: '', banner_url: '', venue_id: '', capacity: '', start_time: '', end_time: '' };

function localDateTime(value) {
  if (!value) return '';
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

export default function EventForm() {
  const { eventId } = useParams();
  const editing = Boolean(eventId);
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [venues, setVenues] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    get('/organizer/venues').then(({ data }) => setVenues(data.venues)).catch((err) => setError(err.message));
    if (editing) {
      get(`/organizer/events/${eventId}`).then(({ data }) => {
        const event = data.event;
        setCompleted(eventIsComplete(event));
        setForm({ ...emptyForm, ...event, tags: (event.tags || []).join(', '), start_time: localDateTime(event.start_time), end_time: localDateTime(event.end_time), capacity: String(event.capacity) });
      }).catch((err) => setError(err.message));
    }
  }, [eventId, editing]);

  function update(key, value) {
    setForm({ ...form, [key]: value });
  }

  async function submit(event) {
    event.preventDefault();
    setError('');
    const capacity = Number(form.capacity);
    if (!Number.isInteger(capacity) || capacity < 1) return setError('Enter a positive whole-number capacity.');
    if (!form.start_time || !form.end_time || new Date(form.end_time) <= new Date(form.start_time)) return setError('Choose an end time after the start time.');
    const venue = venues.find((item) => item.id === form.venue_id);
    if (!venue) return setError('Choose a venue.');
    if (capacity > venue.capacity) return setError(`This venue holds at most ${venue.capacity} people.`);

    const body = {
      ...form,
      capacity,
      tags: form.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
      banner_url: form.banner_url || null,
      start_time: new Date(form.start_time).toISOString(),
      end_time: new Date(form.end_time).toISOString(),
    };
    setBusy(true);
    try {
      const result = editing ? await patch(`/organizer/events/${eventId}`, body) : await post('/organizer/events', body);
      navigate(`/organizer/events/${result.data.event.id}`);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  return (
    <section className="form-page">
      <Link className="back-link" to="/organizer">← Your events</Link>
      <p className="eyebrow">Organizer workspace</p><h1>{editing ? 'Edit event' : 'Create an event'}</h1>
      <p className="muted">Save a draft first. You can submit it for approval from its dashboard.</p>
      {completed && <Notice type="error">This event has ended and can no longer be edited.</Notice>}
      <Notice type="error">{error}</Notice>
      <form className="form-grid" onSubmit={submit}>
        <fieldset disabled={completed} className="event-fields">
        <label>Event title<input value={form.title} onChange={(e) => update('title', e.target.value)} required /></label>
        <label>Category<input value={form.category} onChange={(e) => update('category', e.target.value)} required placeholder="Music, sport, workshop…" /></label>
        <label className="wide-field">Description<textarea rows="4" value={form.description} onChange={(e) => update('description', e.target.value)} /></label>
        <label>Tags <small>Separate with commas</small><input value={form.tags} onChange={(e) => update('tags', e.target.value)} placeholder="welcome, music" /></label>
        <label>Banner image URL<input type="url" value={form.banner_url || ''} onChange={(e) => update('banner_url', e.target.value)} placeholder="Optional" /></label>
        <label>Venue<select value={form.venue_id} onChange={(e) => update('venue_id', e.target.value)} required><option value="">Choose a venue</option>{venues.map((venue) => <option key={venue.id} value={venue.id}>{venue.name} · {venue.capacity} seats</option>)}</select></label>
        <label>Capacity<input type="number" min="1" value={form.capacity} onChange={(e) => update('capacity', e.target.value)} required /></label>
        <label>Starts<input type="datetime-local" value={form.start_time} onChange={(e) => update('start_time', e.target.value)} required /></label>
        <label>Ends<input type="datetime-local" value={form.end_time} onChange={(e) => update('end_time', e.target.value)} required /></label>
        </fieldset>
        <div className="wide-field button-row"><button className="button button-primary" disabled={busy || completed}>{busy ? 'Saving…' : editing ? 'Save changes' : 'Create draft'}</button><Link className="button button-light" to="/organizer">Cancel</Link></div>
      </form>
    </section>
  );
}
