import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Search, Bell, MessageSquare, Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../common/Badge';

export const Topbar = ({ onOpenMobile }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchValue, setSearchValue] = useState('');

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchValue.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchValue.trim())}`);
    }
  };

  const getRoleVariant = (role) => {
    switch (role) {
      case 'Owner':
        return 'danger';
      case 'Manager':
        return 'warning';
      case 'Staff':
        return 'info';
      default:
        return 'neutral';
    }
  };

  const firstName = user?.name ? user.name.split(' ')[0] : 'Operator';

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          onClick={onOpenMobile}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-main)',
            cursor: 'pointer',
            padding: '0.4rem',
            display: 'flex',
            alignItems: 'center',
          }}
          className="mobile-toggle-btn"
          aria-label="Open navigation menu"
        >
          <Menu size={22} />
        </button>

        {/* Hello {Name} Greeting matching Inventra Reference Image */}
        <div className="topbar-greeting">
          <span className="greeting-label">Hello</span>
          <span className="greeting-name">{firstName} 👋</span>
        </div>
      </div>

      <div className="topbar-right">
        {/* Pill Search Input */}
        <form onSubmit={handleSearchSubmit} className="topbar-search-pill">
          <Search size={15} className="topbar-search-icon" />
          <input
            type="text"
            className="topbar-search-input"
            placeholder="Search..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
          />
        </form>

        {/* Circular Notification Bell Button */}
        <button
          type="button"
          className="topbar-circle-btn"
          title="Stock Alerts & Notifications"
          onClick={() => navigate('/stock-movements')}
        >
          <Bell size={17} />
        </button>

        {/* Circular Messages / Feed Button */}
        <button
          type="button"
          className="topbar-circle-btn"
          title="Purchase Orders Activity"
          onClick={() => navigate('/purchase-orders')}
        >
          <MessageSquare size={17} />
        </button>

        {/* Role Badge */}
        <Badge variant={getRoleVariant(user?.role)} dot icon={Shield}>
          {user?.role || 'Staff'}
        </Badge>

        {/* User Circular Avatar */}
        <div
          className="topbar-avatar"
          title={`${user?.name || 'User'} (${user?.email || ''})`}
        >
          {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
        </div>
      </div>
    </header>
  );
};

export default Topbar;
