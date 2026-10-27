# Retail Inventory

A full-stack retail inventory and purchase-order application built with React,
Flask, SQLAlchemy, PostgreSQL, and JWT authentication. It covers product and
supplier management, purchasing and receiving, point-of-sale, stock movement
tracking, and operational reports.

Inventory on hand is calculated from signed stock movements rather than stored
as an editable product quantity. Monetary values are presented in Indian rupees
(INR), with Indian digit grouping.

## Features and roles

| Role | Capabilities |
| --- | --- |
| Owner | Full access; approve purchase orders; view inventory valuation, ledger balance, and sales-by-day reports |
| Manager | Manage catalog and suppliers; create/manage purchase orders; receive goods; view low-stock report |
| Staff | Browse products and stock; create sales and view sales created by their account |

Public registration always creates a Staff account. React protects role-specific
pages, and the Flask API independently enforces authentication and permissions.
Sales that would make stock negative and receipts exceeding ordered quantities
are rejected.

## Architecture

```text
Browser :8080
    │
    ▼
Nginx web container
    ├── Serves the production React/Vite build
    └── Proxies /api/* to the Flask API container
                              │
                              ▼
                      SQLAlchemy / DATABASE_URL
                              │
                              ▼
                    PostgreSQL database
```

Docker Compose currently defines the `web` and `api` services. PostgreSQL is
not defined in `docker-compose.yml`; provide a PostgreSQL database reachable
from the API container through `DATABASE_URL`. The database must be available
before the API startup command can create tables and seed data.

## Run with Docker Compose

Requirements: Docker Engine with the Compose plugin and a reachable PostgreSQL
database.

1. Copy `backend/.env.example` to `backend/.env`.
2. Set `DATABASE_URL` to the PostgreSQL connection string accessible from the
   API container. Do not use `localhost` for a database running outside the API
   container; use a hostname or address reachable from the container.
3. Replace the placeholder `SECRET_KEY` with a unique random value of at least
   32 bytes. Set unique initial passwords for Owner, Manager, and Staff.
4. From the repository root, build and start the application:

   ```powershell
   docker compose --env-file backend/.env up --build
   ```

5. Open the frontend at <http://localhost:8080>. The API is exposed at
   <http://localhost:8000>.

The API container creates database tables, runs the idempotent user and demo
inventory seeds, then starts Gunicorn. The frontend image builds the Vite
application and serves it with Nginx. Nginx serves client-side routes from
`index.html` and forwards `/api/` requests to the `api` service.

Stop the containers with `docker compose down`. The Compose file does not
define a PostgreSQL service or database volume, so database persistence and
backup are managed by the PostgreSQL deployment configured in `DATABASE_URL`.
Keep secrets and passwords out of source control.

## Local development

### Backend

Requirements: Python 3.11 or later, `uv`, and a reachable PostgreSQL database.

```powershell
cd backend
uv sync
Copy-Item .env.example .env
uv run python -m backend.create_tables
uv run python -m backend.seed
uv run python -m backend.main
```

Configure `DATABASE_URL`, `SECRET_KEY`, and the three initial seed passwords
in `.env` before running the database commands.

Run backend tests with:

```powershell
uv run --group dev pytest
```

### Frontend

Requirements: Node.js and npm.

```powershell
cd frontend
npm ci
npm run dev
npm run lint
npm run build
```

The Vite development server proxies `/api` to `http://127.0.0.1:8000`. The
production Nginx configuration proxies the same API paths to the Compose
`api` service.

## API routes

All API routes are under `/api`.

| Resource | Routes | Access |
| --- | --- | --- |
| Authentication | `POST /auth/register`, `/login`, `/refresh`, `/logout`; `GET /auth/me` | Registration/login/refresh are public; other operations require the appropriate token |
| Products | `GET /products`, `/products/<id>`; `POST`, `PUT`, `DELETE /products/<id>` | All roles can read; Owner/Manager can write |
| Categories | CRUD `/categories` | Owner/Manager |
| Suppliers | CRUD `/suppliers`; `GET /suppliers/<id>/purchase-orders` | Owner/Manager |
| Purchase orders | CRUD `/purchase-orders`; `POST /purchase-orders/<id>/receive`, `/cancel` | Owner/Manager |
| Purchase-order approval | `POST /purchase-orders/<id>/approve` | Owner |
| Sales | `GET`, `POST /sales`; `GET /sales/<id>` | All roles; non-Owners can access only their own sales |
| Stock movements | `GET /stock-movements`; `POST /stock-movements/adjustments` | Owner/Manager |
| Reports | `GET /reports/low-stock` | Owner/Manager |
| Owner reports | `GET /reports/valuation`, `/ledger-balance`, `/sales-by-day` | Owner |

List and report endpoints support pagination; supported routes also accept
sorting and filters. Request schemas validate incoming data, and the frontend
uses a shared Axios client that handles access-token refresh and rotation.

## Seed accounts and sample data

The seed script creates `owner@example.com`, `manager@example.com`, and
`staff@example.com`, plus sample categories, suppliers, products, purchase
orders, sales, and stock movements. Set passwords with
`OWNER_INITIAL_PASSWORD`, `MANAGER_INITIAL_PASSWORD`, and
`STAFF_INITIAL_PASSWORD` in `backend/.env`. Passwords are intentionally not
committed. Existing seed accounts are not overwritten.

## Project documentation and API walkthrough

- [Backend setup and API details](./backend/README.md)
- [Frontend setup](./frontend/README.md)
- [Data model](./docs/data-model.md)
- [Postman collection](./postman/Retail-Inventory.postman_collection.json)

Set the Postman `baseUrl`, `email`, and `password` variables locally. Use an
account with the role required for the route being tested.
