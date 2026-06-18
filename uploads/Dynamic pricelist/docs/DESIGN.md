# 🎨 DESIGN.md — TKC Dynamic Pricelist Design System

> ระบบดีไซน์ที่ใช้จริงใน prototype (`TKC Dynamic Pricelist.html` + `styles.css`)
> Frontend ควรพอร์ตค่าเหล่านี้เป็น Tailwind config + CSS variables ใน Laravel/React

**ทิศทาง:** Dark · Industrial · Black + Yellow · เรียบ มินิมอล อ่านง่ายเวลาใช้นาน · สองภาษา ไทย/อังกฤษ

---

## 1. สี (Color tokens)

ใช้ **OKLCH** เพื่อให้สีกลมกลืน (โทนอุ่น near-black + เหลือง industrial) คัดลอกเป็น CSS variables ได้ตรง ๆ:

### พื้นผิว (Surfaces) — โทนดำอุ่น
```css
--bg:          oklch(0.165 0.006 95);   /* พื้นหลังหลัก เกือบดำ */
--surface-1:   oklch(0.205 0.006 95);   /* card, sidebar */
--surface-2:   oklch(0.245 0.007 95);   /* card ยกระดับ, header ตาราง */
--surface-3:   oklch(0.290 0.008 95);   /* hover, control */
--border:      oklch(0.320 0.008 95);
--border-soft: oklch(0.270 0.007 95);
```

### ตัวอักษร (Text)
```css
--text:        oklch(0.960 0.004 95);   /* ข้อความหลัก ขาวอุ่น */
--text-dim:    oklch(0.740 0.006 95);   /* รอง */
--text-faint:  oklch(0.560 0.006 95);   /* label, hint */
```

### แบรนด์ — เหลือง industrial
```css
--yellow:        oklch(0.855 0.155 92);   /* สีหลัก: ปุ่ม, accent, ราคา */
--yellow-bright: oklch(0.900 0.175 95);   /* hover */
--yellow-dim:    oklch(0.760 0.140 90);
--yellow-ghost:  oklch(0.855 0.155 92 / 0.12);  /* พื้นจาง */
--on-yellow:     oklch(0.180 0.020 95);   /* ตัวอักษรบนพื้นเหลือง = ดำ */
```

### สี semantic (chroma/lightness ใกล้กัน เปลี่ยนแค่ hue)
```css
--green:  oklch(0.800 0.150 150);   /* DOT 1 ปี, ออนไลน์, margin, สำเร็จ */
--red:    oklch(0.700 0.190 25);    /* DOT เก่า ≥2 ปี, clearance, error */
--amber:  oklch(0.820 0.150 75);    /* ต้องเบิก (+), ราคาเครดิต, เตือน */
--blue:   oklch(0.760 0.120 240);   /* cipher #2 (ราคาส่ง), info */
/* แต่ละสีมีคู่ -ghost (alpha 0.12-0.16) สำหรับพื้น badge */
```

**กติกาการใช้สี:**
- เหลือง = action หลัก + ราคาขาย + แบรนด์ (ใช้อย่างจงใจ ไม่เกร่อ)
- ดำ = พื้นหลังเสมอ (dark-first)
- แดง/เขียว = ความหมายเชิงข้อมูล (DOT, สถานะ) **ห้าม**ใช้เป็นของตกแต่ง
- cipher #1 (ทุน) ใช้ **เหลือง** · cipher #2 (ราคาส่ง) ใช้ **น้ำเงิน** — แยกประเภทรหัสด้วยสี

---

## 2. ตัวอักษร (Typography)

**ตระกูล IBM Plex** — รองรับไทย+อังกฤษในชุดเดียว, อ่านง่าย, ดู technical แต่เป็นมิตร:

```css
--font-th:   "IBM Plex Sans Thai", "IBM Plex Sans", system-ui, sans-serif;  /* UI ไทย */
--font-en:   "IBM Plex Sans", system-ui, sans-serif;                        /* อังกฤษ */
--font-mono: "IBM Plex Mono", ui-monospace, monospace;                      /* ตัวเลข, รหัส, code */
```
โหลดจาก Google Fonts น้ำหนัก `400/500/600/700`

**สเกล (px):**
| ใช้กับ | ขนาด | น้ำหนัก |
|---|---|---|
| หัวข้อหน้า (H1) | 20–26 | 700 |
| หัวข้อ section | 13–15 | 600 |
| body | 13–14 | 400–500 |
| label/hint | 11–12 | 500 |
| eyebrow (overline) | 11 mono · letter-spacing 0.16em · uppercase | 500 |

**สำคัญ — ตัวเลขทุกตัวใช้ mono + tabular-nums:**
```css
.mono { font-family: var(--font-mono); font-feature-settings: "tnum" 1; }
```
ราคา, สต็อก, รหัส cipher, DOT → ใช้ `.mono` เสมอ เพื่อให้ตัวเลขเรียงตรงในตาราง

---

## 3. Spacing, รัศมี, เงา

```css
/* radii */            /* shadows */
--r-sm: 6px;           --shadow-1: 0 1px 2px rgba(0,0,0,.4);
--r-md: 10px;          --shadow-2: 0 6px 20px -6px rgba(0,0,0,.55);
--r-lg: 16px;          --shadow-3: 0 18px 50px -12px rgba(0,0,0,.7);
--r-xl: 22px;
```
- ปุ่ม/input = `--r-md` · card = `--r-lg` · modal/phone = `--r-xl`
- spacing scale: 4 / 8 / 12 / 16 / 22 / 28 / 32 (ใช้ flex/grid `gap` เป็นหลัก ไม่ใช้ margin รายตัว)
- เงาใช้น้อย — แยกชั้นด้วยสีพื้นผิว (`surface-1/2/3`) มากกว่าเงา

---

## 4. คอมโพเนนต์หลัก (Components)

> ดูตัวจริงทั้งหมดใน prototype · class อ้างอิงใน `styles.css`

### ปุ่ม (Button)
| ชนิด | ใช้เมื่อ | สเปก |
|---|---|---|
| `.btn` | ทั่วไป | พื้น surface-2, ขอบ border, radius md |
| `.btn-primary` | action หลัก | พื้นเหลือง, ตัวอักษรดำ, weight 600 |
| `.btn-ghost` | action รอง | โปร่งใส, hover เป็น surface-2 |
| `.btn-sm` / `.btn-icon` | กระชับ / ไอคอนล้วน | — |

### Chip / Badge
- `.chip` = ตัวกรอง/หมวด (active = พื้นเหลืองจาง + ตัวอักษรเหลือง)
- `.badge-{green|red|amber|blue|yellow}` = ป้ายสถานะ (mono, ghost background)

### Card
- `.card` = พื้น surface-1, ขอบ border-soft, radius lg
- module card บน dashboard: มีแถบสี accent ด้านบน 3px + hover ยกขึ้น `translateY(-2px)` + shadow-2

### ตาราง (Pricelist table) — หัวใจของระบบ
- `table.pl` — header sticky, พื้น surface-2, uppercase label เล็ก
- แถว hover = surface-1, คลิกได้ (cursor pointer) → เปิด popup
- คอลัมน์ตัวเลข = `.cell-num` (ขวา, mono, tabular)
- **สีในเซลล์มีความหมาย:**
  - `+` (ต้องเบิก) → พื้น amber-ghost
  - cipher #1 → ตัวอักษรเหลือง · cipher #2 → ตัวอักษรน้ำเงิน
  - DOT → สีตามอายุ (ดู §5)
  - ⭐ OEM = ดาวเหลือง

### Popup รายละเอียด (Click-for-details)
- modal กลางจอ + backdrop blur, นับถอยหลัง **10 วินาที auto-dismiss** (ตาม PRD)
- แบ่ง section: สต็อก · DOT รายสัปดาห์ (bar) · ราคา · (เฉพาะ admin) ทุน+margin บนพื้นเหลืองจาง
- max-height 90vh + scroll ถ้าเนื้อหายาว

### Input / Toggle / Segmented
- `.input` — พื้น surface-1, focus = ขอบเหลือง
- Toggle = pill เหลืองเมื่อเปิด · Segmented (เงินสด/เครดิต, TH/EN, role) = ปุ่มเหลืองเมื่อเลือก

---

## 5. Pattern เฉพาะธุรกิจ (Domain patterns)

### DOT (อายุยาง) — สีตามปฏิทิน
| อายุ | สี | รูปแบบในตาราง | popup |
|---|---|---|---|
| ปีปัจจุบัน (เช่น 26) | `--text` (กลาง) | `26` | bar เต็ม |
| 1 ปีก่อน (25) | `--green` 🟢 | `25` | — |
| ≥2 ปี (≤24) | `--red` 🔴 | `24` | เตือน |
- หลายปี → ย่อเป็น `23-26` (เก่าสุด-ใหม่สุด), สีตามปีเก่าสุด

### สถานะ (s column)
| ค่า | ความหมาย | สี/พื้น |
|---|---|---|
| `–` | ปกติ | เทาจาง |
| `+` | ต้องเบิก | พื้น amber-ghost + ตัว amber |
| `C` | Clearance | badge แดง |
| รหัส cipher #2 | ส่วนลด = decode × 100 | ตัวแดง |

### Cipher (รหัสลับราคา)
- แสดงเป็น mono, letter-spacing กว้าง (0.06–0.1em)
- #1 ทุน = เหลือง · #2 ราคาส่ง = น้ำเงิน
- ในตาราง editor แสดงรหัส **ใต้** เลขจริงแบบ realtime preview

### สิทธิ์รายคอลัมน์ (Column permissions)
- กรองที่ **ข้อมูล** ไม่ใช่ซ่อนด้วย CSS — แต่ละ role เห็นคอลัมน์ต่างกัน
- prototype จำลองด้วยปุ่ม "ดูในบทบาท" → frontend จริงรับ props จาก server ตาม role

---

## 6. สองภาษา (Bilingual)

- ทุก string มีคู่ ไทย/อังกฤษ — ใน prototype ใช้ helper `tr(lang, th, en)`
- ใน Laravel ใช้ `lang/th.json` + `lang/en.json` + Inertia shared prop `locale`
- ตัวเลข/วันที่: ไทยใช้ พ.ศ. (เช่น "9 มิถุนายน 2569"), อังกฤษใช้ ค.ศ.
- ฟอนต์ IBM Plex Sans Thai รองรับทั้งคู่ → ไม่ต้องสลับ font family

---

## 7. Responsive

| อุปกรณ์ | layout |
|---|---|
| 📱 มือถือ <768px | การ์ดสินค้า 1 คอลัมน์, bottom sheet, ปุ่มใหญ่ (≥44px), ค้นหาเด่น |
| 📱 แท็บเล็ต 768–1024 | ตาราง scroll แนวนอน, sidebar ยุบ |
| 💻 เดสก์ท็อป >1024 | sidebar เต็ม + ตารางหลายคอลัมน์ + editor spreadsheet |

- **Editor (spreadsheet) = เดสก์ท็อปเท่านั้น** · มือถือแสดงการ์ดอย่างเดียว
- Hit target มือถือ ≥ 44px

---

## 8. Motion

- เปลี่ยนหน้า: `translateY(7px)` 0.28s (ease-out) — **ไม่พึ่ง opacity** (กัน flash/ค้างเวลา throttle)
- popup: `translateY + scale` 0.18s
- toggle/hover: 0.13–0.15s
- ไม่มี animation วนซ้ำเพื่อตกแต่ง · เคารพ `prefers-reduced-motion`

---

## 9. การพอร์ตเข้า Tailwind (สำหรับ frontend)

แปลง tokens เป็น `tailwind.config.js`:
```js
theme: { extend: {
  colors: {
    bg: 'var(--bg)', surface: { 1:'var(--surface-1)', 2:'var(--surface-2)', 3:'var(--surface-3)' },
    brand: { DEFAULT:'var(--yellow)', bright:'var(--yellow-bright)' },
    ok:'var(--green)', danger:'var(--red)', warn:'var(--amber)', info:'var(--blue)',
  },
  fontFamily: { sans:['IBM Plex Sans Thai','IBM Plex Sans','system-ui'], mono:['IBM Plex Mono'] },
  borderRadius: { md:'10px', lg:'16px', xl:'22px' },
}}
```
วาง CSS variables ใน `:root` (คัดจาก `styles.css`) แล้วอ้างผ่าน Tailwind — เปลี่ยน theme/brand ได้จาก Settings → Branding ในอนาคต

---

*ค่าทั้งหมดอ้างจาก `styles.css` ใน prototype — ใช้เป็นแหล่งอ้างอิงจริง*
