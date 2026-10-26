
# Retail Inventory data model

This ER diagram reflects the SQLAlchemy models in `backend/src/backend/models`.
Stock on hand is derived by summing `stock_movements.quantity` per product;
there is no editable quantity-on-hand field.

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
Token blocklist rows are keyed by JWT ID and expire with the token.
