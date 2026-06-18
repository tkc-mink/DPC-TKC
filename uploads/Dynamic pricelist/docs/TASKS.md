# ✅ TASKS.md — Phase 1 Task Breakdown

> แตกงานเป็น sprint + task ติ๊กได้ · 22 สัปดาห์ · Pricelist + Settings Hub + Core
> ทำงานแบบ **AI-assisted** (Claude / พอร์ช) — ดู §การทำงานกับ AI ท้ายไฟล์

**บทบาทอ้างอิง:** 🔧 Admin · 🛞 เซลล์ยางใหญ่ (B2C) · 🏪 เซลล์ดูแลร้านค้า (B2B) · 🛒 พนักงานหน้าร้าน (Counter)

---

## 🚦 ก่อนเริ่ม — P0 Blockers (ต้องเคลียร์ก่อน)
- [ ] เอกสาร AIO API + schema (โดยเฉพาะที่เก็บรูป)
- [ ] IP range ออฟฟิศ (เช่น 192.168.1.0/24) + internal DNS (app.tkc.local)
- [ ] Synology NAS: IP, share, credentials, mount path
- [ ] Telegram Bot token + admin chat id
- [ ] HTTPS: Cloudflare Tunnel หรือ Let's Encrypt

---

## Week 0 — Setup
- [ ] ติดตั้ง PHP 8.3, Composer, Node 20, PostgreSQL 16, Redis 7, Docker
- [ ] `composer create-project laravel/laravel` + Inertia + React + Vite (ดู README §Quick start)
- [ ] เพิ่ม Reverb, Horizon, Sanctum
- [ ] Git repo (private) + branch strategy (`main` / `dev` / `feature/*`)
- [ ] `docker-compose.yml` รันครบ (nginx, app, postgres, redis, reverb, horizon)
- [ ] deploy "Hello TKC" ขึ้น Spark #1 + Cloudflare Tunnel
- [ ] พอร์ต `styles.css` tokens → `tailwind.config.js` + `:root` (ดู DESIGN.md §9)

---

## Week 1–2 — Foundation
- [ ] โครง schema `core.*` (migrations) + `search_path`
- [ ] extension: pg_trgm, uuid-ossp, vector
- [ ] Auth service: login / refresh / logout / PIN / me (Sanctum)
- [ ] หน้า Login (UI) — โทน dark/yellow ตาม DESIGN.md
- [ ] App shell: Sidebar + Topbar + สลับภาษา TH/EN (Inertia shared `locale`)
- [ ] health check endpoint
**Deliverable:** เปิด app.tkc.local → เห็น login → เข้า dashboard เปล่า ๆ ได้

---

## Week 3–4 — Core: Auth + Users + Permissions
- [ ] User CRUD + self-edit (password, display name, telegram, theme)
- [ ] Groups (4 default + ≤10 custom) + membership (≤3, union)
- [ ] **Column-level permission** + `module_group_permissions` matrix
- [ ] PIN manager (บัญชีใช้ร่วม Counter)
- [ ] Device fingerprint + whitelist + approve flow
- [ ] auto-logout รายบทบาท (60/30/30/15)
- [ ] lockout 5 ครั้ง/5 นาที
**ทดสอบ:** ทุก role login ได้ · Counter ใส่ PIN ได้ · พิมพ์ผิด 5 ครั้งโดนล็อก

---

## Week 5–6 — Core: Notifications + Audit + Files
- [ ] Notification: in-app inbox + Telegram channel + ตั้งค่ารายคน
- [ ] **Audit log 3-tier**: hot (PG) + job ย้าย warm (SSD .jsonl.gz) + cold (NAS)
- [ ] `audit_archive_index` + query รวมทุก tier
- [ ] middleware/observer เขียน audit ทุก action
- [ ] Files: upload + resize + เก็บ NAS (Flysystem SFTP)
- [ ] Search service: subsequence + pg_trgm
**ทดสอบ:** Telegram เด้ง · audit จับครบ · NAS อ่าน/เขียนได้

---

## Week 7–8 — Pricelist: Foundation
- [ ] schema `pricelist.*` + indexes (gin/trgm)
- [ ] Universal Schema Engine (`categories.schema_def`)
- [ ] **CipherService** + 4 unit tests (TBTB / TATA / ZEOA / ...) — ดู CIPHER.md
- [ ] `aio_cache` + **AioSyncService อ่านอย่างเดียว** (scheduled 15 นาที → queue)
- [ ] API: categories / sheets / rows (พื้นฐาน)
- [ ] Cipher Setup Wizard (UI) + การ์ดสำรอง PDF
- [ ] ลงทะเบียน module ใน `core.modules`
**ทดสอบ:** ข้อมูล AIO ไหลเข้า · cipher ถูก · **ยังไม่เขียน AIO** (ปลอดภัย)

---

## Week 9–10 — Pricelist: Editor (เดสก์ท็อป)
- [ ] ตาราง editor (Handsontable/TanStack) + multi-sheet + sidebar
- [ ] แสดงรหัส cipher สด ๆ ใต้ช่อง (preview)
- [ ] batch mode (แก้หลายช่อง save ครั้งเดียว) + dirty tracking
- [ ] บันทึก → audit + `price_history` + broadcast (Reverb)
- [ ] dropdown รหัส AIO + auto-fill + duplicate detection
- [ ] **Click-for-details popup** 4 แบบ (ราคา/s/B-A-S/หมายเหตุ) — 10s auto-dismiss
- [ ] DOT auto-color + status logic
**ทดสอบ:** admin แก้ราคา → DB เปลี่ยน → viewer คนอื่นเห็นทันที

---

## Week 11–12 — Pricelist: Viewer มือถือ + ค้นหา
- [ ] Viewer เดสก์ท็อป (กรองคอลัมน์ตาม role ผ่าน **API Resource**)
- [ ] Mobile viewer (การ์ด, tap ขยาย, bottom sheet filter)
- [ ] ค้นหา: subsequence + voice (Web Speech API) + recent/favorites/top-20
- [ ] WebSocket live update (Echo)
- [ ] **PWA**: manifest + service worker + offline cache 7 วัน (IndexedDB)
**ทดสอบ:** iOS Safari + Android Chrome · voice search · อ่านออฟไลน์ · ติดตั้ง PWA

---

## Week 13–14 — Pricelist: Bundles + CR + Quote
- [ ] Bundle (Standard + Mix by Rim)
- [ ] Quote: copy text (LINE) + share link `/q/{short_id}` (7 วัน) + Open Graph
- [ ] CR tiers (global + override รายหมวด) + toggle เงินสด/เครดิต
**ทดสอบ:** คณิต bundle ถูก · ลิงก์เปิดให้ลูกค้าได้ · CR คิดถูก

---

## Week 15–16 — Pricelist: Migration (ย้าย 2,629 รายการ)
- [ ] อัปโหลดหลายไฟล์ Excel + detect schema
- [ ] Algo A (Levenshtein) + Algo B (token/pattern) → จัดกลุ่ม verified/conflict/suspect
- [ ] Round 3 Admin tick UI (compact + bulk + keyboard) + resume (auto-save 10 tick)
- [ ] **`aio:backup-initial`** (PERMANENT + SHA256) ก่อนแตะ AIO
- [ ] create-in-AIO-first flow (flag unmapped)
**ทดสอบ:** ตัวอย่าง match >80% · conflict โชว์ 2 ตัวเลือก · resume ต่อได้

---

## Week 17–18 — Print + Schedule + Restore
- [ ] Print A4/A3 (PDF) — auto-date, logo, markers (⭐/🟨/🔴), ซ่อนทุน/margin
- [ ] หลายมุมมอง B2C/B2B/Internal (ดู PRD 16)
- [ ] Schedule ปรับราคา (cron + apply + Telegram)
- [ ] Restore (snapshot + preview diff + apply)
**ทดสอบ:** PDF เหมือน Excel เดิม · schedule ทำงานตรงเวลา · restore ถูก

---

## Week 19–20 — AIO Write-back
- [ ] เขียนกลับ AIO **field 1-4 เท่านั้น** (field 5 ห้ามแตะ)
- [ ] Sync Queue dashboard (Horizon) + retry escalation + Telegram L1/L2
- [ ] auto-pause (AIO ล่ม>5m / fail>10% / queue>500) · bulk ≤500/รอบ
**ทดสอบ:** เขียน AIO ได้ · field 5 ไม่ขยับ · AIO restart แล้ว recover

---

## Week 14–22 (ขนาน) — Settings Hub
- [ ] Users + Groups + PIN + Devices (UI)
- [ ] Security (password policy, lockout, auto-logout)
- [ ] Notifications config + Audit viewer (filter/export, cipher masked)
- [ ] NAS config + 5-step health test
- [ ] AI Agent management (key/HMAC/IP/rotate)
- [ ] Module registry UI + permission matrix
- [ ] Branding (logo/สี/สกุลเงิน) + System Health dashboard
- [ ] Cipher section (โชว์ map + backup card + change w/ reason)
- [ ] Reports พื้นฐาน

---

## Week 21–22 — Polish + Go-live
- [ ] E2E test (Pest/Playwright)
- [ ] Optimize (query, cache, bundle size)
- [ ] ทดสอบบนเครื่องจริง (iPhone/Android/tablet ในร้าน)
- [ ] เอกสาร: คู่มือ admin/sales/counter + API + runbook
- [ ] **Go-live criteria (เช็คให้ครบ):**
  - [ ] ย้าย 2,629 รายการครบ
  - [ ] ทุก role เห็นคอลัมน์ถูกตามสิทธิ์
  - [ ] cipher ไม่รั่วเลขจริง
  - [ ] AIO sync 2 ทาง
  - [ ] print เหมือนเดิม · audit ครบ · backup/restore ผ่าน
  - [ ] ไม่มี critical bug 1 สัปดาห์

---

## 🤖 การทำงานกับ AI (Claude / พอร์ช)

ทีมเล็ก + AI เป็นหลัก → ทำทีละ feature ให้จบเป็นก้อน:

1. **เริ่ม feature** — ให้ AI อ่าน PRD ที่เกี่ยว + doc นี้ + prototype ก่อน
2. **วางแผนย่อย** — แตก task เป็น migration → model → service → controller → React page → test
3. **เขียนทีละชั้น** — backend (Laravel) ก่อน แล้วต่อ frontend (Inertia/React) ให้ตรง prototype
4. **ทดสอบทุกก้อน** — unit test (โดยเฉพาะ CipherService, permission, sync) ก่อน merge
5. **review** — เช็คเรื่องความปลอดภัยราคา (server ไม่ส่งเลขจริงให้ role ที่ไม่มีสิทธิ์) ทุกครั้ง

**กฎทอง:** ทุกอย่างที่แตะข้อมูล → ต้องมี audit log · ทุกราคาที่อ่อนไหว → ต้องกรองที่ server

---

## 📋 Definition of Done (ต่อ task)
- [ ] โค้ดผ่าน lint + test
- [ ] มี audit log (ถ้าเปลี่ยนข้อมูล)
- [ ] permission ถูกตาม role (ทดสอบ 4 บทบาท)
- [ ] รองรับ TH/EN
- [ ] responsive (ถ้าเป็นหน้า user-facing)
- [ ] ตรงกับ prototype + DESIGN.md

---

*อ้างอิงแผนเต็ม → PRD `05_Implementation_Plan_Phase1.md`, `14_Quality_Gates_and_DoD.md`, `15_Sprint_W1_W2_Detailed.md`*
