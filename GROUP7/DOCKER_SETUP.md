# Hearth Cloud Kitchen Docker Setup

This setup runs the existing React/Vite frontend, Flask API, and MongoDB together. It does not change application routes, database documents, authentication, or the order workflow.

## Architecture

- `frontend` builds the Vite application with Node.js, then serves its static output from Nginx on `http://localhost:5173`.
- Nginx sends `/api/` requests to the Compose service `backend` on port 5000. Axios already uses the same-origin `/api` base URL and sends credentials, so refresh cookies travel through the proxy without browser-side Docker hostnames or CORS changes. Nginx also falls back to `index.html` for React Router routes.
- `backend` runs the existing `app:create_app()` factory under Gunicorn on `http://localhost:5000`. Compose supplies `mongodb://mongo:27017/`; MongoDB is only reachable on the private Compose network.
- `mongo` uses the named volume `mongo_data`. Stopping or recreating containers preserves database data. Do not use `docker compose down -v` unless you intentionally want to delete that data.
- MongoDB and the API have health checks. The API waits for MongoDB to become healthy, and the frontend waits for the API.

## Files

- `compose.yaml`: defines the three services, health dependencies, localhost port mappings, and persistent volume.
- `final_claud_kitchen/backend/Dockerfile`: installs Python dependencies and runs the Flask factory with Gunicorn as a non-root user.
- `final_claud_kitchen/backend/requirements.txt`: adds Gunicorn, the production WSGI server.
- `final_claud_kitchen/backend/.dockerignore`: keeps local environments, secrets, caches, and tests out of the backend image.
- `final_claud_kitchen/frontend/Dockerfile`: builds React in Node and copies only the compiled site into Nginx.
- `final_claud_kitchen/frontend/.dockerignore`: excludes local dependencies, build output, and environment files from the build context.
- `final_claud_kitchen/frontend/nginx.conf`: serves the SPA, routes API traffic to the backend service, and forwards the original request host.
- `DOCKER_SETUP.md`: this guide.

The existing frontend `.env.example` and Axios default already set `VITE_API_BASE_URL=/api`; no browser-side service hostname is needed. The backend `.env.example` already contains the variable names the Flask app expects.

## Requirements

- Docker Desktop for Windows, running with Linux containers enabled.
- Docker Compose v2 (`docker compose` command).
- Windows PowerShell.
- Ports 5173 and 5000 available on localhost. MongoDB port 27017 is not published to the host.

## Configure and Start

Run these commands from the directory containing `compose.yaml` (`GROUP7` in this workspace). Create a private backend environment file from the checked-in example, then replace its placeholder JWT secret with a fresh random value. This does not overwrite an existing `.env` file.

```powershell
if (-not (Test-Path .\final_claud_kitchen\backend\.env)) {
    Copy-Item .\final_claud_kitchen\backend\.env.example .\final_claud_kitchen\backend\.env
}
$envPath = Resolve-Path .\final_claud_kitchen\backend\.env
$envText = Get-Content $envPath -Raw
if ($envText -match '^JWT_SECRET=replace-') {
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    $bytes = New-Object byte[] 32
    $rng.GetBytes($bytes)
    $secret = [Convert]::ToBase64String($bytes)
    $envText = $envText -replace '(?m)^JWT_SECRET=.*$', "JWT_SECRET=$secret"
    Set-Content -Path $envPath -Value $envText -NoNewline -Encoding ascii
    $rng.Dispose()
    Remove-Variable secret, bytes, rng
}

docker compose config --quiet
docker compose build
docker compose up -d
docker compose ps
```

The Compose backend overrides only `MONGODB_URI` to use the Docker hostname `mongo`. The `.env` file remains the source for the JWT secret, database name, frontend origin, cookie setting, and any other supported backend variables. Keep it local; do not commit it or paste the secret into logs. For local production deployment over HTTPS, set `COOKIE_SECURE=true` and use an HTTPS-terminated proxy. For this localhost demo, leave it `false` so the browser accepts the refresh cookie over HTTP.

Open:

- Frontend: `http://localhost:5173`
- Backend health: `http://localhost:5000/api/health`

## Demo Data and Roles

The seed is repeatable and inserts demo records only when they are missing; it does not reset existing users or edited data. Run:

```powershell
docker compose exec backend python seed.py
```

On a fresh database, the four demo users use `KitchenDemo123!`:

| Role | Email |
| --- | --- |
| Customer | `customer@cloudkitchen.local` |
| Kitchen staff | `kitchen@cloudkitchen.local` |
| Delivery agent | `delivery@cloudkitchen.local` |
| Admin | `admin@cloudkitchen.local` |

The customer seed includes a delivery address and the menu. To demonstrate delivery, place an order as the customer; accept, prepare, and mark it ready as kitchen; assign it to delivery; accept the assignment and pick it up as the agent; use the customer's displayed OTP to mark it delivered; then view the order in Admin. Use separate browser profiles or sign out when changing roles. Demo passwords are for local demonstration only.

## Status, Logs, and Lifecycle

```powershell
docker compose ps
docker compose logs --tail 100 mongo
docker compose logs --tail 100 backend
docker compose logs --tail 100 frontend
docker compose logs -f backend
docker compose stop
docker compose start
docker compose down
docker compose up --build -d
```

`docker compose down` removes the containers and network but preserves `mongo_data`. The final command rebuilds changed images and starts the application again. To permanently remove the data volume would require `docker compose down -v`; do not run that for routine cleanup.

## Tests

The backend image intentionally excludes the test directory. To run the real-MongoDB integration suite without publishing the database port, mount the tests read-only into a one-off backend container:

```powershell
$testsPath = (Resolve-Path .\final_claud_kitchen\backend\tests).Path.Replace('\', '/')
docker compose run --rm -e TEST_MONGODB_URI=mongodb://mongo:27017/ -v "${testsPath}:/app/tests:ro" backend python -m pytest -p no:cacheprovider -q /app/tests
```

The fixture creates a randomly named `cloud_kitchen_test_*` database and drops only that test database when finished. It does not target the application's `cloud_kitchen` database.

## Common Issues

- **Docker daemon unavailable:** start Docker Desktop, wait for the engine to finish starting, then retry `docker compose ps`.
- **Missing `.env`:** copy `backend/.env.example` to `backend/.env` and replace the placeholder JWT secret using the PowerShell setup above. Flask intentionally refuses a missing or placeholder secret.
- **MongoDB connection refused:** check `docker compose ps` and `docker compose logs mongo`; the backend uses the service hostname `mongo`, not `localhost`.
- **Port already allocated:** stop the other process using 5173 or 5000, or edit the host-side number in the relevant `ports` mapping. Keep the container-side values (`80` for Nginx, `5000` for Flask) unchanged.
- **Frontend API errors:** verify `http://localhost:5000/api/health`, then inspect `docker compose logs backend frontend`. The production frontend uses same-origin `/api`; `VITE_API_BASE_URL` should not contain the backend service hostname.
- **Refresh/login fails:** use `http://localhost:5173` consistently, leave `COOKIE_SECURE=false` for plain HTTP localhost, and check that `FRONTEND_ORIGIN` includes `http://localhost:5173`. Refresh cookies are HttpOnly and scoped to `/api/auth`.
- **Menu images do not appear:** demo images are hosted by Unsplash and need outbound internet access.

## Viva Summary

Docker packages the frontend, API, and database as separate containers. Docker Compose starts them together on a private network: Nginx serves React and forwards API calls to Flask, while Flask connects to MongoDB by the service name `mongo`. Health checks control startup order, and a named volume keeps MongoDB data when containers are stopped or rebuilt. The application can therefore be started consistently with `docker compose up --build -d` after the local backend environment file has been configured once.