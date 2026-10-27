# Retail Inventory API

Flask API for authentication, product and supplier management, purchase orders,
receiving, sales, stock movements, and reports. Routes are registered in
`src/backend/main.py` and use the `/api` prefix. SQLAlchemy provides database
access; PostgreSQL is configured with `DATABASE_URL`.

## Requirements and configuration

- Python 3.11 or later
- `uv`
- PostgreSQL reachable from the backend process

Copy `.env.example` to `.env`. Configure `DATABASE_URL`, a unique
`SECRET_KEY` of at least 32 bytes, and unique values for
`OWNER_INITIAL_PASSWORD`, `MANAGER_INITIAL_PASSWORD`, and
`STAFF_INITIAL_PASSWORD`.

## Local setup

From the `backend` directory:

```powershell
uv sync
Copy-Item .env.example .env
uv run python -m backend.create_tables
uv run python -m backend.seed
uv run python -m backend.main
```

Run the API test suite with:

```powershell
uv run --group dev pytest
```

The seed command creates the three role accounts and sample catalog,
suppliers, purchase orders, sales, and inventory movements. Seeding is
idempotent: existing accounts and records are not overwritten. New seed
account passwords are required from environment variables and are stored as
password hashes. Public registration always assigns the Staff role.

## API and authorization

All paths below are relative to `/api`.

| Resource | Methods and routes | Access |
| --- | --- | --- |
| Authentication | `POST /auth/register`, `/login`, `/refresh`, `/logout`; `GET /auth/me` | Registration/login/refresh are public; current-user and logout require an access token |
| Products | `GET /products`, `/products/<id>`; `POST /products`; `PUT`, `DELETE /products/<id>` | All roles can read; Owner/Manager can write |
| Categories | CRUD `/categories` | Owner/Manager |
| Suppliers | CRUD `/suppliers`; `GET /suppliers/<id>/purchase-orders` | Owner/Manager |
| Purchase orders | CRUD `/purchase-orders`; `POST /purchase-orders/<id>/receive`, `/cancel` | Owner/Manager |
| Purchase-order approval | `POST /purchase-orders/<id>/approve` | Owner |
| Sales | `GET`, `POST /sales`; `GET /sales/<id>` | All roles; non-Owners can access only sales they created |
| Stock movements | `GET /stock-movements`; `POST /stock-movements/adjustments` | Owner/Manager |
| Reports | `GET /reports/low-stock` | Owner/Manager |
| Owner reports | `GET /reports/valuation`, `/ledger-balance`, `/sales-by-day` | Owner |

List and report endpoints support pagination; where implemented, sorting and
filtering are also available. Invalid inputs return client errors, missing
records return not-found responses, and disallowed role or workflow actions
are rejected.

## Business rules

- Stock is calculated by summing signed `StockMovement` quantities per product.
- Sales reject requests that exceed stock and store the sale, sale items, and
  stock deductions together.
- Purchase orders begin as drafts; only Owners can approve them. Receiving
  can be partial but cannot exceed the remaining ordered quantities.
- Adjustments require a reason and cannot make stock negative.
- Passwords are hashed. JWT access and refresh tokens are rotated/revoked
  through the authentication endpoints and token blocklist.
- Product and transaction prices are represented as decimal values and
  presented as INR.

See the [root README](../README.md) for Docker Compose deployment and the
[data model](../docs/data-model.md) for entity relationships.
