# BillYourTime - Freelance Invoicing & Payment Tracker

A friendly workspace for clients and freelancers to manage project requests, hours, reviews, invoices, and payments. Version 3.6 adds a public welcome page, direct sign-in and sign-up paths, a clearer Post Projects label, and Indian rupee (INR) formatting. The project review and payment lifecycles remain separate.

## Start the app

Install Docker Desktop, then run from the project root in PowerShell:

```powershell
# Edit the existing .env file and add your real MongoDB Atlas URI and secrets.
docker compose up --build
```

The API initializes MongoDB indexes and seeds a freelancer, client portal login, client, project, two unbilled time entries and one sample client project post on first startup. Open http://localhost:5173. API: http://localhost:5000/api.

The client login sees invoices after the freelancer creates an invoice for the matching client email and sends it. Seeded time entries are available for the first invoice.

Stop with `Ctrl+C` or `docker compose down`. The named MongoDB volume keeps your data when containers stop and restart.

## Local development without Docker

For local backend development, install MongoDB and the `uv` package manager. Update the existing `.env` file with your connection and secret values.

```powershell
cd backend
uv sync
.\.venv\Scripts\Activate.ps1
python -c "from app import seed; seed()"
python -m flask --app app run --port 5000
```

In a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

Vite serves at http://localhost:5173 and proxies `/api` to port 5000.

## Environment

| Name | Purpose |
|---|---|
| `MONGO_URI` | MongoDB connection string. Docker uses `mongodb://mongo:27017`. |
| `MONGO_DB` | MongoDB database name. |
| `JWT_SECRET_KEY` | Signs access and refresh tokens. Keep private and rotate for deployment. |
| `FRONTEND_ORIGIN` | Allowed API browser origin. |

`.env` is gitignored. Do not commit production secrets. For deployment, use generated secret values, HTTPS and a specific allowed origin.

## Architecture and key rules

- `backend/app.py`: Flask application factory, JWT configuration, error handlers and blueprint registration.
- `backend/routes/`: Auth, freelancer and client-portal blueprints.
- `backend/common.py`: Authentication, authorization, validation and invoice helpers.
- `backend/storage.py`: MongoDB client, collections, UUID IDs, indexes and pagination helpers.
- `frontend/src/`: Modular React pages, components, hooks, context and Axios API client.
- `docker-compose.yml`: MongoDB healthcheck and named data volume, API and static web app.
- `docs/erd.md`: Mermaid ER diagram.
- `tests/smoke_routes.py`: End-to-end route and business-rule smoke test.

Passwords use Werkzeug password hashes; responses never contain password hashes. Refresh rotation invalidates old refresh tokens and the Axios client automatically retries a request once with a new access token. Logout revokes presented tokens in the MongoDB blocklist. Freelancer routes enforce ownership; client portal queries match the authenticated email and omit drafts. Clients can manage their own project posts; only authenticated freelancer accounts can browse posts from clients. Post contact details are visible on the freelancer project board, so clients should only enter contact information they want to share. Invoice amounts are calculated server-side from stored records. Billed time cannot be changed. Payments must be positive and cannot exceed the balance. Status follows payments/due date while preserving draft/sent state. List endpoints accept pagination (`page`, `per_page` up to 100), `sort`, `order`, plus documented filters (`q`, `status`, `billed`, `client_id`, `month`).

### Project posts, review workflow and hourly rates


Client project posts require a positive hourly rate for new posts. Older posts without a saved rate remain readable and editable; the board labels their rate as unavailable and prevents claiming until the client adds a valid rate. Claiming a post copies its rate into the freelancer project override. Timesheet entries retain the rate used when they were created, so future project rate edits do not change prior entries.

Freelancers submit completion notes from **Projects**. Clients review submissions in **Work review**, then approve or request changes with feedback. A freelancer can resubmit revised work. Approval marks the work completed independently of payment. The freelancer can create one final invoice from the project's unbilled time; this closes the work lifecycle while the invoice follows its own draft/sent/partial/paid status. The final invoice can be sent and paid through existing invoice flows.

The **Projects** and **Clients** pages are list and management views. New client/project associations are created through the freelancer **Project board** by claiming a client-issued project code.

Clients use **Post a project** to publish a title, description, offered hourly rate and contact details. The app creates a random, one-time code and displays it to the client once. The client can generate a replacement from their own account; this invalidates the old code. The freelancer board never exposes the code. The client shares the code after negotiating outside the app. The freelancer chooses **Add project** on the board and submits that code; the app creates or reuses that freelancer's client record and creates the project from the post. A code can only be claimed once. Claimed posts are removed from the freelancer board and shown as linked on the client's post list.

The freelancer can edit draft or sent invoices while no payments have been recorded. They can update line descriptions, hours, rates, tax and due date; totals are recalculated and the client portal displays the latest version. Once any payment exists, the invoice is locked against edits so its payment history remains consistent. On a sent invoice, the client opens invoice details from the invoice list, reviews line items and payment history, and chooses an amount and Cash or Card. A transaction reference is optional. Northstar records that amount, updates the outstanding balance and displays a receipt. The entry appears automatically in the freelancer payment log. Clients can request a correction through email; the freelancer applies the edit. This is a demo ledger action: it does not charge a real card or move money. Do not enter card numbers, CVVs, PINs or bank credentials. Real payment processing requires a configured payment gateway and confirmation from that provider.

## API routes

Every path is under `/api`. Freelancer routes require a freelancer JWT. `/portal/*` routes require a client JWT.

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/health` | Public | Service health. |
| POST | `/auth/register` | Public | Create freelancer or client account. |
| POST | `/auth/login` | Public | Issue access and refresh tokens. |
| POST | `/auth/refresh` | Refresh token | Rotate refresh token. |
| POST | `/auth/logout` | JWT | Revoke presented token. |
| GET | `/auth/me` | JWT | Current profile. |
| GET, POST | `/clients` | Freelancer | List/search or create clients. |
| GET, PUT, DELETE | `/clients/{id}` | Freelancer | Read/update/delete client. |
| GET, POST | `/projects` | Freelancer | List or create projects. |
| POST | `/projects/claim-code` | Freelancer | Claim a client post by one-time code and automatically add client/project with the offered rate. JSON: `{"code":"ABCD-EFGH-JKLM"}`. |
| POST | `/projects/{id}/submit` | Freelancer | Submit completion notes or resubmit revised work. |
| POST | `/projects/{id}/final-invoice` | Freelancer | Create the one final invoice from unbilled hours after client approval; closes the project workflow. |
| GET | `/portal/projects` | Client | List projects linked to the signed-in client email for review. |
| POST | `/portal/projects/{id}/review` | Client | Approve submitted work or request revisions with feedback. |
| GET, PUT, DELETE | `/projects/{id}` | Freelancer | Read/update/delete project. |
| GET, POST | `/time-entries` | Freelancer | List/filter or log time. |
| GET, PUT, DELETE | `/time-entries/{id}` | Freelancer | Read/edit/delete only while unbilled. |
| GET, POST | `/invoices` | Freelancer | List/filter or generate invoice from time. |
| GET | `/invoices/{id}` | Freelancer | Invoice with line items and payments. |
| PUT | `/invoices/{id}` | Freelancer | Edit draft or sent invoice lines, tax and due date until a payment is recorded. |
| POST | `/invoices/{id}/send` | Freelancer | Send a draft invoice. |
| POST | `/invoices/{id}/payments` | Freelancer | Record partial/final payment. |
| GET | `/payments` | Freelancer | Payment log. |
| GET | `/dashboard` | Freelancer | Earnings, receivables, overdue count and top clients. |
| GET | `/portal/invoices` | Client | Own sent/paid/overdue invoice list. |
| GET | `/portal/invoices/{id}` | Client | Own printable invoice and payment history. |
| GET | `/portal/payments` | Client | Own payment history. |
| GET, POST | `/portal/project-posts` | Client | List own posts or publish a project request. |
| GET, PUT, DELETE | `/portal/project-posts/{id}` | Client | Read/edit/delete an owned post. |
| POST | `/portal/project-posts/{id}/regenerate-code` | Owning client | Generate and display a replacement code; previous code becomes invalid. |
| GET | `/project-posts` | Freelancer | Browse client posts with pagination and title search. |
| GET | `/project-posts/{id}` | Freelancer | Read a post from a client. |
| POST | `/portal/invoices/{id}/pay` | Client | Record a demo partial or full payment. JSON: `{"amount":50,"payment_method":"cash","transaction_reference":"CASH-REF-1234"}`. Methods: `cash`, `card`; reference is optional. |

Validation, not found, forbidden and conflict errors use 400, 404, 403 and 409. Unauthenticated calls use 401. Invalid JWTs use 422.

## Test the routes

With Docker running, open a second terminal at the project root:

```powershell
python tests/smoke_routes.py
```

It exercises the route and business rules and verifies invoice math, ownership, hourly-rate validation and propagation, project submission/revision/resubmission/approval/closure, final invoice calculations, partial/full payment, billed-time locking, overpayment rejection, refresh rotation and project post access. It adds uniquely named records and leaves the database volume intact.

## Three-person split (8 days)

Agree on API contracts and database fields together on Day 1. Each member should commit their own code and review a teammate PR; integrate in small increments.

| Team member | Primary ownership | Shared contributions |
|---|---|---|
| Sathwik Y | Auth, roles, client/project CRUD, project posts and one-time project-code API. | Add ownership/code-claim smoke checks; review invoice/payment PR. |
| Shaik Guffran | Invoice generation, locking, status engine, payment-recording API and dashboard aggregates. | Maintain seed/ER diagram; verify payment visibility and transaction-detail validation. |
| Siddharth S | React app, responsive experience, freelancer claim-code dialog, client code display and invoice payment form. | Add form validation/loading/error/receipt states; review an API PR. |

Suggested cadence: Day 1 schema/contracts and healthy Compose; Days 2-3 API and smoke tests; Days 3-5 React integration; Days 5-6 invoice/payment/dashboard rules; Days 7-8 clean start, smoke test, polish and demo. Fill in the contribution log with actual work and commits before submission. The source brief also requests a five-minute demo video; the team should record that deliverable.

## Demo flow

1. Sign in as freelancer and review the overview.
2. Add client/project/time; rate comes from the project override or client default.
3. Build and send an invoice from unbilled entries. Billed entries lock.
4. Record partial or final payments; status/balance update and overpayments fail.
5. Sign in as the matching client email to open/print invoice details, see payment history, and record a partial or full payment by entering an amount and choosing Cash or Card. This is a demo ledger and does not transfer money.
6. The client posts a project request and shares the generated code with a freelancer after negotiating off-platform. The freelancer chooses **Add project** on the Project board and enters the code; the client and project are then added automatically.
