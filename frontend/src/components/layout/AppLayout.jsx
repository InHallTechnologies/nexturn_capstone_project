import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { useAuth } from '../../context/AuthContext';
import { prefetchAccessiblePages } from '../../api/prefetch';

export const AppLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.role) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      prefetchAccessiblePages(user.role);
    }, 500);

    return () => window.clearTimeout(timeoutId);
  }, [user?.role]);

  return (
    <div className="app-shell">
      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
      />
      <div className="main-wrapper">
        <Topbar />
        <main className="page-scroll-container">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
