# WMS — Warehouse Management System

Full-stack warehouse and sales management platform.
**Frontend**: React 18 + Vite → deploy to **Vercel**
**Backend**: NestJS + PostgreSQL → deploy to **Railway**

Multi-language UI: English / Русский / Тоҷикӣ

---

## Roles

| Role | Access |
|------|--------|
| `SUPER_ADMIN` | Full access — users, admins, warehouses, shops, invoices, payments |
| `ADMIN` | Management — warehouses, shops, invoices, payments, expenses |
| `USER` | Sales rep mobile app — create invoices, collect payments, returns |

---

## Quick Start (Local Development)

```bash
git clone <repo-url>
cd warehouse-wms

# Start backend + PostgreSQL
cd warehouse-backend-node
cp .env.example .env
# Edit .env if needed, then:
docker compose up -d

# Start frontend (separate terminal)
cd ../warehouse-ui
cp .env.example .env.local
# Set VITE_API_BASE_URL=http://localhost:8080/api in .env.local
npm install && npm run dev
```

Open http://localhost:5173 — login with `superadmin` / `Admin@1234`

---

## Deploy (One Repo → Vercel + Railway)

Both frontend and backend live in the **same GitHub repo**.
Vercel serves the frontend and proxies `/api/*` to Railway.

### Step 1 — Deploy Backend to Railway

1. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**
2. Select this repo → set **Root Directory** to `warehouse-backend-node`
3. Add a **PostgreSQL** plugin — Railway fills `DB_*` vars automatically
4. Add these environment variables in Railway dashboard:

```
JWT_SECRET           = (long random string — generate: openssl rand -hex 64)
CORS_ORIGINS         = https://your-app.vercel.app
SUPER_ADMIN_USERNAME = superadmin
SUPER_ADMIN_PASSWORD = YourSecurePassword123
SUPER_ADMIN_FULLNAME = Super Administrator
PORT                 = 8080
```

5. Railway detects the `Dockerfile` and deploys automatically
6. Copy your Railway domain, e.g. `https://wms-backend.railway.app`

### Step 2 — Deploy Frontend to Vercel

1. Go to [vercel.com](https://vercel.com) → **New Project** → import this GitHub repo
2. **Leave Root Directory empty** (use repo root — `vercel.json` is at root)
3. Open `vercel.json` at the repo root and replace `YOUR-RAILWAY-APP.railway.app` with your actual Railway domain
4. Commit and push — Vercel will auto-deploy

> No environment variables needed on Vercel — the proxy in `vercel.json` handles `/api/*` routing.

### Step 3 — Update CORS on Railway

After Vercel gives you a domain (e.g. `https://wms.vercel.app`), update `CORS_ORIGINS` in Railway:

```
CORS_ORIGINS = https://wms.vercel.app
```

---

## Deploy Backend to Any VPS (Docker)

```bash
cd warehouse-backend-node
cp .env.example .env
# Fill in .env
docker compose up -d
```

---

## Environment Variables Reference

### Backend (`warehouse-backend-node/.env.example`)
| Variable | Default | Description |
|----------|---------|-------------|
| `DB_HOST` | `localhost` | PostgreSQL host |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_NAME` | `wms` | Database name |
| `DB_USERNAME` | `wms` | DB user |
| `DB_PASSWORD` | `wms` | DB password |
| `JWT_SECRET` | — | **Must change** — HS256 signing key |
| `CORS_ORIGINS` | `http://localhost:5173` | Comma-separated allowed origins |
| `SUPER_ADMIN_USERNAME` | `superadmin` | Auto-created on first start |
| `SUPER_ADMIN_PASSWORD` | `Admin@1234` | **Must change** |
| `PORT` | `8080` | Server port |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, Ant Design 5, TanStack Query, Zustand, i18next |
| Backend | NestJS 10, TypeORM, PostgreSQL, JWT/Passport |
| Infrastructure | Docker, Docker Compose |
