import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { categoriesApi } from '../../api/categories';
import { DataTable } from '../../components/common/DataTable';
import { Button } from '../../components/common/Button';
import { SearchInput } from '../../components/common/SearchInput';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { ErrorAlert } from '../../components/common/ErrorAlert';

export const CategoriesPage = () => {
  const { canManageCategories } = useAuth();
  const { showSuccess, showError } = useToast();

  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, per_page: 15, total: 0, pages: 1 });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Delete Dialog
  const [deletingCategory, setDeletingCategory] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadCategories = useCallback(
    async (page = 1) => {
      setLoading(true);
      setError('');
      try {
        const res = await categoriesApi.listCategories({
          page,
          per_page: pagination.per_page,
          search: search.trim() || undefined,
          sort_by: 'name',
          sort_order: 'asc',
        });
        setCategories(res.items || []);
        setPagination(res.pagination || { page: 1, per_page: 15, total: 0, pages: 1 });
      } catch {
        setError('Failed to load product categories.');
      } finally {
        setLoading(false);
      }
    },
    [search, pagination.per_page]
  );

  useEffect(() => {
    loadCategories(1);
  }, [loadCategories]);

  const handleOpenCreate = () => {
    setEditingCategory(null);
    setFormData({ name: '', description: '' });
    setFormError('');
    setIsFormOpen(true);
  };

  const handleOpenEdit = (category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
    });
    setFormError('');
    setIsFormOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError('Category name is required.');
      return;
    }

    setSubmitting(true);
    setFormError('');
    try {
      if (editingCategory) {
        await categoriesApi.updateCategory(editingCategory.id, {
          name: formData.name.trim(),
          description: formData.description.trim(),
        });
        showSuccess(`Category "${formData.name.trim()}" updated.`);
      } else {
        await categoriesApi.createCategory({
          name: formData.name.trim(),
          description: formData.description.trim(),
        });
        showSuccess(`Category "${formData.name.trim()}" created.`);
      }
      setIsFormOpen(false);
      loadCategories(pagination.page);
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        'A category with this name already exists.';
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingCategory) return;
    setDeleting(true);
    try {
      await categoriesApi.deleteCategory(deletingCategory.id);
      showSuccess(`Category "${deletingCategory.name}" deleted.`);
      setDeletingCategory(null);
      loadCategories(pagination.page);
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Category is linked to products and cannot be deleted.';
      showError(msg);
      setDeletingCategory(null);
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    {
      header: 'Category Name',
      key: 'name',
      sortable: true,
      render: (cat) => <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{cat.name}</span>,
    },
    {
      header: 'Description',
      key: 'description',
      render: (cat) => (
        <span style={{ color: 'var(--text-secondary)' }}>
          {cat.description || <em style={{ color: 'var(--text-muted)' }}>No description</em>}
        </span>
      ),
    },
    {
      header: 'Created At',
      key: 'created_at',
      width: '140px',
      render: (cat) => (
        <span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
          {new Date(cat.created_at).toLocaleDateString()}
        </span>
      ),
    },
    {
      header: 'Actions',
      key: 'actions',
      align: 'right',
      width: '100px',
      render: (cat) => (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.35rem' }}>
          <button
            onClick={() => handleOpenEdit(cat)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '4px',
            }}
            title="Edit category"
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={() => setDeletingCategory(cat)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--danger-solid)',
              cursor: 'pointer',
              padding: '4px',
            }}
            title="Delete category"
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
          <h1 className="page-title">Categories</h1>
          <p className="page-subtitle">
            Organize inventory products into hierarchical classification groups
          </p>
        </div>
        {canManageCategories && (
          <div className="page-actions">
            <Button variant="primary" onClick={handleOpenCreate} icon={Plus}>
              New Category
            </Button>
          </div>
        )}
      </div>

      {error && <ErrorAlert message={error} onRetry={() => loadCategories(1)} />}

      <div className="filter-bar">
        <SearchInput
          placeholder="Search categories..."
          value={search}
          onChange={(val) => setSearch(val)}
          style={{ width: '300px' }}
        />
        <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
          Total: <strong>{pagination.total}</strong> categories
        </div>
      </div>

      <DataTable
        columns={columns}
        data={categories}
        loading={loading}
        pagination={pagination}
        onPageChange={(page) => loadCategories(page)}
        emptyMessage="No categories found"
        emptyDescription="Create your first product category to organize your retail inventory."
        emptyActionText="Create Category"
        onEmptyAction={handleOpenCreate}
      />

      {/* Form Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingCategory ? 'Edit Category' : 'Create Category'}
        subtitle="Categories group products for reporting and POS navigation"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsFormOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSubmit} loading={submitting}>
              {editingCategory ? 'Save Changes' : 'Create Category'}
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
            <label className="form-label" htmlFor="cat-name">
              Category Name *
            </label>
            <input
              id="cat-name"
              type="text"
              className="form-input"
              placeholder="e.g. Peripherals &amp; Accessories"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              maxLength={100}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="cat-desc">
              Description (Optional)
            </label>
            <textarea
              id="cat-desc"
              className="form-textarea"
              rows={3}
              placeholder="Brief details about what items belong to this category..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              maxLength={500}
            />
          </div>
        </form>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={Boolean(deletingCategory)}
        onClose={() => setDeletingCategory(null)}
        onConfirm={handleDelete}
        title="Delete Category"
        message={`Are you sure you want to delete category "${deletingCategory?.name}"? If products are currently assigned to this category, the deletion will be rejected.`}
        confirmText="Delete Category"
        loading={deleting}
      />
    </div>
  );
};

export default CategoriesPage;
