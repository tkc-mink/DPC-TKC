# CLAUDE.md — บริบทโปรเจกต์สำหรับ AI (อ่านอัตโนมัติ)

> ไฟล์นี้ Claude (VS Code extension / Claude Code) จะอ่านอัตโนมัติทุกครั้งที่เปิดโปรเจกต์
> ใช้กำหนดบริบท + กฎ ให้ AI ช่วยเขียนโค้ดได้ตรงทิศทาง **อ่านไฟล์นี้ก่อนเริ่มทุกงาน**

---

## โปรเจกต์นี้คืออะไร
**TKC Dynamic Pricelist** — เว็บแอประบบราคายางเรียลไทม์ของ TKC AUTO PLUS (อุดรธานี)
พัฒนาต่อยอดจาก Excel เดิม · Phase 1 = Pricelist Module + Settings Hub + Chatbot

## Tech stack (ตกลงแล้ว — อย่าเปลี่ยนถ้าไม่ได้รับอนุญาต)
- **Backend:** Laravel 11 (PHP 8.3+)
- **Frontend:** Inertia.js + React 18 + TypeScript (ไม่แยก Next.js)
- **DB:** PostgreSQL 16 (schema แยกโมดูล: core / pricelist / settings_hub)
- **Cache/Queue:** Redis 7 + Horizon · **Real-time:** Laravel Reverb · **Auth:** Sanctum
- **Build:** Vite + Tailwind + vite-plugin-pwa
- **Deploy:** Docker Compose บน Ubuntu 25.04 + Cloudflare Tunnel

## เอกสารอ้างอิง (อ่านก่อนทำ feature ที่เกี่ยว)
| งานเกี่ยวกับ | อ่านไฟล์ |
|---|---|
| ภาพรวม + เริ่มต้น | `README.md` |
| สถาปัตยกรรม/stack | `docs/ARCHITECTURE.md` |
| สี/ฟอนต์/UI | `docs/DESIGN.md` |
| ตาราง/schema/migration | `docs/DATABASE.md` |
| endpoint/payload | `docs/API.md` |
| รหัสลับราคา | `docs/CIPHER.md` |
| chatbot | `docs/CHATBOT.md` |
| แผนงาน/sprint | `docs/TASKS.md` |
| deploy | `docs/DEPLOYMENT.md` |
| requirement ดั้งเดิม | `_source_prd/*.md` (source of truth) |
| ต้นแบบ UI | `TKC Dynamic Pricelist.html` + `app/*.jsx` (ดูหน้าตา/พฤติกรรมที่ต้องได้) |

## กฎเหล็ก (ห้ามพลาด)
1. **ความปลอดภัยราคา:** DB เก็บเลขจริงเสมอ · cipher ที่ display เท่านั้น · **server ห้ามส่งเลขจริงให้ role ที่ไม่มีสิทธิ์** (กรองที่ API Resource ตาม `COL_PERMS` ไม่ใช่ซ่อนด้วย CSS)
2. **Audit:** ทุก action ที่เปลี่ยนข้อมูล → เขียน `core.audit_log`
3. **AIO:** เขียนกลับ field 1-4 เท่านั้น (field 5 ห้ามแตะ) · ก่อนเขียนครั้งแรกต้อง `aio:backup-initial` · bulk ≤500/รอบ
4. **Cipher keys LOCKED:** #1 ทุน = X T N S F V L C B K · #2 ส่ง = O I Z M D E H Y P R · `A` = ตัวซ้ำ (ดู CIPHER.md)
5. **2 ภาษา:** ทุก string ต้องมีคู่ ไทย/อังกฤษ
6. **ตรงต้นแบบ:** UI ต้องตรงกับ prototype + DESIGN.md (dark, ดำ+เหลือง)

## Definition of Done (ต่อ task)
- [ ] โค้ดผ่าน lint + test (โดยเฉพาะ CipherService, permission, sync)
- [ ] มี audit log ถ้าเปลี่ยนข้อมูล
- [ ] ทดสอบครบ 4 role (admin/btire/dealer/counter)
- [ ] รองรับ TH/EN + responsive
- [ ] ตรงกับ prototype

## วิธีทำงานที่อยากให้ทำ
1. ก่อนเขียน — สรุป requirement + วางแผน task ย่อย (migration → model → service → controller → React page → test) ให้ดูก่อน
2. เขียนทีละชั้น backend ก่อน frontend
3. เขียน test ควบคู่
4. ทุกราคาอ่อนไหว → ทบทวนการกรองสิทธิ์ที่ server ทุกครั้ง

## คำสั่งที่ใช้บ่อย
```bash
php artisan migrate / db:seed / optimize
php artisan reverb:start          # WebSocket
php artisan horizon               # queue
npm run dev / npm run build       # frontend
docker compose up -d              # ทั้งระบบ
```
