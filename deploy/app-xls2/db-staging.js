/* ============================================================
   db-staging.js — ชั้นกลาง DB (Staging & Enrichment Layer)
   [DB local] --API--> [Staging] --clean model--> [โปรแกรมหลัก]
   ① Pull ② Filter ③ Enrich ④ Normalize ⑤ Serve
   กฎเหล็ก: เขียนกลับ DB ได้เฉพาะ salePrice1..5 เท่านั้น
   enrich/category/permission/audit เก็บฝั่งเรา (localStorage) ไม่แตะ DB
   exposes window.DBX
   ============================================================ */
(function () {
  'use strict';

  // ---------- field catalog (ระบบเสนอให้ผูกคอลัมน์/ช่อง) ----------
  // writable=true เฉพาะ 5 ราคา (whitelist ระดับโค้ด — กฎเหล็ก)
  var FIELDS = [
    { key: 'code13', label: 'รหัสสินค้า (13 หลัก)', group: 'ข้อมูลระบุตัวตน' },
    { key: 'name', label: 'ชื่อ/รายละเอียดสินค้า', group: 'ข้อมูลระบุตัวตน' },
    { key: 'status', label: 'สถานะ (Active/Inactive)', group: 'ข้อมูลระบุตัวตน' },
    { key: 'brandCode', label: 'ยี่ห้อ (ย่อ)', group: 'ข้อมูลระบุตัวตน' },
    { key: 'brandName', label: 'ยี่ห้อ (เต็ม)', group: 'ข้อมูลระบุตัวตน' },
    { key: 'group', label: 'หมวดสินค้า', group: 'ข้อมูลระบุตัวตน' },
    { key: 'productType', label: 'ชนิดสินค้า', group: 'ข้อมูลระบุตัวตน' },
    { key: 'size', label: 'ขนาด', group: 'คุณลักษณะ' },
    { key: 'ply', label: 'ชั้น (PR)', group: 'คุณลักษณะ' },
    { key: 'model', label: 'รุ่น', group: 'คุณลักษณะ' },
    { key: 'spec', label: 'สเปก (load/speed)', group: 'คุณลักษณะ' },
    { key: 'costStandard', label: 'ทุนมาตรฐาน', group: 'ต้นทุน' },
    { key: 'costAverage', label: 'ทุนเฉลี่ย', group: 'ต้นทุน' },
    { key: 'costLatest', label: 'ทุนล่าสุด', group: 'ต้นทุน' },
    { key: 'qtyOnHand', label: 'คงเหลือ (รวม)', group: 'สต็อก' },
    { key: 'qtyReserved', label: 'จอง', group: 'สต็อก' },
    { key: 'qtyAvailable', label: 'คงเหลือสุทธิ (หักจอง)', group: 'สต็อก' },
    { key: 'incoming', label: 'ของกำลังเข้า', group: 'สต็อก' },
    { key: 'unit', label: 'หน่วยนับ', group: 'สต็อก' },
    { key: 'salePrice1', label: 'ราคาขาย 1', group: 'ราคา (เขียนได้)', writable: true },
    { key: 'salePrice2', label: 'ราคาขาย 2', group: 'ราคา (เขียนได้)', writable: true },
    { key: 'salePrice3', label: 'ราคาขาย 3', group: 'ราคา (เขียนได้)', writable: true },
    { key: 'salePrice4', label: 'ราคาขาย 4', group: 'ราคา (เขียนได้)', writable: true },
    { key: 'salePrice5', label: 'ราคาขาย 5', group: 'ราคา (เขียนได้)', writable: true }
  ];
  var WRITABLE = { salePrice1: 1, salePrice2: 1, salePrice3: 1, salePrice4: 1, salePrice5: 1 };
  function fieldLabel(key) { var f = FIELDS.find(function (x) { return x.key === key; }); if (f) return f.label; var c = lsGet(K_CUSTOMFIELDS, []).find(function (x) { return x.key === key; }); return c ? c.label : key; }
  function isWritable(key) { return !!WRITABLE[key]; }

  // ---------- ① Mock Adapter (จะสลับเป็น HttpAdapter ตอนต่อ server จริง) ----------
  // สร้างข้อมูล mock เสมือน DB จริง อิง window.PICKUP01 + เติมฟิลด์สต็อก/DOT/รูป
  function makeCode13(i) {
    // เลียนแบบรหัส 13 หลักจริง: 001 + กลุ่ม(02) + ชนิด(03) + running
    return '00102303' + String(14001 + i).slice(-5);
  }
  function MockAdapter() {
    var built = null;
    function build() {
      if (built) return built;
      built = {};
      var src = (window.PICKUP01 && window.PICKUP01.rows) || [];
      src.forEach(function (r, i) {
        var code = makeCode13(i);
        var brandName = (window.XL2 && XL2.brandFull) ? XL2.brandFull(r.brand) : r.brand;
        var name = 'ยาง ' + r.brand + ' ' + r.size + ' ' + (r.ply ? r.ply + 'PR ' : '') + r.model;
        // mock สต็อก/จอง/กำลังเข้า แบบกระจายให้ทดสอบทุกสถานะ
        var onHand = [0, 1, 2, 3, 4, 6, 8, 12, 20, 30][i % 10];
        var reserved = [0, 0, 1, 2, 4, 0, 2, 8, 0, 26][i % 10];
        var incoming = (i % 5 === 0) ? (i % 3 + 1) * 4 : 0;
        var status = (i % 13 === 12) ? 'inactive' : 'active';   // บางตัว inactive ไว้ทดสอบ
        var cost = (window.XL2 ? XL2.toN(r.cost) : parseFloat(r.cost)) || 0;
        built[code] = {
          code13: code, name: name, status: status,
          brandCode: r.brand, brandName: brandName,
          group: '03', productType: '14',
          size: r.size, ply: r.ply, model: r.model, spec: r.spec || '',
          costStandard: cost, costAverage: Math.round(cost * 1.003), costLatest: Math.round(cost * 0.998),
          qtyOnHand: onHand, qtyReserved: reserved, incoming: incoming, unit: 'เส้น',
          dotWeeks: mockDot(i, onHand),
          imageUrl: '',   // DB จริงส่ง URL — mock เว้นว่าง
          salePrice1: num(r.retail), salePrice2: num(r.priceB), salePrice3: num(r.priceA),
          salePrice4: num(r.priceS), salePrice5: num(r.priceS),
          _origKey: r.size + '|' + r.brand + '|' + r.model
        };
      });
      return built;
    }
    function num(v) { return (window.XL2 ? XL2.toN(v) : parseFloat(v)) || 0; }
    function mockDot(i, onHand) {
      if (onHand <= 0) return [];
      var weeks = [], left = onHand, base = 20 + (i % 4);     // ปี DOT
      var ws = [12, 23, 35, 48];
      for (var j = 0; j < ws.length && left > 0; j++) {
        var q = Math.min(left, Math.ceil(onHand / (4 - j)));
        weeks.push({ dot: base, week: ws[j], qty: q }); left -= q;
      }
      return weeks;
    }
    return {
      kind: 'mock',
      // GET /products?q=&group=&brand=&status=
      search: function (opt) {
        opt = opt || {}; var db = build(), out = [];
        Object.keys(db).forEach(function (code) {
          var p = db[code];
          if (opt.status && p.status !== opt.status) return;
          if (opt.group && p.group !== opt.group) return;
          if (opt.brand && p.brandCode !== opt.brand) return;
          if (opt.q) {
            var q = String(opt.q).toLowerCase();
            if ((p.code13 + ' ' + p.name + ' ' + p.brandCode + ' ' + p.size + ' ' + p.model).toLowerCase().indexOf(q) < 0) return;
          }
          out.push({ code13: p.code13, name: p.name, status: p.status, brandCode: p.brandCode, brandName: p.brandName, group: p.group, size: p.size, model: p.model });
        });
        return Promise.resolve(out);
      },
      // GET /products/{code13}
      get: function (code) {
        var db = build(), p = db[String(code).trim()];
        if (!p) return Promise.resolve(null);
        return Promise.resolve(JSON.parse(JSON.stringify(p)));
      },
      // POST /products/batch
      batch: function (codes) {
        var db = build();
        return Promise.resolve((codes || []).map(function (c) { var p = db[String(c).trim()]; return p ? JSON.parse(JSON.stringify(p)) : null; }));
      },
      // PUT /products/{code13}/prices  (เขียนได้เฉพาะ salePrice1..5)
      pushPrices: function (code, prices) {
        var db = build(), p = db[String(code).trim()];
        if (!p) return Promise.resolve({ ok: false, err: 'not_found' });
        var updated = {};
        Object.keys(prices || {}).forEach(function (k) {
          if (!WRITABLE[k]) return;                 // กฎเหล็ก: ข้ามฟิลด์นอก whitelist
          p[k] = num(prices[k]); updated[k] = p[k];
        });
        return Promise.resolve({ ok: true, updated: updated, serverTime: Date.now() });
      }
    };
  }

  // ---------- enrich / category / config stores (ฝั่งเรา) ----------
  function lsGet(key, def) { try { var v = JSON.parse(localStorage.getItem(key)); return v == null ? def : v; } catch (e) { return def; } }
  function lsSet(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

  var K_ENRICH = 'dbx_enrich';       // { code13: { setSize, flags:{special,clearance,rare,needsWithdraw,...}, note } }
  var K_CATRULE = 'dbx_catrules';    // { group: { checkSet:bool, setSize:n } }
  var K_CONFIG = 'dbx_config';       // { baseUrl, token, useAuth, adapter:'mock'|'http' }
  var DEFAULT_SETSIZE = 4;

  function enrichAll() { return lsGet(K_ENRICH, {}); }
  function enrichGet(code) { return enrichAll()[code] || null; }
  function enrichSet(code, obj) { var a = enrichAll(); a[code] = Object.assign(a[code] || {}, obj); lsSet(K_ENRICH, a); }
  function enrichClear(code) { var a = enrichAll(); delete a[code]; lsSet(K_ENRICH, a); }

  function catRules() { return lsGet(K_CATRULE, {}); }
  function catRuleSet(group, obj) { var a = catRules(); a[group] = Object.assign(a[group] || {}, obj); lsSet(K_CATRULE, a); }

  // ---------- ฟิลด์/หมวดที่ผู้ใช้เพิ่มเอง (custom field catalog) ----------
  // ฟิลด์ที่เพิ่มเองเป็น read-only เสมอ (whitelist เขียนได้ถูกล็อกไว้ที่ 5 ราคาในระดับโค้ด)
  var K_CUSTOMFIELDS = 'dbx_customfields';   // [{ key, label, group }]
  var K_CUSTOMCATS = 'dbx_customcats';       // [ชื่อหมวดที่เพิ่มเอง — รวมหมวดที่ยังไม่มีฟิลด์]
  function customFields() { return lsGet(K_CUSTOMFIELDS, []); }
  function saveCustomFields(arr) { lsSet(K_CUSTOMFIELDS, Array.isArray(arr) ? arr : []); }
  function customCats() { return lsGet(K_CUSTOMCATS, []); }
  function saveCustomCats(arr) { lsSet(K_CUSTOMCATS, Array.isArray(arr) ? arr : []); }
  var K_FIELDOFF = 'dbx_fieldoff';   // [field keys ที่ปิดไว้ — ไม่แสดงในเมนูผูกคอลัมน์]
  function fieldOff() { return lsGet(K_FIELDOFF, []); }
  function isFieldEnabled(key) { return fieldOff().indexOf(key) < 0; }
  function setFieldEnabled(key, on) {
    var a = fieldOff(), i = a.indexOf(key);
    if (on && i >= 0) a.splice(i, 1);
    else if (!on && i < 0) a.push(key);
    lsSet(K_FIELDOFF, a);
  }
  function allFields() { return FIELDS.concat(customFields()); }
  function enabledFields() { return allFields().filter(function (f) { return isFieldEnabled(f.key); }); }
  // รายชื่อหมวดตามลำดับ: หมวดของฟิลด์หลัก → หมวดที่เพิ่มเอง (รวมที่ว่าง)
  function allGroups() {
    var seen = {}, out = [];
    FIELDS.forEach(function (f) { if (!seen[f.group]) { seen[f.group] = 1; out.push(f.group); } });
    customFields().forEach(function (f) { if (f.group && !seen[f.group]) { seen[f.group] = 1; out.push(f.group); } });
    customCats().forEach(function (g) { if (g && !seen[g]) { seen[g] = 1; out.push(g); } });
    return out;
  }
  function fieldsInGroup(g, onlyEnabled) { return (onlyEnabled ? enabledFields() : allFields()).filter(function (f) { return f.group === g; }); }

  // setSize 3 ชั้น: รายสินค้า → รายหมวด → default 4
  function resolveSetSize(clean) {
    var en = clean.enrich || {};
    if (en.setSize === 'none' || en.setSize === 0) return { check: false, size: 0 };
    if (typeof en.setSize === 'number') return { check: true, size: en.setSize };
    var cr = catRules()[clean.group];
    if (cr) { if (cr.checkSet === false) return { check: false, size: 0 }; if (cr.setSize) return { check: true, size: cr.setSize }; }
    return { check: true, size: DEFAULT_SETSIZE };
  }

  // ---------- ⑥ Status engine (จุดสีสต็อก + ไอคอน attribute · กฎ auto) ----------
  var K_STATUSDEFS = 'dbx_statusdefs';
  var K_ICONFAV = 'dbx_iconfav';
  // นิยามสถานะเริ่มต้น (แก้ได้ใน Tab ตั้งค่า) — kind:'dot' สต็อก (เลือกได้อันเดียว) · 'icon' attribute (หลายอัน)
  var DEFAULT_STATUS_DEFS = [
    { key: 'out', kind: 'dot', label: 'หมด', icon: '●', color: 'E5322E', cond: 'out', priority: 1, enabled: true, popup: 'สินค้าหมด (คงเหลือ 0)' },
    { key: 'reserved0', kind: 'dot', label: 'ติดจองจนหมด', icon: '●', color: 'F39C12', cond: 'avail0', priority: 2, enabled: true, popup: 'มีของแต่ติดจองจนคงเหลือสุทธิ ≤ 0' },
    { key: 'full', kind: 'dot', label: 'ครบชุด', icon: '●', color: '15A34A', cond: 'full', priority: 3, enabled: true, popup: 'คงเหลือสุทธิครบชุด' },
    { key: 'partialReserved', kind: 'dot', label: 'ติดจอง: สุทธิไม่ครบชุด', icon: '●', color: '8E44AD', cond: 'reservedPartial', priority: 4, enabled: true, popup: 'ของรวมครบชุด แต่หักจองแล้วไม่ครบชุด' },
    { key: 'shortStock', kind: 'dot', label: 'ของไม่ถึงชุด', icon: '●', color: '3498DB', cond: 'shortStock', priority: 5, enabled: true, popup: 'ของจริงมีไม่ถึงชุด' },
    { key: 'incoming', kind: 'icon', label: 'ของกำลังเข้า', icon: '🚚', color: '', cond: 'incoming', priority: 6, enabled: true, popup: 'ของกำลังเข้า/รอดึงจากโกดัง' },
    { key: 'withdraw', kind: 'icon', label: 'ต้องเบิก', icon: '➕', color: '15A34A', cond: 'flag:needsWithdraw', priority: 7, enabled: true, popup: 'ต้องเบิกจากคลัง' },
    { key: 'special', kind: 'icon', label: 'ราคา NET พิเศษ', icon: '⭐', color: 'F1C40F', cond: 'flag:special', priority: 8, enabled: true, popup: 'ราคา NET พิเศษ' },
    { key: 'clearance', kind: 'icon', label: 'ราคาโละ', icon: '🪣', color: 'E67E22', cond: 'flag:clearance', priority: 9, enabled: true, popup: 'ราคาโละสต็อก (เทออก)' },
    { key: 'rare', kind: 'icon', label: 'หายาก', icon: '💎', color: '3498DB', cond: 'flag:rare', priority: 10, enabled: true, popup: 'สินค้าหายาก' }
  ];
  function statusDefs() {
    var s = lsGet(K_STATUSDEFS, null);
    if (!Array.isArray(s) || !s.length) return DEFAULT_STATUS_DEFS.map(function (d) { return Object.assign({}, d); });
    return s;
  }
  function saveStatusDefs(arr) { lsSet(K_STATUSDEFS, arr); }
  function resetStatusDefs() { localStorage.removeItem(K_STATUSDEFS); }
  function iconFav() { return lsGet(K_ICONFAV, ['🚚', '➕', '⭐', '🫗', '💎', '🔥', '⚠️', '🏷️']); }
  function saveIconFav(a) { lsSet(K_ICONFAV, a); }
  // ประเมินเงื่อนไขกับ clean model
  function evalCond(cond, c) {
    var ss = c._setSize || { check: true, size: DEFAULT_SETSIZE };
    var onHand = c.qtyOnHand || 0, avail = c.qtyAvailable || 0, size = ss.size || 0, check = ss.check;
    switch (cond) {
      case 'out': return onHand <= 0;
      case 'avail0': return onHand > 0 && avail <= 0;
      case 'reservedPartial': return check && onHand >= size && avail < size;
      case 'shortStock': return check && onHand > 0 && onHand < size;
      case 'full': return check ? avail >= size : avail > 0;
      case 'incoming': return (c.incoming || 0) > 0;
      default:
        if (cond && cond.indexOf('flag:') === 0) { var f = cond.slice(5); return !!(c.flags && c.flags[f]); }
        return false;
    }
  }
  // คืนรายการสถานะที่ match (auto) — จุดสต็อกเลือกอันเดียว (priority สูงสุด) · ไอคอนได้หลายอัน
  // คืนรายการสถานะที่ match — สถานะสต็อก (เงื่อนไขกลุ่มสต็อก) เลือกอันเดียว priority สูงสุด · ป้ายอื่นได้หลายอัน · ทุกอันเป็น "ไอคอน" (เติมสีที่เลือก + ขอบดำ)
  var STOCK_CONDS = ['out', 'avail0', 'reservedPartial', 'shortStock', 'full'];
  function computeStatus(clean, cap) {
    if (!clean) return [];
    var defs = statusDefs().filter(function (d) { return d.enabled !== false; }).sort(function (a, b) { return (a.priority || 99) - (b.priority || 99); });
    var stockPicked = null, others = [];
    defs.forEach(function (d) {
      if (!evalCond(d.cond, clean)) return;
      if (STOCK_CONDS.indexOf(d.cond) >= 0) { if (!stockPicked) stockPicked = d; }
      else others.push(d);
    });
    var out = [];
    if (stockPicked) out.push(stockPicked);
    out = out.concat(others);
    return out.slice(0, cap || 4);
  }
  function statusDefByKey(k) { return statusDefs().filter(function (d) { return d.key === k; })[0] || null; }

  // ---------- ⑤+⑧ Audit log · ประวัติราคา (3 รอบ) · ผู้ใช้ปัจจุบัน (ฝั่งเรา) ----------
  var K_AUDIT = 'dbx_audit';        // [{ ts, code13, name, field, oldV, newV, user, device, result }]
  var K_HISTORY = 'dbx_pricehist';  // { code13: { field: [{v, ts}, ...max3] } }
  var K_USER = 'dbx_user';
  function auditAll() { return lsGet(K_AUDIT, []); }
  function logAudit(entries) {
    if (!entries || !entries.length) return;
    var a = auditAll(); a = entries.concat(a); if (a.length > 5000) a = a.slice(0, 5000); lsSet(K_AUDIT, a);
  }
  function auditSearch(opt) {
    opt = opt || {}; var q = (opt.q || '').toLowerCase();
    return auditAll().filter(function (e) {
      if (opt.code && e.code13 !== opt.code) return false;
      if (opt.from && e.ts < opt.from) return false;
      if (opt.to && e.ts > opt.to) return false;
      if (q && (e.code13 + ' ' + (e.name || '') + ' ' + e.field + ' ' + (e.user || '')).toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
  }
  function priceHistAll() { return lsGet(K_HISTORY, {}); }
  function priceHistory(code) { return priceHistAll()[code] || {}; }
  function pushPriceHistory(code, field, val, ts) {
    var h = priceHistAll(); h[code] = h[code] || {}; var arr = h[code][field] || [];
    arr.unshift({ v: val, ts: ts || Date.now() }); h[code][field] = arr.slice(0, 3); lsSet(K_HISTORY, h);
  }
  function currentUser() { return localStorage.getItem(K_USER) || ''; }
  function setCurrentUser(u) { localStorage.setItem(K_USER, u || ''); }
  // ---------- ⑦ Permission Layer (ครอบ login เดิม) + Device log ----------
  var K_PERM = 'dbx_perms';       // { username: { role, perms:{...} } }
  var K_SESSION = 'dbx_sessions'; // [{ ts, user, role, device, screen, lang, tz, result }]
  var PERM_KEYS = ['viewSheet', 'editPrice', 'pushDB', 'linkDB', 'manageStaging', 'manageIcons', 'manageUsers', 'viewAudit', 'schedule'];
  var ROLE_PRESET = {
    admin: { viewSheet: true, editPrice: true, pushDB: true, linkDB: true, manageStaging: true, manageIcons: true, manageUsers: true, viewAudit: true, schedule: true },
    manager: { viewSheet: true, editPrice: true, pushDB: false, linkDB: true, manageStaging: true, manageIcons: false, manageUsers: false, viewAudit: true, schedule: false },
    user: { viewSheet: true, editPrice: false, pushDB: false, linkDB: false, manageStaging: false, manageIcons: false, manageUsers: false, viewAudit: false, schedule: false }
  };
  function permAll() { return lsGet(K_PERM, {}); }
  function permGet(user) { var a = permAll()[user]; if (a) return a; return { role: 'user', perms: Object.assign({}, ROLE_PRESET.user) }; }
  function permSet(user, obj) { var a = permAll(); a[user] = Object.assign(a[user] || {}, obj); lsSet(K_PERM, a); }
  function permSetRole(user, role) { var a = permAll(); a[user] = { role: role, perms: Object.assign({}, ROLE_PRESET[role] || ROLE_PRESET.user) }; lsSet(K_PERM, a); }
  function hasPerm(key) { var u = currentUser(); if (!u) return true; return !!permGet(u).perms[key]; }
  function sessionLog() { return lsGet(K_SESSION, []); }
  function logSession(user, result) {
    var d = deviceInfo(); var a = sessionLog();
    a.unshift({ ts: Date.now(), user: user || currentUser(), role: permGet(user || currentUser()).role, device: d.platform, ua: d.ua, screen: d.screen, lang: d.lang, tz: d.tz, result: result || 'ok' });
    if (a.length > 2000) a = a.slice(0, 2000); lsSet(K_SESSION, a);
  }
  // ---------- ⑧ กฎคำนวณราคาเครดิต / VAT (ฝั่งเรา) ----------
  var K_PRICERULE = 'dbx_pricerules';
  // creditBrackets: ช่วงราคา/ชิ้น → ส่วนเพิ่ม (บาท) · upTo=ขอบบนของช่วง (เรียงน้อย→มาก) · แถวสุดท้าย upTo=null = ขึ้นไป
  // ขอบล่างของแต่ละช่วง = (upTo ของแถวก่อนหน้า + 1) → ต่อเนื่องไม่มีช่องว่างอัตโนมัติ
  var DEFAULT_CREDIT_BRACKETS = [
    { upTo: 999, add: 0 }, { upTo: 3000, add: 100 }, { upTo: 5000, add: 200 },
    { upTo: 10000, add: 300 }, { upTo: 16000, add: 400 }, { upTo: 20000, add: 500 },
    { upTo: 30000, add: 1000 }, { upTo: 40000, add: 1500 }, { upTo: 50000, add: 2000 },
    { upTo: 60000, add: 2500 }, { upTo: 70000, add: 3000 }, { upTo: 80000, add: 3500 },
    { upTo: 90000, add: 4000 }, { upTo: 100000, add: 4500 }, { upTo: null, add: 5000 }
  ];
  var PRICE_RULE_DEF = { vatRate: 0.07, creditMarkup: 0, roundStep: 10, roundMode: 'ceil', creditBrackets: DEFAULT_CREDIT_BRACKETS };
  function pricingRules() { var r = lsGet(K_PRICERULE, null); var o = Object.assign({}, PRICE_RULE_DEF, r || {}); if (!Array.isArray(o.creditBrackets) || !o.creditBrackets.length) o.creditBrackets = DEFAULT_CREDIT_BRACKETS.slice(); return o; }
  function setPricingRules(o) { lsSet(K_PRICERULE, Object.assign(pricingRules(), o)); }
  function resetCreditBrackets() { setPricingRules({ creditBrackets: DEFAULT_CREDIT_BRACKETS.map(function (b) { return { upTo: b.upTo, add: b.add }; }) }); }
  // ส่วนเพิ่มเครดิตตามมูลค่า/ชิ้น (บาท)
  function creditBracketAdd(value) {
    value = +value || 0;
    var bs = pricingRules().creditBrackets.slice().sort(function (a, b) { return (a.upTo == null ? Infinity : a.upTo) - (b.upTo == null ? Infinity : b.upTo); });
    for (var i = 0; i < bs.length; i++) { if (bs[i].upTo == null || value <= bs[i].upTo) return +bs[i].add || 0; }
    return bs.length ? (+bs[bs.length - 1].add || 0) : 0;
  }
  function roundTo(v, step, mode) {
    if (!step || step <= 0) return Math.round(v);
    if (mode === 'floor') return Math.floor(v / step) * step;
    if (mode === 'round') return Math.round(v / step) * step;
    return Math.ceil(v / step) * step;   // ceil (ปัดขึ้น) — ค่าเริ่มต้น
  }
  function computePricing(base) {
    base = +base || 0;
    var r = pricingRules();
    var bracketAdd = creditBracketAdd(base);
    var credit = base * (1 + (r.creditMarkup || 0) / 100) + bracketAdd;
    var creditVat = credit * (1 + (r.vatRate || 0));
    function r2(v) { return Math.round(v * 100) / 100; }
    return {
      cash: base,
      bracketAdd: bracketAdd,
      credit: r2(credit),
      creditVat: r2(creditVat),
      creditVatRounded: roundTo(creditVat, r.roundStep, r.roundMode),
      vatRate: r.vatRate, roundStep: r.roundStep
    };
  }
  function deviceInfo() {
    var n = navigator;
    return { ua: n.userAgent, platform: n.platform || '', lang: n.language || '', screen: (screen.width + 'x' + screen.height), tz: (Intl.DateTimeFormat().resolvedOptions().timeZone || '') };
  }

  // ---------- ③④ Enrich + Normalize → clean model ----------
  function toClean(raw) {
    if (!raw) return null;
    var c = JSON.parse(JSON.stringify(raw));
    c.qtyAvailable = (c.qtyOnHand || 0) - (c.qtyReserved || 0);
    c.enrich = enrichGet(c.code13) || {};
    c.flags = c.enrich.flags || {};
    c._setSize = resolveSetSize(c);
    // รูปสินค้า: DB จริงส่ง array ของ URL · mock สร้างจำนวน 4-6 ช่อง (ยังไม่มี URL จริง → โชว์ placeholder)
    if (!Array.isArray(c.images)) {
      if (c.imageUrl) c.images = [{ url: c.imageUrl }];
      else { var n = 4 + (parseInt((c.code13 || '0').slice(-1), 10) % 3); c.images = []; for (var i = 0; i < n; i++) c.images.push({ url: '' }); }
    }
    return c;
  }

  // ---------- public API ----------
  var adapter = MockAdapter();
  var DBX = {
    FIELDS: FIELDS, fieldLabel: fieldLabel, isWritable: isWritable,
    customFields: customFields, saveCustomFields: saveCustomFields, customCats: customCats, saveCustomCats: saveCustomCats,
    allFields: allFields, allGroups: allGroups, fieldsInGroup: fieldsInGroup,
    enabledFields: enabledFields, isFieldEnabled: isFieldEnabled, setFieldEnabled: setFieldEnabled,
    DEFAULT_SETSIZE: DEFAULT_SETSIZE,
    // adapter control (สลับ mock/http ภายหลัง)
    adapter: function () { return adapter; },
    setAdapter: function (a) { adapter = a; },
    config: function () { return lsGet(K_CONFIG, { baseUrl: '', token: '', useAuth: false, adapter: 'mock' }); },
    setConfig: function (o) { lsSet(K_CONFIG, Object.assign(DBX.config(), o)); },
    // ② search / pull
    search: function (opt) { return adapter.search(opt); },
    getClean: function (code) { return adapter.get(code).then(toClean); },
    batchClean: function (codes) { return adapter.batch(codes).then(function (arr) { return arr.map(toClean); }); },
    // ⑤ push (เฉพาะ 5 ราคา)
    pushPrices: function (code, prices) {
      var safe = {}; Object.keys(prices || {}).forEach(function (k) { if (WRITABLE[k]) safe[k] = prices[k]; });
      return adapter.pushPrices(code, safe);
    },
    // enrich / category
    enrichGet: enrichGet, enrichSet: enrichSet, enrichClear: enrichClear, enrichAll: enrichAll,
    catRules: catRules, catRuleSet: catRuleSet, resolveSetSize: resolveSetSize,
    statusDefs: statusDefs, saveStatusDefs: saveStatusDefs, resetStatusDefs: resetStatusDefs, statusDefByKey: statusDefByKey,
    computeStatus: computeStatus, iconFav: iconFav, saveIconFav: saveIconFav,
    auditAll: auditAll, logAudit: logAudit, auditSearch: auditSearch,
    priceHistory: priceHistory, pushPriceHistory: pushPriceHistory,
    currentUser: currentUser, setCurrentUser: setCurrentUser, deviceInfo: deviceInfo,
    PERM_KEYS: PERM_KEYS, ROLE_PRESET: ROLE_PRESET, permAll: permAll, permGet: permGet, permSet: permSet, permSetRole: permSetRole, hasPerm: hasPerm,
    sessionLog: sessionLog, logSession: logSession,
    pricingRules: pricingRules, setPricingRules: setPricingRules, computePricing: computePricing,
    creditBracketAdd: creditBracketAdd, resetCreditBrackets: resetCreditBrackets,
    toClean: toClean
  };
  window.DBX = DBX;
})();
