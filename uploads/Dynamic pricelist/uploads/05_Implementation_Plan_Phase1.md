# 🚀 TKC SuperApp — Phase 1 Implementation Plan

| Field | Value |
|---|---|
| **Document Type** | Implementation Plan |
| **Version** | 1.0 |
| **Date** | 2026-05-12 |
| **Owner** | ชิบะน้อย (TKC AUTO PLUS) |
| **Duration** | 22 weeks (~5.5 months) |
| **Modules** | Pricelist + Settings Hub + Core Services |
| **Tech** | Web-First (React/Next.js + FastAPI + PostgreSQL) |

---

## 1. Pre-flight Checklist

### 1.1 P0 Blockers — MUST resolve

```
🔴 P0 BLOCKERS
─────────────────────────────────────────
[ ] AIO API documentation
    → Action: ติดต่อ AIO support / vendor
    → Or: Reverse-engineer from MySQL schema
    → Owner: ชิบะน้อย
    → Due: ก่อนเริ่ม Week 3

[ ] AIO database schema
    → Need: tables, image storage structure
    → Due: ก่อนเริ่ม Week 3

[ ] Office network setup
    → Static IP range (e.g., 192.168.1.0/24)
    → Internal DNS (app.tkc.local)
    → HTTPS cert (Cloudflare or Let's Encrypt)
    → Due: ก่อนเริ่ม Week 1

[ ] Synology NAS
    → IP, share name, credentials
    → Mount path on Spark #1
    → Free space check
    → Due: ก่อนเริ่ม Week 4

[ ] Telegram Bot
    → Existing TKC bot or create new?
    → Bot token + admin chat ID
    → Due: ก่อนเริ่ม Week 6
```

### 1.2 Setup Tasks (Week 0)

```
Hardware:
[ ] Verify Spark #1 has 256GB+ available SSD
[ ] Verify Synology NAS connectivity
[ ] Verify AIO MySQL accessible

Software:
[ ] Install Docker + Docker Compose
[ ] Install Node.js 20 LTS
[ ] Install Python 3.11
[ ] Install PostgreSQL 16
[ ] Install Redis 7
[ ] Install Nginx
[ ] Setup Cloudflare Tunnel

Repository:
[ ] Create Git repo (private)
[ ] Initialize project structure
[ ] Setup CI/CD pipeline
[ ] Setup branch strategy (main + dev + feature/*)
```

---

## 2. Project Structure

```
tkc-superapp/
├── README.md
├── docker-compose.yml
├── frontend/
│   ├── src/
│   │   ├── app/                  (Next.js App Router)
│   │   ├── core/                 (shared - auth, user, etc.)
│   │   ├── modules/              (pricelist, settings-hub)
│   │   └── lib/
│   ├── public/
│   ├── next.config.js
│   └── package.json
├── backend/
│   ├── core/                     (shared services)
│   ├── modules/                  (per module)
│   ├── gateway/
│   ├── alembic/                  (DB migrations)
│   ├── tests/
│   └── main.py
├── infra/
│   ├── docker-compose.yml
│   ├── nginx/
│   └── postgres/
└── docs/
    ├── PRDs/
    ├── ADRs/
    ├── API/
    └── runbooks/
```

---

## 3. Weekly Schedule

### Week 1-2: Foundation Setup
**Goals:** Working dev environment + basic skeleton

```
Tasks:
[ ] Project initialization (Next.js + FastAPI)
[ ] Database schema setup (core.* schemas)
[ ] Basic auth service (JWT)
[ ] Login page (UI only)
[ ] Backend health check endpoint
[ ] CI/CD pipeline working
[ ] Docker compose all services
[ ] First deployment to Spark #1

Deliverables:
- ✅ "Hello World" web app at app.tkc.local
- ✅ Login screen shows
- ✅ Database initialized
- ✅ Cloudflare Tunnel working
```

### Week 3-4: Core Services — Auth + Users
**Goals:** Working authentication for any user

```
Tasks:
[ ] Auth Service complete (login, refresh, logout, PIN, me)
[ ] User Service complete (CRUD, self-edit, groups, PINs)
[ ] Device fingerprinting
[ ] Frontend auth flow (login, JWT, refresh, logout)

Tests:
[ ] Admin can login
[ ] Sales can login
[ ] Counter PIN entry works
[ ] Wrong password lockout (5 fails)
```

### Week 5-6: Core Services — Notifications + Audit
**Goals:** Cross-module infrastructure

```
Tasks:
[ ] Notification Service (in-app inbox + Telegram + user prefs)
[ ] Audit Log Service:
    - Hot tier (PostgreSQL)
    - Warm tier (local SSD .jsonl.gz)
    - Cold tier (NAS .jsonl.gz)
    - Auto-archive job (monthly)
    - Query API (multi-tier)
[ ] Files Service (local + NAS upload)
[ ] Search Service (pg_trgm + subsequence)

Tests:
[ ] Telegram alert delivers
[ ] Audit log captures every action
[ ] Storage migration works
[ ] NAS read/write works
```

### Week 7-8: Pricelist — Foundation
**Goals:** Data layer + Cipher + AIO sync (read)

```
Tasks:
[ ] Pricelist schemas + migrations
[ ] Universal Schema Engine
[ ] Cipher service (encode/decode + algorithm)
[ ] AIO Cache table
[ ] AIO Sync Service (read-only, every 15 min)
[ ] API endpoints (basic CRUD)
[ ] Cipher Setup Wizard (frontend)
[ ] Pricelist module registration

Tests:
[ ] AIO data flows in
[ ] Cipher encodes correctly (1818 → TBTB etc.)
[ ] Categories + sheets created
[ ] No write to AIO yet (safe)
```

### Week 9-10: Pricelist — Desktop Editor
**Goals:** Admin can edit prices with Univer

```
Tasks:
[ ] Univer integration
[ ] Editor UI (multi-sheet, sidebar nav, save with audit)
[ ] Status (s) column logic
[ ] DOT auto-color
[ ] Click-for-Details popups (4 types)
[ ] Batch mode
[ ] Dark mode

Tests:
[ ] Admin can edit price → save → see in DB
[ ] Cipher displays correctly
[ ] Popups show correct info
[ ] Status discount calc works
```

### Week 11-12: Pricelist — Mobile Viewer + Search
**Goals:** Mobile-friendly viewer + search

```
Tasks:
[ ] Mobile viewer (card-based, tap to expand)
[ ] Search service complete (subsequence + voice + filters)
[ ] WebSocket for live updates
[ ] PWA configuration (manifest, SW, offline cache)
[ ] Click-for-details (mobile-optimized)

Tests:
[ ] Mobile responsive on iOS Safari
[ ] Mobile responsive on Android Chrome
[ ] Voice search works
[ ] Offline read works
[ ] PWA install prompt shows
```

### Week 13-14: Pricelist — Bundles + CR
**Goals:** Quote sharing + Credit pricing

```
Tasks:
[ ] Bundle system (Standard + Mix by Rim)
[ ] Quote sharing (copy text + share link + Open Graph)
[ ] CR System (Tier config + per-category + Cash/Credit toggle)

Tests:
[ ] Bundle math correct
[ ] Quote link opens for customer
[ ] CR applies correctly
[ ] LINE preview renders
```

### Week 15-16: Pricelist — Migration
**Goals:** Import 2,629 items from Excel

```
Tasks:
[ ] Multi-file upload + schema detection
[ ] Migration service (Algo A + Algo B)
[ ] Round 3 Admin UI (compact + bulk + keyboard)
[ ] Resume mode (multi-day)
[ ] Bulk CSV option
[ ] Create-in-AIO-first workflow
[ ] Backup AIO INITIAL

Tests:
[ ] Upload sample → matches >80% verified
[ ] Conflict cases show 2 candidates
[ ] Resume picks up correctly
```

### Week 17-18: Pricelist — Print + Schedule + Restore
**Goals:** Production-ready features

```
Tasks:
[ ] Print Layout (PDF gen + auto-date + logo + markers)
[ ] Schedule Updates (cron + apply + alert)
[ ] Restore System (snapshots + preview diff + apply)

Tests:
[ ] PDF generates correctly
[ ] Schedule applies at right time
[ ] Restore works correctly
```

### Week 19-20: Pricelist — AIO Write-back
**Goals:** Two-way sync with AIO

```
Tasks:
[ ] AIO Sync Write-back (fields 1-4 only)
[ ] Sync Queue Dashboard
[ ] Sync alerts (Telegram escalation)
[ ] Pre-migration AIO backup (INITIAL)

Tests:
[ ] Write to AIO works
[ ] Field 5 untouched
[ ] Retry escalates correctly
[ ] AIO restart recovery
```

### Week 14-22 (Parallel): Settings Hub

```
Week 14-15: Foundation
[ ] Users + Groups CRUD UI
[ ] PIN manager
[ ] Devices view + actions
[ ] Security policy configuration

Week 16-17: Notifications + Audit
[ ] Notification config UI
[ ] Audit log viewer
[ ] Filters + search + export

Week 18-19: Infrastructure
[ ] NAS configuration UI + test
[ ] AI Agent management
[ ] Module Registry UI

Week 20-21: Branding + Health
[ ] Logo upload
[ ] System health dashboard
[ ] Cipher backup card

Week 22: Polish
[ ] Reports basic
[ ] Documentation
```

### Week 21-22: Final Polish

```
Tasks:
[ ] E2E testing (Playwright)
[ ] Performance optimization
[ ] Mobile testing on real devices
[ ] PWA testing (iOS + Android)
[ ] Documentation:
    - User guides (admin, sales, counter)
    - API documentation
    - Operations runbook
[ ] Training materials
[ ] Go-live preparation
[ ] Go-live!
[ ] Post-launch support week
```

---

## 4. Team Structure

### Option A: Single Full-Stack Developer
- 1× Senior Full-Stack Dev (22 weeks)
- Risk: Single point of failure

### Option B: Small Team (2-3 people)
- 1× Backend, 1× Frontend, 1× Half-time DevOps/QA
- Time: 16-18 weeks (parallel)
- Cost: Higher

### Option C: With Claude / AI Assistance ⭐ Recommended
- 1× Lead Dev + Claude/พอร์ช (Superskills)
- Time: 18-20 weeks
- Cost: Lower than B

---

## 5. Risk Mitigation

| Risk | Likelihood | Mitigation |
|---|---|---|
| AIO API unclear | High | Buffer 2 weeks for reverse-engineering |
| Univer mobile performance | Medium | Build mobile cards path early |
| Cipher complexity | Low | Tests with all examples |
| PWA on iOS issues | Medium | Test on real iPhone weekly |
| NAS unreliable | Low | Buffer/local fallback design |
| Scope creep | High | PRD locked, change requires reapproval |
| Production data loss | Critical | INITIAL backup, daily snapshots |

---

## 6. Success Criteria

### 6.1 Phase 1 Launch Criteria

```
🟢 GO criteria:
[ ] All 2,629 products migrated
[ ] All groups can login
[ ] Pricelist viewable on all target devices
[ ] Admin can edit prices
[ ] Cipher displays correctly
[ ] AIO sync working (both ways)
[ ] Print PDF matches Excel format
[ ] Audit log capturing
[ ] No critical bugs in 1 week
[ ] Backup/restore tested

🔴 NO-GO criteria:
[ ] Data loss possible
[ ] Cipher leaks real numbers
[ ] AIO sync corrupts data
[ ] Mobile unusable
[ ] Login fails for valid users
```

### 6.2 Post-Launch Metrics (Month 1)

| Metric | Target |
|---|---|
| User adoption | >80% staff using daily |
| Quote-to-customer time | <1 min (vs 5-10 before) |
| Paper printouts | <20/month (vs 200 before) |
| AIO sync uptime | >99% |
| User satisfaction | >80% NPS |
| Critical bugs | <5/month |
| Support tickets | <20/week |

---

## 7. Skill Usage Plan (Claude Superskills)

```
Week 1-2: 
   - brainstorming (refine specs)
   - writing-plans (this document)

Week 3-22 (per feature):
   - brainstorming (each new feature start)
   - writing-plans (feature implementation plan)
   - executing-plans (batch implementation)
   - prompt-engineer (for Claude/พอร์ช prompts)

Continuous:
   - deep-research (tech/libraries)
   - senior-solution-architect (architecture reviews)
   - product-strategy (scope decisions)
   - skill-creator (new TKC-specific skills)
```

---

## 8. Budget Estimate

```
Phase 1 (22 weeks):
   - Domain + SSL: ~฿1,500/year
   - Cloudflare: Free tier OK
   - Telegram Bot: Free
   - GitHub: Free for private
   - Internal infrastructure: existing

Phase 3:
   - Google STT: ~฿30,000/year (estimated)
   - Capacitor wrappers: free
   - Apple Developer: ฿3,500/year (if iOS app)
   - Google Play Console: ~฿900 one-time
```

---

## 9. Communication Plan

```
Weekly:
   - Progress report (Friday)
   - Demo new features

Bi-weekly:
   - Stakeholder review meeting

Monthly:
   - Phase milestone review
   - Risk reassessment

Documentation:
   - GitHub Issues for bugs/features
   - PR descriptions for code
   - ADRs for major decisions
   - PRDs updated as design evolves
```

---

## 10. Post-Phase 1

### Phase 2 (Weeks 23-30)
- Tauri wrapper (admin desktop)
- Web Push notifications
- Performance optimization based on real usage
- User feedback iteration

### Phase 3 (3-6 months later)
- Detailed PRDs for Check-in, Photo Report, Voice Report
- Phase 3 implementation plan
- AI Agent expansion

### Long-term
- Phase 4: Business modules (CRM, Stats, Delivery, etc.)
- Continuous AI/Skill enhancement
- Scale considerations

---

## 11. Day-Zero Checklist

```
Day before kickoff:
[ ] All P0 blockers resolved
[ ] Dev environment tested
[ ] Team aligned on goals
[ ] First sprint planned
[ ] Communication channels set
[ ] Monitoring ready

Day 1:
[ ] Project kickoff meeting
[ ] Repository initialized
[ ] First commit
[ ] CI/CD running
[ ] "Hello TKC" deployed to staging
[ ] 🎉 Phase 1 officially started!
```

---

**End of Phase 1 Implementation Plan v1.0**

---

## Document History

| Version | Date | Notes |
|---|---|---|
| 1.0 | 2026-05-12 | Initial implementation plan for Phase 1 |
