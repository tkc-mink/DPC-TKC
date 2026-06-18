# 🧑‍💻 VSCODE_CLAUDE_GUIDE.md — ใช้ VS Code + Claude พัฒนาต่อ

> คู่มือ step-by-step สำหรับทีม: เปิดโปรเจกต์ใน VS Code + ใช้ส่วนขยาย Claude ช่วยเขียนโค้ดต่อ
> เหมาะกับทีมที่ใช้ **AI ช่วยโค้ดเป็นหลัก** — ทำตามลำดับได้เลย

---

## 0. สิ่งที่ต้องมีก่อน
- 💻 คอมพิวเตอร์ (Windows / macOS / Linux)
- 📦 ไฟล์โปรเจกต์ (ที่ดาวน์โหลดมา — แตก zip แล้ว)
- 🌐 อินเทอร์เน็ต
- 🔑 บัญชี **Claude** (claude.ai — แนะนำแพ็กที่ใช้ Claude Code ได้)

---

## 1. ติดตั้ง VS Code
1. โหลดจาก https://code.visualstudio.com → ติดตั้งตามปกติ
2. เปิด VS Code

---

## 2. แตกไฟล์ + เปิดโปรเจกต์
1. แตก zip ที่ดาวน์โหลดมา ไว้ในโฟลเดอร์ เช่น `Documents/tkc-pricelist`
2. ใน VS Code: **File → Open Folder…** → เลือกโฟลเดอร์นั้น
3. จะเห็นโครงสร้าง:
   ```
   TKC Dynamic Pricelist.html   ← ต้นแบบ เปิดดูได้เลย
   app/*.jsx                    ← โค้ดต้นแบบ (React)
   styles.css                   ← design tokens
   CLAUDE.md                    ← บริบทให้ AI (สำคัญ!)
   README.md + docs/*.md        ← เอกสารทั้งหมด
   _source_prd/*.md             ← PRD ดั้งเดิม
   ```

### ดูต้นแบบก่อน (ไม่ต้องลงอะไร)
- คลิกขวาที่ `TKC Dynamic Pricelist.html` → **Open with Live Server** (ถ้าลง extension Live Server)
- หรือดับเบิลคลิกไฟล์เปิดในเบราว์เซอร์ตรง ๆ ก็ได้ → เห็นหน้าตาระบบที่จะสร้าง

---

## 3. ติดตั้งส่วนขยาย Claude

### ตัวเลือก A — Claude Code (แนะนำ) 🌟
ผู้ช่วย AI ที่อ่านทั้งโปรเจกต์ + เขียน/แก้ไฟล์ + รันคำสั่งให้ได้

1. ไปที่แท็บ **Extensions** (ไอคอนสี่เหลี่ยมด้านซ้าย หรือ `Ctrl/Cmd + Shift + X`)
2. ค้นหา **"Claude Code"** (โดย Anthropic) → กด **Install**
3. กด **Sign in** → ล็อกอินด้วยบัญชี Claude
4. เปิดแผง Claude (ไอคอนที่ sidebar หรือ `Cmd/Ctrl + Esc`)
5. ✅ Claude จะอ่าน **`CLAUDE.md`** อัตโนมัติ → เข้าใจโปรเจกต์ทันที

> ℹ️ ชื่อ/วิธีติดตั้งอาจต่างเล็กน้อยตามเวอร์ชัน — ดูหน้าทางการ: https://docs.claude.com/claude-code
> ทางเลือกอื่น: รันผ่าน terminal ด้วยคำสั่ง `claude` ก็ได้ (ติดตั้งตามคู่มือทางการ)

### ตัวเลือก B — ส่วนขยายอื่นที่ใช้ Claude API
มี extension หลายตัวที่ต่อ Claude API ได้ (เช่น Cline) — ใช้แทนกันได้ หลักการเดียวกัน: ชี้ให้มันอ่าน `CLAUDE.md` + `docs/` ก่อนเริ่ม

---

## 4. เริ่มพัฒนา — prompt แรกที่แนะนำ

เปิดแชท Claude แล้วพิมพ์ (ปรับได้):

> อ่าน `CLAUDE.md`, `README.md`, `docs/ARCHITECTURE.md`, `docs/TASKS.md` ก่อน
> แล้วเริ่มงาน **Week 0** ใน TASKS.md ให้ผม: สร้างโปรเจกต์ Laravel 11 + Inertia + React + Vite
> ตั้งค่าเชื่อม PostgreSQL ตาม `.env` ที่อธิบายใน README
> ทำทีละขั้น อธิบายให้ฟังก่อนลงมือ และอย่าเพิ่งเขียนเยอะ ทำเป็นก้อนเล็ก ๆ

จากนั้นทำต่อทีละ feature ตามลำดับใน `docs/TASKS.md` เช่น:
- "ทำ Week 1-2: App shell + Login ตาม prototype หน้า … และ DESIGN.md"
- "implement CipherService ตาม docs/CIPHER.md พร้อม unit test 4 เคส"
- "สร้างหน้า Pricelist Viewer ให้กรองคอลัมน์ตาม role ตาม docs/API.md §2"

---

## 5. เคล็ดลับให้ AI ทำงานแม่น

| ทำ | ผลดี |
|---|---|
| สั่งให้ **อ่าน doc ที่เกี่ยวก่อน** ทุกครั้ง | ตอบตรงบริบท ไม่มั่ว |
| ให้ทำ **ทีละ task เล็ก** แล้ว review ก่อนไปต่อ | คุมคุณภาพได้ |
| ขอให้ **เขียน test ควบคู่** | จับบั๊กเร็ว |
| ย้ำเรื่อง **กรองราคาที่ server** ทุกครั้งที่ทำ pricelist | ราคาทุนไม่รั่ว |
| commit Git บ่อย ๆ (ทุก feature) | ย้อนกลับได้ถ้าพลาด |
| ถ้า AI หลงทาง → ชี้ไฟล์ doc + prototype ให้ดูใหม่ | ดึงกลับเข้าทาง |

---

## 6. ตั้งค่า Git (แนะนำมาก)
```bash
# ใน terminal ของ VS Code (Terminal → New Terminal)
git init
git add .
git commit -m "เริ่มต้น: prototype + เอกสารส่งทีม"
# สร้าง repo บน GitHub (private) แล้ว:
git remote add origin <url-repo-ของคุณ>
git push -u origin main
```
> ขอให้ Claude ช่วยตั้ง `.gitignore` (ไม่ commit `.env`, `vendor/`, `node_modules/`)

---

## 7. เครื่องมือที่ต้องลงตอนเขียนจริง (ให้ Claude ช่วยลงได้)
- PHP 8.3 + Composer · Node 20 · PostgreSQL 16 · Redis 7 · Docker
- หรือใช้ Docker อย่างเดียว (ดู `docs/DEPLOYMENT.md §2`) — ลงน้อยกว่า

> บอก Claude ได้เลย: "ช่วยแนะนำวิธีลง PHP/Composer/PostgreSQL บน [Windows/Mac] ทีละขั้น"

---

## 8. ลำดับงานแนะนำ (อ้าง TASKS.md)
1. **Week 0** — ตั้งโปรเจกต์ + Docker + deploy "Hello TKC"
2. **Week 1-2** — App shell + Login + สลับภาษา + dark theme
3. **Week 3-6** — Auth, Users, Permissions, Audit
4. **Week 7-12** — Pricelist (cipher → editor → viewer → mobile/PWA)
5. **Week 13-16** — Bundles/Quote + Migration ย้าย Excel
6. **Week 17-20** — Print + Schedule + AIO write-back
7. **Week 21-22** — Settings Hub + Chatbot + polish + go-live

> ติ๊ก checkbox ใน `docs/TASKS.md` ไปเรื่อย ๆ จะเห็นความคืบหน้า

---

## ❓ ถ้าติดปัญหา
- ให้ Claude อ่าน error เต็ม ๆ + ไฟล์ที่เกี่ยว แล้วถามวิธีแก้
- เทียบกับ prototype (`TKC Dynamic Pricelist.html`) ว่าหน้าตา/พฤติกรรมตรงไหม
- กลับไปอ่าน doc ที่เกี่ยวใน `docs/`

ขอให้สนุกกับการสร้างครับ 🚀
