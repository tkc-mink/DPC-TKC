/* ============================================================
   dbx-connect.js — ส่วนต่อขยาย DBX (ไม่แตะ db-staging.js)
   • สำรอง/กู้คืนการตั้งค่าทั้งหมด (backup/restore)  [ข้อเสนอ #3]
   • HttpAdapter + ทดสอบการเชื่อมต่อ + สลับ mock/http  [ข้อเสนอ #7]
   ต้องโหลดหลัง db-staging.js
   ============================================================ */
(function () {
  if (!window.DBX) { console.warn('dbx-connect: DBX ยังไม่พร้อม'); return; }
  var DBX = window.DBX;

  // ---------- registry คีย์ทั้งหมด (จุดรวมที่เดียว) [#3] ----------
  // สแกนตาม prefix → ครอบคลุมคีย์ใหม่ในอนาคตอัตโนมัติ
  var PREFIXES = ['dbx_', 'xls2_'];
  function isOurKey(k) { return PREFIXES.some(function (p) { return k.indexOf(p) === 0; }); }
  function allKeys() {
    var out = [];
    for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (isOurKey(k)) out.push(k); }
    return out.sort();
  }

  // ---------- สำรอง / กู้คืน [#3] ----------
  function exportSettings() {
    var data = {};
    allKeys().forEach(function (k) { try { data[k] = JSON.parse(localStorage.getItem(k)); } catch (e) { data[k] = localStorage.getItem(k); } });
    return {
      _meta: { app: 'DYNAMIC PRICE LIST', kind: 'settings-backup', version: 1, exportedAt: new Date().toISOString(), keyCount: Object.keys(data).length },
      data: data
    };
  }
  function exportSettingsBlob() {
    return new Blob([JSON.stringify(exportSettings(), null, 2)], { type: 'application/json' });
  }
  // mode: 'merge' (เขียนทับเฉพาะคีย์ที่มีในไฟล์) | 'replace' (ลบคีย์เราเดิมทั้งหมดก่อน)
  function importSettings(obj, mode) {
    if (!obj || !obj.data || typeof obj.data !== 'object') throw new Error('ไฟล์สำรองไม่ถูกต้อง');
    if (mode === 'replace') { allKeys().forEach(function (k) { localStorage.removeItem(k); }); }
    var n = 0;
    Object.keys(obj.data).forEach(function (k) {
      if (!isOurKey(k)) return;                 // ปลอดภัย: เขียนเฉพาะคีย์ของแอปเรา
      var v = obj.data[k];
      localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
      n++;
    });
    return n;
  }

  // ---------- HttpAdapter (โครงพร้อมต่อ API จริง) [#7] ----------
  // สัญญา adapter เดียวกับ MockAdapter: search(opt)→[], get(code)→raw, batch(codes)→[raw], pushPrices(code,prices)→{ok,updated}
  function HttpAdapter(cfg) {
    cfg = cfg || {};
    var base = (cfg.baseUrl || '').replace(/\/+$/, '');
    function headers() {
      var h = { 'Content-Type': 'application/json' };
      if (cfg.useAuth && cfg.token) h['Authorization'] = 'Bearer ' + cfg.token;
      return h;
    }
    function timeout(ms) { return new Promise(function (_, rej) { setTimeout(function () { rej(new Error('หมดเวลาเชื่อมต่อ (timeout)')); }, ms || 12000); }); }
    function req(path, opt) {
      var p = fetch(base + path, Object.assign({ headers: headers() }, opt)).then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + r.statusText);
        return r.json();
      });
      return Promise.race([p, timeout(cfg.timeoutMs)]);
    }
    return {
      kind: 'http',
      ping: function () { return req('/ping', { method: 'GET' }); },
      search: function (opt) {
        var q = [];
        if (opt) { if (opt.q) q.push('q=' + encodeURIComponent(opt.q)); if (opt.group) q.push('group=' + encodeURIComponent(opt.group)); if (opt.brand) q.push('brand=' + encodeURIComponent(opt.brand)); }
        return req('/products' + (q.length ? '?' + q.join('&') : ''), { method: 'GET' });
      },
      get: function (code) { return req('/products/' + encodeURIComponent(code), { method: 'GET' }); },
      batch: function (codes) { return req('/products/batch', { method: 'POST', body: JSON.stringify({ codes: codes }) }); },
      pushPrices: function (code, prices) { return req('/products/' + encodeURIComponent(code) + '/prices', { method: 'PUT', body: JSON.stringify(prices) }); }
    };
  }

  // ใช้ adapter ตาม config ปัจจุบัน (เรียกตอนโหลด + หลังบันทึกการตั้งค่า)
  function applyAdapter() {
    var cfg = DBX.config();
    if (cfg.adapter === 'http' && cfg.baseUrl) DBX.setAdapter(HttpAdapter(cfg));
    // mock เป็นค่าเริ่มต้นอยู่แล้ว (db-staging ตั้งให้)
    return DBX.adapter().kind;
  }

  // ทดสอบการเชื่อมต่อด้วย config ที่ส่งมา (ไม่กระทบ adapter ที่ใช้งานจริง)
  function testConnection(cfg) {
    var t0 = Date.now();
    var a = HttpAdapter(cfg || DBX.config());
    // ลอง ping ก่อน ถ้า endpoint ไม่มีให้ fallback เป็น search ว่าง
    return a.ping().catch(function () { return a.search({}); }).then(function (res) {
      var count = Array.isArray(res) ? res.length : (res && res.count != null ? res.count : null);
      return { ok: true, ms: Date.now() - t0, count: count };
    }).catch(function (err) {
      return { ok: false, ms: Date.now() - t0, error: (err && err.message) || 'เชื่อมต่อไม่สำเร็จ' };
    });
  }

  // ผนวกเข้า DBX
  DBX.STORAGE_PREFIXES = PREFIXES;
  DBX.allStorageKeys = allKeys;
  DBX.exportSettings = exportSettings;
  DBX.exportSettingsBlob = exportSettingsBlob;
  DBX.importSettings = importSettings;
  DBX.HttpAdapter = HttpAdapter;
  DBX.applyAdapter = applyAdapter;
  DBX.testConnection = testConnection;

  applyAdapter();   // เริ่มต้นตาม config
})();
