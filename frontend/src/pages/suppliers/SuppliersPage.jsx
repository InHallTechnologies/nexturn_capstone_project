import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, Eye, Mail, Phone, MapPin, CreditCard, History } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { suppliersApi } from '../../api/suppliers';
import { DataTable } from '../../components/common/DataTable';
import { Button } from '../../components/common/Button';
import { SearchInput } from '../../components/common/SearchInput';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { Badge } from '../../components/common/Badge';
import { ErrorAlert } from '../../components/common/ErrorAlert';

export const SuppliersPage = () => {
  const { canManageSuppliers } = useAuth();
  const { showSuccess, showError } = useToast();

  const [suppliers, setSuppliers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, per_page: 15, total: 0, pages: 1 });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    email: '',
    address: '',
    payment_terms: '',
  });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [viewingSupplier, setViewingSupplier] = useState(null);
  const [purchaseHistory, setPurchaseHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [deletingSupplier, setDeletingSupplier] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadSuppliers = useCallback(
    async (page = 1) => {
      setLoading(true);
      setError('');
      try {
        const res = await suppliersApi.listSuppliers({
          page,
          per_page: pagination.per_page,
          search: search.trim() || undefined,
          sort_by: 'name',
          sort_order: 'asc',
        });
        setSuppliers(res.items || []);
        setPagination(res.pagination || { page: 1, per_page: 15, total: 0, pages: 1 });
      } catch {
        setError('Failed to load supplier directory.');
      } finally {
        setLoading(false);
      }
    },
    [search, pagination.per_page]
  );

  useEffect(() => {
    loadSuppliers(1);
  }, [loadSuppliers]);

  const handleOpenCreate = () => {
    setEditingSupplier(null);
    setFormData({ name: '', contact: '', email: '', address: '', payment_terms: 'Net 30' });
    setFormError('');
    setIsFormOpen(true);
  };

  const handleOpenEdit = (sup) => {
    setEditingSupplier(sup);
    setFormData({
      name: sup.name,
      contact: sup.contact || '',
      email: sup.email || '',
      address: sup.address || '',
      payment_terms: sup.payment_terms || '',
    });
    setFormError('');
    setIsFormOpen(true);
  };

  const handleOpenDetail = async (sup) => {
    setViewingSupplier(sup);
    setHistoryLoading(true);
    try {
      const historyRes = await suppliersApi.getSupplierPurchaseOrders(sup.id, { per_page: 20 });
      setPurchaseHistory(historyRes.items || []);
    } catch {
      setPurchaseHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError('Supplier name is required.');
      return;
    }

    setSubmitting(true);
    setFormError('');
    try {
      const payload = {
        name: formData.name.trim(),
        contact: formData.contact.trim(),
        email: formData.email.trim(),
        address: formData.address.trim(),
        payment_terms: formData.payment_terms.trim(),
      };

      if (editingSupplier) {
        await suppliersApi.updateSupplier(editingSupplier.id, payload);
        showSuccess(`Supplier "${payload.name}" updated successfully.`);
      } else {
        await suppliersApi.createSupplier(payload);
        showSuccess(`Supplier "${payload.name}" added to directory.`);
      }
      setIsFormOpen(false);
      loadSuppliers(pagination.page);
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Failed to save supplier details.';
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingSupplier) return;
    setDeleting(true);
    try {
      await suppliersApi.deleteSupplier(deletingSupplier.id);
      showSuccess(`Supplier "${deletingSupplier.name}" removed.`);
      setDeletingSupplier(null);
      loadSuppliers(pagination.page);
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Supplier has purchase history and cannot be deleted.';
      showError(msg);
      setDeletingSupplier(null);
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    {
      header: 'Supplier Name',
      key: 'name',
      sortable: true,
      render: (sup) => (
        <div>
          <span
            onClick={() => handleOpenDetail(sup)}
            style={{ fontWeight: 600, color: 'var(--primary-600)', cursor: 'pointer' }}
          >
            {sup.name}
          </span>
          {sup.address && (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <MapPin size={12} /> {sup.address}
            </div>
          )}
        </div>
      ),
    },
    {
      header: 'Contact Info',
      key: 'contact',
      render: (sup) => (
        <div style={{ fontSize: '0.8125rem' }}>
          {sup.email && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-main)' }}>
              <Mail size={13} style={{ color: 'var(--text-muted)' }} /> {sup.email}
            </div>
          )}
          {sup.contact && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)' }}>
              <Phone size={13} style={{ color: 'var(--text-muted)' }} /> {sup.contact}
            </div>
          )}
          {!sup.email && !sup.contact && <span style={{ color: 'var(--text-muted)' }}>—</span>}
        </div>
      ),
    },
    {
      header: 'Payment Terms',
      key: 'payment_terms',
      render: (sup) =>
        sup.payment_terms ? (
          <Badge variant="neutral" icon={CreditCard}>
            {sup.payment_terms}
          </Badge>
        ) : (
          <span style={{ color: 'var(--text-muted)' }}>Standard</span>
        ),
    },
    {
      header: 'Created',
      key: 'created_at',
      width: '130px',
      render: (sup) => (
        <span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
          {new Date(sup.created_at).toLocaleDateString()}
        </span>
      ),
    },
    {
      header: 'Actions',
      key: 'actions',
      align: 'right',
      width: '120px',
      render: (sup) => (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.35rem' }}>
          <button
            onClick={() => handleOpenDetail(sup)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '4px',
            }}
            title="View purchase history"
          >
            <Eye size={16} />
          </button>
          <button
            onClick={() => handleOpenEdit(sup)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '4px',
            }}
            title="Edit supplier"
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={() => setDeletingSupplier(sup)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--danger-solid)',
              cursor: 'pointer',
              padding: '4px',
            }}
            title="Delete supplier"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Supplier Directory</h1>
          <p className="page-subtitle">
            Manage vendor profiles, purchase order channels, and credit payment terms
          </p>
        </div>
        {canManageSuppliers && (
          <div className="page-actions">
            <Button variant="primary" onClick={handleOpenCreate} icon={Plus}>
              New Supplier
            </Button>
          </div>
        )}
      </div>

      {error && <ErrorAlert message={error} onRetry={() => loadSuppliers(1)} />}

      <div className="filter-bar">
        <SearchInput
          placeholder="Search suppliers by name..."
          value={search}
          onChange={(val) => setSearch(val)}
          style={{ width: '300px' }}
        />
        <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
          Total Suppliers: <strong>{pagination.total}</strong>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={suppliers}
        loading={loading}
        pagination={pagination}
        onPageChange={(page) => loadSuppliers(page)}
        emptyMessage="No suppliers registered"
        emptyDescription="Add wholesale vendors to initiate purchase orders and receiving."
        emptyActionText="Add Supplier"
        onEmptyAction={handleOpenCreate}
      />

      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingSupplier ? 'Edit Supplier' : 'Register New Supplier'}
        subtitle="Vendor profile and billing arrangement specifications"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsFormOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSubmit} loading={submitting}>
              {editingSupplier ? 'Save Changes' : 'Register Supplier'}
            </Button>
          </>
        }
      >
        {formError && (
          <div style={{ marginBottom: '1rem' }}>
            <ErrorAlert message={formError} />
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="sup-name">
              Company / Supplier Name *
            </label>
            <input
              id="sup-name"
              type="text"
              className="form-input"
              placeholder="e.g. Apex Global Distributors Ltd."
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              maxLength={150}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="sup-contact">
                Contact Phone
              </label>
              <input
                id="sup-contact"
                type="text"
                className="form-input"
                placeholder="+1 (555) 019-2834"
                value={formData.contact}
                onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                maxLength={30}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="sup-email">
                Email Address
              </label>
              <input
                id="sup-email"
                type="email"
                className="form-input"
                placeholder="orders@apexsupply.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                maxLength={255}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="sup-terms">
              Payment Terms
            </label>
            <input
              id="sup-terms"
              type="text"
              className="form-input"
              placeholder="e.g. Net 30, Cash On Delivery, 2/10 Net 30"
              value={formData.payment_terms}
              onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
              maxLength={100}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="sup-address">
              Physical / Billing Address
            </label>
            <textarea
              id="sup-address"
              className="form-textarea"
              rows={3}
              placeholder="Full warehouse address, city, state, postal code..."
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              maxLength={500}
            />
          </div>
        </form>
      </Modal>

      {viewingSupplier && (
        <Modal
          isOpen={Boolean(viewingSupplier)}
          onClose={() => setViewingSupplier(null)}
          title={viewingSupplier.name}
          subtitle="Vendor Profile &amp; Purchase Order History"
          size="lg"
          footer={
            <Button variant="secondary" onClick={() => setViewingSupplier(null)}>
              Close
            </Button>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '0.75rem',
                backgroundColor: 'var(--bg-muted)',
                padding: '1rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.8125rem',
              }}
            >
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Email:</span>
                <div style={{ fontWeight: 600 }}>{viewingSupplier.email || '—'}</div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Phone:</span>
                <div style={{ fontWeight: 600 }}>{viewingSupplier.contact || '—'}</div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Terms:</span>
                <div style={{ fontWeight: 600 }}>{viewingSupplier.payment_terms || 'Standard'}</div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Address:</span>
                <div style={{ fontWeight: 600 }}>{viewingSupplier.address || '—'}</div>
              </div>
            </div>

            <div>
              <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <History size={16} /> Purchase History with Supplier
              </h4>
              {historyLoading ? (
                <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Loading purchase orders...
                </div>
              ) : purchaseHistory.length === 0 ? (
                <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                  No purchase orders have been placed with this supplier yet.
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', textAlign: 'left' }}>
                      <th style={{ padding: '0.5rem' }}>PO #</th>
                      <th style={{ padding: '0.5rem' }}>Status</th>
                      <th style={{ padding: '0.5rem' }}>Date Placed</th>
                      <th style={{ padding: '0.5rem' }}>Expected Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchaseHistory.map((po) => (
                      <tr key={po.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                        <td style={{ padding: '0.5rem', fontWeight: 600, color: 'var(--primary-600)' }}>
                          PO-{po.id.toString().padStart(4, '0')}
                        </td>
                        <td style={{ padding: '0.5rem' }}>
                          <Badge variant={po.status === 'received' ? 'success' : po.status === 'approved' ? 'info' : 'neutral'}>
                            {po.status}
                          </Badge>
                        </td>
                        <td style={{ padding: '0.5rem', color: 'var(--text-secondary)' }}>
                          {new Date(po.created_at).toLocaleDateString()}
                        </td>
                        <td style={{ padding: '0.5rem', color: 'var(--text-secondary)' }}>
                          {po.expected_date ? po.expected_date.slice(0, 10) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </Modal>
      )}

      <ConfirmDialog
        isOpen={Boolean(deletingSupplier)}
        onClose={() => setDeletingSupplier(null)}
        onConfirm={handleDelete}
        title="Delete Supplier"
        message={`Are you sure you want to delete supplier "${deletingSupplier?.name}"? If there are purchase orders referencing this supplier, deletion will be rejected.`}
        confirmText="Delete Supplier"
        loading={deleting}
      />
    </div>
  );
};

export default SuppliersPage;
