import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Plus,
  Edit2,
  Trash2,
  AlertTriangle,
  Eye,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { productsApi } from '../../api/products';
import { categoriesApi } from '../../api/categories';
import { DataTable } from '../../components/common/DataTable';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { SearchInput } from '../../components/common/SearchInput';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { ErrorAlert } from '../../components/common/ErrorAlert';

export const ProductsPage = () => {
  const { user, canManageProducts } = useAuth();
  const { showSuccess, showError } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, per_page: 15, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters & Sorting
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category_id') || '');
  const [lowStockOnly, setLowStockOnly] = useState(searchParams.get('low_stock') === 'true');
  const [sortField, setSortField] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');

  // Modals
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    category_id: '',
    unit: 'pcs',
    cost_price: '',
    selling_price: '',
    reorder_level: '10',
  });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Detail Modal
  const [viewingProduct, setViewingProduct] = useState(null);

  // Delete Confirm Dialog
  const [deletingProduct, setDeletingProduct] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Load categories for dropdown (if user has permission, else categories is empty)
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const res = await categoriesApi.listCategories({ per_page: 100 });
        setCategories(res.items || []);
      } catch {
        // Staff role may not have permission to list categories; ignore gracefully
      }
    };
    if (canManageProducts) {
      loadCategories();
    }
  }, [canManageProducts]);

  const loadProducts = useCallback(
    async (page = 1) => {
      setLoading(true);
      setError('');
      try {
        const params = {
          page,
          per_page: pagination.per_page,
          search: search.trim() || undefined,
          category_id: selectedCategory || undefined,
          low_stock: lowStockOnly ? 'true' : undefined,
          sort_by: sortField,
          sort_order: sortOrder,
        };
        const res = await productsApi.listProducts(params);
        setProducts(res.items || []);
        setPagination(res.pagination || { page: 1, per_page: 15, total: 0, pages: 1 });
      } catch {
        setError('Failed to load products. Please check connection or reload.');
      } finally {
        setLoading(false);
      }
    },
    [search, selectedCategory, lowStockOnly, sortField, sortOrder, pagination.per_page]
  );

  useEffect(() => {
    loadProducts(1);
  }, [loadProducts]);

  const handleOpenCreate = () => {
    setEditingProduct(null);
    setFormData({
      sku: '',
      name: '',
      category_id: categories.length > 0 ? categories[0].id : '',
      unit: 'pcs',
      cost_price: '',
      selling_price: '',
      reorder_level: '10',
    });
    setFormError('');
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      sku: product.sku,
      name: product.name,
      category_id: product.category_id,
      unit: product.unit,
      cost_price: product.cost_price !== undefined ? product.cost_price : '',
      selling_price: product.selling_price,
      reorder_level: product.reorder_level.toString(),
    });
    setFormError('');
    setIsFormModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.sku.trim() || !formData.name.trim() || !formData.category_id) {
      setFormError('SKU, Product Name, and Category are required.');
      return;
    }

    if (isNaN(Number(formData.selling_price)) || Number(formData.selling_price) < 0) {
      setFormError('Selling price must be a valid non-negative number.');
      return;
    }

    if (
      formData.cost_price !== '' &&
      (isNaN(Number(formData.cost_price)) || Number(formData.cost_price) < 0)
    ) {
      setFormError('Cost price must be a valid non-negative number.');
      return;
    }

    const payload = {
      sku: formData.sku.trim().toUpperCase(),
      name: formData.name.trim(),
      category_id: Number(formData.category_id),
      unit: formData.unit.trim() || 'pcs',
      cost_price: Number(formData.cost_price || 0),
      selling_price: Number(formData.selling_price),
      reorder_level: Number(formData.reorder_level || 0),
    };

    setSubmitting(true);
    try {
      if (editingProduct) {
        await productsApi.updateProduct(editingProduct.id, payload);
        showSuccess(`Product "${payload.name}" updated successfully.`);
      } else {
        await productsApi.createProduct(payload);
        showSuccess(`Product "${payload.name}" added to catalogue.`);
      }
      setIsFormModalOpen(false);
      loadProducts(pagination.page);
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Operation failed. SKU may already be in use.';
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!deletingProduct) return;
    setDeleting(true);
    try {
      await productsApi.deleteProduct(deletingProduct.id);
      showSuccess(`Product "${deletingProduct.name}" deleted successfully.`);
      setDeletingProduct(null);
      loadProducts(pagination.page);
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Cannot delete product because it has transaction history in the stock ledger.';
      showError(msg);
      setDeletingProduct(null);
    } finally {
      setDeleting(false);
    }
  };

  const getCategoryName = (categoryId) => {
    const cat = categories.find((c) => c.id === categoryId);
    return cat ? cat.name : `Category #${categoryId}`;
  };

  const columns = [
    {
      header: 'SKU',
      key: 'sku',
      sortable: true,
      width: '130px',
      render: (p) => (
        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-main)' }}>
          {p.sku}
        </span>
      ),
    },
    {
      header: 'Product Name',
      key: 'name',
      sortable: true,
      render: (p) => (
        <div>
          <span
            onClick={() => setViewingProduct(p)}
            style={{ fontWeight: 600, color: 'var(--primary-600)', cursor: 'pointer' }}
          >
            {p.name}
          </span>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {getCategoryName(p.category_id)}
          </div>
        </div>
      ),
    },
    {
      header: 'Unit',
      key: 'unit',
      width: '80px',
      render: (p) => <span style={{ color: 'var(--text-secondary)' }}>{p.unit}</span>,
    },
    {
      header: 'Stock Level',
      key: 'stock',
      sortable: true,
      align: 'right',
      render: (p) => {
        const isLow = p.is_low_stock;
        return (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            <span
              style={{
                fontWeight: 700,
                fontSize: '0.925rem',
                color: isLow ? 'var(--danger-solid)' : 'var(--text-main)',
              }}
            >
              {p.stock}
            </span>
            {isLow ? (
              <Badge variant="warning" icon={AlertTriangle}>
                Low
              </Badge>
            ) : (
              <Badge variant="success" dot>
                OK
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      header: 'Reorder Level',
      key: 'reorder_level',
      sortable: true,
      align: 'right',
      render: (p) => <span style={{ color: 'var(--text-muted)' }}>{p.reorder_level}</span>,
    },
    ...(user?.role !== 'Staff'
      ? [
          {
            header: 'Cost Price',
            key: 'cost_price',
            sortable: true,
            align: 'right',
            render: (p) => (
              <span style={{ color: 'var(--text-secondary)' }}>
                ${Number(p.cost_price || 0).toFixed(2)}
              </span>
            ),
          },
        ]
      : []),
    {
      header: 'Selling Price',
      key: 'selling_price',
      sortable: true,
      align: 'right',
      render: (p) => (
        <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>
          ${Number(p.selling_price).toFixed(2)}
        </span>
      ),
    },
    {
      header: 'Actions',
      key: 'actions',
      align: 'right',
      width: '120px',
      render: (p) => (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.35rem' }}>
          <button
            onClick={() => setViewingProduct(p)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '4px',
            }}
            title="View details"
          >
            <Eye size={16} />
          </button>
          {canManageProducts && (
            <>
              <button
                onClick={() => handleOpenEdit(p)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '4px',
                }}
                title="Edit product"
              >
                <Edit2 size={16} />
              </button>
              <button
                onClick={() => setDeletingProduct(p)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--danger-solid)',
                  cursor: 'pointer',
                  padding: '4px',
                }}
                title="Delete product"
              >
                <Trash2 size={16} />
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Product Catalogue</h1>
          <p className="page-subtitle">
            Manage product specifications, pricing, and stock levels derived from the ledger
          </p>
        </div>
        {canManageProducts && (
          <div className="page-actions">
            <Button variant="primary" onClick={handleOpenCreate} icon={Plus}>
              Add Product
            </Button>
          </div>
        )}
      </div>

      {error && <ErrorAlert message={error} onRetry={() => loadProducts(1)} />}

      {/* Filter and Search Bar */}
      <div className="filter-bar">
        <div className="filter-group">
          <SearchInput
            placeholder="Search by SKU or product name..."
            value={search}
            onChange={(val) => {
              setSearch(val);
              setSearchParams((prev) => {
                if (val) prev.set('search', val);
                else prev.delete('search');
                return prev;
              });
            }}
            style={{ width: '280px' }}
          />

          {categories.length > 0 && (
            <select
              className="form-select"
              style={{ width: '180px' }}
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setSearchParams((prev) => {
                  if (e.target.value) prev.set('category_id', e.target.value);
                  else prev.delete('category_id');
                  return prev;
                });
              }}
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          )}

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.8125rem',
              fontWeight: 500,
              cursor: 'pointer',
              userSelect: 'none',
              padding: '0.5rem 0.75rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-medium)',
              backgroundColor: lowStockOnly ? 'var(--warning-bg)' : 'transparent',
              borderColor: lowStockOnly ? 'var(--warning-border)' : 'var(--border-medium)',
            }}
          >
            <input
              type="checkbox"
              checked={lowStockOnly}
              onChange={(e) => {
                setLowStockOnly(e.target.checked);
                setSearchParams((prev) => {
                  if (e.target.checked) prev.set('low_stock', 'true');
                  else prev.delete('low_stock');
                  return prev;
                });
              }}
              style={{ accentColor: 'var(--warning-solid)' }}
            />
            <span>Low Stock Alerts</span>
          </label>
        </div>

        <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
          Total Catalogue: <strong>{pagination.total}</strong> products
        </div>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={products}
        loading={loading}
        sortField={sortField}
        sortOrder={sortOrder}
        onSort={(field, order) => {
          setSortField(field);
          setSortOrder(order);
        }}
        pagination={pagination}
        onPageChange={(page) => loadProducts(page)}
        emptyMessage="No products match your criteria"
        emptyDescription="Try adjusting your search query, clearing filters, or adding a new product."
        emptyActionText={canManageProducts ? 'Add First Product' : undefined}
        onEmptyAction={canManageProducts ? handleOpenCreate : undefined}
      />

      {/* Create / Edit Product Modal */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        title={editingProduct ? 'Edit Product' : 'Add New Product'}
        subtitle={
          editingProduct
            ? `Update attributes for SKU ${editingProduct.sku}`
            : 'Enter SKU, product details, unit of measure, and pricing'
        }
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setIsFormModalOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button variant="primary" onClick={handleFormSubmit} loading={submitting}>
              {editingProduct ? 'Save Changes' : 'Create Product'}
            </Button>
          </>
        }
      >
        {formError && (
          <div style={{ marginBottom: '1rem' }}>
            <ErrorAlert message={formError} />
          </div>
        )}
        <form onSubmit={handleFormSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="prod-sku">
                SKU Code *
              </label>
              <input
                id="prod-sku"
                type="text"
                className="form-input"
                placeholder="e.g. ELEC-KB-001"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                maxLength={50}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="prod-category">
                Category *
              </label>
              <select
                id="prod-category"
                className="form-select"
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                required
              >
                <option value="" disabled>
                  Select Category
                </option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="prod-name">
              Product Name *
            </label>
            <input
              id="prod-name"
              type="text"
              className="form-input"
              placeholder="e.g. Wireless Mechanical Keyboard"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              maxLength={150}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="prod-unit">
                Unit of Measure *
              </label>
              <input
                id="prod-unit"
                type="text"
                className="form-input"
                placeholder="e.g. pcs, box, kg"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                maxLength={30}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="prod-reorder">
                Reorder Threshold Level
              </label>
              <input
                id="prod-reorder"
                type="number"
                min="0"
                step="1"
                className="form-input"
                placeholder="10"
                value={formData.reorder_level}
                onChange={(e) => setFormData({ ...formData, reorder_level: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="prod-cost">
                Cost Price ($) *
              </label>
              <input
                id="prod-cost"
                type="number"
                min="0"
                step="0.01"
                className="form-input"
                placeholder="0.00"
                value={formData.cost_price}
                onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="prod-selling">
                Selling Price ($) *
              </label>
              <input
                id="prod-selling"
                type="number"
                min="0"
                step="0.01"
                className="form-input"
                placeholder="0.00"
                value={formData.selling_price}
                onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
                required
              />
            </div>
          </div>

          <div
            style={{
              padding: '0.65rem 0.85rem',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--bg-muted)',
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              marginTop: '0.25rem',
            }}
          >
            * Note: Stock quantities cannot be directly keyed in. They are governed exclusively by goods receipts and sales recorded in the stock ledger.
          </div>
        </form>
      </Modal>

      {/* Product Detail Modal */}
      {viewingProduct && (
        <Modal
          isOpen={Boolean(viewingProduct)}
          onClose={() => setViewingProduct(null)}
          title={viewingProduct.name}
          subtitle={`SKU: ${viewingProduct.sku}`}
          footer={
            <Button variant="secondary" onClick={() => setViewingProduct(null)}>
              Close
            </Button>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={{ padding: '1rem', backgroundColor: 'var(--bg-muted)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Current Stock
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: viewingProduct.is_low_stock ? 'var(--danger-solid)' : 'var(--text-main)', marginTop: '0.25rem' }}>
                  {viewingProduct.stock} <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{viewingProduct.unit}</span>
                </div>
                <div style={{ fontSize: '0.75rem', marginTop: '0.35rem' }}>
                  Reorder threshold: <strong>{viewingProduct.reorder_level}</strong>
                </div>
              </div>

              <div style={{ padding: '1rem', backgroundColor: 'var(--bg-muted)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Selling Price
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary-600)', marginTop: '0.25rem' }}>
                  ${Number(viewingProduct.selling_price).toFixed(2)}
                </div>
                {viewingProduct.cost_price !== undefined && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
                    Cost Price: <strong>${Number(viewingProduct.cost_price).toFixed(2)}</strong> (Margin: ${(Number(viewingProduct.selling_price) - Number(viewingProduct.cost_price)).toFixed(2)})
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8125rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border-light)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Category</span>
                <span style={{ fontWeight: 600 }}>{getCategoryName(viewingProduct.category_id)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border-light)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Status</span>
                <span>
                  {viewingProduct.is_low_stock ? (
                    <Badge variant="warning" icon={AlertTriangle}>Low Stock</Badge>
                  ) : (
                    <Badge variant="success" dot>Normal Stock</Badge>
                  )}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border-light)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Date Registered</span>
                <span>{new Date(viewingProduct.created_at).toLocaleDateString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0' }}>
                <span style={{ color: 'var(--text-muted)' }}>Last Updated</span>
                <span>{new Date(viewingProduct.updated_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deletingProduct)}
        onClose={() => setDeletingProduct(null)}
        onConfirm={handleDeleteProduct}
        title="Delete Product"
        message={`Are you sure you want to delete "${deletingProduct?.name}" (SKU: ${deletingProduct?.sku})? Products with recorded sales, purchases, or adjustments cannot be deleted.`}
        confirmText="Delete Product"
        loading={deleting}
      />
    </div>
  );
};

export default ProductsPage;
