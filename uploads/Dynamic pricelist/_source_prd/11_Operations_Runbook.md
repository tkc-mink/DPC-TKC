# 🛠️ TKC SuperApp — Operations Runbook

| Field | Value |
|---|---|
| **Document Type** | Operations Runbook |
| **Version** | 1.0 |
| **Date** | 2026-05-12 |
| **Owner** | ชิบะน้อย (TKC AUTO PLUS) |
| **Audience** | On-call engineers, Admin staff, IT support |
| **Update Cadence** | After each incident |

---

## How to Use This Runbook

```
1. Identify SYMPTOMS (what users report)
2. Find matching section in this document
3. Follow DIAGNOSIS steps (verify the issue)
4. Apply FIX (in order, stop when fixed)
5. ESCALATE if all steps fail
6. POST-INCIDENT: document + update runbook
```

---

## Severity Levels

| Level | Response Time | Examples |
|---|---|---|
| 🔴 P0 (Critical) | < 15 min | Total system down, data corruption, security breach |
| 🟡 P1 (High) | < 1 hour | Module down, sync stuck >30 min, login failures spike |
| 🟢 P2 (Medium) | < 4 hours | Slow performance, partial features broken |
| ⚪ P3 (Low) | Next business day | Individual user issues, cosmetic bugs |

---

## On-Call Contact Tree

```
🚨 P0 / P1 Incident:
  ↓
1. On-call engineer (rotation)
  ↓ (if no response 15 min)
2. ชิบะน้อย (owner)
  ↓ (if no response 30 min)
3. Senior dev / backup contact

📞 Communication:
  - Telegram group: TKC-AlertOps
  - Phone: as defined in user_telegram_chat_id
```

---

## Table of Contents

### 🔴 Critical Incidents (P0)
1. AIO Sync Total Failure
2. PostgreSQL Down
3. All Users Cannot Login
4. Cipher Key Compromise Suspected
5. NAS Unreachable + Audit Stuck
6. Spark #1 Hardware Failure
7. Data Corruption Detected

### 🟡 Warning Incidents (P1)
8. AIO Sync Partial Failure
9. Telegram Bot Not Responding
10. WebSocket Mass Disconnects
11. Disk Space Critical (<10%)
12. Search Performance Degraded
13. Migration Session Corrupted

### 🟢 Routine Procedures (P2)
14. Weekly Backup Verification
15. Cipher Backup Card Reprint
16. Add New User
17. Add New Device to Whitelist
18. Restore from Snapshot
19. Schedule Price Change
20. Rotate AI Agent Keys
21. Audit Log Archive Verification

---

# 🔴 CRITICAL INCIDENTS (P0)

---

## Incident 1: AIO Sync Total Failure

### 🚨 SYMPTOMS
- Telegram alert: "Sync failed >5 min"
- Dashboard: Yellow then red card "Queue: 50+ pending"
- Sales report: prices/stock not updating
- Multiple users seeing same outdated data

### 🔍 DIAGNOSIS

```bash
# 1. SSH to Spark #1
ssh tkc@spark1

# 2. Check sync service status
docker ps | grep tkc-sync
docker logs tkc-sync --tail 100

# 3. Test AIO connectivity
ping aio-server.tkc.local
nc -zv aio-server.tkc.local 3306

# 4. Test MySQL connection
docker exec tkc-sync python -c "
import mysql.connector
conn = mysql.connector.connect(
  host='aio-server.tkc.local',
  user='tkc_sync',
  password='$AIO_PASSWORD',
  database='aio'
)
print('Connected:', conn.is_connected())
"

# 5. Check queue status
curl -s localhost:8000/api/pricelist/sync/queue | jq
```

### ⚙️ FIX (Try in order)

**Step 1: If sync service crashed**
```bash
docker restart tkc-sync
sleep 10
docker logs tkc-sync --tail 50
# ✅ Look for: "Sync service started, connected to AIO"
```

**Step 2: If AIO server unreachable**
```bash
# Check network
ip route
ping aio-server.tkc.local

# If DNS issue:
cat /etc/hosts | grep aio
# Add: 192.168.1.x aio-server.tkc.local

# Wait + retry — sync will auto-resume
```

**Step 3: If MySQL connection refused**
```bash
# Contact AIO admin to check MySQL service
# Verify credentials:
docker exec tkc-sync cat /app/.env | grep AIO

# Test direct mysql client:
docker exec tkc-sync mysql -h aio-server -u tkc_sync -p
```

**Step 4: If sync queue stuck**
```bash
# Manual flush (use with caution):
curl -X POST localhost:8000/api/pricelist/sync/queue/flush \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Or pause sync if AIO instability:
curl -X POST localhost:8000/api/pricelist/sync/pause \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### 🚀 ESCALATION

```
After 30 min unresolved:
  → Contact ชิบะน้อย
  
After 2 hours unresolved:
  → Contact AIO vendor support
  → Activate degraded mode (pricelist read-only with cached data)
```

### ✅ POST-INCIDENT

```
1. Document in audit log:
   - Incident time + duration
   - Root cause
   - Fix applied
2. Update this runbook if new symptom found
3. Add monitoring if issue likely to recur
4. Review with team in next sync meeting
```

---

## Incident 2: PostgreSQL Down

### 🚨 SYMPTOMS
- All users see "500 Internal Server Error"
- Application logs: "connection refused" to postgres
- Dashboard inaccessible
- No real-time updates

### 🔍 DIAGNOSIS

```bash
# 1. Check container
docker ps -a | grep postgres
docker logs tkc-postgres --tail 100

# 2. Check disk space
df -h
# Look for /var/lib/docker (might be full)

# 3. Check memory
free -h

# 4. Check postgres directly
docker exec tkc-postgres psql -U postgres -c "SELECT 1;"
```

### ⚙️ FIX

**Step 1: Restart container**
```bash
docker restart tkc-postgres
sleep 30
docker logs tkc-postgres --tail 50
# ✅ Look for: "database system is ready to accept connections"
```

**Step 2: If out of disk space**
```bash
# Find what's filling disk
du -sh /var/lib/docker/volumes/* | sort -h

# Clear audit log temp files if any
find /tmp/audit-export -mtime +1 -delete

# Vacuum DB
docker exec tkc-postgres psql -U postgres tkc -c "VACUUM FULL;"
```

**Step 3: If corruption suspected**
```bash
# Check integrity
docker exec tkc-postgres pg_dump -U postgres tkc > /tmp/test_dump.sql
# If dump fails → corruption

# Restore from latest backup
ls -lh /var/backups/postgres/
# Use most recent good backup
docker exec tkc-postgres pg_restore -U postgres -d tkc /backups/postgres-LATEST.dump
```

### 🚀 ESCALATION

```
After 15 min:
  → ชิบะน้อย immediate notification
  → Activate read-only fallback if available

After 1 hour:
  → Full restore from backup
  → Communicate downtime to all users via Telegram
```

### ✅ POST-INCIDENT

```
- Verify all modules functional
- Check audit log gaps (events lost during outage)
- Review backup integrity
- Schedule postmortem
```

---

## Incident 3: All Users Cannot Login

### 🚨 SYMPTOMS
- Users report: "Invalid credentials" for valid passwords
- Login API returns 500 or hangs
- New users cannot be created

### 🔍 DIAGNOSIS

```bash
# 1. Test auth endpoint
curl -X POST localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"chibanoi","password":"TEST_PASSWORD"}'

# 2. Check backend logs
docker logs tkc-backend --tail 200 | grep -i auth

# 3. Check Redis (sessions/locks)
docker exec tkc-redis redis-cli ping

# 4. Check JWT secret
docker exec tkc-backend env | grep JWT_SECRET
# ⚠️ Don't expose if logged
```

### ⚙️ FIX

**Step 1: If Redis down**
```bash
docker restart tkc-redis
# Lockouts may reset — users can retry
```

**Step 2: If JWT secret missing**
```bash
# Check env file
docker exec tkc-backend ls -la /app/.env

# Restart with proper env
docker compose restart tkc-backend
```

**Step 3: If DB connection issue**
```bash
# Check core.users accessible
docker exec tkc-postgres psql -U postgres tkc -c "SELECT COUNT(*) FROM core.users WHERE active=true;"

# If 0 users → emergency admin creation (last resort)
```

**Step 4: If mass lockout**
```bash
# Clear lockouts in Redis
docker exec tkc-redis redis-cli FLUSHDB
# ⚠️ This invalidates active sessions too
```

### 🚀 ESCALATION

```
Immediate: ชิบะน้อย contacted
Emergency admin can use offline credentials:
  Hardcoded backdoor account in .env (emergency only, audited)
```

### ✅ POST-INCIDENT

```
- Document affected users count
- Verify session integrity
- Check for security incident (was it intentional?)
- Audit log entries during outage
```

---

## Incident 4: Cipher Key Compromise Suspected

### 🚨 SYMPTOMS
- Competitor mentioning specific prices
- Unusual cipher view audit entries
- Anonymous tip about price leak
- Departed employee with admin access

### 🔍 DIAGNOSIS

```bash
# 1. Check recent cipher views in audit
docker exec tkc-postgres psql -U postgres tkc -c "
SELECT occurred_at, user_name_snapshot, ip_address, device_name_snapshot
FROM core.audit_log
WHERE action = 'cipher_view' OR action = 'cipher_setup'
ORDER BY occurred_at DESC
LIMIT 50;
"

# 2. Check unusual access patterns
# Look for: off-hours, external IPs, mass exports

# 3. Check who has admin access
# Active admins list
```

### ⚙️ FIX (RESPONSE PROTOCOL)

**Phase 1: Containment (within 1 hour)**
```bash
# 1. Force logout ALL admin users
curl -X POST localhost:8000/api/admin/force-logout-all \
  -H "Authorization: Bearer $EMERGENCY_TOKEN"

# 2. Disable suspicious accounts
# Settings > Users > [suspicious] > Suspend

# 3. Snapshot audit log
docker exec tkc-postgres pg_dump -U postgres -t core.audit_log tkc \
  > /backups/incident-$(date +%Y%m%d_%H%M%S).sql
```

**Phase 2: Investigation (within 24 hours)**
```bash
# Review full audit log
# Look for: cipher views, exports, unusual queries
# Identify compromised accounts

# Check Telegram alert history
# Check device approval logs
```

**Phase 3: Recovery (within 48 hours)**
```bash
# Rotate cipher keys
# 1. Generate new cipher mappings
# 2. Update via Settings > Cipher > Change Cipher (with reason)
# 3. Re-encode displayed values (DB stores real numbers — no data change)
# 4. Print new backup cards
# 5. Destroy old backup cards (witnessed)

# Reset all admin passwords
# Re-issue new credentials in person/secure channel
```

### 🚀 ESCALATION

```
IMMEDIATE: ชิบะน้อย + legal advisor
DO NOT: Notify suspected leaker
DO NOT: Make public statement before investigation
```

### ✅ POST-INCIDENT

```
- Full forensic report
- Update security policies
- Add monitoring for similar patterns
- Consider 2FA for admin (Phase 2)
- Review who needs cipher access (least privilege)
- Train remaining staff on security
```

---

## Incident 5: NAS Unreachable + Audit Stuck

### 🚨 SYMPTOMS
- Telegram alert: "NAS offline >5 min"
- Audit cold tier queries fail
- Monthly archive job not completing
- Spark #1 SSD filling up (audit buffer)

### 🔍 DIAGNOSIS

```bash
# 1. Test NAS connectivity
ping nas.tkc.local
nc -zv nas.tkc.local 445  # SMB
ls /mnt/nas-audit/

# 2. Check mount
mount | grep nas
df -h /mnt/nas-audit

# 3. Check NAS Synology DSM
# Login to NAS web UI (192.168.1.50:5000)

# 4. Check buffer accumulation
ls -lh /var/audit/buffer/
du -sh /var/audit/buffer/
```

### ⚙️ FIX

**Step 1: If NAS responsive but mount failed**
```bash
sudo umount /mnt/nas-audit
sudo mount -a
ls /mnt/nas-audit/  # Verify
```

**Step 2: If NAS web UI inaccessible**
```bash
# NAS might be restarting
# Wait 5 minutes, check again
# If still down: physical access needed
```

**Step 3: If buffer accumulating**
```bash
# Verify backup capacity remaining
df -h /
# Should be >20% free for safety

# If <20%, alert + buy time:
# Pause non-critical audit logging
# Edit config: log only warning+ severity
```

**Step 4: After NAS restored**
```bash
# Process buffered files
docker exec tkc-backend python -m scripts.process_audit_buffer
# Verify all archived correctly
```

### 🚀 ESCALATION

```
After 30 min: ชิบะน้อย contacted
After 2 hours + buffer >10 GB: Emergency cold storage on Spark #1
After 24 hours: Manual NAS investigation (physical)
```

### ✅ POST-INCIDENT

```
- Verify all audit entries archived (no data loss)
- Re-run health check
- Check NAS hardware logs
- Plan: external backup of cold storage
```

---

## Incident 6: Spark #1 Hardware Failure

### 🚨 SYMPTOMS
- Spark #1 unreachable
- All services down
- Cannot SSH
- Physical inspection: error LEDs

### 🔍 DIAGNOSIS

```
1. Physical check:
   - Power LED status
   - Network LED activity
   - Display console output (if attached)

2. Network check:
   - Can ping from another LAN device?
   - Other Sparks reachable?

3. Console (if possible):
   - Connect monitor/keyboard
   - Boot logs
```

### ⚙️ FIX

**Step 1: Soft recovery**
```
- Power cycle Spark #1 (button hold 10s)
- Wait full boot cycle (~2 min)
- Try SSH
```

**Step 2: If failed boot**
```
- Boot to recovery mode (NVIDIA recovery)
- Check filesystem integrity
- Restore from last known good backup
```

**Step 3: Failover to backup**
```
- IF backup Spark available (Spark #2 standby):
  - Restore DB to Spark #2
  - Update DNS: app.tkc.local → Spark #2 IP
  - Resume services
- IF no backup:
  - Communicate downtime
  - Plan repair/replacement
```

### 🚀 ESCALATION

```
Immediate: ชิบะน้อย — hardware decision
Vendor support if needed
Plan recovery timeline
```

### ✅ POST-INCIDENT

```
- Hardware analysis (RMA if under warranty)
- Implement Spark #2 standby (if not done)
- Improve monitoring (predict failures)
- Document recovery time
```

---

## Incident 7: Data Corruption Detected

### 🚨 SYMPTOMS
- Pricelist shows obviously wrong values
- Sync sending bad data to AIO
- Reports inconsistent across modules
- Audit log shows unexpected changes

### 🔍 DIAGNOSIS

```bash
# 1. Identify scope
# Single product? Sheet? Category? Whole DB?

# 2. Check audit log
docker exec tkc-postgres psql -U postgres tkc -c "
SELECT occurred_at, user_name_snapshot, action, resource_label, details
FROM core.audit_log
WHERE module_code = 'pricelist'
  AND occurred_at > NOW() - INTERVAL '24 hours'
  AND severity IN ('critical', 'warning')
ORDER BY occurred_at DESC
LIMIT 100;
"

# 3. Compare with last restore point
# Settings > Restore > Compare
```

### ⚙️ FIX

**Step 1: STOP THE BLEEDING**
```bash
# Pause AIO write-back immediately
curl -X POST localhost:8000/api/pricelist/sync/pause \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Step 2: Identify scope**
```sql
-- Find affected rows
SELECT id, sheet_id, data, updated_at, updated_by
FROM pricelist.rows
WHERE updated_at > 'INCIDENT_START'
  AND status != 'deleted';
```

**Step 3: Restore**
```
Settings > Restore Points
→ Pick pre-incident snapshot
→ Scope: specific products / categories
→ Preview diff
→ Apply with reason
```

**Step 4: Resume sync**
```bash
# Only after data verified clean
curl -X POST localhost:8000/api/pricelist/sync/resume \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### 🚀 ESCALATION

```
IMMEDIATE: ชิบะน้อย
DO NOT WRITE TO AIO until issue resolved
Communicate to users: pricelist temporarily frozen
```

### ✅ POST-INCIDENT

```
- Root cause analysis
- Was it user error or system bug?
- Add safeguards if system bug
- Restore drill if not done recently
- Update sync code if needed
```

---

# 🟡 WARNING INCIDENTS (P1)

---

## Incident 8: AIO Sync Partial Failure

### 🚨 SYMPTOMS
- Some products sync, others fail
- Queue has stuck items but processing continues
- Telegram: "Sync errors >10 in last hour"

### 🔍 DIAGNOSIS

```bash
# Check stuck queue items
curl localhost:8000/api/pricelist/sync/queue?status=failed | jq

# Look for patterns:
# - Specific products?
# - Specific fields?
# - Common error message?
```

### ⚙️ FIX

**Per-item retry:**
```bash
# Get failed item IDs
curl localhost:8000/api/pricelist/sync/queue?status=failed | jq '.items[].id'

# Retry individual:
curl -X POST localhost:8000/api/pricelist/sync/queue/{id}/retry \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**If pattern found:**
```
Likely cause: data validation issue
- Check the specific products in AIO directly
- Fix data in AIO if structural issue
- Skip + log if AIO needs manual correction
```

### 🚀 ESCALATION
30 min → ชิบะน้อย if not resolved

---

## Incident 9: Telegram Bot Not Responding

### 🚨 SYMPTOMS
- No alerts being received
- Bot test fails in Settings
- Admin reports missing critical notifications

### 🔍 DIAGNOSIS

```bash
# 1. Test bot manually
TG_TOKEN="your_token"
curl https://api.telegram.org/bot$TG_TOKEN/getMe

# 2. Check rate limits (Telegram has them)
# Check backend logs for 429 errors

# 3. Check chat ID validity
curl https://api.telegram.org/bot$TG_TOKEN/getChat?chat_id=$CHAT_ID
```

### ⚙️ FIX

**Step 1: Test connectivity**
```bash
curl -X POST https://api.telegram.org/bot$TG_TOKEN/sendMessage \
  -d "chat_id=$CHAT_ID&text=Test from $(date)"
```

**Step 2: If token invalid**
```
Settings > Notifications > Update Bot Token
Generate new token via @BotFather
```

**Step 3: If chat ID wrong**
```
Send message to bot from chat → check getUpdates
Settings > Notifications > Update Chat ID
```

---

## Incident 10: WebSocket Mass Disconnects

### 🚨 SYMPTOMS
- Users report: no real-time updates
- Page refresh needed to see latest
- Multiple "WebSocket disconnected" errors

### 🔍 DIAGNOSIS

```bash
# Check WebSocket connection count
docker exec tkc-backend python -c "
from app.websocket import manager
print(f'Active connections: {len(manager.active_connections)}')
"

# Check Nginx WebSocket config
# Verify proxy headers
```

### ⚙️ FIX

**Step 1: Restart WebSocket service**
```bash
docker restart tkc-backend
# Clients auto-reconnect within 3s
```

**Step 2: If repeated disconnects**
```
Check:
- Nginx WebSocket timeout settings
- Cloudflare Tunnel WebSocket support
- Client networks (4G unstable)
```

---

## Incident 11: Disk Space Critical (<10%)

### 🚨 SYMPTOMS
- Telegram alert: "Disk space <10%"
- Slow performance
- Audit log archive job failing

### 🔍 DIAGNOSIS

```bash
df -h
du -sh /var/lib/docker/* | sort -h
du -sh /var/audit/* | sort -h
du -sh /var/backups/* | sort -h
```

### ⚙️ FIX

**Step 1: Clear old logs**
```bash
# Docker logs
docker logs --truncate=0 tkc-backend
find /var/lib/docker/containers -name "*.log" -mtime +7 -delete

# Old Docker images
docker image prune -a -f

# Audit warm tier old files
find /var/audit/warm -mtime +400 -delete
# (those should be in cold tier already)
```

**Step 2: Verify archive job working**
```bash
# Manually trigger
docker exec tkc-backend python -m scripts.archive_audit
```

**Step 3: Expand storage**
```
If still <20% → contact infrastructure
Plan: add SSD or move warm tier to NAS
```

---

## Incident 12: Search Performance Degraded

### 🚨 SYMPTOMS
- Search >2s response
- Users complain "search slow"
- Backend CPU high during search

### 🔍 DIAGNOSIS

```bash
# 1. Check pg_trgm index
docker exec tkc-postgres psql -U postgres tkc -c "
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE indexname LIKE '%trgm%'
ORDER BY idx_scan DESC;
"

# 2. Check Redis cache hit rate
docker exec tkc-redis redis-cli INFO stats | grep keyspace
```

### ⚙️ FIX

**Step 1: Rebuild indexes**
```sql
REINDEX INDEX CONCURRENTLY idx_pricelist_data_trgm;
ANALYZE pricelist.rows;
```

**Step 2: Clear Redis cache**
```bash
docker exec tkc-redis redis-cli FLUSHDB
# Will rebuild on next searches
```

**Step 3: Check row count**
```sql
SELECT COUNT(*) FROM pricelist.rows WHERE deleted_at IS NULL;
-- If >5000, may need pagination tuning
```

---

## Incident 13: Migration Session Corrupted

### 🚨 SYMPTOMS
- Admin reports: "Migration UI shows wrong state"
- Tick approvals not saving
- Session resume fails

### 🔍 DIAGNOSIS

```sql
-- Check session state
SELECT id, admin_id, status, total_items, verified_count
FROM pricelist.migration_sessions
WHERE status = 'in_progress'
ORDER BY started_at DESC;

-- Check candidates state
SELECT category, COUNT(*) 
FROM pricelist.migration_candidates
WHERE session_id = 'SESSION_ID'
GROUP BY category;
```

### ⚙️ FIX

**Step 1: Identify last good state**
```sql
-- Find last successful tick
SELECT MAX(approved_at) 
FROM pricelist.migration_candidates 
WHERE session_id = 'SESSION_ID' AND approved = true;
```

**Step 2: If recoverable**
```
Admin can manually resume:
- Refresh browser
- Re-login if needed
- Resume from last tick
```

**Step 3: If corrupted**
```
Backup current state:
pg_dump --table=pricelist.migration_* > migration_backup.sql

Reset session if necessary:
UPDATE pricelist.migration_sessions SET status='abandoned' WHERE id='ID';

Start new session with same file
```

---

# 🟢 ROUTINE PROCEDURES (P2/P3)

---

## Procedure 14: Weekly Backup Verification

**Frequency:** Every Monday morning  
**Owner:** On-call engineer / Admin

### Steps

```bash
# 1. List backups
ls -lh /var/backups/postgres/ | tail -10

# 2. Verify checksums
for f in /var/backups/postgres/*.dump; do
  sha256sum "$f"
  # Compare with .sha256 sibling file
done

# 3. Test restore (to temp DB)
docker exec tkc-postgres createdb -U postgres tkc_test
docker exec tkc-postgres pg_restore -U postgres -d tkc_test /backups/postgres-LATEST.dump

# 4. Verify restored data
docker exec tkc-postgres psql -U postgres tkc_test -c "
SELECT 'core.users' as tbl, COUNT(*) FROM core.users
UNION SELECT 'pricelist.rows', COUNT(*) FROM pricelist.rows
UNION SELECT 'audit_log', COUNT(*) FROM core.audit_log;
"

# 5. Drop test DB
docker exec tkc-postgres dropdb -U postgres tkc_test

# 6. Verify NAS cold storage accessible
ls /mnt/nas-audit/2026/ | tail -3
```

**Document Results:**
```
- Backup count: ✅
- Checksum match: ✅
- Restore test: ✅
- NAS access: ✅
- Date: 2026-XX-XX
```

---

## Procedure 15: Cipher Backup Card Reprint

**When:** New admin onboarded, lost card, periodic refresh  
**Authorization:** Owner approval required

### Steps

```
1. Login as Admin
2. Settings > Cipher
3. Verify current cipher (visible to Admin only)
4. Click "Download Backup Card PDF"
5. Print on secure printer (witness present)
6. Verify printout matches displayed cipher
7. Sign + date the printout
8. Store in physical safe
9. Audit log entry auto-created
10. Optional: shred any old/extra copies
```

**Safety Rules:**
- Never email/scan/photograph
- Witness present during print
- Document who has access to safe
- Annual review of safe access list

---

## Procedure 16: Add New User

### Steps

```
1. Settings > Users > [+ Add User]
2. Choose: Personal or Shared account
3. Fill:
   - Display Name: "เซลล์ ก."
   - Username: "sales_a"
   - Initial Password: auto-gen or set
   - Email/Phone (optional)
   - Telegram config (optional)
4. Assign Groups (max 3)
5. [Create User]
6. Communicate credentials to user:
   - Phone/in-person preferred
   - Force password change on first login
7. If external access needed:
   - User logs in from office first → device auto-approved
   - Subsequent external access → admin approval workflow
```

**Verify:**
- User can login
- Permissions correct (test as user)
- Audit log captures creation

---

## Procedure 17: Add New Device to Whitelist

### Steps

```
1. User logs in from new device
2. From external IP: device request created
3. Telegram alert to admin

4. Admin reviews:
   - Settings > Devices > Pending Approvals
   - Verify device legitimacy:
     * User confirms via separate channel
     * Reasonable location/network
     * Not too many devices for this user
5. Approve → device active immediately
   OR Reject → user must request again
6. Audit log captures decision
```

**Auto-approval (office IP):**
- No action needed
- Device added automatically
- Audit log captures auto-approval

---

## Procedure 18: Restore from Snapshot

### Steps

```
1. Settings > Restore Points
2. List shows:
   - Hourly (3 latest)
   - Daily (3 latest)
   - Manual (3 latest)
   - Launch Day (permanent)
3. Pick snapshot
4. Choose scope:
   - Whole pricelist
   - Specific category
   - Specific product(s)
5. Preview diff
6. Confirm with reason text
7. Apply
8. Verify:
   - Affected products show old values
   - Sync queue picks up changes
   - AIO updates within 15 min
9. Audit log captures action
```

**Caution:**
- Restore is forward-only (new audit event)
- Can't "unrestore" — restore again to previous state
- Test in staging if possible for large restores

---

## Procedure 19: Schedule Price Change

### Steps

```
1. Pricelist > Schedule (admin)
2. Click "New Schedule"
3. Fill:
   - Scope: row / category / sheet / custom
   - Field: ทุน / ราคาขาย / B / A / S
   - Change type: absolute / + amount / + %
   - Change value: e.g., +500 or *1.05
   - Effective date + time
   - Notify staff: ☑ (default)
4. Preview affected rows
5. Save schedule
6. View in dashboard scheduled list
7. Cancel/edit before effective time if needed

At effective time:
- System auto-applies
- Audit log captures bulk change
- Telegram alert: admin + creator
- Affected sync queue → AIO write within 15 min
```

---

## Procedure 20: Rotate AI Agent Keys

**Frequency:** Auto every 180 days; manual on suspicion

### Steps

```
1. Settings > AI Agents > [พอร์ช]
2. Note: 7-day grace period for old keys
3. Click "Rotate Key"
4. Confirm
5. New keys generated:
   - API Key
   - HMAC Secret
6. Copy new credentials securely
7. Update agent operator:
   - Coordinate timing
   - New credentials transferred via secure channel
   - Old credentials still valid for 7 days
8. Verify agent reconnects successfully
9. After 7 days: old credentials revoked automatically
10. Audit log captures rotation
```

**Emergency Rotation:**
- Skip grace period if compromise suspected
- Old credentials revoked immediately
- May cause temporary agent downtime

---

## Procedure 21: Audit Log Archive Verification

**Frequency:** Monthly  
**Triggered by:** Auto-archive job + manual verification

### Steps

```bash
# 1. Check latest archive
ls -lh /mnt/nas-audit/$(date +%Y)/ | tail -3

# 2. Verify checksums
for f in /mnt/nas-audit/$(date +%Y)/*.jsonl.gz; do
  expected=$(cat "${f}.sha256")
  actual=$(sha256sum "$f" | awk '{print $1}')
  if [ "$expected" != "$actual" ]; then
    echo "❌ CHECKSUM MISMATCH: $f"
  else
    echo "✅ $f"
  fi
done

# 3. Spot check content
zcat /mnt/nas-audit/2026/05.jsonl.gz | head -10 | jq

# 4. Verify retention purge
# Old files (>3 years) should be deleted
ls /mnt/nas-audit/2023/ 2>/dev/null && echo "⚠️ Found old files to purge"
```

**If issues found:**
- Stop archive job
- Investigate root cause
- Restore from previous good state
- Document in incident log

---

# 📋 Quick Reference: Common Commands

## Service Management

```bash
# Restart services
docker restart tkc-backend
docker restart tkc-frontend
docker restart tkc-postgres
docker restart tkc-redis
docker restart tkc-sync

# View logs
docker logs tkc-backend --tail 100 --follow
docker logs tkc-sync --tail 50

# Check container status
docker ps -a | grep tkc

# System resource usage
docker stats --no-stream
```

## Database

```bash
# Connect to PostgreSQL
docker exec -it tkc-postgres psql -U postgres tkc

# Quick health checks
docker exec tkc-postgres psql -U postgres tkc -c "
SELECT 'audit_log' as t, COUNT(*) FROM core.audit_log
UNION SELECT 'users', COUNT(*) FROM core.users
UNION SELECT 'pricelist.rows', COUNT(*) FROM pricelist.rows;
"

# Backup
docker exec tkc-postgres pg_dump -U postgres -F custom tkc \
  > /backups/postgres-$(date +%Y%m%d_%H%M%S).dump
```

## API Calls

```bash
# Health check
curl localhost:8000/api/health

# Get admin token (for runbook use)
ADMIN_TOKEN=$(curl -s -X POST localhost:8000/api/auth/login \
  -d '{"username":"admin","password":"$ADMIN_PASS"}' | jq -r .access_token)

# Use in headers
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  localhost:8000/api/admin/...
```

## Telegram

```bash
# Send manual alert
TG_TOKEN="..."
CHAT_ID="..."
curl -X POST https://api.telegram.org/bot$TG_TOKEN/sendMessage \
  -d "chat_id=$CHAT_ID&text=🚨 Manual alert: $(date)"
```

---

# 📊 Monitoring & Alerts Setup

## Critical Alerts (Telegram immediate)

```
🔴 P0 Critical:
- AIO sync failed >5 min
- PostgreSQL down
- Disk space <5%
- NAS unreachable >5 min
- Cipher view from unusual IP
- Failed login spike (>50/hour)

🟡 P1 Warning:
- AIO sync error rate >10%
- Disk space <15%
- WebSocket disconnects en masse
- Sync queue >200 items
- Audit archive job failed
```

## Dashboards

```
Settings > System Health (Admin):
- Spark #1 CPU/RAM (live)
- PostgreSQL connections
- Redis hit rate
- Audit log size growth
- NAS health
- Active users
- Sync queue depth
- API response p50/p95/p99
```

## Logs Location

```
Spark #1:
- Backend: /var/log/docker/tkc-backend.log
- Sync: /var/log/docker/tkc-sync.log
- Postgres: /var/log/docker/tkc-postgres.log
- Audit warm: /var/audit/warm/{yyyy}/{mm}.jsonl.gz
- Backups: /var/backups/postgres/

NAS:
- Audit cold: /mnt/nas-audit/{yyyy}/{mm}.jsonl.gz
- DB backups: /mnt/nas-backups/postgres/
```

---

# 🧪 Disaster Recovery Drills

**Quarterly Schedule:**

| Quarter | Drill |
|---|---|
| Q1 | Full DB restore from backup |
| Q2 | Spark #1 failure simulation |
| Q3 | NAS failure + recovery |
| Q4 | Cipher rotation + verification |

**Drill Procedure:**
1. Schedule with team
2. Document current state
3. Execute drill
4. Measure recovery time
5. Post-drill review
6. Update runbook based on findings

---

# 📞 Vendor/Support Contacts

```
🛠️ Internal:
- ชิบะน้อย (Owner)
- Senior Dev / Backup
- On-call rotation list

🏢 External Vendors:
- AIO Support: [contact]
- Synology Support: [contact]
- Cloudflare Support: dashboard
- Hosting Provider: [contact]

🔧 Tools:
- GitHub repo: [URL]
- Monitoring dashboard: [URL]
- Telegram alert group: TKC-AlertOps
```

---

# 📝 Incident Reporting Template

```
## Incident Report

**Date:** YYYY-MM-DD HH:MM
**Severity:** P0/P1/P2/P3
**Reporter:** Name
**Duration:** Start time → Resolution time

### Summary
[1-2 sentence description]

### Impact
- Users affected: X
- Features down: list
- Data impact: yes/no/maybe

### Root Cause
[Technical explanation]

### Resolution
[Steps taken to resolve]

### Timeline
- HH:MM - Incident detected
- HH:MM - Diagnosis started
- HH:MM - Fix applied
- HH:MM - Verified resolved
- HH:MM - Post-incident review scheduled

### Lessons Learned
- What worked well
- What didn't
- Action items

### Runbook Updates
- New symptoms documented
- New procedures added
- Existing procedures revised
```

---

# 🎯 Runbook Maintenance

**Update this document when:**
- New incident type encountered
- Procedure changes
- New service added
- Monitoring/alerts change
- After every disaster drill

**Review Cadence:** Monthly during active development, quarterly after stable

**Version Control:**
- All changes via Git PR
- Approved by senior engineer
- Test changes in non-prod environment first

---

**End of Operations Runbook v1.0**

| Version | Date | Notes |
|---|---|---|
| 1.0 | 2026-05-12 | Initial runbook covering 7 critical + 6 warning + 8 routine procedures |
