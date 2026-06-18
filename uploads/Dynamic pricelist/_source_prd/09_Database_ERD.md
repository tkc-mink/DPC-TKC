# 📊 TKC SuperApp — Database ERD (Entity Relationship Diagram)

| Field | Value |
|---|---|
| **Document Type** | Database Schema Visual Reference |
| **Version** | 1.0 |
| **Date** | 2026-05-12 |
| **Owner** | ชิบะน้อย (TKC AUTO PLUS) |
| **Database** | PostgreSQL 16 + pgvector |
| **Format** | Mermaid ER Diagrams |

---

## How to View Mermaid Diagrams

- **GitHub/GitLab:** Auto-renders
- **VS Code:** Install "Mermaid Preview" extension
- **Browser:** Use https://mermaid.live/
- **Notion/Obsidian:** Native support

---

## Schema Organization

```
PostgreSQL Database: tkc_superapp
├── core.*           (shared services)
├── pricelist.*      (Pricelist module)
├── settings_hub.*   (Settings module)
├── checkin.*        (Phase 3)
├── photo_report.*   (Phase 3)
└── voice_report.*   (Phase 3)
```

---

# 1. Core Identity Schema

```mermaid
erDiagram
    USERS ||--o{ USER_GROUPS_MEMBERSHIP : "belongs to"
    USERS ||--o{ PINS : "has PINs"
    USERS ||--o{ DEVICES : "owns devices"
    USERS ||--o{ DEVICE_REQUESTS : "requests access"
    USERS ||--o{ AUDIT_LOG : "performs actions"
    USERS ||--o{ USER_FAVORITES : "favorites"
    USERS ||--o{ DASHBOARD_CONFIG : "configures"
    
    GROUPS ||--o{ USER_GROUPS_MEMBERSHIP : "has members"
    GROUPS ||--o{ MODULE_GROUP_PERMISSIONS : "permissions"
    
    MODULES ||--o{ MODULE_GROUP_PERMISSIONS : "granted to"
    
    DEVICES ||--o{ AUDIT_LOG : "device source"
    
    USERS {
        uuid id PK
        varchar username UK
        text password_hash
        varchar display_name
        varchar role
        boolean is_shared
        varchar email
        varchar phone
        text telegram_token_enc
        varchar telegram_chat_id
        jsonb notification_prefs
        varchar theme
        boolean active
        timestamp last_login_at
        timestamp suspended_at
        uuid created_by FK
        timestamp created_at
    }
    
    GROUPS {
        uuid id PK
        varchar name
        text description
        boolean is_default
        jsonb columns_visible
        jsonb features
        timestamp created_at
    }
    
    USER_GROUPS_MEMBERSHIP {
        uuid user_id PK_FK
        uuid group_id PK_FK
        uuid assigned_by FK
        timestamp assigned_at
    }
    
    MODULES {
        uuid id PK
        varchar code UK
        varchar name
        varchar name_th
        varchar icon
        varchar version
        boolean is_active
        varchar api_prefix
        varchar ui_path
        jsonb config
        timestamp installed_at
    }
    
    MODULE_GROUP_PERMISSIONS {
        uuid module_id PK_FK
        uuid group_id PK_FK
        varchar access_level
        jsonb custom_config
    }
    
    PINS {
        uuid id PK
        uuid user_id FK
        varchar staff_name
        text pin_hash
        boolean active
        timestamp created_at
    }
    
    DEVICES {
        uuid id PK
        text fingerprint
        uuid user_id FK
        varchar name
        uuid approved_by FK
        timestamp approved_at
        timestamp last_seen
        boolean active
    }
    
    DEVICE_REQUESTS {
        uuid id PK
        uuid user_id FK
        text fingerprint
        varchar device_name
        inet ip_address
        timestamp requested_at
        varchar status
        uuid reviewed_by FK
        timestamp reviewed_at
    }
```

**Key Relationships:**
- 1 User → many groups (max 3) via USER_GROUPS_MEMBERSHIP
- 1 User → many devices (whitelisted)
- 1 Shared User → many PINs (e.g., Counter shared)
- 1 Group → many module permissions

---

# 2. Audit Log Schema

```mermaid
erDiagram
    AUDIT_LOG ||--o| AUDIT_LOG : "parent event"
    AUDIT_ARCHIVE_INDEX ||--o| AUDIT_ARCHIVE_INDEX : "next month"
    
    USERS ||--o{ AUDIT_LOG : "performs"
    DEVICES ||--o{ AUDIT_LOG : "via device"
    PINS ||--o{ AUDIT_LOG : "PIN context"
    
    AUDIT_LOG {
        uuid id PK
        timestamp occurred_at
        uuid user_id FK
        varchar user_name_snapshot
        uuid pin_id FK
        varchar pin_name_snapshot
        varchar module_code
        varchar category
        varchar action
        varchar severity
        varchar resource_type
        uuid resource_id
        varchar resource_label
        jsonb details
        varchar result
        text error_message
        uuid device_id FK
        varchar device_name_snapshot
        inet ip_address
        varchar network_type
        text user_agent
        uuid parent_event_id FK
        uuid_array related_events
    }
    
    AUDIT_ARCHIVE_INDEX {
        serial id PK
        varchar year_month
        varchar storage_tier
        text file_path
        bigint file_size
        int event_count
        varchar checksum_sha256
        timestamp first_event_at
        timestamp last_event_at
        timestamp archived_at
        timestamp verified_at
    }
```

**3-Tier Storage:**
- Hot (PostgreSQL `audit_log`): 0-3 months
- Warm (local SSD .jsonl.gz): 3-12 months
- Cold (NAS .jsonl.gz): 1-3 years

**Index covers all tiers** for unified query.

---

# 3. AI Agent + Security Schema

```mermaid
erDiagram
    AI_AGENTS ||--o{ AGENT_REQUEST_LOG : "logged calls"
    AGENT_NONCES ||--o| AGENT_NONCES : "expires"
    
    AI_AGENTS {
        uuid id PK
        varchar name
        text api_key_hash
        text hmac_secret_enc
        inet_array allowed_ips
        text_array allowed_endpoints
        int rate_limit_per_min
        int rate_limit_per_hour
        boolean is_active
        int auto_rotate_days
        timestamp expires_at
        uuid created_by FK
        timestamp created_at
        timestamp last_used_at
        bigint total_requests
    }
    
    AGENT_REQUEST_LOG {
        uuid id PK
        uuid agent_id FK
        timestamp occurred_at
        varchar method
        text path
        inet source_ip
        int status_code
        int latency_ms
        text error_reason
    }
    
    AGENT_NONCES {
        varchar nonce PK
        timestamp used_at
        timestamp expires_at
    }
```

**Security Layers:**
- API Key + HMAC + IP whitelist + Nonce + Rate limit
- Auto rotation 180 days
- Nonce TTL 10 min (replay protection)

---

# 4. Pricelist Module Schema

```mermaid
erDiagram
    PRICELIST_CATEGORIES ||--o{ PRICELIST_SHEETS : "contains"
    PRICELIST_SHEETS ||--o{ PRICELIST_ROWS : "has rows"
    PRICELIST_SHEETS ||--o{ PAGE_NOTES : "has notes"
    PRICELIST_SHEETS ||--o{ BUNDLES : "has bundles"
    PRICELIST_CATEGORIES ||--o| CATEGORY_CR_CONFIG : "CR mode"
    
    BUNDLES ||--o{ BUNDLE_ROWS : "contains"
    BUNDLE_ROWS ||--o{ BUNDLE_COMPONENTS : "made of"
    BUNDLE_COMPONENTS }o--o| PRICELIST_ROWS : "references"
    
    CR_TIERS ||--o{ CR_TIER_ROWS : "tiers"
    CATEGORY_CR_CONFIG }o--o| CR_TIERS : "custom tier"
    
    PRICELIST_ROWS ||--o{ PRICE_HISTORY : "history"
    PRICELIST_ROWS ||--o{ PRICE_SCHEDULE : "scheduled"
    PRICELIST_ROWS }o--o| AIO_CACHE : "AIO source"
    PRICELIST_ROWS ||--o{ SYNC_QUEUE : "queued sync"
    
    USERS ||--o{ USER_FAVORITES : "favs"
    USER_FAVORITES }o--|| PRICELIST_ROWS : "favorited row"
    
    USERS ||--o{ SEARCH_HISTORY : "searches"
    
    PRICELIST_CATEGORIES {
        uuid id PK
        varchar name
        varchar code
        int sort_order
        jsonb schema_def
        jsonb global_vars
    }
    
    PRICELIST_SHEETS {
        uuid id PK
        uuid category_id FK
        varchar name
        varchar page_number
        varchar subtitle
        jsonb section_headers
        int sort_order
    }
    
    PRICELIST_ROWS {
        uuid id PK
        uuid sheet_id FK
        int row_index
        varchar aio_product_id
        varchar status
        boolean is_oem
        jsonb data
        jsonb formatting
        timestamp created_at
        timestamp updated_at
        uuid updated_by FK
        timestamp deleted_at
    }
    
    BUNDLES {
        uuid id PK
        uuid sheet_id FK
        varchar name
        int max_rows
        int sort_order
    }
    
    BUNDLE_ROWS {
        uuid id PK
        uuid bundle_id FK
        varchar size_label
        varchar brand_label
        varchar annotation
        numeric retail_total
        numeric sales_amount
        int sort_order
    }
    
    BUNDLE_COMPONENTS {
        uuid id PK
        uuid bundle_row_id FK
        uuid source_row_id FK
        numeric manual_value
        varchar display_prefix
        int sort_order
    }
    
    CR_TIERS {
        uuid id PK
        varchar scope
        uuid scope_id
        varchar name
        boolean is_active
    }
    
    CR_TIER_ROWS {
        uuid id PK
        uuid cr_tier_id FK
        numeric price_min
        numeric price_max
        numeric surcharge
        int sort_order
    }
    
    CATEGORY_CR_CONFIG {
        uuid category_id PK_FK
        varchar cr_mode
        uuid custom_tier_id FK
    }
```

**Key Concepts:**
- `data` JSONB stores schema-defined fields (cipher applied at display)
- `aio_product_id` links to AIO_CACHE for stock/DOT
- Bundle = N rows, each row has M components
- CR tier global → per-category override

---

# 5. Pricelist Operational Schema

```mermaid
erDiagram
    PRICELIST_ROWS ||--o{ PRICE_HISTORY : "audit trail"
    PRICELIST_ROWS ||--o{ PRICE_SCHEDULE : "future changes"
    
    RESTORE_POINTS ||--o| RESTORE_POINTS : "snapshot chain"
    
    AIO_CACHE ||--o{ SYNC_QUEUE : "pending writes"
    
    MIGRATION_SESSIONS ||--o{ MIGRATION_CANDIDATES : "matches"
    
    CUSTOM_SYMBOLS }|--o| PRICELIST_ROWS : "used in status"
    
    PRICE_HISTORY {
        uuid id PK
        uuid row_id FK
        varchar field
        jsonb value_before
        jsonb value_after
        uuid changed_by FK
        timestamp changed_at
        varchar source
    }
    
    PRICE_SCHEDULE {
        uuid id PK
        varchar scope
        uuid scope_id
        varchar field
        varchar change_type
        numeric change_value
        timestamp effective_at
        boolean notify_staff
        boolean is_active
        uuid created_by FK
        timestamp created_at
    }
    
    RESTORE_POINTS {
        uuid id PK
        varchar tier
        varchar reason
        text snapshot_path
        timestamp created_at
        boolean is_permanent
    }
    
    AIO_CACHE {
        uuid id PK
        varchar aio_product_id UK
        varchar name
        varchar brand
        numeric stock_total
        numeric stock_pending
        jsonb dot_breakdown
        jsonb prices
        timestamp synced_at
    }
    
    SYNC_QUEUE {
        uuid id PK
        uuid row_id FK
        varchar field
        numeric value
        varchar status
        int retry_count
        timestamp queued_at
        timestamp last_attempt_at
        text error_message
    }
    
    MIGRATION_SESSIONS {
        uuid id PK
        uuid admin_id FK
        varchar file_name
        int total_items
        int verified_count
        int conflict_count
        int suspect_count
        varchar status
        timestamp started_at
        timestamp last_active_at
        timestamp completed_at
    }
    
    MIGRATION_CANDIDATES {
        uuid id PK
        uuid session_id FK
        varchar excel_row_id
        varchar aio_product_id
        numeric algorithm_a_score
        numeric algorithm_b_score
        varchar category
        boolean approved
        uuid approved_by FK
        timestamp approved_at
    }
    
    CUSTOM_SYMBOLS {
        uuid id PK
        varchar symbol
        varchar meaning
        varchar cell_bg_color
        text popup_text
        uuid created_by FK
        timestamp created_at
    }
```

---

# 6. Settings Hub Schema

```mermaid
erDiagram
    NAS_CONFIG ||--o{ NAS_HEALTH_LOG : "health checks"
    
    USERS ||--o{ SECURITY_POLICY : "configures"
    
    SECURITY_POLICY {
        serial id PK
        varchar policy_key UK
        jsonb policy_value
        uuid updated_by FK
        timestamp updated_at
    }
    
    ROLE_SESSION_CONFIG {
        varchar role PK
        int auto_logout_min
        int max_sessions
        timestamp updated_at
    }
    
    NAS_CONFIG {
        serial id PK
        varchar protocol
        varchar host
        int port
        varchar share_name
        text path
        varchar username
        text password_enc
        text mount_point
        int health_interval
        int timeout
        boolean active
        timestamp updated_at
        uuid updated_by FK
    }
    
    NAS_HEALTH_LOG {
        uuid id PK
        timestamp checked_at
        varchar status
        int latency_read_ms
        int latency_write_ms
        numeric free_space_gb
        numeric total_space_gb
        text error_message
    }
    
    BRANDING {
        serial id PK
        text logo_url
        varchar primary_color
        varchar secondary_color
        varchar currency_symbol
        boolean show_on_print
        timestamp updated_at
    }
    
    POPUP_MESSAGES {
        uuid id PK
        varchar symbol_key UK
        text message_template
        timestamp updated_at
    }
    
    CIPHER_KEYS {
        serial id PK
        int cipher_set
        char digit_0
        char digit_1
        char digit_2
        char digit_3
        char digit_4
        char digit_5
        char digit_6
        char digit_7
        char digit_8
        char digit_9
        text_array reserved_chars
        timestamp created_at
        boolean active
    }
```

---

# 7. Phase 3 Modules (Planned)

```mermaid
erDiagram
    CUSTOMERS ||--o{ VISITS : "visited at"
    USERS ||--o{ VISITS : "by sales"
    VISITS ||--o| PHOTO_ALBUMS : "has photos"
    VISITS ||--o| VOICE_RECORDINGS : "has voice"
    
    PHOTO_ALBUMS ||--o{ PHOTOS : "contains"
    PHOTOS }o--o| FILES : "stored"
    
    VOICE_RECORDINGS }o--o| FILES : "audio file"
    VOICE_RECORDINGS ||--o| DAILY_SUMMARIES : "aggregated"
    
    USERS ||--o{ ROUTE_POINTS : "GPS history"
    
    CUSTOMERS {
        uuid id PK
        varchar name
        text address
        numeric latitude
        numeric longitude
        varchar phone
        varchar contact_name
        varchar category
        timestamp created_at
    }
    
    VISITS {
        uuid id PK
        uuid user_id FK
        uuid customer_id FK
        timestamp check_in_at
        numeric check_in_lat
        numeric check_in_lng
        timestamp check_out_at
        int duration_min
        text notes
        uuid photo_album_id FK
        uuid voice_report_id FK
        varchar status
    }
    
    ROUTE_POINTS {
        uuid id PK
        uuid user_id FK
        timestamp recorded_at
        numeric latitude
        numeric longitude
        numeric accuracy
    }
    
    PHOTO_ALBUMS {
        uuid id PK
        uuid user_id FK
        uuid visit_id FK
        uuid customer_id FK
        varchar name
        timestamp created_at
    }
    
    PHOTOS {
        uuid id PK
        uuid album_id FK
        uuid file_id FK
        uuid thumbnail_id FK
        text caption
        timestamp taken_at
        numeric taken_lat
        numeric taken_lng
        text_array tags
        varchar status
    }
    
    VOICE_RECORDINGS {
        uuid id PK
        uuid user_id FK
        uuid visit_id FK
        uuid audio_file_id FK
        int duration_sec
        text transcript
        varchar transcript_status
        varchar language
        timestamp recorded_at
        timestamp transcribed_at
    }
    
    DAILY_SUMMARIES {
        uuid id PK
        uuid user_id FK
        date summary_date
        text summary_text
        uuid_array recording_ids
        uuid_array visit_ids
        uuid_array photo_album_ids
        varchar status
        timestamp generated_at
        timestamp submitted_at
    }
```

---

# 8. Full System Overview (Simplified)

```mermaid
erDiagram
    USERS }o--o{ GROUPS : "membership"
    GROUPS }o--o{ MODULES : "permissions"
    
    USERS ||--o{ DEVICES : "has"
    USERS ||--o{ AUDIT_LOG : "performs"
    
    MODULES ||--o| PRICELIST : "Pricelist module"
    MODULES ||--o| SETTINGS_HUB : "Settings Hub"
    MODULES ||--o| CHECKIN_MODULE : "Check-in (P3)"
    MODULES ||--o| PHOTO_MODULE : "Photo Report (P3)"
    MODULES ||--o| VOICE_MODULE : "Voice Report (P3)"
    
    PRICELIST ||--|| AIO_CACHE : "syncs from"
    AIO_CACHE ||--|| AIO_MYSQL : "external"
    
    AUDIT_LOG ||--|| HOT_TIER : "0-3 months"
    AUDIT_LOG ||--|| WARM_TIER : "3-12 months"
    AUDIT_LOG ||--|| COLD_TIER : "1-3 years"
    COLD_TIER ||--|| NAS : "Synology storage"
    
    AI_AGENTS ||--o{ AUDIT_LOG : "queries"
```

---

# 9. Indexes & Performance

## Critical Indexes

```sql
-- Audit Log (high volume)
CREATE INDEX idx_audit_log_occurred ON core.audit_log(occurred_at DESC);
CREATE INDEX idx_audit_log_user ON core.audit_log(user_id, occurred_at DESC);
CREATE INDEX idx_audit_log_module ON core.audit_log(module_code, occurred_at DESC);
CREATE INDEX idx_audit_log_severity ON core.audit_log(severity) WHERE severity IN ('critical', 'warning');

-- Pricelist (search performance)
CREATE INDEX idx_pricelist_rows_sheet ON pricelist.rows(sheet_id, row_index);
CREATE INDEX idx_pricelist_rows_aio ON pricelist.rows(aio_product_id);
CREATE INDEX idx_pricelist_rows_status ON pricelist.rows(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_pricelist_data_gin ON pricelist.rows USING gin(data);

-- pg_trgm for fuzzy search
CREATE INDEX idx_pricelist_data_trgm ON pricelist.rows USING gin((data->>'name') gin_trgm_ops);

-- Sync queue
CREATE INDEX idx_sync_queue_status ON pricelist.sync_queue(status, queued_at);

-- Users
CREATE INDEX idx_users_username ON core.users(username) WHERE active = true;
CREATE INDEX idx_users_role ON core.users(role) WHERE active = true;
```

---

# 10. Data Volume Estimates

```
Phase 1 (Year 1):

core.users:                   30 rows
core.groups:                  ~14 rows (4 default + 10 custom max)
core.devices:                 ~100 rows (30 users × ~3 devices each)
core.audit_log (hot):         ~3M rows/year (~600 MB)
core.audit_log (warm):        ~1.5M rows/9months (.jsonl.gz)
core.audit_log (cold):        ~3M rows/2years (.jsonl.gz on NAS)

pricelist.categories:         ~10
pricelist.sheets:             ~64
pricelist.rows:               ~2,629
pricelist.bundles:            ~50
pricelist.bundle_rows:        ~200
pricelist.price_history:      ~50,000/year
pricelist.sync_queue:         ~100 at any time (transient)

Total DB size:                ~5-8 GB after Year 1
                              ~10-15 GB after Year 3 (with audit hot tier)
                              
NAS cold storage:             ~1.5 GB/year
```

---

# 11. Foreign Key Strategy

**Cross-Schema FK Rules:**

```
✅ ALLOWED FKs:
- Within same schema (pricelist.rows → pricelist.sheets)
- core.* referenced from anywhere (user_id, group_id, etc.)

❌ AVOID FKs:
- Between module schemas (don't FK from checkin.* to photo_report.*)
- Use UUID with soft references + cleanup workers

🔄 Cleanup Workers:
- Periodic check: orphaned rows
- Soft-delete cleanup: 30-day retention
```

**Example: Photo Report → Visit linkage**
```sql
-- AVOID:
ALTER TABLE photo_report.albums 
  ADD FOREIGN KEY (visit_id) REFERENCES checkin.visits(id);

-- PREFER:
-- Use UUID reference, no FK constraint
-- Periodic cleanup job verifies references
```

---

# 12. Schema Evolution Strategy

```
Each module has alembic/ migrations:
  
backend/modules/pricelist/migrations/
  20260512_001_initial.py
  20260601_002_add_top_selling_view.py
  ...

Rules:
✅ Backward-compatible changes (add column, add index)
⚠️ Breaking changes require versioned migration with downtime plan
❌ Cross-schema breaking changes need coordination across modules

Tools:
- Alembic for Python migrations
- Schema validation in CI/CD
- Migration tests before deployment
```

---

# 13. Backup Strategy

```
Daily Backups (Spark #1):
  - pg_dump --schema=core
  - pg_dump --schema=pricelist
  - pg_dump --schema=settings_hub
  - 3 daily rotations (oldest deleted)

Hourly Snapshots (Pricelist only):
  - WAL archives
  - 3 hourly rotations

Manual Snapshots:
  - Admin-triggered
  - 3 retained (oldest deleted)

PERMANENT:
  - Launch Day backup (immutable)
  - Cipher backup card (PDF + physical printed copy)
  - AIO field 1-4 INITIAL backup (before first write)

Off-NAS Backup (Quarterly):
  - Manual export to external drive
  - Stored offsite
```

---

**End of Database ERD v1.0**

| Version | Date | Notes |
|---|---|---|
| 1.0 | 2026-05-12 | Initial ERD covering all Phase 1 + Phase 3 schemas |
