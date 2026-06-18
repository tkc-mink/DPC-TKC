# 🗄️ DATABASE.md — TKC Dynamic Pricelist

> PostgreSQL 16 · schema-per-module · Laravel migrations
> อ้างอิง schema เต็มจาก PRD `09_Database_ERD.md` — ไฟล์นี้คือคู่มือลงมือทำบน Laravel

---

## 1. ตั้งค่าเริ่มต้น

```bash
# สร้าง DB + user
createdb tkc_superapp
psql tkc_superapp -c "CREATE USER tkc WITH PASSWORD '********';"
psql tkc_superapp -c "GRANT ALL ON DATABASE tkc_superapp TO tkc;"

# extension ที่ต้องเปิด
psql tkc_superapp -c "CREATE EXTENSION IF NOT EXISTS pg_trgm;"     # ค้นหา fuzzy
psql tkc_superapp -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"  # UUID
psql tkc_superapp -c "CREATE EXTENSION IF NOT EXISTS vector;"      # pgvector (เผื่อ AI/Phase3)
```

### schema แยกตามโมดูล
```sql
CREATE SCHEMA core;          -- ผู้ใช้, สิทธิ์, audit, devices, files, modules
CREATE SCHEMA pricelist;     -- หมวด, ชีต, แถว, bundle, cr, sync...
CREATE SCHEMA settings_hub;  -- policy, branding, nas, cipher_keys
-- Phase 3: checkin, photo_report, voice_report
```

ใน Laravel migration:
```php
DB::statement('CREATE SCHEMA IF NOT EXISTS pricelist');
Schema::create('pricelist.rows', function (Blueprint $t) { ... });  // ใช้ชื่อเต็ม schema.table
```
ตั้ง `search_path` ใน `config/database.php`:
```php
'pgsql' => [
    // ...
    'search_path' => 'core,pricelist,settings_hub,public',
],
```

---

## 2. ตารางหลัก (Core)

### `core.users`
| คอลัมน์ | ชนิด | หมายเหตุ |
|---|---|---|
| id | uuid PK | |
| username | varchar UNIQUE | |
| password_hash | text | **Argon2id** (`Hash::make`) |
| display_name | varchar | |
| role | varchar | admin / btire / dealer / counter |
| is_shared | bool | บัญชีใช้ร่วม (Counter) → มี PIN หลายอัน |
| email, phone | varchar | |
| telegram_token_enc | text | **เข้ารหัส** (`Crypt::encryptString`) |
| notification_prefs | jsonb | |
| theme | varchar | light/dark/auto |
| active, last_login_at, suspended_at | | |

### กลุ่ม & สิทธิ์
- `core.groups` — 4 default + ≤10 custom · `columns_visible jsonb` (สิทธิ์รายคอลัมน์ pricelist) · `features jsonb`
- `core.user_groups_membership` — user ↔ group (1 user ≤ 3 group, สิทธิ์ = union)
- `core.modules` — module registry (code, name_th, icon, api_prefix, ui_path, is_active)
- `core.module_group_permissions` — `access_level` = none/read/write/admin + `custom_config jsonb`

### `core.pins` (บัญชีใช้ร่วม)
`user_id, staff_name, pin_hash, active` — PIN 4/6 หลัก, ไม่ซ้ำทั้งระบบ, reuse หลัง 90 วัน

### `core.devices` / `core.device_requests`
fingerprint (hash UA+canvas+screen) · whitelist · auto-approve จาก IP ออฟฟิศ · approve นอกออฟฟิศ

### `core.audit_log` — สำคัญมาก, ปริมาณสูง
เก็บ **ทุก action**: `occurred_at, user_id, user_name_snapshot, module_code, category, action, severity, resource_type/id/label, details jsonb, result, ip_address, network_type, device_id, parent_event_id`
- **3-tier:** Hot = PostgreSQL (0–3 เดือน) · Warm = SSD `.jsonl.gz` (3–12 ด.) · Cold = NAS `.jsonl.gz` (1–3 ปี) · purge >3 ปี
- `core.audit_archive_index` ชี้ทุก tier + checksum (query รวมได้)
- Job รายเดือน: ย้าย hot→warm→cold

### `core.aio_initial_backup` — ลบไม่ได้ตลอดกาล ⚠️
backup field 1-4 ของ AIO ก่อนเขียนครั้งแรก (migration) + SHA256 — กันข้อมูลบัญชีพัง

---

## 3. ตาราง Pricelist

### `pricelist.categories`
`id, name, code, sort_order, schema_def jsonb, global_vars jsonb`
- `schema_def` = นิยามคอลัมน์ของหมวดนั้น (Universal Schema Engine) เช่น ยางเก๋งมี ทุน/ราคา/B/A/S/DOT, แบตมี Ah/คืนหม้อ

### `pricelist.sheets`
`id, category_id FK, name, page_number, subtitle, section_headers jsonb, sort_order`

### `pricelist.rows` — แถวสินค้า (หัวใจ)
```sql
id uuid PK,
sheet_id uuid FK,
row_index int,
aio_product_id varchar,        -- ลิงก์ไป aio_cache (stock/DOT)
status varchar,                -- '-', '+', 'C', หรือรหัสส่วนลด
is_oem boolean,
data jsonb,                    -- ★ เก็บค่าตาม schema_def (เลขจริง! cipher ที่ display)
formatting jsonb,
created_at, updated_at, updated_by uuid, deleted_at  -- soft delete
```
> **`data` เก็บเลขจริงเสมอ** (cost, retail, B/A/S) — การ cipher เกิดที่ API layer ตาม role (ดู `docs/CIPHER.md`)

### ตารางประกอบ
| ตาราง | ใช้ทำอะไร |
|---|---|
| `pricelist.bundles` / `bundle_rows` / `bundle_components` | ชุดยาง (Standard + Mix by Rim) |
| `pricelist.cr_tiers` / `cr_tier_rows` / `category_cr_config` | Credit Surcharge (global + override รายหมวด) |
| `pricelist.price_history` | ทุกการเปลี่ยนราคา (before/after, source) |
| `pricelist.price_schedule` | ตั้งเวลาปรับราคา (absolute/+amount/+%) |
| `pricelist.restore_points` | snapshot (auto/daily/manual/launch) |
| `pricelist.aio_cache` | mirror stock/DOT/prices จาก AIO (sync 15 นาที) |
| `pricelist.sync_queue` | คิวเขียนกลับ AIO + retry_count + error |
| `pricelist.migration_sessions` / `migration_candidates` | ย้ายข้อมูล Excel (Algo A/B + 3-Round) |
| `pricelist.custom_symbols` | สัญลักษณ์ที่ admin นิยามเอง |
| `pricelist.user_favorites` / `search_history` | ของผู้ใช้ |

### Settings Hub
`settings_hub.security_policy`, `role_session_config` (auto-logout รายบทบาท), `branding` (logo, สี, สกุลเงิน), `nas_config` + `nas_health_log`, `cipher_keys` (เก็บ map 0-9 ของ cipher #1/#2 + reserved)

---

## 4. Indexes สำคัญ (ประสิทธิภาพ)

```sql
-- ค้นหา pricelist
CREATE INDEX idx_rows_sheet   ON pricelist.rows(sheet_id, row_index);
CREATE INDEX idx_rows_aio     ON pricelist.rows(aio_product_id);
CREATE INDEX idx_rows_status  ON pricelist.rows(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_rows_data    ON pricelist.rows USING gin(data);                       -- query ใน jsonb
CREATE INDEX idx_rows_trgm    ON pricelist.rows USING gin((data->>'name') gin_trgm_ops); -- fuzzy

-- audit (ปริมาณสูง)
CREATE INDEX idx_audit_time   ON core.audit_log(occurred_at DESC);
CREATE INDEX idx_audit_user   ON core.audit_log(user_id, occurred_at DESC);
CREATE INDEX idx_audit_sev    ON core.audit_log(severity) WHERE severity IN ('critical','warning');

-- sync
CREATE INDEX idx_sync_status  ON pricelist.sync_queue(status, queued_at);
```

---

## 5. การเชื่อม AIO (MySQL) — connection ที่ 2

`config/database.php`:
```php
'aio' => [
    'driver'   => 'mysql',
    'host'     => env('AIO_DB_HOST'),
    'database' => env('AIO_DB_DATABASE'),
    'username' => env('AIO_DB_USERNAME'),   // อ่านอย่างเดียวสำหรับ master/stock
    'password' => env('AIO_DB_PASSWORD'),
    'options'  => [PDO::ATTR_TIMEOUT => 5],
],
```
ใช้ใน service: `DB::connection('aio')->table(...)`
- **อ่าน:** master + stock + DOT → เขียนลง `pricelist.aio_cache`
- **เขียนกลับ:** เฉพาะ field ราคา 1-4 ผ่าน `sync_queue` (≤500/รอบ) · field 5 ห้ามแตะ
- กฎ sync/retry/auto-pause → `docs/ARCHITECTURE.md §5`

> ⚠️ ก่อน sync เขียนครั้งแรก: รัน command `php artisan aio:backup-initial` → เขียน `core.aio_initial_backup` + verify SHA256 **ก่อน**ทำอะไรกับ AIO

---

## 6. Cross-schema FK — กฎ

- ✅ FK ภายใน schema เดียวกัน (pricelist.rows → pricelist.sheets)
- ✅ อ้าง `core.*` ได้จากทุกที่ (user_id, group_id)
- ❌ **ห้าม** FK ข้าม module schema (เช่น checkin → photo_report) → ใช้ UUID อ้างเฉย ๆ + cleanup worker
- soft-delete: เก็บ 30 วันก่อนลบจริง

---

## 7. ปริมาณข้อมูล (ปีแรก)
| ตาราง | ประมาณ |
|---|---|
| users / groups / devices | 30 / 14 / 100 |
| pricelist.rows | ~2,629 |
| price_history | ~50,000/ปี |
| audit_log (hot) | ~3M/ปี (~600MB) |
| **รวม DB** | ~5–8 GB (ปี 1) → ~10–15 GB (ปี 3) |
| NAS cold | ~1.5 GB/ปี |

---

## 8. Backup (LOCKED ตาม PRD)
```
รายวัน:   pg_dump แยก schema (core / pricelist / settings_hub) — เก็บ 3 rotation
รายชั่วโมง: WAL archive (pricelist) — 3 rotation
manual:   admin สั่ง — เก็บ 3
PERMANENT (ลบไม่ได้):
  • Launch-day backup
  • Cipher backup card (PDF + พิมพ์กระดาษเก็บจริง)
  • core.aio_initial_backup
รายไตรมาส: export ลง external drive เก็บนอกสถานที่
```

---

## 9. Migrations & Seeders (Laravel)
```
database/migrations/
  2026_06_01_000001_create_core_schema.php
  2026_06_01_000002_create_core_users.php
  ...
app/Modules/Pricelist/Database/Migrations/
  2026_06_07_000001_create_pricelist_schema.php
  ...
database/seeders/
  DefaultGroupsSeeder.php     # 4 กลุ่ม + columns_visible
  CipherKeysSeeder.php        # cipher #1/#2 default (ดู docs/CIPHER.md)
  AdminUserSeeder.php
  SampleSheetsSeeder.php      # หมวด/ชีตตัวอย่างสำหรับ dev
```
แต่ละ module เก็บ migration ของตัวเอง · เปลี่ยนเฉพาะแบบ backward-compatible · breaking change ต้องมีแผน downtime

---

*schema diagram เต็ม (Mermaid) → PRD `09_Database_ERD.md`*
