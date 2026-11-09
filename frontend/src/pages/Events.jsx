import { useEffect, useState } from 'react';
import EventCard from '../components/EventCard';
import Notice from '../components/Notice';
import { get } from '../api';

export default function Events() {
  const [events, setEvents] = useState([]);
  const [filters, setFilters] = useState({ search: '', category: '', from: '', to: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const categories = [...new Set(events.map((event) => event.category).filter(Boolean))];

  useEffect(() => {
    setLoading(true);
    setError('');
    const params = Object.fromEntries(Object.entries(filters).filter(([, value]) => value));
    if (params.to) params.to += 'T23:59:59';
    get('/student/events', params)
      .then(({ data }) => setEvents(data.events))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [filters]);

  function update(key, value) {
    setFilters({ ...filters, [key]: value });
  }

  return (
    <>
      <div className="page-heading"><div><p className="eyebrow">The campus calendar</p><h1>Find an event</h1><p>Something good is happening. Find your next plan.</p></div></div>
      <section className="filter-bar">
        <label className="search-field">Search<input value={filters.search} onChange={(e) => update('search', e.target.value)} placeholder="Try music, art, or a club…" /></label>
        <label>Category<select value={filters.category} onChange={(e) => update('category', e.target.value)}><option value="">All categories</option>{categories.map((category) => <option key={category}>{category}</option>)}</select></label>
        <label>From<input type="date" value={filters.from} onChange={(e) => update('from', e.target.value)} /></label>
        <label>To<input type="date" value={filters.to} onChange={(e) => update('to', e.target.value)} /></label>
      </section>
      <Notice type="error">{error}</Notice>
      {loading ? <p className="page-message">Loading events…</p> : events.length ? <div className="event-grid">{events.map((event) => <EventCard key={event.id} event={event} />)}</div> : <div className="empty-panel"><h2>No events found</h2><p>Try changing your search or date filters.</p></div>}
    </>
  );
}
