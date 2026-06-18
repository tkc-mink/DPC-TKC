# 🖨️ PRD: TKC Print Out Extensions v1.0

| Field | Value |
|---|---|
| **Document Type** | Feature PRD (extends Pricelist Module) |
| **Version** | 1.0 |
| **Date** | 2026-05-12 |
| **Owner** | ชิบะน้อย (TKC AUTO PLUS) |
| **Status** | Design Locked — Phase 1 FULL Scope |
| **Parent** | 02_PRD_TKC_Pricelist_Module_v6.md |
| **Related** | 09_Database_ERD.md, 12_AIO_Sync_Queue_UX.md |

---

## 1. Overview

### 1.1 Purpose
ขยาย Pricelist Print system จาก basic print → ครบเครื่อง:
- **Multiple Views** ตาม role (B2C/B2B/Internal/Counter)
- **Versioning** ติดตาม version ที่ dealer ถือ
- **Selective Print** filter ก่อนพิมพ์
- **Distribution** ไม่ใช่แค่กระดาษ
- **Audit** ใครพิมพ์อะไรเมื่อไหร่
- **Customer Documents** ใบเสนอราคา/ใบส่งของ/ใบเสร็จ

### 1.2 Why FULL Scope Phase 1
- ป้องกัน cipher leak จากการพิมพ์ผิด role
- Dealer relations: ต้องรู้ version ที่ dealer ถือ
- Customer service: ใบเสนอราคาแยกจาก pricelist
- Audit compliance: ทุก print logged

### 1.3 Success Criteria
- ✅ 4 print views ทำงาน + ตรง role
- ✅ Version tracking + recall
- ✅ Filter ก่อนพิมพ์ได้
- ✅ Distribution ผ่าน LINE/email/NAS
- ✅ ทุก print audited
- ✅ Customer docs แยก print template

---

## 2. Multiple Print Views

### 2.1 View Matrix

| View | Audience | Columns Shown | Cipher | Hide |
|---|---|---|---|---|
| **B2C** | ลูกค้าปลายทาง | ขนาด, ยี่ห้อ, รุ่น, ราคาขายปลีก, DOT, รูป | ❌ | ทุน, B/A/S, Margin, s |
| **B2B Dealer** | Dealer/Shop | ขนาด, ยี่ห้อ, รุ่น, **B/A/S cipher**, DOT, รูป | ✅ #2 only | ทุน, ราคาขายปลีก, Margin |
| **Internal** | Admin internal use | ALL — ทุน, ราคาขาย, B/A/S, Margin, s, DOT | ✅ ทั้ง #1 #2 | (nothing) |
| **Counter** | พนักงานหน้าร้าน | ขนาด, ยี่ห้อ, รุ่น, ราคาขายปลีก, **CR price**, B/A/S cipher, DOT | ✅ #2 | ทุน, Margin |

### 2.2 Permission per View

```yaml
views:
  b2c:
    can_print: [Admin, B-Tire Sales, Counter]
    distribution: external_allowed
    
  b2b_dealer:
    can_print: [Admin, Dealer Sales]
    distribution: dealer_only
    watermark: "FOR DEALER USE ONLY"
    
  internal:
    can_print: [Admin]
    distribution: internal_only
    watermark: "CONFIDENTIAL — INTERNAL"
    track_each_copy: true
    
  counter:
    can_print: [Admin, Counter]
    distribution: counter_only
```

### 2.3 Print Layout per View

**B2C View:**
```
┌─────────────────────────────────────────────┐
│  ราคายาง [หมวด] — ลูกค้า                     │
│  ประจำวันที่ DD MMMM YYYY    [🚗 LOGO]      │
├─────────────────────────────────────────────┤
│ ขนาด │ ยี่ห้อ │ รุ่น │ ราคา │ DOT │ รูป     │
│ ...                                          │
├─────────────────────────────────────────────┤
│ 📞 TKC AUTO PLUS  www.giantwillow.com       │
│ Tel: 0xx-xxx-xxxx  Lat: 17.x  Lng: 102.x   │
└─────────────────────────────────────────────┘
```

**B2B Dealer View:**
```
┌─────────────────────────────────────────────┐
│  TKC Wholesale Pricelist                    │
│  Version: 2026-05-12.r3                     │
│  Valid: 2026-05-12 to 2026-05-19            │
│  [DEALER NAME]              [🚗 LOGO]       │
├─────────────────────────────────────────────┤
│ ขนาด │ ยี่ห้อ │ รุ่น │ B   │ A   │ S   │DOT│
│ ...                                          │
├─────────────────────────────────────────────┤
│  📋 Position Legend                          │
│  📦 Bundle Block                             │
│  💰 CR Tier (cipher #2)                      │
├─────────────────────────────────────────────┤
│  ⚠️ FOR DEALER USE ONLY                     │
│  Watermark: dealer name + date              │
└─────────────────────────────────────────────┘
```

**Internal View:** All columns + Margin + audit footer
**Counter View:** Like Dealer + ราคาขายปลีก + CR

---

## 3. Print Versioning

### 3.1 Version Lifecycle

```
DRAFT → PUBLISHED → ACTIVE → SUPERSEDED → OBSOLETE → RECALLED
```

### 3.2 Versioning Rules

```yaml
version_format: "YYYY-MM-DD.rN"
  YYYY-MM-DD: publish date
  rN: revision number that day (r1, r2, r3...)

example: "2026-05-12.r1"

When new version created:
  - Triggered manually OR auto on bulk price change
  - Auto-version increment
  - Generates checksum of data
  - Stamped on every print

When superseded:
  - Old version stays accessible
  - Marked "SUPERSEDED — see version X.X"
  - Can still print (with banner)

When recalled:
  - Recall reason recorded
  - All copies tracked → recall notice
  - Cannot print new copies
  - Recall notice auto-generated to all who got version
```

### 3.3 Data Tracking

```sql
-- Track which version each print copy is
CREATE TABLE pricelist.print_versions (
  id              UUID PRIMARY KEY,
  version_label   VARCHAR(50) UNIQUE,
  view_type       VARCHAR(20),
  data_checksum   VARCHAR(64),
  effective_from  TIMESTAMP,
  effective_until TIMESTAMP,
  status          VARCHAR(20),  -- draft/published/active/superseded/recalled
  recall_reason   TEXT,
  recalled_at     TIMESTAMP,
  recalled_by     UUID FK,
  published_by    UUID FK,
  published_at    TIMESTAMP
);

CREATE TABLE pricelist.print_copies (
  id              UUID PRIMARY KEY,
  version_id      UUID FK,
  printed_by      UUID FK,
  print_method    VARCHAR(20),  -- paper/pdf/email/line
  recipient_type  VARCHAR(20),  -- internal/dealer/customer
  recipient_id    UUID,
  recipient_name  VARCHAR(200),
  copy_count      INT DEFAULT 1,
  printed_at      TIMESTAMP,
  audit_event_id  UUID FK
);
```

### 3.4 Version Comparison

UI feature: pick 2 versions → see diff
- Products added/removed
- Prices changed (with old → new)
- Margin impact
- DOT updates

---

## 4. Selective / Filtered Print

### 4.1 Filter Options

```
ก่อนพิมพ์ admin เลือก:

[Categories]
  ☑ ยางเก๋ง
  ☐ ยางผ้าใบ
  ☐ น้ำมัน
  ☑ แบตเตอรี่

[Sheets within category]
  ☑ ยางเก๋ง-15
  ☐ ยางเก๋ง-16
  ☑ ยางเก๋ง-17

[Stock filter]
  ○ All items
  ● In-stock only (skip stock=0)
  ○ Out-of-stock only

[Date filter]
  ○ All items
  ● Changed in last [7] days
  ○ Custom date range

[Brand filter]
  ☐ Michelin / Bridgestone / Otani / ...

[Status filter]
  ☑ Normal (-)
  ☑ Need reorder (+)
  ☐ Clearance (C)
  ☑ Discount items

[Special]
  ☑ Include OEM items
  ☐ Sale items only
```

### 4.2 Filter Save / Templates

```
Save filter combinations as templates:
  - "Daily Counter Update"
  - "Monthly Dealer Full"
  - "Weekly Sale Items"
  - "OEM Only"

Quick-print buttons on dashboard:
  [📄 Daily Counter] [📦 Weekly Full] [⭐ OEM]
```

---

## 5. Distribution Methods

### 5.1 Methods Available

```yaml
methods:
  paper:
    description: "Direct print to office printer"
    cost: low
    audit: copy count
    
  pdf_download:
    description: "Download PDF locally"
    cost: 0
    audit: download event
    
  email:
    description: "Auto-email PDF to recipient(s)"
    cost: 0
    audit: send + delivery confirm
    requires: SMTP config
    
  line_share:
    description: "Send PDF via LINE OA (Phase 2)"
    cost: 0
    audit: send + read receipt
    requires: LINE Messaging API
    
  nas_share:
    description: "Upload to NAS shared folder"
    cost: 0
    audit: upload + access log
    folder: /volume1/tkc/pricelists/{view}/{date}.pdf
    
  cloudflare_link:
    description: "Generate share link (Cloudflare R2)"
    cost: 0
    audit: link clicks + expiry
    requires: domain setup
```

### 5.2 Auto-Distribution

```yaml
schedules:
  daily_internal_print:
    time: "06:00"
    view: internal
    method: paper
    copies: 1
    recipients: [counter_printer]
    enabled: true
    
  weekly_dealer_email:
    time: "Monday 08:00"
    view: b2b_dealer
    method: email
    recipients: dealer_distribution_list
    template: weekly_dealer
    enabled: false (Phase 2 after SMTP)
    
  monthly_dealer_summary:
    time: "1st 09:00"
    method: line_share (Phase 2)
```

### 5.3 Dealer Subscriptions

```
Dealer can subscribe to:
  ☑ Daily price changes
  ☑ Weekly full pricelist
  ☐ Sale announcements
  ☐ New product launches
  
Delivery channels:
  📧 Email: dealer@example.com
  📱 LINE: @dealer_line (Phase 2)
```

---

## 6. Print Audit & Compliance

### 6.1 What's Logged

```yaml
per_print_event:
  - timestamp
  - printed_by_user
  - print_method (paper/pdf/email/line/nas)
  - view_type (b2c/b2b/internal/counter)
  - version_label
  - copy_count
  - recipient (if external)
  - filter_applied (JSON)
  - file_checksum (PDF)
  - file_path (if stored)
  - distribution_status (sent/failed/delivered/read)
```

### 6.2 Audit Severity

```yaml
🔴 Critical:
  - Internal view printed externally
  - Cipher-cleartext leak suspected
  - Recall-required event

🟡 Warning:
  - Print >50 copies at once
  - Print outside office hours
  - Dealer print to non-subscribed email

🟢 Info:
  - Normal daily prints
  - Authorized distribution
```

### 6.3 Print Footer Standard

ทุก print (ยกเว้น B2C ที่ลูกค้าเห็น):

```
─────────────────────────────────────────────
Document ID: PR-2026-05-12-001234
Version: 2026-05-12.r3
Printed by: ชิบะน้อย at 14:30 on 2026-05-12
Recipient: Dealer ABC Co., Ltd.
Watermark: [DEALER NAME] - [DATE]
─────────────────────────────────────────────
```

---

## 7. Customer Documents

### 7.1 Document Types

```yaml
types:
  quotation:
    name: "ใบเสนอราคา"
    use: ส่งให้ลูกค้า before order
    fields: 
      - customer_info
      - items + qty + price
      - subtotal + VAT (if applicable)
      - validity (default 7 days)
      - terms_conditions
      - sales_person_signature
    output: PDF + LINE share + print
    
  delivery_note:
    name: "ใบส่งของ"
    use: เมื่อส่งของ
    fields:
      - customer_info
      - items shipped
      - delivery_date
      - signature_received
    output: PDF + print
    
  receipt:
    name: "ใบเสร็จรับเงิน"
    use: หลังลูกค้าจ่ายเงิน
    fields:
      - receipt_number (sequential)
      - customer_info
      - items + amount paid
      - VAT calculation
      - payment_method
    output: PDF + print + (Phase 2: thermal printer 80mm)
    
  certificate:
    name: "หนังสือรับรองราคา"
    use: เพื่อ proof of price for tender
    fields:
      - certificate_number
      - customer/agency name
      - items + price guaranteed
      - validity_period
      - signature
    output: PDF + print
```

### 7.2 Templates

```yaml
template_engine: Jinja2 (server) + Puppeteer (PDF)

template_files:
  - quotation_b2c.html
  - quotation_b2b.html
  - delivery_note.html
  - receipt_a4.html
  - receipt_thermal_80mm.html (Phase 2)
  - certificate.html

customization:
  - Logo position
  - Color scheme
  - Footer text
  - Terms/conditions block
  - Watermarks
```

### 7.3 Numbering

```yaml
quotation:        QT-YYYYMMDD-NNNNN
delivery_note:    DN-YYYYMMDD-NNNNN
receipt:          RC-YYYYMMDD-NNNNN
certificate:      CT-YYYYMMDD-NNNNN

sequence: per document type, per day
reset: daily at 00:00
sequence_table: pricelist.document_sequences
```

---

## 8. Print Quality Controls

```yaml
options_per_print:
  paper_size:
    - A4 (default)
    - A3 (large format)
    - A5 (compact)
    - 80mm thermal (Phase 2, receipts)
    
  orientation:
    - portrait (default)
    - landscape (data-heavy views)
    
  margins:
    - normal (15mm)
    - narrow (8mm)
    - wide (25mm)
    
  font_size:
    - small (8pt)
    - normal (10pt)
    - large (12pt)
    
  color_mode:
    - color (default)
    - black_white (save toner)
    
  watermark:
    - none
    - draft
    - confidential
    - custom_text
    
  copies:
    range: 1-100
    
  collated: yes/no
```

---

## 9. UI/UX

### 9.1 Print Dashboard (Admin)

```
┌────────────────────────────────────────────┐
│ 🖨️ Print Center                            │
├────────────────────────────────────────────┤
│                                              │
│ Quick Actions:                              │
│ [📄 Daily Counter] [📦 Weekly Dealer]      │
│ [💼 Internal Full] [⭐ OEM Only]           │
│                                              │
│ Versions:                                   │
│ Current: 2026-05-12.r3 [📋 Manage]         │
│ Active versions: 4    [📊 History]          │
│                                              │
│ Distribution:                               │
│ Today: 12 prints   This week: 47           │
│ Pending: 0 schedule items                   │
│                                              │
│ [➕ New Custom Print]                       │
│ [📈 Audit Log] [⚙️ Settings]               │
└────────────────────────────────────────────┘
```

### 9.2 Print Wizard (Multi-Step)

```
Step 1: View Type
  ○ B2C / ○ B2B Dealer / ○ Internal / ○ Counter

Step 2: Filters
  Categories, Sheets, Stock, Brand, Status

Step 3: Distribution
  ☑ Print paper / ☐ Email / ☐ LINE / ☐ NAS / ☐ Download

Step 4: Quality
  Paper, orientation, copies, watermark

Step 5: Recipients (if external distribution)
  Email list / LINE subscribers / NAS path

Step 6: Preview
  PDF render → review → confirm

Step 7: Execute
  Audit log + distribution + version stamp
```

### 9.3 Quote Generation (Customer)

```
From Pricelist Viewer → Select items → "Generate Quote"

Customer Info:
  Name: [_______________]
  Tel: [_______________]
  Email: [_______________] (optional)
  Address: [_______________] (optional)

Items: (auto from selection)
  • 215/70R15 OT MK2000 × 4 = ฿7,800
  
Discount: [฿___] (optional, admin only)
VAT: ☑ Include / ☐ Exclude
Notes: [_______________]
Validity: [7] days

[Preview] [Print] [PDF] [LINE Share (P2)] [Email (P2)]
```

---

## 10. Data Model (Additions to PRD 09)

```sql
-- Print versions
CREATE TABLE pricelist.print_versions (
  id              UUID PRIMARY KEY,
  version_label   VARCHAR(50) UNIQUE,
  view_type       VARCHAR(20),
  data_checksum   VARCHAR(64),
  effective_from  TIMESTAMP,
  effective_until TIMESTAMP,
  status          VARCHAR(20),
  recall_reason   TEXT,
  recalled_at     TIMESTAMP,
  recalled_by     UUID REFERENCES core.users(id),
  published_by    UUID REFERENCES core.users(id),
  published_at    TIMESTAMP DEFAULT NOW()
);

-- Print copies (audit)
CREATE TABLE pricelist.print_copies (
  id              UUID PRIMARY KEY,
  version_id      UUID REFERENCES pricelist.print_versions(id),
  printed_by      UUID REFERENCES core.users(id),
  print_method    VARCHAR(20),  -- paper/pdf/email/line/nas
  view_type       VARCHAR(20),
  recipient_type  VARCHAR(20),  -- internal/dealer/customer
  recipient_id    UUID,
  recipient_name  VARCHAR(200),
  recipient_email VARCHAR(200),
  copy_count      INT DEFAULT 1,
  filter_applied  JSONB,
  file_checksum   VARCHAR(64),
  file_path       TEXT,
  delivery_status VARCHAR(20),
  printed_at      TIMESTAMP DEFAULT NOW(),
  audit_event_id  UUID REFERENCES core.audit_log(id)
);

-- Print templates
CREATE TABLE pricelist.print_templates (
  id              UUID PRIMARY KEY,
  name            VARCHAR(100),
  description     TEXT,
  view_type       VARCHAR(20),
  filters         JSONB,
  quality_options JSONB,
  is_default      BOOLEAN,
  created_by      UUID REFERENCES core.users(id),
  created_at      TIMESTAMP
);

-- Distribution schedules
CREATE TABLE pricelist.distribution_schedules (
  id              UUID PRIMARY KEY,
  name            VARCHAR(100),
  template_id     UUID REFERENCES pricelist.print_templates(id),
  cron_expression VARCHAR(50),
  distribution_method VARCHAR(20),
  recipients      JSONB,
  enabled         BOOLEAN,
  last_run_at     TIMESTAMP,
  next_run_at     TIMESTAMP,
  created_by      UUID REFERENCES core.users(id)
);

-- Customer documents
CREATE TABLE pricelist.customer_documents (
  id              UUID PRIMARY KEY,
  document_type   VARCHAR(20),  -- quotation/delivery_note/receipt/certificate
  document_number VARCHAR(50) UNIQUE,
  customer_id     UUID,
  customer_name   VARCHAR(200),
  customer_tel    VARCHAR(50),
  customer_email  VARCHAR(200),
  customer_address TEXT,
  items           JSONB,
  subtotal        NUMERIC,
  vat_included    BOOLEAN,
  vat_amount      NUMERIC,
  total           NUMERIC,
  validity_days   INT,
  valid_until     TIMESTAMP,
  notes           TEXT,
  created_by      UUID REFERENCES core.users(id),
  created_at      TIMESTAMP DEFAULT NOW(),
  pdf_path        TEXT,
  status          VARCHAR(20)  -- draft/sent/paid/cancelled
);

-- Document number sequences
CREATE TABLE pricelist.document_sequences (
  document_type   VARCHAR(20),
  date_part       VARCHAR(10),  -- YYYYMMDD
  last_number     INT,
  PRIMARY KEY (document_type, date_part)
);

-- Dealer distribution subscriptions
CREATE TABLE pricelist.dealer_subscriptions (
  id              UUID PRIMARY KEY,
  dealer_id       UUID,
  dealer_name     VARCHAR(200),
  email           VARCHAR(200),
  line_user_id    VARCHAR(100),  -- Phase 2
  subscription_types TEXT[],
  active          BOOLEAN,
  created_at      TIMESTAMP
);

CREATE INDEX idx_print_copies_version ON pricelist.print_copies(version_id);
CREATE INDEX idx_print_copies_printed_at ON pricelist.print_copies(printed_at DESC);
CREATE INDEX idx_customer_docs_type_date ON pricelist.customer_documents(document_type, created_at DESC);
CREATE INDEX idx_customer_docs_number ON pricelist.customer_documents(document_number);
```

---

## 11. API Endpoints

```
# Print Versions
GET    /api/pricelist/print/versions
GET    /api/pricelist/print/versions/:id
POST   /api/pricelist/print/versions/publish
POST   /api/pricelist/print/versions/:id/supersede
POST   /api/pricelist/print/versions/:id/recall

# Print Execution
POST   /api/pricelist/print/preview
       Body: { view_type, filters, quality_options }
POST   /api/pricelist/print/execute
       Body: { view_type, filters, distribution, recipients }
GET    /api/pricelist/print/status/:job_id

# Templates
GET    /api/pricelist/print/templates
POST   /api/pricelist/print/templates
PUT    /api/pricelist/print/templates/:id
DELETE /api/pricelist/print/templates/:id

# Scheduled Distribution
GET    /api/pricelist/print/schedules
POST   /api/pricelist/print/schedules
PUT    /api/pricelist/print/schedules/:id
DELETE /api/pricelist/print/schedules/:id

# Print Audit
GET    /api/pricelist/print/copies
       Query: ?version=...&date_from=...&recipient=...
GET    /api/pricelist/print/copies/:id

# Customer Documents
POST   /api/pricelist/documents/quotation
POST   /api/pricelist/documents/delivery-note
POST   /api/pricelist/documents/receipt
POST   /api/pricelist/documents/certificate
GET    /api/pricelist/documents
GET    /api/pricelist/documents/:id
GET    /api/pricelist/documents/:id/pdf

# Dealer Subscriptions
GET    /api/pricelist/dealers/subscriptions
POST   /api/pricelist/dealers/subscriptions
PUT    /api/pricelist/dealers/subscriptions/:id
DELETE /api/pricelist/dealers/subscriptions/:id
```

---

## 12. Sub-Phase Breakdown (Phase 1)

```
Phase 1 Print extends Pricelist module timeline:

Week 19 (originally "Print + Schedule + Restore"):
  → Becomes 3 weeks expanded
  
Week 19-21 (NEW): Print Extensions

W19 — Multiple Views + Versioning
  - 4 view templates (B2C/B2B/Internal/Counter)
  - Version lifecycle (DRAFT → ACTIVE)
  - Version comparison UI
  - Watermarking
  
W20 — Selective Print + Templates
  - Filter system
  - Save template
  - Quick-print buttons
  - Preview before print
  
W21 — Distribution + Audit
  - PDF download
  - Email auto-send (require SMTP)
  - NAS share folder
  - Print audit log
  - Print copy tracking
  
W21 also: Customer Documents
  - Quotation (priority — sales daily use)
  - Delivery note (medium)
  - Receipt (medium — Phase 2 thermal printer)
  - Certificate (low — admin only)
```

**Note:** LINE share → Phase 2 (after LINE OA Bot integration)

---

## 13. Open Questions

```
🟡 Need decision before W19:
- [ ] SMTP server for email distribution (Gmail SMTP? Self-hosted?)
- [ ] Email FROM address (no-reply@giantwillow.com?)
- [ ] Document numbering reset cadence (daily? monthly? yearly?)
- [ ] VAT default (Include / Exclude)
- [ ] Sales person signature image upload required?

🟢 Can decide during W19-21:
- [ ] Watermark text/font/position
- [ ] Print speed expectation
- [ ] Receipt thermal printer model (Phase 2)
- [ ] Quote PDF design specifics

⏸️ Deferred to Phase 2:
- LINE share method (depends on LINE OA Bot)
- Thermal printer 80mm support
- Receipt printing direct
```

---

## 14. Permissions Matrix

| Action | Admin | B-Tire | Dealer | Counter | ลูกค้า |
|---|---|---|---|---|---|
| Print B2C view | ✅ | ✅ | ❌ | ✅ | ❌ |
| Print B2B Dealer | ✅ | ❌ | ✅ | ❌ | ❌ |
| Print Internal | ✅ | ❌ | ❌ | ❌ | ❌ |
| Print Counter | ✅ | ❌ | ❌ | ✅ | ❌ |
| Manage versions | ✅ | ❌ | ❌ | ❌ | ❌ |
| Recall version | ✅ | ❌ | ❌ | ❌ | ❌ |
| Save print templates | ✅ | ❌ | ❌ | ❌ | ❌ |
| Use print templates | ✅ | ✅ | ✅ | ✅ | ❌ |
| Schedule distribution | ✅ | ❌ | ❌ | ❌ | ❌ |
| View audit log | ✅ | View own | View own | ❌ | ❌ |
| Generate Quotation | ✅ | ✅ | ✅ | ✅ | ❌ |
| Generate Delivery Note | ✅ | ✅ | ✅ | ✅ | ❌ |
| Generate Receipt | ✅ | ❌ | ❌ | ✅ | ❌ |
| Generate Certificate | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## 15. Tech Stack Additions

```yaml
PDF Generation:
  - Puppeteer (Node.js) on backend
  - HTML/CSS templates via Jinja2
  - Embedded fonts (Sarabun for Thai)

Email:
  - SMTP via aiosmtplib
  - HTML email templates
  - Attachment support (PDF)
  - Delivery tracking via response codes

Storage:
  - PDFs cached on Spark #1 SSD (7 days)
  - Long-term in NAS /volume1/tkc/print-archive/
  
Compression:
  - PDF compression for email (target <2MB)
  - Image optimization (WebP fallback to PNG)
```

---

## 16. Performance Targets

| Operation | Target |
|---|---|
| PDF render single page | < 2s |
| PDF render 50 pages | < 30s |
| Email send | < 5s per recipient |
| Bulk distribution (100 dealers) | < 5 min |
| Print template save | < 500ms |
| Version comparison render | < 3s |
| Quote generation + PDF | < 5s |

---

## 17. Security Considerations

```yaml
internal_view_print:
  - Audit + Telegram alert immediately
  - Watermark with printer's name
  - Limit to office IP
  - Max 1 copy per print job (force admin to print multiple times)

external_distribution:
  - Validate recipient email in approved list
  - Rate limit (max 50 emails/hour)
  - Bounce handling
  - Unsubscribe mechanism

customer_documents:
  - Sequential numbering enforced (no skips)
  - Cannot delete (only cancel)
  - Audit trail per document
  - Digital signature option (Phase 2)
```

---

**End of Print Out Extensions PRD v1.0**

| Version | Date | Notes |
|---|---|---|
| 1.0 | 2026-05-12 | Phase 1 FULL scope — comprehensive design |
