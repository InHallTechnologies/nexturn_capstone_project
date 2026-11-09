import { Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="home-stage">
      <section className="welcome-panel" id="home-top">
        <p className="eyebrow">Campus life, in one place</p>
        <h1>Make room for <em>something memorable.</em></h1>
        <p>Find concerts, workshops, and student events. Book your seat and keep your ticket close.</p>
        <div className="button-row">
          {user ? <Link className="button button-primary" to={user.role === 'student' ? '/events' : user.role === 'organizer' ? '/organizer' : '/admin'}>Open your dashboard</Link> : <><Link className="button button-primary" to="/register">Create a student account</Link><Link className="button button-light" to="/login">Sign in</Link></>}
        </div>
      </section>
      <section className="intro-grid home-features home-section" id="about">
        <div className="home-section-heading"><p className="eyebrow">A better campus calendar</p><h2>Good things happen here.</h2><p>Evently brings the events, tickets, and check-ins for your campus into one simple place.</p></div>
        <article><span>01</span><h2>Find your people</h2><p>Search approved campus events by category and date.</p></article>
        <article><span>02</span><h2>Save your seat</h2><p>Book from a limited number of seats or join the waitlist.</p></article>
        <article><span>03</span><h2>Show your ticket</h2><p>Keep your ticket code ready when you arrive.</p></article>
      </section>
      <section className="home-section steps-section" id="how-it-works">
        <div className="home-section-heading"><p className="eyebrow">From browsing to the door</p><h2>Your next campus plan, in three steps.</h2></div>
        <div className="step-list">
          <article><span>01 / Explore</span><h3>See what is happening</h3><p>Browse approved events and filter by category, date, or the things you are interested in.</p></article>
          <article><span>02 / Reserve</span><h3>Book your place</h3><p>Choose a seat while tickets are available, or join the waitlist when an event is full.</p></article>
          <article><span>03 / Arrive</span><h3>Bring your ticket</h3><p>Open your ticket QR code at the venue so an organizer can check you in.</p></article>
        </div>
      </section>
      <section className="home-section organizer-section" id="for-organizers">
        <div className="organizer-copy"><p className="eyebrow">For organizers and campus teams</p><h2>Make the event. We’ll help with the details.</h2><p>Create an event, choose a venue and capacity, then send it for approval. After it is approved, track bookings and check in guests with their ticket codes or QR codes.</p><Link className="button button-light" to={user ? '/organizer' : '/login'}>{user?.role === 'organizer' ? 'Open organizer workspace' : 'Sign in to organize'}</Link></div>
        <div className="organizer-points"><p><strong>One clear dashboard</strong><span>See ticket sales, check-ins, cancellations, and the waitlist together.</span></p><p><strong>Easy door check-in</strong><span>Scan a ticket QR code or enter its code manually.</span></p><p><strong>Reviewed events</strong><span>Campus administrators can review events and manage venues and accounts.</span></p></div>
      </section>
      <section className="home-endline"><p className="eyebrow">Make room for something memorable</p><h2>Your campus has more going on.</h2><Link className="button button-primary" to={user?.role === 'student' ? '/events' : '/register'}>{user?.role === 'student' ? 'Browse campus events' : 'Join Evently'}</Link></section>
    </div>
  );
}
