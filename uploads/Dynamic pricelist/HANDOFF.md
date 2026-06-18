# 📦 HANDOFF.md — สรุปสิ่งที่ส่งมอบให้ทีมพัฒนา

> ชุดส่งมอบโปรเจกต์ **TKC Dynamic Pricelist** สำหรับทีมพัฒนา (ใช้ร่วมกับ Claude / VS Code)
> วันที่ส่งมอบ: 10 มิ.ย. 2026 · สถานะ: Prototype + เอกสารครบ พร้อมเริ่ม Phase 1

---

## 🚀 เริ่มยังไง (อ่าน 3 ไฟล์นี้ก่อน)
1. **`README.md`** — ภาพรวมโปรเจกต์ + วิธีเริ่ม + แผนที่เอกสารทั้งหมด
2. **`docs/VSCODE_CLAUDE_GUIDE.md`** — วิธีเปิดใน VS Code + ใช้ Claude พัฒนาต่อ (step-by-step)
3. **`CLAUDE.md`** — Claude จะอ่านอัตโนมัติ → เข้าใจบริบท+กฎทันที (ไม่ต้องเปิดเอง)

> เปิดดูต้นแบบเร็ว ๆ: ดับเบิลคลิก **`TKC Dynamic Pricelist.html`** ในเบราว์เซอร์

---

## 📂 มีอะไรในแพ็กนี้

### 1) ต้นแบบ (Prototype) — หน้าตา/พฤติกรรมที่ต้องสร้างให้ได้
| ไฟล์ | คืออะไร |
|---|---|
| `TKC Dynamic Pricelist.html` | ตัวเปิดต้นแบบ (เปิดในเบราว์เซอร์ได้เลย) |
| `styles.css` | Design tokens (สี/ฟอนต์/spacing) — แหล่งอ้างอิงจริง |
| `app/*.jsx` | โค้ดต้นแบบ React 10 ไฟล์ (dashboard, viewer, editor, settings, mobile, chatbot, shell, data, i18n, app) |

**ต้นแบบครอบคลุม 5 หน้า + chatbot:** หน้าแรก · ดูราคา (price ladder + cipher + DOT) · แก้ไขราคา · มุมมองมือถือ · ตั้งค่าระบบ · ผู้ช่วย AI "น้องพอร์ช"

### 2) เอกสารพัฒนา (`docs/`) — 9 ไฟล์
| ไฟล์ | เนื้อหา |
|---|---|
| `ARCHITECTURE.md` | สถาปัตยกรรม + tech stack (Laravel/PostgreSQL) + เหตุผล |
| `DESIGN.md` | Design system: สี/ฟอนต์/component/pattern + วิธีพอร์ตเข้า Tailwind |
| `DATABASE.md` | Schema, migration, ตั้งค่า PostgreSQL, เชื่อม AIO |
| `API.md` | REST endpoints + payload + auth + WebSocket events |
| `CIPHER.md` | สเปกรหัสลับราคา #1/#2 + algorithm + test cases |
| `CHATBOT.md` | Module ผู้ช่วย AI + วิธี implement (role-safe) |
| `TASKS.md` | แตกงาน Phase 1 เป็น sprint + task ติ๊กได้ |
| `DEPLOYMENT.md` | Deploy บน Ubuntu 25.04 + Docker + Cloudflare Tunnel |
| `VSCODE_CLAUDE_GUIDE.md` | คู่มือใช้ VS Code + Claude extension |

### 3) Requirement ดั้งเดิม (`_source_prd/`) — แหล่งความจริง (source of truth)
PRD ต้นฉบับ 17 ไฟล์ (00–16) ที่เอกสารทั้งหมดอ้างอิงมา

### 4) ตั้งค่าโปรเจกต์
| ไฟล์ | คืออะไร |
|---|---|
| `CLAUDE.md` | บริบท+กฎ ให้ Claude อ่านอัตโนมัติ |
| `.gitignore` | พร้อม `git init` ได้เลย |

---

## ✅ Checklist ส่งมอบ
- [x] Prototype คลิกได้ครบ 5 หน้า + chatbot (dark, ดำ+เหลือง, สองภาษา TH/EN)
- [x] Design system (`styles.css` + `DESIGN.md`)
- [x] เอกสารสถาปัตยกรรม/DB/API/Cipher/Chatbot/Tasks/Deploy ครบ
- [x] บริบทสำหรับ AI (`CLAUDE.md`) + คู่มือ VS Code
- [x] PRD ต้นฉบับแนบครบ
- [x] `.gitignore` พร้อม Git

## 🟥 สิ่งที่ทีมต้องเตรียม (P0 — ก่อนเริ่มจริง ดู `docs/TASKS.md`)
- [ ] เอกสาร/credential ของ AIO (MySQL) + test env
- [ ] IP range ออฟฟิศ + internal DNS (`app.tkc.local`)
- [ ] Synology NAS: IP/share/credentials
- [ ] Telegram Bot token + admin chat id
- [ ] HTTPS: Cloudflare Tunnel

---

## ⚠️ กฎเหล็กที่ทีมต้องรู้ (สรุปจาก CLAUDE.md)
1. **ราคา:** DB เก็บเลขจริง · cipher ที่ display · **server ห้ามส่งเลขจริงให้ role ที่ไม่มีสิทธิ์**
2. **Audit:** ทุก action ที่เปลี่ยนข้อมูล → เขียน log
3. **AIO:** เขียนกลับ field 1-4 เท่านั้น · backup ก่อนเขียนครั้งแรก
4. **Cipher LOCKED:** #1 = X T N S F V L C B K · #2 = O I Z M D E H Y P R
5. **2 ภาษา** ทุก string · **ตรงต้นแบบ** เสมอ

---

*คำถามเชิงดีไซน์/พฤติกรรม → เทียบกับ `TKC Dynamic Pricelist.html` · คำถาม requirement → `_source_prd/`*
