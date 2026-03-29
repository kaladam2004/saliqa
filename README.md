# WMS — Warehouse Management System

Системаи идоракунии анбор барои корхонаҳои савдо. Дорои ду нақш: **Admin** ва **User (корманд)**.
Stack: NestJS + TypeORM + PostgreSQL (backend), React + Ant Design + TanStack Query (frontend).

---

## Мундариҷа

1. [Тарҳи умумӣ](#тарҳи-умумӣ)
2. [Backend — ҳамаи endpoint-ҳо](#backend)
3. [Desktop Frontend — Admin](#desktop-admin)
4. [Desktop Frontend — User](#desktop-user)
5. [Mobile Admin](#mobile-admin)
6. [Mobile User](#mobile-user)
7. [Таҳлили нопурраги](#таҳлили-нопурраги)
8. [Ран кардан](#ран-кардан)

---

## Тарҳи умумӣ

```
warehouse-wms-main/
├── warehouse-backend-node/   # NestJS API (port 8080)
│   ├── src/
│   │   ├── auth/             # Login, change-password
│   │   ├── admin/            # Admin CRUD
│   │   ├── user/             # User CRUD + GPS
│   │   ├── warehouse/        # Warehouse CRUD
│   │   ├── shop/             # Shop CRUD
│   │   ├── product/          # Product CRUD + stock
│   │   ├── invoice/          # Накладная (дӯкон → харидор)
│   │   ├── payment/          # Пардохт аз харидор
│   │   ├── return/           # Баргашт аз харидор
│   │   ├── user-invoice/     # Накладная (анбор → корманд)
│   │   ├── user-payment/     # Пардохт аз корманд
│   │   ├── user-return/      # Баргашт ба анбор аз корманд
│   │   ├── expense/          # Харҷ / расмат
│   │   ├── event-log/        # Лог фаъолиятҳо
│   │   ├── upload/           # Боргузории акс → /photos/
│   │   ├── batch/            # Партия (batch) маҳсулот
│   │   └── template/         # Шаблонҳо
│   └── photos/               # Аксҳои боргузоришуда (JPEG)
│
└── warehouse-ui/             # React SPA (аз backend serve мешавад)
    └── src/
        ├── pages/admin/      # Саҳифаҳои Admin (desktop + mobile)
        └── pages/user/       # Саҳифаҳои User (desktop + mobile)
```

---

## Backend

> Ҳамаи роутҳо бо `/api` шурӯъ мешаванд. JWT ҳифозат (ба ғайр аз `/auth/login`).

### 🔐 Auth
| Метод | Роут | Тавсиф |
|-------|------|--------|
| POST | `/auth/login` | Вуруд (username + password) |
| POST | `/auth/change-password` | Иваз кардани парол |

### 👤 Admin
| Метод | Роут | Иҷозат |
|-------|------|--------|
| GET | `/admins` | SUPER_ADMIN |
| GET | `/admins/:id` | SUPER_ADMIN |
| POST | `/admins` | SUPER_ADMIN |
| PUT | `/admins/:id` | SUPER_ADMIN |
| DELETE | `/admins/:id` | SUPER_ADMIN |
| PATCH | `/admins/:id/warehouses` | Таъин кардани анборҳо — SUPER_ADMIN |

### 👥 User (корманд)
| Метод | Роут | Тавсиф |
|-------|------|--------|
| GET | `/users` | Рӯйхат |
| GET | `/users/:id` | Аз рӯи ID |
| POST | `/users` | Эҷод |
| PUT | `/users/:id` | Навсозӣ |
| DELETE | `/users/:id` | Ҳазф |
| PATCH | `/users/:id/gps` | Навсозии GPS |

### 🏭 Warehouse (Анбор)
| Метод | Роут |
|-------|------|
| GET | `/warehouses` — бо маҳсулотҳо |
| GET | `/warehouses/:id` |
| POST | `/warehouses` |
| PUT | `/warehouses/:id` |
| DELETE | `/warehouses/:id` |

### 🏪 Shop (Дӯкон)
| Метод | Роут |
|-------|------|
| GET | `/shops` |
| GET | `/shops/:id` |
| POST | `/shops` |
| PUT | `/shops/:id` |
| DELETE | `/shops/:id` |

### 📦 Product (Маҳсулот)
| Метод | Роут | Тавсиф |
|-------|------|--------|
| GET | `/products` | Рӯйхат |
| GET | `/products/:id` | Аз рӯи ID |
| POST | `/products/batch` | Эҷоди якчанд (Admin) |
| PUT | `/products/:id` | Навсозӣ (Admin) |
| DELETE | `/products/:id` | Ҳазф (Admin) |
| POST | `/products/warehouses/:warehouseId/add` | Илова ба анбор |
| PATCH | `/products/:id/quantity` | Иловаи миқдор |

### 🧾 Invoice (Накладная — дӯкон ↔ харидор)
| Метод | Роут | Тавсиф |
|-------|------|--------|
| GET | `/invoices` | Ҳамаи накладнаҳо |
| GET | `/invoices/stats` | Омор |
| GET | `/invoices/filter` | Филтр: `shopId, userId, from, to` |
| GET | `/invoices/:id` | Аз рӯи ID |
| POST | `/invoices` | Эҷод |
| PUT | `/invoices/:id` | Навсозӣ |
| PATCH | `/invoices/:id/mark-paid` | Пардохтшуда |
| PATCH | `/invoices/:id/mark-printed` | Чопшуда |
| DELETE | `/invoices/:id` | Ҳазф |

### 💰 Payment (Пардохт аз харидор)
| Метод | Роут | Тавсиф |
|-------|------|--------|
| GET | `/payments` | Ҳамаи пардохтҳо |
| GET | `/payments/filter` | Филтр: `shopId, userId, from, to` |
| GET | `/payments/by-user/:userId` | Пардохтҳои корбар |
| GET | `/payments/:id` | Аз рӯи ID |
| POST | `/payments` | Эҷод |
| POST | `/payments/bulk` | Якбора (чанд накладна) |
| DELETE | `/payments/:id` | Ҳазф |

### 🔄 Return (Баргашт аз харидор)
| Метод | Роут |
|-------|------|
| GET | `/returns` |
| GET | `/returns/:id` |
| POST | `/returns` |
| DELETE | `/returns/:id` |

### 📋 User Invoice (Накладная — анбор → корманд)
| Метод | Роут | Тавсиф |
|-------|------|--------|
| GET | `/user-invoices` | Ҳамаи |
| GET | `/user-invoices/filter` | Филтр: `userId, warehouseId, from, to` |
| GET | `/user-invoices/unpaid/user/:userId` | Пардохтнашудаҳо |
| GET | `/user-invoices/rep-stock/:userId` | Захираи корманд |
| GET | `/user-invoices/rep-products/:userId` | Маҳсулоти корманд `(search, page, size)` |
| GET | `/user-invoices/:id` | Аз рӯи ID |
| POST | `/user-invoices` | Эҷод |
| PATCH | `/user-invoices/:id/mark-paid` | Пардохтшуда |
| PATCH | `/user-invoices/:id/mark-printed` | Чопшуда |
| DELETE | `/user-invoices/:id` | Ҳазф |

### 💳 User Payment (Пардохт аз корманд ба admin)
| Метод | Роут | Тавсиф |
|-------|------|--------|
| GET | `/user-payments` | Ҳамаи |
| GET | `/user-payments/pending` | Дар интизор |
| GET | `/user-payments/by-user/:userId` | Пардохтҳои корбар |
| GET | `/user-payments/:id` | Аз рӯи ID |
| POST | `/user-payments` | Эҷод |
| POST | `/user-payments/bulk` | Якбора |
| PATCH | `/user-payments/:id/accept` | Қабул |
| DELETE | `/user-payments/:id` | Ҳазф |

### ↩️ User Return (Баргашт ба анбор)
| Метод | Роут |
|-------|------|
| GET | `/user-returns` |
| GET | `/user-returns/:id` |
| POST | `/user-returns` |
| DELETE | `/user-returns/:id` |

### 💸 Expense (Харҷ / расмат)
| Метод | Роут | Тавсиф |
|-------|------|--------|
| GET | `/expenses` | Ҳамаи |
| GET | `/expenses/filter` | Филтр: `userId, from, to` |
| GET | `/expenses/by-admin/:adminId` | Харҷҳои admin |
| GET | `/expenses/by-user/:userId` | Харҷҳои корбар |
| GET | `/expenses/pending-user` | Тасдиқнашудаҳо |
| POST | `/expenses` | Эҷод |
| PATCH | `/expenses/:id/approve` | Тасдиқ |
| DELETE | `/expenses/:id` | Ҳазф |

### 📜 Event Log
| Метод | Роут |
|-------|------|
| GET | `/event-logs` — login, update, delete логҳо |

### 🖼️ Upload
| Метод | Роут | Тавсиф |
|-------|------|--------|
| POST | `/upload` | Акс → JPEG → нигоҳ дар `./photos/` |
| GET | `/photos/:file` | Static — нишон додани акс |

> Sharp ҳамаи форматҳо (HEIC, PNG, WEBP) ба JPEG табдил медиҳад. Max 20MB.

### 📦 Batch (Партияи маҳсулот)
| Метод | Роут |
|-------|------|
| GET/POST/PUT/DELETE | `/batches`, `/batches/:id` |

### 📝 Template (Шаблон)
| Метод | Роут |
|-------|------|
| GET/POST/PUT/DELETE | `/templates`, `/templates/:id` |

---

## Desktop Admin

> Роут: `/admin/*` | Desktop ≥ 768px

| Саҳифа | Роут | Вазъ | Тавсиф |
|--------|------|------|--------|
| Dashboard | `/admin` | ✅ | Омор умумӣ |
| Анборҳо | `/admin/warehouses` | ✅ | CRUD + Drawer: маҳсулотҳо + захира |
| Дӯконҳо | `/admin/shops` | ✅ | CRUD + акс + GPS + корманд |
| Маҳсулотҳо | `/admin/products` | ✅ | CRUD + акс + нарх |
| Накладнаҳо | `/admin/invoices` | ✅ | Рӯйхат + детал + чоп A4 + PDF |
| Пардохтҳо | `/admin/payments` | ✅ | Ҳисобот + филтр + bulk wizard |
| User Накладнаҳо | `/admin/user-invoices` | ✅ | Накладнаҳои корбарон |
| User Пардохтҳо | `/admin/user-payments` | ✅ | Пардохтҳои корбарон + қабул |
| Корбарон | `/admin/users` | ✅ | CRUD + GPS |
| Adminҳо | `/admin/admins` | ✅ | CRUD (SUPER_ADMIN) |
| Профил | `/admin/profile` | ✅ | Акс + таҳрир + парол |
| Аналитика | `/admin/analytics` | ✅ | Графикҳо, қарздориҳо |
| Логи фаъолиятҳо | `/admin/event-logs` | ✅ | Ҷустуҷӯ + филтр |
| Харҷи Admin | `/admin/my-expenses` | ✅ | + филтри сана |
| Харҷи корбарон | `/admin/user-expenses` | ✅ | + тасдиқ |
| Wizard: Анбор | `/admin/wizard/warehouse` | ✅ | — |
| Wizard: Маҳсулот | `/admin/wizard/products` | ✅ | — |
| Wizard: Корбар | `/admin/wizard/user` | ✅ | — |
| Wizard: Пардохт | `/admin/wizard/accept-payment` | ✅ | — |
| **Batch** | — | ❌ | Backend мавҷуд, frontend нест |
| **Template** | — | ❌ | Backend мавҷуд, frontend нест |

---

## Desktop User

> Роут: `/user/*`

| Саҳифа | Роут | Вазъ |
|--------|------|------|
| Dashboard | `/user` | ✅ |
| Профил | `/user/profile` | ✅ |
| Дӯконҳоям | `/user/shops` | ✅ |
| Накладнаҳоям | `/user/invoices` | ✅ |
| Захираҳоям | `/user/my-pickups` | ✅ |
| Харҷи ман | `/user/my-expenses` | ✅ |
| Wizard: Фурӯш | `/user/wizard/sales` | ✅ |
| Wizard: Пардохт | `/user/wizard/payment` | ✅ |
| Wizard: Bulk пардохт | `/user/wizard/bulk-payment` | ✅ |
| Wizard: Баргашт | `/user/wizard/return` | ✅ |
| Wizard: Гирифтан аз анбор | `/user/wizard/pickup` | ✅ |

---

## Mobile Admin

> < 768px | **6 таб** дар поён

| Таб | Вазъ | Мундариҷа |
|-----|------|-----------|
| 🏠 Dashboard | ✅ | Омор: накладнаҳо, пардохтҳо, корбарон |
| 📦 Маҳсулот | ✅ | CRUD + детали маҳсулот |
| 📄 Накладна | ✅ | Рӯйхат + детал + **чоп A4** + пардохт |
| 👥 Корбарон | ✅ | CRUD + GPS |
| ⋯ Бештар | ✅ | Анборҳо, Дӯконҳо, Пардохтҳо, Аналитика, Харҷот, Логҳо, User Накладнаҳо, User Пардохтҳо |
| 👤 Профил | ✅ | Акс + таҳрир + парол |

**"Бештар" дар мобайл:**

| Бахш | Вазъ | Эзоҳ |
|------|------|------|
| Анборҳо | ✅ | CRUD (бе детали маҳсулотҳо) |
| Дӯконҳо | ✅ | CRUD |
| Пардохтҳо | ✅ | Рӯйхат |
| User Накладнаҳо | ✅ | Рӯйхат |
| User Пардохтҳо | ✅ | + қабул |
| Аналитика | ✅ | Омор + графики дӯконҳо |
| Харҷоти Admin | ✅ | Рӯйхат + эҷод |
| Логи фаъолиятҳо | ✅ | Рӯйхат |
| Детали анбор (Drawer + захира) | ❌ | Дар desktop ҳаст, мобайл нест |
| Харҷи корбарон + тасдиқ | ❌ | Дар desktop ҳаст, мобайл нест |
| Wizard-ҳо (setup/onboard) | ❌ | Мобайл нест |

---

## Mobile User

> < 768px | **4 таб** дар поён

| Таб | Вазъ | Мундариҷа |
|-----|------|-----------|
| 🏠 Dashboard | ✅ | Қарзҳо, пардохтҳо |
| 🏪 Дӯконҳо | ✅ | Рӯйхат → детал → Накладнаҳо / Пардохтҳо / Баргаштҳо |
| 📥 Анбор | ✅ | Маҳсулот / Гирифтаҳо / Пардохтҳо / Харҷот / Баргаштҳо |
| 👤 Профил | ✅ | Акс + GPS + таҳрир + парол |

**"Дӯконҳо" таб:**

| Бахш | Вазъ |
|------|------|
| Рӯйхат + ҷустуҷӯ + recent | ✅ |
| GPS + тел дар детал | ✅ |
| Накладнаҳо — рӯйхат + **чоп A4** + QR scan | ✅ |
| Эҷоди накладна (wizard) | ✅ |
| Пардохтҳо — рӯйхат | ✅ |
| Баргаштҳо — рӯйхат + wizard | ✅ |
| Bulk пардохт | ❌ | Desktop-да ҳаст |

**"Анбор" таб:**

| Бахш | Вазъ |
|------|------|
| Маҳсулотҳо + гирифтан аз анбор | ✅ |
| Гирифтаҳоям + **чоп A4** + QR | ✅ |
| Пардохтҳо ба admin | ✅ |
| Харҷот + эҷод | ✅ |
| Баргашт ба анбор (wizard) | ✅ |

---

## Таҳлили нопурраги

### 🔴 Backend дорад — Frontend НЕСТ:
| Модул | Тавсиф |
|-------|--------|
| `/batches` | Партияи маҳсулот — бекенд тайёр, UI нест |
| `/templates` | Шаблонҳо — бекенд тайёр, UI нест |

### 🟡 Desktop дорад — Mobile НЕСТ:
| Функсия | Admin Mobile | User Mobile |
|---------|-------------|-------------|
| Детали анбор + иловаи захира | ❌ | — |
| Харҷи корбарон (тасдиқ) | ❌ | — |
| Wizard-ҳо (setup/onboard) | ❌ | — |
| Bulk пардохт | — | ❌ |

### 🟢 Ҳама ҷо кор мекунад:
| Функсия | Desktop | Mobile |
|---------|---------|--------|
| Вуруд + парол | ✅ | ✅ |
| Профил бо акс + GPS | ✅ | ✅ |
| CRUD: анбор, дӯкон, маҳсулот | ✅ | ✅ |
| Накладна — эҷод + чоп A4 | ✅ | ✅ |
| Пардохт + баргашт | ✅ | ✅ |
| Боргузории акс (HEIC/PNG→JPEG) | ✅ | ✅ |
| 3 забон (тоҷ/рус/инг) | ✅ | ✅ |
| Аналитика + логҳо | ✅ | ✅ |
| QR код | ✅ | ✅ |

---

## Схемаи ҷараёни маҳсулот

```
АНБОР ──[user-invoice]──► КОРМАНД ──[invoice]──► ХАРИДОР
  ▲                           │                       │
  │                      [user-return]            [payment]
  │                           │
  └───────────────────────────┘

Ҳисоббаробаркунӣ: КОРМАНД ──[user-payment]──► ADMIN
```

---

## Ран кардан

### Роҳи 1 — Docker (тавсия мешавад, содда)

> Пешшарт: [Docker Desktop](https://www.docker.com/products/docker-desktop/) насб шуда бошад.

```bash
cd warehouse-backend-node

# 1. Файли .env созед
cp .env.example .env

# 2. Лоиҳаро бо Docker бало кунед (PostgreSQL + Backend + Frontend)
docker compose up -d

# 3. Рафтан ба браузер
# http://localhost:8080
# Вуруд: superadmin / Admin@1234
```

Барои қатъ кардан:
```bash
docker compose down
```

---

### Роҳи 2 — Бе Docker (дастӣ)

> Пешшарт: Node.js ≥ 18, PostgreSQL насб ва кор кунад.

**Қадами 1 — Backend:**
```bash
cd warehouse-backend-node

# .env созед ва маълумоти PostgreSQL-ро пур кунед
cp .env.example .env

# Вобастагиҳо насб кунед
npm install

# Сохтмон ва оғоз
npm run build
npm run start
```

**Қадами 2 — Frontend** (дар терминали дигар):
```bash
cd warehouse-ui

# Вобастагиҳо насб кунед
npm install

# Барои production: build карда ба backend иҷозат диҳед
npm run build
# → Build ба warehouse-backend-node/dist/client мерасад ва
#   backend онро static файл тариқа serve мекунад

# Ё барои development (hot reload):
npm run dev
# → http://localhost:5173
```

---

### Роҳи 3 — Танҳо backend (build аллакай тайёр)

Агар `dist/` пешакӣ мавҷуд бошад:
```bash
cd warehouse-backend-node
cp .env.example .env   # агар нест бошад
node dist/main.js
```

---

### Портҳо

| Хизмат | Порт | URL |
|--------|------|-----|
| Backend API + Frontend + аксҳо | `8080` | http://localhost:8080 |
| Frontend (dev режим) | `5173` | http://localhost:5173 |

**Вуруди пешфарз:** `superadmin` / `Admin@1234`

Multi-language UI: English / Русский / Тоҷикӣ

---

### Дастрасӣ аз интернет (Ngrok)

```bash
ngrok http 8080
```

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
