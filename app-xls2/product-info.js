/* product-info.js — ข้อมูลสินค้าต่อ "ขนาด": ชนิดสินค้า + ความสูง/กว้าง (ยาง) + ฟิลด์เฉพาะชนิด + ชื่อเรียกหลายแบบ (alias)
   โหลดก่อน sheet-grid.js (sheet-grid เรียกผ่าน window.ProductInfo) · เปิด global: window.ProductInfo
   ────────────────────────────────────────────────────────────────────────
   หลักการ:
   • โปรแกรมคำนวณเอง (เมตริก/บอลลูน/ยางเกษตรนิ้วมาตรฐาน) → ถ้าไม่มั่นใจ/ไม่รู้ = ให้แอดมินกรอกเอง
   • ชนิดสินค้าขยายได้ (TYPES) — เพิ่มชนิดใหม่ในอนาคตได้ที่เดียว
   • ยาง 1 เส้นเรียกได้หลายชื่อ (alias) → ผูกชื่อเข้าหากัน ใช้ค่าชุดเดียวกัน
   • เก็บใน localStorage (per-device) · ออกแบบให้ sync ขึ้น Worker ได้ภายหลัง
   API:
     ProductInfo.get(sizeText)          → { name, type, typeDef, dims:{hCm,wCm}, approx, fields, aliases, complete }
     ProductInfo.isComplete(sizeText)   → ข้อมูลครบ (ใช้ติดจุดเขียว)
     ProductInfo.setType(name, type) / setDims(name,hCm,wCm) / setField(name,key,val) / linkAlias(name, otherName) / unlink(name)
     ProductInfo.showPopup(sizeText, anchorEl, opts{isAdmin,onChange})
     ProductInfo.TYPES
*/
(function () {
  'use strict';
  var LSK = 'xls2_productinfo';

  // ── ชนิดสินค้า (ขยายได้) ──
  var TYPES = {
    tire:    { label: 'ยาง', icon: '🛞', dims: true, fields: [] },
    tube:    { label: 'ยางใน', icon: '⭕', dims: false, fields: [{ k: 'forSize', label: 'ใช้กับยางขนาด' }, { k: 'valve', label: 'วาล์ว (TR…)' }, { k: 'weight', label: 'น้ำหนัก (กก.)' }] },
    flap:    { label: 'ยางรอง (รองขอบ)', icon: '🔘', dims: false, fields: [{ k: 'forRim', label: 'สำหรับขอบ (นิ้ว)' }, { k: 'thick', label: 'ความหนา (มม.)' }, { k: 'weight', label: 'น้ำหนัก (กก.)' }] },
    wheel:   { label: 'กระทะ (ล้อ)', icon: '⚙️', dims: false, fields: [{ k: 'rim', label: 'ขอบ (นิ้ว)' }, { k: 'width', label: 'กว้าง (J)' }, { k: 'pcd', label: 'รู/PCD' }, { k: 'offset', label: 'ออฟเซ็ต (ET)' }, { k: 'weight', label: 'น้ำหนัก (กก.)' }] },
    trim:    { label: 'คิ้ว', icon: '✨', dims: false, fields: [{ k: 'forRim', label: 'ใช้กับขอบ (นิ้ว)' }, { k: 'material', label: 'วัสดุ/สี' }] },
    battery: { label: 'แบตเตอรี่', icon: '🔋', dims: false, fields: [{ k: 'ah', label: 'ความจุ (Ah)' }, { k: 'cca', label: 'CCA' }, { k: 'volt', label: 'แรงดัน (V)' }, { k: 'terminal', label: 'ขั้ว' }, { k: 'weight', label: 'น้ำหนัก (กก.)' }] },
    oil:     { label: 'น้ำมันหล่อลื่น', icon: '🛢️', dims: false, fields: [{ k: 'sae', label: 'เบอร์ (SAE)' }, { k: 'volume', label: 'ปริมาตร (ลิตร)' }, { k: 'api', label: 'มาตรฐาน (API)' }, { k: 'kind', label: 'ชนิด' }] },
    other:   { label: 'อื่นๆ', icon: '📦', dims: false, fields: [], freeform: true }
  };
  var TYPE_ORDER = ['tire', 'tube', 'flap', 'wheel', 'trim', 'battery', 'oil', 'other'];

  // ── ตารางแปลงยางเกษตรนิ้ว → หน้ายางเมตริก (มาตรฐาน R-1 ซีรีส์ 85) — ค่าที่มั่นใจ ──
  var INCH2METRIC = { 9.5: 240, 11.2: 280, 12.4: 320, 13.6: 340, 14.9: 380, 16.9: 420, 18.4: 460, 20.8: 520, 23.1: 580 };
  // ── ชื่อเรียกเก่า ↔ ใหม่ ของยางเส้นเดียวกัน (seed — แอดมินเพิ่มเองได้) ──
  var SEED_ALIAS = { '15-30': '18.4-30', '14-30': '16.9-30', '13-28': '14.9-28', '12-28': '13.6-28', '12-38': '13.6-38', '11-38': '12.4-38' };

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function load() { try { var o = JSON.parse(localStorage.getItem(LSK) || '{}'); o.type = o.type || {}; o.dims = o.dims || {}; o.fields = o.fields || {}; o.alias = o.alias || {}; return o; } catch (e) { return { type: {}, dims: {}, fields: {}, alias: {} }; } }
  function save(o) { try { localStorage.setItem(LSK, JSON.stringify(o)); } catch (e) {} }
  var store = load();

  function norm(s) { return String(s == null ? '' : s).trim().replace(/^\(\s*/, '').replace(/\s*\)$/, '').toUpperCase().replace(/\s+/g, ''); }
  function canonical(raw) { var n = norm(raw); return store.alias[n] || SEED_ALIAS[n] || n; }
  function aliasesOf(name) {
    var out = [];
    Object.keys(store.alias).forEach(function (k) { if (store.alias[k] === name && k !== name) out.push(k); });
    Object.keys(SEED_ALIAS).forEach(function (k) { if (SEED_ALIAS[k] === name && out.indexOf(k) < 0) out.push(k); });
    return out;
  }

  // คำนวณความสูง(เส้นผ่าศูนย์กลาง)+หน้ากว้าง จากชื่อขนาด → {hCm,wCm,approx,src} หรือ null
  function computeDims(raw) {
    var s = norm(raw);
    var m;
    // เมตริกมีซีรีส์: 460/85R30, 320/85-24, 205/75R14
    if ((m = /^(\d{2,3})\/(\d{2,3})[R-](\d{2}(?:\.\d)?)/.exec(s))) {
      var w = +m[1], ar = +m[2], rim = parseFloat(m[3]); return { hCm: (rim * 25.4 + 2 * w * ar / 100) / 10, wCm: w / 10, src: 'metric' };
    }
    // เมตริกไม่มีซีรีส์ (ตู้/กระบะ C): 195R14C, 205R16C → อนุมานซีรีส์ 80
    if ((m = /^(\d{3})R(\d{2}(?:\.\d)?)C?$/.exec(s))) {
      var w2 = +m[1], rim2 = parseFloat(m[2]); return { hCm: (rim2 * 25.4 + 2 * w2 * 0.8) / 10, wCm: w2 / 10, src: 'metric~80', approx: true };
    }
    // บอลลูน/ออฟโรด: 31X10.5R15, 33X12.5-15
    if ((m = /^(\d{2}(?:\.\d+)?)X(\d{1,2}(?:\.\d+)?)[R-]?(\d{2}(?:\.\d)?)/.exec(s))) {
      return { hCm: parseFloat(m[1]) * 2.54, wCm: parseFloat(m[2]) * 2.54, src: 'flotation' };
    }
    // ยางเกษตรนิ้ว: 18.4-30, 16.9R28, 11.2/12.4-24 (เอาหน้ายางตัวแรก)
    if ((m = /^(\d{1,2}(?:\.\d)?)(?:\/\d{1,2}(?:\.\d)?)*[R-](\d{2}(?:\.\d)?)$/.exec(s))) {
      var iw = parseFloat(m[1]), rim3 = parseFloat(m[2]), mw = INCH2METRIC[iw];
      if (mw) return { hCm: (rim3 * 25.4 + 2 * mw * 0.85) / 10, wCm: mw / 10, src: 'ag-inch' };
      return null;   // นอกตารางมาตรฐาน → ไม่เดา ให้แอดมินกรอก
    }
    return null;   // บรรทุกนิ้ว/โฟล์คลิฟต์/OTR/อื่นๆ → ให้แอดมินกรอกเอง
  }

  function get(raw) {
    var name = canonical(raw), type = store.type[name] || 'tire', td = TYPES[type] || TYPES.other;
    var info = { name: name, raw: raw, type: type, typeDef: td, aliases: aliasesOf(name) };
    if (td.dims) {
      var ov = store.dims[name];
      if (ov && ov.hCm != null) { info.dims = ov; info.dimSource = 'manual'; info.complete = true; }
      else { var c = computeDims(name); if (c) { info.dims = { hCm: c.hCm, wCm: c.wCm }; info.dimSource = c.src; info.approx = !!c.approx; info.complete = !c.approx; } else { info.complete = false; } }
    } else {
      info.fields = store.fields[name] || {};
      var req = td.fields || [];
      info.complete = req.length ? req.some(function (f) { return String(info.fields[f.k] || '').trim() !== ''; }) : true;
    }
    return info;
  }
  function isComplete(raw) { try { return !!get(raw).complete; } catch (e) { return false; } }

  function setType(raw, type) { var n = canonical(raw); if (type === 'tire') delete store.type[n]; else store.type[n] = type; save(store); }
  function setDims(raw, hCm, wCm) { var n = canonical(raw); if (hCm == null || hCm === '') delete store.dims[n]; else store.dims[n] = { hCm: +hCm, wCm: (wCm === '' || wCm == null) ? null : +wCm }; save(store); }
  function setField(raw, key, val) { var n = canonical(raw); store.fields[n] = store.fields[n] || {}; if (val === '' || val == null) delete store.fields[n][key]; else store.fields[n][key] = val; save(store); }
  function linkAlias(raw, otherRaw) { var canon = canonical(raw), other = norm(otherRaw); if (other && other !== canon) { store.alias[other] = canon; save(store); } }
  function unlink(raw) { var n = norm(raw); delete store.alias[n]; save(store); }

  // ════════════ CSS ════════════
  function injectCss() {
    if (document.getElementById('pi-css')) return;
    var s = document.createElement('style'); s.id = 'pi-css';
    s.textContent =
      '.pi-pop{position:fixed;z-index:9600;border:1.5px solid #F47C20;border-radius:13px;box-shadow:0 12px 34px rgba(0,0,0,.26);padding:13px 15px;font-family:Arial,Tahoma,sans-serif;min-width:210px;max-width:300px;background:#fff;}' +
      'body.dark .pi-pop{background:#2a2a2a;color:#eee;}' +
      '.pi-ttl{font:800 14px/1.2 inherit;color:#C75B00;display:flex;align-items:center;gap:6px;margin-bottom:3px;}' +
      '.pi-alias{font-size:11px;color:#9a8d80;margin-bottom:8px;}' +
      '.pi-lab{font-size:11px;color:#999;margin:7px 0 2px;}' +
      '.pi-pair{display:flex;gap:13px;align-items:baseline;}' +
      '.pi-num{font:800 19px/1 inherit;} body.dark .pi-num{color:#f0f0f0;} .pi-unit{font-size:12px;color:#888;}' +
      '.pi-frow{display:flex;justify-content:space-between;gap:10px;font-size:13px;padding:3px 0;border-bottom:1px dashed #eee;}' +
      'body.dark .pi-frow{border-color:#3a3a3a;} .pi-fk{color:#888;} .pi-fv{font-weight:700;}' +
      '.pi-note{font-size:10.5px;color:#bbb;margin-top:8px;}' +
      '.pi-empty{font-size:12.5px;color:#aaa;padding:6px 0;}' +
      '.pi-row{display:flex;gap:6px;margin-top:9px;flex-wrap:wrap;}' +
      '.pi-btn{height:30px;padding:0 11px;border:1px solid #e3ddd6;border-radius:8px;background:#f6f3f0;font:600 12px/1 inherit;color:#75695e;cursor:pointer;}' +
      '.pi-btn.pri{background:#F47C20;color:#fff;border:none;}' +
      '.pi-in{width:100%;height:34px;border:1px solid #cfcfcf;border-radius:8px;padding:0 10px;font:inherit;font-size:13px;box-sizing:border-box;margin-top:4px;background:inherit;color:inherit;}' +
      '.pi-sel{width:100%;height:34px;border:1px solid #cfcfcf;border-radius:8px;font:inherit;font-size:13px;margin-top:4px;background:inherit;color:inherit;}' +
      '.pi-ed{margin-top:8px;}.pi-ed label{display:block;font-size:11px;color:#999;margin-top:6px;}';
    document.head.appendChild(s);
  }

  var popEl = null;
  function close() { if (popEl) { popEl.style.display = 'none'; if (window.PopupStack) PopupStack.remove(popEl); } }
  function pairHtml(cmv, inv) {
    return '<div class="pi-pair"><div><span class="pi-num">' + cmv + '</span> <span class="pi-unit">ซม.</span></div><div style="color:#ccc;">·</div><div><span class="pi-num">' + inv + '</span> <span class="pi-unit">นิ้ว</span></div></div>';
  }

  // ════════════ ป๊อปอัปแสดงผล (ปรับตามชนิด) ════════════
  function showPopup(raw, anchor, opts) {
    opts = opts || {}; injectCss();
    if (!popEl) { popEl = document.createElement('div'); popEl.className = 'pi-pop'; document.body.appendChild(popEl); }
    render(raw, opts);
    popEl.style.display = 'block';
    var rc = anchor.getBoundingClientRect();
    popEl.style.left = Math.max(8, Math.min(rc.right + 6, window.innerWidth - popEl.offsetWidth - 12)) + 'px';
    popEl.style.top = Math.max(8, Math.min(rc.top, window.innerHeight - popEl.offsetHeight - 12)) + 'px';
    if (window.PopupStack) PopupStack.push(popEl, close);
  }

  function render(raw, opts, mode) {
    var info = get(raw), td = info.typeDef, isAdmin = !!opts.isAdmin;
    var aliasLine = info.aliases.length ? '<div class="pi-alias">เรียกอีกชื่อ: ' + info.aliases.map(esc).join(' · ') + '</div>' : '';
    var head = '<div class="pi-ttl">' + td.icon + ' ' + esc(info.name) + (info.complete ? ' <span style="color:#1F8A4C;">●</span>' : '') + '</div>' + aliasLine;
    var body = '';

    if (mode === 'editType') {
      body = '<div class="pi-lab">ชนิดสินค้า</div><select class="pi-sel" id="piType">' +
        TYPE_ORDER.map(function (t) { return '<option value="' + t + '"' + (t === info.type ? ' selected' : '') + '>' + TYPES[t].icon + ' ' + TYPES[t].label + '</option>'; }).join('') + '</select>' +
        '<div class="pi-row"><button class="pi-btn pri" id="piTypeOk">ตกลง</button><button class="pi-btn" id="piBack">ยกเลิก</button></div>';
    } else if (mode === 'edit') {
      var ed = '';
      if (td.dims) {
        ed = '<label>ความสูง — เส้นผ่าศูนย์กลางรวม (ซม.)</label><input class="pi-in" id="pi_hCm" inputmode="decimal" value="' + (info.dims && info.dims.hCm != null ? Math.round(info.dims.hCm * 10) / 10 : '') + '">' +
             '<label>หน้ากว้าง (ซม.)</label><input class="pi-in" id="pi_wCm" inputmode="decimal" value="' + (info.dims && info.dims.wCm != null ? Math.round(info.dims.wCm * 10) / 10 : '') + '">';
      } else {
        ed = (td.fields || []).map(function (f) { return '<label>' + esc(f.label) + '</label><input class="pi-in" data-fk="' + f.k + '" value="' + esc((info.fields && info.fields[f.k]) || '') + '">'; }).join('');
        if (td.freeform) ed += '<label>หมายเหตุ</label><input class="pi-in" data-fk="note" value="' + esc((info.fields && info.fields.note) || '') + '">';
        if (!ed) ed = '<div class="pi-empty">ชนิดนี้ยังไม่มีฟิลด์</div>';
      }
      body = '<div class="pi-ed">' + ed + '</div><div class="pi-row"><button class="pi-btn pri" id="piSave">บันทึก</button><button class="pi-btn" id="piBack">ยกเลิก</button></div>';
    } else if (mode === 'alias') {
      body = '<div class="pi-lab">ผูก "ชื่อเรียกอื่น" ของยางเส้นนี้ (พิมพ์ชื่อขนาดที่เรียกต่างกัน)</div>' +
        '<input class="pi-in" id="piAlias" placeholder="เช่น 15-30">' +
        '<div class="pi-row"><button class="pi-btn pri" id="piAliasOk">ผูก</button><button class="pi-btn" id="piBack">ยกเลิก</button></div>';
    } else {
      // ── มุมมองปกติ ──
      if (td.dims) {
        if (info.dims) {
          var cm = Math.round(info.dims.hCm * 10) / 10, inch = Math.round(info.dims.hCm / 2.54 * 10) / 10;
          body += '<div class="pi-lab">ความสูง (เส้นผ่าศูนย์กลางรวม)</div>' + pairHtml(cm, inch);
          if (info.dims.wCm != null) { var wc = Math.round(info.dims.wCm * 10) / 10, wi = Math.round(info.dims.wCm / 2.54 * 10) / 10; body += '<div class="pi-lab">หน้ากว้าง</div>' + pairHtml(wc, wi); }
          var srcNote = info.dimSource === 'manual' ? 'จากค่าที่กรอกไว้' : info.approx ? '≈ ประมาณ (โปรดยืนยัน)' : 'คำนวณจากขนาด';
          body += '<div class="pi-note">' + srcNote + '</div>';
        } else {
          body += '<div class="pi-empty">⚠️ ยังไม่มีข้อมูลความสูง/กว้างของขนาดนี้' + (isAdmin ? ' — กด “ใส่ค่า”' : ' — แจ้งแอดมิน') + '</div>';
        }
      } else {
        var rows = (td.fields || []).map(function (f) { var v = info.fields && info.fields[f.k]; return v ? '<div class="pi-frow"><span class="pi-fk">' + esc(f.label) + '</span><span class="pi-fv">' + esc(v) + '</span></div>' : ''; }).join('');
        if (td.freeform && info.fields && info.fields.note) rows += '<div class="pi-frow"><span class="pi-fk">หมายเหตุ</span><span class="pi-fv">' + esc(info.fields.note) + '</span></div>';
        body += '<div class="pi-lab">' + esc(td.label) + '</div>' + (rows || '<div class="pi-empty">ยังไม่มีรายละเอียด' + (isAdmin ? ' — กด “ใส่ค่า”' : '') + '</div>');
      }
      if (isAdmin) {
        body += '<div class="pi-row">' +
          '<button class="pi-btn pri" id="piEdit">✏️ ใส่ค่า</button>' +
          '<button class="pi-btn" id="piEditType">เปลี่ยนชนิด</button>' +
          (td.dims ? '<button class="pi-btn" id="piAliasBtn">ผูกชื่ออื่น</button>' : '') +
          '</div>';
      }
    }
    popEl.innerHTML = head + body;
    wire(raw, opts, mode);
  }

  function wire(raw, opts, mode) {
    function re(m) { render(raw, opts, m); reposition(); }
    function done() { close(); if (opts.onChange) opts.onChange(); }
    var q = function (id) { return popEl.querySelector(id); };
    if (q('#piBack')) q('#piBack').onclick = function () { re(null); };
    if (q('#piEdit')) q('#piEdit').onclick = function () { re('edit'); };
    if (q('#piEditType')) q('#piEditType').onclick = function () { re('editType'); };
    if (q('#piAliasBtn')) q('#piAliasBtn').onclick = function () { re('alias'); };
    if (q('#piTypeOk')) q('#piTypeOk').onclick = function () { setType(raw, q('#piType').value); re(null); done(); };
    if (q('#piAliasOk')) q('#piAliasOk').onclick = function () { var v = q('#piAlias').value.trim(); if (v) linkAlias(raw, v); re(null); done(); };
    if (q('#piSave')) q('#piSave').onclick = function () {
      var info = get(raw), td = info.typeDef;
      if (td.dims) { setDims(raw, q('#pi_hCm').value.trim(), q('#pi_wCm').value.trim()); }
      else { popEl.querySelectorAll('[data-fk]').forEach(function (inp) { setField(raw, inp.dataset.fk, inp.value.trim()); }); }
      re(null); done();
    };
  }
  function reposition() { if (!popEl) return; var r = popEl.getBoundingClientRect(); if (r.bottom > window.innerHeight - 8) popEl.style.top = Math.max(8, window.innerHeight - popEl.offsetHeight - 12) + 'px'; }

  function exportData() { return { type: store.type, dims: store.dims, fields: store.fields, alias: store.alias }; }
  function importData(d, replace) { if (!d) return; if (replace) { store.type = d.type || {}; store.dims = d.dims || {}; store.fields = d.fields || {}; store.alias = d.alias || {}; } else { ['type', 'dims', 'fields', 'alias'].forEach(function (k) { var r = d[k] || {}; Object.keys(r).forEach(function (n) { if (store[k][n] == null) store[k][n] = r[n]; }); }); } save(store); }
  function listKnown() { var s = {}; ['type', 'dims', 'fields', 'alias'].forEach(function (k) { Object.keys(store[k]).forEach(function (n) { s[n] = 1; }); }); return Object.keys(s); }
  function syncPull() { if (!window.Registry || !Registry.prodInfoGet) return Promise.resolve(false); return Registry.prodInfoGet().then(function (res) { if (res && res.ok && res.data) { importData(res.data, false); return true; } return false; }).catch(function () { return false; }); }
  function syncPush(adminKey, by) { if (!window.Registry || !Registry.prodInfoSet) return Promise.resolve({ error: 'ไม่มีโมดูล Registry' }); return Registry.prodInfoSet(adminKey, exportData(), by); }

  window.ProductInfo = {
    TYPES: TYPES, TYPE_ORDER: TYPE_ORDER, get: get, isComplete: isComplete, computeDims: computeDims,
    setType: setType, setDims: setDims, setField: setField, linkAlias: linkAlias, unlink: unlink,
    showPopup: showPopup, close: close,
    exportData: exportData, importData: importData, listKnown: listKnown, syncPull: syncPull, syncPush: syncPush
  };

  (function markerCss() {
    if (document.getElementById('pi-marker-css')) return;
    var s = document.createElement('style'); s.id = 'pi-marker-css';
    s.textContent = '.sg-pi-done{position:absolute;top:0;right:0;width:0;height:0;border-top:7px solid #1F8A4C;border-left:7px solid transparent;pointer-events:none;z-index:2;}';
    (document.head || document.documentElement).appendChild(s);
  })();

  // ดึงข้อมูลจากส่วนกลางรอบละครั้งต่อเซสชัน (best-effort · ได้ข้อมูลที่แอดมินแชร์ไว้)
  try {
    if (!sessionStorage.getItem('xls2_prodinfo_pulled')) {
      sessionStorage.setItem('xls2_prodinfo_pulled', '1');
      setTimeout(function () { syncPull().then(function (ok) { if (ok && window.SG && SG.render) SG.render(); }); }, 1500);
    }
  } catch (e) {}
})();
