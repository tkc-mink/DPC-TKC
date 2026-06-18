# 🚀 DEPLOYMENT.md — TKC Dynamic Pricelist

> วิธี deploy บน **Ubuntu Server 25.04** (เครื่อง local ในร้าน — Spark #1)
> แนะนำ **Docker Compose** เป็นหลัก (ย้าย/กู้คืนง่าย) · มีวิธี bare-metal ให้เทียบ
> Stack: Laravel 11 (PHP 8.3+) · PostgreSQL 16 · Redis 7 · Reverb · Horizon · Nginx · Cloudflare Tunnel

---

## 0. ภาพรวมสถาปัตยกรรมเครื่อง

```
                    Internet (ลูกค้า / เซลล์นอกร้าน)
                              │ HTTPS
                              ▼
                   ┌──────────────────────┐
                   │  Cloudflare Tunnel    │  ← ไม่ต้องเปิด port ออกเน็ต
                   │  (cloudflared)        │
                   └──────────┬───────────┘
   LAN (ในร้าน) ─────────────►│
                              ▼
   ┌──────────────────────────────────────────────────────────┐
   │  Ubuntu Server 25.04 (Spark #1)                           │
   │  ┌────────────────────────────────────────────────────┐  │
   │  │ Docker Compose                                      │  │
   │  │  nginx → app(php-fpm) ─┬─ postgres                  │  │
   │  │         reverb(ws)     ├─ redis                     │  │
   │  │         horizon(queue) └─ scheduler(cron)           │  │
   │  └────────────────────────────────────────────────────┘  │
   │  Mount: /mnt/nas-audit (Synology, SMB/SFTP)               │
   └───────────────────────┬──────────────────────────────────┘
                           │ LAN
              ┌────────────┴────────────┐
              ▼                         ▼
      ┌──────────────┐          ┌──────────────┐
      │ AIO (MySQL)  │          │ Synology NAS │
      │ บัญชี/สต็อก   │          │ audit cold    │
      └──────────────┘          └──────────────┘
```

---

## 1. เตรียมเครื่อง Ubuntu 25.04 (ครั้งเดียว)

### 1.1 อัปเดต + ตั้งค่าพื้นฐาน
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git ufw fail2ban unzip ca-certificates gnupg htop

# ตั้ง timezone + locale ไทย
sudo timedatectl set-timezone Asia/Bangkok
sudo locale-gen th_TH.UTF-8 en_US.UTF-8
```

### 1.2 สร้าง user สำหรับรันแอป (ไม่ใช้ root)
```bash
sudo adduser tkc
sudo usermod -aG sudo tkc
# ถ้าจะใช้ Docker:
sudo usermod -aG docker tkc
su - tkc
```

### 1.3 SSH ปลอดภัย (แนะนำมาก)
```bash
# บนเครื่องคุณ: คัดลอก public key ขึ้น server
ssh-copy-id tkc@<server-ip>

# บน server แก้ /etc/ssh/sshd_config
sudo nano /etc/ssh/sshd_config
#   PermitRootLogin no
#   PasswordAuthentication no      ← เข้าได้ด้วย key เท่านั้น
sudo systemctl restart ssh
```

### 1.4 Firewall (UFW)
```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow OpenSSH                 # 22 (หรือเปลี่ยน port)
sudo ufw allow from 192.168.1.0/24     # อนุญาต LAN ในร้านเข้าตรง (ปรับ subnet ของคุณ)
# ไม่ต้องเปิด 80/443 ออกเน็ต — ใช้ Cloudflare Tunnel แทน
sudo ufw enable
sudo ufw status verbose
```

> 🔒 `fail2ban` ติดตั้งไว้แล้ว → กัน brute-force SSH อัตโนมัติ

---

## 2. วิธีที่แนะนำ — Docker Compose

### 2.1 ติดตั้ง Docker Engine
```bash
# repo อย่างเป็นทางการของ Docker
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

docker --version && docker compose version   # เช็คว่าได้
```
> ℹ️ ถ้า repo ยังไม่มี codename ของ 25.04 (`plucky`) ให้ใช้ `noble` (24.04 LTS) แทนในบรรทัด codename — Docker ใช้ได้ปกติ

### 2.2 ดึงโค้ด + ตั้งค่า
```bash
cd /home/tkc
git clone <your-private-repo> tkc-pricelist
cd tkc-pricelist
cp .env.example .env
nano .env        # ตั้งค่า DB, Redis, AIO, Telegram, APP_KEY (ดู README §2)
```

### 2.3 `docker-compose.yml` (ตัวอย่างเต็ม)
```yaml
services:
  app:                       # Laravel: Inertia + API (php-fpm)
    build: { context: ., dockerfile: docker/php/Dockerfile }
    restart: unless-stopped
    volumes: [ ".:/var/www", "/mnt/nas-audit:/mnt/nas-audit" ]
    depends_on: [ postgres, redis ]
    env_file: .env

  nginx:
    image: nginx:1.27-alpine
    restart: unless-stopped
    ports: [ "127.0.0.1:8080:80" ]      # เปิดเฉพาะ localhost → ให้ Tunnel ต่อ
    volumes:
      - ".:/var/www"
      - "./docker/nginx/default.conf:/etc/nginx/conf.d/default.conf:ro"
    depends_on: [ app ]

  reverb:                    # WebSocket (ราคาสด)
    build: { context: ., dockerfile: docker/php/Dockerfile }
    restart: unless-stopped
    command: php artisan reverb:start --host=0.0.0.0 --port=8081
    env_file: .env
    depends_on: [ redis ]

  horizon:                   # queue worker (AIO sync, schedule jobs)
    build: { context: ., dockerfile: docker/php/Dockerfile }
    restart: unless-stopped
    command: php artisan horizon
    env_file: .env
    depends_on: [ postgres, redis ]

  scheduler:                 # cron ภายใน (sync 15 นาที, archive รายเดือน)
    build: { context: ., dockerfile: docker/php/Dockerfile }
    restart: unless-stopped
    command: sh -c "while true; do php artisan schedule:run; sleep 60; done"
    env_file: .env
    depends_on: [ postgres, redis ]

  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: tkc_superapp
      POSTGRES_USER: tkc
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes: [ "pgdata:/var/lib/postgresql/data" ]
    # ไม่ map port ออก — เข้าผ่าน network ภายใน docker เท่านั้น

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    command: redis-server --appendonly yes
    volumes: [ "redisdata:/data" ]

volumes: { pgdata: , redisdata: }
```

### 2.4 `docker/php/Dockerfile` (ย่อ)
```dockerfile
FROM php:8.3-fpm-alpine
RUN apk add --no-cache postgresql-dev libpng-dev oniguruma-dev icu-dev \
 && docker-php-ext-install pdo_pgsql pdo_mysql gd intl opcache pcntl bcmath
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
WORKDIR /var/www
# ติดตั้ง dependency ตอน build (production)
COPY composer.* ./
RUN composer install --no-dev --optimize-autoloader --no-scripts
COPY . .
RUN chown -R www-data:www-data storage bootstrap/cache
```
> `pdo_mysql` จำเป็นสำหรับเชื่อม AIO · `pcntl` จำเป็นสำหรับ Horizon/Reverb

### 2.5 `docker/nginx/default.conf` (ย่อ)
```nginx
server {
    listen 80;
    root /var/www/public;
    index index.php;
    client_max_body_size 50M;          # เผื่ออัปโหลด Excel ตอน migration

    location / { try_files $uri $uri/ /index.php?$query_string; }
    location ~ \.php$ {
        fastcgi_pass app:9000;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
    }
    # WebSocket → Reverb
    location /app { proxy_pass http://reverb:8081; proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade; proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host; }
}
```

### 2.6 ขึ้นระบบครั้งแรก
```bash
docker compose build
docker compose up -d
# ตั้งค่าแอปครั้งแรก
docker compose exec app php artisan key:generate
docker compose exec app php artisan migrate --force
docker compose exec app php artisan db:seed --force      # กลุ่มสิทธิ์ + cipher + admin
docker compose exec app php artisan storage:link
# build frontend (ทำบนเครื่อง dev แล้ว commit หรือ build ใน CI)
npm ci && npm run build
docker compose exec app php artisan optimize             # cache config/route/view
```
เช็ค: `curl http://127.0.0.1:8080/up` → ต้องได้ 200

---

## 3. Cloudflare Tunnel (เข้าจากนอกร้านปลอดภัย)

ไม่ต้องเปิด port 80/443 ออกเน็ต — Tunnel ต่อออกจาก server เอง:
```bash
# ติดตั้ง cloudflared
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o cf.deb
sudo dpkg -i cf.deb

cloudflared tunnel login                       # เปิดลิงก์ไป authorize
cloudflared tunnel create tkc-pricelist
# ผูกโดเมน เช่น app.tkc.co กับ tunnel
cloudflared tunnel route dns tkc-pricelist app.tkc.co
```
`~/.cloudflared/config.yml`:
```yaml
tunnel: tkc-pricelist
credentials-file: /home/tkc/.cloudflared/<uuid>.json
ingress:
  - hostname: app.tkc.co
    service: http://127.0.0.1:8080      # ชี้เข้า nginx ของเรา
  - service: http_status:404
```
รันเป็น service:
```bash
sudo cloudflared service install
sudo systemctl enable --now cloudflared
```
> 🔒 เสริม **Cloudflare Access** (Zero Trust) หน้าโดเมน → บังคับ login ก่อนถึงแอป (ชั้นความปลอดภัยเพิ่ม) · SSL จัดการโดย Cloudflare อัตโนมัติ ไม่ต้องตั้ง Let's Encrypt เอง

---

## 4. เชื่อมต่อ NAS (audit cold tier)
```bash
sudo apt install -y cifs-utils                  # ถ้าใช้ SMB
sudo mkdir -p /mnt/nas-audit
# /etc/fstab (SMB)
//192.168.1.50/tkc/audit-archive /mnt/nas-audit cifs credentials=/etc/nas.cred,uid=tkc,iocharset=utf8,_netdev 0 0
sudo mount -a
```
`/etc/nas.cred` (chmod 600): `username=...` / `password=...`
> หรือใช้ Flysystem SFTP adapter ในแอปแทนการ mount (ดู DATABASE.md) — เลือกอย่างใดอย่างหนึ่ง

---

## 5. Backup อัตโนมัติ (cron)
```bash
crontab -e
```
```cron
# pg_dump รายวัน ตี 2 — เก็บ 3 วัน
0 2 * * * docker compose -f /home/tkc/tkc-pricelist/docker-compose.yml exec -T postgres \
  pg_dump -U tkc tkc_superapp | gzip > /home/tkc/backups/db-$(date +\%F).sql.gz && \
  ls -t /home/tkc/backups/db-*.sql.gz | tail -n +4 | xargs -r rm

# ย้าย audit hot→warm→cold รายเดือน (มี artisan command ในแอป)
0 3 1 * * docker compose -f /home/tkc/tkc-pricelist/docker-compose.yml exec -T app php artisan audit:archive
```
- **PERMANENT (ลบไม่ได้):** Launch-day backup, cipher backup card (PDF + พิมพ์กระดาษ), `core.aio_initial_backup`
- รายไตรมาส: คัดลอก `/home/tkc/backups` ลง external drive เก็บนอกร้าน

---

## 6. อัปเดตเวอร์ชัน (deploy รอบถัดไป)
```bash
cd /home/tkc/tkc-pricelist
php artisan down                       # maintenance mode (หรือ docker compose exec app ...)
git pull
docker compose build app horizon reverb scheduler
npm ci && npm run build
docker compose up -d
docker compose exec app php artisan migrate --force
docker compose exec app php artisan optimize
php artisan up
```
> แนะนำทำ **CI/CD (GitHub Actions)**: push → test → build → ssh deploy อัตโนมัติ (ลดพลาด)

---

## 7. Monitoring & สุขภาพระบบ
- **Horizon UI** (`/horizon`) — ดู queue, job ล้มเหลว, retry (เฉพาะ admin)
- **System Health** ในแอป (Settings Hub) — CPU/RAM/DB/NAS/AIO
- Server: `htop`, `docker stats`, `docker compose logs -f app`
- Telegram alert: AIO sync fail, NAS offline, critical audit
- (ตาม PRD) เสริม Grafana + Prometheus ภายหลังได้

---

## 8. ทางเลือก — Bare-metal (ไม่ใช้ Docker)
ถ้าอยากรันตรงบนเครื่อง (ไม่แนะนำสำหรับทีมเล็ก เพราะกู้คืน/ย้ายยากกว่า):
```bash
sudo apt install -y php8.3-fpm php8.3-pgsql php8.3-mysql php8.3-redis \
  php8.3-gd php8.3-intl php8.3-mbstring php8.3-bcmath php8.3-xml php8.3-curl \
  nginx postgresql-16 redis-server
# Reverb/Horizon/Scheduler รันเป็น systemd service แยก:
#   - php artisan reverb:start   → /etc/systemd/system/reverb.service
#   - php artisan horizon        → /etc/systemd/system/horizon.service
#   - php artisan schedule:run   → ใส่ใน crontab ทุก 1 นาที
sudo -u postgres createdb tkc_superapp
```
> Docker = แนะนำ เพราะ "เครื่องพัง → ยกของขึ้นเครื่องใหม่ได้ใน 30 นาที"

---

## 9. ✅ Checklist ก่อน Go-live
- [ ] Ubuntu อัปเดต + UFW + fail2ban + SSH key-only
- [ ] Docker Compose ขึ้นครบทุก service (`docker compose ps` เขียวหมด)
- [ ] `php artisan migrate` + `db:seed` สำเร็จ
- [ ] `npm run build` + `artisan optimize` แล้ว
- [ ] Cloudflare Tunnel ต่อติด + เปิด `app.tkc.co` ได้
- [ ] (แนะนำ) Cloudflare Access บังคับ login
- [ ] AIO MySQL เชื่อมได้ (อ่าน) + **รัน `aio:backup-initial` ก่อนเขียนครั้งแรก**
- [ ] NAS mount/SFTP ต่อได้
- [ ] cron backup รายวันทำงาน + ทดสอบ restore
- [ ] Reverb (ws) + Horizon (queue) เดินจริง
- [ ] Telegram alert เด้ง
- [ ] โหลดทดสอบ 30 user พร้อมกัน ผ่าน

---

## 🖥️ สเปกเครื่องที่แนะนำ (อ้างจาก PRD)
- Spark #1 รับบทเว็บ+DB: CPU หลาย core, **RAM ≥ 16GB** (PRD ระบุมี 128GB ก็สบาย), **SSD ≥ 256GB ว่าง**
- PostgreSQL + Redis + NAS connectivity เช็คก่อนเริ่ม (P0)
- 30 user ต่อเนื่อง / 100 peak — เครื่องระดับนี้รับได้สบาย

---

*ดู runbook ปฏิบัติการเต็ม → PRD `11_Operations_Runbook.md` · สถาปัตยกรรม → `docs/ARCHITECTURE.md`*
