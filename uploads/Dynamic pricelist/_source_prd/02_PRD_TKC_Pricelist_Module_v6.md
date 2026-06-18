# PRD: TKC Pricelist Module v6.0 (Web-First)

| Field | Value |
|---|---|
| **Document Type** | Module PRD (sub of SuperApp) |
| **Version** | 6.0 (Web-First Architecture) |
| **Date** | 2026-05-12 |
| **Owner** | ชิบะน้อย (TKC AUTO PLUS) |
| **Module Code** | `pricelist` |
| **API Prefix** | `/api/pricelist` |
| **UI Path** | `/pricelist` |
| **Status** | Design Complete — Phase 1 Ready |
| **Parent** | PRD_TKC_SuperApp_v2.md |
| **Previous** | v5.0 (PWA + Tauri mixed) |

---

## 1. Module Overview

### 1.1 Purpose
แทนที่ Excel-based pricelists ของ TKC AUTO PLUS ด้วย Dynamic Pricelist real-time ที่:
- ดึงข้อมูลจาก AIO (MySQL) อัตโนมัติ
- มี cipher อัตโนมัติ + permission tier
- รองรับการแก้ไข real-time ผ่าน WebSocket
- Print A4 พร้อม layout เหมือนเดิม
- Mobile-friendly สำหรับ sales หน้างาน

### 1.2 Data Scope
- **64 หมวด** ใน Excel หลายไฟล์เดิม
- **~2,629 รายการ** เริ่มต้น + เพิ่มได้
- Support: ยางทุกชนิด, ยางใน, รองขอบ, กระทะ, แบตเตอรี่, น้ำมัน, จาระบี

### 1.3 Web-First Strategy
- **Desktop:** Univer spreadsheet editor (full features for Admin)
- **Mobile:** Simplified table view (viewer + search)
- **Tablet:** Hybrid — depending on orientation
- **No Native** — Web App + PWA covers all use cases for Phase 1

---

## 2. User Groups & Visibility

### 2.1 Default Groups (Pricelist Permissions)

| Group | Sees | Edits | Use Case |
|---|---|---|---|
| 🔧 Admin | All columns + features | ✅ All | บริหารระบบ |
| 🛞 เซลล์ยางใหญ่ | ราคาขายเท่านั้น | ❌ | B2C — end users |
| 🏪 เซลล์ดูแลร้านค้า | B/A/S เท่านั้น (ซ่อนราคาขาย) | ❌ | B2B — dealers |
| 🛒 พนักงานหน้าร้าน | All + CR toggle | ❌ | Counter — mixed |
| 👁️ ลูกค้า (P2) | ราคาขายเท่านั้น | ❌ | Quote link view |

### 2.2 Column-Level Permissions

| Column | Admin | B-Tire | Dealer | Counter |
|---|---|---|---|---|
| ขนาด, ยี่ห้อ, รุ่น | ✅ | ✅ | ✅ | ✅ |
| ทุน (real) | ✅ | ❌ | ❌ | ❌ |
| ทุน Code (cipher #1) | ✅ | ❌ | ❌ | ❌ |
| ราคาขาย | ✅ | ✅ | ❌ | ✅ |
| B/A/S real | ✅ | ❌ | ❌ | ❌ |
| B/A/S Code (cipher #2) | ✅ | ❌ | ✅ | ✅ |
| Bundle real total | ✅ | ✅ | ✅ | ✅ |
| Bundle sales code | ✅ | ❌ | ✅ | ✅ |
| CR Toggle | ✅ | ❌ | ❌ | ✅ |
| Margin | ✅ | ❌ | ❌ | ❌ |
| Stock + DOT | ✅ | ✅ | ✅ | ✅ |
| Edit prices | ✅ | ❌ | ❌ | ❌ |
| Schedule | ✅ | ❌ | ❌ | ❌ |
| Restore | ✅ | ❌ | ❌ | ❌ |
| Search special ($) | ✅ | ❌ | ❌ | ❌ |

---

## 3. Architecture

### 3.1 Module Structure

```
Frontend Module (/modules/pricelist/)
├── pages/
│   ├── dashboard.tsx          (Admin entry)
│   ├── viewer.tsx             (All users — main view)
│   ├── editor.tsx             (Admin — Univer)
│   ├── mobile-viewer.tsx      (Mobile simplified)
│   ├── migration.tsx          (Admin only)
│   ├── bundles.tsx
│   └── settings.tsx           (Cipher, CR, etc.)
├── components/
│   ├── PricelistTable.tsx
│   ├── ClickPopup.tsx
│   ├── SearchBar.tsx
│   ├── BundleBuilder.tsx
│   └── ...
├── hooks/
│   ├── usePricelist.ts
│   ├── useSearch.ts
│   └── ...
├── api/
│   └── pricelistApi.ts
└── index.ts

Backend Module (modules/pricelist/)
├── routes.py
├── models.py
├── services/
│   ├── sync_service.py
│   ├── migration_service.py
│   ├── cipher_service.py
│   └── ...
├── migrations/
└── tests/
```

### 3.2 Mobile vs Desktop View Strategy

```
Browser detects screen size:
  
  📱 < 768px (Mobile):
    - PricelistTableMobile.tsx
    - Card-based layout (1 product per card)
    - Swipe to see B/A/S codes
    - Tap to expand details
    - No Univer (too heavy)
    - Search bar primary
    - Bottom sheet for filters
  
  📱 768-1024px (Tablet):
    - Hybrid table
    - Horizontal scroll for columns
    - Row click expands details
    - Univer optional (toggle "Advanced view")
  
  💻 > 1024px (Desktop):
    - Univer for Admin (full features)
    - Standard table for Sales/Counter
    - Sidebar for filters
    - Multi-column layout
```

---

## 4. Cipher System

### 4.1 Cipher Keys (LOCKED)

**Cipher #1 — ทุน (Admin only):**

| 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 |
|---|---|---|---|---|---|---|---|---|---|
| X | T | N | S | F | V | L | C | B | K |

**Cipher #2 — ราคาส่ง (Sales+):**

| 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 |
|---|---|---|---|---|---|---|---|---|---|
| O | I | Z | M | D | E | H | Y | P | R |

**Reserved:** `A` = ซ้ำตำแหน่งก่อนหน้า (toggle)

### 4.2 Encoding Algorithm

```python
def encode(digits: str, cipher: dict) -> str:
    result = []
    prev_digit = None
    alt = False
    
    for digit in digits:
        if digit == prev_digit:
            alt = not alt
        else:
            alt = False
        
        result.append('A' if alt else cipher[digit])
        prev_digit = digit
    
    return ''.join(result)
```

### 4.3 Setup Wizard
First-time setup → wizard:
1. Welcome
2. Set Cipher #1 (ทุน)
3. Set Cipher #2 (ราคาส่ง)
4. Test encoding
5. Save backup card (PDF/Print)
6. Lock + audit

### 4.4 Change Cipher
- Admin only
- Require reason
- Generate audit event (Critical severity)
- DB stores real numbers → display layer changes only

---

## 5. Universal Schema Engine

### 5.1 Column Types

| Type | Usage |
|---|---|
| `text` | ขนาด, ยี่ห้อ, รุ่น |
| `number` | ชั้น, Ah |
| `currency-cost` | ทุน → cipher #1 |
| `currency-retail` | ราคา → CR-eligible |
| `currency-wholesale` | B/A/S → cipher #2 |
| `status` | s (system + custom symbols) |
| `dot` | DOT (week-level from AIO) |
| `formula` | Margin |
| `enum` | Warranty, Tube |
| `image-auto` | โลโก้ยี่ห้อ |
| `note` | หมายเหตุ |
| `global-var` | ราคาน้ำกรด |
| `compound-price` | คืนหม้อ/ไม่คืน |
| `auto-calc` | เส้นผ่านศูนย์กลาง |
| `placement` (P) | F/R/M/T/D/MN |
| `installation-fee` (ค่าใส่) | currency-retail |
| `rotation-fee` (สลับ) | currency-retail |
| `tread-pattern` (ดอก) | autocomplete |

### 5.2 Schema Examples

**ยางเก๋ง (4-tier):**
```yaml
columns:
  - {name: ขนาด, type: text}
  - {name: ชั้น, type: number}
  - {name: ยี่ห้อ, type: text, image_auto: true}
  - {name: รุ่น, type: text}
  - {name: D, type: dot}
  - {name: ขอบ, type: enum, options: [ด, ข]}
  - {name: ทุน, type: currency-cost}
  - {name: ราคา, type: currency-retail}
  - {name: s, type: status}
  - {name: DT, type: text}
  - {name: Margin, type: formula}
  - {name: W, type: enum}
  - {name: B, type: currency-wholesale}
  - {name: A, type: currency-wholesale}
  - {name: S, type: currency-wholesale}
  - {name: หมายเหตุ, type: note}
flags:
  - oem_star: BOOLEAN
```

---

## 6. Functional Requirements

### 6.1 Admin Editor (Desktop — Univer)

```
Features:
  ✅ Excel-like UI (Univer engine)
  ✅ Dropdown รหัส AIO + Auto-fill
  ✅ Duplicate detection
  ✅ Batch mode (edit หลาย, save ครั้งเดียว)
  ✅ Dark mode
  ✅ Real-time preview cipher
  ✅ Undo/Redo
  ✅ Formula support
  ✅ Multi-sheet
```

### 6.2 Viewer (All Users)

```
Desktop:
  ✅ Full table view (column visibility per role)
  ✅ Search bar (top, always visible)
  ✅ Filters (sidebar)
  ✅ Click-for-details popup
  ✅ Bundle viewer
  ✅ Live update (WebSocket)

Mobile:
  ✅ Card-based product list
  ✅ Bottom sheet filters
  ✅ Search bar
  ✅ Tap → expand to detail page
  ✅ Voice search (Web Speech API)
  ✅ Mix by Rim builder
  ✅ Quote share (text + link)
```

### 6.3 Status (s) Column

| ค่า | ความหมาย | Cell BG |
|---|---|---|
| `-` | ปกติ | white |
| `+` | ต้องเบิก | 🟨 yellow |
| `C` | Clearance | special badge |
| Cipher #2 code | ส่วนลด = decoded × 100 | red text |
| Custom symbols | Admin-defined | Admin-set color |

### 6.4 DOT Display

**Color (calendar-based):**
- ปีปัจจุบัน BE: ⚫
- 1 ปีก่อน: 🟢
- 2+ ปีก่อน: 🔴

**Display Format (in table — short):**
- 1 year: `26`
- Multi: `23-26` (oldest-newest)

**Popup Detail Format:**
```
DOT 26  =>  05      20 เส้น     ← oldest week
        =>  08+  1,019 เส้น     ← newer weeks sum

DOT 25  =>  15+      5 เส้น
DOT 24  =>  05       1 เส้น
DOT 23  =>  06+      3 เส้น

รวม: 1,048 เส้น
```

### 6.5 Click-for-Details Popups (10s auto-dismiss)

**Per Cell Type:**

**ราคา cell:**
```
💰 215/70R15C OT MK2000
📊 Stock: 1,069 / ค้างส่ง 50 / เหลือ 1,019
📅 DOT: [week breakdown]
💵 ราคา: 1,950 / เครดิต 2,050 (+CR 100)
(Admin) ทุน: TBTB (1,818)  Margin: 132
```

**s cell (status):** ความหมาย + ส่วนลด calc (ถ้ามี D)
**B/A/S cell:** Cipher value + after-discount (ถ้ามี D)
**หมายเหตุ cell:** AIO รายละเอียดเพิ่มเติม + Barcode

### 6.6 Search System (Subsequence Matching)

```python
def match(product: str, query: str) -> bool:
    p = normalize(product)  # lowercase, remove special
    q = normalize(query)
    
    i = 0
    for char in p:
        if i < len(q) and char == q[i]:
            i += 1
    return i == len(q)
```

**Examples:**
- Product: `MC 215/70R15 AGILIUS`
- ✅ Match: `21515agi`, `215lius`, `mcr15`
- ❌ No match: `agilis 215` (order wrong)

**Features:**
- Auto-suggest (200ms debounce)
- Voice search (Web Speech API)
- Recent + Favorites + Top 20 best-sellers
- Filters (category, brand, status, DOT, stock)
- Special commands `$mapped`, `$stock=0` (Admin only)

### 6.7 Bundle System

**A. Standard Bundles** (Admin pre-defined, ≤11 rows)
**B. Dynamic Mix by Rim** (cross-category mix)

**Quote Sharing:**
- Copy text (LINE-friendly)
- Share link: `https://app.giantwillow.com/q/{short_id}` (7-day expiry)
- Open Graph preview

### 6.8 CR (Credit Surcharge)

Default tiers:

| Range | Cipher | Surcharge |
|---|---|---|
| 0 – 1K | – | 0 |
| 1K – 2K | IOA | 100 |
| 2K – 4K | ZOA | 200 |
| 4K – 10K | MOA | 300 |
| 10K – 15K | DOA | 400 |
| 15K – 20K | EOA | 500 |
| 20K – 30K | IOAO | 1,000 |
| 30K – 40K | IEOA | 1,500 |
| 40K – 50K | ZOAO | 2,000 |

- Per-piece basis
- Per-category override (Global/Custom/Disabled)
- Bundle: per component → sum

### 6.9 Symbol Library & Customization

System: -, +, C, D + cipher codes
Custom: △ ▽ □ ○ ◇ ★ ☆ ✕ ✓ ⚠ ❗ ...
Per symbol: meaning + bg color + popup text

### 6.10 Scheduled Price Updates

- Scope: row/category/sheet/custom
- Field: ทุน/ราคา/B/A/S
- Change: absolute/+amount/+%
- Effective: future date
- Auto-apply + Telegram alert

### 6.11 Restore System

Snapshots: Auto pre-sync hourly (3) / Daily (3) / Manual (3) / Launch Day (permanent)
UI: Pick → Scope → Preview diff → Confirm

---

## 7. Migration System

### 7.1 Multi-File Upload
Support multiple Excel files concurrently with own Universal Schema.

### 7.2 3-Round Recheck

```
Round 1: Algorithm A (Levenshtein 0.5 + brand 0.3 + size 0.2)
Round 2: Algorithm B (tokenize + pattern + reverse)

Categorization:
  ✅ Verified (A & B agree, ≥90%)
  ⚠️ Conflict (A ≠ B)
  ❌ Suspect (B can't find, <70%)

Round 3: Admin Tick-Approve (hardest first)
  - Compact stacked layout
  - Full AIO product details
  - Bulk tick + filter
  - Keyboard shortcuts
```

### 7.3 Resume Mode
Auto-save every 10 ticks. Multi-day (3-5 days expected).

### 7.3.1 AIO Initial Backup (PERMANENT)
**⚠️ CRITICAL:** Before any AIO write during migration:
1. Backup AIO Field 1-4 for all products → `core.aio_initial_backup`
2. This backup is **PERMANENT** (cannot be deleted)
3. Acts as ultimate rollback safety net
4. Verify backup with SHA256 checksum before proceeding

### 7.4 Create-in-AIO-First

```
Excel row not in AIO → flag ⚠️ Unmapped + tag "needs_aio_create"
Admin creates in AIO → system checks every 15 min → auto-suggest match
```

---

## 8. AIO Integration

### 8.1 Field Mapping

| AIO | Maps to | Sync |
|---|---|---|
| ราคาขาย 1 | ราคาขายปลีก | ✅ |
| ราคาขาย 2 | B | ✅ |
| ราคาขาย 3 | A | ✅ |
| ราคาขาย 4 | S | ✅ |
| ราคาขาย 5 | ห้ามแตะ | ❌ |
| ทุน (แยก) | ทุน | ❌ (read-only) |

### 8.2 Sync Strategy

| Data | Frequency |
|---|---|
| Product master | 15 min |
| Stock + Active + DOT (Lot/Week) | 15 min |
| Images | On-demand + 30-day TTL |
| Price write-back | 15 min + manual |

### 8.3 Initial Migration
- Backup AIO field 1-4 → `core.aio_initial_backup` (permanent)
- pricelist has value → write to AIO
- Empty/unmapped → don't touch AIO

### 8.4 Sync Queue
- Retry: 1/5/15 min escalation
- Alert: Dashboard yellow (5 min) → Telegram L1 (30 min) → L2 (2 hr)
- **Bulk operations max: 500 items per sync cycle** (LOCKED)
- Auto-pause triggers: AIO down >5min OR Failed rate >10% OR Queue >500
- **Detailed UX:** see `12_PRD_AIO_Sync_Queue_UX.md`

---

## 9. Page Layout (Print & Screen)

> 📘 **Note:** Print Out Extensions (Multiple views B2C/B2B/Internal, versioning, distribution, customer documents) → see `16_PRD_Print_Out_Extensions.md` (Phase 1 FULL scope)


### 9.1 Structure

```
┌─────────────────────────────────────────────┐
│  ราคายาง [หมวด] ประจำวันที่ DD MMMM YYYY      │
│                                       หน้า X-XX│
│        [Subtitle หมวด]              [🚗 LOGO] │
├─────────────────────────────────────────────┤
│  Section: ดอกหน้า / ดอกหลัง                  │
│  [rows...]                                    │
├─────────────────────────────────────────────┤
│  📦 Bundle block                              │
├─────────────────────────────────────────────┤
│  💡 Page Notes                                │
├─────────────────────────────────────────────┤
│  📖 Position Legend (if P column)             │
├─────────────────────────────────────────────┤
│  💰 CR Tier (if applicable)                   │
└─────────────────────────────────────────────┘
```

### 9.2 Visual Markers
- ⭐ ดาวเหลือง = OEM
- 🟨 พื้นเหลือง = `+` ต้องเบิก
- 🔴 ตัวเลขแดง = ปียางเก่า ≥2 ปี
- 🔴 ข้อความแดง = car-specific spec

### 9.3 Print Configuration
- Paper: A4 / A3
- Orientation: Portrait / Landscape
- Hide columns: ทุน, Margin, COGS
- Batch print: multiple sheets

---

## 10. Data Model

> 📘 **Note:** Full column definitions for ALL tables → see `09_Database_ERD.md` (Sections 4-5)  
> This section shows schema overview only. Use PRD 09 for migration coding.

```sql
CREATE SCHEMA pricelist;

CREATE TABLE pricelist.categories (
  id           UUID PRIMARY KEY,
  name         VARCHAR(100),
  code         VARCHAR(20),
  sort_order   INT,
  schema_def   JSONB,
  global_vars  JSONB
);

CREATE TABLE pricelist.sheets (
  id              UUID PRIMARY KEY,
  category_id     UUID REFERENCES pricelist.categories,
  name            VARCHAR(100),
  page_number     VARCHAR(20),
  subtitle        VARCHAR(200),
  section_headers JSONB,
  sort_order      INT
);

CREATE TABLE pricelist.rows (
  id              UUID PRIMARY KEY,
  sheet_id        UUID REFERENCES pricelist.sheets,
  row_index       INT,
  aio_product_id  VARCHAR(50),
  status          VARCHAR(20),
  is_oem          BOOLEAN,
  data            JSONB,
  formatting      JSONB,
  created_at      TIMESTAMP,
  updated_at      TIMESTAMP,
  updated_by      UUID,
  deleted_at      TIMESTAMP
);

CREATE TABLE pricelist.bundles (...);
CREATE TABLE pricelist.bundle_rows (...);
CREATE TABLE pricelist.bundle_components (...);
CREATE TABLE pricelist.cr_tiers (...);
CREATE TABLE pricelist.cr_tier_rows (...);
CREATE TABLE pricelist.category_cr_config (...);
CREATE TABLE pricelist.page_notes (...);
CREATE TABLE pricelist.custom_symbols (...);
CREATE TABLE pricelist.cipher_keys (...);
CREATE TABLE pricelist.price_history (...);
CREATE TABLE pricelist.price_schedule (...);
CREATE TABLE pricelist.restore_points (...);
CREATE TABLE pricelist.aio_cache (...);
CREATE TABLE pricelist.sync_queue (...);
CREATE TABLE pricelist.migration_sessions (...);
CREATE TABLE pricelist.user_favorites (...);
CREATE TABLE pricelist.search_history (...);

CREATE MATERIALIZED VIEW pricelist.top_selling_products AS ...;
```

---

## 11. API Endpoints

```
# Categories & Sheets
GET    /api/pricelist/categories
GET    /api/pricelist/sheets/:id
GET    /api/pricelist/sheets/:id/rows

# Rows
GET/POST/PUT/DELETE /api/pricelist/rows[/:id]

# Search
GET    /api/pricelist/search?q=...&filters=...

# Bundles + Quote
GET/POST/PUT /api/pricelist/bundles[/:id]
POST   /api/pricelist/bundles/:id/quote

# CR Tiers
GET/PUT /api/pricelist/cr-tiers[/:scope/:id]

# Migration
POST   /api/pricelist/migration/upload
GET    /api/pricelist/migration/:session
POST   /api/pricelist/migration/:session/round3-tick

# Schedule + Restore
GET/POST/DELETE /api/pricelist/schedule[/:id]
GET/POST /api/pricelist/restore-points[/:id/apply]

# Cipher (Admin)
GET/POST/PUT /api/pricelist/cipher[/setup]

# AIO Sync
POST   /api/pricelist/sync/run
GET    /api/pricelist/sync/queue
POST   /api/pricelist/sync/queue/:id/retry

# Public Quote
GET    /q/:short_id
```

---

## 12. Non-Functional Requirements

| Aspect | Target |
|---|---|
| Search response | < 200ms |
| Edit save | < 500ms |
| Page load | < 2s |
| Mobile rendering | < 1s after data |
| Concurrent users | 30 sustained |
| Sync latency | < 2s end-to-end |
| AIO load impact | < 5% |
| Popup display | 10s auto-dismiss |
| Print render | < 5s per page |
| Quote link load | < 1s |
| Offline cache | 7 days of viewed data |
| WebSocket reconnect | < 3s |

---

## 13. Phase Roadmap (Module)

| Week | Tasks |
|---|---|
| 7-9 | Foundation (Models, Cipher, AIO sync read) |
| 10-12 | Editor (Desktop Univer) |
| 13-14 | Mobile Viewer + Search |
| 15-16 | Migration (3-Round) |
| 17-18 | Bundles + CR + Quote |
| 19 | Print + Schedule + Restore |
| 20 | AIO Write-back + Sync queue |
| 21-22 | Polish + Testing |

---

## 14. Open Questions

**🟡 Still Pending (waiting on vendor):**
- [ ] AIO API documentation
- [ ] AIO image storage structure (chunks)
- [ ] AIO test environment credentials

**Deferred to Phase 3:**
- [ ] Customer location DB (Check-in module)

**✅ LOCKED (see 13_Phase1_Readiness_Tracker.md):**
- ✅ Currency symbol: `บาท` (suffix)
- ✅ Quote link expiry: 7 days
- ✅ AIO connection: Plain TCP on LAN
- ✅ Bulk sync max: 500 items/cycle
- ✅ Conflict resolution: Admin-only manual review

---

## 15. Appendices

### Appendix A: DT Codes

| Code | Full |
|---|---|
| RT | Rough Terrain |
| MT | Mud Terrain |
| AT | All Terrain |
| HT | Highway Terrain |
| HP | Highway Performance |
| RC | Racing |
| RF | Runflat |
| EV | EV |

### Appendix B: Position Codes (P)

| Code | ความหมาย |
|---|---|
| F | หน้า / ทุกตำแหน่ง |
| R | หลัง |
| M | ดอกผสม |
| T | เทเลอร์ |
| D | เพลาขับ |
| MN | ดอกเหมือง |

### Appendix C: Encoding Examples

```
1818 (cipher #1) → TBTB
1111 (cipher #1) → TATA
2500 (cipher #2) → ZEOA
112334567889000 (cipher #2) → IAZMADEHYPAROAO
```

---

**End of TKC Pricelist Module PRD v6.0**

---

## Document History

| Version | Date | Notes |
|---|---|---|
| 1.0-5.0 | 2026-05-12 | Iterative design (Tauri/PWA mixed) |
| **6.0** | **2026-05-12** | **Web-First only — Univer desktop, simplified mobile, full PWA** |
