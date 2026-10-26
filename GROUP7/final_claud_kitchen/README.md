# Hearth — Cloud Kitchen

A working React + Vite + Tailwind frontend and Flask REST API backed by MongoDB. Four role portals share the same API. No Docker or relational database is used.

## Implemented

- Customer registration, scrypt password hashing, 15-minute access JWTs, rotating 7-day HttpOnly refresh cookies, replay detection, logout revocation, login throttling and server-side role/ownership checks.
- Public menu, search, category/diet/price filters, sorting, pagination and customer reviews.
- Persistent carts, delivery address CRUD, checkout, trusted server-side billing, item/price/address snapshots, order history/tracking, cancellation, reorder and delivered-order reviews.
- Kitchen queue with polling, acceptance/rejection, preparation, ready status, agent assignment and code reissue.
- Delivery assignment acceptance, pickup, order-specific OTP verification with a five-attempt limit, completion and delivery history.
- Admin menu/category/price/availability management, menu archiving, agent creation/activation, all-order filters and actions, and real MongoDB revenue/daily-order/preparation/agent reports.
- Protected React routes, responsive layouts, loading/empty/error states, notifications, confirmation prompts and polling cleanup. Polling pauses in hidden tabs.

## Source structure

Generated dependencies, local environments, secrets, caches and build output are ignored and are not part of this source tree.

```text
backend/
  .env.example
  app.py                 # Factory, configuration, JSON errors
  auth.py                # JWT sessions and authorization
  catalog.py             # Menu, addresses, carts, billing
  common.py              # Shared validation and responses
  db.py                  # Connection, schemas, indexes, agent lock
  orders.py              # State machine, assignments, OTP, reviews
  admin.py               # Management and live analytics
  seed.py                # Repeatable demo seed
  requirements.txt
  tests/
    test_api.py          # Real-MongoDB integration and concurrency tests
frontend/
  .env.example
  index.html
  package.json
  package-lock.json
  vite.config.js
  src/
    main.jsx
    App.jsx              # Authentication, routing and navigation
    api.js               # One Axios client, refresh and error handling
    shared.jsx           # Shared UI and polling hook
    Customer.jsx
    Operations.jsx       # Kitchen and delivery portals
    Admin.jsx
    styles.css
.gitignore
README.md
```

## Setup on Windows (PowerShell)

Prerequisites: Node.js 22 LTS, Python 3.12 and MongoDB Community Server or an Atlas connection. This workspace has uv available, so the following commands also obtain Python when it is not on PATH. MongoDB must be running before starting Flask or seeding.

Install [MongoDB Community Server](https://www.mongodb.com/docs/manual/installation/) with its Windows service, then start that service if needed from an administrator terminal:

```powershell
Start-Service MongoDB
```

From the project root:

```powershell
cd backend
uv python install 3.12
uv venv .venv --python 3.12
uv pip install --python .venv\Scripts\python.exe -r requirements.txt
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
.\.venv\Scripts\python.exe -c "from pathlib import Path; import secrets; p=Path('.env'); p.write_text(p.read_text().replace('replace-with-a-random-secret-at-least-32-characters-long', secrets.token_hex(32)))"
.\.venv\Scripts\python.exe seed.py
.\.venv\Scripts\python.exe -m flask --app app:create_app run --debug
```

If uv is unavailable, create the environment with `python -m venv .venv` and install with `.\.venv\Scripts\python.exe -m pip install -r requirements.txt` instead. Edit `backend/.env` before seeding to use a different MongoDB URI/database. The app refuses a missing or placeholder JWT secret. Rerunning the seed inserts missing records without resetting edited records or passwords.

In another terminal, from the project root:

```powershell
cd frontend
npm ci
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
npm run dev
```

Open http://localhost:5173. The API listens at http://127.0.0.1:5000. Vite proxies `/api`; keep `VITE_API_BASE_URL=/api`. Both localhost and 127.0.0.1 frontend origins are allowed by the example configuration. Frontend environment values are public; secrets belong only in the backend environment.

## Demo accounts

All four accounts use **KitchenDemo123!** on a fresh seed:

| Portal | Email | Route |
| --- | --- | --- |
| Customer | customer@cloudkitchen.local | /customer/menu |
| Kitchen | kitchen@cloudkitchen.local | /kitchen |
| Delivery | delivery@cloudkitchen.local | /delivery |
| Admin | admin@cloudkitchen.local | /admin |

The customer has a saved demo delivery address. Start an order as the customer, accept/prepare/mark ready as kitchen, assign the delivery agent, then accept/pick up/deliver as delivery. Read the code from the customer's order screen. Admin reports update from the actual delivered order. Use separate browser profiles for simultaneous role sessions, or sign out when switching roles.

## API summary

All endpoints below start with `/api`. JSON envelopes are `{data, error}`; failures have `error.message`. List responses use `{items, total, page, limit}`. Private endpoints require `Authorization: Bearer <access_token>`; refresh uses an HttpOnly cookie.

| Methods | Path | Access / purpose |
| --- | --- | --- |
| GET | /health | API/database readiness |
| POST | /auth/register, /auth/login | Customer registration / role login |
| POST | /auth/session | Restore saved login; returns null for signed-out visitors |
| POST | /auth/refresh, /auth/logout | Rotation / revocation |
| GET | /auth/me | Current user |
| GET | /menu, /categories | Public menu and categories |
| GET | /menu/:id/reviews | Public delivered-order reviews |
| GET, POST | /addresses | Customer-owned addresses |
| PUT, DELETE | /addresses/:id | Update/delete own address |
| GET, PUT | /cart | Customer cart and trusted totals |
| GET, POST | /orders | Role-scoped history / customer checkout |
| GET | /orders/:id | Role/ownership-protected detail |
| POST | /orders/:id/transition | Authorized state changes, including OTP delivery |
| GET | /agents/available | Kitchen/admin assignment choices |
| POST | /orders/:id/assign | Kitchen/admin assignment |
| POST | /orders/:id/accept-assignment | Assigned delivery agent |
| POST | /orders/:id/otp-reset | Kitchen/admin reissue after failed verification |
| POST | /orders/:id/reorder, /orders/:id/rating | Owning customer |
| POST | /admin/menu | Create dish/category |
| PUT, DELETE | /admin/menu/:id | Edit/archive dish |
| GET, POST | /admin/agents | List/create delivery agents |
| PATCH | /admin/agents/:id | Active status; busy agents cannot be disabled |
| GET | /admin/analytics?days=14 | Live reports, 1–90 days |

Menu filters: `q, category, veg=true|false, min_price, max_price, sort=name|price_asc|price_desc, page, limit`. Order filters: `status, scope=active|history, q, date=YYYY-MM-DD, sort=oldest, page, limit`. Date filters and report days use Asia/Kolkata.

## Integrity and security choices

- Money is integer paise. Tax is rounded to the nearest paise at 5%; delivery is ₹29 below ₹500 of items and free from ₹500. Payment is collected on delivery; there is no payment gateway.
- Checkout requires an `Idempotency-Key` header and `{address_id, cart_version, note?}`. Unique customer/key and customer/cart-version indexes prevent duplicate checkout. Cart writes require the last observed version. A retry of a successful checkout returns its original order, even after the cart was cleared.
- State machine: Placed → Accepted → Preparing → Ready → Picked Up → Delivered. Rejection is only from Placed; cancellation only from Placed/Accepted. All mutations use expected-state conditions and append actor/time/history in the same atomic order update. Clients cannot edit history or trusted totals.
- Assignments and their timestamps are embedded in the order. A partial unique index on active agent assignments prevents an agent being assigned two active orders. A short per-agent lease serializes assignment/deactivation and recovers after a process interruption. No multi-document transactions or replica set are required.
- Menu archiving preserves historical order snapshots. Ratings are uniquely indexed by order and require delivery. OTPs are derived with a server-held HMAC secret and exposed only to the owning customer during delivery, never to the agent; five failures require kitchen/admin code reissue.
- Access tokens stay in memory. Refresh cookies are HttpOnly/SameSite Strict, rotate atomically, and are checked against revocable database sessions. Production must use HTTPS, `COOKIE_SECURE=true`, a strong persistent JWT secret and an explicit `FRONTEND_ORIGIN` allowlist.

## Verification and build

From `backend` (MongoDB running):

```powershell
.\.venv\Scripts\python.exe -m pytest -q
```

Tests create a randomly named `cloud_kitchen_test_*` database and delete only that database afterward. Set `TEST_MONGODB_URI` if needed; the account needs database/collection/index/validator permissions. Tests use real MongoDB, not mocks.

From `frontend`:

```powershell
npm run build
npm run preview
```

Executed successfully: **17 integration tests passed**, frontend production build passed, and a live HTTP workflow through Vite's proxy passed for all four roles (checkout → preparation → assignment → OTP delivery → review → matching admin revenue, plus refresh/logout). The live check left one labelled, delivered demo order in the local database. The seed itself creates no fake operational statistics.

Browser UI/visual verification could not run because no browser surface was connected. Layout responsiveness, focus behavior and browser interactions are implemented but remain unverified in a real browser. Menu images use external Unsplash URLs and require internet access; their availability was not verified in this environment.

The production build writes `frontend/dist`. Configure your hosting reverse proxy to serve the SPA for deep links and route `/api` to Flask; Vite's development proxy is not part of the production build or preview command. Production deployment/TLS, external image delivery and load testing were not verified. No application feature is intentionally stubbed; these are verification/deployment limits.
