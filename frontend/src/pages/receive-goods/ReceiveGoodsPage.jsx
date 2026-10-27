import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  PackageCheck,
  CheckCircle,
  RotateCcw,
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { purchaseOrdersApi } from '../../api/purchaseOrders';
import { suppliersApi } from '../../api/suppliers';
import { productsApi } from '../../api/products';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { ErrorAlert } from '../../components/common/ErrorAlert';
import { LoadingSkeleton } from '../../components/common/LoadingSkeleton';

export const ReceiveGoodsPage = () => {
  const { showSuccess, showError } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const selectedPoId = searchParams.get('po_id') || '';

  const [eligibleOrders, setEligibleOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [suppliersMap, setSuppliersMap] = useState({});
  const [productsMap, setProductsMap] = useState({});
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingOrder, setLoadingOrder] = useState(false);
  const [receivingInputs, setReceivingInputs] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchEligibleOrders = useCallback(async () => {
    setLoadingInitial(true);
    setError('');
    try {
      const [approvedRes, partialRes, supRes, prodRes] = await Promise.all([
        purchaseOrdersApi.listPurchaseOrders({ status: 'approved', per_page: 50 }),
        purchaseOrdersApi.listPurchaseOrders({ status: 'partially_received', per_page: 50 }),
        suppliersApi.listSuppliers({ per_page: 100 }),
        productsApi.listProducts({ per_page: 100 }),
      ]);

      const combined = [...(approvedRes.items || []), ...(partialRes.items || [])];
      setEligibleOrders(combined);

      const sMap = {};
      (supRes.items || []).forEach((s) => (sMap[s.id] = s.name));
      setSuppliersMap(sMap);

      const pMap = {};
      (prodRes.items || []).forEach((p) => (pMap[p.id] = p));
      setProductsMap(pMap);
    } catch {
      setError('Failed to load eligible purchase orders.');
    } finally {
      setLoadingInitial(false);
    }
  }, []);

  useEffect(() => {
    fetchEligibleOrders();
  }, [fetchEligibleOrders]);

  const loadOrderDetails = useCallback(
    async (orderId) => {
      if (!orderId) {
        setSelectedOrder(null);
        setReceivingInputs({});
        return;
      }
      setLoadingOrder(true);
      setError('');
      try {
        const orderData = await purchaseOrdersApi.getPurchaseOrder(orderId);
        setSelectedOrder(orderData);

        const initialInputs = {};
        (orderData.items || []).forEach((item) => {
          initialInputs[item.id] = 0;
        });
        setReceivingInputs(initialInputs);
      } catch (err) {
        setError(
          err.response?.status === 403
            ? 'Permission denied. You are not authorized to receive goods for this order.'
            : 'Could not load order details.'
        );
        setSelectedOrder(null);
      } finally {
        setLoadingOrder(false);
      }
    },
    []
  );

  useEffect(() => {
    if (selectedPoId) {
      loadOrderDetails(selectedPoId);
    } else {
      setSelectedOrder(null);
      setReceivingInputs({});
    }
  }, [selectedPoId, loadOrderDetails]);

  useEffect(() => {
    if (!selectedPoId && eligibleOrders.length > 0) {
      const firstId = eligibleOrders[0].id.toString();
      setSearchParams({ po_id: firstId });
    }
  }, [selectedPoId, eligibleOrders, setSearchParams]);

  const handleInputChange = (itemId, val, maxRemaining) => {
    const num = val === '' ? '' : parseInt(val, 10);
    if (num !== '' && (isNaN(num) || num < 0)) return;
    if (num !== '' && num > maxRemaining) {
      setError(`Cannot receive more than the remaining quantity (${maxRemaining}) on this line.`);
    } else {
      setError('');
    }
    setReceivingInputs((prev) => ({
      ...prev,
      [itemId]: num,
    }));
  };

  const handleReceiveAll = () => {
    if (!selectedOrder) return;
    const filled = {};
    (selectedOrder.items || []).forEach((item) => {
      filled[item.id] = Math.max(0, item.ordered_qty - item.received_qty);
    });
    setReceivingInputs(filled);
    setError('');
  };

  const handleResetInputs = () => {
    if (!selectedOrder) return;
    const cleared = {};
    (selectedOrder.items || []).forEach((item) => {
      cleared[item.id] = 0;
    });
    setReceivingInputs(cleared);
    setError('');
  };

  const handleSubmitReceipt = async (e) => {
    e.preventDefault();
    if (!selectedOrder) return;
    setError('');

    const receiptItems = [];
    for (const item of selectedOrder.items || []) {
      const receivingQty = parseInt(receivingInputs[item.id], 10) || 0;
      if (receivingQty > 0) {
        const remaining = item.ordered_qty - item.received_qty;
        if (receivingQty > remaining) {
          setError(
            `Line for product #${item.product_id}: Receiving quantity (${receivingQty}) exceeds remaining order balance (${remaining}).`
          );
          return;
        }
        receiptItems.push({
          item_id: item.id,
          quantity: receivingQty,
        });
      }
    }

    if (receiptItems.length === 0) {
      setError('Please specify at least one quantity greater than 0 to receive.');
      return;
    }

    setSubmitting(true);
    try {
      await purchaseOrdersApi.receivePurchaseOrder(
        selectedOrder.id,
        receiptItems
      );
      showSuccess(
        `Goods received successfully for PO-${selectedOrder.id.toString().padStart(4, '0')}. Stock movement recorded into ledger.`
      );

      await fetchEligibleOrders();
      await loadOrderDetails(selectedOrder.id);
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Receipt failed. Check line quantities against remaining order limits.';
      setError(msg);
      showError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const totalReceivingNow = Object.values(receivingInputs).reduce(
    (sum, val) => sum + (parseInt(val, 10) || 0),
    0
  );

  return (
    <div className="page-container" style={{ maxWidth: '1050px' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Receive Inbound Goods</h1>
          <p className="page-subtitle">
            Inspect delivered vendor shipments, record partial/complete receipts, and update stock ledger
          </p>
        </div>
      </div>

      {error && <ErrorAlert message={error} />}

      <div className="card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ flex: '1 1 300px' }}>
            <label className="form-label" htmlFor="receive-po-select">
              Select Approved Purchase Order to Receive
            </label>
            <select
              id="receive-po-select"
              className="form-select"
              value={selectedPoId}
              onChange={(e) => {
                setSearchParams({ po_id: e.target.value });
                loadOrderDetails(e.target.value);
              }}
              disabled={loadingInitial}
            >
              <option value="" disabled>
                {eligibleOrders.length === 0
                  ? 'No approved purchase orders awaiting receipt'
                  : 'Select an authorized purchase order...'}
              </option>
              {eligibleOrders.map((po) => (
                <option key={po.id} value={po.id}>
                  PO-{po.id.toString().padStart(4, '0')} — {suppliersMap[po.supplier_id] || `Supplier #${po.supplier_id}`} ({po.status})
                </option>
              ))}
            </select>
          </div>

          {selectedOrder && (
            <div style={{ display: 'flex', gap: '0.5rem', alignSelf: 'flex-end' }}>
              <Button variant="secondary" size="sm" onClick={handleReceiveAll} icon={CheckCircle}>
                Receive All Remaining
              </Button>
              <Button variant="ghost" size="sm" onClick={handleResetInputs} icon={RotateCcw}>
                Reset
              </Button>
            </div>
          )}
        </div>
      </div>

      {loadingOrder ? (
        <LoadingSkeleton lines={6} height={40} />
      ) : !selectedOrder ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <PackageCheck size={40} style={{ color: 'var(--text-muted)', margin: '0 auto 1rem' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
            No Purchase Order Selected
          </h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', maxWidth: '400px', margin: '0 auto 1.5rem' }}>
            Select an approved or partially received purchase order from the dropdown above to inspect line items and log incoming stock.
          </p>
          <Button variant="secondary" onClick={() => navigate('/purchase-orders')}>
            View All Purchase Orders
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmitReceipt}>
          <div
            className="card"
            style={{
              padding: '1.25rem 1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem',
              backgroundColor: '#fafbfc',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.15rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                  PO-{selectedOrder.id.toString().padStart(4, '0')}
                </span>
                <Badge
                  variant={
                    selectedOrder.status === 'received'
                      ? 'success'
                      : selectedOrder.status === 'partially_received'
                      ? 'warning'
                      : 'info'
                  }
                >
                  {selectedOrder.status}
                </Badge>
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                Supplier: <strong>{suppliersMap[selectedOrder.supplier_id] || `Supplier #${selectedOrder.supplier_id}`}</strong>
                {selectedOrder.expected_date && (
                  <span> • Expected: {selectedOrder.expected_date.slice(0, 10)}</span>
                )}
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Total Units Being Received
              </div>
              <div style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--primary-600)' }}>
                {totalReceivingNow} units
              </div>
            </div>
          </div>

          <div className="table-container" style={{ marginTop: '1.5rem' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product SKU &amp; Name</th>
                  <th style={{ textAlign: 'right' }}>Ordered</th>
                  <th style={{ textAlign: 'right' }}>Previously Received</th>
                  <th style={{ textAlign: 'right' }}>Remaining</th>
                  <th style={{ textAlign: 'right', width: '180px' }}>Receiving Now</th>
                </tr>
              </thead>
              <tbody>
                {selectedOrder.items?.map((item) => {
                  const prod = productsMap[item.product_id] || {};
                  const remaining = Math.max(0, item.ordered_qty - item.received_qty);
                  const isFulfilled = remaining === 0;
                  const currentVal = receivingInputs[item.id] ?? 0;
                  const hasError = currentVal > remaining;

                  return (
                    <tr key={item.id} style={{ backgroundColor: isFulfilled ? '#fcfdfd' : 'inherit' }}>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                          {prod.name || `Product #${item.product_id}`}
                        </div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          SKU: {prod.sku || `PRD-${item.product_id}`} • Current In-Hand: {prod.stock ?? '—'} {prod.unit || 'units'}
                        </div>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{item.ordered_qty}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--success-solid)' }}>
                        {item.received_qty}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: isFulfilled ? 'var(--text-muted)' : 'var(--warning-solid)' }}>
                        {remaining}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {isFulfilled ? (
                          <Badge variant="success" dot>Fully Received</Badge>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem' }}>
                            <input
                              type="number"
                              min="0"
                              max={remaining}
                              step="1"
                              className="form-input"
                              style={{
                                width: '90px',
                                textAlign: 'right',
                                borderColor: hasError ? 'var(--danger-solid)' : undefined,
                              }}
                              value={currentVal}
                              onChange={(e) => handleInputChange(item.id, e.target.value, remaining)}
                            />
                            <button
                              type="button"
                              onClick={() => handleInputChange(item.id, remaining, remaining)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--primary-600)',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              Max
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: '1.5rem',
              padding: '1.25rem',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
            }}
          >
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              Submitting records verified stock increments to the ledger and updates order status.
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={submitting}
              disabled={totalReceivingNow === 0 || selectedOrder.status === 'received'}
              icon={PackageCheck}
            >
              Confirm Goods Receipt ({totalReceivingNow} units)
            </Button>
          </div>
        </form>
      )}
    </div>
  );
};

export default ReceiveGoodsPage;
