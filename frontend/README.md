# Evently frontend

A small React and Vite app for the existing Flask API. The source is kept close to a beginner React project: pages, a few shared components, one API helper, and one auth context.

## Run locally

1. Start the backend on `http://localhost:5000` and seed its demo data.
2. In this folder, run `npm install` once.
3. Run `npm run dev` and open the local address printed by Vite.

Vite forwards `/api` requests to the backend. Set `VITE_PROXY_TARGET` if the backend runs somewhere else. For a deployed API, set `VITE_API_BASE_URL` to its `/api` URL.

## Pages

- Students: event search and date filters, event details, booking, waitlists, and ticket history.
- Organizers: event drafts, editing and submission, attendance dashboard, and ticket-code check-in.
- Admins: event approvals, venue management, and user accounts and roles.

Student registration is open. Use the accounts created by the backend seed script to sign in as an organizer or administrator.

The frontend uses regular `fetch` requests. The current access token is added in the API helper; there are no request or response interceptors.
