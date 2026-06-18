# 📖 TKC SuperApp — User Stories & Acceptance Criteria

| Field | Value |
|---|---|
| **Document Type** | User Stories |
| **Version** | 1.0 |
| **Date** | 2026-05-12 |
| **Owner** | ชิบะน้อย (TKC AUTO PLUS) |
| **Total Stories** | 35 stories across 5 user roles |

---

## Format

```
### Story XX: Title
As a [role]
I want to [feature]
So that [benefit/value]

Priority:   P0 / P1 / P2
Module:     Pricelist / Settings / CheckIn / PhotoRep / VoiceRep
Phase:      1 / 2 / 3 / 4+

Acceptance Criteria:
- [ ] Specific testable requirement
- [ ] Another requirement
- [ ] Another requirement

Notes:
- Additional context
- Edge cases to consider
```

---

## 🎭 User Roles

| Role | Code | Description |
|---|---|---|
| 🔧 Admin | `admin` | บริหารระบบ ทั้งหมด |
| 🛞 B-Tire Sales | `b_tire` | เซลล์ยางใหญ่ B2C |
| 🏪 Dealer Sales | `dealer` | เซลล์ดูแลร้านค้า B2B |
| 🛒 Counter Staff | `counter` | พนักงานหน้าร้าน (shared + PIN) |
| 👁️ Customer | `customer` | ลูกค้า (Phase 2+, view quote only) |
| 🤖 AI Agent | `agent` | พอร์ช (system integration) |

---

# 🔧 ADMIN STORIES

## Story 01: Initial Cipher Setup

**As an** Admin  
**I want to** set up cipher #1 and #2 during first system setup  
**So that** wholesale and cost prices are encoded properly from day 1

**Priority:** P0  
**Module:** Pricelist  
**Phase:** 1

**Acceptance Criteria:**
- [ ] Wizard appears on first admin login if no cipher set
- [ ] Cipher #1 — admin maps digits 0-9 → letters (visual UI)
- [ ] Cipher #2 — admin maps digits 0-9 → letters (visual UI)
- [ ] Reserved character (A) is highlighted as "do not use"
- [ ] System checks no duplicate letters within each cipher
- [ ] Preview encoding: enter 1818 → see TBTB
- [ ] Cipher cannot be changed after lock without admin re-auth + reason
- [ ] Backup card PDF downloadable + printable
- [ ] Audit log captures cipher setup with timestamp

**Notes:**
- Cipher set once. Changes require Critical-severity audit + Telegram alert
- Backup card MUST be stored offline (printed)

---

## Story 02: Edit Price with Live Cipher Preview

**As an** Admin  
**I want to** edit a price in the Univer editor and see cipher preview immediately  
**So that** I know the wholesale code will display correctly without saving first

**Priority:** P0  
**Module:** Pricelist  
**Phase:** 1

**Acceptance Criteria:**
- [ ] Open editor → click cell ราคาขาย → type 1850
- [ ] Cipher preview shown in adjacent column: TPVX
- [ ] Cipher #1 preview shown for ทุน column
- [ ] Cipher #2 preview shown for B/A/S
- [ ] Save (Ctrl+S or button) commits change to DB
- [ ] WebSocket pushes update to other viewers in < 2s
- [ ] Audit log captures: before, after, who, when, IP
- [ ] Undo (Ctrl+Z) works within session

**Notes:**
- Live preview = client-side computation (no API call needed)
- Edit by Admin only — others see read-only

---

## Story 03: Migrate Excel Pricelist (3-Round Recheck)

**As an** Admin  
**I want to** import my Excel pricelist files and verify matches against AIO  
**So that** all 2,629 products are mapped correctly without manual data entry

**Priority:** P0  
**Module:** Pricelist  
**Phase:** 1

**Acceptance Criteria:**
- [ ] Upload multiple .xlsx files (drag-drop)
- [ ] System auto-detects sheets + suggests category mapping
- [ ] Round 1 runs Algorithm A → score 0-100% per match
- [ ] Round 2 runs Algorithm B → categorize as Verified/Conflict/Suspect
- [ ] Round 3 admin UI shows hardest cases first
- [ ] Bulk tick available for verified (≥95%)
- [ ] Per-item compare: Excel data vs AIO data side-by-side
- [ ] Auto-save every 10 ticks
- [ ] Resume session next day (auto-restore state)
- [ ] Bulk CSV option for unmapped items
- [ ] Backup AIO field 1-4 PERMANENT before any write

**Notes:**
- Expected effort: 3-5 days × 50-60 min/day for 2,629 products
- "Create in AIO first" workflow for items missing in AIO

---

## Story 04: Schedule Price Update for Future Date

**As an** Admin  
**I want to** set a price change to apply at a specific future date  
**So that** I can announce in advance and apply automatically without manual work that day

**Priority:** P1  
**Module:** Pricelist  
**Phase:** 1

**Acceptance Criteria:**
- [ ] Open Schedule UI → "New Schedule"
- [ ] Scope: row / sheet / category / custom
- [ ] Field: ทุน / ราคาขาย / B / A / S
- [ ] Change type: absolute / + amount / + %
- [ ] Set effective date + time
- [ ] Optional: "Notify staff" checkbox (default ☑)
- [ ] Schedule visible in dashboard with countdown
- [ ] Apply at scheduled time (cron-based)
- [ ] Telegram alert: admin + Schedule creator
- [ ] Audit log captures: schedule create, apply, who
- [ ] Cancel/edit allowed BEFORE scheduled time

**Notes:**
- Time zone: Asia/Bangkok
- Edge case: if AIO offline at apply time → queue + retry

---

## Story 05: Restore Prices from Yesterday

**As an** Admin  
**I want to** restore the pricelist to yesterday's state if a mistake was made  
**So that** I can recover from accidental bulk changes without manual re-entry

**Priority:** P1  
**Module:** Pricelist  
**Phase:** 1

**Acceptance Criteria:**
- [ ] Open Restore UI → list of restore points
- [ ] Snapshots: hourly (3) + daily (3) + manual (3) + Launch Day (permanent)
- [ ] Pick restore point → choose scope (whole / category / specific products)
- [ ] Preview diff before applying
- [ ] Confirm with checkbox + reason
- [ ] Apply creates new audit event
- [ ] Sync queue gets restored values → write to AIO
- [ ] Telegram alert to admin + creator of original change

**Notes:**
- Launch Day backup = PERMANENT (cannot be deleted)
- Partial restore: only selected products affected

---

## Story 06: Configure CR Tier for Specific Category

**As an** Admin  
**I want to** set custom Credit Surcharge tiers for แบตเตอรี่ category  
**So that** batteries have different markup vs tires

**Priority:** P1  
**Module:** Pricelist  
**Phase:** 1

**Acceptance Criteria:**
- [ ] Settings > Pricelist > CR Tiers
- [ ] Global tier table shown by default
- [ ] Click category "แบตเตอรี่" → mode: Custom
- [ ] Edit tier rows: ranges + surcharge amounts
- [ ] Save → cipher #2 auto-calculated
- [ ] Apply: per-piece calculation
- [ ] Bundle calculation: each component CR → sum
- [ ] Toggle on viewer header: Cash vs Credit
- [ ] Audit log captures change

**Notes:**
- Per-category override stored in pricelist.category_cr_config
- "Disabled" mode = no CR for this category

---

## Story 07: Approve New Device Request

**As an** Admin  
**I want to** approve or reject new device login requests from sales staff  
**So that** only authorized devices can access from external networks

**Priority:** P1  
**Module:** Settings Hub  
**Phase:** 1

**Acceptance Criteria:**
- [ ] Telegram alert on new device request (4G/external IP)
- [ ] Settings > Devices > Pending Approvals tab
- [ ] Each request shows: user, device info, IP, location, time
- [ ] Approve → device added to whitelist
- [ ] Reject → user notified
- [ ] Audit log captures decision + reason
- [ ] Device approval auto-expires after 30 days (Phase 2)

**Notes:**
- Office IPs auto-approved (no request needed)
- External IPs always require admin approval

---

## Story 08: View Audit Log with Filtering

**As an** Admin  
**I want to** search the audit log by user, date, and action type  
**So that** I can investigate issues or compliance questions

**Priority:** P0  
**Module:** Settings Hub  
**Phase:** 1

**Acceptance Criteria:**
- [ ] Settings > Audit Log → filter UI
- [ ] Filters: date range, user, action category, severity, device, IP, module
- [ ] Quick views: 🔴 Critical / 🔥 Price changes 24hr / 🔐 Login attempts / etc.
- [ ] Query merges hot/warm/cold tiers automatically
- [ ] Cold tier query shows progress indicator
- [ ] Event detail popup: full context + before/after diff + related events
- [ ] Undo button for data changes (creates new audit event)
- [ ] Export CSV/PDF/XLSX (cipher masked by default)
- [ ] Pagination + sort

**Notes:**
- 3-year retention via tiered storage
- AI Agent (พอร์ช) reads via filtered API

---

## Story 09: Force Logout User from All Devices

**As an** Admin  
**I want to** force a user to logout from all their devices  
**So that** I can respond to security concerns or employee resignation

**Priority:** P1  
**Module:** Settings Hub  
**Phase:** 1

**Acceptance Criteria:**
- [ ] Settings > Users > [user] → "Force Logout All" button
- [ ] Confirm dialog with reason field
- [ ] All sessions invalidated immediately
- [ ] WebSocket pushes logout to active devices
- [ ] User must re-login (may be blocked if user suspended)
- [ ] Audit log captures action + reason
- [ ] Telegram alert to affected user (if Telegram configured)

**Notes:**
- Different from device-specific force logout
- Suspend user = disabled + force logout combined

---

## Story 10: Rotate AI Agent API Key

**As an** Admin  
**I want to** rotate the AI agent (พอร์ช) API key manually or trust auto-rotation  
**So that** key compromise risk is limited

**Priority:** P2  
**Module:** Settings Hub  
**Phase:** 1

**Acceptance Criteria:**
- [ ] Settings > AI Agents > [พอร์ช] → "Rotate Key"
- [ ] Confirm dialog
- [ ] Generate new API key + HMAC secret
- [ ] 7-day grace period (both keys work)
- [ ] Telegram alert to admin + agent operator
- [ ] Audit log captures rotation
- [ ] Auto-rotate scheduled every 180 days
- [ ] Show next rotation date in UI

**Notes:**
- Coordination required with agent operator to update credentials
- Grace period prevents downtime

---

# 🛞 B-TIRE SALES STORIES

## Story 11: Search Product on Mobile

**As a** B-Tire Sales rep  
**I want to** quickly find a tire by typing partial info on my phone  
**So that** I can quote prices to customers without scrolling through long lists

**Priority:** P0  
**Module:** Pricelist  
**Phase:** 1

**Acceptance Criteria:**
- [ ] Search bar at top of mobile viewer, always visible
- [ ] Type "21515" → matches "215/15", "215/70R15", etc.
- [ ] Subsequence match (typo-tolerant)
- [ ] Debounce 200ms
- [ ] Results display as cards (1 product per card)
- [ ] Tap card → expand to detail page
- [ ] Recent searches shown when bar focused
- [ ] Favorites accessible
- [ ] Voice search button (microphone icon)
- [ ] Filters via bottom sheet

**Notes:**
- Mobile = simplified card view (no Univer)
- Voice search opens Web Speech API recognition

---

## Story 12: View Price Detail Popup

**As a** B-Tire Sales rep  
**I want to** see stock and DOT details by tapping the price  
**So that** I can confidently quote with delivery time and tire freshness info

**Priority:** P0  
**Module:** Pricelist  
**Phase:** 1

**Acceptance Criteria:**
- [ ] Tap ราคา cell on viewer → popup appears
- [ ] Popup shows: Stock summary, DOT week breakdown, retail + CR price
- [ ] Auto-dismiss after 10 seconds
- [ ] Hover/click → reset timer
- [ ] ESC closes immediately
- [ ] Admin sees additional: ทุน + Margin
- [ ] Mobile-optimized layout (full-width popup on small screens)
- [ ] Audit log records popup view (debug level)

**Notes:**
- B-Tire sees CR price (Cash/Credit toggle)
- DOT week format: oldest week first, sum of rest

---

## Story 13: Voice Search While in Car

**As a** B-Tire Sales rep  
**I want to** search for a product using voice while driving to customer  
**So that** I don't have to type and can prepare for visit

**Priority:** P1  
**Module:** Pricelist  
**Phase:** 1

**Acceptance Criteria:**
- [ ] Voice icon in search bar visible
- [ ] Tap icon → permission prompt (browser)
- [ ] Accept → recording indicator shows
- [ ] Say: "หาราคายาง 245/45R19 มิชลิน"
- [ ] Web Speech API transcribes → fills search bar
- [ ] Auto-search triggered
- [ ] Results display
- [ ] Tap result → detail page
- [ ] All hands-free if voice-only navigation possible

**Notes:**
- Privacy: voice processed locally (Web Speech API), no audio uploaded
- Thai language support depends on browser/OS

---

## Story 14: Send Quote to Customer via LINE

**As a** B-Tire Sales rep  
**I want to** generate a shareable quote link or copy-paste text  
**So that** customer can review pricing on LINE without me being there

**Priority:** P0  
**Module:** Pricelist  
**Phase:** 1

**Acceptance Criteria:**
- [ ] Select product → "Send Quote" button
- [ ] Option A: Copy text → LINE-friendly format
- [ ] Option B: Generate share link
- [ ] Share link URL: `https://app.tkc.local/q/{short_id}`
- [ ] Open in browser → quote page with: image + name + DOT + total + TKC contact
- [ ] Open Graph preview renders in LINE chat
- [ ] Link expires after 7 days
- [ ] Sales can track if quote viewed (Phase 2)
- [ ] Audit log captures: quote created, who, what products

**Notes:**
- Quote = ราคาขายปลีก only (B/A/S hidden for external customer)
- Cash price default (CR optional)

---

## Story 15: Mix Bundle by Custom Rim Size

**As a** B-Tire Sales rep  
**I want to** mix tire + tube + rim guard for a custom rim size  
**So that** I can quote custom bundles for customers with unusual setups

**Priority:** P1  
**Module:** Pricelist  
**Phase:** 1

**Acceptance Criteria:**
- [ ] Open "Mix by Rim" tool from viewer
- [ ] Pick rim size (dropdown 14-22)
- [ ] System filters compatible components
- [ ] Add 2-11 components
- [ ] Real-time total + cipher update
- [ ] Cross-category mix (Admin pre-approved pairs)
- [ ] "Generate Quote" → share link with mix
- [ ] "Save as Standard Bundle" → admin approval queue
- [ ] Print-friendly view

**Notes:**
- Cross-category restrictions enforced (e.g., ยางผ้าใบ + กระทะ require admin OK)
- Mix saved as draft until quote sent

---

## Story 16: Add Product to Favorites

**As a** B-Tire Sales rep  
**I want to** save frequently-quoted products to favorites  
**So that** I access them quickly without searching

**Priority:** P2  
**Module:** Pricelist  
**Phase:** 1

**Acceptance Criteria:**
- [ ] Star icon on product card → toggle favorite
- [ ] Favorites accessible from search bar (empty focus)
- [ ] Sort by recent / alphabetical
- [ ] Sync across devices (same user)
- [ ] Remove favorite from card or favorites list
- [ ] Telegram notification if favorite price changes (if user enabled)

**Notes:**
- Personal — not shared with other sales
- Max 100 favorites per user

---

## Story 17: View Top 20 Best-Sellers

**As a** B-Tire Sales rep  
**I want to** see the top 20 best-selling products  
**So that** I focus on items in highest demand

**Priority:** P2  
**Module:** Pricelist  
**Phase:** 1

**Acceptance Criteria:**
- [ ] Dashboard widget "Top 20 Best Sellers"
- [ ] Updated daily from AIO sales data
- [ ] Sort by sales count last 30 days
- [ ] Tap product → detail page
- [ ] Filter by category optional
- [ ] Available in mobile + desktop

**Notes:**
- Materialized view in PostgreSQL (refreshed nightly)
- Personal vs company-wide (config per user)

---

# 🏪 DEALER SALES STORIES

## Story 18: View Cipher-Encoded Wholesale Prices

**As a** Dealer Sales rep  
**I want to** see B/A/S codes (cipher #2) when looking at prices  
**So that** I can communicate wholesale prices without exposing real numbers

**Priority:** P0  
**Module:** Pricelist  
**Phase:** 1

**Acceptance Criteria:**
- [ ] Login → see Pricelist with ราคาขาย HIDDEN
- [ ] B/A/S columns visible (as cipher codes only)
- [ ] Tap cell → popup shows cipher value + after-discount (if D applies)
- [ ] No exposure of real numbers anywhere in UI
- [ ] CR toggle not available (no retail context)
- [ ] Search across B/A/S cipher codes works

**Notes:**
- Only 1 active session per Dealer (security)
- Login from new device requires admin approval

---

## Story 19: Quote Dealer-Specific Pricing

**As a** Dealer Sales rep  
**I want to** generate a quote with wholesale codes for my dealer customer  
**So that** they see prices they can resell at

**Priority:** P1  
**Module:** Pricelist  
**Phase:** 1

**Acceptance Criteria:**
- [ ] Same Quote UI as B-Tire but with cipher codes
- [ ] Share link option (7-day expiry)
- [ ] Copy text format with cipher codes only
- [ ] Audit log captures dealer quote
- [ ] No retail price exposure

**Notes:**
- Dealer customers must know cipher → can decode
- Cipher mapping should NOT be shared externally

---

# 🛒 COUNTER STORIES

## Story 20: Login with PIN on Shared Tablet

**As a** Counter staff (น้องมิ้ว)  
**I want to** login to the shared tablet with my personal PIN  
**So that** my actions are tracked separately from other counter staff

**Priority:** P0  
**Module:** Settings Hub / Auth  
**Phase:** 1

**Acceptance Criteria:**
- [ ] Tablet shows PIN entry screen (shared account already logged in)
- [ ] Enter 4-digit PIN
- [ ] If PIN matches → name displayed in header
- [ ] All actions tagged with PIN holder name in audit
- [ ] Auto-logout after 15 min idle (back to PIN screen, not full logout)
- [ ] PIN locked after 5 wrong attempts (admin unlock required)

**Notes:**
- PIN unique system-wide
- Reuse policy: 90 days before reusable

---

## Story 21: Toggle Cash vs Credit Price View

**As a** Counter staff  
**I want to** toggle between cash and credit price view  
**So that** I show the right price based on customer payment method

**Priority:** P0  
**Module:** Pricelist  
**Phase:** 1

**Acceptance Criteria:**
- [ ] Toggle visible in viewer header
- [ ] Cash mode: shows ราคาขาย
- [ ] Credit mode: shows ราคาขาย + CR
- [ ] All cells update in real-time
- [ ] Toggle state persists per session
- [ ] Default state per device (admin set)

**Notes:**
- CR per-piece, tier-based
- Bundle: per-component CR → sum

---

## Story 22: Quote Customer at Counter

**As a** Counter staff  
**I want to** quickly look up a product and show price to customer  
**So that** I can complete sales without delay

**Priority:** P0  
**Module:** Pricelist  
**Phase:** 1

**Acceptance Criteria:**
- [ ] Search → tap result → detail view
- [ ] Detail shows: image, name, ราคาขาย, stock, DOT
- [ ] Optional: turn tablet to customer
- [ ] One-tap to add to "draft quote"
- [ ] Print quote (Phase 2)
- [ ] Send to LINE / SMS (Phase 2)

**Notes:**
- Tablet 01-03 in counter area
- Shared account with PIN per staff

---

# 👁️ CUSTOMER STORIES (Phase 2+)

## Story 23: View Quote Link from LINE

**As a** Customer  
**I want to** open a quote link from LINE chat  
**So that** I see clearly what was quoted to me

**Priority:** P2  
**Module:** Pricelist  
**Phase:** 2

**Acceptance Criteria:**
- [ ] Open `https://app.tkc.local/q/{short_id}` in browser
- [ ] No login required
- [ ] See: product images, names, DOT, total price
- [ ] TKC contact info visible
- [ ] Link works for 7 days (expiry shown)
- [ ] Mobile responsive
- [ ] Open Graph preview renders nicely in LINE
- [ ] No internal data exposed (no cipher, no margin)

**Notes:**
- Public link — no auth needed
- After expiry: "Quote expired, contact TKC"

---

# 📍 PHASE 3 STORIES (Brief)

## Story 24: Check-in at Customer Location

**As a** Sales rep (outdoor)  
**I want to** record my arrival at a customer shop  
**So that** the company has accurate visit records

**Priority:** P1  
**Module:** Check-in  
**Phase:** 3

**Acceptance Criteria:**
- [ ] Open Check-in module → "Find nearby customers"
- [ ] GPS captures location (geolocation API)
- [ ] List of customers within 1km shown
- [ ] Tap customer → confirm Check-in
- [ ] Status: "At customer X since 11:30"
- [ ] Optional: add note, take photo, voice note
- [ ] Tap "Check-out" when leaving
- [ ] Duration auto-calculated
- [ ] If GPS unavailable: LINE bot fallback

**Notes:**
- Battery optimization: GPS interval configurable
- Offline check-in queues for sync later

---

## Story 25: Take Photo Report

**As a** Sales rep  
**I want to** take photos of a customer's situation  
**So that** I can document issues, inventory, or special requests

**Priority:** P1  
**Module:** Photo Report  
**Phase:** 3

**Acceptance Criteria:**
- [ ] Linked to active Check-in visit (auto-album)
- [ ] Camera open via MediaDevices.getUserMedia
- [ ] Multi-photo capture in one session
- [ ] Auto-watermark: timestamp + GPS + sales name
- [ ] Caption per photo
- [ ] Tag (Product/Issue/Before/After)
- [ ] Upload in background (queue if offline)
- [ ] Compress to <500KB per photo

**Notes:**
- Album auto-named: "{customer} - {date}"
- Manager approval queue for visibility

---

## Story 26: Voice Report After Visit

**As a** Sales rep  
**I want to** record voice report after leaving customer  
**So that** the system transcribes and adds to daily summary

**Priority:** P1  
**Module:** Voice Report  
**Phase:** 3

**Acceptance Criteria:**
- [ ] Open Voice Report → tap "Record"
- [ ] Background recording (5 min max)
- [ ] Visual indicator while recording
- [ ] Tap "Stop" → upload to backend
- [ ] Google STT transcribes (Thai)
- [ ] Notification when transcript ready
- [ ] Linked to recent Check-in visit
- [ ] User can edit transcript
- [ ] Audio file kept (60-day retention default)

**Notes:**
- $0.024/min STT cost
- Web Speech API option for free quick notes

---

## Story 27: Daily Summary Notification

**As a** Sales rep  
**I want to** receive a daily summary of all my activities  
**So that** I can review and submit a complete report

**Priority:** P2  
**Module:** Voice Report  
**Phase:** 3

**Acceptance Criteria:**
- [ ] At 18:00 (configurable) system aggregates:
  - Voice reports
  - Photos
  - Check-ins / Visits
- [ ] Auto-generates summary text
- [ ] Notification via Telegram + in-app
- [ ] User reviews → edit if needed
- [ ] Submit final → goes to manager
- [ ] Audit captures summary submission

**Notes:**
- AI generates summary from voice transcripts
- Manager dashboard sees submitted summaries

---

# 🤖 AI AGENT STORIES (พอร์ช)

## Story 28: Query Audit Log Summary

**As** พอร์ช (AI Agent)  
**I want to** query daily audit log summary via API  
**So that** I can monitor system health and alert admin if needed

**Priority:** P1  
**Module:** Settings Hub / Audit  
**Phase:** 1

**Acceptance Criteria:**
- [ ] GET /api/agent/audit/summary
- [ ] Auth: API key + HMAC + IP whitelist + nonce
- [ ] Response: event counts by severity, top users, top actions
- [ ] No business data (no prices, no resource details)
- [ ] Rate limit: 100/min
- [ ] Request logged in agent_request_log

**Notes:**
- LAN only (192.168.x.x)
- Filtered response (sanitized)

---

## Story 29: Check NAS Health

**As** พอร์ช  
**I want to** verify NAS connectivity and storage status  
**So that** I can alert admin if cold storage is at risk

**Priority:** P1  
**Module:** Settings Hub / NAS  
**Phase:** 1

**Acceptance Criteria:**
- [ ] GET /api/agent/nas/health
- [ ] Response: status, latency, free space, last check timestamp
- [ ] If unhealthy: trigger Telegram alert
- [ ] Historical health data available
- [ ] Rate limit applied

**Notes:**
- Health check itself runs hourly background
- Agent can trigger manual check

---

# 🔄 SYSTEM / CROSS-CUTTING STORIES

## Story 30: Auto-Sync from AIO Every 15 Minutes

**As a** System (background service)  
**I want to** sync product master + stock from AIO every 15 minutes  
**So that** pricelist data stays current

**Priority:** P0  
**Module:** Pricelist / Sync  
**Phase:** 1

**Acceptance Criteria:**
- [ ] Cron job runs every 15 min
- [ ] Reads AIO MySQL via cached connection
- [ ] Updates: products, stock, DOT (Lot/Week)
- [ ] Detects changes → emits events to subscribers
- [ ] WebSocket broadcasts changes to viewers
- [ ] If AIO down → retry with exponential backoff
- [ ] Sync log per cycle (audit)
- [ ] Performance: <30s per cycle for 2,629 products

**Notes:**
- AIO load impact: <5%
- Images: on-demand only (30-day TTL)

---

## Story 31: Receive Web Push Notification

**As a** User (any role)  
**I want to** receive push notifications on my PWA  
**So that** I'm aware of relevant events even when app is closed

**Priority:** P2  
**Module:** Notifications  
**Phase:** 2

**Acceptance Criteria:**
- [ ] PWA installed (Add to Home Screen)
- [ ] Permission prompt on first login
- [ ] Accept → device subscribed
- [ ] Receive push for: favorite price change, device login, schedule apply
- [ ] Click notification → opens app to relevant page
- [ ] User can disable per category in Settings
- [ ] iOS 16.4+ support
- [ ] Fallback: Telegram if Web Push fails

**Notes:**
- Web Push API + Service Worker
- VAPID keys per environment

---

## Story 32: Use App Offline

**As a** Sales rep in low-signal area  
**I want to** view cached pricelist data without internet  
**So that** I can still quote prices to walk-up customers

**Priority:** P1  
**Module:** Pricelist  
**Phase:** 1

**Acceptance Criteria:**
- [ ] PWA installed
- [ ] Service Worker caches: viewed products (last 7 days), favorites, recent searches
- [ ] Banner shown: "🔌 Offline mode"
- [ ] Read-only operations work
- [ ] Write actions queue locally (IndexedDB)
- [ ] On reconnect: auto-sync queue
- [ ] Show "✅ Synced" indicator
- [ ] Cache size limit: <100 MB

**Notes:**
- Workbox for SW management
- Dexie for IndexedDB abstraction

---

## Story 33: Print Pricelist to A4

**As an** Admin  
**I want to** generate a print-ready PDF of pricelist sheets  
**So that** I have a backup paper copy if system is down

**Priority:** P1  
**Module:** Pricelist  
**Phase:** 1

**Acceptance Criteria:**
- [ ] Open sheet → "Print/PDF" button
- [ ] Configure: paper (A4/A3), orientation (Portrait/Landscape)
- [ ] Hide admin columns (ทุน, Margin)
- [ ] Logo on every page (admin upload)
- [ ] Auto-date in header ("ประจำวันที่ DD MMMM YYYY")
- [ ] Section headers visible (ดอกหน้า/ดอกหลัง)
- [ ] Bundle block at bottom
- [ ] CR Tier table if applicable
- [ ] Page X-YY format
- [ ] Batch print multiple sheets at once

**Notes:**
- Puppeteer for PDF generation
- Print preview before PDF download

---

## Story 34: System Self-Diagnostic

**As an** Admin  
**I want to** run a self-diagnostic on all system components  
**So that** I can verify health before high-traffic periods

**Priority:** P2  
**Module:** Settings Hub  
**Phase:** 1

**Acceptance Criteria:**
- [ ] Settings > System Health → "Run Diagnostics"
- [ ] Checks: PostgreSQL, Redis, AIO sync, NAS, Cloudflare, Telegram
- [ ] Progress indicator during checks
- [ ] Results table: ✅/⚠️/❌ per component
- [ ] Recommendations if issues found
- [ ] Export report (PDF)
- [ ] Telegram alert if Critical issue found

**Notes:**
- Runs in background, doesn't block UI
- Estimated time: 30-60s

---

## Story 35: Module Permission Update

**As an** Admin  
**I want to** change a group's permission for a specific module  
**So that** I can adjust access rights as roles evolve

**Priority:** P1  
**Module:** Settings Hub  
**Phase:** 1

**Acceptance Criteria:**
- [ ] Settings > Groups > [group] → Module permissions
- [ ] Per-module dropdown: none / read / write / admin
- [ ] Save → affected users see warning "Permissions changed"
- [ ] Affected users must relogin to see changes
- [ ] Audit log captures change + admin
- [ ] Cannot disable Admin from Settings Hub (sanity check)

**Notes:**
- Relogin enforces new permissions
- WebSocket broadcasts "permission_changed" event

---

## 📊 Summary

```
By Priority:
  P0 (Must Have): 14 stories
  P1 (Should Have): 16 stories
  P2 (Nice to Have): 5 stories

By Phase:
  Phase 1: 26 stories
  Phase 2: 4 stories
  Phase 3: 4 stories
  Phase 4+: 1 story

By Module:
  Pricelist: 16 stories
  Settings Hub: 8 stories
  Check-in: 1 story (brief)
  Photo Report: 1 story (brief)
  Voice Report: 2 stories (brief)
  Notifications: 1 story
  Auth: 1 story
  Sync: 1 story
  Print: 1 story
  System: 3 stories
```

---

## How to Use This Document

### For Developers
1. Read stories for module you're implementing
2. Use Acceptance Criteria as test cases
3. Reference ADRs for "why" behind features

### For QA/Testing
1. Convert each Acceptance Criterion to a test case
2. Verify edge cases mentioned in Notes
3. End-to-end test by walking through entire story

### For Stakeholders
1. Review stories to ensure full coverage
2. Add missing stories
3. Re-prioritize as needed

### For Product Manager
1. Track story completion per sprint
2. Adjust priorities based on user feedback
3. Add new stories as needs evolve

---

## Pending Stories (To Be Written)

```
🔴 Critical Missing:
- [ ] Customer relationship management flows (Phase 4+)
- [ ] Sales statistics dashboard
- [ ] Recurring scheduled prices
- [ ] Manager approval workflows
- [ ] Cross-module event chaining (visit → photo → voice → summary)

🟡 Should Add:
- [ ] Error scenarios (sync fail, NAS down, etc.)
- [ ] Bulk operations (import users, export reports)
- [ ] Mobile-specific edge cases (signal loss, app crash recovery)
- [ ] Accessibility (screen reader, large fonts)

🟢 Phase 3+:
- [ ] Geofence alerts (Check-in)
- [ ] Customer location database management
- [ ] Manager team dashboards
- [ ] Performance review integration
```

---

**End of User Stories v1.0**

| Version | Date | Notes |
|---|---|---|
| 1.0 | 2026-05-12 | Initial 35 stories covering Phase 1 + Phase 3 briefs |
