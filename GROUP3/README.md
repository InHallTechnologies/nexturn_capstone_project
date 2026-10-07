# GROUP 3 — Clinic Appointment & Prescription System

**Stack:** Flask · React (Vite) · PostgreSQL + SQLAlchemy · JWT · Docker Compose  
**Team size:** 3  |  **Duration:** 8 days

## Team Members

| # | Name | GitHub username |
| --- | --- | --- |
| 1 | Meghna |  |
| 2 | Santhoshi |  |
| 3 | Divya |  |

## Project Description

Patients search doctors by specialization and book a free slot; the doctor runs the consultation and issues a prescription that becomes part of the patient visit history.

## Roles

| Role | Responsibility |
| --- | --- |
| Admin | Manages doctors, specializations and the clinic calendar. |
| Doctor | Sets weekly availability, sees the day queue, records consultations and prescriptions. |
| Patient | Searches doctors, books/reschedules/cancels, views their own history. |

## Data Model

- **User** - credentials, role, name, phone.
- **DoctorProfile** - user, specialization, qualification, consultation fee, room.
- **AvailabilitySlot** - doctor, weekday, start time, end time, slot duration.
- **Appointment** - doctor, patient, date, start time, status (booked / completed / cancelled / no-show), reason.
- **Consultation** - appointment, vitals, complaint, diagnosis notes, follow-up date.
- **Prescription** + **PrescriptionItem** - consultation, medicine, dosage, frequency, duration, instructions.
- **Medicine** - name, form, strength (master list used for autocomplete).

## Features

- Doctor availability defined by weekday and time range; the API generates concrete bookable slots for a requested date.
- Patient search by specialization, doctor name, fee range and available date.
- Book, reschedule and cancel; status transitions enforced on the server.
- Doctor's day queue sorted by slot time, with a one-click open consultation.
- Consultation form: vitals, complaint, diagnosis notes, follow-up date.
- Multi-medicine prescription with dosage and duration, printable.
- Patient visit history timeline with past prescriptions.
- Admin: add doctors, manage specializations, view clinic-wide appointment counts.

## Core Technical Challenge

**No double booking and strict record isolation.** Slot generation subtracts already-booked appointments, and the booking endpoint re-checks inside a transaction with a unique constraint on (doctor, date, start_time) so two simultaneous requests cannot take the same slot. Cancellation within 2 hours of the slot is rejected. A patient can read only their own appointments, consultations and prescriptions; a doctor only those of patients they have treated - enforced in the query, not by hiding buttons in React.

## React Screens

- Doctor search with filters and result cards.
- Calendar date picker with available slots for the chosen doctor.
- My appointments (upcoming / past) and patient history timeline.
- Doctor day queue and consultation screen with prescription builder.
- Admin doctor management panel.

## Authentication Specification

- Passwords hashed with bcrypt - plain text passwords must never touch the database.
- Endpoints: `POST /auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`, `GET /auth/me`.
- The access token carries a `role` claim; a custom decorator `@role_required("admin")` guards privileged routes on top of `@jwt_required()`.
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
| Member 1 | Auth, roles, doctor profiles, availability and slot generation. |
| Member 2 | Appointments, booking rules, consultations, prescriptions, medicine master. |
| Member 3 | Entire React application for all three roles. |

---

## Contribution Log — to be filled in by the team

> Fill this in yourselves before submission. Be specific: name the modules, endpoints, components or files you actually built. One line per item.

| Member | Modules / features built | Files or folders owned | Approx. commits |
| --- | --- | --- | --- |
| Meghna |  |  |  |
| Santhoshi |  |  |  |
| Divya |  |  |  |

### Individual summaries

**Meghna**

- What I built: 
- What I found hardest: 
- What I would do differently: 

**Santhoshi**

- What I built: 
- What I found hardest: 
- What I would do differently: 

**Divya**

- What I built: 
- What I found hardest: 
- What I would do differently: 

### Shared / pair work

- 
- 

### Declaration

We confirm the above split is accurate and every member contributed code to this repository.

| Member | Signature / date |
| --- | --- |
| Meghna |  |
| Santhoshi |  |
| Divya |  |

---

## Deliverables Checklist

- [ ] GitHub repository containing both applications with a readable commit history from every member.
- [ ] README.md with setup instructions, environment variables and an API endpoint table.
- [ ] ER diagram (SQL) or collection diagram (MongoDB).
- [ ] Seed script with demo data and demo credentials per role.
- [ ] Postman collection covering every endpoint.
- [ ] Working `docker compose up --build` on a clean machine.
- [ ] 5-minute demo video.

## Evaluation

| Area | Weight | What is checked |
| --- | --- | --- |
| Functionality | 30% | All listed features work end to end without manual database edits |
| API design & JWT | 20% | Correct status codes, validation, role guards, refresh and blocklist working |
| Core business logic | 20% | The project-specific core rule is correctly and safely implemented |
| React frontend | 15% | Component structure, state handling, validation, loading and error states |
| Docker & docs | 15% | One-command startup, clean compose file, complete README and seed data |

## Setup

```bash
git clone <repo-url>
cd <repo>
cp .env.example .env
docker compose up --build
```

| Service | URL |
| --- | --- |
| Frontend | http://localhost:3000 |
| API | http://localhost:5000/api |

**Demo credentials:** _(fill in after seeding)_
