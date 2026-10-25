import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './components/layout/ProtectedRoute';

// Auth Pages
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';

// Feature Pages
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { ProductsPage } from './pages/products/ProductsPage';
import { CategoriesPage } from './pages/categories/CategoriesPage';
import { SuppliersPage } from './pages/suppliers/SuppliersPage';
import { PurchaseOrdersPage } from './pages/purchase-orders/PurchaseOrdersPage';
import { CreatePurchaseOrderPage } from './pages/purchase-orders/CreatePurchaseOrderPage';
import { PurchaseOrderDetailPage } from './pages/purchase-orders/PurchaseOrderDetailPage';
import { ReceiveGoodsPage } from './pages/receive-goods/ReceiveGoodsPage';
import { POSPage } from './pages/sales/POSPage';
import { StockMovementsPage } from './pages/stock-movements/StockMovementsPage';
import { ReportsPage } from './pages/reports/ReportsPage';
import { NotFoundPage } from './pages/errors/NotFoundPage';

import './index.css';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            {/* Public Auth Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Authenticated Application Shell */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/products" element={<ProductsPage />} />
                <Route path="/pos" element={<POSPage />} />

                {/* Owner & Manager Protected Routes */}
                <Route element={<ProtectedRoute allowedRoles={['Owner', 'Manager']} />}>
                  <Route path="/categories" element={<CategoriesPage />} />
                  <Route path="/suppliers" element={<SuppliersPage />} />
                  <Route path="/purchase-orders" element={<PurchaseOrdersPage />} />
                  <Route path="/purchase-orders/new" element={<CreatePurchaseOrderPage />} />
                  <Route path="/purchase-orders/:id" element={<PurchaseOrderDetailPage />} />
                  <Route path="/receive-goods" element={<ReceiveGoodsPage />} />
                  <Route path="/stock-movements" element={<StockMovementsPage />} />
                  <Route path="/reports" element={<ReportsPage />} />
                </Route>

                {/* 404 Inside Shell */}
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Route>

            {/* Fallback 404 */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;
