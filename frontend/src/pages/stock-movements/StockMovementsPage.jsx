import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowUpRight,
  ArrowDownLeft,
  Sliders,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { stockMovementsApi } from '../../api/stockMovements';
import { productsApi } from '../../api/products';
import { DataTable } from '../../components/common/DataTable';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { ErrorAlert } from '../../components/common/ErrorAlert';

export const StockMovementsPage = () => {
  const { canAdjustStock } = useAuth();
  const { showSuccess, showError } = useToast();

  const [movements, setMovements] = useState([]);
  const [productsMap, setProductsMap] = useState({});
  const [productsList, setProductsList] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, per_page: 20, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedReason, setSelectedReason] = useState('');
  const [sortField, setSortField] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustData, setAdjustData] = useState({
    product_id: '',
    quantity: '',
    notes: '',
  });
  const [adjustError, setAdjustError] = useState('');
  const [submittingAdjust, setSubmittingAdjust] = useState(false);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await productsApi.listProducts({ per_page: 100 });
        setProductsList(res.items || []);
        const map = {};
        (res.items || []).forEach((p) => {
          map[p.id] = p;
        });
        setProductsMap(map);
      } catch (error) {
        showError(error.response?.data?.error || 'Failed to load products.');
      }
    };
    fetchProducts();
  }, [showError]);

  const loadMovements = useCallback(
    async (page = 1) => {
      setLoading(true);
      setError('');
      try {
        const params = {
          page,
          per_page: pagination.per_page,
          product_id: selectedProductId ? Number(selectedProductId) : undefined,
          reason: selectedReason || undefined,
          sort_by: sortField,
          sort_order: sortOrder,
        };
        const res = await stockMovementsApi.listStockMovements(params);
        setMovements(res.items || []);
        setPagination(res.pagination || { page: 1, per_page: 20, total: 0, pages: 1 });
      } catch {
        setError('Failed to load stock movements history.');
      } finally {
        setLoading(false);
      }
    },
    [selectedProductId, selectedReason, sortField, sortOrder, pagination.per_page]
  );

  useEffect(() => {
    loadMovements(1);
  }, [loadMovements]);

  const handleOpenAdjustModal = () => {
    setAdjustData({
      product_id: productsList.length > 0 ? productsList[0].id.toString() : '',
      quantity: '',
      notes: '',
    });
    setAdjustError('');
    setIsAdjustModalOpen(true);
  };

  const handleAdjustSubmit = async (e) => {
    e.preventDefault();
    setAdjustError('');

    if (!adjustData.product_id) {
      setAdjustError('Please select a product.');
      return;
    }

    const qty = parseInt(adjustData.quantity, 10);
    if (isNaN(qty) || qty === 0) {
      setAdjustError('Quantity change must be a non-zero whole number (e.g. +5 or -3).');
      return;
    }

    if (!adjustData.notes.trim()) {
      setAdjustError('An explanation/reason for this stock adjustment is mandatory.');
      return;
    }

    if (adjustData.notes.trim().length > 500) {
      setAdjustError('Reason cannot exceed 500 characters.');
      return;
    }

    setSubmittingAdjust(true);
    try {
      await stockMovementsApi.createAdjustment({
        product_id: Number(adjustData.product_id),
        quantity: qty,
        notes: adjustData.notes.trim(),
      });
      showSuccess('Manual stock adjustment recorded in the ledger.');
      setIsAdjustModalOpen(false);
      loadMovements(1);
      const prodRes = await productsApi.listProducts({ per_page: 100 });
      setProductsList(prodRes.items || []);
      const map = {};
      (prodRes.items || []).forEach((p) => (map[p.id] = p));
      setProductsMap(map);
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Adjustment rejected. Verify that reducing stock does not drop below zero.';
      setAdjustError(msg);
    } finally {
      setSubmittingAdjust(false);
    }
  };

  const getReasonBadge = (reason) => {
    switch (reason) {
      case 'purchase':
        return <Badge variant="success">Purchase Receipt</Badge>;
      case 'sale':
        return <Badge variant="info">Point of Sale</Badge>;
      case 'adjustment':
        return <Badge variant="warning">Manual Adjustment</Badge>;
      default:
        return <Badge variant="neutral">{reason}</Badge>;
    }
  };

  const selectedProductDetail = productsList.find(
    (p) => p.id === Number(adjustData.product_id)
  );

  const columns = [
    {
      header: 'ID',
      key: 'id',
      width: '70px',
      sortable: true,
      render: (m) => <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>#{m.id}</span>,
    },
    {
      header: 'Product',
      key: 'product_id',
      sortable: true,
      render: (m) => {
        const prod = productsMap[m.product_id];
        return (
          <div>
            <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>
              {prod ? prod.name : `Product #${m.product_id}`}
            </span>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {prod ? prod.sku : `ID: ${m.product_id}`}
            </div>
          </div>
        );
      },
    },
    {
      header: 'Signed Quantity',
      key: 'quantity',
      sortable: true,
      align: 'right',
      render: (m) => {
        const isInbound = m.quantity > 0;
        return (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontWeight: 700,
              fontSize: '0.925rem',
              color: isInbound ? 'var(--success-solid)' : 'var(--danger-solid)',
            }}
          >
            {isInbound ? <ArrowUpRight size={16} /> : <ArrowDownLeft size={16} />}
            <span>
              {isInbound ? `+${m.quantity}` : m.quantity}
            </span>
          </div>
        );
      },
    },
    {
      header: 'Reason',
      key: 'reason',
      sortable: true,
      render: (m) => getReasonBadge(m.reason),
    },
    {
      header: 'Reference ID',
      key: 'reference_id',
      render: (m) => (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem' }}>
          {m.reference_id ? (
            m.reason === 'purchase' ? (
              <span style={{ color: 'var(--primary-600)', fontWeight: 600 }}>PO-{m.reference_id.toString().padStart(4, '0')}</span>
            ) : m.reason === 'sale' ? (
              <span style={{ color: 'var(--info-solid)', fontWeight: 600 }}>Sale #{m.reference_id}</span>
            ) : (
              `Ref #${m.reference_id}`
            )
          ) : (
            <span style={{ color: 'var(--text-muted)' }}>—</span>
          )}
        </span>
      ),
    },
    {
      header: 'Notes / Reason',
      key: 'notes',
      render: (m) => (
        <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
          {m.notes || <em style={{ color: 'var(--text-muted)' }}>Automated ledger entry</em>}
        </span>
      ),
    },
    {
      header: 'Timestamp',
      key: 'created_at',
      sortable: true,
      width: '160px',
      render: (m) => (
        <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
          <div>{new Date(m.created_at).toLocaleDateString()}</div>
          <div style={{ fontSize: '0.75rem' }}>{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
        </div>
      ),
    },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Stock Movement Ledger</h1>
          <p className="page-subtitle">
            Auditable, append-only transaction ledger recording every unit increment and decrement
          </p>
        </div>
        {canAdjustStock && (
          <div className="page-actions">
            <Button variant="primary" onClick={handleOpenAdjustModal} icon={Sliders}>
              Stock Adjustment
            </Button>
          </div>
        )}
      </div>

      {error && <ErrorAlert message={error} onRetry={() => loadMovements(1)} />}

      <div className="filter-bar">
        <div className="filter-group">
          {productsList.length > 0 && (
            <select
              className="form-select"
              style={{ width: '240px' }}
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
            >
              <option value="">All Products</option>
              {productsList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.sku} — {p.name}
                </option>
              ))}
            </select>
          )}

          <select
            className="form-select"
            style={{ width: '180px' }}
            value={selectedReason}
            onChange={(e) => setSelectedReason(e.target.value)}
          >
            <option value="">All Movement Types</option>
            <option value="purchase">Purchase Receipts (+)</option>
            <option value="sale">Point of Sale (-)</option>
            <option value="adjustment">Manual Adjustments (±)</option>
          </select>
        </div>

        <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
          Total Ledger Events: <strong>{pagination.total}</strong>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={movements}
        loading={loading}
        sortField={sortField}
        sortOrder={sortOrder}
        onSort={(field, order) => {
          setSortField(field);
          setSortOrder(order);
        }}
        pagination={pagination}
        onPageChange={(page) => loadMovements(page)}
        emptyMessage="No stock movements recorded"
        emptyDescription="Inventory movements will automatically be logged when goods are received or sales are rung up."
      />

      <Modal
        isOpen={isAdjustModalOpen}
        onClose={() => setIsAdjustModalOpen(false)}
        title="Record Stock Adjustment"
        subtitle="Log physical inventory discrepancy, damage write-off, or correction"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsAdjustModalOpen(false)} disabled={submittingAdjust}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleAdjustSubmit} loading={submittingAdjust}>
              Submit Adjustment
            </Button>
          </>
        }
      >
        {adjustError && (
          <div style={{ marginBottom: '1rem' }}>
            <ErrorAlert message={adjustError} />
          </div>
        )}
        <form onSubmit={handleAdjustSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="adj-product">
              Select Product *
            </label>
            <select
              id="adj-product"
              className="form-select"
              value={adjustData.product_id}
              onChange={(e) => setAdjustData({ ...adjustData, product_id: e.target.value })}
              required
            >
              {productsList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.sku} — {p.name} (Current Stock: {p.stock} {p.unit})
                </option>
              ))}
            </select>
          </div>

          {selectedProductDetail && (
            <div
              style={{
                padding: '0.75rem',
                backgroundColor: 'var(--bg-muted)',
                borderRadius: 'var(--radius-md)',
                marginBottom: '1rem',
                fontSize: '0.8125rem',
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <span>Current Stock on Hand:</span>
              <strong style={{ color: selectedProductDetail.stock <= 0 ? 'var(--danger-solid)' : 'var(--text-main)' }}>
                {selectedProductDetail.stock} {selectedProductDetail.unit}
              </strong>
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="adj-qty">
              Adjustment Quantity Change (+ or -) *
            </label>
            <input
              id="adj-qty"
              type="number"
              step="1"
              className="form-input"
              placeholder="e.g. +5 for found stock, -2 for damaged items"
              value={adjustData.quantity}
              onChange={(e) => setAdjustData({ ...adjustData, quantity: e.target.value })}
              required
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Positive numbers increase stock; negative numbers decrease stock. Adjustments cannot reduce total balance below zero.
            </span>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="adj-reason">
              Mandatory Business Reason / Notes *
            </label>
            <textarea
              id="adj-reason"
              className="form-textarea"
              rows={3}
              placeholder="Describe why stock is being adjusted (e.g. Annual audit count correction, water damage write-off, supplier sample)..."
              value={adjustData.notes}
              onChange={(e) => setAdjustData({ ...adjustData, notes: e.target.value })}
              maxLength={500}
              required
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default StockMovementsPage;
