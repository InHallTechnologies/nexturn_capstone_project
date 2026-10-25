import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  PackageCheck,
  Trash2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { purchaseOrdersApi } from '../../api/purchaseOrders';
import { suppliersApi } from '../../api/suppliers';
import { productsApi } from '../../api/products';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { LoadingSkeleton } from '../../components/common/LoadingSkeleton';
import { ErrorAlert } from '../../components/common/ErrorAlert';

export const PurchaseOrderDetailPage = () => {
  const { id } = useParams();
  const { isOwner } = useAuth();
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [supplier, setSupplier] = useState(null);
  const [productsMap, setProductsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Dialogs
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [approving, setApproving] = useState(false);

  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadOrderDetail = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const orderData = await purchaseOrdersApi.getPurchaseOrder(id);
      setOrder(orderData);

      // Load supplier details
      if (orderData.supplier_id) {
        try {
          const sup = await suppliersApi.getSupplier(orderData.supplier_id);
          setSupplier(sup);
        } catch {
          setSupplier({ name: `Supplier #${orderData.supplier_id}` });
        }
      }

      // Load products for line item descriptions
      const prodRes = await productsApi.listProducts({ per_page: 100 });
      const pMap = {};
      (prodRes.items || []).forEach((p) => {
        pMap[p.id] = p;
      });
      setProductsMap(pMap);
    } catch (err) {
      setError(
        err.response?.status === 403
          ? 'Permission denied. You do not have access to view this purchase order.'
          : 'Failed to retrieve purchase order details.'
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadOrderDetail();
  }, [loadOrderDetail]);

  const handleApprove = async () => {
    setApproving(true);
    try {
      await purchaseOrdersApi.approvePurchaseOrder(id);
      showSuccess(`Purchase Order PO-${id.padStart(4, '0')} approved successfully.`);
      setIsApproveOpen(false);
      loadOrderDetail();
    } catch (err) {
      const msg = err.response?.data?.error || 'Approval failed.';
      showError(msg);
      setIsApproveOpen(false);
    } finally {
      setApproving(false);
    }
  };

  const handleCancel = async () => {
    setCancelling(true);
    try {
      await purchaseOrdersApi.cancelPurchaseOrder(id);
      showSuccess(`Purchase Order PO-${id.padStart(4, '0')} cancelled.`);
      setIsCancelOpen(false);
      loadOrderDetail();
    } catch (err) {
      const msg = err.response?.data?.error || 'Cancellation failed.';
      showError(msg);
      setIsCancelOpen(false);
    } finally {
      setCancelling(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await purchaseOrdersApi.deletePurchaseOrder(id);
      showSuccess(`Purchase Order PO-${id.padStart(4, '0')} deleted.`);
      navigate('/purchase-orders');
    } catch (err) {
      const msg = err.response?.data?.error || 'Deletion failed.';
      showError(msg);
      setIsDeleteOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return <Badge variant="info">Approved</Badge>;
      case 'partially_received':
        return <Badge variant="warning">Partially Received</Badge>;
      case 'received':
        return <Badge variant="success">Fully Received</Badge>;
      case 'cancelled':
        return <Badge variant="danger">Cancelled</Badge>;
      default:
        return <Badge variant="neutral">Draft</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="page-container" style={{ maxWidth: '1000px' }}>
        <LoadingSkeleton lines={8} height={40} />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="page-container" style={{ maxWidth: '1000px' }}>
        <Button variant="ghost" size="sm" onClick={() => navigate('/purchase-orders')} icon={ArrowLeft}>
          Back to Orders
        </Button>
        <ErrorAlert message={error || 'Purchase order not found.'} />
      </div>
    );
  }

  const totalOrdered = (order.items || []).reduce((sum, item) => sum + item.ordered_qty, 0);
  const totalReceived = (order.items || []).reduce((sum, item) => sum + item.received_qty, 0);
  const totalCost = (order.items || []).reduce(
    (sum, item) => sum + item.ordered_qty * Number(item.unit_cost),
    0
  );
  const percentReceived = totalOrdered > 0 ? Math.round((totalReceived / totalOrdered) * 100) : 0;

  return (
    <div className="page-container" style={{ maxWidth: '1050px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <Button variant="ghost" size="sm" onClick={() => navigate('/purchase-orders')} icon={ArrowLeft}>
          Back to Purchase Orders
        </Button>
      </div>

      {/* Header Banner */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                PO-{order.id.toString().padStart(4, '0')}
              </h1>
              {getStatusBadge(order.status)}
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
              Placed on {new Date(order.created_at).toLocaleDateString()} at{' '}
              {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            {/* Owner Approval Button */}
            {order.status === 'draft' && isOwner && (
              <Button variant="primary" onClick={() => setIsApproveOpen(true)} icon={CheckCircle}>
                Approve Purchase Order
              </Button>
            )}

            {/* Goods Receipt Action */}
            {(order.status === 'approved' || order.status === 'partially_received') && (
              <Button
                variant="primary"
                onClick={() => navigate(`/receive-goods?po_id=${order.id}`)}
                icon={PackageCheck}
              >
                Receive Goods
              </Button>
            )}

            {/* Cancel Action */}
            {(order.status === 'draft' || order.status === 'approved') && (
              <Button variant="danger" onClick={() => setIsCancelOpen(true)} icon={XCircle}>
                Cancel Order
              </Button>
            )}

            {/* Delete Action (Draft only) */}
            {order.status === 'draft' && (
              <Button variant="ghost" onClick={() => setIsDeleteOpen(true)} icon={Trash2}>
                Delete Draft
              </Button>
            )}
          </div>
        </div>

        {/* Supplier & Delivery Info Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1rem',
            marginTop: '1.5rem',
            paddingTop: '1.25rem',
            borderTop: '1px solid var(--border-subtle)',
          }}
        >
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Wholesale Vendor
            </span>
            <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-main)', marginTop: '0.2rem' }}>
              {supplier?.name || `Supplier #${order.supplier_id}`}
            </div>
            {supplier?.email && (
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{supplier.email}</div>
            )}
          </div>

          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Expected Delivery
            </span>
            <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-main)', marginTop: '0.2rem' }}>
              {order.expected_date ? order.expected_date.slice(0, 10) : 'Not specified'}
            </div>
          </div>

          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Total Order Value
            </span>
            <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--primary-600)', marginTop: '0.2rem' }}>
              ${totalCost.toFixed(2)}
            </div>
          </div>

          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Fulfillment Progress
            </span>
            <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-main)', marginTop: '0.2rem' }}>
              {totalReceived} of {totalOrdered} units ({percentReceived}%)
            </div>
            <div
              style={{
                height: '6px',
                width: '100%',
                backgroundColor: 'var(--border-subtle)',
                borderRadius: '3px',
                overflow: 'hidden',
                marginTop: '0.35rem',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${percentReceived}%`,
                  backgroundColor: percentReceived === 100 ? 'var(--success-solid)' : 'var(--primary-600)',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Order Line Items Table */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '1rem' }}>
          Line Items ({order.items?.length || 0})
        </h3>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Product SKU</th>
                <th>Item Name</th>
                <th style={{ textAlign: 'right' }}>Ordered</th>
                <th style={{ textAlign: 'right' }}>Received</th>
                <th style={{ textAlign: 'right' }}>Remaining</th>
                <th style={{ textAlign: 'right' }}>Unit Cost</th>
                <th style={{ textAlign: 'right' }}>Line Total</th>
                <th style={{ textAlign: 'center' }}>Fulfillment</th>
              </tr>
            </thead>
            <tbody>
              {order.items?.map((item) => {
                const prod = productsMap[item.product_id] || {};
                const remaining = item.ordered_qty - item.received_qty;
                const isFulfilled = remaining === 0;

                return (
                  <tr key={item.id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                      {prod.sku || `PRD-${item.product_id}`}
                    </td>
                    <td style={{ fontWeight: 500, color: 'var(--text-main)' }}>
                      {prod.name || `Product #${item.product_id}`}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{item.ordered_qty}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--success-solid)' }}>
                      {item.received_qty}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: remaining > 0 ? 'var(--warning-solid)' : 'var(--text-muted)' }}>
                      {remaining}
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>
                      ${Number(item.unit_cost).toFixed(2)}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>
                      ${(item.ordered_qty * Number(item.unit_cost)).toFixed(2)}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {isFulfilled ? (
                        <Badge variant="success" dot>Complete</Badge>
                      ) : item.received_qty > 0 ? (
                        <Badge variant="warning">Partial</Badge>
                      ) : (
                        <Badge variant="neutral">Pending</Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Approve Dialog */}
      <ConfirmDialog
        isOpen={isApproveOpen}
        onClose={() => setIsApproveOpen(false)}
        onConfirm={handleApprove}
        title="Approve Purchase Order"
        message={`Approve PO-${order.id.toString().padStart(4, '0')} for ${supplier?.name}? This authorizes the procurement order.`}
        confirmText="Approve PO"
        variant="primary"
        loading={approving}
      />

      {/* Cancel Dialog */}
      <ConfirmDialog
        isOpen={isCancelOpen}
        onClose={() => setIsCancelOpen(false)}
        onConfirm={handleCancel}
        title="Cancel Purchase Order"
        message={`Are you sure you want to cancel PO-${order.id.toString().padStart(4, '0')}? This action cannot be reversed.`}
        confirmText="Cancel Order"
        variant="danger"
        loading={cancelling}
      />

      {/* Delete Dialog */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete Draft PO"
        message={`Are you sure you want to delete draft PO-${order.id.toString().padStart(4, '0')}?`}
        confirmText="Delete Draft"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
};

export default PurchaseOrderDetailPage;
