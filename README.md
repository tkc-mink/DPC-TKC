# 🛞 TKC Dynamic Pricelist

ระบบราคายางแบบเรียลไทม์ของ **TKC AUTO PLUS** (อุดรธานี) — พัฒนาต่อยอดจากระบบ Excel เดิม ให้เป็นเว็บแอปสมัยใหม่ ใช้งานง่าย รองรับมือถือ/แท็บเล็ต/เดสก์ท็อป พร้อมระบบสิทธิ์การมองเห็นรายคอลัมน์ และรหัสลับ (cipher) ปกป้องราคาทุน/ราคาส่ง

> **Phase 1 deliverable** = `Pricelist Module` + `Settings Hub` + `Core Services` (ดู `docs/TASKS.md`)

---

## 📌 ภาพรวมโปรเจกต์ (Project at a glance)

| หัวข้อ | รายละเอียด |
|---|---|
| **ปัญหาเดิม** | Pricelist อยู่ในไฟล์ Excel หลายไฟล์ · แก้ยาก · ไม่ real-time · เสี่ยงราคาทุนรั่ว · เซลล์หน้างานเปิดดูลำบาก |
| **เป้าหมาย** | เว็บแอปเดียว ดูราคา/แก้ราคา/ค้นหา/แชร์ใบเสนอราคาได้ทุกอุปกรณ์ · sync กับระบบบัญชี AIO อัตโนมัติ |
| **ผู้ใช้** | ผู้ดูแลระบบ (Admin), เซลล์ยางใหญ่ (B2C), เซลล์ดูแลร้านค้า (B2B/Dealer), พนักงานหน้าร้าน (Counter) |
| **ขนาดข้อมูล** | ~2,629 รายการ · 7 หมวด · 64 ชีต (ยาง/แบต/น้ำมัน/ยางใน) |
| **Stack** | **Laravel 11 (PHP 8.3) + Inertia/React + PostgreSQL 16 + Redis + Reverb** (ดู `docs/ARCHITECTURE.md`) |
| **Theme** | Dark · Black + Industrial Yellow · สองภาษา ไทย/อังกฤษ |

---

## 🗂️ เอกสารทั้งหมด (Documentation map)

| ไฟล์ | สำหรับใคร | เนื้อหา |
|---|---|---|
| **README.md** (ไฟล์นี้) | ทุกคน | ภาพรวม + วิธีเริ่ม |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Dev / Tech Lead | สถาปัตยกรรม, tech stack ที่แนะนำ + เหตุผล, การ deploy |
| [`docs/DESIGN.md`](docs/DESIGN.md) | Frontend / UX | Design system: สี, ฟอนต์, spacing, components, UI patterns |
| [`docs/DATABASE.md`](docs/DATABASE.md) | Backend / DBA | Schema, migrations, การตั้งค่า PostgreSQL, cipher storage |
| [`docs/API.md`](docs/API.md) | Backend / Frontend | REST endpoints, payloads, auth, WebSocket events |
| [`docs/TASKS.md`](docs/TASKS.md) | ทั้งทีม / PM | แตกงานเป็น sprint + task ติ๊กได้ (Phase 1) |
| [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) | DevOps / Dev | deploy บน Ubuntu 25.04 + Docker + Cloudflare Tunnel + backup |
| [`docs/VSCODE_CLAUDE_GUIDE.md`](docs/VSCODE_CLAUDE_GUIDE.md) | ทีม / มือใหม่ | วิธีเปิดโปรเจกต์ใน VS Code + ใช้ Claude extension พัฒนาต่อ |
| [`CLAUDE.md`](CLAUDE.md) | AI | บริบท+กฎโปรเจกต์ ที่ Claude อ่านอัตโนมัติ |
| [`docs/CHATBOT.md`](docs/CHATBOT.md) | Dev | module ผู้ช่วย AI "พอร์ช" — สถาปัตยกรรม + ความปลอดภัย + งาน |
| [`docs/CIPHER.md`](docs/CIPHER.md) | Backend | สเปกรหัสลับ #1/#2 + algorithm + ความปลอดภัย |
| [`docs/CHATBOT.md`](docs/CHATBOT.md) | Dev / AI | Module ผู้ช่วย AI "น้องพอร์ช" + วิธี implement (role-safe) |
| `prototype/` *(หรือไฟล์ HTML ที่แนบ)* | ทุกคน | Prototype คลิกได้ — ดูหน้าตา/พฤติกรรมจริงก่อนเขียนโค้ด |
| `_source_prd/` | อ้างอิง | PRD ต้นฉบับ 16 ไฟล์ (ที่มาของ requirement ทั้งหมด) |

> 📎 PRD ต้นฉบับ (00–16) คือ **แหล่งความจริง (source of truth)** ของ requirement — เอกสารในชุดนี้แปลงมันเป็นแผนลงมือทำบน stack Laravel

---

## 🎨 Prototype (ดูก่อนเริ่มเขียน)

เปิดไฟล์ **`TKC Dynamic Pricelist.html`** ในเบราว์เซอร์ — เป็น prototype คลิกได้จริง ครอบคลุม 5 หน้าหลัก:

| หน้า | สิ่งที่ลองได้ |
|---|---|
| 🏠 **หน้าแรก (Dashboard)** | Module picker, สถิติ, กิจกรรมล่าสุด |
| 💰 **ดูราคา (Viewer)** | ตารางราคา + cipher + DOT สี + คลิกแถวดูรายละเอียด (popup) + toggle เงินสด/เครดิต |
| ✏️ **แก้ไขราคา (Editor)** | แก้แบบ spreadsheet + แสดงรหัสลับสด + batch save |
| 📱 **มุมมองมือถือ** | การ์ดสินค้า + ค้นหาเสียง + สร้างใบเสนอราคา + แชร์ลิงก์ |
| ⚙️ **ตั้งค่าระบบ** | ผู้ใช้/กลุ่ม, เมทริกซ์สิทธิ์, cipher, ความปลอดภัย, สุขภาพระบบ |
| 🤖 **ผู้ช่วย AI (น้องพอร์ช)** | ปุ่มหุ่นยนต์มุมขวาล่าง — ถามราคา/สต็อก/DOT ได้ทุกหน้า, ตอบตามสิทธิ์ |

**ลองเล่น:**
- กดสลับ **ดูในบทบาท** (มุมขวาบน) → ดูว่าแต่ละ role เห็นคอลัมน์ต่างกัน (เซลล์ยางใหญ่เห็นแค่ราคาขาย, ไม่เห็นทุน)
- กด **TH / EN** สลับภาษา
- พิมพ์ค้นหาแบบติดกัน เช่น `21515mk` (จับลำดับตัวอักษร = subsequence matching)

> ⚠️ Prototype เป็น **mock** (ข้อมูลปลอม, ไม่มี backend) ใช้เพื่อสื่อสาร UX/Visual ให้ทีมเห็นภาพตรงกัน — ไม่ใช่โค้ด production

---

## 🚀 เริ่มต้นพัฒนา (Quick start)

> ทีมหลักใช้ **AI-assisted coding (Claude / พอร์ช)** — ดู workflow ใน `docs/TASKS.md §การทำงานกับ AI`

### 0. ติดตั้งเครื่องมือ (Week 0)
```bash
# ต้องมี
php >= 8.3        # ภาษาหลัก backend
composer          # PHP package manager
node >= 20        # สำหรับ Vite/React build (ไม่ใช่ server)
postgresql >= 16  # ฐานข้อมูล
redis >= 7        # cache + queue
docker + docker-compose   # รันทุกอย่างพร้อมกัน
```

### 1. สร้างโปรเจกต์ Laravel
```bash
composer create-project laravel/laravel tkc-pricelist
cd tkc-pricelist

# Inertia + React (frontend ในแอป Laravel เดียว — ไม่ต้องแยก Next.js)
composer require inertiajs/inertia-laravel
php artisan inertia:middleware
npm install @inertiajs/react react react-dom

# Real-time, queue monitor, auth
composer require laravel/reverb laravel/horizon laravel/sanctum

# Build tooling
npm install -D vite @vitejs/plugin-react tailwindcss vite-plugin-pwa typescript
```

### 2. ตั้งค่า `.env`
```dotenv
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=tkc_superapp
DB_USERNAME=tkc
DB_PASSWORD=********

REDIS_HOST=127.0.0.1
QUEUE_CONNECTION=redis
CACHE_STORE=redis

BROADCAST_CONNECTION=reverb         # WebSocket ราคาแบบ real-time

# เชื่อมต่อระบบบัญชี AIO (MySQL) เป็น connection ที่ 2 — ใช้ sync เท่านั้น
AIO_DB_HOST=192.168.1.x
AIO_DB_DATABASE=aio
AIO_DB_USERNAME=readonly
```
> ตั้ง connection AIO ใน `config/database.php` แยกจาก default ดู `docs/DATABASE.md §AIO`

### 3. สร้างฐานข้อมูล + migrate
```bash
createdb tkc_superapp
php artisan migrate          # สร้าง schema core.* / pricelist.* / settings_hub.*
php artisan db:seed          # ข้อมูลตั้งต้น (กลุ่มสิทธิ์, cipher default, admin user)
```

### 4. รัน (dev)
```bash
php artisan serve     # http://localhost:8000
php artisan reverb:start   # WebSocket
php artisan horizon        # queue worker (AIO sync)
npm run dev                # Vite + React HMR
```
หรือใช้ Docker ทีเดียว:
```bash
docker compose up -d   # nginx + php-fpm + postgres + redis + reverb + horizon
```

---

## 🧱 โครงสร้างโปรเจกต์ (เป้าหมาย)
```
tkc-pricelist/
├── app/
│   ├── Modules/
│   │   ├── Pricelist/      # Controllers, Services, Models, Jobs
│   │   └── SettingsHub/
│   ├── Core/              # Auth, Users, Groups, Devices, Audit, Files
│   └── Services/
│       ├── CipherService.php      # เข้ารหัสราคา (ดู docs/CIPHER.md)
│       └── AioSyncService.php     # sync กับ AIO MySQL
├── resources/js/
│   ├── Pages/             # Inertia pages (React) → ตรงกับ prototype
│   │   ├── Dashboard.tsx
│   │   ├── Pricelist/{Viewer,Editor,Mobile}.tsx
│   │   └── Settings/*.tsx
│   ├── Components/        # ปุ่ม, card, table, popup (ดู docs/DESIGN.md)
│   └── lib/cipher.ts      # mirror ฝั่ง client (เฉพาะ display)
├── database/migrations/   # ต่อ schema/module
├── routes/{web,api,channels}.php
├── docker-compose.yml
└── docs/
```

---

## ✅ เกณฑ์ปล่อย Phase 1 (Go-live)
- [ ] ย้ายข้อมูล 2,629 รายการจาก Excel ครบ (3-Round recheck)
- [ ] ทุก role login + เห็นคอลัมน์ตามสิทธิ์ถูกต้อง
- [ ] ราคาทุน/ราคาส่งแสดงเป็น cipher ไม่รั่วเลขจริง
- [ ] AIO sync ทำงาน 2 ทาง (อ่าน + เขียน field 1-4)
- [ ] พิมพ์ A4 ออกมาหน้าตาเหมือน Excel เดิม
- [ ] Audit log บันทึกทุก action
- [ ] Backup/Restore ทดสอบผ่าน

รายละเอียดทั้งหมด → `docs/TASKS.md`

---

## 👤 ติดต่อ
- **Owner:** ชิบะน้อย (TKC AUTO PLUS, อุดรธานี)
- **AI Assistant:** พอร์ช (Mac Mini M4) + Claude
- **ระบบที่เกี่ยวข้อง:** AIO (บัญชี/สต็อก), Synology NAS, Telegram

---

*เอกสารชุดนี้สร้างเพื่อส่งต่อให้ทีมพัฒนา · เวอร์ชัน 1.0 · ปรับ stack เป็น Laravel/PostgreSQL ตามที่ทีมถนัด*
