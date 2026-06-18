# 📚 TKC SuperApp — PRD Documentation Index

**TKC AUTO PLUS** — Enterprise Web-First Multi-Module Platform

| Field | Value |
|---|---|
| **Date Created** | 2026-05-12 |
| **Owner** | ชิบะน้อย |
| **Project** | TKC SuperApp |
| **Architecture** | Web-First (PWA + Optional Native Wrappers) |
| **Status** | Phase 1 — Ready for Implementation |

---

## 🏗️ Architecture Decision

**Web-First Strategy:**
- ✅ **Primary:** Web App + PWA (single React codebase)
- ✅ **Desktop wrapper (optional):** Tauri (.exe) — for Admin use
- ✅ **Mobile wrapper (Phase 3+):** Capacitor — only when native features required (GPS background, advanced camera)

**Goals:**
- 🌍 Mass adoption (browser = universal access)
- 🚀 Single codebase to maintain
- ⚡ Instant deploy (no app store delay)
- 💰 Lower development cost
- 📱 Multi-platform (iOS/Android/Windows/Mac/Linux)

---

## 📋 Document Structure

```
TKC_PRD_Documents/
├── 00_README.md                              ← นี่ คู่มือ
├── 01_PRD_TKC_SuperApp_v2.md                 ← Master Architecture
├── 02_PRD_TKC_Pricelist_Module_v6.md         ← Pricelist Module (Phase 1)
├── 03_PRD_TKC_Settings_Hub_v1.md             ← Admin Settings Hub (Phase 1)
├── 04_PRD_Phase3_Modules_Briefs.md           ← Check-in + Photo + Voice (Phase 3)
└── 05_Implementation_Plan_Phase1.md          ← Phase 1 Action Plan
```

---

## 🎯 Reading Order

### For Stakeholders / Decision Makers
1. **00_README** (this file) — overview
2. **01_SuperApp_v2** — sections 1-3 (Vision, Architecture, Phases)
3. **05_Implementation_Plan** — timeline + deliverables

### For Developers
1. **01_SuperApp_v2** — full read (architecture)
2. **02_Pricelist_Module_v6** — Phase 1 primary deliverable
3. **03_Settings_Hub_v1** — Phase 1 parallel deliverable
4. **05_Implementation_Plan** — task breakdown

### For Product / UX
1. **01_SuperApp_v2** — sections 5, 6 (User app, Modules)
2. **02_Pricelist_Module_v6** — functional spec
3. **04_Phase3_Briefs** — Phase 3 modules (vision)

---

## 📊 Module Status

| Module | PRD | Phase | Status |
|---|---|---|---|
| **SuperApp Architecture** | 01 | Foundation | 🟢 Design 100% |
| **Pricelist Module** | 02 | Phase 1 | 🟢 Design 95% |
| **Settings Hub** | 03 | Phase 1 | 🟢 Design 90% |
| **Check-in / Photo / Voice** | 04 | Phase 3 | 🟡 Brief (high-level) |
| Sales Stats | — | Phase 4+ | ⚪ Future |
| CRM (lite) | — | Phase 4+ | ⚪ Future |
| Delivery Tracking | — | Phase 4+ | ⚪ Future |
| Service Tickets | — | Phase 4+ | ⚪ Future |

---

## 🔑 Key Decisions Locked

### Architecture
- ✅ Web-First (React + Next.js + PWA)
- ✅ Backend: FastAPI + PostgreSQL 16 + Redis
- ✅ Single user identity across modules
- ✅ Schema-per-module in same PostgreSQL
- ✅ Module Registry pattern

### Security
- ✅ JWT + device fingerprint
- ✅ AI Agent: HMAC + IP whitelist + LAN only + 180-day rotation
- ✅ Audit log: 3-tier (Hot/Warm/Cold/NAS) — 3 ปี retention

### Permissions
- ✅ 4 default groups + max 10 custom
- ✅ User in max 3 groups (union)
- ✅ Cross-module permissions per group
- ✅ Column-level visibility (Pricelist)
- ✅ Relogin on group change

### Pricelist-specific
- ✅ Cipher #1 (ทุน) + #2 (ราคาส่ง) + Reserved A
- ✅ CR Tier (Credit Surcharge) — global + per-category override
- ✅ Bundle: Standard + Mix by Rim
- ✅ Migration: 3-Round recheck (Algo A → Algo B → Admin tick)
- ✅ Click-for-Details popups (10s auto-dismiss)
- ✅ Search: subsequence matching + voice
- ✅ DOT: week-level tracking from AIO

### Auto-logout per Role
- Admin: 60 min
- B-Tire Sales: 30 min
- Dealer Sales: 30 min
- Counter: 15 min
- Option: Never (admin override)

---

## ❓ Outstanding Questions (Need Resolution)

### 🔴 P0 — Blockers
- [ ] AIO API documentation
- [ ] AIO database schema (especially image storage)
- [ ] Office network IP range
- [ ] Synology NAS path + credentials

### 🟡 P1 — Important
- [ ] จำนวน Tablets ในร้าน
- [ ] Telegram Bot — existing or new?
- [ ] Currency symbol display preference
- [ ] Quote sharing domain (price.tkc.co?)

---

## 📞 Contact & References

- **Owner:** ชิบะน้อย (TKC AUTO PLUS, Udon Thani)
- **Related System:** TKC-AI (พอร์ช agent on Mac Mini M4)
- **Hardware:** 4× DGX Spark cluster + Mac Mini + PC with 2× RTX Pro 4000
- **Integrations:** AIO (Accounting/Stock), Synology NAS, OpenClaw, Telegram

---

**Version History:**

| Date | Version | Notes |
|---|---|---|
| 2026-05-12 | v1.0 | Initial document set (Web-First pivot) |

---

End of README
