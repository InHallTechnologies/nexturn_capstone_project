import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle,
  IndianRupee,
  TrendingUp,
  Download,
  Calendar,
  Scale,
  Lock,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { reportsApi } from '../../api/reports';
import { DataTable } from '../../components/common/DataTable';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { AreaChart } from '../../components/charts/AreaChart';
import { ErrorAlert } from '../../components/common/ErrorAlert';
import { formatCurrency } from '../../utils/currency';

export const ReportsPage = () => {
  const { isOwner } = useAuth();
  const { showSuccess, showError } = useToast();

  const [activeTab, setActiveTab] = useState('low-stock'); // 'low-stock', 'valuation', 'sales-by-day', 'ledger-balance'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 1. Low stock data
  const [lowStockData, setLowStockData] = useState([]);
  const [lowStockPagination, setLowStockPagination] = useState({ page: 1, per_page: 20, total: 0, pages: 1 });

  // 2. Valuation data (Owner only)
  const [valuationData, setValuationData] = useState([]);
  const [valuationTotal, setValuationTotal] = useState('0.00');
  const [valuationPagination, setValuationPagination] = useState({ page: 1, per_page: 20, total: 0, pages: 1 });

  // 3. Sales by day data (Owner only)
  const [startDate, setStartDate] = useState(() =>
    new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [salesByDayData, setSalesByDayData] = useState([]);
  const [salesByDayPagination, setSalesByDayPagination] = useState({ page: 1, per_page: 30, total: 0, pages: 1 });

  // 4. Ledger balance data (Owner only)
  const [ledgerBalanceData, setLedgerBalanceData] = useState([]);
  const [ledgerPagination, setLedgerPagination] = useState({ page: 1, per_page: 20, total: 0, pages: 1 });

  // Load report based on activeTab
  const loadActiveReport = useCallback(
    async (page = 1) => {
      setLoading(true);
      setError('');
      try {
        if (activeTab === 'low-stock') {
          const res = await reportsApi.getLowStockReport({ page, per_page: 20 });
          setLowStockData(res.items || []);
          setLowStockPagination(res.pagination || { page: 1, per_page: 20, total: 0, pages: 1 });
        } else if (activeTab === 'valuation' && isOwner) {
          const res = await reportsApi.getValuationReport({ page, per_page: 20 });
          setValuationData(res.items || []);
          setValuationTotal(res.total_value_at_cost || '0.00');
          setValuationPagination(res.pagination || { page: 1, per_page: 20, total: 0, pages: 1 });
        } else if (activeTab === 'sales-by-day' && isOwner) {
          const res = await reportsApi.getSalesByDayReport({
            start_date: startDate,
            end_date: endDate,
            page,
            per_page: 30,
            sort_by: 'date',
            sort_order: 'desc',
          });
          setSalesByDayData(res.items || []);
          setSalesByDayPagination(res.pagination || { page: 1, per_page: 30, total: 0, pages: 1 });
        } else if (activeTab === 'ledger-balance' && isOwner) {
          const res = await reportsApi.getLedgerBalanceReport({ page, per_page: 20 });
          setLedgerBalanceData(res.items || []);
          setLedgerPagination(res.pagination || { page: 1, per_page: 20, total: 0, pages: 1 });
        }
      } catch {
        setError('Failed to retrieve report data from the backend server.');
      } finally {
        setLoading(false);
      }
    },
    [activeTab, isOwner, startDate, endDate]
  );

  useEffect(() => {
    loadActiveReport(1);
  }, [loadActiveReport]);

  // Export to CSV helper
  const exportToCSV = () => {
    let rows = [];
    let filename = `retail-inventory-${activeTab}-${new Date().toISOString().slice(0, 10)}.csv`;

    if (activeTab === 'low-stock') {
      rows = [
        ['Product ID', 'SKU', 'Product Name', 'Current Stock', 'Reorder Level'],
        ...lowStockData.map((d) => [d.product_id, d.sku, `"${d.name}"`, d.stock, d.reorder_level]),
      ];
    } else if (activeTab === 'valuation') {
      rows = [
        ['Product ID', 'SKU', 'Product Name', 'Stock On Hand', 'Unit Cost Price (INR)', 'Valuation at Cost (INR)'],
        ...valuationData.map((d) => [d.product_id, d.sku, `"${d.name}"`, d.stock, d.cost_price, d.value_at_cost]),
      ];
    } else if (activeTab === 'sales-by-day') {
      rows = [
        ['Date', 'Bills Count', 'Total Sales Revenue (INR)'],
        ...salesByDayData.map((d) => [d.date, d.bill_count, d.total_sales]),
      ];
    } else if (activeTab === 'ledger-balance') {
      rows = [
        ['Product ID', 'SKU', 'Product Name', 'Stock From Movements Ledger'],
        ...ledgerBalanceData.map((d) => [d.product_id, d.sku, `"${d.name}"`, d.stock_from_movements]),
      ];
    }

    if (rows.length === 0) {
      showError('No records available to export.');
      return;
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showSuccess(`Exported report to ${filename}`);
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports &amp; Analytics</h1>
          <p className="page-subtitle">
            Authoritative inventory valuation, movement reconciliations, and sales analytics
          </p>
        </div>
        <div className="page-actions">
          <Button variant="secondary" onClick={exportToCSV} icon={Download}>
            Export CSV
          </Button>
        </div>
      </div>

      {error && <ErrorAlert message={error} onRetry={() => loadActiveReport(1)} />}

      {/* Report Navigation Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          borderBottom: '1px solid var(--border-subtle)',
          paddingBottom: '0.25rem',
          overflowX: 'auto',
        }}
      >
        <button
          onClick={() => setActiveTab('low-stock')}
          className={`btn ${activeTab === 'low-stock' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ fontSize: '0.8125rem' }}
        >
          <AlertTriangle size={15} /> Low Stock Watch
        </button>

        <button
          onClick={() => setActiveTab('valuation')}
          className={`btn ${activeTab === 'valuation' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ fontSize: '0.8125rem' }}
          disabled={!isOwner}
          title={!isOwner ? 'Owner access only' : undefined}
        >
          <IndianRupee size={15} /> Inventory Valuation
          {!isOwner && <Lock size={12} style={{ opacity: 0.6 }} />}
        </button>

        <button
          onClick={() => setActiveTab('sales-by-day')}
          className={`btn ${activeTab === 'sales-by-day' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ fontSize: '0.8125rem' }}
          disabled={!isOwner}
          title={!isOwner ? 'Owner access only' : undefined}
        >
          <TrendingUp size={15} /> Daily Sales Revenue
          {!isOwner && <Lock size={12} style={{ opacity: 0.6 }} />}
        </button>

        <button
          onClick={() => setActiveTab('ledger-balance')}
          className={`btn ${activeTab === 'ledger-balance' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ fontSize: '0.8125rem' }}
          disabled={!isOwner}
          title={!isOwner ? 'Owner access only' : undefined}
        >
          <Scale size={15} /> Ledger Reconciliation
          {!isOwner && <Lock size={12} style={{ opacity: 0.6 }} />}
        </button>
      </div>

      {/* 1. Low Stock Report */}
      {activeTab === 'low-stock' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div
            style={{
              padding: '1rem 1.25rem',
              backgroundColor: 'var(--warning-bg)',
              border: '1px solid var(--warning-border)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertTriangle size={18} style={{ color: 'var(--warning-solid)' }} />
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--warning-text)' }}>
                Products requiring replenishment ({lowStockPagination.total} items below reorder threshold)
              </span>
            </div>
          </div>

          <DataTable
            columns={[
              {
                header: 'SKU',
                key: 'sku',
                width: '140px',
                render: (r) => <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{r.sku}</span>,
              },
              {
                header: 'Product Name',
                key: 'name',
                render: (r) => <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{r.name}</span>,
              },
              {
                header: 'Stock On Hand',
                key: 'stock',
                align: 'right',
                render: (r) => (
                  <span style={{ fontWeight: 700, color: 'var(--danger-solid)', fontSize: '0.95rem' }}>
                    {r.stock}
                  </span>
                ),
              },
              {
                header: 'Reorder Threshold',
                key: 'reorder_level',
                align: 'right',
                render: (r) => <span style={{ color: 'var(--text-muted)' }}>{r.reorder_level}</span>,
              },
              {
                header: 'Deficit Units',
                key: 'deficit',
                align: 'right',
                render: (r) => (
                  <Badge variant="warning">
                    -{Math.max(0, r.reorder_level - r.stock)} units
                  </Badge>
                ),
              },
            ]}
            data={lowStockData}
            loading={loading}
            pagination={lowStockPagination}
            onPageChange={(page) => loadActiveReport(page)}
            emptyMessage="All products well-stocked"
            emptyDescription="There are currently zero catalogue items below their designated reorder limits."
          />
        </div>
      )}

      {/* 2. Valuation at Cost Report (Owner Only) */}
      {activeTab === 'valuation' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="card" style={{ padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                Authoritative Inventory Asset Valuation
              </span>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary-600)', marginTop: '0.15rem' }}>
                {formatCurrency(valuationTotal)}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Computed from total positive stock movements multiplied by purchase cost price
              </div>
            </div>
            <div style={{ padding: '1rem', backgroundColor: 'var(--bg-muted)', borderRadius: 'var(--radius-md)', textAlign: 'right' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Tracked SKUs</span>
              <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{valuationPagination.total}</div>
            </div>
          </div>

          <DataTable
            columns={[
              {
                header: 'SKU',
                key: 'sku',
                width: '140px',
                render: (r) => <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{r.sku}</span>,
              },
              {
                header: 'Product Name',
                key: 'name',
                render: (r) => <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{r.name}</span>,
              },
              {
                header: 'Stock',
                key: 'stock',
                align: 'right',
                render: (r) => <span style={{ fontWeight: 600 }}>{r.stock}</span>,
              },
              {
                header: 'Unit Cost Price',
                key: 'cost_price',
                align: 'right',
                render: (r) => <span>{formatCurrency(r.cost_price)}</span>,
              },
              {
                header: 'Value at Cost',
                key: 'value_at_cost',
                align: 'right',
                render: (r) => (
                  <span style={{ fontWeight: 700, color: 'var(--success-solid)' }}>
                    {formatCurrency(r.value_at_cost)}
                  </span>
                ),
              },
            ]}
            data={valuationData}
            loading={loading}
            pagination={valuationPagination}
            onPageChange={(page) => loadActiveReport(page)}
          />
        </div>
      )}

      {/* 3. Daily Sales Revenue Report (Owner Only) */}
      {activeTab === 'sales-by-day' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Date range picker filter */}
          <div className="filter-bar">
            <div className="filter-group">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem' }}>
                <Calendar size={16} style={{ color: 'var(--text-muted)' }} />
                <span>Start Date:</span>
                <input
                  type="date"
                  className="form-input"
                  style={{ width: '150px' }}
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem' }}>
                <span>End Date:</span>
                <input
                  type="date"
                  className="form-input"
                  style={{ width: '150px' }}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>

              <Button variant="secondary" size="sm" onClick={() => loadActiveReport(1)}>
                Apply Dates
              </Button>
            </div>
          </div>

          {/* Chart representation */}
          {salesByDayData.length > 0 && (
            <div className="card" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem' }}>
                Daily Sales Revenue ({startDate} to {endDate})
              </h3>
              <AreaChart
                data={[...salesByDayData]
                  .reverse()
                  .map((d) => ({ label: d.date.slice(5), value: Number(d.total_sales) }))}
                height={220}
              />
            </div>
          )}

          <DataTable
            columns={[
              {
                header: 'Date',
                key: 'date',
                render: (r) => <span style={{ fontWeight: 600 }}>{r.date}</span>,
              },
              {
                header: 'Bills Recorded',
                key: 'bill_count',
                align: 'right',
                render: (r) => <span style={{ fontWeight: 600 }}>{r.bill_count} invoices</span>,
              },
              {
                header: 'Total Sales Revenue',
                key: 'total_sales',
                align: 'right',
                render: (r) => (
                  <span style={{ fontWeight: 700, color: 'var(--primary-600)', fontSize: '0.95rem' }}>
                    {formatCurrency(r.total_sales)}
                  </span>
                ),
              },
            ]}
            data={salesByDayData}
            loading={loading}
            pagination={salesByDayPagination}
            onPageChange={(page) => loadActiveReport(page)}
            emptyMessage="No sales recorded in selected timeframe"
          />
        </div>
      )}

      {/* 4. Ledger Balance Reconciliation (Owner Only) */}
      {activeTab === 'ledger-balance' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div
            style={{
              padding: '1rem 1.25rem',
              backgroundColor: 'var(--info-bg)',
              border: '1px solid var(--info-border)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.8125rem',
              color: 'var(--info-text)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <Scale size={18} style={{ color: 'var(--info-solid)', flexShrink: 0 }} />
            <span>
              All product stock balances displayed below are strictly recomputed from atomic ledger transactions (Purchases + Adjustments - Sales) to ensure mathematical integrity.
            </span>
          </div>

          <DataTable
            columns={[
              {
                header: 'SKU',
                key: 'sku',
                width: '140px',
                render: (r) => <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{r.sku}</span>,
              },
              {
                header: 'Product Name',
                key: 'name',
                render: (r) => <span style={{ fontWeight: 600 }}>{r.name}</span>,
              },
              {
                header: 'Recomputed Stock (Ledger)',
                key: 'stock_from_movements',
                align: 'right',
                render: (r) => (
                  <span style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.95rem' }}>
                    {r.stock_from_movements}
                  </span>
                ),
              },
              {
                header: 'Integrity Check',
                key: 'integrity',
                align: 'center',
                width: '140px',
                render: () => <Badge variant="success" dot>Reconciled</Badge>,
              },
            ]}
            data={ledgerBalanceData}
            loading={loading}
            pagination={ledgerPagination}
            onPageChange={(page) => loadActiveReport(page)}
          />
        </div>
      )}
    </div>
  );
};

export default ReportsPage;
