import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  TrendingDown,
  ShoppingBag,
  Plus,
  ExternalLink,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { productsApi } from '../../api/products';
import { suppliersApi } from '../../api/suppliers';
import { purchaseOrdersApi } from '../../api/purchaseOrders';
import { salesApi } from '../../api/sales';
import { reportsApi } from '../../api/reports';
import { categoriesApi } from '../../api/categories';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { ErrorAlert } from '../../components/common/ErrorAlert';
import {
  StackedBarChart,
  CategoryBubbles,
  FulfillmentGauge,
  ValuationBreakdown,
} from '../../components/dashboard/DashboardWidgets';

export const DashboardPage = () => {
  const { user, isOwner, isManager, canCreatePurchaseOrder } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // KPIs
  const [productCount, setProductCount] = useState(0);
  const [, setSupplierCount] = useState(null);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [, setValuationAtCost] = useState(null);
  const [todaySalesTotal, setTodaySalesTotal] = useState('0.00');
  const [pendingOrdersCount, setPendingOrdersCount] = useState(null);

  // Lists & Categories
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [recentSales, setRecentSales] = useState([]);
  const [categoriesList, setCategoriesList] = useState([]);

  // UI States
  const [activeTableTab, setActiveTableTab] = useState('orders'); // 'orders' | 'lowstock'
  const [selectedRowIds, setSelectedRowIds] = useState(new Set());

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      // 1. Products (Accessible to all roles)
      const productsRes = await productsApi.listProducts({ per_page: 5, low_stock: 'true' });
      setLowStockProducts(productsRes.items || []);

      const allProductsRes = await productsApi.listProducts({ per_page: 1 });
      setProductCount(allProductsRes.pagination?.total || 0);

      // Low stock count
      if (isOwner || isManager) {
        try {
          const lowStockReport = await reportsApi.getLowStockReport({ per_page: 1 });
          setLowStockCount(lowStockReport.pagination?.total || 0);
        } catch {
          setLowStockCount(productsRes.items?.length || 0);
        }
      } else {
        const lowStockStaffRes = await productsApi.listProducts({ per_page: 1, low_stock: 'true' });
        setLowStockCount(lowStockStaffRes.pagination?.total || 0);
      }

      // 2. Categories (Owner / Manager only)
      if (isOwner || isManager) {
        try {
          const catRes = await categoriesApi.listCategories({ per_page: 5 });
          setCategoriesList(catRes.items || []);
        } catch {
          setCategoriesList([]);
        }
      }

      // 3. Suppliers (Owner / Manager only)
      if (isOwner || isManager) {
        try {
          const suppliersRes = await suppliersApi.listSuppliers({ per_page: 1 });
          setSupplierCount(suppliersRes.pagination?.total || 0);
        } catch {
          setSupplierCount(null);
        }
      }

      // 4. Inventory Valuation at Cost (Owner only)
      if (isOwner) {
        try {
          const valuationRes = await reportsApi.getValuationReport({ per_page: 1 });
          setValuationAtCost(valuationRes.total_value_at_cost);
        } catch {
          setValuationAtCost(null);
        }
      }

      // 5. Purchase Orders (Owner / Manager only)
      if (isOwner || isManager) {
        try {
          const pendingRes = await purchaseOrdersApi.listPurchaseOrders({
            status: 'draft',
            per_page: 1,
          });
          const approvedRes = await purchaseOrdersApi.listPurchaseOrders({
            status: 'approved',
            per_page: 1,
          });
          const totalPending =
            (pendingRes.pagination?.total || 0) + (approvedRes.pagination?.total || 0);
          setPendingOrdersCount(totalPending);

          const recentOrdersRes = await purchaseOrdersApi.listPurchaseOrders({
            per_page: 6,
            sort_by: 'created_at',
            sort_order: 'desc',
          });
          setRecentOrders(recentOrdersRes.items || []);
        } catch {
          setPendingOrdersCount(null);
          setRecentOrders([]);
        }
      }

      // 6. Sales (All authenticated roles)
      try {
        const salesRes = await salesApi.listSales({
          per_page: 6,
          sort_by: 'created_at',
          sort_order: 'desc',
        });
        setRecentSales(salesRes.items || []);

        const todayStr = new Date().toISOString().slice(0, 10);
        if (isOwner) {
          try {
            const salesByDayRes = await reportsApi.getSalesByDayReport({
              start_date: todayStr,
              end_date: todayStr,
            });
            const todayItem = salesByDayRes.items?.find((i) => i.date === todayStr);
            setTodaySalesTotal(todayItem ? todayItem.total_sales : '0.00');
          } catch {
            setTodaySalesTotal('0.00');
          }
        } else {
          const todaySum = (salesRes.items || [])
            .filter((s) => s.created_at?.slice(0, 10) === todayStr)
            .reduce((sum, s) => sum + Number(s.total_amount || 0), 0);
          setTodaySalesTotal(todaySum.toFixed(2));
        }
      } catch {
        setRecentSales([]);
      }
    } catch {
      setError('Unable to load full dashboard statistics from the server.');
    } finally {
      setLoading(false);
    }
  }, [isOwner, isManager]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Order status badge matching Inventra status pills
  const renderOrderStatusBadge = (status) => {
    switch (status) {
      case 'received':
        return <Badge variant="success">Complete</Badge>;
      case 'approved':
        return <Badge variant="info">In Progress</Badge>;
      case 'partially_received':
        return <Badge variant="warning">Partial</Badge>;
      case 'cancelled':
        return <Badge variant="danger">Cancel</Badge>;
      case 'draft':
      default:
        return <Badge variant="warning">Pending</Badge>;
    }
  };

  const toggleSelectRow = (id) => {
    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = (items) => {
    if (selectedRowIds.size === items.length && items.length > 0) {
      setSelectedRowIds(new Set());
    } else {
      setSelectedRowIds(new Set(items.map((i) => i.id)));
    }
  };

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Executive Dashboard</h1>
          <p className="page-subtitle">
            Welcome back, <strong>{user?.name}</strong> • Real-time retail operations &amp; stock intelligence
          </p>
        </div>
        <div className="page-actions">
          <Button variant="primary" onClick={() => navigate('/pos')} icon={ShoppingBag}>
            New Sale (POS)
          </Button>
          {canCreatePurchaseOrder && (
            <Button
              variant="secondary"
              onClick={() => navigate('/purchase-orders/new')}
              icon={Plus}
            >
              Create Purchase Order
            </Button>
          )}
        </div>
      </div>

      {error && <ErrorAlert message={error} onRetry={loadDashboardData} />}

      {/* Critical Reorder Alert Banner */}
      {lowStockCount > 0 && (
        <div
          style={{
            backgroundColor: '#F6E7C7',
            border: '1px solid #EEDBB1',
            borderRadius: 'var(--radius-lg)',
            padding: '0.85rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <AlertTriangle size={18} style={{ color: '#7A5210', flexShrink: 0 }} />
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#5A3D0B' }}>
              <strong>Inventory Notice:</strong> {lowStockCount} items have fallen below their minimum reorder point.
            </span>
          </div>
          <button
            onClick={() => {
              setActiveTableTab('lowstock');
              const tableEl = document.getElementById('dashboard-table-section');
              if (tableEl) tableEl.scrollIntoView({ behavior: 'smooth' });
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#5A3D0B',
              fontWeight: 700,
              fontSize: '0.75rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
            }}
          >
            Review Watchlist <ArrowRight size={13} />
          </button>
        </div>
      )}

      {/* 2-Column Dashboard Layout Grid */}
      <div className="dashboard-layout-grid">
        {/* ====================================================================
            MAIN COLUMN (LEFT): 3 KPI CARDS, SALES REPORT CHART, RECENT ORDERS TABLE
            ==================================================================== */}
        <div className="dashboard-main-col">
          {/* Row 1: 3 KPI Cards */}
          <div className="stats-kpi-row">
            {/* KPI 1: Total Sales */}
            <div className="kpi-card">
              <div className="kpi-card-top">
                <span className="kpi-card-lbl">TOTAL SALES</span>
                <span className="kpi-trend-pill positive">
                  <TrendingUp size={11} />
                  <span>+20.8% ↗</span>
                </span>
              </div>
              <div className="kpi-card-val-row">
                <div className="kpi-card-val">
                  {loading
                    ? '...'
                    : `$${Number(todaySalesTotal || 350).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}`}
                </div>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                {isOwner ? 'Store-wide billing ledger' : 'Today’s store revenue'}
              </div>
            </div>

            {/* KPI 2: Total Products */}
            <div className="kpi-card">
              <div className="kpi-card-top">
                <span className="kpi-card-lbl">TOTAL PRODUCTS</span>
                <span className="kpi-trend-pill positive">
                  <TrendingUp size={11} />
                  <span>+3.2% ↗</span>
                </span>
              </div>
              <div className="kpi-card-val-row">
                <div className="kpi-card-val">
                  {loading ? '...' : productCount.toLocaleString()}
                </div>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                Active catalogue SKU items
              </div>
            </div>

            {/* KPI 3: Orders / Low Stock */}
            <div className="kpi-card">
              <div className="kpi-card-top">
                <span className="kpi-card-lbl">
                  {pendingOrdersCount !== null ? 'PENDING ORDERS' : 'LOW-STOCK ALERTS'}
                </span>
                <span
                  className={`kpi-trend-pill ${
                    (pendingOrdersCount ?? lowStockCount) > 0 ? 'negative' : 'positive'
                  }`}
                >
                  {(pendingOrdersCount ?? lowStockCount) > 0 ? (
                    <>
                      <TrendingDown size={11} />
                      <span>-10.8% ↘</span>
                    </>
                  ) : (
                    <>
                      <TrendingUp size={11} />
                      <span>0.0% —</span>
                    </>
                  )}
                </span>
              </div>
              <div className="kpi-card-val-row">
                <div className="kpi-card-val">
                  {loading ? '...' : (pendingOrdersCount ?? lowStockCount).toLocaleString()}
                </div>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                {pendingOrdersCount !== null
                  ? 'Draft & approved POs'
                  : 'Items at or below reorder'}
              </div>
            </div>
          </div>

          {/* Row 2: Sales Report Dual-Stacked Bar Chart */}
          <div className="dashboard-chart-card">
            <div className="chart-card-header">
              <div className="chart-title-group">
                <span className="chart-card-title">Sales Report</span>
                <span className="chart-card-val">$300k</span>
                <span className="chart-card-sub">Dual-stream monthly revenue &amp; units volume</span>
              </div>
              <div className="chart-card-controls">
                <div className="chart-legend-row">
                  <span>
                    <span className="legend-dot sales" /> Sales
                  </span>
                  <span>
                    <span className="legend-dot units" /> Units
                  </span>
                </div>
                <select className="chart-pill-select" defaultValue="2025" aria-label="Select Year">
                  <option value="2025">Year 2025</option>
                  <option value="2024">Year 2024</option>
                </select>
              </div>
            </div>

            <StackedBarChart totalVal="$300k" />
          </div>

          {/* Row 3: Recent Orders Table Card */}
          <div className="dashboard-table-card" id="dashboard-table-section">
            <div className="table-card-header">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <span className="table-card-title">
                    {activeTableTab === 'orders' ? 'Recent Orders' : 'Low-Stock Watchlist'}
                  </span>
                  {/* Table Tab Buttons */}
                  <div
                    style={{
                      display: 'inline-flex',
                      background: '#EAEBE3',
                      borderRadius: 'var(--radius-full)',
                      padding: '2px',
                    }}
                  >
                    <button
                      onClick={() => setActiveTableTab('orders')}
                      style={{
                        border: 'none',
                        background: activeTableTab === 'orders' ? '#FFFFFF' : 'transparent',
                        color: activeTableTab === 'orders' ? '#1B1B1B' : '#70736A',
                        fontWeight: 700,
                        fontSize: '0.7rem',
                        padding: '0.25rem 0.65rem',
                        borderRadius: 'var(--radius-full)',
                        cursor: 'pointer',
                        transition: 'all var(--transition-fast)',
                      }}
                    >
                      Orders
                    </button>
                    <button
                      onClick={() => setActiveTableTab('lowstock')}
                      style={{
                        border: 'none',
                        background: activeTableTab === 'lowstock' ? '#FFFFFF' : 'transparent',
                        color: activeTableTab === 'lowstock' ? '#1B1B1B' : '#70736A',
                        fontWeight: 700,
                        fontSize: '0.7rem',
                        padding: '0.25rem 0.65rem',
                        borderRadius: 'var(--radius-full)',
                        cursor: 'pointer',
                        transition: 'all var(--transition-fast)',
                      }}
                    >
                      Low Stock ({lowStockCount})
                    </button>
                  </div>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                  {activeTableTab === 'orders'
                    ? 'Recent supplier purchase orders & procurement fulfillment'
                    : 'Inventory items currently breaching minimum safe stock quantities'}
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <Link
                  to={
                    activeTableTab === 'orders'
                      ? canCreatePurchaseOrder
                        ? '/purchase-orders'
                        : '/pos'
                      : '/products?low_stock=true'
                  }
                  className="widget-manage-link"
                >
                  <span>View All</span>
                  <ExternalLink size={12} />
                </Link>
              </div>
            </div>

            {/* TAB 1: RECENT ORDERS */}
            {activeTableTab === 'orders' && (
              <div className="table-container" style={{ margin: 0 }}>
                {canCreatePurchaseOrder ? (
                  recentOrders.length === 0 ? (
                    <div
                      style={{
                        padding: '2.5rem',
                        textAlign: 'center',
                        color: 'var(--text-muted)',
                        fontSize: '0.85rem',
                      }}
                    >
                      No purchase orders recorded yet.
                    </div>
                  ) : (
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th style={{ width: '40px', textAlign: 'center' }}>
                            <input
                              type="checkbox"
                              checked={
                                selectedRowIds.size === recentOrders.length &&
                                recentOrders.length > 0
                              }
                              onChange={() => toggleSelectAll(recentOrders)}
                              aria-label="Select all rows"
                              style={{ cursor: 'pointer', accentColor: '#8CB843' }}
                            />
                          </th>
                          <th>Order #</th>
                          <th>Supplier / Vendor</th>
                          <th>Expected Date</th>
                          <th>Items</th>
                          <th>Status</th>
                          <th style={{ textAlign: 'right' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentOrders.map((order) => {
                          const isSelected = selectedRowIds.has(order.id);
                          return (
                            <tr
                              key={order.id}
                              style={{
                                backgroundColor: isSelected ? 'rgba(140, 184, 67, 0.08)' : undefined,
                              }}
                            >
                              <td style={{ textAlign: 'center' }}>
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleSelectRow(order.id)}
                                  aria-label={`Select order ${order.id}`}
                                  style={{ cursor: 'pointer', accentColor: '#8CB843' }}
                                />
                              </td>
                              <td style={{ fontWeight: 700 }}>
                                <Link
                                  to={`/purchase-orders/${order.id}`}
                                  style={{ color: 'var(--text-main)' }}
                                >
                                  PO-{order.id.toString().padStart(4, '0')}
                                </Link>
                              </td>
                              <td style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>
                                {order.supplier?.name || `Supplier #${order.supplier_id}`}
                              </td>
                              <td style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                                {order.expected_date ? order.expected_date.slice(0, 10) : '—'}
                              </td>
                              <td style={{ fontWeight: 600 }}>{order.items?.length || 0}</td>
                              <td>{renderOrderStatusBadge(order.status)}</td>
                              <td style={{ textAlign: 'right' }}>
                                <Link
                                  to={`/purchase-orders/${order.id}`}
                                  className="btn btn-ghost btn-sm"
                                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                                >
                                  Details ↗
                                </Link>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )
                ) : (
                  /* Staff view: Recent Sales Transactions */
                  recentSales.length === 0 ? (
                    <div
                      style={{
                        padding: '2.5rem',
                        textAlign: 'center',
                        color: 'var(--text-muted)',
                        fontSize: '0.85rem',
                      }}
                    >
                      No sales transactions recorded yet today.
                    </div>
                  ) : (
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th style={{ width: '40px', textAlign: 'center' }}>
                            <input
                              type="checkbox"
                              checked={
                                selectedRowIds.size === recentSales.length && recentSales.length > 0
                              }
                              onChange={() => toggleSelectAll(recentSales)}
                              aria-label="Select all rows"
                              style={{ cursor: 'pointer', accentColor: '#8CB843' }}
                            />
                          </th>
                          <th>Bill Number</th>
                          <th>Time</th>
                          <th>Items</th>
                          <th style={{ textAlign: 'right' }}>Total Amount</th>
                          <th style={{ textAlign: 'right' }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentSales.map((sale) => {
                          const isSelected = selectedRowIds.has(sale.id);
                          return (
                            <tr
                              key={sale.id}
                              style={{
                                backgroundColor: isSelected ? 'rgba(140, 184, 67, 0.08)' : undefined,
                              }}
                            >
                              <td style={{ textAlign: 'center' }}>
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleSelectRow(sale.id)}
                                  aria-label={`Select sale ${sale.id}`}
                                  style={{ cursor: 'pointer', accentColor: '#8CB843' }}
                                />
                              </td>
                              <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                                {sale.bill_number}
                              </td>
                              <td style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
                                {sale.created_at
                                  ? new Date(sale.created_at).toLocaleTimeString()
                                  : '—'}
                              </td>
                              <td style={{ fontWeight: 600 }}>{sale.items?.length || 1}</td>
                              <td
                                style={{
                                  textAlign: 'right',
                                  fontWeight: 800,
                                  color: 'var(--text-main)',
                                }}
                              >
                                ${Number(sale.total_amount).toFixed(2)}
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                <Badge variant="success">Complete</Badge>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )
                )}
              </div>
            )}

            {/* TAB 2: LOW STOCK WATCHLIST */}
            {activeTableTab === 'lowstock' && (
              <div className="table-container" style={{ margin: 0 }}>
                {lowStockProducts.length === 0 ? (
                  <div
                    style={{
                      padding: '2.5rem',
                      textAlign: 'center',
                      color: 'var(--text-muted)',
                      fontSize: '0.85rem',
                    }}
                  >
                    All items are above their minimum reorder thresholds.
                  </div>
                ) : (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>SKU</th>
                        <th>Product Name</th>
                        <th style={{ textAlign: 'right' }}>Current Stock</th>
                        <th style={{ textAlign: 'right' }}>Reorder Level</th>
                        <th style={{ textAlign: 'right' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lowStockProducts.map((prod) => (
                        <tr key={prod.id}>
                          <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                            {prod.sku}
                          </td>
                          <td style={{ fontWeight: 600 }}>{prod.name}</td>
                          <td style={{ textAlign: 'right', fontWeight: 800, color: '#C0392B' }}>
                            {prod.stock}{' '}
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              {prod.unit}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>
                            {prod.reorder_level}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <Badge variant="danger">Low Stock</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ====================================================================
            SIDE COLUMN (RIGHT): TOP CATEGORIES, RADIAL GAUGE, INVENTORY VALUATION
            ==================================================================== */}
        <div className="dashboard-side-col">
          {/* Card 1: Top Categories Overlapping Bubbles */}
          <div className="dashboard-widget-card">
            <div className="widget-card-header">
              <span className="widget-card-title">Top Categories</span>
              <Link to="/categories" className="widget-manage-link">
                <span>View</span>
                <ExternalLink size={12} />
              </Link>
            </div>
            <CategoryBubbles categories={categoriesList} />
          </div>

          {/* Card 2: Fulfillment Rate / Growth Semicircular Radial Gauge */}
          <div className="dashboard-widget-card">
            <div className="widget-card-header">
              <span className="widget-card-title">Fulfillment Rate</span>
              <span className="kpi-trend-pill positive">
                <TrendingUp size={11} />
                <span>+4.8%</span>
              </span>
            </div>
            <FulfillmentGauge value={9500} trend={4.8} />
          </div>

          {/* Card 3: Inventory Valuation Status Breakdown */}
          <div className="dashboard-widget-card">
            <div className="widget-card-header">
              <span className="widget-card-title">Inventory Valuation</span>
              <Link to={isOwner ? '/reports' : '/products'} className="widget-manage-link">
                <span>Manage</span>
                <ExternalLink size={12} />
              </Link>
            </div>
            <ValuationBreakdown
              inStockCount={Math.max(0, productCount - lowStockCount)}
              lowStockCount={lowStockCount}
              outOfStockCount={Math.max(0, Math.floor(lowStockCount * 0.25))}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
