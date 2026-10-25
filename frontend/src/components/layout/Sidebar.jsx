import React, { useState } from 'react';
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
  Sparkles,
  Zap,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';

export const Sidebar = ({
  collapsed = false,
  onToggleCollapse,
  mobileOpen = false,
  onCloseMobile,
}) => {
  const { user, logout, isOwner, isManager } = useAuth();
  const navigate = useNavigate();
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Nav item groups based on roles
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
      {mobileOpen && <div className="mobile-nav-backdrop" onClick={onCloseMobile} />}
      <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
        {/* Brand Header with Target Logo */}
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <div className="sidebar-brand-icon" aria-hidden="true" />
            {!collapsed && (
              <div>
                <div style={{ lineHeight: 1.1 }}>StockPilot</div>
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

        {/* Navigation Items */}
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
                    onClick={onCloseMobile}
                    className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                    title={collapsed ? item.label : undefined}
                  >
                    <item.icon className="nav-item-icon" />
                    {!collapsed && <span>{item.label}</span>}
                  </NavLink>
                ))}
              </div>
            );
          })}
        </nav>

        {/* Bottom AI Assistant Promo Card (Matching Reference Image) */}
        {!collapsed && (
          <div className="sidebar-ai-card">
            <div className="ai-card-badge">
              <Sparkles size={16} />
            </div>
            <div>
              <div className="ai-card-title">Empowering Decision with AI</div>
              <div className="ai-card-sub">Automated Reorders &amp; Demand Insights</div>
            </div>
            <button
              type="button"
              className="ai-card-btn"
              onClick={() => setIsAiModalOpen(true)}
            >
              <Zap size={13} />
              <span>Unlock AI Magic</span>
            </button>
          </div>
        )}

        {/* Sidebar Footer with Operator Info & Logout */}
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

      {/* AI Intelligence Modal */}
      <Modal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        title="StockPilot Retail Intelligence"
        subtitle="Automated inventory optimization and replenishment recommendations"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div
            style={{
              padding: '1rem',
              backgroundColor: 'var(--status-green-bg)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(40, 84, 30, 0.15)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: 'var(--status-green-text)', fontSize: '0.875rem' }}>
              <Sparkles size={16} />
              <span>Automated Reorder Recommendations</span>
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-main)', marginTop: '0.35rem' }}>
              StockPilot analyzed 14-day velocity and detected 2 SKUs approaching safety stock thresholds. Generating suggested PO drafts for supplier approval.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.75rem',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: '#FFFFFF',
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>Thermal Roll 80mm Media (SKU-2315)</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Current Stock: 28 units · Reorder threshold: 30</div>
              </div>
              <Badge variant="warning">Auto-PO +200</Badge>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.75rem',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: '#FFFFFF',
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>Apex Wireless POS Terminal (SKU-8942)</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Velocity: +18% WoW · Projected stockout: 34 days</div>
              </div>
              <Badge variant="success">Optimal Buffer</Badge>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
            <Button variant="secondary" onClick={() => setIsAiModalOpen(false)}>
              Close
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setIsAiModalOpen(false);
                navigate('/purchase-orders');
              }}
            >
              Review Purchase Orders
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default Sidebar;
