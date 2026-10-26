# Retail Inventory frontend

React application built with Vite and React Router. API calls use the shared
Axios client in `src/api/client.js`; Vite proxies `/api` to
`http://127.0.0.1:8000` during development.

## Run and check

```powershell
npm ci
npm run dev
npm run lint
npm run build
```

The API enforces permissions; protected routes and role-aware navigation
provide the corresponding frontend experience. Public registration sends only
name, email, and password; the backend assigns the Staff role.
All product prices, purchase costs, sales totals, and valuation displays use
Indian rupees (INR) with Indian number grouping.

## Production container

The Docker build creates a static Vite bundle and serves it through Nginx.
Nginx forwards `/api/` requests to the `api` Compose service and falls back to
`index.html` for client-side routes.
