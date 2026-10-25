import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import authApi from '../api/auth';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchCurrentUser = useCallback(async () => {
    const token = localStorage.getItem('stockpilot_access_token');
    if (!token) {
      setUser(null);
      setLoading(false);
      return null;
    }

    try {
      const userData = await authApi.getMe();
      setUser(userData);
      return userData;
    } catch {
      // If getMe fails, token may be expired or invalid.
      // Let the axios interceptor attempt refresh if possible.
      const refreshToken = localStorage.getItem('stockpilot_refresh_token');
      if (refreshToken) {
        try {
          const refreshRes = await authApi.refresh(refreshToken);
          const newAccess = refreshRes.access_token || refreshRes.token;
          localStorage.setItem('stockpilot_access_token', newAccess);
          if (refreshRes.refresh_token) {
            localStorage.setItem('stockpilot_refresh_token', refreshRes.refresh_token);
          }
          const userData = await authApi.getMe();
          setUser(userData);
          return userData;
        } catch {
          localStorage.removeItem('stockpilot_access_token');
          localStorage.removeItem('stockpilot_refresh_token');
          setUser(null);
        }
      } else {
        localStorage.removeItem('stockpilot_access_token');
        setUser(null);
      }
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrentUser();

    // Listen for custom logout events dispatched by the axios interceptor
    const handleAuthExpired = () => {
      setUser(null);
    };

    window.addEventListener('auth:expired', handleAuthExpired);
    return () => window.removeEventListener('auth:expired', handleAuthExpired);
  }, [fetchCurrentUser]);

  const login = async (email, password) => {
    const data = await authApi.login(email, password);
    const accessToken = data.access_token || data.token;
    localStorage.setItem('stockpilot_access_token', accessToken);
    if (data.refresh_token) {
      localStorage.setItem('stockpilot_refresh_token', data.refresh_token);
    }

    // Fetch user profile
    const profile = await authApi.getMe();
    setUser(profile);
    return profile;
  };

  const register = async (name, email, password) => {
    return await authApi.register(name, email, password);
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem('stockpilot_refresh_token');
    try {
      await authApi.logout(refreshToken);
    } finally {
      localStorage.removeItem('stockpilot_access_token');
      localStorage.removeItem('stockpilot_refresh_token');
      setUser(null);
    }
  };

  // Centralized Role and Permission Utilities
  const role = user?.role;
  const isOwner = role === 'Owner';
  const isManager = role === 'Manager';
  const isStaff = role === 'Staff';

  const hasRole = (...allowedRoles) => {
    return Boolean(role && allowedRoles.includes(role));
  };

  // Capabilities
  const canManageProducts = isOwner || isManager;
  const canManageSuppliers = isOwner || isManager;
  const canManageCategories = isOwner || isManager;
  const canCreatePurchaseOrder = isOwner || isManager;
  const canApprovePurchaseOrder = isOwner; // Only Owner
  const canReceiveGoods = isOwner || isManager;
  const canAdjustStock = isOwner || isManager;
  const canViewStockMovements = isOwner || isManager;
  const canViewReports = isOwner || isManager; // Low-stock report is Owner/Manager
  const canViewFinancialReports = isOwner; // Valuation, Ledger Balance, Sales-by-day
  const canRecordSales = isOwner || isManager || isStaff;

  const value = {
    user,
    loading,
    isAuthenticated: Boolean(user),
    login,
    register,
    logout,
    refreshUser: fetchCurrentUser,
    role,
    isOwner,
    isManager,
    isStaff,
    hasRole,
    canManageProducts,
    canManageSuppliers,
    canManageCategories,
    canCreatePurchaseOrder,
    canApprovePurchaseOrder,
    canReceiveGoods,
    canAdjustStock,
    canViewStockMovements,
    canViewReports,
    canViewFinancialReports,
    canRecordSales,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
