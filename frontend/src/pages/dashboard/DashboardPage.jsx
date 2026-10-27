import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShoppingBag,
  Plus,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { productsApi } from '../../api/products';
import { purchaseOrdersApi } from '../../api/purchaseOrders';
import { salesApi } from '../../api/sales';
import { reportsApi } from '../../api/reports';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { ErrorAlert } from '../../components/common/ErrorAlert';
import { formatCurrency } from '../../utils/currency';
import { prefetchRouteData } from '../../api/prefetch';

export const DashboardPage = () => {
  const { user, isOwner, isManager, canCreatePurchaseOrder } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [productCount, setProductCount] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [valuationAtCost, setValuationAtCost] = useState(null);
  const [todaySalesTotal, setTodaySalesTotal] = useState('0.00');
  const [salesCount, setSalesCount] = useState(0);
  const [salesTrend, setSalesTrend] = useState([]);
  const [pendingOrdersCount, setPendingOrdersCount] = useState(null);

  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [recentSales, setRecentSales] = useState([]);

  const [activeTableTab, setActiveTableTab] = useState('orders');

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const endDate = new Date();
      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - 6);
      const dateString = (date) => date.toISOString().slice(0, 10);

      const requests = {
        lowStock: productsApi.listProducts({ per_page: 5, low_stock: 'true' }),
        products: productsApi.listProducts({ per_page: 1 }),
        sales: salesApi.listSales({
          per_page: 6,
          sort_by: 'created_at',
          sort_order: 'desc',
        }),
      };

      if (isOwner) {
        requests.valuation = reportsApi.getValuationReport({ per_page: 1 });
        requests.salesTrend = reportsApi.getSalesByDayReport({
          start_date: dateString(startDate),
          end_date: dateString(endDate),
          per_page: 7,
        });
      }

      if (isOwner || isManager) {
        requests.draftOrders = purchaseOrdersApi.listPurchaseOrders({
          status: 'draft',
          per_page: 1,
        });
        requests.approvedOrders = purchaseOrdersApi.listPurchaseOrders({
          status: 'approved',
          per_page: 1,
        });
        requests.recentOrders = purchaseOrdersApi.listPurchaseOrders({
          per_page: 6,
          sort_by: 'created_at',
          sort_order: 'desc',
        });
      }

      const data = Object.fromEntries(
        await Promise.all(
          Object.entries(requests).map(async ([key, request]) => [key, await request])
        )
      );

      const productsRes = data.lowStock;
      setLowStockProducts(productsRes.items || []);
      setProductCount(data.products.pagination?.total || 0);
      setLowStockCount(productsRes.pagination?.total || 0);

      if (isOwner) {
        setValuationAtCost(data.valuation.total_value_at_cost);
        const salesTrendRes = data.salesTrend;
        setSalesTrend(salesTrendRes.items || []);
        const today = dateString(endDate);
        const todayItem = salesTrendRes.items?.find((item) => item.date === today);
        setTodaySalesTotal(todayItem?.total_sales || '0.00');
      }

      if (isOwner || isManager) {
        setPendingOrdersCount(
          (data.draftOrders.pagination?.total || 0) +
            (data.approvedOrders.pagination?.total || 0)
        );
        setRecentOrders(data.recentOrders.items || []);
      }

      const salesRes = data.sales;
      setRecentSales(salesRes.items || []);
      setSalesCount(salesRes.pagination?.total || 0);
    } catch {
      setError('Unable to load full dashboard statistics from the server.');
    } finally {
      setLoading(false);
    }
  }, [isOwner, isManager]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const maxDailySales = Math.max(
    1,
    ...salesTrend.map((item) => Number(item.total_sales) || 0)
  );

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

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">
            Welcome back, <strong>{user?.name}</strong> • Real-time retail operations &amp; stock intelligence
          </p>
        </div>
        <div className="page-actions">
          <Button
            variant="primary"
            onClick={() => navigate('/pos')}
            onMouseEnter={() => prefetchRouteData('/pos', user?.role)}
            icon={ShoppingBag}
          >
            New Sale (POS)
          </Button>
          {canCreatePurchaseOrder && (
            <Button
              variant="secondary"
              onClick={() => navigate('/purchase-orders/new')}
              onMouseEnter={() => prefetchRouteData('/purchase-orders/new', user?.role)}
              icon={Plus}
            >
              Create Purchase Order
            </Button>
          )}
        </div>
      </div>

      {error && <ErrorAlert message={error} onRetry={loadDashboardData} />}

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

      <div className={`dashboard-layout-grid ${isOwner ? 'with-side-col' : ''}`}>
        <div className="dashboard-main-col">
          <div className="stats-kpi-row">
            <div className="kpi-card">
              <div className="kpi-card-top">
                <span className="kpi-card-lbl">{isOwner ? 'TODAY’S SALES' : 'MY SALES'}</span>
              </div>
              <div className="kpi-card-val-row">
                <div className="kpi-card-val">
                  {loading ? '...' : isOwner
                    ? formatCurrency(todaySalesTotal)
                    : salesCount.toLocaleString()}
                </div>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                {isOwner ? 'Store-wide sales today' : 'Sales recorded by your account'}
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-card-top">
                <span className="kpi-card-lbl">TOTAL PRODUCTS</span>
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

            <div className="kpi-card">
              <div className="kpi-card-top">
                <span className="kpi-card-lbl">
                  {pendingOrdersCount !== null ? 'PENDING ORDERS' : 'LOW-STOCK ALERTS'}
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

          <div className="dashboard-table-card" id="dashboard-table-section">
            <div className="table-card-header">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <span className="table-card-title">
                    {activeTableTab === 'orders'
                      ? canCreatePurchaseOrder ? 'Recent Orders' : 'Recent Sales'
                      : 'Low-Stock Watchlist'}
                  </span>
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
                      {canCreatePurchaseOrder ? 'Orders' : 'Sales'}
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
                    ? canCreatePurchaseOrder
                      ? 'Recent supplier purchase orders & procurement fulfillment'
                      : 'Recent sales recorded by your account'
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
                </Link>
              </div>
            </div>

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
                          <th>Order #</th>
                          <th>Supplier / Vendor</th>
                          <th>Expected Date</th>
                          <th>Items</th>
                          <th>Status</th>
                          <th style={{ textAlign: 'right' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentOrders.map((order) => (
                            <tr key={order.id}>
                              <td style={{ fontWeight: 700 }}>
                                <Link
                                  to={`/purchase-orders/${order.id}`}
                                  onMouseEnter={() =>
                                    prefetchRouteData(`/purchase-orders/${order.id}`, user?.role)
                                  }
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
                                  onMouseEnter={() =>
                                    prefetchRouteData(`/purchase-orders/${order.id}`, user?.role)
                                  }
                                  className="btn btn-ghost btn-sm"
                                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                                >
                                  Details ↗
                                </Link>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  )
                ) : (
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
                          <th>Bill Number</th>
                          <th>Time</th>
                          <th>Items</th>
                          <th style={{ textAlign: 'right' }}>Total Amount</th>
                          <th style={{ textAlign: 'right' }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentSales.map((sale) => (
                            <tr key={sale.id}>
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
                                {formatCurrency(sale.total_amount)}
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                <Badge variant="success">Complete</Badge>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  )
                )}
              </div>
            )}

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

        {isOwner && (
          <aside className="dashboard-side-col">
            <section className="dashboard-widget-card">
              <div className="widget-card-header">
                <span className="widget-card-title">Sales by day</span>
                <Link to="/reports" className="widget-manage-link">View report</Link>
              </div>
              {salesTrend.length === 0 ? (
                <p className="dashboard-empty-state">No sales were recorded in the last seven days.</p>
              ) : (
                <div className="dashboard-sales-trend">
                  {salesTrend.map((item) => (
                    <div className="dashboard-sales-trend-row" key={item.date}>
                      <span>{new Date(`${item.date}T00:00:00`).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}</span>
                      <div className="dashboard-sales-trend-track" aria-hidden="true">
                        <div
                          className="dashboard-sales-trend-bar"
                          style={{
                            width: `${(Number(item.total_sales || 0) / maxDailySales) * 100}%`,
                          }}
                        />
                      </div>
                      <strong>{formatCurrency(item.total_sales)}</strong>
                    </div>
                  ))}
                </div>
              )}
            </section>
            <section className="dashboard-widget-card">
              <div className="widget-card-header">
                <span className="widget-card-title">Inventory valuation</span>
                <Link to="/reports" className="widget-manage-link">View report</Link>
              </div>
              <strong className="dashboard-valuation-total">
                {loading || valuationAtCost === null
                  ? '...'
                  : formatCurrency(valuationAtCost)}
              </strong>
              <p className="dashboard-empty-state">Current stock value at cost</p>
            </section>
          </aside>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
