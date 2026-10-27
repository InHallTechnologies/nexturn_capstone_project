
# Retail Inventory data model

This ER diagram reflects the SQLAlchemy models in `backend/src/backend/models`.
Products, suppliers, purchase orders, sales, and inventory events are stored as
relational records. Stock on hand is derived by summing
`stock_movements.quantity` per product; there is no editable
quantity-on-hand field.

```mermaid
erDiagram
    USERS {
        int id PK
        string name
        string email UK
        string password
        string role
        datetime created_at
    }
    TOKEN_BLOCKLIST {
        string jti PK
        string token_type
        datetime expires_at
    }
    CATEGORIES {
        int id PK
        string name UK
        string description
        datetime created_at
        datetime updated_at
    }
    PRODUCTS {
        int id PK
        string sku UK
        string name
        int category_id FK
        string unit
        decimal cost_price
        decimal selling_price
        int reorder_level
        datetime created_at
        datetime updated_at
    }
    SUPPLIERS {
        int id PK
        string name
        string contact
        string email
        string address
        string payment_terms
        datetime created_at
        datetime updated_at
    }
    PURCHASE_ORDERS {
        int id PK
        int supplier_id FK
        int created_by FK
        string status
        date expected_date
        datetime created_at
        datetime updated_at
    }
    PURCHASE_ORDER_ITEMS {
        int id PK
        int purchase_order_id FK
        int product_id FK
        int ordered_qty
        int received_qty
        decimal unit_cost
    }
    SALES {
        int id PK
        string bill_number UK
        int created_by FK
        decimal total_amount
        datetime created_at
    }
    SALE_ITEMS {
        int id PK
        int sale_id FK
        int product_id FK
        int quantity
        decimal price_at_sale
        decimal subtotal
    }
    STOCK_MOVEMENTS {
        int id PK
        int product_id FK
        int created_by FK
        int quantity
        string reason
        string notes
        int reference_id
        datetime created_at
    }

    CATEGORIES ||--o{ PRODUCTS : categorizes
    SUPPLIERS ||--o{ PURCHASE_ORDERS : receives
    USERS ||--o{ PURCHASE_ORDERS : creates
    PURCHASE_ORDERS ||--|{ PURCHASE_ORDER_ITEMS : contains
    PRODUCTS ||--o{ PURCHASE_ORDER_ITEMS : ordered_as
    USERS ||--o{ SALES : records
    SALES ||--|{ SALE_ITEMS : contains
    PRODUCTS ||--o{ SALE_ITEMS : sold_as
    PRODUCTS ||--o{ STOCK_MOVEMENTS : changes_stock
    USERS ||--o{ STOCK_MOVEMENTS : records
```

`STOCK_MOVEMENTS.reference_id` is a polymorphic reference to the originating
purchase order or sale; it intentionally has no single foreign-key constraint.
Opening stock and manual adjustments may not have a parent transaction
reference. Token blocklist rows are keyed by JWT ID, record token type and
expiry, and support access/refresh token revocation.

## Relationships and operational rules

- Each product belongs to a category and can have many purchase-order lines,
  sale lines, and stock movements.
- Each purchase order belongs to a supplier and creator and contains one or
  more purchase-order items. Item rows store ordered quantity, received
  quantity, and unit cost.
- Each sale belongs to its creator and contains one or more sale items.
  Sale-item rows retain the price and subtotal captured at the time of sale.
- Users create purchase orders, sales, and stock movements. API permissions
  further limit which roles can access these records.
- `stock_movements.quantity` is signed: purchases and returns are positive,
  sales are negative, and adjustments can be positive or negative.
- Database checks prohibit zero movements, invalid movement reasons, and
  purchase/sale/return quantities with the wrong sign.
- Purchase-order status is constrained to `draft`, `approved`,
  `partially_received`, `received`, or `cancelled`.
- Product SKU, category name, user email, and sale bill number are unique.

## Stock calculation

For each product:

```text
on_hand = SUM(stock_movements.quantity)
```

Sale and receipt API operations write their parent transaction details and
corresponding stock movements together. This movement ledger is the source for
stock displays, reorder checks, valuation, and ledger-balance reporting.
