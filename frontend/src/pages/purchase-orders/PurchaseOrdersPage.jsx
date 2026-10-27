import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus,
  Eye,
  CheckCircle,
  XCircle,
  PackageCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { purchaseOrdersApi } from '../../api/purchaseOrders';
import { suppliersApi } from '../../api/suppliers';
import { DataTable } from '../../components/common/DataTable';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { ErrorAlert } from '../../components/common/ErrorAlert';
import { formatCurrency } from '../../utils/currency';
import { prefetchRouteData } from '../../api/prefetch';

export const PurchaseOrdersPage = () => {
  const { isOwner, canCreatePurchaseOrder, role } = useAuth();
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState({});
  const [pagination, setPagination] = useState({ page: 1, per_page: 15, total: 0, pages: 1 });
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [approvingOrder, setApprovingOrder] = useState(null);
  const [approving, setApproving] = useState(false);

  const [cancellingOrder, setCancellingOrder] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        const res = await suppliersApi.listSuppliers({ per_page: 100 });
        const map = {};
        (res.items || []).forEach((s) => {
          map[s.id] = s.name;
        });
        setSuppliers(map);
      } catch (error) {
        showError(error.response?.data?.error || 'Failed to load suppliers.');
      }
    };
    fetchSuppliers();
  }, [showError]);

  const loadOrders = useCallback(
    async (page = 1) => {
      setLoading(true);
      setError('');
      try {
        const params = {
          page,
          per_page: pagination.per_page,
          status: statusFilter || undefined,
          sort_by: 'created_at',
          sort_order: 'desc',
        };
        const res = await purchaseOrdersApi.listPurchaseOrders(params);
        setOrders(res.items || []);
        setPagination(res.pagination || { page: 1, per_page: 15, total: 0, pages: 1 });
      } catch {
        setError('Failed to load purchase orders.');
      } finally {
        setLoading(false);
      }
    },
    [statusFilter, pagination.per_page]
  );

  useEffect(() => {
    loadOrders(1);
  }, [loadOrders]);

  const handleApprove = async () => {
    if (!approvingOrder) return;
    setApproving(true);
    try {
      await purchaseOrdersApi.approvePurchaseOrder(approvingOrder.id);
      showSuccess(`Purchase Order PO-${approvingOrder.id.toString().padStart(4, '0')} approved.`);
      setApprovingOrder(null);
      loadOrders(pagination.page);
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to approve purchase order.';
      showError(msg);
      setApprovingOrder(null);
    } finally {
      setApproving(false);
    }
  };

  const handleCancel = async () => {
    if (!cancellingOrder) return;
    setCancelling(true);
    try {
      await purchaseOrdersApi.cancelPurchaseOrder(cancellingOrder.id);
      showSuccess(`Purchase Order PO-${cancellingOrder.id.toString().padStart(4, '0')} cancelled.`);
      setCancellingOrder(null);
      loadOrders(pagination.page);
    } catch (err) {
      const msg = err.response?.data?.error || 'Cannot cancel this purchase order.';
      showError(msg);
      setCancellingOrder(null);
    } finally {
      setCancelling(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return <Badge variant="info">Approved</Badge>;
      case 'partially_received':
        return <Badge variant="warning">Partially Received</Badge>;
      case 'received':
        return <Badge variant="success">Received</Badge>;
      case 'cancelled':
        return <Badge variant="danger">Cancelled</Badge>;
      default:
        return <Badge variant="neutral">Draft</Badge>;
    }
  };

  const calculateTotalCost = (items = []) => {
    return items.reduce((sum, item) => sum + Number(item.ordered_qty || 0) * Number(item.unit_cost || 0), 0);
  };

  const columns = [
    {
      header: 'PO Number',
      key: 'id',
      width: '130px',
      render: (order) => (
        <Link
          to={`/purchase-orders/${order.id}`}
          style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--primary-600)' }}
        >
          PO-{order.id.toString().padStart(4, '0')}
        </Link>
      ),
    },
    {
      header: 'Supplier',
      key: 'supplier_id',
      render: (order) => (
        <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>
          {suppliers[order.supplier_id] || `Supplier #${order.supplier_id}`}
        </span>
      ),
    },
    {
      header: 'Status',
      key: 'status',
      width: '150px',
      render: (order) => getStatusBadge(order.status),
    },
    {
      header: 'Expected Delivery',
      key: 'expected_date',
      render: (order) => (
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
          {order.expected_date ? order.expected_date.slice(0, 10) : '—'}
        </span>
      ),
    },
    {
      header: 'Lines',
      key: 'items',
      align: 'right',
      render: (order) => (
        <span style={{ fontWeight: 600 }}>{order.items?.length || 0} items</span>
      ),
    },
    {
      header: 'Est. Total',
      key: 'total',
      align: 'right',
      render: (order) => (
        <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>
          {formatCurrency(calculateTotalCost(order.items))}
        </span>
      ),
    },
    {
      header: 'Actions',
      key: 'actions',
      align: 'right',
      width: '170px',
      render: (order) => (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.35rem' }}>
          <button
            onClick={() => navigate(`/purchase-orders/${order.id}`)}
            onMouseEnter={() => prefetchRouteData(`/purchase-orders/${order.id}`, role)}
            onFocus={() => prefetchRouteData(`/purchase-orders/${order.id}`, role)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '4px',
            }}
            title="View order details"
          >
            <Eye size={16} />
          </button>

          {order.status === 'draft' && isOwner && (
            <button
              onClick={() => setApprovingOrder(order)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--primary-600)',
                cursor: 'pointer',
                padding: '4px',
              }}
              title="Approve purchase order"
            >
              <CheckCircle size={16} />
            </button>
          )}

          {(order.status === 'approved' || order.status === 'partially_received') && (
            <button
              onClick={() => navigate(`/receive-goods?po_id=${order.id}`)}
              onMouseEnter={() => prefetchRouteData(`/receive-goods?po_id=${order.id}`, role)}
              onFocus={() => prefetchRouteData(`/receive-goods?po_id=${order.id}`, role)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--success-solid)',
                cursor: 'pointer',
                padding: '4px',
              }}
              title="Receive goods"
            >
              <PackageCheck size={16} />
            </button>
          )}

          {(order.status === 'draft' || order.status === 'approved') && (
            <button
              onClick={() => setCancellingOrder(order)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--danger-solid)',
                cursor: 'pointer',
                padding: '4px',
              }}
              title="Cancel purchase order"
            >
              <XCircle size={16} />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Purchase Orders</h1>
          <p className="page-subtitle">
            Manage procurement requests, wholesale supplier replenishment, and approval workflows
          </p>
        </div>
        {canCreatePurchaseOrder && (
          <div className="page-actions">
            <Button
              variant="primary"
              onClick={() => navigate('/purchase-orders/new')}
              icon={Plus}
            >
              Create Purchase Order
            </Button>
          </div>
        )}
      </div>

      {error && <ErrorAlert message={error} onRetry={() => loadOrders(1)} />}

      <div className="filter-bar">
        <div className="filter-group">
          <select
            className="form-select"
            style={{ width: '190px' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="approved">Approved</option>
            <option value="partially_received">Partially Received</option>
            <option value="received">Received</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
          Total Orders: <strong>{pagination.total}</strong>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={orders}
        loading={loading}
        pagination={pagination}
        onPageChange={(page) => loadOrders(page)}
        emptyMessage="No purchase orders found"
        emptyDescription="Create a purchase order to request inventory replenishment from a vendor."
        emptyActionText={canCreatePurchaseOrder ? 'Create First PO' : undefined}
        onEmptyAction={() => navigate('/purchase-orders/new')}
      />

      <ConfirmDialog
        isOpen={Boolean(approvingOrder)}
        onClose={() => setApprovingOrder(null)}
        onConfirm={handleApprove}
        title="Approve Purchase Order"
        message={`Are you sure you want to approve PO-${approvingOrder?.id.toString().padStart(4, '0')}? Once approved, the vendor order is authorized and warehouse staff can receive inbound goods.`}
        confirmText="Approve Order"
        variant="primary"
        loading={approving}
      />

      <ConfirmDialog
        isOpen={Boolean(cancellingOrder)}
        onClose={() => setCancellingOrder(null)}
        onConfirm={handleCancel}
        title="Cancel Purchase Order"
        message={`Are you sure you want to cancel PO-${cancellingOrder?.id.toString().padStart(4, '0')}? Cancelled orders cannot be reopened or received.`}
        confirmText="Cancel Order"
        variant="danger"
        loading={cancelling}
      />
    </div>
  );
};

export default PurchaseOrdersPage;
