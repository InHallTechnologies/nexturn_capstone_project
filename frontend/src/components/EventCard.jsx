import { Link } from 'react-router-dom';

export default function EventCard({ event }) {
  const date = new Date(event.start_time);
  return (
    <Link className="event-card" to={`/events/${event.id}`}>
      {event.banner_url ? <img className="event-image" src={event.banner_url} alt="" /> : <div className="event-image image-placeholder">Campus event</div>}
      <div className="event-card-content">
        <div className="event-card-meta"><span>{event.category || 'Campus event'}</span><span>{event.seats_remaining ?? Math.max(event.capacity - event.seats_sold, 0)} seats left</span></div>
        <h2>{event.title}</h2>
        <p>{date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} · {date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</p>
        {event.venue && <p>{event.venue.name}</p>}
      </div>
    </Link>
  );
}
