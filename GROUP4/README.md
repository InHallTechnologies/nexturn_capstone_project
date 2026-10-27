# GROUP 4 — Retail Inventory & Purchase Order System

**Stack:** Flask · React (Vite) · PostgreSQL + SQLAlchemy · JWT · Docker Compose  
**Team size:** 3  |  **Duration:** 8 days

## Team Members

| # | Name | GitHub username |
| --- | --- | --- |
| 1 | Mudavath Tharun |  |
| 2 | Kuldeep Choudhary |  |
| 3 | Shubham Shekhawat |  |

## Project Description

A small retail store tracks stock, raises purchase orders to suppliers, receives goods (sometimes partially), and records sales - with a stock figure that nobody can edit by hand.

## Roles

| Role | Responsibility |
| --- | --- |
| Owner | Full access, approves purchase orders, sees valuation and reports. |
| Manager | Manages products and suppliers, raises and receives purchase orders. |
| Staff | Records sales and views stock levels only. |

## Data Model

- **User** - credentials, role.
- **Category**, **Product** - SKU, name, category, unit, cost price, selling price, reorder level.
- **Supplier** - name, contact, address, payment terms.
- **PurchaseOrder** + **POLineItem** - supplier, status (draft / approved / partially received / received / cancelled), expected date, ordered qty, received qty.
- **StockMovement** - product, signed quantity, reason (purchase / sale / adjustment / return), reference id, created_by, created_at.
- **Sale** + **SaleItem** - bill number, items, quantities, price at sale, total.

## Features

- Product catalogue with SKU search, category filter and reorder-level highlighting.
- Supplier CRUD with purchase history per supplier.
- Raise a purchase order, approve it, then receive goods - full or partial receipts allowed.
- Sales entry screen that validates stock before saving the bill.
- Reports: low stock, stock valuation at cost, movement history per product, sales by day.
- Manual stock adjustment with a mandatory reason, recorded as a movement.

## Core Technical Challenge

**Stock is a ledger, not a column.** Current stock for a product is derived by summing signed `StockMovement` rows; there is no editable `quantity_in_hand` field anywhere. Every receipt, sale, return and adjustment writes a movement row inside the same transaction as its parent document. A sale that would drive stock below zero is rejected with 409. Receiving more than the ordered quantity is rejected. Prove the ledger balances with a report that recomputes stock from movements.

## React Screens

- Product table with search, category filter and low-stock badges.
- Purchase order wizard: pick supplier, add line items, submit, approve.
- Receive goods screen showing ordered versus already received per line.
- POS-style sale entry with running bill total.
- Dashboard: low stock list, valuation, sales trend.

## Authentication Specification

- Passwords hashed with bcrypt - plain text passwords must never touch the database.
- Endpoints: `POST /auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`, `GET /auth/me`.
- The access token carries a `role` claim; the API's `@role_required(...)` decorator guards privileged routes on top of JWT authentication.
- Refresh rotation: a refresh call issues a new access token; logout adds the token JTI to a blocklist so it cannot be reused.
- React side: Axios request interceptor attaches the token, response interceptor catches 401, calls refresh once, retries the original request, and logs the user out if refresh also fails.
- Route protection in React by role - a seeker must never be able to open an admin screen, even by typing the URL.

## Docker Specification

- `backend/Dockerfile` - Python slim base, requirements installed first for layer caching, served by `gunicorn` (not the Flask dev server).
- `frontend/Dockerfile` - multi-stage: Node stage runs `npm run build`, nginx stage serves the static build and proxies `/api` to the backend.
- `docker-compose.yml` - services `api`, `web`, `db` on one network, a named volume for database data, a healthcheck on `db`, and `depends_on` so the API waits for it.
- All secrets (DB URL, JWT secret key) come from `.env`; `.env.example` is committed, `.env` is not.
- Acceptance test: on a clean machine, `git clone` then `docker compose up --build` gives a working app with seeded demo data.

## Execution Plan

### Phase 1 - Day 1: Foundation

- Finalise the data model and draw the ER diagram / collection diagram before writing code.
- Repo and folder structure: `backend/`, `frontend/`, `docker-compose.yml`, `README.md`.
- Docker skeleton up early - database container running and reachable from the API container on day one.
- User model + full JWT auth flow + role seeding. Do not move on until login and refresh work in Postman.

### Phase 2 - Day 2 to 3: Core API

- Every core CRUD endpoint with request validation and clear error responses (400 / 401 / 403 / 404 / 409).
- Role guards on every write route; ownership checks so a user can only touch their own records.
- Pagination, filtering and sorting on all list endpoints - never return the whole table.
- Test every endpoint in Postman and save the collection before you write a single React component.

### Phase 3 - Day 3 to 5: React Application

- Routing, auth context, protected route wrapper, login and register screens.
- List, detail and create/edit screens for the main entities with client-side form validation.
- Loading, empty and error states on every screen - no blank page while data is fetching.
- Shared Axios instance; no API URL hardcoded in components.

### Phase 4 - Day 5 to 6: Core Business Logic

- Implement the core rule described above - this is what separates this project from a CRUD demo.
- Dashboard and aggregation endpoints computed in the database layer, not in JavaScript.
- Search and filters wired end to end.

### Phase 5 - Day 6 to 8: Harden and Ship

- Full dockerization verified from a clean clone; fix anything that only worked on your laptop.
- Seed script that creates demo users for each role plus realistic sample data.
- README: architecture overview, setup steps, environment variables, API endpoint table, demo credentials.
- Postman collection, bug fixing pass, and a 5-minute demo recording walking through each role.

## Suggested Work Split

| Owner | Suggested responsibility |
| --- | --- |
| Mudavath Tharun | React application, role-aware navigation, feature screens, shared UI, and API integration. |
| Kuldeep Choudhary | Authentication, role enforcement, catalog/supplier APIs, core data setup, and database models/schemas. |
| Shubham Shekhawat | Purchase-order and receiving workflows, sales, stock movements, reports, API verification, and Postman walkthrough. |

---

## Contribution Log — draft allocation

> This is a proposed, file-specific split based on the project modules and the available Git history. Confirm or adjust it with all three members before submission: the current history identifies commits from Kuldeep Choudhary and TharunRajM (Mudavath Tharun), but does not identify a Shubham Shekhawat author entry. The split below is not proof of individual authorship.

| Member | Modules / features in the proposed split | Files or folders |
| --- | --- | --- |
| Mudavath Tharun | React application, role-aware navigation, dashboard and feature screens, shared UI, API-client integration, and authentication context | `frontend/src/App.jsx`; `frontend/src/pages/`; `frontend/src/components/`; `frontend/src/api/`; `frontend/src/context/`; `frontend/src/utils/`; `frontend/src/App.css`; `frontend/src/index.css`; `frontend/src/main.jsx` |
| Kuldeep Choudhary | Flask authentication/JWT and role middleware; product, category, and supplier APIs; shared database setup, core models, and validation schemas | `backend/src/backend/routes/auth.py`; `backend/src/backend/routes/products.py`; `backend/src/backend/routes/categories.py`; `backend/src/backend/routes/suppliers.py`; `backend/src/backend/routes/common.py`; `backend/src/backend/models/`; `backend/src/backend/schemas/`; `backend/src/backend/utils/`; `backend/src/backend/database.py`; `backend/src/backend/main.py`; `backend/src/backend/seed.py` |
| Shubham Shekhawat | Purchase-order approval/receiving, sales, stock movements, reports, and API workflow verification | `backend/src/backend/routes/purchase_orders.py`; `backend/src/backend/routes/sales.py`; `backend/src/backend/routes/stock_movements.py`; `backend/src/backend/routes/reports.py`; `backend/src/backend/schemas/purchase_order.py`; `backend/src/backend/schemas/sales.py`; `backend/src/backend/schemas/stock_movement.py`; `backend/tests/test_api.py`; `backend/tests/test_schemas.py`; `postman/Retail-Inventory.postman_collection.json` |

### Individual contribution summaries

- **Mudavath Tharun:** proposed focus — frontend screens, shared React components, role-aware routes, and connection to backend APIs.
- **Kuldeep Choudhary:** proposed focus — backend authentication and permissions, catalog/supplier APIs, shared models/schemas, and database setup.
- **Shubham Shekhawat:** proposed focus — purchase, receiving, sales, stock-movement and reporting workflows, plus API workflow tests and the Postman collection.

### Shared / pair work

- Frontend-to-backend integration: align React API calls and role-aware screens with the Flask `/api` endpoints.
- Docker delivery walkthrough: validate `backend/Dockerfile`, `frontend/Dockerfile`, `docker-compose.yml`, `frontend/nginx.conf`, API startup/seeding, environment setup, and PostgreSQL connectivity.
- Final acceptance check: walk through order approval, partial receiving, stock movements, POS sale, and reports; confirm the contribution split with the team.

### Declaration

By signing below, each member confirms that the contribution split has been checked and accurately reflects their actual work; revise the proposed allocation before signing if needed.

| Member | Signature / date |
| --- | --- |
| Mudavath Tharun |  |
| Kuldeep Choudhary |  |
| Shubham Shekhawat |  |

---

## Deliverables Checklist

- [ ] GitHub repository containing both applications with a readable commit history from every member (the current history does not identify commits from Shubham Shekhawat).
- [ ] README.md with setup instructions, environment variables and an API endpoint table.
- [ ] ER diagram in [`docs/data-model.md`](../docs/data-model.md).
- [ ] Seed script creates sample inventory and Owner/Manager/Staff accounts; role emails and environment-configured password variables are documented in Setup.
- [ ] Postman collection covering implemented endpoints in [`postman/Retail-Inventory.postman_collection.json`](../postman/Retail-Inventory.postman_collection.json).
- [ ] Working `docker compose up --build` verified on a clean machine (Compose configuration validates, but the current Compose file defines only `api` and `web`; PostgreSQL must also be available through `DATABASE_URL`).
- [ ] 5-minute demo video (no recording is currently present in the repository).

## Evaluation

| Area | Weight | What is checked |
| --- | --- | --- |
| Functionality | 30% | All listed features work end to end without manual database edits |
| API design & JWT | 20% | Correct status codes, validation, role guards, refresh and blocklist working |
| Core business logic | 20% | The project-specific core rule is correctly and safely implemented |
| React frontend | 15% | Component structure, state handling, validation, loading and error states |
| Docker & docs | 15% | One-command startup, clean compose file, complete README and seed data |

## Setup

1. Copy `backend/.env.example` to `backend/.env`.
2. Replace the placeholder database password, `DATABASE_URL`, JWT secret, and
   initial seed passwords with deployment-specific values.
3. From the repository root, start the application:

   ```powershell
   docker compose --env-file backend/.env up --build
   ```

| Service | URL |
| --- | --- |
| Frontend | http://localhost:8080 |
| API | http://localhost:8000/api |

Seed account emails are `owner@example.com`, `manager@example.com`, and
`staff@example.com`. Set their initial passwords with
`OWNER_INITIAL_PASSWORD`, `MANAGER_INITIAL_PASSWORD`, and
`STAFF_INITIAL_PASSWORD` in `backend/.env`. Passwords are intentionally not
committed to the repository.
