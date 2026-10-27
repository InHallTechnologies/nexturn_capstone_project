import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Layers,
  Truck,
  ClipboardList,
  PackageCheck,
  ShoppingBag,
  ArrowLeftRight,
  BarChart3,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Badge } from '../common/Badge';
import { prefetchRouteData } from '../../api/prefetch';

export const Sidebar = ({
  collapsed = false,
  onToggleCollapse,
}) => {
  const { user, logout, isOwner, isManager } = useAuth();
  const { showError } = useToast();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      showError(
        error.response?.data?.error ||
          'The session could not be revoked on the server. Local credentials were cleared.'
      );
    }
    navigate('/login');
  };

  const navItems = [
    {
      section: 'Main',
      items: [
        { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, show: true },
        { label: 'Sales & POS', path: '/pos', icon: ShoppingBag, show: true },
        { label: 'Products', path: '/products', icon: Package, show: true },
      ],
    },
    {
      section: 'Inventory & Catalog',
      items: [
        { label: 'Categories', path: '/categories', icon: Layers, show: isOwner || isManager },
        { label: 'Suppliers', path: '/suppliers', icon: Truck, show: isOwner || isManager },
        { label: 'Stock Ledger', path: '/stock-movements', icon: ArrowLeftRight, show: isOwner || isManager },
      ],
    },
    {
      section: 'Purchasing & Receiving',
      items: [
        { label: 'Purchase Orders', path: '/purchase-orders', icon: ClipboardList, show: isOwner || isManager },
        { label: 'Receive Goods', path: '/receive-goods', icon: PackageCheck, show: isOwner || isManager },
      ],
    },
    {
      section: 'Analytics',
      items: [
        { label: 'Reports & Analytics', path: '/reports', icon: BarChart3, show: isOwner || isManager },
      ],
    },
  ];

  const getRoleBadgeVariant = (role) => {
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

  return (
    <>
      <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <div className="sidebar-brand-icon" aria-hidden="true" />
            {!collapsed && (
              <div>
                <div style={{ lineHeight: 1.1 }}>Retail Inventory</div>
              </div>
            )}
          </div>
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="sidebar-toggle-btn"
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
          )}
        </div>

        <nav className="sidebar-nav">
          {navItems.map((group) => {
            const visibleItems = group.items.filter((item) => item.show);
            if (visibleItems.length === 0) return null;

            return (
              <div key={group.section} style={{ marginBottom: '0.35rem' }}>
                {!collapsed && <div className="nav-section-title">{group.section}</div>}
                {visibleItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                    title={item.label}
                    onMouseEnter={() => prefetchRouteData(item.path, user?.role)}
                    onFocus={() => prefetchRouteData(item.path, user?.role)}
                  >
                    <item.icon className="nav-item-icon" />
                    {!collapsed && <span>{item.label}</span>}
                  </NavLink>
                ))}
              </div>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          {!collapsed ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <div className="sidebar-user">
                <div className="sidebar-user-avatar">
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="sidebar-user-info">
                  <span className="sidebar-user-name">{user?.name || 'User'}</span>
                  <div style={{ marginTop: '2px' }}>
                    <Badge variant={getRoleBadgeVariant(user?.role)} dot>
                      {user?.role || 'Staff'}
                    </Badge>
                  </div>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="sidebar-toggle-btn"
                title="Log out"
                style={{ marginLeft: '0.5rem' }}
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
              <button onClick={handleLogout} className="sidebar-toggle-btn" title="Log out">
                <LogOut size={16} />
              </button>
            </div>
          )}
        </div>
      </aside>

    </>
  );
};

export default Sidebar;
