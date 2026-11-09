import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { get, remove } from '../api';
import Notice from '../components/Notice';
import TicketQR from '../components/TicketQR';
import { eventIsComplete } from '../eventTime';

export default function MyTickets() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  function loadTickets() {
    return get('/student/tickets').then(({ data }) => setTickets(data.tickets));
  }

  useEffect(() => { loadTickets().catch((err) => setError(err.message)).finally(() => setLoading(false)); }, []);

  async function cancel(id) {
    if (!window.confirm('Cancel this ticket?')) return;
    setError(''); setMessage('');
    try {
      await remove(`/student/tickets/${id}`);
      setMessage('Ticket cancelled. A person on the waitlist may have been promoted.');
      await loadTickets();
    } catch (err) { setError(err.message); }
  }

  return (
    <>
      <div className="page-heading"><div><p className="eyebrow">Your plans</p><h1>My tickets</h1><p>Keep your ticket code handy when you arrive.</p></div></div>
      <Notice>{message}</Notice><Notice type="error">{error}</Notice>
      {loading ? <p className="page-message">Loading your tickets…</p> : !tickets.length && !error ? <div className="empty-panel"><h2>No tickets yet</h2><p>Find something to do this week.</p><Link className="button button-primary" to="/events">Browse events</Link></div> : (
        <div className="ticket-list">{tickets.map((ticket) => (
          <article className="ticket-row" key={ticket.id}>
            <div><p className="eyebrow">{ticket.status}</p><h2>{ticket.event?.title || 'Campus event'}</h2><p>{ticket.event?.start_time ? new Date(ticket.event.start_time).toLocaleString() : ''}</p></div>
            <div className="ticket-code"><code>{ticket.code}</code>{ticket.status === 'booked' && <TicketQR code={ticket.code} />}</div>
            {ticket.status === 'booked' && !eventIsComplete(ticket.event) && <button className="button button-danger" onClick={() => cancel(ticket.id)}>Cancel seat</button>}
          </article>
        ))}</div>
      )}
    </>
  );
}
