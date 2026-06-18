# PRD: TKC Settings Hub v1.0

| Field | Value |
|---|---|
| **Document Type** | Module PRD (sub of SuperApp) |
| **Version** | 1.0 |
| **Date** | 2026-05-12 |
| **Owner** | ชิบะน้อย (TKC AUTO PLUS) |
| **Module Code** | `settings_hub` |
| **API Prefix** | `/api/settings` |
| **UI Path** | `/settings` |
| **Status** | Design Complete |
| **Parent** | PRD_TKC_SuperApp_v2.md |

---

## 1. Module Overview

### 1.1 Purpose
จุดเดียวสำหรับ Admin จัดการเรื่อง **cross-module**:
- Users, Groups, PINs
- Devices + Whitelist
- Security policies
- Notifications config
- Audit log viewer
- NAS storage
- AI Agent management
- Module Registry
- System branding
- Infrastructure health

### 1.2 Access
- **Admin only** — ทุก feature
- เปิดผ่าน Dashboard → /settings

---

## 2. Sections Overview

```
⚙️ Settings Hub
├── 👥 Users & Groups        ← Users, Groups, PINs management
├── 📱 Devices                ← Whitelist, approvals, force logout
├── 🔐 Security               ← Password policy, lockout, auto-logout
├── 🔔 Notifications          ← Telegram config, alert filters
├── 📋 Audit Log              ← View, filter, export, retention
├── 📡 NAS Storage            ← Connection, health check, paths
├── 🤖 AI Agents              ← Agent gateway, keys, IP whitelist
├── 🧩 Modules                ← Installed list, enable/disable, permissions
├── 🎨 Branding               ← Logo, colors, display preferences
├── 📊 System Health          ← Spark status, DB, AIO sync, queues
├── 🔑 Cipher (Pricelist)     ← Setup wizard, change, backup card
└── 📈 Reports                ← Cross-module analytics
```

---

## 3. Section Details

### 3.1 👥 Users & Groups

```
[👤 Users]  [👥 Groups]  [🔑 PINs]  [📋 Activity]

Users:
  Search + Filter (Group, Status)
  Card-style list:
    Username, role, devices, last login
    Groups membership
    Actions: Edit, Reset PW, View Activity, Delete

Add User:
  Personal vs Shared account
  Username + Password (auto-gen or custom)
  Groups (≤3)
  Optional: Email, Phone, Telegram

Edit (Admin): All fields
Self-Edit: Password, Display Name, Telegram, Notifications, Theme
```

### 3.2 👥 Groups

```
Default (built-in, editable):
  🔧 Admin
  🛞 เซลล์ยางใหญ่
  🏪 เซลล์ดูแลร้านค้า
  🛒 พนักงานหน้าร้าน
  👁️ ลูกค้า (P2)

Custom (max 10)

Per group:
  Name, description, color/icon
  Module permissions matrix:
    💰 Pricelist     [Read column subset ▾]
    📍 Check-in (P3) [Write ▾]
    📷 Photo Rep (P3)[Write ▾]
    ⚙️ Settings      [None ▾]
  Members list
```

### 3.3 🔑 PIN Manager (Shared accounts)

```
PIN List:
  1234  น้องมิ้ว    🟢 Active   Last: 5 min
  5678  น้องเอ     🟢 Active   Last: 1 hr
  3456  น้องบีม    🚫 Disabled
  
Settings:
  PIN length: 4 / 6 digit
  Uniqueness: System-wide (no duplicates)
  Reuse policy: 90 days before reuse
```

### 3.4 📱 Devices

```
Layout per user:

👤 ชิบะน้อย (Admin)
  📱 iPhone 15 (Safari)    🟢 Online   192.168.1.45
     [Remove] [Block] [Force Logout]
  💻 MacBook Pro (Chrome)  🟢 Online
  💻 PC Office (Edge)      ⚪ Offline

Pending Approvals:
  📱 Samsung S24 (Chrome) by เซลล์ B
     10 min ago | IP: 49.x.x.x (4G external)
     [Approve] [Reject]
```

### 3.5 🔐 Security

```
🔒 Password Policy
   Min length: 8 chars
   Composition: alphanumeric
   Username conflict: NOT allowed
   Re-use last 3: NOT allowed
   Forced rotation: NEVER

🚪 Login Lockout
   Max attempts: 5
   Lockout duration: 5 minutes
   Auto-unlock: ☑

⏰ Auto-Logout per role
   🔧 Admin:           60 min
   🛞 B-Tire Sales:    30 min
   🏪 Dealer Sales:    30 min
   🛒 Counter:         15 min
   Options: Never / 5 / 10 / 15 / 30 / 60 / 120 / 240 min

🤝 Session Rules
   Dealer Sales: 1 active session
   Counter: multi-device
   Admin: multi-device
```

### 3.6 🔔 Notifications

```
System Telegram Bot
   Bot Token + Chat ID
   [🔍 Test Connection]

Alert Filters:
   ☑ 🔴 Critical
   ☑ ⚠️ Warning
   ☑ 🔄 Sync failures
   ☑ 🔒 Device approve
   ☑ 📅 Scheduled apply
   ☐ 🟢 Info events
   ☐ ⚪ Debug events

Quiet Hours: 23:00 - 06:00
   ☑ ยกเว้น Critical (always send)
```

### 3.7 📋 Audit Log

```
Stats: Today 247 events | 245 OK | 2 warn | 0 error

Filters: Date, User, Action, Severity, Device, IP, Resource, Module

Quick Views:
   🔥 Price changes 24hr
   🔐 Login attempts
   ⚠️ Sync failures
   🗑️ Auto-deletions
   🔒 Device activities
   🔐 Cipher changes (critical!)

Event Detail:
   Full context, before/after diff,
   related events, undo button

Export: CSV/PDF/XLSX (cipher masked)
```

### 3.8 📡 NAS Storage

```
Connection:
   Protocol:    SMB / NFS / SFTP
   Host/IP:     192.168.1.50
   Port:        445
   Share:       tkc
   Path:        /audit-archive
   Mount:       /mnt/nas-audit
   Username/Password

Health Status:
   🟢 Online | Last check: 5 min ago
   Latency: 1.2s read / 850ms write
   Free space: 1.8 TB / 4 TB

Actions:
   [🧪 Run Check Now]  (5-step test)
   [📁 Browse]
```

### 3.9 🤖 AI Agents

```
🤖 พอร์ช (Master Agent)
   Status: 🟢 Active
   Last access: 14:25
   
   🔐 API Key: tkc_ag_a8f3...  [🔄 Rotate]
   🔑 HMAC Secret: ●●●●●●●     [🔄]
   
   ⏰ Auto-rotate: 180 days
   Next rotation: 8 พ.ย. 2569
   
   🌐 IP Whitelist (LAN only):
     192.168.1.30 — Mac Mini M4
     192.168.1.21 — Spark #2
   
   🎯 Scope (read-only):
     ✅ GET /api/agent/audit/*
     ✅ GET /api/agent/nas/health
     ✅ GET /api/agent/system/status
     ❌ Pricelist data (excluded)
   
   📊 Rate limit: 100/min, 1000/hour
```

### 3.10 🧩 Modules Registry

```
Installed Modules:
🟢 💰 Pricelist                    v1.0  Active
🟢 ⚙️ Settings Hub                 v1.0  Active (Core)
⚪ 📍 Check-in (Phase 3)           v0.0  Not installed
⚪ 📷 Photo Report (Phase 3)
⚪ 🎙️ Voice Report (Phase 3)
⚪ 📊 Sales Stats (Phase 4)

Module Permissions Matrix (per Group):
              Pricelist   Settings   Check-in
   Admin       admin       admin      —
   B-Tire      read*       —          —
   Dealer      read**      —          —
   Counter     read***     —          —
   ลูกค้า       link only   —          —
```

### 3.11 🎨 Branding

```
Logo:
   [Current Logo]
   [📤 Upload New]  [🗑️ Remove]
   PNG/JPG/SVG (≤ 500KB)

Logo Visibility:
   ☑ App header
   ☑ Print
   ☑ Quote share
   ☑ PDF export

Colors:
   Primary, Secondary, Accent (color picker)
   
Theme:
   Default: ● Light  ○ Dark  ○ Auto

Currency:
   Symbol: บาท / ฿ / (none)
   Position: Suffix / Prefix
```

### 3.12 📊 System Health

```
🖥️ Compute:
   Spark #1 (Web/DB):     🟢 CPU 23% | RAM 45/128 GB
   Spark #2 (AI):          🟢 GPU 12%
   Spark #3 (Training):    🟢 Idle
   Spark #4 (Vision):      🟢 CPU 5%
   Mac Mini (Agent):       🟢 

🗄️ Storage:
   PostgreSQL, Redis, Local SSD, NAS

🔄 Sync Services:
   AIO Sync, Audit Archive, NAS Backup

🌐 Integration:
   AIO MySQL, Cloudflare, Telegram
```

### 3.13 🔑 Cipher (Pricelist)

```
Cipher #1 (ทุน):
   0=X  1=T  2=N  3=S  4=F
   5=V  6=L  7=C  8=B  9=K

Cipher #2 (ราคาส่ง):
   0=O  1=I  2=Z  3=M  4=D
   5=E  6=H  7=Y  8=P  9=R

Reserved: A (repeat marker)

Actions:
   [📥 Download Backup Card PDF]
   [🖨️ Print Backup Card]
   [🔄 Change Cipher (requires reason)]

⚠️ WARNING: Changing cipher does not affect data,
   only display layer changes.
```

### 3.14 📈 Reports

```
Cross-Module Analytics:

📊 Pricelist:
   - Price changes per day/week/month
   - Top edited products
   - Most viewed products
   - Sync failures
   - Most searched terms
   
👥 Users:
   - Login frequency
   - Module usage per user
   - PIN holder activity
   
🔐 Security:
   - Failed login attempts
   - Device approvals
   - Audit log size growth
   
📡 Infrastructure:
   - AIO sync latency trends
   - NAS health trends
   - Storage growth projections

Export: PDF / XLSX / CSV
Scheduled email reports (Phase 2)
```

---

## 4. Tech & Database

### 4.1 Frontend Structure

```
/app/settings/
├── page.tsx              (overview)
├── users/page.tsx
├── groups/page.tsx
├── pins/page.tsx
├── devices/page.tsx
├── security/page.tsx
├── notifications/page.tsx
├── audit/page.tsx
├── nas/page.tsx
├── agents/page.tsx
├── modules/page.tsx
├── branding/page.tsx
├── health/page.tsx
├── cipher/page.tsx
└── reports/page.tsx
```

### 4.2 Database

```sql
CREATE SCHEMA settings_hub;

CREATE TABLE settings_hub.security_policy (...);
CREATE TABLE settings_hub.role_session_config (...);
CREATE TABLE settings_hub.system_config (...);
CREATE TABLE settings_hub.branding (...);
CREATE TABLE settings_hub.popup_messages (...);
-- Other tables use core.* (users, groups, devices, audit)
```

---

## 5. API Endpoints (Brief)

```
# Users / Groups / PINs
GET/POST/PUT/DELETE /api/settings/users[/:id]
GET/POST/PUT/DELETE /api/settings/groups[/:id]
POST /api/settings/users/:id/reset-password

# Devices
GET    /api/settings/devices
POST   /api/settings/devices/:id/approve
POST   /api/settings/devices/:id/block

# Security
GET/PUT /api/settings/security/policy
GET/PUT /api/settings/security/auto-logout[/:role]

# Notifications, NAS, Agents, Modules, Branding, Health, Cipher
GET/PUT /api/settings/{section}
POST    /api/settings/nas/check
POST    /api/settings/agents/:id/rotate-key
```

---

## 6. Permission Model

| Section | Admin | Other |
|---|---|---|
| Users & Groups | ✅ All | ❌ |
| Devices | ✅ All | View own only |
| Security | ✅ All | ❌ |
| Notifications | ✅ System | View+edit own |
| Audit Log | ✅ All | ❌ |
| NAS | ✅ All | ❌ |
| AI Agents | ✅ All | ❌ |
| Modules | ✅ All | ❌ |
| Branding | ✅ All | View only |
| System Health | ✅ All | ❌ |
| Cipher | ✅ All | ❌ |
| Reports | ✅ All | View own (limited) |

---

## 7. Phase Roadmap

### Phase 1 (Weeks 14-22, parallel with Pricelist)

- Week 14-15: Users + Groups + Devices + Security
- Week 16-17: Notifications + Audit Viewer
- Week 18-19: NAS + AI Agents + Modules
- Week 20-21: Branding + Health + Cipher
- Week 22: Reports + Polish

### Phase 2+
- Reports advanced (scheduled emails)
- Mobile-optimized Settings
- Bulk operations
- Configuration templates

---

## 8. Non-Functional Requirements

| Aspect | Target |
|---|---|
| Page load | < 2s |
| User search | < 200ms |
| Device list refresh | Real-time (WebSocket) |
| Audit query | < 1s (hot tier) |
| NAS health check | < 30s (5-step test) |
| Bulk user create | < 5s for 50 users |
| Module install | < 30s |

---

## 9. Open Questions

- [ ] Bulk user import format (CSV columns)
- [ ] Reports email scheduling — Phase 1 or 2?
- [ ] Mobile-friendly Settings priority?
- [ ] Configuration templates (export/import)

---

**End of Settings Hub PRD v1.0**
