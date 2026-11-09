# Trackspace frontend

A responsive Jira-inspired issue tracker frontend built on the existing React/Vite application. The Kanban board is the primary project workspace. It uses `@hello-pangea/dnd` for keyboard-friendly drag-and-drop and `lucide-react` for icons.

## Requirements

- Node.js 18 or newer
- The existing Flask backend running on port 5000, unless configured otherwise

## Run locally

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

## Frontend environment

Create `frontend/.env` if the backend is not at `http://localhost:5000`:

```env
VITE_API_URL=http://localhost:5000
```

The frontend sends the existing token in the `Authorization` header. No backend routes or database behavior were changed.

## Build

```bash
npm run build
npm run preview
```

## Existing API features used

- `POST /register`, `POST /login`, `POST /logout`
- `GET /projects`, `POST /projects`
- `POST /projects/:project_id/members`
- `GET /projects/:project_id/issues`, `POST /projects/:project_id/issues`
- `PUT /issues/:issue_id/move`
- `POST /issues/:issue_id/comments`

Issue statuses and permitted transitions follow the workflow defined by the existing backend. The frontend optimistically updates a card while a move is pending and restores the previous board state if the request fails.
