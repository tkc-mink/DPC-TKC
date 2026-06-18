/* ============================================================
   sw.js — Service Worker (network-first) สำหรับ DPC-TKC
   เป้าหมาย: เปิดเว็บแล้วได้ "ไฟล์ล่าสุดเสมอ" โดยไม่ต้องกด Ctrl+Shift+R
   วิธีทำงาน:
     • ออนไลน์  → ดึงจากเน็ตก่อนเสมอ (ได้ของใหม่ล่าสุด) แล้วเก็บสำเนาไว้
     • ออฟไลน์  → ใช้สำเนาที่เก็บไว้ (เปิดโปรแกรมได้แม้เน็ตหลุด)
     • จัดการเฉพาะไฟล์ของเราเอง (same-origin GET) — ไม่ยุ่งกับ Google API
   ============================================================ */
var CACHE = 'dpc-tkc-cache';

self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  // จัดการเฉพาะไฟล์โดเมนเดียวกัน (ของเรา) — ปล่อย Google APIs/อื่นๆ ผ่านไปตามปกติ
  var url;
  try { url = new URL(req.url); } catch (err) { return; }
  if (url.origin !== self.location.origin) return;

  e.respondWith(
    fetch(req).then(function (resp) {
      if (resp && resp.ok && resp.type === 'basic') {
        var copy = resp.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
      }
      return resp;
    }).catch(function () {
      return caches.match(req).then(function (hit) { return hit || Promise.reject('offline'); });
    })
  );
});
