# WMS — Warehouse Management System

Full-stack warehouse and sales management platform.
**Frontend**: React 18 + Vite → deploy to **Vercel**
**Backend**: NestJS + PostgreSQL → deploy to **Railway** or any Docker host

Multi-language UI: English / Русский / Тоҷикӣ

---

## Roles

| Role | Access |
|------|--------|
| `SUPER_ADMIN` | Full access — users, admins, warehouses, shops, invoices, payments |
| `ADMIN` | Management — warehouses, shops, invoices, payments, expenses |
| `USER` | Sales rep mobile app — create invoices, collect payments, returns |

---

## Quick Start (Docker Compose — local)

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
# .env.local already has VITE_API_BASE_URL=http://localhost:8080/api
npm install && npm run dev
```

Open http://localhost:5173 — login with `superadmin` / `Admin@1234`

---

## Deploy Frontend to Vercel

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) → **New Project** → import from GitHub
3. Set **Root Directory** to `warehouse-ui`
4. Add **Environment Variable** in Vercel dashboard:
   ```
   VITE_API_BASE_URL = https://your-backend-domain.com/api
   ```
5. Deploy — Vercel auto-detects Vite and builds `dist/`

> `vercel.json` is already configured for SPA routing.

---

## Deploy Backend to Railway

1. Go to [railway.app](https://railway.app) → **New Project** → Deploy from GitHub
2. Set source to `warehouse-backend-node` folder
3. Add a **PostgreSQL** plugin — Railway fills `DB_*` vars automatically
4. Add these environment variables:

```
JWT_SECRET           = (long random string — generate with: openssl rand -hex 64)
CORS_ORIGINS         = https://your-app.vercel.app
SUPER_ADMIN_USERNAME = superadmin
SUPER_ADMIN_PASSWORD = YourSecurePassword123
SUPER_ADMIN_FULLNAME = Super Administrator
PORT                 = 8080
```

5. Railway detects the `Dockerfile` and deploys automatically

After backend deploys, copy the Railway domain and update `VITE_API_BASE_URL` in Vercel.

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

### Frontend (`warehouse-ui/.env.example`)
| Variable | Description |
|----------|-------------|
| `VITE_API_BASE_URL` | Full URL to backend API, e.g. `https://api.example.com/api` |

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
