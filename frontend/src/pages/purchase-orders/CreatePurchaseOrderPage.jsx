import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Truck,
  Package,
  Save,
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { purchaseOrdersApi } from '../../api/purchaseOrders';
import { suppliersApi } from '../../api/suppliers';
import { productsApi } from '../../api/products';
import { Button } from '../../components/common/Button';
import { ErrorAlert } from '../../components/common/ErrorAlert';
import { formatCurrency } from '../../utils/currency';

export const CreatePurchaseOrderPage = () => {
  const { showSuccess } = useToast();
  const navigate = useNavigate();

  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  const [supplierId, setSupplierId] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [items, setItems] = useState([
    { product_id: '', ordered_qty: 1, unit_cost: '' },
  ]);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoadingInitial(true);
      try {
        const [supRes, prodRes] = await Promise.all([
          suppliersApi.listSuppliers({ per_page: 100 }),
          productsApi.listProducts({ per_page: 100 }),
        ]);
        setSuppliers(supRes.items || []);
        setProducts(prodRes.items || []);
        if (supRes.items?.length > 0) {
          setSupplierId(supRes.items[0].id.toString());
        }
      } catch {
        setFormError('Failed to load suppliers or products list.');
      } finally {
        setLoadingInitial(false);
      }
    };
    fetchData();
  }, []);

  const handleAddItem = () => {
    setItems((prev) => [...prev, { product_id: '', ordered_qty: 1, unit_cost: '' }]);
  };

  const handleRemoveItem = (index) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index, field, value) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };

      if (field === 'product_id') {
        const selectedProd = products.find((p) => p.id === Number(value));
        if (selectedProd && selectedProd.cost_price !== undefined) {
          updated[index].unit_cost = selectedProd.cost_price;
        }
      }
      return updated;
    });
  };

  const calculateSubtotal = (item) => {
    const qty = Number(item.ordered_qty) || 0;
    const cost = Number(item.unit_cost) || 0;
    return qty * cost;
  };

  const totalCost = items.reduce((sum, item) => sum + calculateSubtotal(item), 0);
  const totalUnits = items.reduce((sum, item) => sum + (Number(item.ordered_qty) || 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!supplierId) {
      setFormError('Please select a supplier.');
      return;
    }

    if (items.length === 0) {
      setFormError('At least one item line is required.');
      return;
    }

    const seenProducts = new Set();
    const cleanItems = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.product_id) {
        setFormError(`Line #${i + 1}: Please select a product.`);
        return;
      }
      const prodId = Number(item.product_id);
      if (seenProducts.has(prodId)) {
        const dupProduct = products.find((p) => p.id === prodId);
        setFormError(
          `Product "${dupProduct ? dupProduct.name : prodId}" appears more than once. Please combine quantities onto a single line.`
        );
        return;
      }
      seenProducts.add(prodId);

      const qty = Number(item.ordered_qty);
      if (isNaN(qty) || qty <= 0 || !Number.isInteger(qty)) {
        setFormError(`Line #${i + 1}: Ordered quantity must be a positive whole number.`);
        return;
      }

      const cost = Number(item.unit_cost);
      if (isNaN(cost) || cost < 0) {
        setFormError(`Line #${i + 1}: Unit cost must be a non-negative number.`);
        return;
      }

      cleanItems.push({
        product_id: prodId,
        ordered_qty: qty,
        unit_cost: cost,
      });
    }

    const payload = {
      supplier_id: Number(supplierId),
      expected_date: expectedDate ? expectedDate : null,
      items: cleanItems,
      status: 'draft',
    };

    setSubmitting(true);
    try {
      const createdOrder = await purchaseOrdersApi.createPurchaseOrder(payload);
      showSuccess(`Purchase Order PO-${createdOrder.id.toString().padStart(4, '0')} drafted.`);
      navigate(`/purchase-orders/${createdOrder.id}`);
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Failed to create purchase order. Verify that supplier and products are valid.';
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-container" style={{ maxWidth: '1000px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
        <Button variant="ghost" size="sm" onClick={() => navigate('/purchase-orders')} icon={ArrowLeft}>
          Back to Orders
        </Button>
      </div>

      <div className="page-header">
        <div>
          <h1 className="page-title">Create Purchase Order</h1>
          <p className="page-subtitle">
            Draft an official procurement order for vendor replenishment
          </p>
        </div>
      </div>

      {formError && <ErrorAlert message={formError} />}

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1.5rem', alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="card" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Truck size={18} style={{ color: 'var(--primary-600)' }} /> Order Specifications
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" htmlFor="supplier-select">
                    Wholesale Supplier *
                  </label>
                  <select
                    id="supplier-select"
                    className="form-select"
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    disabled={loadingInitial}
                    required
                  >
                    <option value="" disabled>
                      Select Supplier
                    </option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} {s.payment_terms ? `(${s.payment_terms})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" htmlFor="expected-date">
                    Expected Delivery Date (Optional)
                  </label>
                  <input
                    id="expected-date"
                    type="date"
                    className="form-input"
                    value={expectedDate}
                    onChange={(e) => setExpectedDate(e.target.value)}
                    min={new Date().toISOString().slice(0, 10)}
                  />
                </div>
              </div>
            </div>

            <div className="card" style={{ padding: '1.5rem' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '1rem',
                }}
              >
                <h3 style={{ fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Package size={18} style={{ color: 'var(--primary-600)' }} /> Order Line Items
                </h3>
                <Button variant="secondary" size="sm" onClick={handleAddItem} icon={Plus}>
                  Add Line Item
                </Button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {items.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '2fr 100px 120px 110px 36px',
                      gap: '0.75rem',
                      alignItems: 'center',
                      padding: '0.75rem',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: '#fafbfc',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <div>
                      <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>
                        Product Item #{idx + 1} *
                      </label>
                      <select
                        className="form-select"
                        value={item.product_id}
                        onChange={(e) => handleItemChange(idx, 'product_id', e.target.value)}
                        required
                      >
                        <option value="" disabled>
                          Select Product
                        </option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.sku} — {p.name} (Stock: {p.stock} {p.unit})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>
                        Qty *
                      </label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        className="form-input"
                        value={item.ordered_qty}
                        onChange={(e) => handleItemChange(idx, 'ordered_qty', e.target.value)}
                        required
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>
                        Unit Cost (₹) *
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="form-input"
                        placeholder="0.00"
                        value={item.unit_cost}
                        onChange={(e) => handleItemChange(idx, 'unit_cost', e.target.value)}
                        required
                      />
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>
                        Subtotal
                      </span>
                      <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>
                        {formatCurrency(calculateSubtotal(item))}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        disabled={items.length <= 1}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: items.length <= 1 ? 'var(--text-placeholder)' : 'var(--danger-solid)',
                          cursor: items.length <= 1 ? 'not-allowed' : 'pointer',
                          padding: '4px',
                        }}
                        title="Remove line"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Order Summary</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                <span>Line Items</span>
                <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{items.length}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                <span>Total Units</span>
                <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{totalUnits}</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  paddingTop: '0.75rem',
                  borderTop: '1px solid var(--border-subtle)',
                  fontSize: '1.1rem',
                  fontWeight: 700,
                  color: 'var(--text-main)',
                }}
              >
                <span>Estimated Cost</span>
                <span style={{ color: 'var(--primary-600)' }}>{formatCurrency(totalCost)}</span>
              </div>
            </div>

            <div
              style={{
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                backgroundColor: 'var(--bg-muted)',
                padding: '0.75rem',
                borderRadius: 'var(--radius-md)',
                lineHeight: 1.4,
              }}
            >
              * New orders are submitted in <strong>Draft</strong> status. An authorized <strong>Owner</strong> must review and approve the purchase order before receiving goods into inventory.
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={submitting}
              icon={Save}
              style={{ width: '100%' }}
            >
              Save as Draft PO
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CreatePurchaseOrderPage;
