# 🏃 TKC SuperApp — Sprint Week 1-2 Detailed Plan

| Field | Value |
|---|---|
| **Document Type** | Detailed Sprint Plan |
| **Version** | 1.0 |
| **Date** | 2026-05-12 |
| **Sprint Goal** | Foundation Complete — Gate 1 |
| **Duration** | Week 1 + Week 2 (14 days) |
| **Owner** | ชิบะน้อย + Claude/พอร์ช |

---

## Sprint Goal

**End of Week 2:** Working dev environment + skeleton app deployed at `https://app.giantwillow.com`

**Pass Gate 1:**
- All services running in Docker
- Login page accessible
- Database schemas created
- CI/CD pipeline working
- HTTPS via Cloudflare Tunnel

---

## Prerequisites — Week 0 (Owner setup, before Day 1)

```
☐ 1. Telegram Bot created (token + chat ID saved)
☐ 2. Cloudflare Tunnel configured for app.giantwillow.com
☐ 3. NAS service account + folder structure ready
☐ 4. AIO vendor contacted (ETA tracking)
☐ 5. GitHub repo created (tkc-superapp private)
☐ 6. Backup admin identified
☐ 7. Spark #1 verified: SSD ≥ 256 GB free, 128 GB RAM
☐ 8. Spark #1 has Docker installed
```

⚠️ **All 8 items required before Day 1 of Week 1**

---

## Week 1 — Daily Breakdown

### Day 1 (Monday) — Project Initialization

**Goal:** Repo + Docker scaffolding

```
🕐 Morning Session (2-3 hours)

[ ] Clone empty repo
[ ] Initialize project structure:
    tkc-superapp/
    ├── README.md
    ├── docker-compose.yml
    ├── .env.example
    ├── .gitignore
    ├── frontend/
    │   └── package.json (Next.js init)
    ├── backend/
    │   └── pyproject.toml (FastAPI init)
    ├── infra/
    │   ├── nginx/
    │   └── postgres/
    └── docs/
        └── (Copy PRDs here)

[ ] First commit + push
[ ] Enable GitHub Actions
[ ] Setup branch protection on main
[ ] Create .github/workflows/ci.yml skeleton

🕐 Afternoon Session (2-3 hours)

[ ] docker-compose.yml with:
    - postgres:16 (with pgvector)
    - redis:7
    - nginx:alpine
    - backend (placeholder)
    - frontend (placeholder)

[ ] Test: docker compose up
[ ] Verify all services start

[ ] Create .env.example with required vars:
    - POSTGRES_PASSWORD
    - REDIS_PASSWORD
    - JWT_SECRET
    - TELEGRAM_BOT_TOKEN
    - TELEGRAM_ADMIN_CHAT_ID
    - CLOUDFLARE_TUNNEL_TOKEN

✅ DoD Day 1:
  □ Repo accessible via GitHub
  □ docker compose up succeeds locally
  □ All 5 services healthy
  □ First commit pushed
```

---

### Day 2 (Tuesday) — Backend Skeleton

**Goal:** FastAPI starts + health check works

```
🕐 Backend setup (3-4 hours)

[ ] backend/pyproject.toml setup
    Dependencies:
      - fastapi[all]
      - sqlalchemy[asyncio]
      - alembic
      - asyncpg
      - redis
      - pydantic-settings
      - argon2-cffi
      - pyjwt
      - python-multipart

[ ] backend/main.py
    - FastAPI app
    - CORS middleware (allow localhost dev)
    - Health endpoint: GET /api/health

[ ] backend/core/config.py
    - Settings class with .env loading

[ ] backend/core/database.py
    - Async PostgreSQL connection
    - Session factory

[ ] Connect FastAPI to PostgreSQL
[ ] Test: curl localhost:8000/api/health → 200

🕐 Alembic setup (1-2 hours)

[ ] alembic init alembic
[ ] Configure for async + multiple schemas
[ ] First migration: CREATE SCHEMA core, pricelist, settings_hub
[ ] Run: alembic upgrade head
[ ] Verify schemas created

✅ DoD Day 2:
  □ FastAPI starts in Docker
  □ /api/health returns 200
  □ PostgreSQL accepts connections from backend
  □ All 3 schemas created
  □ Alembic migration tested
```

---

### Day 3 (Wednesday) — Frontend Skeleton

**Goal:** Next.js app loads + Tailwind/shadcn working

```
🕐 Next.js setup (3-4 hours)

[ ] frontend/ — Next.js 14 init (App Router)
    npx create-next-app@latest frontend --typescript --tailwind --app

[ ] Configure:
    - Tailwind config
    - tsconfig.json (strict mode)
    - next.config.js
    - Path aliases (@/components, @/lib)

[ ] Install dependencies:
    - shadcn/ui (npx shadcn-ui init)
    - @tanstack/react-query
    - zustand
    - react-hook-form + zod
    - lucide-react (icons)
    - axios (or fetch wrapper)

[ ] Generate shadcn/ui components:
    - Button, Input, Card, Dialog, Form

[ ] frontend/app/layout.tsx
    - Root layout
    - QueryClientProvider
    - Theme provider (Tailwind dark mode)

[ ] frontend/app/page.tsx — placeholder home
[ ] frontend/app/login/page.tsx — placeholder login

🕐 Connect FE → BE (1-2 hours)

[ ] frontend/lib/api.ts — Axios instance with base URL
[ ] Test: Home page calls /api/health and displays status
[ ] Verify in browser

✅ DoD Day 3:
  □ Next.js app loads at localhost:3000
  □ Tailwind classes work
  □ shadcn Button renders
  □ Login page placeholder exists
  □ FE successfully calls BE /api/health
```

---

### Day 4 (Thursday) — Nginx + Cloudflare Tunnel

**Goal:** External access via app.giantwillow.com works

```
🕐 Nginx reverse proxy (2 hours)

[ ] infra/nginx/nginx.conf
    - Upstream: frontend:3000, backend:8000
    - Server block:
      - / → frontend
      - /api/ → backend
      - /ws → backend WebSocket
    - Headers: X-Forwarded-For, X-Real-IP
    - Static caching

[ ] docker-compose update:
    - nginx service exposes :80
    - frontend + backend on internal network only

[ ] Test locally: localhost → frontend served via Nginx
[ ] Test API: localhost/api/health → 200

🕐 Cloudflare Tunnel (2-3 hours)

[ ] Install cloudflared on Spark #1
[ ] Configure tunnel (using Owner's prepared credentials):
    cloudflared tunnel run tkc-superapp

[ ] Cloudflare DNS:
    A record: app.giantwillow.com → Tunnel
    
[ ] Test: https://app.giantwillow.com loads frontend
[ ] Test: https://app.giantwillow.com/api/health → 200
[ ] Verify SSL/TLS via Cloudflare

🕐 CI/CD setup (1-2 hours)

[ ] .github/workflows/ci.yml:
    - Lint (eslint, ruff)
    - Type check (tsc, mypy)
    - Test (vitest, pytest)
    - Build Docker images
    
[ ] .github/workflows/deploy.yml:
    - On main merge → deploy to Spark #1 (SSH)
    - Run docker compose pull + restart
    - Health check post-deploy

[ ] Test CI: open PR → CI runs
[ ] Test CD: merge → auto-deploy

✅ DoD Day 4:
  □ Nginx reverse proxy working
  □ https://app.giantwillow.com loads
  □ HTTPS via Cloudflare working
  □ CI runs on PR
  □ CD auto-deploys to Spark #1
```

---

### Day 5 (Friday) — Core Database Schema

**Goal:** All Phase 1 core tables exist

```
🕐 Migration files (3-4 hours)

Create migrations for core schema:

[ ] core/users table
[ ] core/groups table
[ ] core/user_groups_membership
[ ] core/pins table
[ ] core/devices table
[ ] core/device_requests table
[ ] core/audit_log table (hot tier)
[ ] core/audit_archive_index table
[ ] core/modules table
[ ] core/module_group_permissions table
[ ] core/ai_agents table
[ ] core/agent_request_log table
[ ] core/agent_nonces table
[ ] core/files table
[ ] core/notifications table
[ ] core/user_favorites table

🕐 Test Migrations (1 hour)

[ ] alembic upgrade head — runs cleanly
[ ] alembic downgrade -1 — rolls back cleanly
[ ] Verify with psql: \dt core.*

🕐 Seed Data (1 hour)

[ ] Migration: seed default groups
    - Admin, B-Tire Sales, Dealer Sales, Counter, ลูกค้า
    
[ ] Migration: seed default module
    - core (settings hub is its own module)
    
[ ] Migration: create first admin user
    - Username: chibanoi
    - Default password (must change first login)

✅ DoD Day 5 / End of Week 1:
  □ All core.* tables created
  □ Migrations up/down both work
  □ Default groups seeded
  □ First admin user exists
  □ Database state matches ERD
```

---

### Weekend Break (Sat-Sun)

```
Optional:
  - Review Week 1 progress
  - Plan Week 2 details
  - Read up on shadcn/ui patterns
  - No coding required
```

---

## Week 2 — Daily Breakdown

### Day 6 (Monday) — Auth Service Backend

**Goal:** Login/logout/refresh endpoints work

```
🕐 Backend auth (full day, 6-7 hours)

[ ] backend/core/auth/models.py
    - User model
    - Group model
    - PIN model

[ ] backend/core/auth/schemas.py (Pydantic)
    - LoginRequest, LoginResponse
    - RefreshRequest, RefreshResponse
    - PinEntryRequest

[ ] backend/core/auth/service.py
    - hash_password (argon2)
    - verify_password
    - create_access_token (JWT, 15 min)
    - create_refresh_token (JWT, 30 days)
    - validate_token

[ ] backend/core/auth/routes.py
    - POST /api/auth/login
    - POST /api/auth/refresh
    - POST /api/auth/logout
    - POST /api/auth/pin (for shared accounts)
    - GET /api/auth/me

[ ] Lockout logic
    - Redis: track failed attempts per (device, username)
    - 5 fails → 5 min lockout
    - Auto-unlock

[ ] Tests:
    - Successful login
    - Wrong password (1, 5 attempts)
    - Refresh token works
    - Logout invalidates
    - PIN entry for shared

✅ DoD Day 6:
  □ POST /api/auth/login works (Postman/curl)
  □ JWT returned and verifiable
  □ Refresh flow works
  □ Lockout after 5 fails
  □ Unit tests pass
  □ Audit log entry created on each event
```

---

### Day 7 (Tuesday) — Auth Service Frontend

**Goal:** Login page works end-to-end

```
🕐 Login UI (full day)

[ ] frontend/lib/auth/store.ts
    - Zustand store: user, isAuthenticated, login(), logout()

[ ] frontend/lib/auth/api.ts
    - login(), logout(), refresh(), me()
    - Auto-refresh on 401

[ ] frontend/app/login/page.tsx
    - Form with react-hook-form
    - Username + password fields
    - Submit → call API
    - Error handling
    - Loading state
    - Redirect on success

[ ] frontend/components/AuthGuard.tsx
    - Wraps protected routes
    - Redirects to /login if not authenticated

[ ] frontend/app/layout.tsx
    - Wrap with auth provider
    - Token in HttpOnly cookies (server-side)

[ ] Tests:
    - Login form renders
    - Submit calls API
    - Success redirects
    - Error shown on failure

✅ DoD Day 7:
  □ Login form fully functional
  □ Successful login → dashboard placeholder
  □ Failed login shows error
  □ Logout works
  □ JWT in HttpOnly cookie
  □ /api/auth/me retrieves current user
```

---

### Day 8 (Wednesday) — User Service Backend

**Goal:** User CRUD + Groups + PINs

```
🕐 User Service (full day)

[ ] backend/core/users/routes.py
    - GET /api/users (admin only)
    - POST /api/users (admin only)
    - GET /api/users/:id
    - PUT /api/users/:id (admin) / (self-limited)
    - DELETE /api/users/:id (admin only)
    - POST /api/users/:id/reset-password (admin)

[ ] backend/core/groups/routes.py
    - GET /api/groups
    - POST /api/groups
    - PUT /api/groups/:id (incl permissions)
    - DELETE /api/groups/:id

[ ] backend/core/pins/routes.py
    - GET /api/users/:id/pins
    - POST /api/users/:id/pins
    - DELETE /api/users/:id/pins/:pin_id

[ ] Permission middleware
    - Check user role/groups
    - Reject if insufficient permission
    - Audit log unauthorized attempts

[ ] Tests for each endpoint:
    - Happy path
    - Auth fail (401)
    - Permission fail (403)
    - Validation fail (422)

✅ DoD Day 8:
  □ Full CRUD for users via API
  □ Admin can create/edit/delete
  □ Self can edit limited fields
  □ Groups CRUD works
  □ Permissions enforced
  □ Audit log captures all
```

---

### Day 9 (Thursday) — Device Management

**Goal:** Device fingerprint + whitelist + approval

```
🕐 Device Service (full day)

[ ] backend/core/devices/service.py
    - Fingerprint generation logic
    - Check office IP range (192.168.10.0/24)
    - Auto-approve from office
    - Request workflow for external

[ ] backend/core/devices/routes.py
    - GET /api/devices (admin)
    - GET /api/users/me/devices
    - POST /api/devices/request
    - POST /api/devices/:id/approve (admin)
    - POST /api/devices/:id/block (admin)
    - POST /api/devices/:id/force-logout (admin)
    - DELETE /api/devices/:id (admin)

[ ] Integrate with login flow:
    - Check device fingerprint on login
    - If new + external → create request + reject login
    - If new + office → auto-approve

[ ] Frontend: Settings > Devices placeholder

[ ] Tests:
    - Office IP auto-approve
    - External IP creates request
    - Admin approval workflow
    - Force logout

✅ DoD Day 9:
  □ Device fingerprinting works
  □ Office IP auto-approves
  □ External device request flow
  □ Force logout invalidates JWT
  □ Audit log captures
```

---

### Day 10 (Friday) — Telegram Integration + Audit Log

**Goal:** Telegram bot sends alerts + audit log searchable

```
🕐 Telegram Service (3-4 hours)

[ ] backend/core/notifications/telegram.py
    - TelegramBot class
    - Send message
    - Format per severity (🔴🟡🟢⚪)
    - Quiet hours check (23:00-06:00)
    - Critical bypasses quiet hours

[ ] backend/core/notifications/service.py
    - Notification service
    - Dispatch to: in-app + telegram + (future: web push)
    - User preferences honored

[ ] Test: send test message from API

🕐 Audit Log Service (3-4 hours)

[ ] backend/core/audit/service.py
    - log_event() helper
    - 3-tier query logic (hot/warm/cold)
    - Format normalization

[ ] backend/core/audit/routes.py
    - GET /api/audit (filtered)
    - GET /api/audit/:id
    - Query params: date, user, action, severity, module

[ ] Integrate audit calls throughout:
    - Auth events (login, logout, fail)
    - User CRUD events
    - Device events
    - Telegram delivery confirms

[ ] Tests:
    - Audit log creation
    - Query with filters
    - Severity classification

✅ DoD Day 10 / End of Week 2:

🎯 GATE 1 CRITERIA:
  □ All services running in Docker ✅
  □ PostgreSQL accepts connections ✅
  □ Redis accepts connections ✅
  □ Nginx serves frontend ✅
  □ Cloudflare Tunnel routes ✅
  □ HTTPS works ✅
  □ FastAPI healthy ✅
  □ Database migrations clean ✅
  □ Core schemas created ✅
  □ Next.js app loads ✅
  □ Login page functional ✅
  □ Telegram bot delivers messages ✅
  □ Audit log captures events ✅
  □ CI/CD pipeline working ✅

→ Pass Gate 1 → Proceed to Week 3
```

---

## Sprint Retrospective Template (End of Week 2)

```
## Week 1-2 Retro — Date: ___________

### What went well
- 
- 
- 

### What was hard
- 
- 
- 

### What to change for Week 3-4
- 
- 
- 

### Velocity check
- Stories completed: __ / __
- Tasks completed: __ / __
- DoD adherence: __%

### Blockers
- 
- 

### Owner Action Items
- [ ] 
- [ ] 

### Next Sprint Goal
- 
```

---

## Tools & Resources

### Development Workflow

```
Each task workflow:
  1. Pick task from sprint plan
  2. Create branch: feature/{task-name}
  3. Code (small commits)
  4. Run tests locally
  5. Push branch
  6. Open PR
  7. Self-review (or Claude review)
  8. CI runs (green)
  9. Merge to main
  10. Auto-deploy to staging
  11. Smoke test
  12. Mark DoD checklist complete
```

### Claude Superskills Usage

```
Start of week:
  - writing-plans skill: Break down weekly tasks

Per task:
  - executing-plans skill: Implement step by step
  - prompt-engineer skill: Refine Claude prompts

Reviews:
  - senior-solution-architect skill: Code review

When stuck:
  - brainstorming skill: Explore alternatives
  - deep-research skill: Investigate libraries
```

### Daily Pair Programming Pattern

```
Owner: Decides direction, reviews
Claude: Generates code, suggests options
Both: Verify result against DoD

Iteration cycle:
  1. Plan task (5 min)
  2. Write code (Claude or Owner)
  3. Test (Owner verifies)
  4. Refine (both iterate)
  5. Commit (Owner approves)
```

---

## Risk Mitigation This Sprint

```
Risk 1: Docker complexity on Spark #1
  Mitigation: Test locally first, then deploy
  
Risk 2: Cloudflare Tunnel config issues
  Mitigation: Day 4 buffer for troubleshooting
  
Risk 3: First-time Next.js 14 App Router patterns
  Mitigation: Use shadcn/ui templates
  
Risk 4: Owner unfamiliar with Alembic
  Mitigation: Day 5 buffer + Claude guides
  
Risk 5: Telegram API rate limits
  Mitigation: Single bot, low volume initially
```

---

## Week 3-4 Preview (next sprint)

```
Week 3: Notifications + Audit (deep)
  - Notification user preferences UI
  - Audit log viewer UI
  - Search/filter
  - Export CSV/PDF

Week 4: Settings Hub UI
  - User management UI (Admin)
  - Groups + permissions UI
  - Device management UI
  - Security policy UI

End of Week 4 = Almost Gate 2 (need 2 more weeks for completion)
```

---

**End of Sprint W1-W2 Plan v1.0**

| Version | Date | Notes |
|---|---|---|
| 1.0 | 2026-05-12 | Initial detailed plan for Week 1-2 (Foundation) |
