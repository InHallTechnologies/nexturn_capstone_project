import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';

const roleLinks = {
  student: [['/events', 'Events'], ['/tickets', 'My tickets']],
  organizer: [['/organizer', 'My events'], ['/organizer/check-in', 'Check-in']],
  admin: [['/admin', 'Approvals'], ['/admin/venues', 'Venues'], ['/admin/users', 'Users']],
};

const homeLinks = [
  ['#home-top', 'Home'],
  ['#about', 'About'],
  ['#how-it-works', 'How it works'],
  ['#for-organizers', 'For organizers'],
];

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === '/';
  const [activeSection, setActiveSection] = useState('home-top');

  useEffect(() => {
    if (!isHome) return;

    function updateActiveSection() {
      let currentSection = 'home-top';
      homeLinks.forEach(([sectionLink]) => {
        const section = document.querySelector(sectionLink);
        if (section && section.getBoundingClientRect().top <= 150) {
          currentSection = section.id;
        }
      });
      setActiveSection(currentSection);
    }

    updateActiveSection();
    window.addEventListener('scroll', updateActiveSection);
    return () => window.removeEventListener('scroll', updateActiveSection);
  }, [isHome]);

  async function signOut() {
    await logout();
    navigate('/');
  }

  return (
    <div className={`site-shell${isHome ? ' home-layout' : ''}`}>
      <header className="topbar">
        <div className="topbar-inner">
          <Link to="/" className="brand"><span className="brand-icon">E</span> Evently</Link>
          <nav aria-label="Main navigation">
            {isHome && homeLinks.map(([to, label]) => <a key={to} href={to} className={activeSection === to.slice(1) ? 'section-active' : ''}>{label}</a>)}
            {!isHome && user && (roleLinks[user.role] || []).map(([to, label]) => (
              <NavLink key={to} to={to} end={to === '/organizer' || to === '/admin'}>{label}</NavLink>
            ))}
          </nav>
          <div className="account-links">
            {user ? (
              <><span className="account-name">{user.name}</span><button className="button button-light" onClick={signOut}>Sign out</button></>
            ) : (
              <><Link to="/login">Sign in</Link><Link className="button button-primary" to="/register">Create account</Link></>
            )}
          </div>
        </div>
      </header>
      <main className={`page-wrap${isHome ? ' home-wrap' : ''}`}><Outlet /></main>
      <footer className="footer"><span>Evently</span><span>Find your next campus event.</span></footer>
    </div>
  );
}
