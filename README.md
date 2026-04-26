# ☀️ Solar CRM — MVP

After-Sales Service Management สำหรับบริษัทติดตั้งโซลาร์เซลล์

## Stack

| Layer    | Tech                         |
|----------|------------------------------|
| Frontend | Next.js 14 + TypeScript + Tailwind |
| Backend  | Express + TypeScript         |
| Database | PostgreSQL 16                |
| Auth     | JWT (8h expiry)              |
| Charts   | Recharts                     |

---

## โครงสร้างโปรเจกต์

```
solar-crm/
├── database/
│   └── schema.sql          # SQL schema + seed data
├── backend/
│   ├── src/
│   │   ├── index.ts        # Express entry point
│   │   ├── common/
│   │   │   ├── db.ts       # PostgreSQL pool
│   │   │   └── auth.middleware.ts
│   │   ├── auth/
│   │   │   └── auth.routes.ts
│   │   ├── tickets/
│   │   │   ├── tickets.service.ts  # Business logic
│   │   │   ├── tickets.routes.ts
│   │   │   └── customers.routes.ts
│   │   └── users/
│   │       └── users.routes.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx            # Redirect to /dashboard
│   │   │   ├── login/page.tsx
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── tickets/
│   │   │   │   ├── page.tsx        # Ticket list + filter
│   │   │   │   ├── new/page.tsx    # Create ticket
│   │   │   │   └── [id]/page.tsx   # Ticket detail
│   │   │   └── customers/
│   │   │       ├── page.tsx
│   │   │       └── [id]/page.tsx
│   │   ├── components/
│   │   │   ├── AppLayout.tsx       # Sidebar + header
│   │   │   └── ui.tsx              # Shared UI components
│   │   └── lib/
│   │       ├── api.ts              # Axios client + all API calls + types
│   │       └── auth.store.ts       # Zustand auth state
│   ├── package.json
│   └── Dockerfile
└── docker-compose.yml
```

---

## วิธี Run (3 วิธี)

### วิธีที่ 1 — Docker Compose (แนะนำ)

```bash
# Clone และ run ทุกอย่างใน 1 คำสั่ง
docker compose up --build

# เข้าใช้งาน:
# Frontend: http://localhost:3000
# Backend:  http://localhost:4000
# DB:       localhost:5432
```

---

### วิธีที่ 2 — Local Development

**1. เริ่ม PostgreSQL**
```bash
# ถ้าใช้ Docker สำหรับ DB อย่างเดียว:
docker run -d \
  --name solar_crm_db \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=solar_crm \
  -p 5432:5432 \
  postgres:16-alpine

# รัน schema + seed:
psql postgresql://postgres:password@localhost:5432/solar_crm -f database/schema.sql
```

**2. Backend**
```bash
cd backend
cp .env.example .env
# แก้ไข .env ตามต้องการ

npm install
npm run dev
# → http://localhost:4000
```

**3. Frontend**
```bash
cd frontend

# สร้าง .env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:4000" > .env.local

npm install
npm run dev
# → http://localhost:3000
```

---

### วิธีที่ 3 — Production Build

```bash
# Backend
cd backend && npm run build && npm start

# Frontend
cd frontend && npm run build && npm start
```

---

## Test Accounts

| Email              | Password   | Role             |
|--------------------|------------|------------------|
| admin@solar.com    | admin1234  | Admin            |
| manager@solar.com  | admin1234  | Manager          |
| cs@solar.com       | admin1234  | Customer Service |
| tech@solar.com     | admin1234  | Technician       |

---

## API Endpoints

### Auth
```
POST /api/auth/login     { email, password } → { token, user }
GET  /api/auth/me        → user info
```

### Tickets
```
GET    /api/tickets                           → list (filter: status, priority, search, page)
POST   /api/tickets                           → create ticket
GET    /api/tickets/dashboard                 → KPI summary
GET    /api/tickets/categories                → category list
GET    /api/tickets/:id                       → ticket detail
PATCH  /api/tickets/:id                       → update fields
POST   /api/tickets/:id/assign    { owner_id, department_id }
POST   /api/tickets/:id/status    { status, comment, waiting_reason, done_note }
GET    /api/tickets/:id/comments              → comments list
POST   /api/tickets/:id/comments  { content, is_internal }
GET    /api/tickets/:id/logs                  → audit logs (Manager+)
```

### Customers
```
GET  /api/customers            → list (search)
POST /api/customers            → create
GET  /api/customers/:id        → detail + sites + tickets
POST /api/customers/:id/sites  → add site
```

### Users
```
GET  /api/users                → list (for assign dropdown)
POST /api/users                → create (Admin only)
GET  /api/users/departments    → department list
```

---

## Status Transition Rules

```
new → assigned
assigned → in_progress
in_progress → waiting (ต้องมี waiting_reason)
in_progress → done (ต้องมี done_note)
waiting → in_progress
done → closed
done → in_progress (reopen)
```

---

## Variables สำคัญ (.env)

```env
# Backend
DATABASE_URL=postgresql://postgres:password@localhost:5432/solar_crm
JWT_SECRET=your-secret-key          # เปลี่ยนใน production!
JWT_EXPIRES_IN=8h
PORT=4000
FRONTEND_URL=http://localhost:3000

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:4000
```

---

## หน้าจอที่มีใน MVP

| หน้า               | URL                  | คำอธิบาย                          |
|--------------------|----------------------|-----------------------------------|
| Login              | /login               | JWT login                         |
| Dashboard          | /dashboard           | KPI cards + Charts + Recent       |
| Ticket List        | /tickets             | Filter, Sort, Search, Paginate    |
| Create Ticket      | /tickets/new         | Multi-section form                |
| Ticket Detail      | /tickets/:id         | Status change, Comments, Assign, Logs |
| Customer List      | /customers           | Search + Card view                |
| Customer Detail    | /customers/:id       | Sites + Ticket history            |
