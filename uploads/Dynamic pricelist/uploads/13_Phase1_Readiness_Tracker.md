# 🚀 TKC SuperApp — Phase 1 Readiness Tracker

| Field | Value |
|---|---|
| **Document Type** | Phase 1 Execution Readiness |
| **Version** | 2.0 (Round 1 Complete) |
| **Last Updated** | 2026-05-12 |
| **Owner** | ชิบะน้อย (TKC AUTO PLUS) |
| **Status** | 🟢 Decisions Locked — Ready for Execution Prep |

---

## 📊 Progress Summary

```
✅ Decisions Locked:        34 / 34   (100%)
✅ Documents Complete:      13 / 16    (81%)
⏳ Outstanding Actions:      6 owner items
🎯 Phase 1 Readiness:       85%
```

---

## A. 🔴 P0 Blockers — Status

### A1. AIO Integration

| Item | Status | Decision/Value | Notes |
|---|---|---|---|
| AIO API access | ⏳ ACTION | ต้องติดต่อ vendor | **Owner: ติดต่อ vendor → ETA?** |
| AIO MySQL schema | ⏳ ACTION | ต้องติดต่อ vendor | Concurrent with API |
| AIO image storage | ⏳ ACTION | ต้องติดต่อ vendor | — |
| AIO test environment | ⏳ ACTION | ต้องติดต่อ vendor | — |
| AIO credentials | ⏳ ACTION | ต้องติดต่อ vendor | Restricted account |

**Risk:** 🔴 Critical Path — buffered Week 7+ in plan, Week 1-6 ไม่พึ่ง AIO

### A2. Network Infrastructure

| Item | Status | Decision/Value | Notes |
|---|---|---|---|
| Office IP range | ✅ LOCKED | `192.168.10.0/24` | 254 usable IPs |
| Spark #1 static IP | ⏳ ACTION | ภายใน 192.168.10.0/24 | **Owner: confirm IP** |
| Domain name | ✅ LOCKED | `giantwillow.com` | Cloudflare-managed |
| Internal DNS | ✅ LOCKED | via Cloudflare Tunnel | No internal DNS needed |
| Firewall rules | ⏳ ACTION | Defined in PRDs | Apply during deploy |

### A3. Storage (NAS)

| Item | Status | Decision/Value | Notes |
|---|---|---|---|
| NAS exists | ✅ CONFIRMED | Synology DSM | Owner has |
| Service account | ⏳ ACTION | ต้อง create | **Owner: 30 min task** |
| Share structure | 📋 PLANNED | `/volume1/tkc/` + 4 subs | audit/photos/voice/backups |
| Mount path | ✅ LOCKED | `/mnt/nas-audit` | On Spark #1 |
| Connection protocol | 📋 PLANNED | SMB (default) | NFS/SFTP available |

### A4. External Services

| Item | Status | Decision/Value | Notes |
|---|---|---|---|
| Telegram Bot | ⏳ ACTION | สร้างใหม่: TKC SuperApp | **Owner: 15 min via @BotFather** |
| Bot Token | ⏳ ACTION | After bot creation | Store encrypted |
| Admin Chat ID | ⏳ ACTION | After group creation | "TKC-AlertOps" |
| HTTPS | ✅ LOCKED | Cloudflare Tunnel | Free + auto SSL |
| Cloudflare Tunnel | ⏳ ACTION | Setup needed | **Owner: ~30 min config** |

### A5. Hardware Verification

| Item | Status | Decision/Value | Notes |
|---|---|---|---|
| Spark #1 SSD | ⏳ ACTION | Need ≥ 256 GB free | **Owner: verify** |
| Spark #1 RAM | ✅ CONFIRMED | 128 GB | — |
| Mac Mini link | ⏳ ACTION | LAN connectivity | For พอร์ช agent |
| Backup Spark | 📋 PLANNED | Spark #2 standby | DR scenario |

---

## B. 🟡 P1 Design Decisions — All Locked ✅

### B1. Pricelist Module

| Item | Status | Decision/Value |
|---|---|---|
| Currency symbol | ✅ LOCKED | `บาท` |
| Currency position | ✅ LOCKED | Suffix |
| Print paper default | ✅ LOCKED | A4 Portrait |
| Quote sharing domain | ✅ LOCKED | `app.giantwillow.com/q/{id}` |
| Quote link expiry | ✅ LOCKED | 7 days |
| Bundle max rows | ✅ LOCKED | 11 |
| Mobile cache TTL | ✅ LOCKED | 7 days |
| Click popup auto-dismiss | ✅ LOCKED | 10 seconds |

### B2. AIO Sync

| Item | Status | Decision/Value |
|---|---|---|
| AIO connection | ✅ LOCKED | Plain TCP on LAN |
| Sync schedule | ✅ LOCKED | Every 15 min |
| Bulk operations max | ✅ LOCKED | 500 items |
| Conflict resolution | ✅ LOCKED | Admin-only manual review |
| Retry intervals | ✅ LOCKED | 1 / 5 / 15 min escalation |
| Auto-pause triggers | ✅ LOCKED | AIO down >5min OR Fail >10% OR Queue >500 |

### B3. User Management

| Item | Status | Decision/Value |
|---|---|---|
| Tablet count (counter) | ✅ LOCKED | 10 tablets |
| Initial admin accounts | ✅ LOCKED | 2 (Owner + 1 backup) |
| Default groups | ✅ LOCKED | 5 (Admin/B-Tire/Dealer/Counter/ลูกค้า) |
| Custom groups max | ✅ LOCKED | 10 |
| Max groups per user | ✅ LOCKED | 3 |
| Backup admin identity | ⏳ ACTION | **Owner: ระบุชื่อ** |

### B4. Security

| Item | Status | Decision/Value |
|---|---|---|
| Password min length | ✅ LOCKED | 8 chars alphanumeric |
| Password rotation | ✅ LOCKED | Never required |
| Lockout threshold | ✅ LOCKED | 5 fails / 5 min auto-unlock |
| 2FA for Admin | ✅ LOCKED | Phase 2 (deferred) |
| Cipher rotation | ✅ LOCKED | ❌ Never rotate (compensate w/ physical security) |
| Session timeout — Admin | ✅ LOCKED | 60 min |
| Session timeout — B-Tire | ✅ LOCKED | 30 min |
| Session timeout — Dealer | ✅ LOCKED | 30 min |
| Session timeout — Counter | ✅ LOCKED | 15 min |

### B5. AI Agent (พอร์ช)

| Item | Status | Decision/Value |
|---|---|---|
| Agent IP whitelist | ⏳ ACTION | Mac Mini + Spark #2 IPs | **Owner: ระบุ IPs** |
| Key rotation period | ✅ LOCKED | 180 days |
| Rate limits | ✅ LOCKED | 100/min, 1000/hr |
| Allowed endpoints | ✅ LOCKED | Audit + NAS + System summaries |

### B6. Development

| Item | Status | Decision/Value |
|---|---|---|
| Dev approach | ✅ LOCKED | Owner + Claude/พอร์ช (Option C) |
| Git repository | ✅ LOCKED | GitHub private |
| CI/CD platform | ✅ LOCKED | GitHub Actions |

---

## C. 🟢 P2 Smaller Decisions — All Locked ✅

| Item | Status | Decision/Value |
|---|---|---|
| Daily summary timing | ✅ LOCKED | 18:00 Asia/Bangkok |
| Quiet hours | ✅ LOCKED | 23:00 - 06:00 (Critical bypasses) |
| Telegram default alerts | ✅ LOCKED | Critical + Warning + Sync failures |
| Phase 2 deferred items | ✅ LOCKED | Web Push, Tauri wrapper, 2FA, Email reports |

---

## D. 📦 Documentation Status

| # | Document | Status |
|---|---|---|
| 00 | README | ✅ Done |
| 01 | SuperApp PRD v2 | ✅ Done |
| 02 | Pricelist Module PRD v6 | ✅ Done |
| 03 | Settings Hub PRD | ✅ Done |
| 04 | Phase 3 Module Briefs | ✅ Done |
| 05 | Implementation Plan | ✅ Done |
| 06 | ADRs (15 decisions) | ✅ Done |
| 07 | User Stories (35) | ✅ Done |
| 08 | Glossary (~150 terms) | ✅ Done |
| 09 | Database ERD | ✅ Done |
| 10 | Threat Model (STRIDE) | ✅ Done |
| 11 | Operations Runbook | ✅ Done |
| 12 | AIO Sync Queue UX | ✅ Done |
| 13 | Phase 1 Readiness Tracker | 🟡 This (updating) |
| 14 | Quality Gates + DoD | 📝 Next |
| 15 | Sprint W1-W2 Detailed | 📝 Next |
| 16 | Risk Register | ⏸️ Optional (after start) |

---

## E. 🛠️ Owner Action Items (ก่อนเริ่ม Week 1)

### Immediate (within 1-2 days)

```
🔴 P0 Tasks for Owner:

[ ] 1. Telegram Bot Setup (~15 min)
       □ @BotFather → /newbot
       □ Name: "TKC SuperApp Alerts"
       □ Bot username: tkc_superapp_bot
       □ Save token
       □ Create group "TKC-AlertOps"
       □ Add bot + get chat ID

[ ] 2. Cloudflare Tunnel Setup (~30 min)
       □ Login Cloudflare → Zero Trust > Networks > Tunnels
       □ Create tunnel: "tkc-superapp"
       □ Install cloudflared on Spark #1
       □ Configure routes:
         - app.giantwillow.com → Spark #1:80
       □ Save credentials

[ ] 3. Synology NAS Service Account (~30 min)
       □ DSM Control Panel > User > Create
       □ Username: tkc_sync_svc
       □ Group: users only (NO admin)
       □ Create shared folder structure:
         /volume1/tkc/audit-archive/
         /volume1/tkc/photos/        (Phase 3)
         /volume1/tkc/voice/         (Phase 3)
         /volume1/tkc/db-backups/
       □ Set permissions: tkc_sync_svc has read/write on /volume1/tkc/
       □ Note: IP, hostname, share name, credentials

[ ] 4. AIO Vendor Contact (Critical Path)
       □ Email/call vendor
       □ Request: API documentation
       □ Request: MySQL schema export
       □ Request: Test environment credentials
       □ Track ETA — affects Week 7+ schedule
       □ Buffer plan if delayed >2 weeks

[ ] 5. GitHub Repo Creation (~10 min)
       □ Create private repo: tkc-superapp
       □ Enable: Branch protection on main
       □ Enable: Required reviews on PRs
       □ Enable: Secret scanning
       □ Enable: Dependabot security updates
       □ Add Owner as admin

[ ] 6. Backup Admin Identity (~5 min)
       □ ระบุชื่อ backup admin
       □ ชื่อใน chat
```

### Hardware Verification (Quick checks)

```
[ ] Verify Spark #1 SSD free space (need ≥ 256 GB)
       df -h
       
[ ] Verify Spark #1 RAM (128 GB total)
       free -h
       
[ ] Verify Mac Mini → Spark #1 LAN connectivity (for พอร์ช)
       ping spark1.local
       
[ ] Confirm Spark #2 IP (for agent whitelist)
       From Spark #2: ip addr
```

### IP Whitelist for AI Agent

```
[ ] Mac Mini M4 IP:     192.168.10.____
[ ] Spark #2 IP:        192.168.10.____
```

---

## F. 👥 Team & Communication — Locked ✅

| Item | Status | Decision |
|---|---|---|
| Development team | ✅ LOCKED | Owner solo + Claude/พอร์ช |
| Project Manager | ✅ LOCKED | ชิบะน้อย |
| QA approach | ✅ LOCKED | Owner tests + Claude generates test suites |
| Status meeting | ✅ LOCKED | Self-paced (Owner tracks) |
| Issue tracking | ✅ LOCKED | GitHub Issues |
| Branching strategy | 📋 PROPOSED | main + feature/* (PR required) |
| Deploy frequency | 📋 PROPOSED | Continuous (post-test) |

---

## G. 🎯 Phase 1 Ready-to-Start Checklist

```
✅ Design Phase (Round 1):
   [✅] All P0 design decisions locked
   [✅] All P1 design decisions locked
   [✅] All P2 design decisions locked
   [✅] PRDs comprehensive (13 docs)
   [✅] Architecture defined
   [✅] Database ERD designed
   [✅] Threat model assessed
   [✅] Runbook prepared

🟡 Execution Prep (Round 2 — In Progress):
   [✅] Phase 1 Readiness Tracker (this doc)
   [🟡] Quality Gates + Definition of Done (next)
   [🟡] Week 1-2 Detailed Sprint Plan (next)
   [⏸️] Risk Register (defer, covered partially)
   [⏸️] Cutover Plan (defer, near launch)
   [⏸️] Training Materials (defer, near launch)

⏳ Owner Action Items (must complete before Week 1):
   [ ] Telegram Bot setup
   [ ] Cloudflare Tunnel setup
   [ ] NAS service account
   [ ] AIO vendor contact (start, can be parallel)
   [ ] GitHub repo creation
   [ ] Backup admin identity
   [ ] Hardware verification
   [ ] IP whitelist info

🚀 Phase 1 Start Trigger:
   All Owner Action Items complete → BEGIN Week 1
```

---

## H. 📅 Decision Sessions Log

### Session 1 — 2026-05-12 ✅ COMPLETE

**Duration:** Single chat session  
**Decisions made:** 34 locked + ~20 actions assigned

```
Batch 1 (3): AIO access status / NAS status / Telegram bot
Batch 2 (3): Domain / HTTPS / Tablet count
Batch 3 (3): Dev approach / Git repo / Quote URL
Batch 4 (3): Initial admin / Cipher rotation / Bulk sync max
Bulk: 22 default proposals confirmed
Total: 34 decisions
```

### Session 2 — TBD

**Goal:** After Owner completes action items → confirm setup, kickoff Phase 1

---

## I. 📊 Risk Snapshot

```
🔴 Critical Risks:
  1. AIO vendor delay → Week 7+ blocked
     Mitigation: Week 1-6 doesn't need AIO. 2-week buffer in plan.
  
  2. Cipher leak (no rotation policy)
     Mitigation: Physical security + audit + emergency rotation runbook

🟡 Medium Risks:
  1. iOS PWA limitations (push)
     Mitigation: Telegram fallback always available
  
  2. Solo dev burnout
     Mitigation: Phased delivery, weekly checkpoints

🟢 Low Risks:
  1. Cloudflare Tunnel stability — proven tech
  2. NAS reliability — existing infrastructure
  3. PostgreSQL performance — proven for this scale
```

(Full Risk Register optional — see Threat Model 10 + this tracker)

---

## J. 🚦 Current State

```
Phase 1 Readiness: 85%

WHAT'S DONE:
  ✅ Comprehensive design (13 PRDs)
  ✅ 34 decisions locked
  ✅ Tracker updated

WHAT'S NEXT:
  📝 Quality Gates + DoD (Round 2)
  📝 Sprint W1-W2 Detailed Plan (Round 2)
  ⏳ Owner Action Items (parallel to Round 2)

WHEN START PHASE 1:
  After Owner completes 8 action items
  Estimated: 1-3 days of owner setup time
```

---

**End of Phase 1 Readiness Tracker v2.0**

| Version | Date | Notes |
|---|---|---|
| 1.0 | 2026-05-12 | Initial tracker |
| **2.0** | **2026-05-12** | **All 34 decisions locked. Round 1 complete.** |
