import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  CheckCircle2,
  Printer,
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { productsApi } from '../../api/products';
import { categoriesApi } from '../../api/categories';
import { salesApi } from '../../api/sales';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { ErrorAlert } from '../../components/common/ErrorAlert';
import { formatCurrency } from '../../utils/currency';

export const POSPage = () => {
  const { showSuccess, showError } = useToast();
  const { isOwner, isManager } = useAuth();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [productError, setProductError] = useState('');
  const [categoryError, setCategoryError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [search, setSearch] = useState('');
  const [loadingProducts, setLoadingProducts] = useState(true);

  // Cart: Array of { product: Product, quantity: number }
  const [cart, setCart] = useState([]);
  const [customBillNumber, setCustomBillNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [saleError, setSaleError] = useState('');

  // Receipt Modal
  const [completedSale, setCompletedSale] = useState(null);

  const loadProducts = useCallback(async () => {
    setLoadingProducts(true);
    setProductError('');
    try {
      const res = await productsApi.listProducts({
        per_page: 100,
        search: search.trim() || undefined,
        category_id: selectedCategory || undefined,
        sort_by: 'name',
        sort_order: 'asc',
      });
      setProducts(res.items || []);
    } catch (error) {
      setProductError(
        error.response?.data?.error || 'Unable to load products. Please try again.'
      );
    } finally {
      setLoadingProducts(false);
    }
  }, [search, selectedCategory]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const loadCategories = useCallback(async () => {
    if (!isOwner && !isManager) return;

    setCategoryError('');
    try {
      const res = await categoriesApi.listCategories({ per_page: 100 });
      setCategories(res.items || []);
    } catch (error) {
      setCategoryError(
        error.response?.data?.error || 'Unable to load categories. Product search is still available.'
      );
    }
  }, [isOwner, isManager]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const handleAddToCart = (product) => {
    setSaleError('');
    if (product.stock <= 0) {
      showError(`"${product.name}" is currently out of stock in the ledger.`);
      return;
    }

    setCart((prev) => {
      const existingIndex = prev.findIndex((item) => item.product.id === product.id);
      if (existingIndex >= 0) {
        const currentQty = prev[existingIndex].quantity;
        if (currentQty >= product.stock) {
          showError(`Cannot add more: only ${product.stock} units available in stock.`);
          return prev;
        }
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: currentQty + 1,
        };
        return updated;
      } else {
        return [...prev, { product, quantity: 1 }];
      }
    });
  };

  const handleUpdateQuantity = (productId, newQty) => {
    setSaleError('');
    if (newQty <= 0) {
      handleRemoveFromCart(productId);
      return;
    }

    const prod = products.find((p) => p.id === productId);
    if (prod && newQty > prod.stock) {
      showError(`Quantity exceeds current stock level (${prod.stock} units).`);
      return;
    }

    setCart((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, quantity: newQty } : item
      )
    );
  };

  const handleRemoveFromCart = (productId) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const handleClearCart = () => {
    setCart([]);
    setSaleError('');
  };

  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + item.quantity * Number(item.product.selling_price), 0);
  };

  const totalItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleSubmitSale = async () => {
    if (cart.length === 0) return;
    setSaleError('');

    const payload = {
      items: cart.map((item) => ({
        product_id: item.product.id,
        quantity: item.quantity,
      })),
    };

    if (customBillNumber.trim()) {
      payload.bill_number = customBillNumber.trim();
    }

    setSubmitting(true);
    try {
      const saleResult = await salesApi.createSale(payload);
      showSuccess(`Sale completed! Invoice #${saleResult.bill_number}`);
      setCompletedSale(saleResult);
      setCart([]);
      setCustomBillNumber('');

      // Refresh product stock balances
      await loadProducts();
    } catch (err) {
      if (err.response?.status === 409) {
        const errorData = err.response.data;
        const msg =
          errorData.error ||
          `Stock conflict: requested quantity is unavailable in the stock ledger.`;
        setSaleError(msg);
        showError(msg);
        // Refresh catalogue stock to show real balance
        loadProducts();
      } else {
        const msg =
          err.response?.data?.error ||
          err.response?.data?.message ||
          'Failed to record sale transaction.';
        setSaleError(msg);
        showError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-container" style={{ maxWidth: '1440px' }}>
      <div className="page-header" style={{ marginBottom: '0.5rem' }}>
        <div>
          <h1 className="page-title">Point of Sale (POS)</h1>
          <p className="page-subtitle">
            Fast retail checkout • Real-time stock validation against inventory ledger
          </p>
        </div>
      </div>

      {saleError && <ErrorAlert message={saleError} />}
      {productError && <ErrorAlert message={productError} onRetry={loadProducts} />}
      {categoryError && <ErrorAlert message={categoryError} onRetry={loadCategories} />}

      <div className="pos-container">
        {/* Left: Products Browser Panel */}
        <div className="pos-products-panel">
          {/* Search & Category Filter Bar */}
          <div className="filter-bar" style={{ padding: '0.65rem 1rem' }}>
            <div className="filter-group" style={{ flex: 1 }}>
              <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
                <Search
                  size={16}
                  style={{
                    position: 'absolute',
                    left: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-placeholder)',
                  }}
                />
                <input
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: '2.25rem' }}
                  placeholder="Search products by SKU or name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              {categories.length > 0 && (
                <select
                  className="form-select"
                  style={{ width: '170px' }}
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  <option value="">All Categories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Product Cards Grid */}
          <div className="pos-grid">
            {loadingProducts ? (
              <div style={{ gridColumn: '1 / -1', padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                Loading available products...
              </div>
            ) : products.length === 0 ? (
              <div style={{ gridColumn: '1 / -1', padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                No products found matching your search.
              </div>
            ) : (
              products.map((product) => {
                const outOfStock = product.stock <= 0;
                const inCart = cart.find((i) => i.product.id === product.id);

                return (
                  <div
                    key={product.id}
                    className={`pos-product-card ${outOfStock ? 'out-of-stock' : ''}`}
                    onClick={() => !outOfStock && handleAddToCart(product)}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.35rem' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                          {product.sku}
                        </span>
                        {outOfStock ? (
                          <Badge variant="danger" dot>Out</Badge>
                        ) : product.is_low_stock ? (
                          <Badge variant="warning" dot>{product.stock}</Badge>
                        ) : (
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--success-solid)' }}>
                            {product.stock} {product.unit}
                          </span>
                        )}
                      </div>
                      <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)', lineHeight: 1.3 }}>
                        {product.name}
                      </h4>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-light)' }}>
                      <span style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--primary-600)' }}>
                        {formatCurrency(product.selling_price)}
                      </span>
                      {inCart && (
                        <Badge variant="info">
                          In cart: {inCart.quantity}
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Cart & Checkout Panel */}
        <div className="pos-cart-panel">
          <div className="pos-cart-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShoppingCart size={18} style={{ color: 'var(--primary-600)' }} />
              <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Active Sale Bill</h3>
            </div>
            {cart.length > 0 && (
              <Button variant="ghost" size="sm" onClick={handleClearCart}>
                Clear
              </Button>
            )}
          </div>

          {/* Cart items list */}
          <div className="pos-cart-items">
            {cart.length === 0 ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  color: 'var(--text-muted)',
                  textAlign: 'center',
                  padding: '2rem',
                }}
              >
                <ShoppingCart size={36} style={{ opacity: 0.4, marginBottom: '0.75rem' }} />
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Cart is empty</div>
                <div style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
                  Click items from the product catalogue to add to this sale
                </div>
              </div>
            ) : (
              cart.map(({ product, quantity }) => {
                const subtotal = quantity * Number(product.selling_price);

                return (
                  <div key={product.id} className="pos-cart-item">
                    <div style={{ flex: 1, minWidth: 0, marginRight: '0.5rem' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.8125rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {product.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {formatCurrency(product.selling_price)} / {product.unit}
                      </div>
                      <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-main)', marginTop: '2px' }}>
                        {formatCurrency(subtotal)}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <button
                        type="button"
                        onClick={() => handleUpdateQuantity(product.id, quantity - 1)}
                        style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border-medium)',
                          background: '#fff',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Minus size={12} />
                      </button>

                      <input
                        type="number"
                        min="1"
                        max={product.stock}
                        value={quantity}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          if (!isNaN(val)) handleUpdateQuantity(product.id, val);
                        }}
                        style={{
                          width: '42px',
                          textAlign: 'center',
                          padding: '2px',
                          fontSize: '0.8125rem',
                          fontWeight: 600,
                          border: '1px solid var(--border-medium)',
                          borderRadius: 'var(--radius-sm)',
                        }}
                      />

                      <button
                        type="button"
                        onClick={() => handleUpdateQuantity(product.id, quantity + 1)}
                        disabled={quantity >= product.stock}
                        style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border-medium)',
                          background: '#fff',
                          cursor: quantity >= product.stock ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          opacity: quantity >= product.stock ? 0.4 : 1,
                        }}
                      >
                        <Plus size={12} />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRemoveFromCart(product.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--danger-solid)',
                          cursor: 'pointer',
                          padding: '4px',
                          marginLeft: '0.25rem',
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Cart Summary & Checkout */}
          <div className="pos-cart-summary">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8125rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                <span>Line Items</span>
                <span style={{ fontWeight: 600 }}>{cart.length}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                <span>Total Quantity</span>
                <span style={{ fontWeight: 600 }}>{totalItemsCount} units</span>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.75rem' }} htmlFor="bill-number">
                Invoice / Bill Number (Optional)
              </label>
              <input
                id="bill-number"
                type="text"
                className="form-input"
                style={{ fontSize: '0.8125rem', padding: '0.4rem 0.6rem' }}
                placeholder="Auto-generated if empty"
                value={customBillNumber}
                onChange={(e) => setCustomBillNumber(e.target.value)}
                maxLength={50}
              />
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                paddingTop: '0.5rem',
                borderTop: '1px solid var(--border-subtle)',
              }}
            >
              <span style={{ fontSize: '1rem', fontWeight: 600 }}>Bill Total</span>
              <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary-600)' }}>
                {formatCurrency(calculateTotal())}
              </span>
            </div>

            <Button
              variant="primary"
              size="lg"
              onClick={handleSubmitSale}
              disabled={cart.length === 0}
              loading={submitting}
              icon={CheckCircle2}
              style={{ width: '100%', marginTop: '0.25rem' }}
            >
              Complete Sale ({formatCurrency(calculateTotal())})
            </Button>
          </div>
        </div>
      </div>

      {/* Sale Receipt Confirmation Modal */}
      {completedSale && (
        <Modal
          isOpen={Boolean(completedSale)}
          onClose={() => setCompletedSale(null)}
          title="Sale Confirmed"
          subtitle="Transaction successfully registered and recorded into stock ledger"
          footer={
            <div style={{ display: 'flex', gap: '0.5rem', width: '100%', justifyContent: 'space-between' }}>
              <Button
                variant="secondary"
                onClick={() => window.print()}
                icon={Printer}
              >
                Print Receipt
              </Button>
              <Button
                variant="primary"
                onClick={() => setCompletedSale(null)}
              >
                Start New Sale
              </Button>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div
              style={{
                textAlign: 'center',
                padding: '1rem',
                backgroundColor: 'var(--success-bg)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--success-border)',
              }}
            >
              <CheckCircle2 size={36} style={{ color: 'var(--success-solid)', margin: '0 auto 0.5rem' }} />
              <div style={{ fontWeight: 700, fontSize: '1.25rem', color: 'var(--success-text)' }}>
                {formatCurrency(completedSale.total_amount)} Paid
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginTop: '0.25rem' }}>
                Invoice #{completedSale.bill_number}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                {new Date(completedSale.created_at).toLocaleString()}
              </div>
            </div>

            <div>
              <h4 style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                Purchased Items ({completedSale.items?.length || 0})
              </h4>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', textAlign: 'left' }}>
                    <th style={{ padding: '0.4rem 0' }}>Item</th>
                    <th style={{ padding: '0.4rem 0', textAlign: 'center' }}>Qty</th>
                    <th style={{ padding: '0.4rem 0', textAlign: 'right' }}>Price</th>
                    <th style={{ padding: '0.4rem 0', textAlign: 'right' }}>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {completedSale.items?.map((item) => {
                    const prod = products.find((p) => p.id === item.product_id) || {};
                    return (
                      <tr key={item.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                        <td style={{ padding: '0.5rem 0', fontWeight: 500 }}>
                          {prod.name || `Product #${item.product_id}`}
                        </td>
                        <td style={{ padding: '0.5rem 0', textAlign: 'center' }}>{item.quantity}</td>
                        <td style={{ padding: '0.5rem 0', textAlign: 'right', color: 'var(--text-secondary)' }}>
                          {formatCurrency(item.price_at_sale)}
                        </td>
                        <td style={{ padding: '0.5rem 0', textAlign: 'right', fontWeight: 600 }}>
                          {formatCurrency(item.subtotal)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default POSPage;
