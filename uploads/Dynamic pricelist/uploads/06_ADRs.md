# 📐 TKC SuperApp — Architecture Decision Records (ADRs)

| Field | Value |
|---|---|
| **Document Type** | Architecture Decision Records |
| **Version** | 1.0 |
| **Date** | 2026-05-12 |
| **Owner** | ชิบะน้อย (TKC AUTO PLUS) |
| **Status** | Active (15 ADRs documented) |

---

## What are ADRs?

Architecture Decision Records (ADRs) เก็บบันทึก **เหตุผล** เบื้องหลังการตัดสินใจสำคัญด้าน architecture — ป้องกัน "ทำไมเลือกแบบนี้?" 6 เดือนข้างหน้า

**Format ต่อ ADR:**
- **Status:** Accepted / Proposed / Superseded / Deprecated
- **Context:** ทำไมต้องตัดสินใจ
- **Decision:** ตัดสินใจอะไร
- **Consequences:** ข้อดี/ข้อเสีย/ผลกระทบ
- **Alternatives Considered:** ทางเลือกอื่นที่พิจารณา

---

## Index

| # | Title | Status | Impact |
|---|---|---|---|
| ADR-001 | Web-First Architecture (vs Native) | ✅ Accepted | Critical |
| ADR-002 | Module-based SuperApp Pattern | ✅ Accepted | Critical |
| ADR-003 | PostgreSQL + Schema-per-Module | ✅ Accepted | High |
| ADR-004 | Cipher System Design | ✅ Accepted | Critical |
| ADR-005 | 3-Tier Audit Log Storage | ✅ Accepted | High |
| ADR-006 | AI Agent Gateway Security | ✅ Accepted | High |
| ADR-007 | User Groups + Column-level Permissions | ✅ Accepted | High |
| ADR-008 | AIO Integration (Read + Selective Write) | ✅ Accepted | Critical |
| ADR-009 | Migration 3-Round Recheck | ✅ Accepted | Medium |
| ADR-010 | Subsequence Search Algorithm | ✅ Accepted | Medium |
| ADR-011 | Univer Desktop-Only Strategy | ✅ Accepted | Medium |
| ADR-012 | CR Tier System Design | ✅ Accepted | Medium |
| ADR-013 | Bundle Two-Mode (Standard + Mix) | ✅ Accepted | Medium |
| ADR-014 | Click-for-Details Popup Pattern | ✅ Accepted | Low |
| ADR-015 | Synology NAS Storage Strategy | ✅ Accepted | Medium |

---

# ADR-001: Web-First Architecture (vs Native)

**Status:** ✅ Accepted (2026-05-12, replaces earlier Native decision)  
**Decision Makers:** ชิบะน้อย, Claude

## Context

TKC SuperApp ต้องรันได้บนหลายอุปกรณ์ที่พนักงานใช้ — iPhone, Android, Windows, Mac, Tablet — และต้องสามารถขยายฟีเจอร์ได้ใน Phase 3 (GPS check-in, photo, voice)

**Initial decision (เก่า):** Native iOS Swift + Android Kotlin
- เหตุผลเดิม: performance, native features

**ปัญหาที่เห็น:**
- 2-3 codebases ต้อง maintain ขนาน
- App Store approval delays (ต้องรอ Apple/Google)
- Onboarding ใหม่ต้อง install
- Update ต้องรอ user อนุมัติ
- Mass adoption ยาก

## Decision

**Web-First Strategy:**
- ✅ Primary: React/Next.js + PWA (single codebase)
- ✅ Optional wrapper: Tauri (Phase 2, admin desktop .exe)
- ✅ Optional wrapper: Capacitor (Phase 3, only if background GPS/camera ต้องการ)
- ❌ ไม่ใช้: Pure Swift iOS / Kotlin Android

## Consequences

**Good:**
- ✅ 1 codebase to maintain
- ✅ Deploy instant (no app store delay)
- ✅ Browser = universal entry — open URL ก็ใช้ได้
- ✅ Auto-update เมื่อเปิดแอป
- ✅ Development cost ลด ~60%
- ✅ Mass adoption easier

**Bad:**
- ⚠️ iOS PWA push limited (only iOS 16.4+)
- ⚠️ Background GPS limited บน PWA → ต้อง Capacitor wrapper สำหรับ Phase 3
- ⚠️ Performance ต่ำกว่า native ~10-20% (acceptable for TKC scale)
- ⚠️ Univer (spreadsheet) หนัก ต้อง code-split

## Alternatives Considered

1. **Pure Native (iOS Swift + Android Kotlin)** — rejected (too much overhead)
2. **React Native** — rejected (limited Univer support, complexity)
3. **Flutter** — rejected (less mature for spreadsheet)
4. **PWA Only (no wrappers ever)** — partial (Phase 3 needs Capacitor)

---

# ADR-002: Module-based SuperApp Pattern

**Status:** ✅ Accepted (2026-05-12)  
**Decision Makers:** ชิบะน้อย, Claude

## Context

TKC ต้องการรวมเครื่องมือทุก functions ของพนักงาน (Pricelist, Check-in, Photo Report, Voice Report, CRM, Sales Stats, etc.) เข้าเป็นแอปเดียว แต่ฟีเจอร์มีจำนวนมาก ขยายต่อเนื่อง — ต้องไม่ให้ module ใหม่กระทบของเดิม

## Decision

**Module Pattern:**
- 1 SuperApp shell (user-facing)
- Multiple Modules ภายในเดียวกัน, ทำ lazy-loaded
- Each Module:
  - Own PostgreSQL schema (`pricelist.*`, `checkin.*`)
  - Own API prefix (`/api/pricelist/*`)
  - Own UI route (`/pricelist`)
  - Own admin tooling (separate program)
- Core Services shared (auth, users, audit, notifications, files)
- Module Registry table tracks installed modules + permissions per group

## Consequences

**Good:**
- ✅ Module ใหม่เพิ่มได้ไม่กระทบของเดิม
- ✅ Schema isolation (drop schema = uninstall)
- ✅ Different teams สามารถพัฒนา module ต่างกันได้
- ✅ Permission per module per group
- ✅ Future-proof สำหรับ Phase 4+ modules

**Bad:**
- ⚠️ Cross-module integration (e.g., Photo Report linked to Check-in visit) ต้องออกแบบ event bus
- ⚠️ Module Registry เป็น additional layer
- ⚠️ Permission matrix ซับซ้อนขึ้น (group × module × access level)

## Alternatives Considered

1. **Monolithic single app** — rejected (ขยายยาก, coupling สูง)
2. **Microservices (separate apps)** — rejected (overhead เกินไปสำหรับ TKC scale)
3. **Plugin system (truly external)** — rejected (over-engineered)

---

# ADR-003: PostgreSQL + Schema-per-Module

**Status:** ✅ Accepted (2026-05-12)  
**Decision Makers:** ชิบะน้อย, Claude

## Context

ต้องเลือก database + organization strategy

**Requirements:**
- Multi-module data isolation
- JSONB support (Universal Schema Engine)
- Vector search (pgvector for AI features)
- ACID compliance
- Backup ต่อ module ได้

## Decision

**PostgreSQL 16 + Schema-per-Module:**
- `core.*` — shared (users, groups, audit, etc.)
- `pricelist.*` — Pricelist module
- `settings_hub.*` — Settings module
- `checkin.*` — Phase 3
- `photo_report.*`, `voice_report.*` — Phase 3
- pgvector extension for AI similarity
- pg_trgm for fuzzy search

## Consequences

**Good:**
- ✅ Module isolation at schema level
- ✅ Easy backup per module (`pg_dump --schema=pricelist`)
- ✅ Schema-level permissions (DB user per module if needed)
- ✅ pgvector native (no separate vector DB)
- ✅ pg_trgm for search built-in
- ✅ JSONB perfect for Universal Schema Engine

**Bad:**
- ⚠️ Cross-schema FK ใช้ระวัง (loose coupling needed)
- ⚠️ All-in-one DB = single point of failure (need backup strategy)
- ⚠️ Postgres learning curve สำหรับทีมเก่าใช้ MySQL

## Alternatives Considered

1. **MySQL (AIO เดิม)** — rejected (limited JSONB, no pgvector)
2. **MongoDB** — rejected (need ACID for prices)
3. **Per-module separate database** — rejected (overhead, cross-module queries hard)
4. **Sqlite** — rejected (concurrent users 30+)

---

# ADR-004: Cipher System Design

**Status:** ✅ Accepted (2026-05-12)  
**Decision Makers:** ชิบะน้อย, Claude

## Context

Pricelist ต้องแสดง:
- ทุน (cost) → admin only
- ราคาส่ง (B/A/S wholesale) → dealer sales เท่านั้น
- ราคาขายปลีก (retail) → everyone

ถ้า dealer sales เห็น code "TBTB" แทน "1818" → ลูกค้า (ที่อาจแอบดู) จะไม่รู้ราคาจริง

## Decision

**Two Cipher Maps + Reserved Toggle:**

```
Cipher #1 (cost): 0=X, 1=T, 2=N, 3=S, 4=F, 5=V, 6=L, 7=C, 8=B, 9=K
Cipher #2 (wholesale): 0=O, 1=I, 2=Z, 3=M, 4=D, 5=E, 6=H, 7=Y, 8=P, 9=R
Reserved: A (repeat marker)

Algorithm:
- Each digit → cipher letter
- ถ้าซ้ำตัวก่อนหน้า → toggle A
- 1818 → TBTB
- 1111 → TATA (T-A-T-A สลับ)
- 2500 → ZEOA (Z-E-O-A สลับ)
```

## Consequences

**Good:**
- ✅ Visual: ดูแล้วไม่รู้ว่าตัวเลขจริงคืออะไร
- ✅ Reverse-engineering ยากขึ้น (มี 10! permutations × A toggle)
- ✅ Stable: cipher set once, ไม่ต้องเปลี่ยน
- ✅ Cipher ต่างกัน 2 ชุด → ทุน vs ราคาส่ง แยกกันชัดเจน
- ✅ DB เก็บ real numbers — cipher คือ display layer

**Bad:**
- ⚠️ Pattern detectable ถ้าคนเห็นตัวอย่างเยอะ (~100+)
- ⚠️ Repeat pattern (1818) ยังคงเห็น repeat (TBTB)
- ⚠️ User ต้อง memorize ถ้าจะ decode mentally
- ⚠️ Cipher leak = ทุกราคา exposed

**Mitigations:**
- Audit log cipher views
- Periodic cipher rotation (admin manual)
- Reserved characters (A) สามารถเพิ่มได้ในอนาคต

## Alternatives Considered

1. **Encryption (AES)** — rejected (output ยาวเกินไป, display ไม่ work)
2. **Hash + lookup** — rejected (1818 → same hash ทุกครั้ง, just as breakable)
3. **Server-side render with role** — rejected (complex, still leaks if role compromised)
4. **No cipher (just role-based hide)** — rejected (admin glance over shoulder?)

---

# ADR-005: 3-Tier Audit Log Storage

**Status:** ✅ Accepted (2026-05-12)  
**Decision Makers:** ชิบะน้อย, Claude

## Context

Audit log ต้องเก็บ 3 ปี — ทุก event ทุก module → ประมาณ 3-7 GB ต่อปี

ถ้าเก็บใน PostgreSQL ทั้งหมด:
- DB ขนาดใหญ่ → slow query
- Backup ใหญ่
- Index maintenance หนัก

## Decision

**3-Tier Storage:**

```
Hot:  PostgreSQL (0-3 months)
      Query < 100ms
      ~600 MB
      
Warm: Spark #1 Local SSD (.jsonl.gz)
      /var/audit/warm/{yyyy}/{mm}.jsonl.gz
      Query 2-5s
      ~300 MB

Cold: Synology NAS (.jsonl.gz)
      /volume1/tkc/audit-archive/{yyyy}/{mm}.jsonl.gz
      Query 5-30s
      ~1.2 GB

Auto-Purge: > 3 years

Migration Schedule:
- ทุกวันที่ 1 ของเดือน 02:00
- Hot → Warm (3 เดือนเก่า)
- Warm → Cold (1 ปีเก่า)
- Cold → Purge (3 ปีเก่า)
- SHA256 checksum verify
```

## Consequences

**Good:**
- ✅ Hot tier ขนาดเล็ก → query เร็ว
- ✅ Cold tier ราคาถูก (NAS storage)
- ✅ 3-year retention compliant
- ✅ Query API auto-merge ทุก tier
- ✅ NAS offline = Hot/Warm ยัง work

**Bad:**
- ⚠️ Query cold tier ช้า (5-30s)
- ⚠️ Migration job ต้อง maintain
- ⚠️ NAS dependency for full history
- ⚠️ Recovery from corrupted .jsonl.gz ต้องระวัง

## Alternatives Considered

1. **All in PostgreSQL** — rejected (DB size 5+ GB, slow)
2. **Cloud (S3/Backblaze)** — rejected (cost, offsite for sensitive data)
3. **Elasticsearch** — rejected (overkill, separate cluster cost)
4. **Auto-delete > 1 year** — rejected (audit/compliance needs)

---

# ADR-006: AI Agent Gateway Security

**Status:** ✅ Accepted (2026-05-12)  
**Decision Makers:** ชิบะน้อย, Claude

## Context

พอร์ช (TKC's AI master agent) ต้องเข้าถึงข้อมูล system สำหรับ:
- ดู audit log summary
- Health monitoring
- System status

แต่ห้ามเข้าถึง business data (prices, customer info) — agent compromise = data leak

## Decision

**5-Layer Security:**

```
Layer 1: Network Firewall
  → LAN only (192.168.x.x), no internet access

Layer 2: IP Whitelist
  → Only registered IPs (Mac Mini M4, Spark #2)

Layer 3: API Key
  → X-Agent-Key header
  → Auto-rotate every 180 days
  → 7-day grace period

Layer 4: HMAC Signature
  → X-Signature with timestamp + nonce
  → Replay protection
  → ±5 min timestamp window

Layer 5: Scope + Rate Limit
  → Only allowed endpoints
  → 100/min, 1000/hour
  → Response filtering (no prices, no business data)
```

**Allowed Endpoints:**
```
GET /api/agent/audit/summary       (counts only)
GET /api/agent/audit/errors        (no price content)
GET /api/agent/audit/security
GET /api/agent/nas/health
GET /api/agent/system/status
```

**Blocked:**
- /api/pricelist/*
- Individual event details with prices
- User PII

## Consequences

**Good:**
- ✅ Defense in depth — compromise 1 layer ≠ full access
- ✅ Auto-rotation reduces long-term key exposure
- ✅ Read-only + restricted scope = limited damage
- ✅ Agent activity fully audited
- ✅ Telegram alerts on suspicious activity

**Bad:**
- ⚠️ Complex setup for new agents (5 layers)
- ⚠️ Key rotation requires coordination with agent
- ⚠️ NAS health endpoint reveals storage status (low risk)

## Alternatives Considered

1. **No agent access** — rejected (พอร์ช ต้องใช้ข้อมูล)
2. **Simple API key only** — rejected (single point of failure)
3. **Full OAuth2** — rejected (overkill for LAN-only single agent)
4. **mTLS** — partial (would add but HMAC simpler for now)

---

# ADR-007: User Groups + Column-level Permissions

**Status:** ✅ Accepted (2026-05-12)  
**Decision Makers:** ชิบะน้อย, Claude

## Context

TKC มีพนักงานหลาย role:
- Admin (เห็นทุกอย่าง)
- เซลล์ยางใหญ่ (B2C, ขายตรงลูกค้าปลายทาง)
- เซลล์ดูแลร้านค้า (B2B, ขายส่ง dealers)
- พนักงานหน้าร้าน (counter, รวมทุก role)

Pricelist มี column:
- ทุน (cost)
- ราคาขายปลีก (retail)
- B/A/S (wholesale)

แต่ละ role ต้องเห็น column ต่างกัน

## Decision

**Multi-Layer Permission:**

```
Layer 1: Module Access (per Group)
  none / read / write / admin

Layer 2: Column Visibility (Pricelist specific)
  Each group has allowed columns array
  Stored in groups.columns_visible JSONB

Layer 3: User-Group Membership
  Max 10 custom groups
  User in max 3 groups (union perms)
  Relogin required on group change
```

**Default Groups:**

| Group | Modules | Pricelist Columns |
|---|---|---|
| Admin | All admin | All |
| B-Tire | Pricelist read | ราคาขายปลีก only |
| Dealer | Pricelist read | B/A/S only (hide ราคาขายปลีก) |
| Counter | Pricelist read | All visible |
| ลูกค้า | Quote view only | ราคาขายปลีก only |

## Consequences

**Good:**
- ✅ Single user identity ข้ามทุก module
- ✅ Granular column-level control
- ✅ Union permissions (user multi-group)
- ✅ Easy to extend (เพิ่ม custom groups)
- ✅ Audit log captures permission usage

**Bad:**
- ⚠️ Permission matrix ซับซ้อนใน UI
- ⚠️ User ใน 3 groups ต้อง careful จัด priority
- ⚠️ Column visibility tied to Pricelist (other modules ใช้ different scheme)
- ⚠️ Relogin disruption ตอน group change

## Alternatives Considered

1. **Role-based (RBAC) simple** — rejected (ไม่ flexible enough)
2. **Attribute-based (ABAC)** — rejected (overkill)
3. **Per-user permissions** — rejected (maintenance nightmare 30+ users)
4. **2 groups only** — rejected (TKC มี B2C/B2B/Counter distinct)

---

# ADR-008: AIO Integration Strategy

**Status:** ✅ Accepted (2026-05-12)  
**Decision Makers:** ชิบะน้อย, Claude

## Context

TKC's existing system AIO (Accounting + Stock) เก็บ:
- Product master data
- Stock + DOT (week-level)
- Image (chunks structure)
- Multiple price fields (1-5)

ใหม่ Pricelist ต้อง:
- ใช้ข้อมูลล่าสุดจาก AIO
- ไม่ทำให้ AIO down
- เขียนกลับ AIO field 1-4 (sync)
- ห้ามแตะ field 5

## Decision

**Read + Selective Write Strategy:**

```
READ (15 min cron):
  - Product master
  - Stock + Active + DOT (Lot/Week)
  - Images on-demand + 30-day TTL cache
  - Cache in core.aio_cache

WRITE (15 min + manual):
  - ราคาขายปลีก → AIO field 1
  - B → AIO field 2
  - A → AIO field 3
  - S → AIO field 4
  - Field 5 → NEVER TOUCH

INITIAL MIGRATION:
  - Backup AIO field 1-4 → core.aio_initial_backup (permanent)
  - Pricelist has value → write to AIO
  - Empty/unmapped → don't touch AIO

CONFLICT RESOLUTION:
  - Sync queue with retry (1/5/15 min escalation)
  - Telegram alert on failure
  - Admin can pause/retry/cancel per item
```

## Consequences

**Good:**
- ✅ AIO load < 5% (cached reads)
- ✅ Field 5 protected (immutable for AIO)
- ✅ INITIAL backup permanent = always restorable
- ✅ Sync queue handles transient failures
- ✅ Manual sync override สำหรับ urgent updates

**Bad:**
- ⚠️ AIO dependency (if AIO down, sync ค้าง)
- ⚠️ Eventual consistency (15 min lag)
- ⚠️ AIO schema changes break sync
- ⚠️ Image storage chunks reconstruction complex

## Alternatives Considered

1. **Replace AIO entirely** — rejected (out of scope, AIO does more than pricing)
2. **Direct AIO query (no cache)** — rejected (AIO load too high)
3. **Write to AIO field 5 too** — rejected (Owner explicit prohibition)
4. **Daily sync** — rejected (too slow for real-time needs)

---

# ADR-009: Migration 3-Round Recheck

**Status:** ✅ Accepted (2026-05-12)  
**Decision Makers:** ชิบะน้อย, Claude

## Context

ต้อง migrate ~2,629 products จาก Excel หลายไฟล์ → match กับ AIO products
- ชื่อ format ไม่ตรง (Excel เขียนสั้น, AIO เขียนเต็ม)
- บางตัว AIO ไม่มี
- บางตัว Excel ไม่มีใน AIO

Single-pass matching risk: ผิดพลาด → ราคาผิดเป็นจำนวนมาก

## Decision

**3-Round Recheck:**

```
Round 1: Algorithm A (auto-match)
  Levenshtein name similarity (0.5)
  Brand match (0.3)
  Size match (0.2)
  Score 0-100%

Round 2: Algorithm B (verify)
  Tokenize + word-level match
  Pattern match (size in description)
  Reverse lookup

Categorize:
  ✅ Verified (A & B agree, ≥90%)
  ⚠️ Conflict (A ≠ B)
  ❌ Suspect (B can't find, <70%)

Round 3: Admin Tick-Approve (manual)
  Hardest first (❌ → ⚠️ → ✅ low → ✅ high)
  Compact stacked layout
  Full AIO product details shown
  Bulk tick + filter
  Keyboard shortcuts (Space/↑↓/O/R)
  
Resume Mode:
  Auto-save every 10 ticks
  Multi-day (3-5 days expected)
  ~50-60 min/day = sustainable
```

## Consequences

**Good:**
- ✅ Triple verification → minimize errors
- ✅ Hardest first → admin focus where it matters
- ✅ Resume mode = sustainable for multi-day work
- ✅ Bulk tools for easy cases
- ✅ Audit trail per match decision

**Bad:**
- ⚠️ Time intensive (3-5 days admin effort)
- ⚠️ Algorithm A+B tuning required (initial calibration)
- ⚠️ ⚠️ user fatigue → mistakes
- ⚠️ Resume mode complexity

## Alternatives Considered

1. **Manual mapping only** — rejected (2,629 items too many)
2. **Auto-match only (1-round)** — rejected (error rate too high)
3. **Use AI/ML model** — partial (could improve Algorithm A in future)
4. **Skip migration, start fresh** — rejected (loses Excel work)

---

# ADR-010: Subsequence Search Algorithm

**Status:** ✅ Accepted (2026-05-12)  
**Decision Makers:** ชิบะน้อย, Claude

## Context

Sales ใช้ search หาสินค้าบ่อย — ต้อง:
- พิมพ์เร็ว (mobile keyboard)
- ทนต่อ typo
- ไม่ต้องจำลำดับ field exact
- Performance < 200ms
- Cross-field (size, brand, model in one query)

## Decision

**Subsequence Matching (in application layer):**

```python
def match(product: str, query: str) -> bool:
    p = normalize(product)  # lowercase + remove special
    q = normalize(query)
    
    i = 0
    for char in p:
        if i < len(q) and char == q[i]:
            i += 1
    return i == len(q)
```

**Pipeline:**
1. pg_trgm pre-filter (PostgreSQL): get top 100 candidates
2. Subsequence match (app layer): filter to ~10-20
3. Rank by relevance
4. Redis cache top queries

**Special commands** (Admin only):
- `$mapped`, `$unmapped`, `$new`
- `$stock=0`, `$dot=23`, `$d`

## Consequences

**Good:**
- ✅ Forgiving: typo + missing chars ยังเจอ
- ✅ Cross-field natural (ขนาดยี่ห้อรุ่น ตาม order ในชื่อ)
- ✅ Fast (~200ms for 2,629 rows)
- ✅ Simple to implement
- ✅ User-friendly

**Bad:**
- ⚠️ Order-dependent (ค้น "agilis 215" ไม่เจอ "215 agilis")
- ⚠️ False positives สำหรับ very short queries
- ⚠️ Voice search → subsequence might fail (voice ใส่ภาษาเต็ม)
- ⚠️ ภาษาไทยไม่ลื่นเท่า English (subsequence ยาว)

**Mitigations:**
- Normalize Thai vowel placement
- Voice mode toggle to full-text search

## Alternatives Considered

1. **Exact substring match** — rejected (too strict)
2. **Full-text search (ts_vector)** — partial (good for description but not codes)
3. **Levenshtein** — rejected (slow for 2,629 rows)
4. **Elasticsearch** — rejected (overkill, separate cluster)

---

# ADR-011: Univer Desktop-Only Strategy

**Status:** ✅ Accepted (2026-05-12)  
**Decision Makers:** ชิบะน้อย, Claude

## Context

Univer = JavaScript spreadsheet engine (Excel-like) — admin edit pricelist 
แต่ Univer หนัก (~50 MB JS, complex DOM)

Mobile (iPhone, Android) — Univer ช้า, kill battery, layout ไม่ work

## Decision

**Adaptive UI per screen size:**

```
< 768px (Mobile):
  - Card-based product list (TanStack Table)
  - Swipe to see B/A/S codes
  - Tap to expand details
  - NO Univer (skip entirely)

768-1024px (Tablet):
  - Hybrid table (horizontal scroll)
  - Univer optional (toggle "Advanced view")
  - Row click expands details

> 1024px (Desktop):
  - Univer for Admin (full features)
  - Standard table for Sales/Counter
  - Sidebar for filters
```

## Consequences

**Good:**
- ✅ Mobile experience smooth (no Univer overhead)
- ✅ Admin still gets full Excel-like editor
- ✅ Code-splitting: Univer only loads on desktop
- ✅ Battery friendly on mobile
- ✅ Tablet has option (toggle)

**Bad:**
- ⚠️ Two UI codepaths to maintain
- ⚠️ Feature parity not 100% (mobile can't bulk edit)
- ⚠️ Admin on mobile = limited editing
- ⚠️ Confusion possible ("ทำไม mobile ไม่มีปุ่มนั้น?")

## Alternatives Considered

1. **Univer ทุก platform** — rejected (mobile UX terrible)
2. **Native spreadsheet (Handsontable, ag-Grid)** — rejected (less features than Univer)
3. **Custom mobile editor** — rejected (build cost)
4. **No mobile edit, view only** — partial (admin can't edit on phone)

---

# ADR-012: CR Tier System Design

**Status:** ✅ Accepted (2026-05-12)  
**Decision Makers:** ชิบะน้อย, Claude

## Context

ลูกค้าเครดิต = ราคาแพงกว่าเงินสด (compensate for delayed payment + risk)

ก่อนมี CR system: sales ต้องคำนวณบวกราคาเองทุกครั้ง → error-prone

## Decision

**Tier-based Surcharge System:**

```
Default CR Table:
  0 – 1K       → 0
  1K – 2K      → +100  (IOA)
  2K – 4K      → +200  (ZOA)
  4K – 10K     → +300  (MOA)
  10K – 15K    → +400  (DOA)
  15K – 20K    → +500  (EOA)
  20K – 30K    → +1,000 (IOAO)
  30K – 40K    → +1,500 (IEOA)
  40K – 50K    → +2,000 (ZOAO)

Rules:
  - Per-piece (not per-bundle-total)
  - Applies to ราคาขายปลีก only (no B/A/S effect)
  - Per-category override: Global / Custom tier / Disabled
  - Bundle: per-component CR → sum
```

**Display:**
- Toggle Cash/Credit on viewer header
- Inline: `9,700 / 9,900 (CR)`

## Consequences

**Good:**
- ✅ Sales just toggle Cash/Credit — auto calc
- ✅ Consistent pricing (no manual error)
- ✅ Per-category flexibility (some categories skip CR)
- ✅ Audit trail
- ✅ Cipher encoded → wholesale view safe

**Bad:**
- ⚠️ 9 tiers complex
- ⚠️ Tier boundary edge cases (ราคา 999.50 vs 1,000.50)
- ⚠️ Per-category override = config burden for admin
- ⚠️ Future tier changes affect history pricing display

## Alternatives Considered

1. **Percentage-based CR (e.g., +3%)** — rejected (Owner wants flat tiers)
2. **Single rate (e.g., always +200)** — rejected (not fair across price ranges)
3. **Per-customer CR** — partial (Phase 4+ feature?)
4. **No CR (manual)** — rejected (current pain point)

---

# ADR-013: Bundle Two-Mode (Standard + Mix by Rim)

**Status:** ✅ Accepted (2026-05-12)  
**Decision Makers:** ชิบะน้อย, Claude

## Context

Bundle = ขายเป็นชุด (ยาง + ยางใน + รองขอบ + กระทะ)

Use cases:
- A: Admin pre-define common bundles (sale price specific)
- B: Customer มากับขอบล้อแปลกใหม่ → sales mix on-the-fly

## Decision

**Two Modes:**

```
Standard Bundles (Admin pre-defined):
  ≤11 rows per bundle
  Real total = sum components (auto)
  Sales bundle price = admin manual (cheaper than sum)
  Cipher #2 encoded
  Show at bottom of print
  
Dynamic Mix by Rim (Sales tool):
  Button "🔧 Mix by Rim" on viewer
  Pick rim → filter components
  Cross-category mix (admin allows pairs)
  Real-time total + cipher
  "Save as Bundle" → admin approve

Quote Sharing:
  Copy text (LINE format)
  Share link (7-day expiry, Open Graph preview)
```

## Consequences

**Good:**
- ✅ Common case fast (Standard)
- ✅ Edge case flexible (Mix by Rim)
- ✅ Admin control over allowed mixes
- ✅ Quote sharing = easy customer comms
- ✅ Save back to Standard (long-term efficiency)

**Bad:**
- ⚠️ Two systems to maintain
- ⚠️ Mix by Rim UI complex (Bundle Builder)
- ⚠️ Admin approval queue สำหรับ Save mix
- ⚠️ Quote link domain (price.tkc.co?) ต้อง setup

## Alternatives Considered

1. **Standard bundles only** — rejected (no flex for new rims)
2. **Mix only (no Standard)** — rejected (slow for common cases)
3. **AI-suggested bundles** — partial (Phase 4+ enhancement)

---

# ADR-014: Click-for-Details Popup Pattern

**Status:** ✅ Accepted (2026-05-12)  
**Decision Makers:** ชิบะน้อย, Claude

## Context

Pricelist cell มีข้อมูลซ่อน (cipher, stock breakdown, DOT week-level, AIO notes) — แสดงทุก cell ไม่ practical

ต้อง balance: ข้อมูลพร้อม vs UI clean

## Decision

**Click Cell → Auto-dismiss Popup:**

```
Click cell → popup shows
Auto-dismiss: 10 seconds
Hover/click → reset timer
ESC → close

4 Popup Types:
  ราคา → Stock + DOT breakdown + price + CR
  s    → Status meaning + discount calc
  B/A/S → Cipher value + after-discount
  หมายเหตุ → AIO details + Barcode
```

## Consequences

**Good:**
- ✅ Clean default UI
- ✅ Detail on demand
- ✅ 10s = enough to read, not too long
- ✅ Works on mobile (tap)
- ✅ Consistent pattern across cell types

**Bad:**
- ⚠️ Need to click (vs hover for desktop power users)
- ⚠️ 10s timer might be too short for elderly users
- ⚠️ Multiple popups → stacking issues
- ⚠️ Mobile: popup covers other content

**Mitigations:**
- Configurable timer (per user preference)
- Pinned mode for power users
- ESC to dismiss

## Alternatives Considered

1. **Tooltip on hover** — rejected (mobile no hover)
2. **Always-expanded cell** — rejected (UI cluttered)
3. **Side panel (drawer)** — partial (could add for mobile)
4. **Modal dialog** — rejected (too intrusive)

---

# ADR-015: Synology NAS Storage Strategy

**Status:** ✅ Accepted (2026-05-12)  
**Decision Makers:** ชิบะน้อย, Claude

## Context

TKC มี Synology NAS อยู่แล้ว — ขนาดใหญ่ ใช้สำหรับ backup

Web App ต้องการเก็บ:
- Audit log cold tier (1-3 ปี)
- Photo Reports (Phase 3, ขนาดใหญ่)
- Voice files (Phase 3)
- Backup database

## Decision

**NAS as Cold Storage + Archive:**

```
Hot (Spark #1 SSD):
  - PostgreSQL data
  - Recent files (< 30 days)
  - Audit log hot tier

Warm (Spark #1 SSD):
  - Audit log warm (.jsonl.gz)
  - Working cache

Cold (Synology NAS):
  - Audit log archive (1-3 years)
  - Photos (>30 days)
  - Voice files (>30 days)
  - Database backups

Connection: SMB/NFS mount on Spark #1
Health check: Weekly auto + manual
Fallback: Buffer locally if NAS offline
```

**NAS Configuration UI in Settings:**
- 5-step connection test
- Auto-mount on Spark #1
- Quota monitoring

## Consequences

**Good:**
- ✅ Reuse existing infrastructure
- ✅ Large capacity (multi-TB)
- ✅ RAID protection (Synology default)
- ✅ Snapshot capability
- ✅ Cost effective vs cloud

**Bad:**
- ⚠️ NAS = single point of failure (need backup of backup)
- ⚠️ Network latency (vs local SSD)
- ⚠️ NAS Synology updates may break compatibility
- ⚠️ Spark #1 dependency on NAS

**Mitigations:**
- Hot/warm fallback if NAS offline
- Weekly health check + Telegram alerts
- Off-NAS backup quarterly (manual)

## Alternatives Considered

1. **All on Spark #1 SSD** — rejected (storage limited)
2. **Cloud (AWS S3, Backblaze)** — rejected (cost, data sovereignty)
3. **Separate dedicated NAS** — rejected (buy new hardware)
4. **No cold storage (purge)** — rejected (audit retention requirements)

---

## Future ADRs (Pending)

```
ADR-016: Event Bus Design (when Phase 3 starts)
ADR-017: Push Notification Strategy (Phase 2)
ADR-018: Tauri Wrapper Distribution
ADR-019: Capacitor Wrapper for Phase 3
ADR-020: Multi-language Support (if needed)
ADR-021: Disaster Recovery Strategy
ADR-022: PDPA Compliance Implementation
ADR-023: Performance Benchmarking Framework
ADR-024: API Versioning Strategy
ADR-025: Internal Testing Environment
```

---

## How to Use This Document

**When making new decision:**
1. Check if ADR exists for related area
2. If supersedes old decision, mark old as ⚠️ Superseded
3. Write new ADR with Context/Decision/Consequences/Alternatives
4. Update Index table

**When questioning a decision:**
1. Read the ADR
2. Check "Alternatives Considered"
3. If new info → propose new ADR (don't edit old one)
4. Bring to ชิบะน้อย for review

**When onboarding new team member:**
1. Read ADR-001, ADR-002, ADR-003 (foundational)
2. Read ADRs relevant to their module
3. Reference index for any "why this?" questions

---

**End of ADRs v1.0**

| Version | Date | Notes |
|---|---|---|
| 1.0 | 2026-05-12 | Initial 15 ADRs documenting Web-First architecture decisions |
