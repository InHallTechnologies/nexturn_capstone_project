import { useEffect, useState } from 'react';
import { get, patch } from '../api';
import Notice from '../components/Notice';

export default function ApprovalQueue() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState({});
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [view, setView] = useState('pending');

  useEffect(() => {
    setLoading(true);
    setError('');
    get(`/admin/events/${view}`)
      .then(({ data }) => setEvents(data.events))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [view]);

  async function decide(event, status) {
    setError(''); setMessage('');
    try {
      await patch(`/admin/events/${event.id}/approval`, { status, review_note: notes[event.id] || '' });
      setEvents(events.filter((item) => item.id !== event.id));
      setMessage(`Event ${status}.`);
    } catch (err) { setError(err.message); }
  }

  return (
    <>
      <div className="page-heading"><div><p className="eyebrow">Admin workspace</p><h1>Event approvals</h1><p>Review submissions and revisit events you have approved.</p></div></div>
      <div className="button-row" role="tablist" aria-label="Event status">
        <button className={`button ${view === 'pending' ? 'button-primary' : 'button-light'}`} onClick={() => setView('pending')}>Pending</button>
        <button className={`button ${view === 'approved' ? 'button-primary' : 'button-light'}`} onClick={() => setView('approved')}>Approved</button>
      </div>
      <Notice>{message}</Notice><Notice type="error">{error}</Notice>
      {loading ? <p className="page-message">Loading events...</p> : !events.length && !error ? <div className="empty-panel"><h2>{view === 'approved' ? 'No approved events yet' : 'All caught up'}</h2><p>{view === 'approved' ? 'Events you approve will appear here.' : 'New event submissions will appear here.'}</p></div> : <div className="approval-list">{events.map((event) => (
        <article className="panel" key={event.id}>
          <p className="eyebrow">{event.category} · {new Date(event.start_time).toLocaleString()}</p><h2>{event.title}</h2><p>{event.description}</p><p className="muted">Capacity {event.capacity} · Venue {event.venue_id}</p>
          {event.tags?.length > 0 && <p className="tag-list">{event.tags.map((tag) => <span key={tag}>#{tag}</span>)}</p>}
          {view === 'approved' ? <><p><strong>Status: Approved</strong></p>{event.review_note && <p className="muted">Review note: {event.review_note}</p>}</> : <>
            <label>Note for organizer<textarea rows="2" value={notes[event.id] || ''} onChange={(e) => setNotes({ ...notes, [event.id]: e.target.value })} /></label>
            <div className="button-row"><button className="button button-light" onClick={() => decide(event, 'rejected')}>Reject</button><button className="button button-primary" onClick={() => decide(event, 'approved')}>Approve event</button></div>
          </>}
        </article>
      ))}</div>}
    </>
  );
}
