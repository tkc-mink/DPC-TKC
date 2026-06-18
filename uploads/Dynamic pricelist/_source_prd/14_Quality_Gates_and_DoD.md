# ✅ TKC SuperApp — Quality Gates & Definition of Done

| Field | Value |
|---|---|
| **Document Type** | Quality Standards |
| **Version** | 1.0 |
| **Date** | 2026-05-12 |
| **Owner** | ชิบะน้อย (TKC AUTO PLUS) |
| **Purpose** | Single source of truth for "Done" |
| **Audience** | Owner + Claude/พอร์ช dev pair |

---

## Why This Document

ใน Solo + AI dev mode ไม่มี QA team ตรวจ → **ต้องมี internal quality bar ที่ชัดเจน**

ก่อน claim ว่า "เสร็จ" ทุก task/story/milestone ต้องผ่าน gate

---

## Part 1: Definition of Done (DoD) per Task Type

### 1.1 DoD for **Code Feature** (User Story)

```
✅ FUNCTIONAL
  □ All Acceptance Criteria in user story pass
  □ Happy path tested manually
  □ Edge cases covered (per User Story Notes)
  □ Error states handled gracefully
  □ Loading states shown
  □ Empty states shown

✅ TECHNICAL
  □ Code written + committed
  □ Linting passes (eslint, ruff)
  □ Type checks pass (TypeScript, Pydantic)
  □ Unit tests written (≥80% coverage on new code)
  □ Integration tests for API endpoints
  □ E2E tests for critical paths
  □ No console.error / warning in normal flow

✅ SECURITY
  □ Input validation server-side
  □ Permission check at API layer
  □ Audit log entry created for state changes
  □ No sensitive data in URLs/logs
  □ XSS prevention (no innerHTML with user input)
  □ SQL injection prevention (parameterized queries)

✅ UX
  □ Responsive: mobile (375px) + tablet (768px) + desktop (1280px)
  □ Keyboard navigation works
  □ Loading < 2s on dashboard pages
  □ Error messages helpful (not "An error occurred")
  □ Confirms destructive actions
  □ Undo available where applicable

✅ DOCUMENTATION
  □ Code comments for non-obvious logic
  □ API endpoint documented (FastAPI auto-docs)
  □ User Story marked complete in GitHub
  □ Screenshot/GIF if UI change
  □ Update relevant PRD if scope changed

✅ INTEGRATION
  □ Works with existing modules
  □ Database migration tested (up + down)
  □ Audit events properly tagged
  □ WebSocket events emitted correctly
  □ Cache invalidation correct

✅ READY TO COMMIT
  □ Branch named: feature/{module}-{short-desc}
  □ Commit messages clear (Conventional Commits format)
  □ PR description references user story
  □ Self-review done
  □ No commented-out code
```

### 1.2 DoD for **Bug Fix**

```
✅ DIAGNOSTIC
  □ Root cause identified
  □ Reproduction steps documented
  □ Regression test added (prevents recurrence)

✅ FIX
  □ Minimum change to address root cause
  □ Avoid "patches on patches" (per Owner directive)
  □ Verified fix resolves issue
  □ No new issues introduced

✅ COMMIT
  □ Branch: fix/{issue}-{short-desc}
  □ Commit message references issue
  □ Test added for regression
```

### 1.3 DoD for **Database Migration**

```
✅ MIGRATION
  □ Forward migration (up) tested
  □ Backward migration (down) tested  
  □ Idempotent (can run multiple times safely)
  □ Indexes added if needed
  □ Constraints validated

✅ DATA
  □ Existing data migrated correctly
  □ Backup taken before run (auto)
  □ Verification queries provided

✅ DOCUMENTATION
  □ Migration file commented
  □ Schema diagram updated (09_Database_ERD.md)
```

### 1.4 DoD for **API Endpoint**

```
✅ DESIGN
  □ RESTful pattern
  □ Versioned (/api/v1/...)
  □ Proper HTTP methods + status codes

✅ IMPLEMENTATION
  □ FastAPI route + Pydantic schemas
  □ Auth middleware applied
  □ Permission check
  □ Rate limit if applicable
  □ Audit log entry

✅ TESTING
  □ Happy path test
  □ Auth fail test (401)
  □ Permission fail test (403)
  □ Validation fail test (422)
  □ Server error handling (500)

✅ DOCS
  □ OpenAPI auto-doc complete
  □ Example request/response
```

### 1.5 DoD for **UI Component (React)**

```
✅ FUNCTIONAL
  □ Props typed (TypeScript)
  □ Default values where appropriate
  □ Loading/error/empty states
  □ Accessible (a11y: aria labels, keyboard nav)

✅ STYLE
  □ Tailwind classes (no inline styles)
  □ Dark mode if applicable
  □ Mobile responsive

✅ TESTS
  □ Renders without crashing
  □ Snapshot test
  □ Interaction test (user-event)

✅ STORY
  □ Storybook story (if shared component)
  □ Usage example in docs
```

---

## Part 2: Quality Gates per Milestone

### 🚪 Gate 1: Foundation Complete (End of Week 2)

**What's built:**
- Working dev environment
- Auth service skeleton
- Login page UI
- Basic deployment

```
✅ GATE CRITERIA:

INFRASTRUCTURE
  □ Docker compose runs all services
  □ PostgreSQL accepts connections
  □ Redis accepts connections
  □ Nginx serves frontend
  □ Cloudflare Tunnel routes app.giantwillow.com
  □ HTTPS works end-to-end

BACKEND
  □ FastAPI starts without errors
  □ /api/health returns 200
  □ Database migrations run
  □ Core schemas created (core.users, core.audit_log, etc.)

FRONTEND
  □ Next.js app loads
  □ Login page renders
  □ Tailwind + shadcn/ui working
  □ TypeScript strict mode passes

DEPLOYMENT
  □ Push to main → auto-deploy
  □ Health check after deploy
  □ Rollback script tested

DEFINITION OF "FAIL":
  Any service won't start
  Database connection failures
  Cloudflare Tunnel disconnects
  
→ MUST FIX before proceeding to Week 3
```

### 🚪 Gate 2: Core Services Done (End of Week 6)

**What's built:**
- Full auth (login, refresh, logout, PIN)
- User management (CRUD)
- Groups + permissions
- Devices + whitelist
- Notifications (Telegram working)
- Audit log (3-tier storage)
- Files service basic

```
✅ GATE CRITERIA:

AUTH
  □ Admin can login from office IP (auto-device-approve)
  □ External IP requires device approval
  □ JWT refresh works
  □ Logout invalidates session
  □ PIN entry works for shared accounts
  □ 5-fail lockout works

USERS & GROUPS
  □ Admin can CRUD users
  □ Admin can CRUD groups (within 10 max)
  □ User can be in max 3 groups
  □ Permission matrix enforced

DEVICES
  □ Auto-approve from office IP
  □ External IP creates request
  □ Admin approval workflow
  □ Force logout works

NOTIFICATIONS
  □ Telegram bot delivers test message
  □ Critical alerts bypass quiet hours
  □ User preferences saved
  □ In-app inbox shows notifications

AUDIT LOG
  □ All actions logged
  □ Hot tier queries < 100ms
  □ Warm tier queries < 5s
  □ Cold tier accessible (even if slow)
  □ Archive job runs successfully

PERFORMANCE
  □ Login response < 500ms
  □ User search < 200ms
  □ Concurrent users (10) handled

SECURITY
  □ Threat model items addressed
  □ Critical risks (R1) mitigated
  □ No secrets in code or git

→ Phase 1 Pricelist development can start
```

### 🚪 Gate 3: Pricelist Module Functional (End of Week 12)

**What's built:**
- Cipher system working
- Univer editor (desktop)
- Mobile card viewer
- Search (subsequence + voice)
- Click-for-details popups
- AIO read sync working

```
✅ GATE CRITERIA:

CIPHER SYSTEM
  □ Setup wizard works
  □ Cipher #1 encoding correct (1818 → TBTB)
  □ Cipher #2 encoding correct (2500 → ZEOA)
  □ Reserved A toggle works
  □ All test cases pass
  □ Backup card PDF generates

EDITOR (DESKTOP)
  □ Univer loads (only on >1024px)
  □ Edit price → save → visible in DB
  □ Cipher preview live
  □ Auto-fill from AIO works
  □ Click popups for all 4 types
  □ Dark mode works

VIEWER (MOBILE)
  □ Card-based layout on <768px
  □ Tap card → expand details
  □ Voice search button visible + works
  □ Filters via bottom sheet
  □ Offline cache (7 days)
  □ PWA installable

SEARCH
  □ Subsequence matching correct
  □ < 200ms response
  □ Voice search works (Web Speech API)
  □ Favorites + Recent
  □ Special commands (Admin) work

AIO READ SYNC
  □ Connects to AIO MySQL
  □ Reads products + stock + DOT
  □ Cache in core.aio_cache
  □ Update every 15 min
  □ Failure alerts work

→ Pricelist viewable + searchable for users
```

### 🚪 Gate 4: Migration Complete (End of Week 16)

**What's built:**
- Multi-file Excel upload
- 3-Round recheck system
- Admin tick-approve UI
- All 2,629 products mapped

```
✅ GATE CRITERIA:

MIGRATION TOOL
  □ Upload multiple .xlsx files
  □ Schema auto-detection
  □ Round 1 (Algo A) categorizes correctly
  □ Round 2 (Algo B) verification works
  □ Round 3 admin UI compact + keyboard shortcuts
  □ Resume mode after disconnect
  □ Auto-save every 10 ticks

DATA QUALITY
  □ All 2,629 products imported
  □ ≥80% verified (Round 1+2 agree ≥90%)
  □ Remaining manually approved by Admin
  □ Backup AIO field 1-4 PERMANENT
  □ Audit trail per match decision

INITIAL STATE
  □ Pricelist matches Excel (visual diff)
  □ Bundle structures imported
  □ Page notes preserved
  □ Custom symbols recognized
  □ DOT data linked

→ Ready for AIO write-back testing
```

### 🚪 Gate 5: AIO Write-back Stable (End of Week 20)

**What's built:**
- Sync Queue working both ways
- Conflict detection
- Retry logic
- Bulk operations

```
✅ GATE CRITERIA:

SYNC QUEUE
  □ Write to AIO fields 1-4 only (HARD BLOCK field 5)
  □ Retry logic: 1/5/15 min escalation
  □ Telegram alerts at thresholds
  □ Manual retry/cancel works
  □ Bulk operations max 500/cycle
  □ Conflict detection accurate

CONFLICT UI
  □ Side-by-side TKC vs AIO display
  □ Force TKC / Accept AIO / Skip options
  □ Reason required for resolution
  □ Audit log complete
  □ Bulk resolution (8+ conflicts)

STABILITY TESTS
  □ AIO outage simulation (system continues)
  □ Network partition (50% packet loss)
  □ Race condition test (concurrent edits)
  □ Field 5 protection verified (try to write)
  □ Sync queue depth >1000 handled

PERFORMANCE
  □ Sync cycle < 30s for typical batch
  □ AIO load < 5%
  □ Queue UI responsive

→ Production-ready sync
```

### 🚪 Gate 6: Go-Live Ready (End of Week 22)

**Final gate before production launch**

```
✅ GO/NO-GO CRITERIA:

DATA INTEGRITY
  □ Launch Day backup created (PERMANENT)
  □ All 2,629 products in system
  □ Sync working both ways
  □ Cipher fully tested
  □ No critical bugs open
  □ Backup/restore tested

USER READINESS
  □ All groups can login
  □ Admin user trained
  □ Backup admin trained
  □ 10 tablets registered
  □ Sales reps tested mobile app
  □ User guides ready

OPERATIONS
  □ Monitoring dashboards active
  □ Telegram alerts working
  □ Runbook reviewed
  □ Restore drill done
  □ Cipher backup card secured

SECURITY
  □ Penetration test (basic) done
  □ All Critical threats mitigated
  □ Audit log capturing
  □ Cipher access restricted

PERFORMANCE
  □ Load test: 30 concurrent users
  □ Page load < 2s p95
  □ Search < 200ms p95
  □ Sync < 30s typical

DOCUMENTATION
  □ User guides per role
  □ Operations runbook updated
  □ FAQ documented
  □ Training materials ready

ROLLBACK PLAN
  □ Switch to Excel backup procedure documented
  □ Sync pause + manual override tested
  □ Communication template for incidents

→ All checked = GO LIVE
→ Any unchecked = DELAY launch
```

---

## Part 3: Per-Sprint Standards

### Weekly Sprint Cycle

```
Monday:
  □ Plan week's tasks (top 3-5 stories)
  □ Verify gate readiness
  □ Update tracker

Tue-Fri (daily):
  □ 1-3 stories worked
  □ Test each as built
  □ Commit + PR

Friday:
  □ Review progress vs plan
  □ Test integrated functionality
  □ Update PRDs if scope changed
  □ Plan next week
```

### Daily Standards (Owner + Claude pair)

```
START SESSION:
  □ Review yesterday's progress
  □ Pick 1-3 tasks for today
  □ Confirm acceptance criteria

DURING WORK:
  □ Small commits (atomic changes)
  □ Test after each meaningful change
  □ Use Claude Superskills (writing-plans, executing-plans)
  □ Verified small steps (no patches-on-patches)

END SESSION:
  □ All commits pushed
  □ Tests passing
  □ Document any unfinished work
```

---

## Part 4: Anti-Patterns to Avoid

### 🚫 DO NOT

```
❌ Skip tests "to save time"
   → Tech debt accumulates → slower later

❌ "I'll fix it later" comments
   → Use GitHub Issues instead

❌ Commit broken code to main
   → ALWAYS via PR + auto-tests

❌ Manual DB changes
   → Always via migration

❌ Hardcode secrets/IPs
   → Always env vars or config

❌ Big monolithic PRs
   → Small, focused PRs (< 500 lines diff)

❌ Patches-on-patches (Owner directive)
   → Investigate root cause + fix properly

❌ Model swap as debug shortcut
   → Fix config/code, not blame the AI
```

---

## Part 5: Test Strategy

### 5.1 Test Pyramid

```
        ╱╲           ← E2E (5%)
       ╱  ╲             Playwright critical paths
      ╱────╲          
     ╱      ╲        ← Integration (20%)
    ╱────────╲           pytest + FastAPI TestClient
   ╱          ╲      
  ╱────────────╲    ← Unit (75%)
                       Vitest (FE) + pytest (BE)
```

### 5.2 Critical E2E Paths

```
Must have E2E tests for:
1. Admin login + Pricelist edit
2. Sales search + view price detail
3. Counter PIN entry + quote
4. Cipher setup wizard
5. AIO sync + write-back
6. Conflict resolution
7. Quote share link generation
8. Migration round 3 tick
```

### 5.3 Test Data

```
Fixtures (per module):
  - Test users (one per role)
  - Sample pricelist sheets
  - Sample bundles
  - Sample AIO products (mocked)
  - Sample audit events
  
Run tests against:
  - Local dev DB (Docker)
  - Staging DB (after Cloudflare Tunnel)
  - Production parity (size + structure)
```

---

## Part 6: Performance Targets

| Metric | Target | Gate |
|---|---|---|
| Login response | < 500ms | Gate 2 |
| Dashboard load | < 2s | Gate 2 |
| User search | < 200ms | Gate 2 |
| Pricelist viewer load | < 2s | Gate 3 |
| Search (Pricelist) | < 200ms | Gate 3 |
| Voice search response | < 1s | Gate 3 |
| Edit save | < 500ms | Gate 3 |
| Sync cycle | < 30s | Gate 5 |
| AIO load impact | < 5% | Gate 5 |
| Concurrent users | 30 | Gate 6 |
| PWA install | iOS + Android | Gate 6 |
| Audit query (hot) | < 100ms | Gate 2 |

---

## Part 7: Definition of "Quality Code"

```
EVERY commit:
  ✓ Linting passes (eslint, ruff)
  ✓ Type checks pass (tsc, mypy)
  ✓ Tests pass (locally + CI)
  ✓ No debug code (console.log forgotten)
  ✓ No commented-out code blocks

EVERY PR:
  ✓ All commits pass
  ✓ Self-review done
  ✓ PR description clear
  ✓ Tests added/updated
  ✓ Documentation updated
  ✓ Screenshot/GIF if UI

EVERY merge to main:
  ✓ All checks green
  ✓ CI/CD deploys cleanly
  ✓ Smoke test in staging
  ✓ No regression in monitoring
```

---

**End of Quality Gates + DoD v1.0**

| Version | Date | Notes |
|---|---|---|
| 1.0 | 2026-05-12 | Initial quality standards for Phase 1 |
