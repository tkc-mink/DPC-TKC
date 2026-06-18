# 🔌 API.md — TKC Dynamic Pricelist

> REST endpoints (Laravel routes) + payloads + auth + WebSocket events
> Web UI ใช้ **Inertia** (controller ส่ง props ตรง) · `/api/*` (Sanctum token) ไว้สำหรับ **PWA มือถือ, AI Agent, quote สาธารณะ**

---

## 1. Authentication

| Method | Endpoint | Body | ผลลัพธ์ |
|---|---|---|---|
| POST | `/api/auth/login` | `{username, password, device_fingerprint}` | token + user + groups |
| POST | `/api/auth/refresh` | `{refresh_token}` | token ใหม่ |
| POST | `/api/auth/logout` | — | 204 |
| POST | `/api/auth/pin` | `{pin}` | สำหรับบัญชีใช้ร่วม (Counter) |
| GET | `/api/auth/me` | — | user ปัจจุบัน + สิทธิ์ |

- **Web:** session (Sanctum SPA) · **Mobile/PWA:** bearer token (15 นาที access + 30 วัน refresh)
- ล็อกหลังพิมพ์ผิด 5 ครั้ง/5 นาที · device นอกออฟฟิศต้อง approve
- auto-logout ตามบทบาท: admin 60 / sales 30 / counter 15 นาที

---

## 2. Pricelist — ดูราคา

### Categories / Sheets
```
GET /api/pricelist/categories                 → [{id, name, code, page, count}]
GET /api/pricelist/sheets/{id}                 → sheet meta + section_headers
GET /api/pricelist/sheets/{id}/rows            → แถว (กรองคอลัมน์ตาม role!)
```

### ⚠️ การกรองคอลัมน์ตาม role (สำคัญที่สุด)
Response ของ `rows` **เปลี่ยนตาม role** — server ตัดฟิลด์ที่ไม่มีสิทธิ์ออกก่อนส่ง:

```jsonc
// Admin เห็นทั้งหมด
{ "id":"r1", "size":"215/70R15C", "brand":"Otani", "model":"MK2000",
  "retail":1950, "cost":1818, "cost_code":"TBTB",
  "bas":{"B":1850,"A":1820,"S":1790}, "bas_code":"IPEO/IPZO/IYRO",
  "margin":132, "dot":[...], "stock":{...}, "status":"-" }

// เซลล์ยางใหญ่ (B2C) — เห็นแค่ราคาขาย ไม่มี cost/bas เลย
{ "id":"r1", "size":"215/70R15C", "brand":"Otani", "model":"MK2000",
  "retail":1950, "dot":[...], "stock":{...}, "status":"-" }

// เซลล์ดูแลร้านค้า (Dealer/B2B) — เห็นรหัส B/A/S ไม่เห็นราคาขาย/ทุน
{ "id":"r1", "size":"215/70R15C", ...,
  "bas_code":"IPEO/IPZO/IYRO", "dot":[...], "stock":{...} }
```
> ใช้ **Laravel API Resource** (`PricelistRowResource`) ที่ `when($user->can('viewCost'), ...)` — **ห้าม**ส่งเลขจริงแล้วซ่อนด้วย frontend

### Rows (Admin แก้ไข)
```
POST   /api/pricelist/rows           {sheet_id, data}          (Admin)
PUT    /api/pricelist/rows/{id}      {data, reason?}           (Admin) → audit + broadcast
DELETE /api/pricelist/rows/{id}                                (Admin, soft-delete)
PUT    /api/pricelist/rows/batch     {changes:[...]}           (Admin, batch save)
```

### ค้นหา (subsequence + filter)
```
GET /api/pricelist/search?q=21515mk&cat=car&brand=&status=&dot=&stock=
```
- subsequence matching (จับลำดับตัวอักษร) + pg_trgm
- คำสั่งพิเศษ `$mapped`, `$stock=0` → Admin เท่านั้น
- debounce 200ms · มี recent + favorites + top-20

---

## 3. Bundles & Quote
```
GET  /api/pricelist/bundles                    → standard bundles
POST /api/pricelist/bundles                     {name, rows[]}        (Admin)
POST /api/pricelist/bundles/{id}/quote          {items[]}  → {short_id, url}
GET  /q/{short_id}                              → หน้าใบเสนอราคาสาธารณะ (หมดอายุ 7 วัน, Open Graph)
```

## 4. CR (Credit Surcharge)
```
GET /api/pricelist/cr-tiers                     → global tier
PUT /api/pricelist/cr-tiers/{scope}/{id}        (Admin) — global / per-category / disabled
```
ราคาเครดิต = retail + surcharge(ตามช่วงราคา) · bundle = รวมรายชิ้น

## 5. Migration (Admin)
```
POST /api/pricelist/migration/upload            (multipart, หลายไฟล์ Excel)
GET  /api/pricelist/migration/{session}         → progress (verified/conflict/suspect)
POST /api/pricelist/migration/{session}/round3-tick   {candidate_id, approved}
```
3-Round: Algo A (Levenshtein) → Algo B (token/pattern) → Admin tick · resume ได้ (auto-save ทุก 10 tick)

## 6. Schedule / Restore (Admin)
```
GET/POST/DELETE /api/pricelist/schedule[/{id}]     ตั้งเวลาปรับราคา (อนาคต) + แจ้ง Telegram
GET  /api/pricelist/restore-points                  รายการ snapshot
POST /api/pricelist/restore-points/{id}/apply       {scope} → preview diff → ยืนยัน
```

## 7. Cipher (Admin)
```
GET  /api/pricelist/cipher                       → map ปัจจุบัน (#1/#2)
POST /api/pricelist/cipher/setup                  wizard ครั้งแรก
PUT  /api/pricelist/cipher                        {set, mapping, reason}  → audit Critical
```
ดูสเปกเต็ม → `docs/CIPHER.md`

## 8. AIO Sync (Admin)
```
POST /api/pricelist/sync/run                      sync เดี๋ยวนี้
GET  /api/pricelist/sync/queue                    คิว + สถานะ + retry_count
POST /api/pricelist/sync/queue/{id}/retry
```

---

## 9. Settings Hub (`/api/settings/*`, Admin)
```
GET/POST/PUT/DELETE /api/settings/users[/{id}]
POST /api/settings/users/{id}/reset-password
GET/POST/PUT/DELETE /api/settings/groups[/{id}]
GET  /api/settings/devices · POST .../{id}/approve · POST .../{id}/block
GET/PUT /api/settings/security/policy
GET/PUT /api/settings/security/auto-logout/{role}
GET/PUT /api/settings/{notifications|nas|agents|modules|branding|health}
POST /api/settings/nas/check                      (5-step health test)
POST /api/settings/agents/{id}/rotate-key
GET  /api/settings/audit?date=&user=&module=&severity=   (Admin only)
```

---

## 10. AI Agent Gateway (LAN เท่านั้น)
```
GET /api/agent/audit/*       GET /api/agent/nas/health      GET /api/agent/system/status
```
- Auth: API Key + **HMAC** + IP whitelist (192.168.x.x) + nonce (กัน replay)
- rotate อัตโนมัติ 180 วัน · rate limit 100/นาที · **ไม่ให้แตะข้อมูล pricelist**

---

## 11. WebSocket (Laravel Reverb + Echo)

| Channel | Event | ใช้ทำอะไร |
|---|---|---|
| `pricelist.sheet.{id}` (private) | `PriceUpdated` | Admin แก้ → viewer เห็นทันที |
| `pricelist.sheet.{id}` (presence) | join/leave | ใครกำลังดู/แก้ชีตนี้ |
| `sync.status` (private, admin) | `SyncProgress`, `SyncFailed` | คืบหน้า/ล้มเหลวของ AIO sync |
| `notifications.{userId}` (private) | `NotificationCreated` | กระดิ่งแจ้งเตือน |

ฝั่ง client:
```js
Echo.private(`pricelist.sheet.${id}`).listen('PriceUpdated', e => updateRow(e.row));
```

---

## 12. มาตรฐาน response & error
```jsonc
// success
{ "data": {...}, "meta": { "page":1, "total":2629 } }
// error
{ "message": "ไม่มีสิทธิ์เข้าถึงคอลัมน์นี้", "errors": {...}, "code": "FORBIDDEN_COLUMN" }
```
| HTTP | ใช้เมื่อ |
|---|---|
| 200/201/204 | สำเร็จ |
| 401 | ยังไม่ login / token หมดอายุ |
| 403 | login แล้วแต่ไม่มีสิทธิ์ (role/column) |
| 409 | ขัดแย้ง (เช่น migration conflict) |
| 422 | validation ไม่ผ่าน (Laravel FormRequest) |
| 429 | เกิน rate limit |

ทุก endpoint ที่เปลี่ยนข้อมูล → เขียน `core.audit_log` อัตโนมัติ (ผ่าน middleware/observer)

---

*หน้า prototype ที่ตรงกับ endpoint เหล่านี้ → ดู `TKC Dynamic Pricelist.html`*
