# Retail Inventory API

Flask API using SQLAlchemy and PostgreSQL. Routes are registered from
`src/backend/main.py` and use the `/api` prefix.
Product prices, purchase costs, sales amounts, and valuation reports use Indian
rupees (INR).

## Setup

Use Python 3.11 or later and `uv`. Copy `.env.example` to `.env`, replace all
placeholders, and set `DATABASE_URL` to the PostgreSQL connection string used by
your environment. `SECRET_KEY` must be a unique random value of at least 32
bytes. Set the three `*_INITIAL_PASSWORD` variables before creating the initial
Owner, Manager, and Staff seed accounts.

```powershell
uv sync
uv run python -m backend.create_tables
uv run python -m backend.seed
uv run python -m backend.main
```

New passwords are bcrypt hashes; existing Werkzeug hashes remain verifiable so
previously created accounts can continue to log in. Registration always
assigns the Staff role. The seed script creates the three role accounts and, only when the inventory
tables are empty, a small idempotent demo catalog with opening stock movements.

## API and authorization

| Resource | Methods and routes | Access |
| --- | --- | --- |
| Authentication | `POST /api/auth/register`, `/login`, `/refresh`, `/logout`; `GET /api/auth/me` | Public auth routes; current-user requires access token |
| Products | `GET /api/products`, `/api/products/<id>`; `POST`, `PUT`, `DELETE` | All roles read; Owner/Manager write |
| Categories | CRUD `/api/categories` | Owner/Manager |
| Suppliers | CRUD `/api/suppliers`; `GET /api/suppliers/<id>/purchase-orders` | Owner/Manager |
| Purchase orders | CRUD `/api/purchase-orders`; `POST /<id>/receive`, `/<id>/cancel` | Owner/Manager |
| Purchase approval | `POST /api/purchase-orders/<id>/approve` | Owner |
| Sales | `GET`, `POST /api/sales`; `GET /api/sales/<id>` | All roles; non-Owners are limited to their own sales |
| Stock movements | `GET /api/stock-movements`; `POST /api/stock-movements/adjustments` | Owner/Manager |
| Reports | `GET /api/reports/low-stock` | Owner/Manager |
| Owner reports | `GET /api/reports/valuation`, `/ledger-balance`, `/sales-by-day` | Owner |

## Tests

```powershell
uv run --group dev pytest
```
