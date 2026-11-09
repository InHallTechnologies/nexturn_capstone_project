import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Events from './pages/Events';
import EventDetail from './pages/EventDetail';
import MyTickets from './pages/MyTickets';
import OrganizerEvents from './pages/OrganizerEvents';
import EventForm from './pages/EventForm';
import EventDashboard from './pages/EventDashboard';
import CheckIn from './pages/CheckIn';
import ApprovalQueue from './pages/ApprovalQueue';
import Venues from './pages/Venues';
import Users from './pages/Users';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route element={<ProtectedRoute roles={['student']} />}>
          <Route path="/events" element={<Events />} />
          <Route path="/events/:eventId" element={<EventDetail />} />
          <Route path="/tickets" element={<MyTickets />} />
        </Route>
        <Route path="/organizer" element={<ProtectedRoute roles={['organizer']} />}>
          <Route index element={<OrganizerEvents />} />
          <Route path="events/new" element={<EventForm />} />
          <Route path="events/:eventId/edit" element={<EventForm />} />
          <Route path="events/:eventId" element={<EventDashboard />} />
          <Route path="check-in" element={<CheckIn />} />
        </Route>
        <Route path="/admin" element={<ProtectedRoute roles={['admin']} />}>
          <Route index element={<ApprovalQueue />} />
          <Route path="venues" element={<Venues />} />
          <Route path="users" element={<Users />} />
        </Route>
        <Route path="/unauthorized" element={<div className="panel"><h1>Access not allowed</h1><p>Your account does not have access to that page.</p></div>} />
        <Route path="/home" element={<Navigate to="/" replace />} />
        <Route path="*" element={<div className="panel"><h1>Page not found</h1><p>Try going back to the home page.</p></div>} />
      </Route>
    </Routes>
  );
}
