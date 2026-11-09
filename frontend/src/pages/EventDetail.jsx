import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { get, post, remove } from '../api';
import Notice from '../components/Notice';
import TicketQR from '../components/TicketQR';
import { eventIsComplete } from '../eventTime';

export default function EventDetail() {
  const { eventId } = useParams();
  const [event, setEvent] = useState(null);
  const [ticket, setTicket] = useState(null);
  const [waitlisted, setWaitlisted] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function loadEvent() {
    const [eventResult, ticketsResult] = await Promise.all([get(`/student/events/${eventId}`), get('/student/tickets')]);
    setEvent(eventResult.data.event);
    setWaitlisted(Boolean(eventResult.data.event.waitlist_position));
    setTicket(ticketsResult.data.tickets.find((item) => item.event_id === eventId && ['booked', 'used'].includes(item.status)) || null);
  }

  useEffect(() => {
    loadEvent().catch((err) => setError(err.message));
  }, [eventId]);

  async function book() {
    setBusy(true); setMessage(''); setError('');
    try {
      const result = await post(`/student/events/${eventId}/book`);
      if (result.status === 202) {
        setWaitlisted(true);
        const confirmation = `The event is full. You are on the waitlist at position ${result.data.position}.`;
        setMessage(confirmation);
        window.alert(confirmation);
      } else {
        setMessage('Your ticket is ready.');
        window.alert('Your ticket is ready.');
      }
      await loadEvent();
    } catch (err) {
      setError(err.message);
    } finally { setBusy(false); }
  }

  async function cancel() {
    if (!ticket || !window.confirm('Cancel your ticket?')) return;
    setBusy(true); setError('');
    try {
      await remove(`/student/tickets/${ticket.id}`);
      setMessage('Ticket cancelled. If a seat was available, the first person on the waitlist was promoted.');
      await loadEvent();
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  async function leaveWaitlist() {
    setBusy(true); setError('');
    try {
      await remove(`/student/events/${eventId}/waitlist`);
      setWaitlisted(false); setMessage('You have left the waitlist.');
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  if (!event) return <div className="panel"><Notice type="error">{error || 'Loading event…'}</Notice><Link to="/events">Back to events</Link></div>;
  const start = new Date(event.start_time);
  const completed = eventIsComplete(event);

  return (
    <>
      <Link to="/events" className="back-link">← All events</Link>
      {event.banner_url && <img className="detail-image" src={event.banner_url} alt="" />}
      <div className="detail-layout">
        <article className="detail-copy">
          <p className="eyebrow">{event.category || 'Campus event'}</p><h1>{event.title}</h1>
          <div className="detail-facts"><span>{start.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</span><span>{start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span><span>{event.capacity} seats</span></div>
          {event.venue && <p className="venue-detail"><strong>{event.venue.name}</strong>{event.venue.location ? ` · ${event.venue.location}` : ''}</p>}
          <h2>About this event</h2><p className="description">{event.description || 'The organizer has not added a description yet.'}</p>
          {event.tags?.length > 0 && <div className="tag-list">{event.tags.map((tag) => <span key={tag}>#{tag}</span>)}</div>}
        </article>
        <aside className="booking-box">
          <p className="eyebrow">Your place</p>
          {completed && <Notice>This event has ended. Booking, cancellations, and waitlist changes are closed.</Notice>}
          <strong className="seats-number">{event.seats_remaining}</strong>
          <p>{event.seats_remaining === 1 ? 'seat remaining' : 'seats remaining'} · {event.waitlist_length} waiting</p>
          <button className="button button-light" onClick={() => loadEvent().catch((err) => setError(err.message))}>Refresh availability</button>
          <Notice>{message}</Notice><Notice type="error">{error}</Notice>
          {ticket ? <><div className="ticket-code">Ticket code: <code>{ticket.code}</code>{ticket.status === 'booked' && <TicketQR code={ticket.code} />}</div>{ticket.status === 'booked' && !completed && <button className="button button-danger" onClick={cancel} disabled={busy}>Cancel ticket</button>}</> : waitlisted ? !completed && <button className="button button-light" onClick={leaveWaitlist} disabled={busy}>Leave waitlist</button> : !completed && <button className="button button-primary" onClick={book} disabled={busy}>{busy ? 'Please wait…' : event.seats_remaining ? 'Book a seat' : 'Join the waitlist'}</button>}
        </aside>
      </div>
    </>
  );
}
