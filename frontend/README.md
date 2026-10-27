# Retail Inventory frontend

React application built with Vite and React Router. It provides the retail
inventory dashboard and workflows for products, categories, suppliers,
purchase orders, receiving, point-of-sale, stock movements, and reports.
Protected routes and navigation reflect the Owner, Manager, and Staff roles;
the API remains responsible for authorization.

## Requirements and local development

Use Node.js and npm. From the `frontend` directory:

```powershell
npm ci
npm run dev
```

The Vite development server proxies `/api` requests to
`http://127.0.0.1:8000`. Start the backend separately and configure its
database as described in the [root README](../README.md).

Run frontend checks with:

```powershell
npm run lint
npm run build
```

## Application structure

- `src/pages/` contains the dashboard and feature pages.
- `src/components/` contains shared UI, charts, layout, and route protection.
- `src/api/` contains resource clients built on the shared Axios client.
- `src/context/` contains authentication and toast-notification state.
- `src/utils/currency.js` formats monetary values as INR.

The shared Axios client attaches the current access token and coordinates
refresh-token rotation when protected requests return `401`. Protected routes
and role-aware navigation provide the matching user experience.

After authentication, accessible page data is prefetched in the background.
Navigation links also prefetch when hovered or focused. GET responses are
deduplicated and kept in a short-lived in-memory cache; successful or attempted
write requests clear that cache so later page visits reload current data.

Public registration submits name, email, and password. The backend assigns the
Staff role regardless of any client-provided role value.

## Production container

The frontend Dockerfile builds the Vite bundle in a Node 22 build stage, then
copies the static output into an Nginx image. Nginx serves the client-side app
with an `index.html` fallback and forwards `/api/` requests to the Compose
service named `api`.
