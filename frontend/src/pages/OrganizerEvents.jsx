import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { get } from '../api';
import Notice from '../components/Notice';
import { eventIsComplete } from '../eventTime';

export default function OrganizerEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    get('/organizer/events').then(({ data }) => setEvents(data.events)).catch((err) => setError(err.message)).finally(() => setLoading(false));
  }, []);

  return (
    <>
      <div className="page-heading"><div><p className="eyebrow">Organizer workspace</p><h1>Your events</h1><p>Draft an event, submit it for approval, and follow attendance.</p></div><Link className="button button-primary" to="/organizer/events/new">Create event</Link></div>
      <Notice type="error">{error}</Notice>
      {loading ? <p className="page-message">Loading your events…</p> : !events.length && !error ? <div className="empty-panel"><h2>No events yet</h2><p>Your new event will appear here.</p></div> : <div className="table-list">{events.map((event) => (
        <article className="list-row" key={event.id}>
          <div className="list-main"><span className={`status status-${event.status}`}>{event.status}</span><h2>{event.title}</h2><p>{new Date(event.start_time).toLocaleString()} · {event.seats_sold} / {event.capacity} seats</p></div>
          <div className="button-row"><Link className="button button-light" to={`/organizer/events/${event.id}`}>Dashboard</Link>{['draft', 'rejected'].includes(event.status) && !eventIsComplete(event) && <Link className="button button-light" to={`/organizer/events/${event.id}/edit`}>Edit</Link>}</div>
        </article>
      ))}</div>}
    </>
  );
}
