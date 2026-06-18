# 🏗️ ARCHITECTURE — TKC Dynamic Pricelist

> สถาปัตยกรรม + tech stack ที่แนะนำ พร้อมเหตุผล · ปรับจาก PRD เดิม (FastAPI/Python) มาเป็น **Laravel (PHP)** ตามที่ทีมถนัด

---

## 1. สรุปการตัดสินใจ (Decision summary)

PRD ต้นฉบับ (`01_PRD_TKC_SuperApp_v2.md`) ออกแบบบน **Next.js + FastAPI (Python) + PostgreSQL + Redis**
ทีมเลือกใช้ **PHP (Laravel) + PostgreSQL** เพราะถนัดกว่า + ดูแลง่ายกว่าในระยะยาว

**Stack ที่แนะนำ (ฉบับปรับแล้ว):**

| ชั้น | เทคโนโลยี | แทนที่ของเดิม (PRD) | เหตุผลสั้น ๆ |
|---|---|---|---|
| **Backend** | **Laravel 11** (PHP 8.3) | FastAPI (Python) | ทีมถนัด, ecosystem ครบ (auth/queue/schedule/ws ในตัว) |
| **Frontend** | **Inertia.js + React 18 + TypeScript** | Next.js แยก | แอปเดียว ไม่ต้องแยก API/UI, deploy ง่าย, ยังได้ React |
| **Build / PWA** | **Vite + vite-plugin-pwa** | next-pwa | เร็ว, PWA/Service Worker ครบ |
| **Database** | **PostgreSQL 16** | PostgreSQL 16 | ✅ คงเดิม — JSONB + pg_trgm เหมาะกับ schema ยืดหยุ่น |
| **Cache/Queue** | **Redis 7** | Redis 7 | ✅ คงเดิม |
| **Real-time** | **Laravel Reverb** + Echo | WebSocket (FastAPI) | WebSocket server เป็น PHP ล้วน ไม่ต้องมี Node service |
| **Queue monitor** | **Laravel Horizon** | APScheduler | ดู/จัดการ job (AIO sync) ผ่าน UI |
| **Auth** | **Sanctum** (session + token) | PyJWT | session สำหรับเว็บ + token สำหรับ PWA/มือถือ |
| **UI** | **Tailwind CSS** (+ Radix primitives) | Tailwind + shadcn | ✅ แนวเดียวกัน |
| **Table/Sheet** | **TanStack Table** + Handsontable (editor) | Univer | Handsontable เบากว่า Univer และพอสำหรับงานแก้ราคา |
| **File/NAS** | **Flysystem** (SFTP/SMB adapter) | SMB mount | จัดการ NAS ผ่าน abstraction ของ Laravel |
| **AIO sync** | **Laravel scheduled command** + 2nd DB connection (MySQL) | Python + mysql-connector | Laravel เชื่อม MySQL ของ AIO ได้ตรง ๆ |
| **Deploy** | **Docker Compose** บน Spark #1 + Cloudflare Tunnel | เหมือนเดิม | ✅ คงเดิม |

> 💡 **ข้อดีหลักของการรวมเป็น Laravel+Inertia:** เหลือ **codebase เดียว ภาษาเดียว (PHP)** ที่ AI ช่วยเขียนได้ต่อเนื่อง ไม่ต้องสลับ context ระหว่าง Python backend กับ Node frontend — เหมาะกับทีมเล็กที่ใช้ AI เป็นหลัก

---

## 2. ทำไม Laravel + Inertia (ไม่ใช่ Laravel API + Next.js แยก)

มี 2 ทางเลือกเมื่อใช้ PHP:

**ทางเลือก A — Laravel API + Next.js แยก** ❌ ไม่แนะนำสำหรับเฟสนี้
- ต้องดูแล 2 server (PHP + Node), 2 deploy, จัดการ CORS/auth ข้าม origin
- ซับซ้อนเกินจำเป็นสำหรับทีมเล็ก

**ทางเลือก B — Laravel + Inertia + React** ✅ **แนะนำ**
- Laravel ส่งหน้า React ผ่าน Inertia โดยตรง → รู้สึกเหมือน SPA แต่ routing/auth อยู่ที่ Laravel
- ไม่มี REST API ที่ต้องเขียนซ้ำสำหรับหน้าเว็บ (ส่ง props จาก controller ตรงเข้า React component)
- ยังเปิด **REST API แยก (`routes/api.php` + Sanctum)** ไว้สำหรับ **PWA มือถือ + AI Agent + quote link สาธารณะ** ได้
- Deploy = แอป Laravel เดียว + `npm run build` (static assets)

```
                         ┌──────────────────────────────┐
   Browser / PWA  ──────►│  Nginx (Cloudflare Tunnel)    │
                         └───────────────┬──────────────┘
                                         │
                    ┌────────────────────┴────────────────────┐
                    ▼                                          ▼
         ┌─────────────────────┐                   ┌─────────────────────┐
         │  Laravel (php-fpm)  │                   │  Laravel Reverb     │
         │  • Inertia (web)    │                   │  • WebSocket        │
         │  • REST API (mobile)│◄──broadcast──────►│  • ราคาอัปเดตสด     │
         │  • Auth (Sanctum)   │                   └─────────────────────┘
         └──────┬──────────────┘
                │
   ┌────────────┼───────────────┬──────────────┬─────────────────┐
   ▼            ▼               ▼              ▼                 ▼
┌────────┐ ┌────────┐   ┌──────────────┐ ┌──────────┐   ┌───────────────┐
│Postgres│ │ Redis  │   │ Horizon      │ │Flysystem │   │ AIO MySQL      │
│ 16     │ │(cache/ │   │ (queue:      │ │ → NAS    │   │ (2nd conn,     │
│        │ │ queue) │   │  AIO sync)   │ │ (SFTP)   │   │  read+write1-4)│
└────────┘ └────────┘   └──────────────┘ └──────────┘   └───────────────┘
```

---

## 3. โครงสร้างโมดูล (Modular monolith)

ทำเป็น **modular monolith** — แอปเดียวแต่แบ่งโมดูลชัดเจน เพิ่ม module ใหม่ (Phase 3) ได้โดยไม่กระทบของเดิม

```
app/
├── Core/                      # บริการกลาง ใช้ร่วมทุกโมดูล
│   ├── Auth/                  # login, refresh, PIN, device fingerprint
│   ├── Users/                 # CRUD, self-edit, groups (≤3), PIN manager
│   ├── Permissions/           # group + column-level + module access matrix
│   ├── Devices/               # whitelist, approve, force-logout
│   ├── Notifications/         # in-app + Telegram + Web Push
│   ├── Audit/                 # 3-tier log (hot PG / warm SSD / cold NAS)
│   └── Files/                 # upload, resize, NAS archive
├── Modules/
│   ├── Pricelist/
│   │   ├── Http/Controllers/  # Viewer, Editor, Bundle, Migration, Sync
│   │   ├── Models/            # Category, Sheet, Row, Bundle, CrTier...
│   │   ├── Services/
│   │   │   ├── CipherService.php
│   │   │   ├── SearchService.php       # subsequence + pg_trgm
│   │   │   ├── AioSyncService.php
│   │   │   └── MigrationService.php     # Algo A + Algo B + 3-Round
│   │   ├── Jobs/              # SyncAioJob, ApplyScheduleJob
│   │   └── Database/Migrations/
│   └── SettingsHub/
└── Services/                  # cross-cutting (Telegram, Cipher shared)
```

**กฎสำคัญ:**
- โมดูลคุยกันผ่าน **event/service เท่านั้น** ไม่ query ข้าม schema ตรง ๆ
- แต่ละโมดูลมี migration ของตัวเอง
- ใช้ **PostgreSQL schema** แยก: `core.*`, `pricelist.*`, `settings_hub.*` (ดู `docs/DATABASE.md`)

---

## 4. ความปลอดภัยของราคา (Cipher) — สำคัญมาก

> ⚠️ **หลักการที่ห้ามพลาด:** ฐานข้อมูลเก็บ **เลขจริง** เสมอ — การเข้ารหัส (cipher) เกิดที่ **display layer**
> และ **server ต้องไม่ส่งเลขจริงไปยัง client ที่ไม่มีสิทธิ์**

```
Admin request   → server ส่ง { cost: 1818, cost_code: "TBTB" }   (มีเลขจริง)
Dealer request  → server ส่ง { bas_code: "IPEO/IPZO/IYRO" }       (ไม่มีเลขจริงเลย)
B-Tire request  → server ส่ง { retail: 2150 }                      (ไม่มี cost/bas)
```

- การกรองคอลัมน์ทำที่ **API Resource / Inertia props** ตาม role (ไม่ใช่ซ่อนด้วย CSS!)
- `CipherService` encode ฝั่ง server; `lib/cipher.ts` ฝั่ง client ใช้แค่ตอน Admin แก้ไขเพื่อ preview สด
- เปลี่ยน cipher = audit event ระดับ **Critical** (ดู `docs/CIPHER.md`)

---

## 5. AIO Integration (ระบบบัญชี/สต็อก)

```
config/database.php → connection 'aio' (MySQL, read-mostly)
```

| ทิศทาง | ความถี่ | ราย field |
|---|---|---|
| **อ่าน** master + stock + DOT | ทุก 15 นาที (scheduled command → queue) | ทุก field ที่ map |
| **เขียนกลับ** ราคา | ทุก 15 นาที + manual | **field 1-4 เท่านั้น** (ราคาขาย 1-4) · field 5 ห้ามแตะ |
| รูปภาพ | on-demand + TTL 30 วัน | โลโก้ยี่ห้อ |

**กติกาเหล็ก (LOCKED):**
- Bulk sync สูงสุด **500 รายการ/รอบ**
- Auto-pause เมื่อ: AIO ล่ม >5 นาที · fail rate >10% · queue >500
- Retry escalation: 1 → 5 → 15 นาที, แจ้ง Telegram L1(30m)/L2(2h)
- **ก่อนเขียน AIO ครั้งแรก (migration)** → backup field 1-4 ทั้งหมดลง `core.aio_initial_backup` (ลบไม่ได้ตลอดกาล + SHA256 checksum)

ใช้ **Horizon** ดู queue + retry · รายละเอียด queue UX → PRD `12_PRD_AIO_Sync_Queue_UX.md`

---

## 6. Real-time (Laravel Reverb)

- Admin แก้ราคา → `PriceUpdated` event → broadcast ผ่าน Reverb → ทุก viewer เห็นทันที
- Frontend ใช้ **Laravel Echo** subscribe channel `pricelist.sheet.{id}`
- Presence channel สำหรับ "ใครกำลังดู/แก้ชีตนี้"
- ไม่ต้องมี Node — Reverb เป็น PHP

---

## 7. ออฟไลน์ & PWA

- `vite-plugin-pwa` (Workbox) → manifest + service worker + "Add to Home Screen"
- แคช: profile, ราคาที่ดูล่าสุด 7 วัน, favorites, การค้นหาล่าสุด (เก็บใน IndexedDB)
- ออฟไลน์ = อ่านอย่างเดียว + คิว action ไว้ + indicator "🔌 Offline"
- กลับมาออนไลน์ → replay queue → refresh

---

## 8. Non-functional targets (จาก PRD)

| ด้าน | เป้า |
|---|---|
| ค้นหา | < 200ms |
| บันทึกการแก้ไข | < 500ms |
| โหลดหน้า | < 2s (4G) |
| ผู้ใช้พร้อมกัน | 30 ต่อเนื่อง / 100 peak |
| Uptime | 99% (7:00–22:00) |
| Audit retention | 3 ปี (3-tier) |
| รองรับ | Chrome/Safari/Edge 2 เวอร์ชันล่าสุด · iOS 15+ · Android 10+ |

---

## 9. การ deploy (Spark #1)

`docker-compose.yml` services:
```yaml
nginx        # :80/:443 reverse proxy + serve static (Vite build)
app          # php-fpm (Laravel: Inertia + API)
reverb       # php artisan reverb:start (WebSocket)
horizon      # php artisan horizon (queue: AIO sync, schedule)
scheduler    # php artisan schedule:work (cron ภายใน)
postgres     # :5432
redis        # :6379
```
- External access ผ่าน **Cloudflare Tunnel → Nginx**
- Monitoring: Horizon (queue) + Grafana/Prometheus (infra) ตาม PRD
- Backup: `pg_dump` รายวัน (3 rotation) + WAL รายชั่วโมง + Launch-day permanent (ดู `docs/DATABASE.md §Backup`)

---

## 10. Roadmap (เทียบ PRD)

| Phase | ขอบเขต | สถานะ |
|---|---|---|
| **1** (22 สัปดาห์) | Core + Pricelist + Settings Hub + PWA | 🟢 ลงมือ |
| 2 (สัปดาห์ 23–30) | Tauri wrapper (admin .exe), Web Push, optimize | 🟡 |
| 3 (3-6 เดือนถัดมา) | Check-in (GPS), Photo, Voice report + Capacitor | ⚪ |
| 4+ | Sales Stats, CRM lite, Delivery, Service tickets | ⚪ |

> **หมายเหตุ Tauri (Phase 2):** wrap เว็บแอปเป็น .exe สำหรับ admin ได้เลย เพราะ frontend เป็น web อยู่แล้ว — ไม่ต้องเขียนใหม่

---

*ดูการแตกงานจริง → `docs/TASKS.md` · ดู schema → `docs/DATABASE.md` · ดู API → `docs/API.md`*
