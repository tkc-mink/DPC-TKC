# 🔄 PRD: TKC AIO Sync Queue UX v1.0

| Field | Value |
|---|---|
| **Document Type** | Feature PRD (extends Pricelist Module) |
| **Version** | 1.0 |
| **Date** | 2026-05-12 |
| **Owner** | ชิบะน้อย (TKC AUTO PLUS) |
| **Status** | Design Locked — Phase 1 P0 |
| **Parent** | 02_PRD_TKC_Pricelist_Module_v6.md |
| **Related** | 03_PRD_TKC_Settings_Hub_v1.md, 11_Operations_Runbook.md |

---

## 1. Overview

### 1.1 Purpose
ระบบจัดการ **AIO Sync Queue** — แสดงสถานะการ sync ราคาจาก TKC → AIO real-time + เครื่องมือจัดการเมื่อมีปัญหา

### 1.2 Why Critical (P0)
- AIO = single source of truth สำหรับ stock/sales
- Sync ผิด → ลูกค้าได้ราคาผิด → ต้นทุน TKC สูญเสีย
- Admin ต้องเห็นปัญหาทันที + แก้ได้เร็ว
- ปัจจุบัน Excel = manual, error-prone, no audit
- ใหม่ = automated, but need monitoring + recovery

### 1.3 Success Criteria
- ✅ Admin เห็น sync issues ภายใน 5 นาที
- ✅ แก้ไข failed items ภายใน 5 คลิก
- ✅ Conflicts ตัดสินใจได้ใน 30 วินาที
- ✅ ไม่มี silent failures (ทุก fail = audited + alerted)
- ✅ AIO data integrity 100% (no data loss in sync)

---

## 2. Information Architecture

### 2.1 Where in App

```
Settings Hub > 🔄 Sync Queue  ← Primary (Admin)
   ├── 📊 Dashboard
   ├── ⏳ Active Queue
   ├── 🗂️ History
   ├── ⚠️ Conflicts
   └── ⚙️ Settings

Pricelist Module > 🔄 My Changes  ← Secondary (Sales)
   ├── View own price changes
   └── Sync status indicator

API endpoint /api/agent/sync/*  ← AI Agent
   └── Read-only health metrics
```

### 2.2 Navigation Pattern

```
Sidebar (Admin):
├── 📊 Dashboard
├── 💰 Pricelist
├── 🔄 Sync Queue ◀────── Always visible to Admin
│   └── 🔴 Badge: count of failed/conflicts
├── 📋 Audit Log
└── ⚙️ Settings

Top Bar (all users):
├── Search
├── Notifications
└── Sync indicator: 🟢/🟡/🔴 ◀─── Click → Sync Queue
```

---

## 3. Main Dashboard

### 3.1 Hero Stats (Top of page)

```
┌──────────────────────────────────────────────────────────────────┐
│ 🔄 AIO Sync Queue                Last sync: 2m ago  Next: in 13m │
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐          │
│ │ 234  │ │  12  │ │   3  │ │   2  │ │   0  │ │   1  │          │
│ │  ✅   │ │  ⏳   │ │  🔁   │ │  ❌   │ │  ⚠️   │ │  ⏸️   │          │
│ │Success│ │Queued│ │Retry │ │Failed│ │Conflict│Paused│         │
│ │Today  │ │      │ │      │ │      │ │      │ │      │          │
│ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘          │
│                                                                    │
│ [▶️ Run Sync Now] [⏸️ Pause All] [⚙️ Settings] [📊 Full History] │
└──────────────────────────────────────────────────────────────────┘
```

**Behavior:**
- Cards clickable → filter list below
- Stats real-time (WebSocket)
- Colors:
  - ✅ Success: Green
  - ⏳ Queued: Blue
  - 🔁 Retry: Yellow
  - ❌ Failed: Red
  - ⚠️ Conflict: Orange
  - ⏸️ Paused: Gray

### 3.2 Health Indicator

```
Below hero stats:

🟢 Sync system healthy
   Last successful sync: 14:30 (2 min ago)
   Average sync time: 2.3s
   Success rate (24h): 99.2%
```

**Color Logic:**
- 🟢 Green: failed < 5, no conflicts, sync running on schedule
- 🟡 Yellow: failed 5-20, OR conflicts > 0, OR sync delayed >15 min
- 🔴 Red: failed > 20, OR sync down > 30 min, OR system paused

### 3.3 Action Buttons

```
[▶️ Run Sync Now]
   - Trigger immediate sync (don't wait for cron)
   - Useful after manual price changes
   - Audit log: "Manual sync triggered by ชิบะน้อย"

[⏸️ Pause All]
   - Stop processing queue (items stay in queue)
   - Useful when AIO maintenance
   - Resume button replaces this when paused

[⚙️ Settings]
   - Configure schedule, retry, alert thresholds
   
[📊 Full History]
   - Open full audit log filtered to sync events
```

---

## 4. Active Queue Section

### 4.1 Priority Sorting

```
🚨 NEEDS ATTENTION (sorted top)
├── ❌ Failed (3)        ◀── Most urgent
├── ⚠️ Conflicts (2)
└── 🔁 Retrying (3)      ◀── Auto-handling but visible

⏳ QUEUED (12)            ◀── Normal flow
├── By age (oldest first)

✅ RECENT SUCCESS (last 1h, 45 items)  [Collapse]
└── Click to expand
```

### 4.2 Failed Item Card

```
┌─────────────────────────────────────────────────────────────────┐
│ ❌ FAILED — 215/70R15 OT MK2000                                 │
│ ────────────────────────────────────────────────────────────── │
│ Field:    ราคาขาย (Retail)                                       │
│ Desired:  ฿1,950 (TKC has)                                       │
│ AIO now:  ฿1,800 (will stay this if not fixed)                  │
│                                                                  │
│ ⚠️ Error: AIO returned 503 Service Unavailable                  │
│ Attempts: 3 of 3 (limit reached)                                │
│                                                                  │
│ 📅 Timeline:                                                     │
│    14:15:00  Queued (price changed)                             │
│    14:15:30  Attempt 1 — Connection timeout                     │
│    14:20:30  Attempt 2 — AIO 500 error                          │
│    14:35:30  Attempt 3 — AIO 503 error  ◀── current             │
│                                                                  │
│ 👤 Original change by: ชิบะน้อย                                    │
│                                                                  │
│ [🔁 Retry Now] [⏸️ Pause] [❌ Cancel] [📋 Details]              │
└─────────────────────────────────────────────────────────────────┘
```

**Action Buttons:**
- **Retry Now:** Manual retry attempt (resets retry counter)
- **Pause:** Move to paused list (no retries until resumed)
- **Cancel:** Remove from queue (TKC value remains, AIO unchanged)
- **Details:** Open full detail page

### 4.3 Conflict Item Card

```
┌─────────────────────────────────────────────────────────────────┐
│ ⚠️ CONFLICT — 245/45R19 Pirelli P Zero                          │
│ ────────────────────────────────────────────────────────────── │
│ Field: ราคาขาย (Retail)                                          │
│                                                                  │
│ TKC (yours):    ฿9,700                                           │
│   Changed by: ชิบะน้อย at 14:30                                    │
│   Reason: Weekly price adjustment                                │
│                                                                  │
│ AIO (current):  ฿9,500                                           │
│   Changed by: external (direct AIO edit) at 14:45               │
│   Reason: (none — direct database update)                        │
│                                                                  │
│ ⚠️ AIO was changed AFTER your TKC change.                       │
│    Your sync was blocked because someone edited AIO directly.   │
│                                                                  │
│ Resolution options:                                              │
│                                                                  │
│ [✅ Force TKC = ฿9,700]                                          │
│    → Push your value to AIO (overwrite)                          │
│                                                                  │
│ [🔙 Accept AIO ฿9,500]                                           │
│    → Update TKC pricelist to match AIO                           │
│                                                                  │
│ [⏸️ Skip — Decide Later]                                         │
│    → Pause this item, no change to either system                 │
│                                                                  │
│ [📋 Full Audit Trail]                                            │
└─────────────────────────────────────────────────────────────────┘
```

### 4.4 Retrying Item Card

```
┌─────────────────────────────────────────────────────────────────┐
│ 🔁 RETRYING (2 of 3) — 235/55R17 Bridgestone Turanza            │
│ ────────────────────────────────────────────────────────────── │
│ Field:    B (Wholesale)                                          │
│ Desired:  ฿2,400 (ZDOO) | AIO: ฿2,350 (ZMVX)                    │
│                                                                  │
│ ⏰ Next attempt: in 4 min (at 14:45)                             │
│ Previous error: Connection timeout                               │
│                                                                  │
│ [⏭️ Retry Now] [⏸️ Pause] [📋 Details]                          │
└─────────────────────────────────────────────────────────────────┘
```

### 4.5 Queued Item Card (Compact)

```
┌─────────────────────────────────────────────────────────────────┐
│ ⏳ 14:30 | 215/55R17 BFGoodrich | ราคา ฿2,800→฿2,950 | ชิบะน้อย   │
└─────────────────────────────────────────────────────────────────┘
```

Multiple items in queue → compact list, expand on click

---

## 5. Conflict Resolution Flow

### 5.1 Detail View

```
┌─────────────────────────────────────────────────────────────────┐
│ ⚠️ Resolve Conflict: 245/45R19 Pirelli P Zero                   │
│ ────────────────────────────────────────────────────────────── │
│                                                                  │
│ 📊 Side-by-side Comparison:                                      │
│                                                                  │
│  TKC Pricelist          │  AIO Database                          │
│  ─────────────────      │  ─────────────────                     │
│  ราคาขาย:    ฿9,700      │  ราคาขาย:    ฿9,500                     │
│  เปลี่ยนโดย:  ชิบะน้อย     │  เปลี่ยนโดย:  external (direct edit)     │
│  เวลา:       14:30       │  เวลา:       14:45 (15 min later)      │
│  เหตุผล:     Weekly adj   │  เหตุผล:     (none)                    │
│  IP:         192.168.1.1 │  IP:         (n/a, direct DB)           │
│                                                                  │
│ 📅 Timeline:                                                     │
│                                                                  │
│    14:15:00  TKC: Price set to ฿9,700                           │
│    14:15:30  Queued for AIO sync                                 │
│    14:30:00  Sync attempt → failed (AIO down)                   │
│    14:35:00  Sync retry → failed                                 │
│    14:45:00  AIO: External edit to ฿9,500                       │
│    14:45:30  Sync retry → CONFLICT detected                     │
│                                                                  │
│ 🔍 Other affected items: 0                                       │
│ 📋 Related: Schedule "Weekly Update" (3 of 50 items affected)   │
│                                                                  │
│ ─────────────── ACTIONS ───────────────                          │
│                                                                  │
│ ⚠️ Choose how to resolve:                                        │
│                                                                  │
│ ○ Force push TKC value ฿9,700 to AIO                            │
│   This will OVERWRITE the external change at 14:45.             │
│   AIO will show ฿9,700 after sync.                              │
│                                                                  │
│ ○ Accept AIO value ฿9,500 to TKC                                │
│   Your TKC change at 14:30 will be reverted.                    │
│   Pricelist will show ฿9,500.                                   │
│                                                                  │
│ ○ Skip (decide later)                                            │
│   Item removed from active queue, no change to either system.   │
│   Manual review required.                                        │
│                                                                  │
│ Reason: [_______________] (required for audit)                  │
│                                                                  │
│ [Cancel]                              [Apply Resolution]         │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 Bulk Conflict Resolution

When multiple conflicts at once:

```
┌─────────────────────────────────────────────────────────────────┐
│ ⚠️ 8 Conflicts Detected — Bulk Resolution                       │
│ ────────────────────────────────────────────────────────────── │
│                                                                  │
│ Common pattern: All from "Weekly Update Schedule"                │
│ Likely cause: AIO was modified during scheduled apply           │
│                                                                  │
│ Quick actions:                                                   │
│                                                                  │
│ [Force push all TKC values (8 items)]                            │
│ [Accept all AIO values (8 items)]                                │
│ [Review each individually]                                       │
│                                                                  │
│ ⚠️ Bulk actions cannot be undone. Choose carefully.              │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. History View

### 6.1 Layout

```
🗂️ Sync History

Filters:
[📅 Date range] [⚙️ Status] [👤 User] [📦 Category] [🔧 Field]
[🔍 Search product...]

Results:

Time      Product                 Field      From → To             Status        Duration
─────────────────────────────────────────────────────────────────────────────────────
14:32:15  215/70R15 OT MK2000    ราคาขาย    ฿1,800 → ฿1,950        ✅ Success    2.3s
14:31:42  ยางใน 1000R20 OT       ราคาขาย    ฿180 → ฿185           ✅ Success    1.8s
14:30:08  Battery NS40Z          ทุน        ฿1,200 → ฿1,250        ✅ Success    2.1s
14:28:33  245/45R19 Pirelli P0   ราคาขาย    ฿9,500 → ฿9,700        ⚠️ Conflict   —
14:25:11  Oil 5W30 Shell         B          ฿380 → ฿390           🔁 Retry 2/3  —
14:20:00  215/45R17 Yokohama     ราคาขาย    ฿2,200 → ฿2,300        ✅ Success    1.5s
14:18:45  235/55R18 Michelin     A          ฿4,800 → ฿4,950        ❌ Failed     —
14:15:00  215/70R15 OT MK2000    ราคาขาย    ฿1,850 → ฿1,800        ✅ Success    2.0s
...

[Load more (showing 50 of 1,247)]

📊 Stats for filtered period:
   Total: 1,247 items
   Success: 1,223 (98.1%)
   Failed: 14 (1.1%)
   Conflicts: 8 (0.6%)
   Cancelled: 2 (0.2%)
```

### 6.2 Row Click → Detail Modal

```
┌─────────────────────────────────────────────────────────────────┐
│ 215/70R15 OT MK2000 — Sync Event Detail                         │
│ ────────────────────────────────────────────────────────────── │
│                                                                  │
│ Event ID: sync_a8f3...                                           │
│ Timestamp: 2026-05-12 14:32:15                                  │
│ Field: ราคาขาย                                                    │
│ Value: ฿1,800 → ฿1,950                                           │
│ Duration: 2.3s                                                   │
│ Status: ✅ Success                                                │
│                                                                  │
│ AIO Response:                                                    │
│   Status: 200 OK                                                 │
│   Updated row: 1                                                 │
│   Database: aio_prod.products                                    │
│                                                                  │
│ Triggered by: User price edit                                    │
│ Original audit event: edit_x82a...                              │
│                                                                  │
│ [📋 View Original Edit] [🔄 Re-sync (if needed)]                │
└─────────────────────────────────────────────────────────────────┘
```

### 6.3 Export Options

```
[📥 Export filtered results]
   ├── CSV (standard columns)
   ├── PDF (formatted report)
   └── JSON (full detail)
```

---

## 7. Sales/User View (Limited)

### 7.1 Pricelist Module > My Changes

For B-Tire / Dealer / Counter:

```
┌─────────────────────────────────────────────────────────────────┐
│ 🔄 Your Recent Changes (last 24h)                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                    │
│ Time      Product                Field    Status                  │
│ ─────────────────────────────────────────────────────            │
│ 14:32     215/70R15 OT          ราคา    ✅ Synced               │
│ 14:25     Battery NS40Z         ทุน     🔁 Retrying              │
│ 14:18     245/45R19 Pirelli     ราคา    ⚠️ Conflict (admin alerted)│
│                                                                    │
│ 💡 Conflicts are handled by admin — no action needed from you.    │
└─────────────────────────────────────────────────────────────────┘
```

### 7.2 In-line Status Indicator

When viewing a product in Pricelist:

```
245/45R19 Pirelli P Zero
   Price: ฿9,700 ⚠️ Conflict (admin reviewing)
   
   ────────────────────────────────────────
   Last update: 14:30 by ชิบะน้อย
   Sync status: ⚠️ Conflict — see Sync Queue
```

---

## 8. Settings Page

### 8.1 Sync Configuration

```
Settings > AIO Sync

📅 Schedule
   Run every: [15] minutes
   Time zone: Asia/Bangkok
   First run: Immediate
   [Save changes]

🔁 Retry Policy
   Max attempts: 3
   Retry intervals:
     Attempt 1: 1 minute
     Attempt 2: 5 minutes
     Attempt 3: 15 minutes
   [Edit intervals]

⚠️ Alert Thresholds
   Dashboard yellow:    5 minutes stuck
   Telegram L1:        30 minutes stuck
   Telegram L2:         2 hours stuck
   Telegram Critical:   6 hours stuck OR >50 failed

🔀 Conflict Resolution Default
   ● Always require manual review (recommended)
   ○ Prefer TKC value (auto force-push)
   ○ Prefer AIO value (auto accept AIO)
   ○ Custom rules...

⏸️ Auto-Pause Conditions
   ☑ AIO unreachable for >5 minutes
   ☑ Failed rate >10% over 10 attempts
   ☑ Queue length >500 items
   ☑ Critical Telegram alert sent

🔔 Notifications
   Telegram for:
     ☑ Critical alerts
     ☑ All conflicts
     ☑ Failed items (after retry exhausted)
     ☐ Successful bulk sync (>50 items)

🛡️ Safety Limits
   Max items per cycle: 100
   Max bulk update size: 500
   Field 5 (ห้ามแตะ): 🔒 LOCKED (system enforced)
```

### 8.2 AIO Connection Settings

```
🔌 AIO Database Connection

   Host:         aio-server.tkc.local
   Port:         3306
   Database:     aio_prod
   Username:     tkc_sync
   Password:     ●●●●●●●  [Test Connection]
   
   SSL/TLS:      ☑ Enabled (recommended on LAN)
   
   Connection pool:
     Min:  2
     Max:  10
     Timeout: 30s
   
   [🧪 Run Diagnostic]
   
   Last successful connection: 14:30:00 (2 min ago)
   Average query time: 45ms
```

---

## 9. Real-time Updates (WebSocket)

### 9.1 Subscription

```
Connect: ws://app.tkc.local/ws/sync-queue
Auth: JWT in header
Subscription: All sync events
```

### 9.2 Events

```javascript
// queue_item_added
{
  "type": "queue_item_added",
  "item_id": "abc123",
  "product_id": "215_70R15_OT",
  "field": "retail",
  "value_desired": 1950,
  "user": "chibanoi"
}

// queue_item_status_changed
{
  "type": "queue_item_status_changed",
  "item_id": "abc123",
  "status_from": "queued",
  "status_to": "retrying",
  "attempt": 2,
  "next_attempt_at": "14:45:30"
}

// queue_item_completed
{
  "type": "queue_item_completed",
  "item_id": "abc123",
  "result": "success" | "failed" | "conflict",
  "duration_ms": 2300
}

// sync_cycle_started
{
  "type": "sync_cycle_started",
  "cycle_id": "cyc_456",
  "items_count": 12
}

// sync_cycle_completed
{
  "type": "sync_cycle_completed",
  "cycle_id": "cyc_456",
  "success": 10,
  "failed": 1,
  "conflicts": 1
}

// sync_paused / sync_resumed
{
  "type": "sync_paused",
  "reason": "manual" | "auto_aio_down" | "auto_failure_rate",
  "by": "chibanoi" | "system"
}
```

### 9.3 UI Reactions

```
On queue_item_status_changed:
  - Update card status in real-time
  - Animation: brief pulse highlight

On queue_item_completed (success):
  - Move card to "Recent Success" section
  - Increment success counter

On queue_item_completed (failed):
  - Move to "Failed" section at top
  - Play subtle alert sound (admin opt-in)
  - Increment failed counter

On queue_item_completed (conflict):
  - Add to "Conflicts" section
  - Show toast notification
  - Telegram alert sent server-side

On sync_paused:
  - Banner: "Sync paused: [reason]"
  - Disable manual sync button
  - Show "Resume" button
```

---

## 10. Telegram Integration

### 10.1 Alert Templates

**Critical Failure (after all retries):**
```
🔴 SYNC FAILED

Product: 245/45R19 Pirelli P Zero
Field:   ราคาขาย
Error:   AIO 503 Service Unavailable
Time:    14:35:30
Retries: 3/3 exhausted

[Open Queue] [Retry Now] [View Details]
```

**Conflict Detected:**
```
⚠️ SYNC CONFLICT

Product: 245/45R19 Pirelli P Zero
Field:   ราคาขาย

TKC:  ฿9,700 (you at 14:30)
AIO:  ฿9,500 (external at 14:45)

Manual review needed.

[Resolve] [View Details]
```

**Multiple Failures (escalation):**
```
🚨 SYNC HEALTH ALERT

20+ items failed in last 30 minutes.
Possible AIO outage.

Current state:
- Failed: 23
- Queued: 47
- Retrying: 8

[Investigate] [Pause Queue]
```

**Daily Summary (optional):**
```
📊 DAILY SYNC REPORT — 12 พ.ค. 2569

Total syncs: 1,247
✅ Success: 1,223 (98.1%)
🔁 Retried: 16 (eventually succeeded)
❌ Failed: 14
⚠️ Conflicts: 8 (3 resolved, 5 pending)
⏱️ Avg duration: 2.1s
🔥 Peak hour: 14:00 (87 syncs)
```

### 10.2 Inline Telegram Actions

Bot responds to commands:

```
/sync_status
   → Current health overview

/sync_failed
   → List 10 most recent failed items

/sync_pause
   → Pause queue (admin only, requires confirm)

/sync_resume
   → Resume queue

/sync_retry [item_id]
   → Manual retry specific item
```

---

## 11. AI Agent API

### 11.1 Endpoints

```
GET /api/agent/sync/status
  → Overall health snapshot

GET /api/agent/sync/metrics
  → Time-series data (last hour, day, week)

GET /api/agent/sync/issues
  → Current problems (failed, conflicts, stuck)

GET /api/agent/sync/forecast
  → Predicted issues based on patterns
```

### 11.2 Response Filtering

```json
{
  "status": "healthy",
  "summary": {
    "queued": 12,
    "retrying": 3,
    "failed": 0,
    "conflicts": 0,
    "paused": false
  },
  "last_sync": "2026-05-12T14:30:00Z",
  "next_sync": "2026-05-12T14:45:00Z",
  "success_rate_24h": 0.992,
  "average_duration_ms": 2100
}
```

**No business data exposed** (no prices, no product details)

---

## 12. Data Model

### 12.1 Sync Queue Table

```sql
CREATE TABLE pricelist.sync_queue (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  row_id          UUID NOT NULL REFERENCES pricelist.rows(id),
  field           VARCHAR(20) NOT NULL,
  -- 'retail', 'b', 'a', 's', 'cost'
  
  -- Values
  value_desired   NUMERIC NOT NULL,
  value_at_queue  NUMERIC,
  -- Snapshot of AIO value when queued
  
  -- Status
  status          VARCHAR(20) NOT NULL DEFAULT 'queued',
  -- queued | retrying | success | failed | conflict | paused | cancelled
  
  -- Retry tracking
  attempt_count   INT NOT NULL DEFAULT 0,
  max_attempts    INT NOT NULL DEFAULT 3,
  next_attempt_at TIMESTAMP,
  
  -- Audit context
  triggered_by    UUID REFERENCES core.users(id),
  trigger_type    VARCHAR(20),
  -- 'user_edit' | 'schedule' | 'migration' | 'restore' | 'manual'
  trigger_ref_id  UUID,
  -- Reference to schedule_id, audit_event_id, etc.
  
  -- Timing
  queued_at       TIMESTAMP NOT NULL DEFAULT NOW(),
  last_attempt_at TIMESTAMP,
  completed_at    TIMESTAMP,
  
  -- Error tracking
  error_code      VARCHAR(50),
  error_message   TEXT,
  error_details   JSONB,
  -- Full AIO response, stack trace, etc.
  
  -- Conflict resolution
  conflict_data   JSONB,
  -- {aio_value, aio_changed_at, aio_changed_by, ...}
  resolved_by     UUID REFERENCES core.users(id),
  resolved_at     TIMESTAMP,
  resolution      VARCHAR(20),
  -- 'force_tkc' | 'accept_aio' | 'cancelled' | 'skip'
  resolution_reason TEXT
);

CREATE INDEX idx_sync_queue_status ON pricelist.sync_queue(status, queued_at);
CREATE INDEX idx_sync_queue_row ON pricelist.sync_queue(row_id, status);
CREATE INDEX idx_sync_queue_next_attempt ON pricelist.sync_queue(next_attempt_at) WHERE status IN ('queued', 'retrying');
CREATE INDEX idx_sync_queue_active ON pricelist.sync_queue(status) WHERE status IN ('queued', 'retrying', 'failed', 'conflict');
```

### 12.2 Sync History (archive of completed)

```sql
CREATE TABLE pricelist.sync_history (
  id              UUID PRIMARY KEY,
  original_id     UUID,
  -- Reference to sync_queue.id (kept after queue cleanup)
  row_id          UUID,
  field           VARCHAR(20),
  value_desired   NUMERIC,
  value_synced    NUMERIC,
  status          VARCHAR(20),
  -- final status only
  attempt_count   INT,
  duration_ms     INT,
  triggered_by    UUID,
  queued_at       TIMESTAMP,
  completed_at    TIMESTAMP,
  error_summary   TEXT,
  -- Brief, full detail in audit log
  
  -- Indexing for queries
  archived_at     TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sync_history_completed ON pricelist.sync_history(completed_at DESC);
CREATE INDEX idx_sync_history_row ON pricelist.sync_history(row_id, completed_at DESC);
CREATE INDEX idx_sync_history_status ON pricelist.sync_history(status, completed_at DESC);

-- Move to history after 7 days in sync_queue
-- Move to audit cold tier after 90 days
```

### 12.3 Sync Cycle Log

```sql
CREATE TABLE pricelist.sync_cycles (
  id              UUID PRIMARY KEY,
  started_at      TIMESTAMP,
  completed_at    TIMESTAMP,
  trigger_type    VARCHAR(20),
  -- 'cron' | 'manual' | 'event'
  triggered_by    UUID,
  items_total     INT,
  items_success   INT,
  items_failed    INT,
  items_conflict  INT,
  duration_ms     INT,
  aio_connection_ok BOOLEAN,
  notes           TEXT
);
```

---

## 13. API Endpoints

```
# Queue listing
GET    /api/pricelist/sync/queue
       Query: ?status=failed&page=1&limit=50
GET    /api/pricelist/sync/queue/stats

# Per-item actions
GET    /api/pricelist/sync/queue/:id
POST   /api/pricelist/sync/queue/:id/retry
POST   /api/pricelist/sync/queue/:id/cancel
POST   /api/pricelist/sync/queue/:id/pause
POST   /api/pricelist/sync/queue/:id/resume

# Conflict resolution
POST   /api/pricelist/sync/queue/:id/resolve-conflict
       Body: { resolution: 'force_tkc' | 'accept_aio' | 'skip', reason: '...' }

# Bulk actions
POST   /api/pricelist/sync/queue/bulk-retry
POST   /api/pricelist/sync/queue/bulk-cancel
POST   /api/pricelist/sync/queue/bulk-resolve
       Body: { item_ids: [...], resolution: '...', reason: '...' }

# Sync control
POST   /api/pricelist/sync/run-now
POST   /api/pricelist/sync/pause
POST   /api/pricelist/sync/resume
GET    /api/pricelist/sync/status

# History
GET    /api/pricelist/sync/history
       Query: ?date_from=...&date_to=...&status=...
GET    /api/pricelist/sync/history/:id

# Configuration
GET    /api/pricelist/sync/config
PUT    /api/pricelist/sync/config

# Cycles
GET    /api/pricelist/sync/cycles
       Query: ?date_from=...
GET    /api/pricelist/sync/cycles/:id

# WebSocket
WS     /ws/sync-queue
```

---

## 14. Permissions

| Action | Admin | B-Tire | Dealer | Counter | AI Agent |
|---|---|---|---|---|---|
| View queue dashboard | ✅ | ❌ | ❌ | ❌ | ❌ |
| View "My Changes" | ✅ | ✅ | ✅ | ✅ | ❌ |
| Retry item | ✅ | ❌ | ❌ | ❌ | ❌ |
| Cancel item | ✅ | ❌ | ❌ | ❌ | ❌ |
| Resolve conflict | ✅ | ❌ | ❌ | ❌ | ❌ |
| Run sync manually | ✅ | ❌ | ❌ | ❌ | ❌ |
| Pause/resume | ✅ | ❌ | ❌ | ❌ | ❌ |
| Configure settings | ✅ | ❌ | ❌ | ❌ | ❌ |
| View history | ✅ | View own | View own | ❌ | Read summary only |
| WebSocket subscribe | ✅ | Own events | Own events | ❌ | Read-only |

---

## 15. Performance Targets

| Metric | Target |
|---|---|
| Dashboard page load | < 1.5s |
| Queue item list (50 items) | < 500ms |
| Real-time update latency | < 200ms (WebSocket) |
| Manual retry response | < 2s |
| Bulk operation (100 items) | < 5s |
| History query (1000 items) | < 1s |
| Conflict detail load | < 800ms |
| Export CSV (10K items) | < 30s |

---

## 16. Edge Cases

### 16.1 AIO Schema Change

```
Scenario: AIO column renamed/removed
Detection: Sync fails with "column not found"
Handling:
  1. All affected items → Failed
  2. Telegram Critical alert
  3. Admin must update sync config
  4. After config update: retry all
```

### 16.2 Massive Bulk Sync

```
Scenario: Schedule applies 500 price changes at once
Handling:
  1. Items queued in batches of 100
  2. Process throttled (max 100/cycle)
  3. Progress indicator on dashboard
  4. Telegram summary when complete
```

### 16.3 Conflict During Conflict Resolution

```
Scenario: Admin resolving Conflict A, but AIO changes again
Handling:
  1. System detects mid-resolution change
  2. Show updated AIO value before apply
  3. Confirm with admin: still proceed?
  4. Atomic transaction prevents race condition
```

### 16.4 Same Product Multiple Pending Changes

```
Scenario: Price changed 3 times in 5 minutes
Handling:
  1. Old pending → cancelled, "superseded by newer change"
  2. Only newest queued
  3. Audit log preserves all changes
```

### 16.5 Network Partition

```
Scenario: Spark #1 ↔ AIO connection unstable (50% packet loss)
Detection: Retry rate spikes, conflicts increase
Handling:
  1. Auto-pause after 3 consecutive failures
  2. Telegram L1 alert
  3. Admin investigates network
  4. Resume when stable
```

### 16.6 Field 5 Accidental Write Attempt

```
Scenario: Code bug tries to write field 5
Handling:
  1. ❌ HARD BLOCK at API gateway
  2. Telegram Critical alert
  3. Block all future sync until investigated
  4. Audit log with full stack trace
```

---

## 17. Implementation Phases

### Phase 1.1 (Foundation — Weeks 7-9)
- Sync queue table + basic API
- AIO connection + read-only sync first
- Console-based monitoring (logs)

### Phase 1.2 (Write-back — Weeks 10-12)
- Write to AIO Field 1-4 only
- Retry logic + queue
- Field 5 protection enforcement
- Audit log integration

### Phase 1.3 (UX — Weeks 13-15)
- Dashboard UI (admin)
- Per-item cards
- Conflict resolution flow
- WebSocket real-time updates
- Telegram alerts basic

### Phase 1.4 (Polish — Weeks 16-18)
- History view + export
- Bulk operations
- Settings + auto-pause
- AI Agent API
- Sales "My Changes" view

### Phase 1.5 (Testing — Weeks 19-22)
- Edge case testing
- Performance tuning
- DR drill: sync during AIO outage
- Documentation

---

## 18. Success Metrics

```
Operational:
  ✅ AIO sync success rate >99%
  ✅ Mean time to detect failure <5 min
  ✅ Mean time to recover <10 min
  ✅ Conflict resolution time <30s

User Satisfaction:
  ✅ Admin satisfaction with queue UI >80% NPS
  ✅ Zero "where is my price?" questions from sales
  ✅ Zero unintentional Field 5 writes

Data Integrity:
  ✅ Zero data loss in sync
  ✅ 100% audit trail completeness
  ✅ AIO data corruption: 0
```

---

## 19. Open Questions

```
🟡 Need decision before implementation:
- [ ] AIO connection: SSL/TLS or plain on LAN?
- [ ] Bulk operations: how many items max per action?
- [ ] Conflict resolution: per-user vs admin-only?
- [ ] Auto-resolve conflicts based on patterns? (Phase 2 ML)

🟢 Can decide during development:
- [ ] Sound effects for alerts (admin opt-in?)
- [ ] Color scheme for status (current proposal OK?)
- [ ] History retention in queue table (7 days OK?)
- [ ] Daily summary timing (default 18:00?)
```

---

## 20. Mockup Reference

```
For Figma/HTML mockups, see future doc:
  C:\claude\TKC_PRD_Documents\wireframes\sync_queue_*.png
  
Key screens to mock:
  1. Dashboard hero stats
  2. Failed item card
  3. Conflict resolution detail
  4. History view with filters
  5. Settings page
  6. Mobile/tablet responsive views
  7. Sales "My Changes" view
```

---

**End of AIO Sync Queue UX PRD v1.0**

| Version | Date | Notes |
|---|---|---|
| 1.0 | 2026-05-12 | Initial comprehensive design for P0 sync queue UX |
