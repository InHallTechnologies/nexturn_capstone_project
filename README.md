# Retail Inventory

Flask, React/Vite, PostgreSQL, SQLAlchemy, and JWT application for retail stock,
purchase-order, receiving, and sales workflows. Inventory on hand is derived
from signed stock movements; it is not stored as an editable product quantity.
All product, purchase, sales, and valuation amounts are displayed in Indian
rupees (INR), with Indian digit grouping.

## Requirements and roles

- **Owner:** full access, purchase-order approval, valuation, ledger-balance, and sales-by-day reports.
- **Manager:** product/catalog and supplier management, purchase orders, receiving, and low-stock reporting. Only an Owner may approve purchase orders.
- **Staff:** browse product stock and record/view sales created by their own account.
- Public registration always creates a Staff account. Owner, Manager, and initial Staff accounts are created by the seed script.
- Receipts, sales, returns, and adjustments update the stock ledger with their parent transaction. Sales that would make stock negative and receipts exceeding ordered quantities are rejected.

These permissions are enforced by the API as well as by the React route/navigation layer.

## Run with Docker Compose

1. Copy `backend/.env.example` to `backend/.env`.
2. Replace the placeholder PostgreSQL password in both `POSTGRES_PASSWORD` and
   `DATABASE_URL`, generate a unique `SECRET_KEY` of at least 32 bytes, and set
   unique initial passwords for each seed role.
3. From the repository root run:

   ```powershell
   docker compose --env-file backend/.env up --build
   ```

4. Open <http://localhost:8080>. The API is also available at
   <http://localhost:8000>.

The database uses a named volume. To stop the services without deleting data,
run `docker compose down`. Do not remove the volume when stopping the project.

The API creates its tables and runs the idempotent user and opening-inventory
seeds before Gunicorn starts. New seed-account passwords are read only from
environment variables; existing seed accounts are left unchanged. Database
credentials and JWT secrets must not be committed.

The demo catalog uses rupee-denominated sample prices. Existing database
records are preserved when the currency display changes; review and update
existing product and transaction values if they were previously entered in a
different currency.

## Local development

Backend (Python 3.11+):

```powershell
cd backend
uv sync
Copy-Item .env.example .env
# Edit .env with a PostgreSQL URL, a random SECRET_KEY (32+ bytes), and seed passwords.
uv run python -m backend.create_tables
uv run python -m backend.seed
uv run python -m backend.main
uv run pytest
```

Frontend (Node.js):

```powershell
cd frontend
npm ci
npm run dev
npm run lint
npm run build
```

The Vite development server proxies `/api` to `http://127.0.0.1:8000`; the
production Nginx configuration proxies the same paths to the API container.

## API routes

All routes are under `/api`.

| Resource | Routes |
| --- | --- |
| Authentication | `POST /auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`; `GET /auth/me` |
| Products | `GET /products`, `/products/<id>`; Owner/Manager: `POST /products`, `PUT` and `DELETE /products/<id>` |
| Categories | Owner/Manager: list, read, create, update, and delete `/categories` |
| Suppliers | Owner/Manager: list, read, create, update, delete, and supplier purchase history |
| Purchase orders | Owner/Manager: list, read, create, update, receive, and cancel; Owner only: approve |
| Sales | All roles: list and create; a non-Owner may view only their own sales |
| Stock movements | Owner/Manager: list movements and create reasoned stock adjustments |
| Reports | Owner/Manager: low stock; Owner only: valuation, ledger balance, and sales by day |

Request validation and response fields are implemented by the Flask routes and
schemas; the frontend uses the shared Axios client and handles access-token
refresh/rotation.

## Submission artifacts

- The backend data model diagram is in [`docs/data-model.md`](./docs/data-model.md).
- Import [`postman/Retail-Inventory.postman_collection.json`](./postman/Retail-Inventory.postman_collection.json)
  into Postman to exercise the implemented API routes. Set the `baseUrl`,
  `email`, and `password` collection variables locally; use a seeded account
  for the role being tested. Login and refresh requests save the current access
  and refresh tokens for the remaining requests. Do not commit real passwords.

## Tests

Backend tests run with `cd backend; uv run pytest`. Frontend checks run with
`cd frontend; npm run lint` and `npm run build`. Docker Compose validation
requires Docker Engine with the Compose plugin.
