# PRD: TKC SuperApp v2.0 — Web-First Multi-Module Platform

| Field | Value |
|---|---|
| **Document Type** | Master Architecture PRD |
| **Version** | 2.0 (Web-First Pivot) |
| **Date** | 2026-05-12 |
| **Owner** | ชิบะน้อย (TKC AUTO PLUS) |
| **Project Code** | TKC-SUPERAPP |
| **Status** | Architecture Locked — Phase 1 Ready |
| **Previous** | v1.0 (Native-First, superseded) |

---

## 1. Executive Summary

TKC SuperApp = **single web-based platform** ที่รวมทุกเครื่องมือทำงานของพนักงาน TKC AUTO PLUS เข้าเป็นแอปเดียว

**Core Tenets:**
- 🌐 **Web-First** — รันได้ทุกที่ผ่าน browser
- 📦 **Single Codebase** — React/Next.js ทั้งหมด
- 📱 **PWA-installable** — ใช้เหมือนแอปจริง
- 🔌 **Modular** — เพิ่ม module ได้ไม่กระทบของเดิม
- 🔐 **Unified Identity** — login เดียวข้ามทุก module

---

## 2. Vision

> **"พนักงาน TKC ทุกตำแหน่งใช้แอปเดียว — เปิด browser → ทำงานได้ทันที"**

### 2.1 Goals

| Goal | Target |
|---|---|
| Cross-platform reach | iOS / Android / Windows / Mac / Linux |
| App distribution | Zero — เปิด URL ก็ใช้ได้ |
| Onboarding speed | < 1 วัน per พนักงานใหม่ |
| Update frequency | Daily-capable (no store approval) |
| Codebase count | 1 (web) + 0-1 optional wrapper |
| Mass adoption | High — browser = universal |

### 2.2 Non-Goals
- ❌ Pure native iOS/Android apps (defer to wrapper if needed)
- ❌ Heavyweight desktop-only software
- ❌ Per-platform UI variation

---

## 3. Architecture

### 3.1 High-Level Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│              🌐 USER ACCESS LAYER (One Codebase)                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  📱 Mobile Browser              💻 Desktop Browser                │
│  Safari iOS / Chrome Android    Chrome / Edge / Safari            │
│  └─ PWA Install                 └─ PWA Install                    │
│                                                                   │
│  🔧 Optional Wrappers (Phase 2+):                                 │
│  ┌───────────────────┐    ┌──────────────────────┐               │
│  │ Tauri (.exe)      │    │ Capacitor (Phase 3)  │               │
│  │ Win / Mac / Linux │    │ iOS App / Android APK│               │
│  │ Admin desktop     │    │ Background GPS/Camera│               │
│  └───────────────────┘    └──────────────────────┘               │
│                                                                   │
│  All use: SAME React/Next.js codebase                            │
└────────────────────────────────────┬────────────────────────────┘
                                     │ HTTPS
                                     ▼
                          ┌─────────────────────┐
                          │  API Gateway         │
                          │  (FastAPI)           │
                          │  Auth + Routing      │
                          └──────────┬──────────┘
                                     │
        ┌────────────────────────────┼────────────────────────────┐
        ▼                            ▼                            ▼
┌──────────────────┐         ┌──────────────────┐         ┌──────────────────┐
│ CORE SERVICES    │         │ MODULE SERVICES  │         │ INTEGRATIONS     │
│ (shared)         │         │ (per module)     │         │                  │
├──────────────────┤         ├──────────────────┤         ├──────────────────┤
│ • Auth           │         │ • Pricelist      │         │ • AIO MySQL      │
│ • Users          │         │ • Settings Hub   │         │ • Synology NAS   │
│ • Devices        │         │ • Check-in (P3)  │         │ • Telegram Bot   │
│ • Notifications  │         │ • Photo Rep (P3) │         │ • Google STT     │
│ • Audit Log      │         │ • Voice Rep (P3) │         │ • พอร์ช (Agent)  │
│ • Files          │         │ • ...            │         │                  │
│ • Search         │         │                  │         │                  │
└────────┬─────────┘         └────────┬─────────┘         └──────────────────┘
         │                            │
         └─────────────┬──────────────┘
                       ▼
            ┌──────────────────────────┐
            │  PostgreSQL 16           │
            │  • core.*                │
            │  • pricelist.*           │
            │  • settings_hub.*        │
            │  • checkin.* (P3)        │
            │  • photo_report.* (P3)   │
            │  • voice_report.* (P3)   │
            └──────────────────────────┘
            
            ┌──────────────────────────┐
            │  Redis 7 (Cache + Queue) │
            └──────────────────────────┘
```

### 3.2 Layer Responsibilities

| Layer | Responsibility |
|---|---|
| Frontend (Web) | UI rendering, PWA shell, offline cache |
| API Gateway | Auth check, rate limit, routing |
| Core Services | Shared business logic (users, audit, etc.) |
| Module Services | Module-specific logic |
| Database | Persistence with schema separation |
| Cache | Performance + queues |

---

## 4. Technology Stack

### 4.1 Frontend

| Aspect | Technology | Notes |
|---|---|---|
| Framework | React 18 + Next.js 14 (App Router) | Modern, fast, SSR |
| Language | TypeScript | Type safety |
| UI Library | shadcn/ui + Radix UI | Accessible components |
| Styling | Tailwind CSS | Utility-first |
| State (server) | TanStack Query (React Query) | Cache + sync |
| State (client) | Zustand | Lightweight |
| Forms | react-hook-form + Zod | Validation |
| Spreadsheet | Univer (desktop only) | Excel-like UI |
| Mobile table | TanStack Table | Simple tabular |
| Charts | Recharts | Dashboards |
| Maps | Leaflet (Phase 3) | Check-in locations |
| PWA | next-pwa + Workbox | Service Worker |
| Offline DB | IndexedDB (via Dexie) | Local cache |
| WebSocket | Native WebSocket API | Real-time |
| Push | Web Push API | Notifications |
| Camera | MediaDevices API | Phase 3 |
| GPS | Geolocation API | Phase 3 |
| Audio | MediaRecorder API | Phase 3 |
| Voice STT | Web Speech API + Google STT | Phase 3 |

### 4.2 Backend

| Aspect | Technology |
|---|---|
| Framework | FastAPI (Python 3.11+) |
| Database | PostgreSQL 16 + pgvector |
| Cache | Redis 7 |
| Queue | Redis (Pub/Sub) + APScheduler |
| Real-time | WebSocket (FastAPI) |
| Auth | JWT (PyJWT) + Argon2 password hashing |
| File storage | Synology NAS (SMB/NFS mount) |
| Sync | Python + MySQL connector |
| Speech-to-Text | Google Cloud Speech-to-Text |
| Image processing | Pillow + opencv-python |

### 4.3 Optional Wrappers

| Wrapper | Purpose | When |
|---|---|---|
| Tauri 2.x | Desktop .exe (Win/Mac/Linux) | Phase 2 — Admin desktop convenience |
| Capacitor 6+ | Mobile native shells (iOS/Android) | Phase 3 — background GPS, advanced camera |

**Strategy:** Web App primary. Wrappers = bonus convenience, not required.

### 4.4 Infrastructure

| Component | Where |
|---|---|
| Frontend | Spark #1 (Nginx serve static + Next.js SSR) |
| API | Spark #1 (FastAPI behind Nginx) |
| Database | Spark #1 (PostgreSQL) |
| Cache | Spark #1 (Redis) |
| AIO Sync | Spark #1 (Python service) |
| AI inference | Spark #2-4 (per role) |
| File storage | Synology NAS |
| External access | Cloudflare Tunnel + Access |
| Monitoring | Grafana + Prometheus |

---

## 5. User App (Web)

### 5.1 Dashboard (Module Picker)

```
┌──────────────────────────────────────────┐
│ 🚗 TKC          ชิบะน้อย ▾  🔔3  🌙       │
├──────────────────────────────────────────┤
│                                            │
│ 📱 Welcome back!                          │
│                                            │
│ Modules (ของคุณ):                          │
│ ┌────────┐ ┌────────┐ ┌────────┐         │
│ │   💰   │ │   📍   │ │   📷   │         │
│ │Pricelist│ │CheckIn │ │ Photo  │         │
│ │        │ │ (P3)   │ │ Report │         │
│ └────────┘ └────────┘ └────────┘         │
│ ┌────────┐ ┌────────┐ ┌────────┐         │
│ │   🎙️   │ │   📊   │ │   ⚙️   │         │
│ │ Voice  │ │ Stats  │ │Settings│         │
│ │ Report │ │ (P4)   │ │  Hub   │         │
│ └────────┘ └────────┘ └────────┘         │
│                                            │
│ 🕐 Recent Activity:                       │
│ • Pricelist: เปลี่ยน favorite 245/45R19    │
│ • Check-in: ร้านสมจิตร 11:30               │
│                                            │
│ 🔔 Notifications  📋 History              │
└──────────────────────────────────────────┘
```

### 5.2 Responsive Strategy

| Device | Layout |
|---|---|
| 📱 Mobile (<768px) | 1-column, large touch targets, bottom nav |
| 📱 Tablet (768-1024px) | 2-column, sidebar drawer |
| 💻 Desktop (>1024px) | 3-column, full sidebar |

**Univer rule:** Desktop only (mobile shows simplified table view)

### 5.3 PWA Features

- ✅ "Add to Home Screen" prompt
- ✅ Service Worker — offline read-only fallback
- ✅ Background sync (when online again)
- ✅ Push notifications (Web Push API, iOS 16.4+)
- ✅ App icon, splash screen
- ✅ Standalone display (no browser chrome)

### 5.4 Offline Capability

```
ONLINE:
  WebSocket connected → real-time updates
  Direct API calls
  
OFFLINE:
  Read from IndexedDB cache
  Queue write actions
  Show indicator "🔌 Offline mode"
  
RECONNECT:
  Replay queued actions
  Refresh from API
  Show "✅ Synced"

Cache:
  - User profile + groups (always)
  - Pricelist viewed in last 7 วัน (Pricelist module)
  - Recent searches
  - Favorites
  - Last 100 notifications
```

---

## 6. Admin App (Web)

### 6.1 Admin = Same Web App, Different Permissions

ไม่มี admin app แยก — Admin = role-based features:

```
User opens https://app.tkc.local/
   ↓
Login → JWT มี role/groups
   ↓
Routes filtered:
  ✅ /pricelist          (all users)
  ✅ /pricelist/edit     (Admin only)
  ✅ /pricelist/schedule (Admin only)
  ✅ /settings           (Admin only)
  ✅ /audit              (Admin only)
```

### 6.2 Optional Tauri Wrapper (Phase 2)

Wrap web app เป็น .exe สำหรับ admin desktop:
- ✅ Native window controls
- ✅ Faster file operations (export PDF)
- ✅ System tray integration
- ✅ Same codebase

**Not required** — admin can use browser fine.

---

## 7. Core Services

### 7.1 Auth Service

```
Endpoints:
  POST /api/auth/login         {username, password}
  POST /api/auth/refresh       {refresh_token}
  POST /api/auth/logout
  POST /api/auth/pin           {pin}  (shared accounts)
  GET  /api/auth/me            (current user info)

Features:
  - JWT (15 min access + 30 day refresh)
  - Device fingerprint
  - IP-based rules (office vs external)
  - Login lockout (5 fails / 5 min)
  - 1-session enforcement (Dealer Sales)
```

### 7.2 User Service

```
Endpoints:
  GET    /api/users              (Admin only)
  POST   /api/users              (Admin only)
  PUT    /api/users/:id          (Admin) / (self - limited)
  DELETE /api/users/:id          (Admin only)
  GET    /api/users/me/devices
  POST   /api/users/me/devices/request
  
Self-editable fields:
  - Password
  - Display name  
  - Telegram config
  - Notification prefs
  - Theme
```

### 7.3 Group / Permission Service

```
- 4 default groups
- ≤10 custom groups
- User in ≤3 groups (union perms)
- Per-module access (none/read/write/admin)
- Column visibility (Pricelist)
- Cross-module permission matrix
```

### 7.4 Device Service

```
- Fingerprint (hash of UA + canvas + screen)
- Whitelist required for external IP
- Auto-approve from office IP range
- Admin approval for external devices
- Force logout / block / delete
```

### 7.5 Notification Service

```
Channels:
  - In-app inbox (unified)
  - Web Push (PWA)
  - Telegram (admin bot + per-user)
  
Events:
  - core.* (security, devices)
  - pricelist.* (price changes, sync)
  - checkin.* (Phase 3)
  - etc.
  
Filters per user:
  - Severity threshold
  - Module subscription
  - Quiet hours
```

### 7.6 Audit Log Service

```
3-Tier Storage:
  Hot:  PostgreSQL (0-3 months) — fast query
  Warm: Local SSD (.jsonl.gz)   — 3 months-1 year
  Cold: NAS (.jsonl.gz)          — 1-3 years
  Purge: > 3 years

Coverage: ALL events (auth, edit, sync, security, etc.)
Cross-module: Each event has module_code
Query API: filtered by date/user/module/severity
```

### 7.7 File Service

```
Storage:
  Local SSD: hot files (recent images, working files)
  NAS:       archived files (>30 days, voice, photos)
  
Operations:
  Upload (with antivirus scan)
  Resize/compress
  CDN-style delivery (Nginx with cache headers)
  Metadata + tagging
```

### 7.8 Search Service

```
Per-module search initially (Phase 1)
Cross-module search (Phase 4+)

Backend:
  pg_trgm + subsequence in application layer
  Redis cache top queries
  
Frontend:
  Search bar (global, in app header)
  Voice search (Web Speech API)
  Recent + Favorites
```

### 7.9 AI Agent Gateway

```
Endpoint: /api/agent/*
Access: LAN only (192.168.x.x)
Auth: API Key + HMAC + IP whitelist
Rotation: Auto 180 days
Scope: Logs + system health (no business data)

For: พอร์ช (TKC's master agent on Mac Mini M4)
```

---

## 8. Module System

### 8.1 Module Registry

```sql
CREATE TABLE core.modules (
  id              UUID PRIMARY KEY,
  code            VARCHAR(50) UNIQUE,
  name            VARCHAR(100),
  name_th         VARCHAR(100),
  icon            VARCHAR(20),
  version         VARCHAR(20),
  is_active       BOOLEAN,
  api_prefix      VARCHAR(50),
  ui_path         VARCHAR(100),
  installed_at    TIMESTAMP
);

CREATE TABLE core.module_group_permissions (
  module_id       UUID,
  group_id        UUID,
  access_level    VARCHAR(20),  -- none/read/write/admin
  custom_config   JSONB,
  PRIMARY KEY (module_id, group_id)
);
```

### 8.2 Frontend Module Pattern

```
src/
├── core/                    # Shared
│   ├── auth/
│   ├── user/
│   ├── notifications/
│   ├── audit/
│   └── ui/                  # shadcn components
├── modules/
│   ├── pricelist/           # Module folder
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── pages/
│   │   ├── api/
│   │   └── index.ts
│   ├── settings-hub/
│   ├── checkin/             # Phase 3
│   └── ...
└── app/                     # Next.js routes
    ├── layout.tsx
    ├── page.tsx             # Dashboard
    ├── pricelist/
    ├── settings/
    └── ...
```

**Lazy loading:** Each module = code-split chunk → fast initial load

### 8.3 Backend Module Pattern

```
backend/
├── core/
│   ├── auth/
│   ├── users/
│   ├── notifications/
│   ├── audit/
│   └── shared/
├── modules/
│   ├── pricelist/
│   │   ├── routes.py
│   │   ├── models.py
│   │   ├── service.py
│   │   ├── migrations/
│   │   └── tests/
│   ├── settings_hub/
│   ├── checkin/             # Phase 3
│   └── ...
├── gateway/
│   ├── middleware.py
│   └── routing.py
└── main.py
```

---

## 9. Module Roadmap

### Phase 1 — Foundation (Now — 22 weeks)
```
✅ Core Services (auth, users, devices, notifications, audit, files)
✅ Module Registry + API Gateway
✅ Pricelist Module (full features)
✅ Settings Hub
✅ Web App PWA
```

### Phase 2 — Polish (Weeks 23-30)
```
🟡 Tauri wrapper (admin desktop .exe)
🟡 Web Push notifications
🟡 Performance optimization
🟡 Comprehensive testing
```

### Phase 3 — Field Modules (3-6 months later)
```
📍 Check-in Module (GPS, LINE/SMS fallback)
📷 Photo Report Module
🎙️ Voice Report Module (Google STT)
📱 Capacitor wrappers (iOS/Android — if needed)
```

### Phase 4+ — Business Modules
```
📊 Sales Stats
💼 CRM (lite)
🚚 Delivery Tracking
🎫 Service Tickets
💬 Internal Chat
```

---

## 10. Cross-Module Identity & Permissions

### 10.1 User Identity

```
ONE user account → ALL modules
Same JWT works for all module APIs
No re-login per module
```

### 10.2 Permission Matrix Example

```
Group: 🛞 เซลล์ยางใหญ่

Module Access:
  💰 Pricelist     →  Read (B2C view: ราคาขายเท่านั้น)
  📍 Check-in (P3) →  Write (record visits)
  📷 Photo Rep (P3)→  Write (own only)
  🎙️ Voice Rep (P3)→  Write (own only)
  📊 Sales Stats   →  Read (personal)
  ⚙️ Settings Hub  →  Read profile only
```

---

## 11. Data Strategy

### 11.1 Schema Separation

```
PostgreSQL
├── core/              (shared)
│   ├── users
│   ├── groups
│   ├── devices
│   ├── audit_log
│   ├── notifications
│   ├── files
│   ├── modules
│   └── settings
└── modules/
    ├── pricelist.*    (Phase 1)
    ├── settings_hub.* (Phase 1)
    ├── checkin.*      (Phase 3)
    ├── photo_report.* (Phase 3)
    └── voice_report.* (Phase 3)
```

### 11.2 Schema Evolution
- Each module has own `migrations/` folder
- Alembic for Python migrations
- Backward-compatible changes only
- Major changes → versioned migration with downtime plan

### 11.3 Storage Tiers

| Tier | Where | Size | Speed |
|---|---|---|---|
| Hot | PostgreSQL | Live data | < 100ms |
| Warm | Local SSD | Audit warm + cache | < 1s |
| Cold | Synology NAS | Audit cold + archive | < 30s |
| Archive | Tape (future) | Compliance | minutes |

---

## 12. Non-Functional Requirements

| Aspect | Target |
|---|---|
| Initial page load | < 3s on 4G |
| Subsequent navigation | < 500ms (cached) |
| API response | < 200ms (p95) |
| WebSocket latency | < 100ms (LAN) |
| Concurrent users | 30 sustained / 100 peak |
| Uptime | 99% (7:00-22:00 working hours) |
| Browser support | Chrome/Safari/Edge last 2 versions |
| Mobile OS | iOS 15+, Android 10+ |
| Offline | Read-only cache works |
| PWA install | Working on iOS 16.4+, Android Chrome |
| Search | < 200ms |
| Audit retention | 3 years (3-tier) |

---

## 13. Security

### 13.1 Authentication
- JWT (access 15min + refresh 30 days)
- Device fingerprint + IP whitelist
- 5-fail lockout / 5 min
- Per-role auto-logout

### 13.2 Data
- TLS 1.3 (Cloudflare Tunnel)
- Argon2 password hashing
- Encrypted secrets (Telegram tokens, etc.)
- Cipher #1 + #2 for Pricelist data

### 13.3 Audit
- All actions logged
- 3-tier storage
- AI Agent access tracked separately
- Real-time alerts (Telegram critical)

### 13.4 Privacy
- LAN-only AI Agent
- No tracking analytics by default
- Audit log search restricted (Admin only)

---

## 14. Open Questions

### P0 (Blockers)
- [ ] AIO API documentation
- [ ] AIO database schema
- [ ] Office network IP range
- [ ] Synology NAS spec + access

### P1 (Important)
- [ ] Tablet ในร้านมีกี่เครื่อง
- [ ] Telegram Bot — existing or new?
- [ ] Domain name (app.tkc.local? tkc.co?)
- [ ] HTTPS certificate (Cloudflare? Let's Encrypt?)
- [ ] Backup strategy detail

### P2 (Phase 3 Considerations)
- [ ] LINE bot integration design
- [ ] GPS tracking interval
- [ ] Photo compression strategy
- [ ] Voice file format

---

## 15. Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| iOS PWA limitations | Medium | Capacitor wrapper if push critical |
| Univer too heavy on mobile | Medium | Mobile = simplified view |
| Module coupling | Low | Schema separation + event bus |
| Offline sync conflicts | Medium | Last-write-wins + audit |
| NAS offline | Low | Hot/warm fallback |
| Storage growth | Medium | Compression + NAS tier |
| Single point of failure (Spark #1) | High | Backup + monitoring + Spark #2 standby (future) |

---

## 16. Success Metrics

| Metric | Baseline | Target |
|---|---|---|
| Time to onboard new user | 2 weeks | < 1 day |
| Cross-platform support | 0 | 5+ (iOS/Android/Win/Mac/Linux) |
| Update deployment time | Days | Minutes |
| App store dependency | Yes | No (PWA primary) |
| Codebase count | 3 (Native iOS + Android + Web) | 1 (Web) |
| Development cost | Baseline | -60% (1 codebase) |
| User satisfaction | TBD | > 80% (NPS) |

---

## 17. Phase Roadmap Detail

### Phase 1 (Weeks 1-22) — Foundation + Pricelist

**Core Services (Weeks 1-6):**
- Auth, Users, Devices, Notifications, Audit, Files, Search
- API Gateway with module routing
- Module Registry

**Frontend Shell (Weeks 5-10):**
- Next.js setup
- shadcn/ui components
- Auth UI
- Dashboard
- Module loader
- PWA configuration
- Offline support

**Pricelist Module (Weeks 7-18):**
- Universal Schema Engine
- Cipher system
- Editor (Univer desktop)
- Mobile viewer (simplified)
- Click-for-details popups
- Search (subsequence + voice)
- Bundle system
- CR system
- Migration (3-Round)
- AIO sync

**Settings Hub (Weeks 14-20):**
- Users + Groups + PINs
- Devices
- Security (password policy, lockout, auto-logout)
- Notifications config
- Branding (logo)
- NAS configuration
- Audit log viewer
- AI Agent management
- Module registry UI
- System health

**Testing + Polish (Weeks 20-22):**
- E2E testing
- Performance optimization
- Documentation
- Training materials
- Go-live preparation

### Phase 2 (Weeks 23-30) — Wrappers + Push

- Tauri wrapper for admin desktop
- Web Push notification (with Telegram fallback)
- Performance tuning
- Bug fixes from production
- User feedback iterations

### Phase 3 (3-6 months) — Field Modules

See individual PRDs:
- 04_PRD_Phase3_Modules_Briefs.md

### Phase 4+ — Business Modules

Future PRDs:
- Sales Stats
- CRM (lite)
- Delivery Tracking
- Service Tickets
- Internal Chat

---

## 18. Appendices

### Appendix A: Repository Structure

```
tkc-superapp/
├── frontend/
│   ├── src/
│   │   ├── app/             (Next.js routes)
│   │   ├── core/            (shared)
│   │   └── modules/         (per module)
│   ├── public/
│   ├── next.config.js
│   └── package.json
├── backend/
│   ├── core/                (shared services)
│   ├── modules/             (per module)
│   ├── gateway/
│   ├── alembic/             (migrations)
│   └── pyproject.toml
├── infra/
│   ├── docker-compose.yml
│   ├── nginx/
│   └── postgres/
├── docs/                    (PRDs, ADRs)
└── README.md
```

### Appendix B: API Endpoints (Core)

```
POST   /api/auth/login
POST   /api/auth/refresh
POST   /api/auth/logout
POST   /api/auth/pin

GET    /api/users
POST   /api/users
GET    /api/users/me
PUT    /api/users/me

GET    /api/groups
POST   /api/groups

GET    /api/devices
POST   /api/devices/request
POST   /api/devices/:id/approve

GET    /api/notifications
PUT    /api/notifications/:id/read

GET    /api/audit
GET    /api/audit/:id

POST   /api/files
GET    /api/files/:id

GET    /api/modules
PUT    /api/modules/:code/permissions

# Module-specific
GET    /api/pricelist/...
GET    /api/settings/...

# AI Agent (LAN only)
GET    /api/agent/audit/*
GET    /api/agent/nas/*
GET    /api/agent/system/*
```

### Appendix C: Deployment

```
Single Spark #1 deployment:

services:
  nginx:        Port 80/443 (reverse proxy + static)
  frontend:     Port 3000 (Next.js SSR)
  backend:      Port 8000 (FastAPI)
  postgres:     Port 5432 (internal)
  redis:        Port 6379 (internal)
  sync_service: Background (AIO sync)

Cloudflare Tunnel → Nginx → routes to frontend/backend
```

---

**End of TKC SuperApp PRD v2.0**

---

## Document History

| Version | Date | Notes |
|---|---|---|
| 1.0 | 2026-05-12 | Native-first (deprecated) |
| **2.0** | **2026-05-12** | **Web-First pivot — multi-platform via PWA + optional wrappers** |
