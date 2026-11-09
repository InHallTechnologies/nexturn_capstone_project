import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { get, post, remove } from '../api';
import Notice from '../components/Notice';
import { eventIsComplete } from '../eventTime';

export default function EventDashboard() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  function loadDashboard() {
    return Promise.all([get(`/organizer/events/${eventId}`), get(`/organizer/events/${eventId}/dashboard`)]).then(([eventResult, statsResult]) => {
      setEvent(eventResult.data.event);
      setStats(statsResult.data);
    });
  }

  useEffect(() => { loadDashboard().catch((err) => setError(err.message)); }, [eventId]);

  async function submitEvent() {
    setBusy(true); setError(''); setMessage('');
    try { await post(`/organizer/events/${eventId}/submit`); setMessage('Your event was sent for approval.'); await loadDashboard(); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  async function deleteEvent() {
    if (!window.confirm(`Delete ${event.title}?`)) return;
    setBusy(true); setError('');
    try { await remove(`/organizer/events/${eventId}`); navigate('/organizer'); }
    catch (err) { setError(err.message); setBusy(false); }
  }

  if (!event || !stats) return <div className="panel"><Notice type="error">{error || 'Loading dashboard…'}</Notice><Link to="/organizer">Back to events</Link></div>;
  const completed = eventIsComplete(event);
  const editable = ['draft', 'rejected'].includes(event.status) && !completed;

  return (
    <>
      <Link className="back-link" to="/organizer">← Your events</Link>
      <div className="page-heading"><div><span className={`status status-${event.status}`}>{event.status}</span><p className="eyebrow">{event.category} · {new Date(event.start_time).toLocaleDateString()}</p><h1>{event.title}</h1></div>
        <div className="button-row"><button className="button button-light" onClick={() => loadDashboard().catch((err) => setError(err.message))}>Refresh counts</button>{editable && <><button className="button button-danger" onClick={deleteEvent} disabled={busy}>Delete</button><Link className="button button-light" to={`/organizer/events/${eventId}/edit`}>Edit</Link><button className="button button-primary" onClick={submitEvent} disabled={busy}>Submit for approval</button></>}</div>
      </div>
      <Notice>{message}</Notice><Notice type="error">{error}</Notice>
      {completed && <Notice>This event has ended. Event actions and check-in are closed.</Notice>}
      {event.review_note && ['approved', 'rejected'].includes(event.status) && <Notice type={event.status === 'rejected' ? 'error' : 'info'}>Admin note: {event.review_note}</Notice>}
      {event.status === 'pending' && <Notice>Your event is waiting for an admin to review it.</Notice>}
      <section className="stat-grid">
        <article className="stat-card"><span>Capacity</span><strong>{stats.capacity}</strong></article>
        <article className="stat-card"><span>Seats sold</span><strong>{stats.seats_sold}</strong></article>
        <article className="stat-card"><span>Checked in</span><strong>{stats.checked_in}</strong></article>
        <article className="stat-card"><span>Check-in rate</span><strong>{Math.round(stats.check_in_rate * 100)}%</strong></article>
        <article className="stat-card"><span>Cancellations</span><strong>{stats.cancellations}</strong></article>
        <article className="stat-card"><span>Waitlist</span><strong>{stats.waitlist_length}</strong></article>
      </section>
      {event.status === 'approved' && !completed && <div className="panel"><h2>At the door</h2><p>Open check-in to scan a ticket code.</p><Link className="button button-primary" to="/organizer/check-in">Go to check-in</Link></div>}
    </>
  );
}
