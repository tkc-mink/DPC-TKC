# 📖 TKC SuperApp — Glossary & Terminology

| Field | Value |
|---|---|
| **Document Type** | Glossary / Terminology Reference |
| **Version** | 1.0 |
| **Date** | 2026-05-12 |
| **Owner** | ชิบะน้อย (TKC AUTO PLUS) |
| **Purpose** | Single source of truth for terms used across all PRDs |
| **Audience** | Developers, Stakeholders, New team members |

---

## How to Use This Glossary

- **Searching:** Ctrl+F (Cmd+F) → type the term
- **Categories:** Terms grouped by domain
- **Cross-references:** Look for "See also:" at end of entries
- **Status:** All terms here = **official terminology** for the project

---

## Table of Contents

1. [Pricelist Domain Terms](#1-pricelist-domain-terms)
2. [System Architecture Terms](#2-system-architecture-terms)
3. [User Roles & Permissions](#3-user-roles--permissions)
4. [Module Names](#4-module-names)
5. [Tech Stack Terms](#5-tech-stack-terms)
6. [Status & Symbol Terms](#6-status--symbol-terms)
7. [Project & Phase Terms](#7-project--phase-terms)
8. [Business & Domain Terms](#8-business--domain-terms)
9. [Acronym Quick Reference](#9-acronym-quick-reference)

---

# 1. Pricelist Domain Terms

### AIO Field 1-5
**Definition:** AIO mysql stores 5 price fields per product.
- **Field 1:** ราคาขายปลีก (retail) — ✅ sync
- **Field 2:** B (wholesale) — ✅ sync
- **Field 3:** A (wholesale) — ✅ sync
- **Field 4:** S (wholesale) — ✅ sync
- **Field 5:** ห้ามแตะ (NEVER touch) — ❌ no sync
**Context:** Sync strategy + initial migration backup
**Example:** Migration backs up Field 1-4 → core.aio_initial_backup
**See also:** AIO, Sync Queue, Initial Migration

---

### B / A / S (Wholesale Prices)
**Definition:** Three wholesale price tiers for dealer customers (Cipher #2 encoded).
- **B (Best):** Lowest wholesale, for top-tier dealers
- **A (Average):** Mid-tier wholesale
- **S (Standard):** Standard wholesale price
**Context:** Pricelist columns; visible to Dealer Sales + Counter
**Visibility:**
- Admin: real numbers
- Dealer/Counter: cipher #2 codes (e.g., "IPEO")
- B-Tire/Customer: HIDDEN
**Important:** NOT additive — these are 3 separate prices, not B+A+S total
**Example:** B=1850 (IPEO), A=1880 (IPPX), S=1900 (IRXX)
**See also:** Cipher #2, Pricelist Column Permissions

---

### Bundle
**Definition:** A set of products sold together (e.g., tire + tube + rim guard).
**Constraints:**
- Max 11 rows per bundle
- Real total = sum of components (auto-calculated)
- Sales price = admin manual (cheaper than sum)
**Two modes:**
1. **Standard Bundles** — Admin pre-defined
2. **Mix by Rim** — Dynamic, sales builds on-the-fly
**Context:** Pricelist feature; shown at bottom of print page
**Example:** Tire 1000-20 + Tube 1000R20 + Rim Guard 20" = Bundle total ฿8,400
**See also:** Mix by Rim, Bundle Row, Bundle Component

---

### Bundle Component
**Definition:** Individual product within a Bundle Row.
**Context:** Bundle architecture
**Schema:** `bundle_components` table; references `pricelist.rows`
**Example:** A 3-product bundle has 3 bundle_components
**See also:** Bundle, Bundle Row

---

### Bundle Row
**Definition:** One line of products in a Bundle (e.g., "ยางหน้า 1000-20").
**Context:** Bundle composition
**Schema:** `bundle_rows` with components in `bundle_components`
**See also:** Bundle

---

### Cipher #1
**Definition:** Encoding map for ทุน (cost prices) — Admin only.
**Map:** `0=X, 1=T, 2=N, 3=S, 4=F, 5=V, 6=L, 7=C, 8=B, 9=K`
**Reserved:** `A` (repeat toggle marker)
**Context:** Hides real cost from anyone except Admin
**Example:** 1818 → TBTB; 1111 → TATA
**Visibility:** Admin only sees cipher #1 codes
**See also:** Cipher #2, Cipher Algorithm, Reserved A

---

### Cipher #2
**Definition:** Encoding map for B/A/S (wholesale prices) — Admin + Dealer + Counter.
**Map:** `0=O, 1=I, 2=Z, 3=M, 4=D, 5=E, 6=H, 7=Y, 8=P, 9=R`
**Reserved:** `A` (repeat toggle marker)
**Context:** Allows wholesale staff to discuss prices without revealing real numbers
**Example:** 1850 → IPEO; 2500 → ZEOA
**See also:** Cipher #1, Cipher Algorithm

---

### Cipher Algorithm
**Definition:** The encoding logic that maps digits → letters with repeat handling.
**Logic:**
```
For each digit:
  - If same as previous digit → toggle A
  - Else → cipher letter
  - Toggle resets on different digit
```
**Examples:**
- 1818 → TBTB (no repeats)
- 1111 → TATA (1-A-1-A pattern)
- 2500 → ZEOA (last 00: O then A)
- 112334567889000 → IAZMADEHYPAROAO
**See also:** Cipher #1, Cipher #2, Reserved A

---

### Cipher Setup Wizard
**Definition:** First-time setup flow for configuring Cipher #1 and #2.
**Steps:**
1. Welcome
2. Map Cipher #1 (cost)
3. Map Cipher #2 (wholesale)
4. Test encoding
5. Generate backup card (PDF)
6. Lock + audit
**Context:** Run once at system launch
**Important:** Changes require admin re-auth + reason + Critical audit
**See also:** Backup Card, Cipher #1, Cipher #2

---

### Click-for-Details Popup
**Definition:** Auto-dismissing popup showing detailed info when clicking pricelist cells.
**Duration:** 10 seconds (resets on hover/click; ESC closes)
**Variants:**
- ราคา cell → Stock + DOT + price + CR
- s cell → Status meaning + discount calc
- B/A/S cell → Cipher value + after-discount
- หมายเหตุ cell → AIO details + Barcode
**Context:** Pricelist viewer UI
**See also:** Status (s) Column, DOT Display Format

---

### CR (Credit Surcharge)
**Definition:** Additional price added for credit-paying customers (delayed payment).
**Logic:** Tier-based, per-piece (not per-bundle-total)
**Default Tiers:**

| Range | Cipher (#2) | Surcharge |
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

**Scope:** Applies to ราคาขายปลีก only (no effect on B/A/S)
**Override:** Per-category (Global / Custom / Disabled)
**See also:** CR Tier, Cash/Credit Toggle

---

### CR Tier
**Definition:** A row in the CR tier table defining price range + surcharge amount.
**Context:** CR system configuration
**Schema:** `cr_tier_rows` (range_min, range_max, surcharge)
**See also:** CR

---

### Cash/Credit Toggle
**Definition:** UI control in pricelist viewer header to switch between cash and credit price display.
**Behavior:**
- Cash mode: shows ราคาขายปลีก
- Credit mode: shows ราคาขายปลีก + CR
**Persist:** Per user session
**See also:** CR, CR Tier

---

### Discount Code (D-code)
**Definition:** Status (s) cipher-encoded discount in increments of 100.
**Logic:** Encoded number × 100 = discount per piece
**Examples:**
- "D" = 4 (cipher #2) × 100 = ฿400 discount
- "IO" = 10 × 100 = ฿1,000 discount
**Display:** Red text in s column
**See also:** Status (s) Column, Cipher #2

---

### DOT
**Definition:** "Date of Tire" — manufacturing date of a tire.
**Format:** Year + Week (from AIO Lot tracking)
**Display Format (in table):**
- 1 year: `26` (current year)
- Multi: `23-26` (oldest-newest range)
**Color rules (calendar-based):**
- ⚫ Current year BE
- 🟢 1 year old
- 🔴 2+ years old (warning)
**Popup Detail Format:**
```
DOT 26  =>  05      20 เส้น
        =>  08+  1,019 เส้น
DOT 25  =>  15+      5 เส้น
รวม: 1,048 เส้น
```
**See also:** DOT Color Rules, DOT Week-level Tracking

---

### DOT Color Rules
**Definition:** Visual color coding for tire age in pricelist viewer.
**Logic:** Based on current calendar year (not when added)
**Rules:**
- 0 years old (current): ⚫ black/normal
- 1 year old: 🟢 green
- 2+ years old: 🔴 red (alert)
**Context:** Helps sales identify tire age at a glance
**See also:** DOT

---

### DOT Week-level Tracking
**Definition:** AIO records DOT at Lot+Week granularity, not just year.
**Format:** Year BE + Week (1-52)
**Example:** DOT 26 → Week 08 (= 2026 Week 8)
**Context:** Display week breakdown in popup; oldest week first
**See also:** DOT

---

### Initial Migration
**Definition:** One-time process to import 2,629 products from Excel to new system.
**Steps:**
1. Backup AIO field 1-4 → `core.aio_initial_backup` (permanent)
2. Upload Excel files
3. Run 3-Round Recheck
4. Admin verification
5. Write to AIO (selective)
**Duration:** 3-5 days × 50-60 min/day
**See also:** 3-Round Recheck, AIO Field 1-5

---

### Mix by Rim
**Definition:** Tool for sales to build a custom Bundle on-the-fly by selecting a rim size.
**Workflow:**
1. Pick rim size (14-22)
2. System filters compatible components
3. Sales adds 2-11 components
4. Real-time total calculation + cipher
5. Generate Quote or "Save as Bundle"
**Cross-category:** Admin defines allowed pairs (e.g., ยางผ้าใบ + กระทะ require approval)
**See also:** Bundle, Cross-Category Mix

---

### Mix Save Workflow
**Definition:** When sales saves a Mix as a Standard Bundle, admin must approve before it's added permanently.
**Status flow:** Draft → Pending Approval → Approved → Active
**See also:** Mix by Rim, Standard Bundle

---

### OEM
**Definition:** "Original Equipment Manufacturer" — tire originally fitted from factory.
**Marker:** ⭐ Yellow star in pricelist
**Context:** Helps identify factory-spec tires for specific car models
**See also:** Star Marker

---

### Page Notes
**Definition:** Markdown text shown at bottom of print page for additional info.
**Examples:**
- Special pricing rules
- Warranty terms
- Contact info
**Schema:** `pricelist.page_notes` (per sheet)
**See also:** Print Layout

---

### Position Codes (P column)
**Definition:** Single-letter codes indicating where a tire fits on truck axles.

| Code | Meaning |
|---|---|
| F | หน้า / ทุกตำแหน่ง (front / all) |
| R | หลัง (rear) |
| M | ดอกผสม (mixed tread) |
| T | เทเลอร์ (trailer) |
| D | เพลาขับ (drive axle) |
| MN | ดอกเหมือง (mining tread) |

**Context:** Truck tire pricelists
**See also:** Position Legend

---

### Position Legend
**Definition:** Reference table on print pages explaining Position Codes (P column).
**Display:** Only printed when sheet has P column
**See also:** Position Codes

---

### Price Schedule
**Definition:** A future-dated price change configured by admin.
**Properties:**
- Scope: row / category / sheet / custom
- Field: ทุน / ราคา / B / A / S
- Change type: absolute / +amount / +%
- Effective date + time
- Notify staff (default ☑)
**Auto-apply:** At scheduled time
**Schema:** `pricelist.price_schedule`
**See also:** Schedule UI

---

### Pricelist Row
**Definition:** Single product entry in pricelist (one product per row).
**Schema:** `pricelist.rows` (JSONB data field for flexibility)
**Fields:** id, sheet_id, row_index, aio_product_id, status, data (JSONB)
**See also:** Sheet, Row Index, Status Field

---

### Quote (Quote Link)
**Definition:** Sharable URL for customers to view a Bundle/product quote.
**URL Format:** `https://app.tkc.local/q/{short_id}`
**Expiry:** 7 days default
**Customer sees:** Image + product name + DOT + total + TKC contact
**Hidden from customer:** Cipher codes, B/A/S, margin
**Open Graph:** Preview renders in LINE chat
**See also:** Open Graph, Bundle

---

### Quote Text
**Definition:** Plain-text format of a Bundle quote, optimized for LINE messaging.
**Example:**
```
📋 ใบเสนอราคา TKC
🔹 ยางผ้าใบ 1000-20 OT (DOT 25-26)
🔹 ยางใน 1000R20
🔹 รองขอบ 20"
รวม: 8,400 บาท
📞 0xx-xxx-xxxx | ขอบเขต: 7 วัน
```
**Use:** Copy → paste into LINE
**See also:** Quote Link

---

### Reserved A
**Definition:** Single letter "A" reserved as the repeat-toggle marker in cipher encoding.
**Rule:** Never use A in Cipher #1 or #2 maps
**Purpose:** Indicates repeating digit in sequence
**Example:** 1111 → TATA (A toggles between digit-letter)
**See also:** Cipher Algorithm

---

### Restore Point
**Definition:** Snapshot of pricelist state at a specific time.
**Types:**
- Auto pre-sync (hourly): 3 latest
- Daily: 3 days
- Manual: 3 latest
- **Launch Day: PERMANENT** (cannot be deleted)
**Use:** Admin can restore prices to any restore point
**Scope:** Whole / category / specific products
**See also:** Restore System

---

### Restore System
**Definition:** Feature allowing admin to revert pricelist changes.
**Workflow:** Pick restore point → choose scope → preview diff → confirm → apply
**Audit:** Creates new audit event (forward-only)
**See also:** Restore Point

---

### Row Index
**Definition:** Position of a row within a sheet (ordering field).
**Context:** Pricelist row ordering
**Schema:** `pricelist.rows.row_index`
**See also:** Pricelist Row, Sheet

---

### Sheet
**Definition:** A logical group of products (e.g., "ยางเก๋ง-15" = car tires rim 15).
**Context:** TKC has 64 sheets across Excel files initially
**Schema:** `pricelist.sheets` (per category)
**See also:** Category, Pricelist Row

---

### Sheet Category
**Definition:** Top-level grouping of sheets (e.g., "ยางเก๋ง" containing rim 14-22 sheets).
**Schema:** `pricelist.categories`
**See also:** Sheet

---

### Special Search Commands
**Definition:** Admin-only search commands prefixed with `$`.
**Available:**
- `$mapped` — products mapped to AIO
- `$unmapped` — pending AIO mapping
- `$new` — recently added
- `$stock=0` — out of stock
- `$dot=23` — has DOT year 23
- `$d` — has discount D-code
**See also:** Search System, Subsequence Matching

---

### Standard Bundle
**Definition:** Admin pre-defined bundle (vs. dynamic Mix by Rim).
**Stored:** Permanent in DB
**Sales price:** Cipher #2 encoded, manually set by admin
**See also:** Bundle, Mix by Rim

---

### Star Marker (⭐)
**Definition:** Visual indicator for OEM products.
**Color:** Yellow star
**Schema:** `pricelist.rows.is_oem` (BOOLEAN)
**See also:** OEM

---

### Status (s) Column
**Definition:** Single character indicating product status.

| Value | Meaning | Cell BG |
|---|---|---|
| `-` | ปกติ (normal) | white |
| `+` | ต้องเบิก (need to order) | 🟨 yellow |
| `C` | Clearance | special badge |
| Cipher #2 code (D, IO, MO...) | Discount × 100 | red text |
| Custom symbols (△▽□○...) | Admin-defined | Admin-set color |

**Context:** Pricelist column; pop on click shows meaning + discount calc
**See also:** Discount Code, Custom Symbol Library, Click-for-Details Popup

---

### Subsequence Matching
**Definition:** Search algorithm where query characters must appear in order (but not necessarily adjacent).
**Logic:**
```python
def match(product, query):
    p = normalize(product)
    q = normalize(query)
    i = 0
    for char in p:
        if i < len(q) and char == q[i]:
            i += 1
    return i == len(q)
```
**Examples:**
- "MC 215/70R15 AGILIUS"
  - ✅ `21515agi`, `215lius`, `mcr15`
  - ❌ `agilis 215` (order wrong)
**Performance:** pg_trgm pre-filter + app-layer filter for ~3K rows
**See also:** Search System, Special Search Commands

---

### Symbol Library
**Definition:** Admin-customizable collection of custom symbols for Status (s) column.
**System symbols (not customizable):** -, +, C, D + cipher codes
**Custom symbols:** △ ▽ □ ○ ◇ ★ ☆ ✕ ✓ ⚠ ❗ etc.
**Per symbol:**
- Meaning text
- Cell background color
- Popup text (shown on click)
**See also:** Status (s) Column, Custom Symbol

---

### Sync Queue
**Definition:** Pending list of items to write back to AIO.
**Retry escalation:** 1 min → 5 min → 15 min
**Alert levels:**
- 5 min: Dashboard yellow
- 30 min: Telegram L1 (admin)
- 2 hr: Telegram L2 (escalation)
**Admin controls:** Pause / Retry / Cancel per item
**Schema:** `pricelist.sync_queue`
**See also:** AIO, Sync Strategy

---

### Sync Strategy
**Definition:** How TKC system communicates with AIO MySQL.
**Read:** Every 15 minutes (cached)
- Product master
- Stock + Active + DOT
- Images on-demand + 30-day TTL
**Write:** Every 15 minutes + manual button
- ราคาขายปลีก → AIO Field 1
- B → AIO Field 2
- A → AIO Field 3
- S → AIO Field 4
- Field 5 = NEVER touch
**AIO Load:** <5%
**See also:** AIO Field 1-5, Sync Queue

---

### 3-Round Recheck
**Definition:** Migration verification process to ensure correct Excel ↔ AIO product matching.
**Round 1:** Algorithm A (Levenshtein 0.5 + brand 0.3 + size 0.2)
**Round 2:** Algorithm B verify (tokenize + pattern + reverse)
**Round 3:** Admin tick-approve (hardest first ❌ → ⚠️ → ✅)
**Output Categories:**
- ✅ Verified (≥90%, A & B agree)
- ⚠️ Conflict (A ≠ B)
- ❌ Suspect (B can't find, <70%)
**Resume mode:** Auto-save every 10 ticks
**See also:** Initial Migration, Algorithm A, Algorithm B

---

### Universal Schema Engine
**Definition:** Flexible column-type system allowing each pricelist sheet to define its own structure.
**Column Types:**
- `text`, `number`, `currency-cost`, `currency-retail`, `currency-wholesale`
- `status`, `dot`, `formula`, `enum`, `image-auto`
- `note`, `global-var`, `compound-price`, `auto-calc`
- `placement`, `installation-fee`, `rotation-fee`, `tread-pattern`
**Storage:** JSONB in `pricelist.rows.data`
**Schema definition:** Per category in `pricelist.categories.schema_def`
**See also:** Pricelist Row, Sheet

---

### Wholesale (B/A/S)
See **B / A / S**

---

# 2. System Architecture Terms

### AIO
**Definition:** TKC's existing Accounting + Stock management system.
**Stack:** MySQL database + desktop app
**Integration:** New system reads + writes selectively (15 min sync)
**See also:** AIO Field 1-5, Sync Strategy

---

### AI Agent Gateway
**Definition:** Restricted API endpoint for AI agents (พอร์ช) to query system data.
**Access:** LAN only (192.168.x.x)
**Auth:** 5-layer security (API key + HMAC + IP whitelist + nonce + rate limit)
**Endpoints:** Audit summaries, NAS health, system status — NO business data
**Rotation:** Auto every 180 days, 7-day grace period
**See also:** HMAC, พอร์ช, IP Whitelist

---

### Audit Log
**Definition:** Comprehensive system event log capturing all actions.
**Coverage:** Auth, Data changes, Sync, Security, Cipher, Settings, etc.
**Storage:** 3-tier (Hot/Warm/Cold)
**Retention:** 3 years
**See also:** 3-Tier Storage, Audit Severity

---

### Audit Severity
**Definition:** Classification of audit events by importance.
- 🔴 **Critical:** Cipher change, mass delete, security breach
- 🟡 **Warning:** Sync fail, failed login
- 🟢 **Info:** Normal edits, login
- ⚪ **Debug:** Search, view (verbose)
**Telegram:** Critical always alerts (even in quiet hours)
**See also:** Audit Log, Telegram Alerts

---

### Auto-logout
**Definition:** Automatic session termination after idle time.
**Per-role defaults:**
- Admin: 60 min
- B-Tire Sales: 30 min
- Dealer Sales: 30 min
- Counter: 15 min
- Options: Never / 5 / 10 / 15 / 30 / 60 / 120 / 240 min
**Warning:** Popup 1 minute before logout
**See also:** Session, Lockout

---

### Backup Card
**Definition:** PDF document containing cipher mappings for offline backup.
**Generated:** During Cipher Setup Wizard
**Contains:** Both Cipher #1 and #2 maps
**Storage:** Print + store offline (not digital)
**Re-print:** Available from Settings > Cipher
**See also:** Cipher Setup Wizard

---

### Core Services
**Definition:** Shared backend services used by all modules.
**Services:**
- Auth (login, JWT, sessions)
- User Service (CRUD, groups, PINs)
- Device Service (whitelist, fingerprint)
- Notification Service (Telegram, in-app)
- Audit Log Service (3-tier storage)
- File Service (uploads, storage)
- Search Service (cross-module)
- Settings Service (config)
- AI Agent Gateway
**Location:** `backend/core/` + `core.*` PostgreSQL schemas
**See also:** Module, Module Registry

---

### Cross-Category Mix
**Definition:** Allowed combination of products from different categories in a Mix by Rim Bundle.
**Example:** ยางผ้าใบ + กระทะ (admin must pre-approve)
**Stored:** `pricelist.bundle_mix_config`
**See also:** Mix by Rim

---

### Device Fingerprint
**Definition:** Unique identifier generated from browser/device characteristics.
**Components:** User-Agent + canvas hash + screen resolution + timezone
**Purpose:** Track devices without cookies; whitelist for external access
**See also:** Device Whitelist, IP Whitelist

---

### Device Whitelist
**Definition:** List of approved devices allowed to login from external IPs.
**Office IPs:** Auto-approved (no whitelist needed)
**External IPs:** Require admin approval first
**Schema:** `core.devices` + `core.device_requests`
**See also:** Device Fingerprint, IP Whitelist

---

### Event Bus
**Definition:** Cross-module event communication system (planned for Phase 3).
**Pattern:** Publish-subscribe
**Use case:** Check-in module emits "visit_completed" → Photo Report subscribes
**Status:** Designed in ADR-016 (pending Phase 3 implementation)
**See also:** Module

---

### Group (Permission Group)
**Definition:** Permission set assigned to users.
**Default groups:** Admin, B-Tire Sales, Dealer Sales, Counter, ลูกค้า
**Custom groups:** Max 10
**User membership:** Max 3 groups per user (permissions union)
**Per-module access:** none / read / write / admin
**Column-level visibility:** Per group (Pricelist specific)
**See also:** Permission Matrix, User

---

### HMAC
**Definition:** Hash-based Message Authentication Code — cryptographic signature.
**Use:** AI Agent Gateway authentication (Layer 4)
**Algorithm:** HMAC-SHA256
**Includes:** Method + path + body + timestamp + nonce
**Validation:** ±5 min timestamp window + nonce replay protection
**See also:** AI Agent Gateway, Nonce

---

### IP Whitelist
**Definition:** List of allowed source IPs for an action.
**AI Agent:** LAN-only (192.168.x.x specific IPs)
**External device:** Requires admin approval
**Office IP range:** Auto-approved
**See also:** AI Agent Gateway, Device Whitelist

---

### JWT (JSON Web Token)
**Definition:** Token format for stateless authentication.
**Lifetime:** Access 15 min + Refresh 30 days
**Storage:** HttpOnly cookie (frontend)
**Contains:** user_id, groups, modules permissions
**See also:** Auth Service, Session

---

### Launch Day Backup
**Definition:** Permanent immutable backup created at system go-live.
**Cannot be:** Deleted, overwritten
**Purpose:** Last-resort recovery option
**Contains:** Full database snapshot + AIO Field 1-4 backup
**See also:** Restore Point, Initial Migration

---

### Lockout
**Definition:** Temporary block after failed login attempts.
**Threshold:** 5 failed attempts
**Duration:** 5 minutes
**Auto-unlock:** Yes (after duration)
**Per-device:** Lock applies to device + username combo (not entire user)
**See also:** Auto-logout, Session

---

### Module
**Definition:** Self-contained feature unit in SuperApp.
**Properties:**
- Own PostgreSQL schema
- Own API prefix (`/api/{code}/*`)
- Own UI route (`/{code}`)
- Own admin tooling
**Examples:** pricelist, settings_hub, checkin, photo_report, voice_report
**Lifecycle:** Install → Enable → Configure → Disable → Uninstall
**Schema:** `core.modules`
**See also:** Module Registry, Core Services

---

### Module Registry
**Definition:** Database table + UI for managing installed modules.
**Schema:** `core.modules`
**UI:** Settings > Modules
**Permissions:** Per-module per-group access levels
**See also:** Module, Permission Matrix

---

### Nonce
**Definition:** Unique random value used once for AI Agent HMAC requests.
**Purpose:** Prevent replay attacks
**Storage:** Redis with 10-min TTL
**See also:** AI Agent Gateway, HMAC

---

### Permission Matrix
**Definition:** Table defining what each group can do per module.
**Format:** group × module → access level
**Levels:** none / read / write / admin
**Cross-module:** Single user identity across all modules
**See also:** Group, Module

---

### PIN (Personal Identification Number)
**Definition:** 4-digit code for shared account user identification.
**Use case:** Counter shared tablet — multiple staff with PINs
**Constraint:** Unique system-wide (no duplicates across all PINs)
**Reuse policy:** 90-day cooling period after deletion
**Auto-logout:** Returns to PIN entry (not full logout)
**Schema:** `core.pins`
**See also:** Shared Account, Auto-logout

---

### PostgreSQL Schema (DB Schema)
**Definition:** Logical namespace within PostgreSQL database.
**Pattern:** Schema-per-module
**Schemas:**
- `core.*` (shared)
- `pricelist.*`
- `settings_hub.*`
- `checkin.*` (Phase 3)
- etc.
**Benefits:** Isolation, easy backup, schema-level permissions
**See also:** Module, Database

---

### Quiet Hours
**Definition:** Time window when non-critical notifications are suppressed.
**Default:** 23:00 - 06:00
**Exception:** 🔴 Critical alerts always send
**Per-user:** Customizable in profile
**See also:** Telegram Alerts, Notification

---

### Service Worker
**Definition:** Background script enabling PWA features (offline, push, sync).
**Tech:** Workbox library
**Features:** Cache management, offline fallback, background sync, push notifications
**See also:** PWA, IndexedDB

---

### Session
**Definition:** Authenticated user state on a device.
**Lifetime:** Until JWT expires or user logs out
**Per-user limits:**
- Admin: Multi-device
- Dealer Sales: 1 active session
- Counter (shared): Multi-device
**See also:** JWT, Auto-logout

---

### Shared Account
**Definition:** User account used by multiple staff via PIN.
**Use case:** Counter tablets (น้องมิ้ว, น้องเอ share one account, different PINs)
**Tracking:** Each action audited with PIN holder name
**See also:** PIN, Counter

---

### Telegram Bot Token
**Definition:** API token for sending messages via Telegram.
**Sources:**
- System bot (for admin alerts)
- Per-user bot (optional, for personal notifications)
**Storage:** Encrypted in DB
**See also:** Telegram Alerts, Notification

---

### Telegram Alerts
**Definition:** Real-time notifications sent via Telegram Bot.
**Channels:**
- System bot → all admins
- Per-user bot → individual notifications
**Quiet hours:** Apply except Critical
**Use cases:** Sync failures, device requests, security events, scheduled apply
**See also:** Telegram Bot Token, Quiet Hours

---

### 3-Tier Storage (Audit Log)
**Definition:** Three-level storage strategy for audit log retention.
**Tiers:**

| Tier | Location | Age | Query Speed | Size |
|---|---|---|---|---|
| Hot | PostgreSQL | 0-3 months | <100ms | ~600 MB |
| Warm | Local SSD .jsonl.gz | 3-12 months | 2-5s | ~300 MB |
| Cold | NAS .jsonl.gz | 1-3 years | 5-30s | ~1.2 GB |

**Purge:** > 3 years
**Migration:** Auto on 1st of each month, 02:00
**See also:** Audit Log, Synology NAS

---

### WebSocket
**Definition:** Persistent bidirectional connection between client and server.
**Use:** Real-time updates (price changes, notifications)
**Per-module:** Different channels
**Auth:** Shared JWT
**See also:** Real-time, API Gateway

---

# 3. User Roles & Permissions

### Admin (🔧)
**Code:** `admin`
**Description:** Full system administration
**Sees:** Everything (all columns, cipher, audit, settings)
**Edits:** All prices, schedules, restores
**Sessions:** Multi-device
**Auto-logout:** 60 min default
**See also:** Group, Permission Matrix

---

### B-Tire Sales (🛞)
**Code:** `b_tire`
**Description:** "เซลล์ยางใหญ่" — B2C sales (end customers)
**Sees in Pricelist:** ราคาขายปลีก only (B/A/S hidden)
**Sessions:** Multi-device
**Auto-logout:** 30 min default
**See also:** B2C, Group

---

### Counter Staff (🛒)
**Code:** `counter`
**Description:** "พนักงานหน้าร้าน" — counter staff (shared account)
**Sees:** All columns + CR toggle
**Account type:** Shared + PIN per staff
**Sessions:** Multi-device (different PINs)
**Auto-logout:** 15 min default (security-sensitive)
**See also:** Shared Account, PIN

---

### Customer (👁️)
**Code:** `customer`
**Description:** End customer viewing quote (Phase 2+)
**Sees:** Quote link only — image + name + DOT + total + TKC contact
**No login required:** Public link with 7-day expiry
**See also:** Quote Link, Phase 2

---

### Dealer Sales (🏪)
**Code:** `dealer`
**Description:** "เซลล์ดูแลร้านค้า" — B2B sales (dealers/shops)
**Sees in Pricelist:** B/A/S cipher #2 codes only (ราคาขายปลีก hidden)
**Sessions:** **1 active session** (kicks old on new login)
**Auto-logout:** 30 min default
**Security:** Stricter (B2B is sensitive)
**See also:** B/A/S, B2B, Cipher #2

---

### AI Agent / พอร์ช (🤖)
**Description:** TKC's master AI agent on Mac Mini M4
**Auth:** API Key + HMAC + IP whitelist + nonce
**Scope:** Read-only audit summaries + system health
**Restrictions:** LAN only, no business data, rate-limited
**See also:** AI Agent Gateway, HMAC

---

# 4. Module Names

### Check-in Module (📍)
**Code:** `checkin`
**Status:** Phase 3
**Purpose:** GPS-based visit logging for outdoor sales reps
**Features:** GPS check-in/out, customer locations, route history, geofencing
**See also:** Phase 3, GPS

---

### Photo Report Module (📷)
**Code:** `photo_report`
**Status:** Phase 3
**Purpose:** Field photo documentation
**Features:** Multi-photo, auto-watermark, geo-tag, albums, AI tagging (P4)
**See also:** Phase 3, Camera API

---

### Pricelist Module (💰)
**Code:** `pricelist`
**Status:** Phase 1 (primary)
**Purpose:** Dynamic pricing replacement for Excel-based pricelists
**Features:** Editor (Univer), viewer, cipher, bundles, CR, search, migration, AIO sync
**See also:** Phase 1, Univer

---

### Settings Hub (⚙️)
**Code:** `settings_hub`
**Status:** Phase 1 (parallel)
**Purpose:** Cross-module admin tools
**Features:** Users, devices, security, notifications, audit, NAS, modules, branding
**See also:** Phase 1, Core Services

---

### Voice Report Module (🎙️)
**Code:** `voice_report`
**Status:** Phase 3
**Purpose:** Voice-recorded reports with auto-transcription
**Features:** Recording, Google STT, daily summary, search by content
**See also:** Phase 3, Google STT

---

# 5. Tech Stack Terms

### API Gateway
**Definition:** Single entry point for all API requests, with routing + auth.
**Stack:** FastAPI middleware
**Functions:** CORS, rate limit, auth check, module routing, audit log
**See also:** Module, API

---

### Capacitor
**Definition:** Framework wrapping web apps as native mobile apps.
**Status:** Optional (Phase 3+ if PWA features insufficient)
**Use case:** Background GPS, advanced camera (Phase 3 Check-in/Photo)
**See also:** PWA, Tauri, Web-First

---

### Cloudflare Tunnel
**Definition:** Secure tunnel from external internet to internal services.
**Use:** Allows external access without exposing public IP
**Auth:** Cloudflare Access (additional layer)
**See also:** TLS, Reverse Proxy

---

### Docker / Docker Compose
**Definition:** Container platform for service orchestration.
**Use:** All services (Nginx, frontend, backend, postgres, redis)
**Config:** docker-compose.yml
**See also:** Nginx, FastAPI

---

### FastAPI
**Definition:** Modern Python web framework for building APIs.
**Version:** Python 3.11+
**Features:** Async, auto OpenAPI docs, Pydantic validation
**See also:** API Gateway, Backend

---

### IndexedDB
**Definition:** Browser-side database for offline data.
**Use:** PWA offline cache (Pricelist data)
**Wrapper:** Dexie.js
**See also:** PWA, Service Worker

---

### Jetpack Compose / SwiftUI
**Definition:** Modern UI frameworks for Android/iOS native.
**Status:** ❌ Not used (Web-First decision)
**See also:** Web-First, Capacitor

---

### MediaDevices API
**Definition:** Browser API for accessing camera/microphone.
**Use:** Phase 3 Photo Report (camera), Voice Report (microphone)
**See also:** Web Speech API

---

### Next.js
**Definition:** React framework with SSR, routing, optimization.
**Version:** 14 (App Router)
**Features:** Server components, code-splitting, static generation
**See also:** React, PWA

---

### Nginx
**Definition:** Web server / reverse proxy.
**Use:** Static file serving, reverse proxy to FastAPI, TLS termination (with Cloudflare)
**See also:** Cloudflare Tunnel

---

### pgvector
**Definition:** PostgreSQL extension for vector similarity search.
**Use:** AI semantic search, embedding storage (future Phase 4+)
**See also:** PostgreSQL

---

### pg_trgm
**Definition:** PostgreSQL extension for trigram-based fuzzy text search.
**Use:** Pre-filter for subsequence matching in pricelist search
**See also:** Subsequence Matching, Search Service

---

### PostgreSQL
**Definition:** Open-source relational database.
**Version:** 16
**Extensions:** pgvector, pg_trgm
**Use:** Primary database for all modules
**See also:** Schema-per-Module, ACID

---

### PWA (Progressive Web App)
**Definition:** Web app installable like native app.
**Features:** Offline (Service Worker), push notifications, home screen icon, splash screen
**Distribution:** Browser → "Add to Home Screen"
**See also:** Service Worker, Web Push, Manifest

---

### React
**Definition:** JavaScript UI library.
**Version:** 18
**Used with:** Next.js, TypeScript, Tailwind CSS, shadcn/ui
**See also:** Next.js, shadcn/ui

---

### Redis
**Definition:** In-memory data store.
**Version:** 7
**Use:** Cache, queue (Pub/Sub), session, rate limit, nonce storage
**See also:** Sync Queue, Rate Limit

---

### Service Worker
See [Service Worker](#service-worker) above.

---

### shadcn/ui
**Definition:** React component library built on Radix UI + Tailwind.
**Use:** Accessible UI components (Button, Dialog, Table, etc.)
**See also:** React, Tailwind CSS

---

### Tailwind CSS
**Definition:** Utility-first CSS framework.
**Use:** Styling all components
**See also:** shadcn/ui

---

### TanStack Query (React Query)
**Definition:** Data fetching + cache library for React.
**Use:** Server state management, automatic refetching, optimistic updates
**See also:** Zustand

---

### Tauri
**Definition:** Framework wrapping web apps as native desktop apps.
**Version:** 2.x
**Status:** Phase 2 optional (admin .exe for Windows/Mac/Linux)
**See also:** Capacitor, Web-First

---

### TypeScript
**Definition:** Typed superset of JavaScript.
**Use:** All frontend code
**See also:** JavaScript, React

---

### Univer
**Definition:** JavaScript spreadsheet engine (Excel-like).
**Use:** Admin pricelist editor (desktop only)
**Limitation:** Heavy (~50 MB JS) — not loaded on mobile
**See also:** Mobile Strategy, Code-Splitting

---

### Web Push API
**Definition:** Browser API for push notifications.
**Status:** iOS 16.4+ support
**Fallback:** Telegram
**See also:** PWA, Notification

---

### Web Speech API
**Definition:** Browser API for speech recognition + synthesis.
**Use:** Voice search (Pricelist)
**Limitation:** Thai accuracy varies by browser
**See also:** Google STT, Voice Report

---

### WebSocket
See [WebSocket](#websocket) above.

---

### Workbox
**Definition:** Library for Service Worker management.
**Use:** PWA caching strategies, offline fallback, background sync
**See also:** Service Worker, PWA

---

### Zustand
**Definition:** Lightweight React state management.
**Use:** Client-side state (UI preferences, transient data)
**See also:** TanStack Query

---

# 6. Status & Symbol Terms

### ⭐ Star (Yellow)
**Meaning:** OEM product (factory-fitted)
**Context:** Pricelist row marker

---

### 🟨 Yellow Highlight
**Meaning:** Status `+` (ต้องเบิก — needs reorder)
**Context:** Stock alert

---

### 🔴 Red Text (Numbers)
**Meaning:** Old DOT year (≥2 years)
**Context:** DOT column warning

---

### 🔴 Red Text (Description)
**Meaning:** Car-specific spec note
**Context:** Special compatibility requirements

---

### 🟢 Green Dot
**Meaning:** Recently updated (within 1 hour)
**Context:** Live viewer indicator

---

### 🟡 Yellow Dot
**Meaning:** Updated today
**Context:** Live viewer indicator

---

### 🆕 New Badge
**Meaning:** Recently added product
**Context:** Sales viewer marker

---

### ✨ Sparkle
**Meaning:** Just edited (real-time, within minutes)
**Context:** WebSocket update indicator

---

### 🔴 Red Circle (Stock)
**Meaning:** Stock = 0
**Context:** Inventory alert

---

### 🕐 Clock
**Meaning:** Has Scheduled Update pending
**Context:** Upcoming price change indicator

---

### 🔗 Link Icon
**Meaning:** Product mapped to AIO (verified)
**Context:** Migration status

---

### ⚠️ Warning Triangle
**Meaning:** Unmapped (pending AIO mapping)
**Context:** Migration status

---

### 🗑️ Trash Can
**Meaning:** Soft-deleted (within 30-day retention)
**Context:** Recently deleted items

---

# 7. Project & Phase Terms

### Phase 1
**Definition:** Foundation phase — core services + Pricelist module + Settings Hub.
**Duration:** 22 weeks
**Deliverable:** Production-ready web app
**See also:** Phase 2, Phase 3

---

### Phase 2
**Definition:** Polish phase — wrappers + push + optimization.
**Duration:** 8 weeks (weeks 23-30)
**Deliverables:** Tauri admin .exe, Web Push, performance tuning
**See also:** Phase 1, Tauri

---

### Phase 3
**Definition:** Field modules phase — Check-in, Photo Report, Voice Report.
**Timing:** 3-6 months after Phase 1 launch
**See also:** Check-in, Photo Report, Voice Report

---

### Phase 4+
**Definition:** Business modules — CRM, Sales Stats, Delivery, Tickets, Chat.
**Timing:** 6-12+ months later
**See also:** Module Roadmap

---

### TKC SuperApp
**Definition:** Single-codebase web application for TKC AUTO PLUS employees.
**Architecture:** Web-First (React/Next.js + PWA)
**Modules:** Multiple (Pricelist, Settings, Check-in, etc.)
**See also:** Module, Web-First

---

### Web-First
**Definition:** Architecture strategy prioritizing web app over native.
**Primary:** Web App + PWA (single React codebase)
**Optional wrappers:** Tauri (desktop), Capacitor (mobile)
**See also:** PWA, Native Wrappers

---

# 8. Business & Domain Terms

### B2B (Business-to-Business)
**Definition:** Sales to other businesses (dealers, shops).
**TKC role:** Dealer Sales (เซลล์ดูแลร้านค้า)
**Pricing:** B/A/S wholesale tiers
**See also:** Dealer Sales, B/A/S

---

### B2C (Business-to-Consumer)
**Definition:** Sales to end customers.
**TKC role:** B-Tire Sales (เซลล์ยางใหญ่)
**Pricing:** ราคาขายปลีก (retail)
**See also:** B-Tire Sales, Retail Price

---

### Mass Adoption
**Definition:** Goal for users to easily adopt the system.
**Key factors:** Browser-based (no install), responsive, fast
**Measured by:** % staff using daily, time-to-onboard
**See also:** Web-First, PWA

---

### TKC AUTO PLUS
**Definition:** Company name — auto service center in Udon Thani, Thailand.
**Owner:** ชิบะน้อย
**Business:** Tire/battery/oil sales + service
**See also:** AIO, Pricelist

---

### TKC-AI
**Definition:** TKC's AI infrastructure for internal use.
**Hardware:** 4× DGX Spark cluster + Mac Mini M4 + PC with 2× RTX Pro 4000
**Components:** พอร์ช agent, OpenClaw gateway, AIO integration
**See also:** พอร์ช, OpenClaw

---

### พอร์ช
**Definition:** TKC's master AI agent.
**Platform:** OpenClaw Gateway on Mac Mini M4
**Model:** MiniMax-M2.7 (current)
**Access:** AI Agent Gateway (LAN-only)
**See also:** AI Agent Gateway, OpenClaw

---

# 9. Acronym Quick Reference

| Acronym | Full Form | See Section |
|---|---|---|
| AIO | (Internal name) Accounting + Stock system | System |
| API | Application Programming Interface | Tech |
| B2B | Business-to-Business | Business |
| B2C | Business-to-Consumer | Business |
| BE | Buddhist Era (year) | Pricelist |
| CR | Credit Surcharge | Pricelist |
| DOT | Date of Tire | Pricelist |
| DT | (Tread pattern code) | Pricelist |
| FK | Foreign Key (database) | Tech |
| GPS | Global Positioning System | Phase 3 |
| HMAC | Hash-based Message Authentication Code | Security |
| JWT | JSON Web Token | Tech |
| LAN | Local Area Network | Tech |
| MVP | Minimum Viable Product | Project |
| OEM | Original Equipment Manufacturer | Pricelist |
| P0/P1/P2 | Priority levels (Critical/High/Medium) | Project |
| PDF | Portable Document Format | Tech |
| PIN | Personal Identification Number | User |
| POS | Point of Sale | Business |
| PRD | Product Requirements Document | Project |
| PWA | Progressive Web App | Tech |
| RAID | Redundant Array of Independent Disks | Storage |
| RBAC | Role-Based Access Control | Security |
| RPO | Recovery Point Objective | Operations |
| RTO | Recovery Time Objective | Operations |
| SaaS | Software as a Service | Tech |
| SDK | Software Development Kit | Tech |
| SMB | Server Message Block (NAS protocol) | Storage |
| SQL | Structured Query Language | Tech |
| SSD | Solid State Drive | Storage |
| SSL | Secure Sockets Layer (now TLS) | Security |
| SSO | Single Sign-On | Security |
| STT | Speech-to-Text | Phase 3 |
| TKC | TKC AUTO PLUS (company) | Business |
| TLS | Transport Layer Security | Security |
| TTL | Time To Live | Tech |
| UI | User Interface | Tech |
| UUID | Universally Unique Identifier | Tech |
| UX | User Experience | Tech |
| WS | WebSocket | Tech |

---

## Term Conflict Resolution

**ถ้าเจอคำที่ใช้แตกต่างกันใน PRD vs implementation:**
1. Glossary นี้ = source of truth
2. ถ้า glossary ไม่ตรงกับ business reality → update glossary first
3. Then update PRD/code to match

---

## Maintenance

**This document should be updated when:**
- New domain term emerges (e.g., new pricelist column type)
- New module introduced (Phase 3+)
- Major refactor changes terminology
- Stakeholder clarifies meaning of term

**Owner:** Lead developer / PM
**Review cadence:** Monthly during active development

---

**End of Glossary v1.0**

| Version | Date | Notes |
|---|---|---|
| 1.0 | 2026-05-12 | Initial glossary covering ~150 terms across 9 categories |
