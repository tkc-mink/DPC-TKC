# PRD: Phase 3 Modules — Brief Designs

Three Phase 3 Module briefs in one document:
1. Check-in Module
2. Photo Report Module
3. Voice Report Module

---
---

# PRD: TKC Check-in Module v1.0 (Brief)

| Field | Value |
|---|---|
| **Module Code** | `checkin` |
| **API Prefix** | `/api/checkin` |
| **UI Path** | `/checkin` |
| **Status** | Brief Design (Detail in Phase 3 kickoff) |
| **Parent** | PRD_TKC_SuperApp_v2.md |

---

## 1. Purpose
Sales reps (เซลล์ที่ออกนอกสถานที่) บันทึก visit ที่ร้านลูกค้า:
- เช็คอิน / เช็คเอาท์ พร้อม GPS
- บันทึก visit duration
- เชื่อม Photo Report + Voice Report
- Route history

## 2. Tech Strategy

### Web-First (PWA)
- Geolocation API (browser native)
- Service Worker for offline
- Push notifications (iOS 16.4+)

### LINE/SMS GPS Fallback
- User: ส่ง location ผ่าน LINE bot
- LINE bot → parse → POST to /api/checkin/external-location
- หรือ SMS reply parsing

## 3. Core Features

### Check-in Flow
1. Open Check-in module
2. List of nearby customers (auto-detect from GPS)
3. Tap customer → "Check-in"
4. GPS captured + timestamp
5. Status: "At customer"
6. (Optional) Add Photo Report
7. (Optional) Add Voice Report
8. Tap "Check-out" when leaving
9. Visit complete + duration calculated

### Customer Locations Database
- Customer = ร้านค้าที่เซลล์ไปเยี่ยม
- Stored with: name, address, GPS, phone, contact
- Admin manages
- Auto-add new customers from check-ins

### Route History
- Daily route view (map + timeline)
- Total distance + time
- Export to PDF

### Manager Dashboard
- Real-time team locations
- Map View + Timeline View

### Geofencing (Phase 3+)
- Auto-notify on enter/exit
- Alerts for missed visits

## 4. Permissions

| Group | Access |
|---|---|
| Admin | Full (all reps' data) |
| 🛞 B-Tire Sales | Write own visits |
| 🏪 Dealer Sales | Write own visits |
| Manager (custom) | Read team visits |
| Counter | None |

## 5. Integration

- Photo Report: Within visit → "📷 Add Photo"
- Voice Report: Within visit → "🎙️ Voice Report"
- Cross-link via Visit ID

## 6. Data Model (Brief)

```sql
CREATE SCHEMA checkin;

CREATE TABLE checkin.customers (
  id, name, address, latitude, longitude,
  phone, contact_name, category, created_at
);

CREATE TABLE checkin.visits (
  id, user_id, customer_id,
  check_in_at, check_in_lat/lng,
  check_out_at, check_out_lat/lng,
  duration_min, notes,
  photo_album_id, voice_report_id, status
);

CREATE TABLE checkin.route_points (
  id, user_id, recorded_at,
  latitude, longitude, accuracy
);

CREATE TABLE checkin.geofences (...);
```

## 7. API Endpoints (Brief)

```
GET    /api/checkin/customers
POST   /api/checkin/customers (admin)
GET    /api/checkin/customers/nearby?lat=...&lng=...

POST   /api/checkin/visits/check-in
POST   /api/checkin/visits/:id/check-out
GET    /api/checkin/visits[/:id]

GET    /api/checkin/route/today
GET    /api/checkin/team/locations (manager)

# LINE/SMS
POST   /api/checkin/external-location
```

## 8. Open Questions

- [ ] Customer DB source — sync from AIO or independent?
- [ ] GPS tracking interval
- [ ] Battery impact concern
- [ ] Offline check-in queue
- [ ] Privacy concerns
- [ ] LINE bot setup

---
---

# PRD: TKC Photo Report Module v1.0 (Brief)

| Field | Value |
|---|---|
| **Module Code** | `photo_report` |
| **API Prefix** | `/api/photo-report` |
| **UI Path** | `/photo-report` |
| **Status** | Brief Design |

---

## 1. Overview
ถ่ายรูปรายงานหน้างาน — เซลล์ออกร้านลูกค้าถ่ายรูป + caption + auto-tag

## 2. Core Features

### Take Photo
- Camera API (MediaDevices.getUserMedia)
- Multiple photos per session
- Auto-watermark: timestamp + GPS + sales name
- Caption per photo
- Album linked to visit

### Album Organization
- Per visit (linked to Check-in)
- Per customer (across visits)
- Personal albums
- Tags: Product, Issue, Before/After, Custom

### Upload & Compression
- Client-side: <500KB per photo, max 1920px
- Strip EXIF (except GPS)
- Background queue (offline)
- Resume on connection

### Search
- By location/customer/date/tag
- AI image classification (Phase 4)

### Manager Features
- Review queue (approve / reject)
- Comments per photo
- Bulk download
- Export to PDF report

## 3. Storage

- Hot (Spark #1 SSD): last 30 days
- Cold (NAS): older + archive
- Thumbnails: always cached

## 4. Data Model (Brief)

```sql
CREATE SCHEMA photo_report;

CREATE TABLE photo_report.albums (
  id, user_id, visit_id, customer_id, name, created_at
);

CREATE TABLE photo_report.photos (
  id, album_id, file_id, thumbnail_id,
  caption, taken_at, taken_lat/lng,
  tags, status
);

CREATE TABLE photo_report.album_tags (...);
```

## 5. Permissions

| Group | Access |
|---|---|
| Admin | Full |
| Sales | Write own + view team if manager |
| Counter | None |

## 6. Open Questions

- [ ] Photo retention policy
- [ ] AI auto-tagging (Phase 4)
- [ ] Compression target detail
- [ ] Manager review workflow

---
---

# PRD: TKC Voice Report Module v1.0 (Brief)

| Field | Value |
|---|---|
| **Module Code** | `voice_report` |
| **API Prefix** | `/api/voice-report` |
| **UI Path** | `/voice-report` |
| **Status** | Brief Design |

---

## 1. Overview
เซลล์พูดรายงาน → ระบบแปลงเป็น text → daily summary ปลายวัน

### Workflow

```
Sales leaves a customer
   ↓
Open Voice Report → tap record
   ↓
Speak: "ร้านสมจิตร วันนี้สั่งยาง 245/45R19 4 เส้น 
        ลูกค้าบ่นเรื่องราคา..."
   ↓
Stop → upload to backend
   ↓
Backend → Google Speech-to-Text (Thai)
   ↓
Get transcript → save + link to visit
   ↓
End of day (18:00 default):
   System aggregates all voice reports
   → daily summary
   → send Telegram + in-app
   ↓
Sales reviews + edits + submits final
```

### Why Voice
- เร็วกว่าพิมพ์ (50%+ time saved)
- มือว่าง ใส่ขณะขับรถ
- ภาษาธรรมชาติ
- กระตุ้นให้บันทึก (กดเร็ว)

## 2. Core Features

### Recording
- Tap & hold or tap to start/stop
- Audio format: WebM Opus (PWA) or M4A (Capacitor)
- Max length: 5 min per recording
- Multiple recordings per visit

### Transcription
- Backend: Google Speech-to-Text (Thai)
- Speaker diarization (Phase 4)
- User can edit / re-transcribe / manually type

### Daily Summary
- At 18:00 (configurable)
- Aggregate all voice reports + photos + check-ins
- Generate summary text
- Send to user via Telegram + in-app
- User reviews + edits + submits final

### Search
- Full-text search on transcript
- By customer/date/keyword

## 3. Tech Stack

### Web Speech API (browser)
- Real-time speech-to-text (no upload)
- Limited accuracy for Thai
- Free

### Google Cloud Speech-to-Text
- High accuracy Thai
- Paid (~$0.024/min)
- Primary

### Strategy
- Web Speech for quick notes (free)
- Google STT for important reports (accurate)
- User selects mode

## 4. Data Model (Brief)

```sql
CREATE SCHEMA voice_report;

CREATE TABLE voice_report.recordings (
  id, user_id, visit_id, audio_file_id,
  duration_sec, transcript, transcript_status,
  language, recorded_at, transcribed_at
);

CREATE TABLE voice_report.daily_summaries (
  id, user_id, date, summary_text,
  recording_ids, visit_ids, photo_album_ids,
  status, generated_at, submitted_at
);

CREATE INDEX idx_transcript_fts ON voice_report.recordings 
  USING GIN (to_tsvector('thai', transcript));
```

## 5. API Endpoints (Brief)

```
POST   /api/voice-report/recordings (upload audio)
GET    /api/voice-report/recordings/:id
PUT    /api/voice-report/recordings/:id (edit transcript)

GET    /api/voice-report/daily-summary/:date
POST   /api/voice-report/daily-summary/:date/submit

GET    /api/voice-report/search?q=...
```

## 6. Permissions

| Group | Access |
|---|---|
| Admin | Full + review all |
| Sales | Write + view own |
| Manager | Read team |
| Counter | None |

## 7. Costs

```
Google STT: $0.024/min
Average: 5 sales × 4 reports × 2 min = 40 min/day = $0.96/day
Monthly: ~$30
Yearly: ~$360 (manageable)

Optimization:
- Web Speech for short notes (free)
- Google STT only when accuracy needed
```

## 8. Open Questions

- [ ] Audio file retention
- [ ] Transcript editing UI detail
- [ ] Daily summary AI prompt
- [ ] Voice file format (Opus / m4a)
- [ ] Manager visibility — full transcript or summary?

---

**End of Phase 3 Brief PRDs**

These briefs become full PRDs when Phase 3 kickoff approaches (3-6 months from now).
