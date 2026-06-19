/* admin-central.js — แผง "ระบบกลาง" (ต่อ Cloudflare Worker ผ่าน window.Registry)
   เปิด global: window.AdminCentral { open, close }
   ────────────────────────────────────────────────────────────────────────
   gate ด้วย ADMIN_KEY (เก็บใน RAM รอบเดียว ไม่บันทึกลงเครื่อง) · ทุก action ตรวจ adminKey ที่ Worker อีกชั้น
   3 แท็บ:
     📱 อุปกรณ์   — คำขอ pending (อ่านรหัส OTP ให้ผู้ใช้) · อุปกรณ์ที่ใช้งานอยู่ (เพิกถอน) · log
     🏷️ ตำแหน่ง  — สร้าง/แก้ตำแหน่ง: ซ่อนคอลัมน์ (ดูได้เฉพาะ/ดูไม่ได้เฉพาะ) + ซ่อนแถว (กลุ่ม/หมวด/ยี่ห้อ/รหัส)
     👥 ผูกผู้ใช้ — PIN user แต่ละคน → ตำแหน่ง (ทุกคนต้องผูก)
   หมายเหตุ: การ "บังคับซ่อนจริงบนตาราง" อยู่ในไฟล์ perm-enforce.js (ทำงานตอน render)
*/
(function () {
  'use strict';
  var adminKey = null;     // RAM เท่านั้น
  var ov = null, tab = 'devices';
  var cache = { positions: [], userpos: {} };   // สำเนาที่กำลังแก้ (commit เมื่อกด "บันทึก")
  var dirty = false;

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function toast(s) { if (window.SG && SG.toast) SG.toast(s); else if (window.toast) window.toast(s); }
  function fmtTs(ts) { if (!ts) return ''; var d = new Date(ts); return d.toLocaleDateString('th-TH') + ' ' + d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }); }
  function uid() { return 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5); }

  // รายชื่อ PIN user ที่รู้จัก (จาก permission layer เดิม + log + login ปัจจุบัน + ที่ผูกตำแหน่งไว้)
  function knownUsers() {
    var u = {};
    try { if (window.DBX) { var cur = DBX.currentUser(); if (cur) u[cur] = 1; Object.keys(DBX.permAll() || {}).forEach(function (k) { u[k] = 1; }); (DBX.sessionLog() || []).forEach(function (s) { if (s.user) u[s.user] = 1; }); } } catch (e) {}
    try { if (window.Auth && Auth.currentUser()) u[Auth.currentUser()] = 1; } catch (e) {}
    Object.keys(cache.userpos || {}).forEach(function (k) { u[k] = 1; });
    return Object.keys(u).sort();
  }
  // มิติแถว: ดึงค่าที่มีจริงจากสินค้า (ยี่ห้อ/กลุ่ม/หมวด) ถ้าทำได้ → เป็นตัวช่วยเลือก
  function rowDimValues(dim) {
    var set = {};
    try {
      var list = (window.DBX && DBX.search) ? DBX.search({}) : [];
      (list || []).forEach(function (p) {
        var v = dim === 'brand' ? (p.brandCode || p.brand) : dim === 'group' ? p.group : dim === 'cat' ? (p.category || p.cat) : null;
        if (v) set[v] = 1;
      });
    } catch (e) {}
    return Object.keys(set).sort();
  }

  // ──────────────── CSS ────────────────
  function css() {
    if (document.getElementById('ac-css')) return;
    var s = document.createElement('style'); s.id = 'ac-css';
    s.textContent =
      '.ac-ov{position:fixed;inset:0;z-index:100050;background:rgba(20,16,10,.72);backdrop-filter:blur(3px);display:flex;align-items:center;justify-content:center;font-family:Arial,Tahoma,sans-serif;}' +
      '.ac-win{width:880px;max-width:96vw;height:min(92vh,640px);background:#fff;border-radius:14px;box-shadow:0 26px 80px rgba(0,0,0,.5);display:flex;flex-direction:column;overflow:hidden;}' +
      '.ac-head{flex:none;background:#F47C20;color:#fff;padding:12px 16px;font-size:14px;font-weight:800;display:flex;align-items:center;justify-content:space-between;}' +
      '.ac-x{cursor:pointer;font-size:18px;border:none;background:none;color:#fff;}' +
      '.ac-tabs{flex:none;display:flex;gap:2px;background:#f4f0ec;padding:6px 8px 0;border-bottom:1px solid #e3ddd6;}' +
      '.ac-tab{border:none;background:none;padding:9px 16px;font:600 13px/1 inherit;color:#8a7f74;cursor:pointer;border-radius:8px 8px 0 0;}' +
      '.ac-tab.on{background:#fff;color:#C75B00;box-shadow:0 -2px 0 #F47C20 inset;}' +
      '.ac-body{flex:1;min-height:0;overflow:auto;padding:16px 18px;}' +
      '.ac-foot{flex:none;border-top:1px solid #eee;padding:9px 16px;display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:12px;color:#999;}' +
      '.ac-gate{max-width:340px;margin:8% auto;text-align:center;}' +
      '.ac-gate .ic{font-size:40px;}.ac-gate h2{font-size:16px;color:#333;margin:8px 0 4px;}.ac-gate p{font-size:12.5px;color:#999;margin:0 0 16px;line-height:1.5;}' +
      '.ac-in{width:100%;height:44px;border:1px solid #cfcfcf;border-radius:11px;padding:0 13px;font-size:15px;font-family:inherit;box-sizing:border-box;}' +
      '.ac-in:focus{outline:2px solid #F47C20;border-color:#F47C20;}' +
      '.ac-btn{height:40px;padding:0 18px;border:none;border-radius:10px;background:#F47C20;color:#fff;font:800 14px/1 inherit;cursor:pointer;}' +
      '.ac-btn:hover{background:#e06f12;}.ac-btn.gho{background:#f0ece8;color:#75695e;}.ac-btn.gho:hover{background:#e6e0d9;}.ac-btn.dng{background:#fff;color:#C0392B;border:1.5px solid #e3b4ad;}.ac-btn.sm{height:32px;padding:0 12px;font-size:12.5px;border-radius:8px;}' +
      '.ac-btn:disabled{opacity:.5;cursor:default;}' +
      '.ac-sec{font-size:12px;font-weight:800;color:#9a8d80;text-transform:uppercase;letter-spacing:.04em;margin:4px 0 8px;}' +
      '.ac-tbl{width:100%;border-collapse:collapse;font-size:13px;}' +
      '.ac-tbl th{text-align:left;font-size:11px;color:#aaa;font-weight:700;padding:6px 8px;border-bottom:1px solid #eee;}' +
      '.ac-tbl td{padding:7px 8px;border-bottom:1px solid #f2f2f2;vertical-align:middle;}' +
      '.ac-otp{font:800 17px/1 ui-monospace,monospace;letter-spacing:3px;color:#C75B00;background:#FFF3E6;padding:5px 9px;border-radius:7px;display:inline-block;}' +
      '.ac-tag{display:inline-block;font-size:11px;padding:2px 8px;border-radius:999px;background:#eef;color:#447;}.ac-tag.shared{background:#e7f3ea;color:#1F8A4C;}.ac-tag.bound{background:#fdeede;color:#C75B00;}' +
      '.ac-empty{color:#bbb;font-size:13px;text-align:center;padding:26px;}' +
      '.ac-poslist{display:flex;flex-direction:column;gap:10px;}' +
      '.ac-pos{border:1px solid #e7e1da;border-radius:11px;padding:12px 14px;}' +
      '.ac-pos-top{display:flex;align-items:center;gap:8px;margin-bottom:8px;}' +
      '.ac-pos-name{flex:1;height:36px;border:1px solid #d8d2cb;border-radius:8px;padding:0 11px;font:700 14px/1 inherit;}' +
      '.ac-rule{display:grid;grid-template-columns:120px 1fr auto;gap:8px;margin-bottom:14px;align-items:start;}' +
      '.ac-rule .lab{font-size:12px;color:#777;padding-top:8px;}' +
      '.ac-mode{display:flex;gap:6px;margin-bottom:8px;}' +
      '.ac-mode button{flex:1;height:34px;border:1.5px solid #ddd;border-radius:8px;background:#fafafa;font:600 12px/1 inherit;color:#888;cursor:pointer;}' +
      '.ac-mode button.on{border-color:#F47C20;background:#FFF3E6;color:#C75B00;}' +
      '.ac-chips{display:flex;flex-wrap:wrap;gap:6px;}' +
      '.ac-chk{display:inline-flex;align-items:center;gap:5px;font-size:12px;background:#f6f3f0;border:1px solid #e7e1da;border-radius:7px;padding:4px 9px;cursor:pointer;}' +
      '.ac-chk input{margin:0;}.ac-chk.on{background:#FFF3E6;border-color:#F0B380;color:#C75B00;}' +
      '.ac-rowrule{display:flex;align-items:center;gap:6px;margin-bottom:6px;}' +
      '.ac-rowrule select,.ac-rowrule input{height:32px;border:1px solid #d8d2cb;border-radius:7px;padding:0 8px;font:inherit;font-size:12.5px;}' +
      '.ac-asg{display:grid;grid-template-columns:1fr 220px;gap:8px 14px;align-items:center;}' +
      '.ac-asg .u{font-size:13.5px;font-weight:600;color:#444;}' +
      '.ac-asg select{height:36px;border:1px solid #d8d2cb;border-radius:8px;padding:0 10px;font:inherit;}' +
      '.ac-asg select.none{border-color:#e3b4ad;background:#fdf2f0;}' +
      '.ac-msg{font-size:12.5px;}.ac-msg.err{color:#C0392B;}.ac-msg.ok{color:#1F8A4C;}' +
      'body.dark .ac-win{background:#262626;}body.dark .ac-body{color:#ddd;}body.dark .ac-in,body.dark .ac-pos-name{background:#333;border-color:#555;color:#eee;}body.dark .ac-pos{border-color:#3a3a3a;}';
    document.head.appendChild(s);
  }

  function open() {
    css();
    if (!window.Registry) { toast('ยังไม่มีโมดูล Registry'); return; }
    if (ov) ov.remove();
    ov = document.createElement('div'); ov.className = 'ac-ov';
    ov.addEventListener('mousedown', function (e) { if (e.target === ov) close(); });
    document.body.appendChild(ov);
    if (adminKey) shell(); else gate();
  }
  function close() { if (ov) { ov.remove(); ov = null; } }

  // ──────────────── ADMIN_KEY gate ────────────────
  function gate() {
    ov.innerHTML =
      '<div class="ac-win"><div class="ac-head"><span>🛡️ ระบบกลาง (Worker)</span><button class="ac-x">✕</button></div>' +
      '<div class="ac-body"><div class="ac-gate">' +
      '<div class="ic">🔑</div><h2>ใส่รหัสแอดมิน (ADMIN_KEY)</h2>' +
      '<p>รหัสเดียวกับที่ตั้งใน Cloudflare Worker<br>เก็บไว้ในหน่วยความจำรอบนี้เท่านั้น ไม่บันทึกลงเครื่อง</p>' +
      '<input class="ac-in" id="acKey" type="password" placeholder="ADMIN_KEY" autocomplete="off">' +
      '<div class="ac-msg err" id="acMsg" style="min-height:18px;margin:8px 0;"></div>' +
      '<button class="ac-btn" id="acGo" style="width:100%;height:46px;">เข้าสู่ระบบกลาง</button>' +
      '</div></div></div>';
    ov.querySelector('.ac-x').onclick = close;
    var inp = ov.querySelector('#acKey'), msg = ov.querySelector('#acMsg'), go = ov.querySelector('#acGo');
    setTimeout(function () { inp.focus(); }, 50);
    function submit() {
      var k = inp.value.trim(); if (!k) return;
      go.disabled = true; msg.className = 'ac-msg err'; msg.textContent = '';
      go.textContent = 'กำลังตรวจสอบ…';
      Registry.list(k).then(function (res) {
        go.disabled = false; go.textContent = 'เข้าสู่ระบบกลาง';
        if (res && res.ok) { adminKey = k; shell(); }
        else { msg.textContent = '❌ ' + ((res && res.error) || 'รหัสไม่ถูกต้อง'); }
      }).catch(function () { go.disabled = false; go.textContent = 'เข้าสู่ระบบกลาง'; msg.textContent = '❌ ต่อเซิร์ฟเวอร์ไม่ได้'; });
    }
    go.onclick = submit;
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); submit(); } });
  }

  // ──────────────── shell + แท็บ ────────────────
  function shell() {
    ov.innerHTML =
      '<div class="ac-win">' +
      '<div class="ac-head"><span>🛡️ ระบบกลาง (Worker)</span><button class="ac-x">✕</button></div>' +
      '<div class="ac-tabs">' +
      '<button class="ac-tab" data-t="devices">📱 อุปกรณ์</button>' +
      '<button class="ac-tab" data-t="positions">🏷️ ตำแหน่ง</button>' +
      '<button class="ac-tab" data-t="assign">👥 ผูกผู้ใช้</button>' +
      '</div>' +
      '<div class="ac-body" id="acBody"></div>' +
      '<div class="ac-foot"><span id="acFootMsg"></span><span></span></div>' +
      '</div>';
    ov.querySelector('.ac-x').onclick = close;
    ov.querySelectorAll('.ac-tab').forEach(function (b) { b.onclick = function () { tab = b.dataset.t; paintTabs(); render(); }; });
    paintTabs(); render();
  }
  function paintTabs() { ov.querySelectorAll('.ac-tab').forEach(function (b) { b.classList.toggle('on', b.dataset.t === tab); }); }
  function body() { return ov.querySelector('#acBody'); }
  function foot(msg, cls) { var f = ov.querySelector('#acFootMsg'); if (f) { f.className = 'ac-msg ' + (cls || ''); f.textContent = msg || ''; } }

  function render() {
    if (tab === 'devices') renderDevices();
    else if (tab === 'positions') renderPositions();
    else renderAssign();
  }

  // ──────────────── แท็บ อุปกรณ์ ────────────────
  function renderDevices() {
    var b = body(); b.innerHTML = '<div class="ac-empty">⏳ กำลังโหลด…</div>';
    Registry.list(adminKey).then(function (res) {
      if (!res || !res.ok) { b.innerHTML = '<div class="ac-empty">❌ ' + esc((res && res.error) || 'โหลดไม่สำเร็จ') + '</div>'; return; }
      var pending = res.pending || [], devices = res.devices || [];
      var html = '<div class="ac-sec">คำขอรออนุมัติ (อ่านรหัสบอกผู้ใช้)</div>';
      html += pending.length ? '<table class="ac-tbl"><thead><tr><th>ผู้ใช้</th><th>อุปกรณ์</th><th>ประเภท</th><th>รหัส OTP</th><th>ขอเมื่อ</th></tr></thead><tbody>' +
        pending.map(function (p) {
          return '<tr><td>' + esc(p.user) + '</td><td>' + esc(p.deviceName || '—') + '</td>' +
            '<td><span class="ac-tag ' + (p.deviceType === 'bound' ? 'bound' : 'shared') + '">' + (p.deviceType === 'bound' ? 'ส่วนตัว' : 'ของร้าน') + '</span></td>' +
            '<td><span class="ac-otp">' + esc(p.code) + '</span></td><td>' + esc(fmtTs(p.ts)) + '</td></tr>';
        }).join('') + '</tbody></table>' : '<div class="ac-empty">— ไม่มีคำขอ —</div>';

      html += '<div class="ac-sec" style="margin-top:20px;">อุปกรณ์ที่ใช้งานอยู่ (' + devices.length + ')</div>';
      html += devices.length ? '<table class="ac-tbl"><thead><tr><th>ผู้ใช้</th><th>อุปกรณ์</th><th>ประเภท</th><th>ใช้ล่าสุด</th><th></th></tr></thead><tbody>' +
        devices.map(function (d) {
          return '<tr><td>' + esc(d.user) + '</td><td>' + esc(d.name || '—') + '<div style="font-size:10px;color:#bbb;">' + esc(d.deviceId) + '</div></td>' +
            '<td><span class="ac-tag ' + (d.type === 'bound' ? 'bound' : 'shared') + '">' + (d.type === 'bound' ? 'ส่วนตัว' : 'ของร้าน') + '</span></td>' +
            '<td>' + esc(fmtTs(d.lastSeen)) + '</td>' +
            '<td><button class="ac-btn dng sm" data-revoke="' + esc(d.deviceId) + '">เพิกถอน</button></td></tr>';
        }).join('') + '</tbody></table>' : '<div class="ac-empty">— ยังไม่มีอุปกรณ์ลงทะเบียน —</div>';

      html += '<div class="ac-sec" style="margin-top:20px;">บันทึกการใช้งานล่าสุด</div><div id="acLogs" class="ac-empty">⏳…</div>';
      b.innerHTML = html;
      b.querySelectorAll('[data-revoke]').forEach(function (btn) {
        btn.onclick = function () {
          var id = btn.dataset.revoke;
          if (window.AppDialog && AppDialog.confirm) {
            AppDialog.confirm('เพิกถอนอุปกรณ์', 'เครื่องนี้จะเข้าใช้งานไม่ได้อีก ต้องลงทะเบียน OTP ใหม่ — ยืนยัน?').then(function (ok) { if (ok) doRevoke(id); });
          } else if (confirm('เพิกถอนอุปกรณ์นี้? เครื่องนี้จะเข้าไม่ได้อีก')) doRevoke(id);
        };
      });
      Registry.logList(adminKey, 60).then(function (lg) {
        var host = b.querySelector('#acLogs'); if (!host) return;
        var logs = (lg && lg.logs) || [];
        host.className = ''; host.innerHTML = logs.length ? '<table class="ac-tbl"><thead><tr><th>เวลา</th><th>ผู้ใช้</th><th>เหตุการณ์</th></tr></thead><tbody>' +
          logs.map(function (l) { return '<tr><td>' + esc(fmtTs(l.ts)) + '</td><td>' + esc(l.user || '') + '</td><td>' + esc(l.event || '') + (l.name ? ' · ' + esc(l.name) : '') + '</td></tr>'; }).join('') + '</tbody></table>' : '<div class="ac-empty">— ไม่มี log —</div>';
      });
    }).catch(function () { b.innerHTML = '<div class="ac-empty">❌ ต่อเซิร์ฟเวอร์ไม่ได้</div>'; });
  }
  function doRevoke(id) {
    foot('กำลังเพิกถอน…');
    Registry.revoke(adminKey, id).then(function (r) { foot(r && r.ok ? '✅ เพิกถอนแล้ว' : '❌ ' + ((r && r.error) || ''), r && r.ok ? 'ok' : 'err'); renderDevices(); });
  }

  // ──────────────── แท็บ ตำแหน่ง ────────────────
  function loadPerm() {
    return Registry.permGet(adminKey).then(function (res) {
      if (res && res.ok) { cache.positions = res.positions || []; cache.userpos = res.userpos || {}; dirty = false; }
      return res;
    });
  }
  function renderPositions() {
    var b = body(); b.innerHTML = '<div class="ac-empty">⏳ กำลังโหลด…</div>';
    loadPerm().then(function (res) {
      if (!res || !res.ok) { b.innerHTML = '<div class="ac-empty">❌ ' + esc((res && res.error) || 'โหลดไม่สำเร็จ') + '</div>'; return; }
      paintPositions();
    }).catch(function () { b.innerHTML = '<div class="ac-empty">❌ ต่อเซิร์ฟเวอร์ไม่ได้</div>'; });
  }
  function fieldGroups() {
    var groups = {}; var order = [];
    try { (DBX.allFields() || []).forEach(function (f) { if (!groups[f.group]) { groups[f.group] = []; order.push(f.group); } groups[f.group].push(f); }); } catch (e) {}
    return { groups: groups, order: order };
  }
  function paintPositions() {
    var b = body();
    var enf = !!(window.PermEnforce && PermEnforce.isEnforced());
    var html = '<label style="display:flex;align-items:center;gap:9px;background:' + (enf ? '#FFF3E6' : '#f6f3f0') + ';border:1px solid ' + (enf ? '#F0B380' : '#e7e1da') + ';border-radius:10px;padding:10px 13px;margin-bottom:14px;cursor:pointer;">' +
      '<input type="checkbox" id="acEnforce" style="width:18px;height:18px;"' + (enf ? ' checked' : '') + '>' +
      '<span style="font-size:13px;font-weight:700;color:' + (enf ? '#C75B00' : '#75695e') + ';">🔒 บังคับสิทธิ์มองเห็นตามตำแหน่งบนเครื่องนี้</span>' +
      '<span style="font-size:11px;color:#aaa;margin-left:auto;">' + (enf ? 'ซ่อนจริงตามตำแหน่ง · คนไม่ผูกตำแหน่ง = ถูกบล็อก' : 'โหมดทดสอบ — ยังไม่ซ่อนจริง') + '</span></label>';
    html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">' +
      '<div class="ac-sec" style="margin:0;">ตำแหน่ง (' + cache.positions.length + ') — ตั้งสิทธิ์มองเห็นแยกคอลัมน์/แถว</div>' +
      '<button class="ac-btn sm" id="acAddPos">+ เพิ่มตำแหน่ง</button></div>';
    html += '<div class="ac-poslist">';
    if (!cache.positions.length) html += '<div class="ac-empty">— ยังไม่มีตำแหน่ง กด “เพิ่มตำแหน่ง” —</div>';
    cache.positions.forEach(function (pos, idx) { html += posCard(pos, idx); });
    html += '</div>';
    b.innerHTML = html;
    var enfBox = b.querySelector('#acEnforce');
    if (enfBox) enfBox.onchange = function () { if (window.PermEnforce) PermEnforce.setEnforce(enfBox.checked); toast(enfBox.checked ? '🔒 เปิดบังคับสิทธิ์ตำแหน่งบนเครื่องนี้' : 'ปิดบังคับแล้ว'); paintPositions(); };
    b.querySelector('#acAddPos').onclick = function () {
      cache.positions.push({ id: uid(), name: 'ตำแหน่งใหม่', cols: { mode: 'block', fields: [] }, rows: { mode: 'block', rules: [] } });
      dirty = true; paintPositions(); markDirty();
    };
    wirePosCards();
  }
  function posCard(pos, idx) {
    var fg = fieldGroups();
    var cols = pos.cols || (pos.cols = { mode: 'block', fields: [] });
    var rows = pos.rows || (pos.rows = { mode: 'block', rules: [] });
    var colHtml = fg.order.map(function (g) {
      var chips = fg.groups[g].map(function (f) {
        var on = cols.fields.indexOf(f.key) >= 0;
        return '<label class="ac-chk' + (on ? ' on' : '') + '"><input type="checkbox" data-col="' + esc(f.key) + '"' + (on ? ' checked' : '') + '>' + esc(f.label) + '</label>';
      }).join('');
      return '<div style="margin-bottom:7px;"><div style="font-size:11px;color:#aaa;margin-bottom:3px;">' + esc(g) + '</div><div class="ac-chips">' + chips + '</div></div>';
    }).join('');
    var rowRules = (rows.rules || []).map(function (r, ri) {
      return '<div class="ac-rowrule" data-ri="' + ri + '">' +
        '<select data-rk="type"><option value="group"' + (r.type === 'group' ? ' selected' : '') + '>กลุ่ม</option><option value="cat"' + (r.type === 'cat' ? ' selected' : '') + '>หมวด</option><option value="brand"' + (r.type === 'brand' ? ' selected' : '') + '>ยี่ห้อ</option><option value="code"' + (r.type === 'code' ? ' selected' : '') + '>รหัสสินค้า</option></select>' +
        '<input data-rk="value" placeholder="ค่า เช่น ยางปิคอัพ / BG / 0010230314001" value="' + esc(r.value || '') + '" style="flex:1;">' +
        '<button class="ac-btn dng sm" data-delrule="' + ri + '">✕</button></div>';
    }).join('');
    return '<div class="ac-pos" data-idx="' + idx + '">' +
      '<div class="ac-pos-top"><input class="ac-pos-name" data-posname value="' + esc(pos.name || '') + '"><button class="ac-btn dng sm" data-delpos>ลบตำแหน่ง</button></div>' +
      '<div class="ac-rule"><div class="lab">คอลัมน์ที่คุม</div><div>' +
        '<div class="ac-mode" data-modegrp="cols"><button data-mode="allow"' + (cols.mode === 'allow' ? ' class="on"' : '') + '>ดูได้เฉพาะที่ติ๊ก</button><button data-mode="block"' + (cols.mode !== 'allow' ? ' class="on"' : '') + '>ซ่อนที่ติ๊ก</button></div>' +
        colHtml + '</div><div></div></div>' +
      '<div class="ac-rule"><div class="lab">แถวที่คุม</div><div>' +
        '<div class="ac-mode" data-modegrp="rows"><button data-mode="allow"' + (rows.mode === 'allow' ? ' class="on"' : '') + '>ดูได้เฉพาะที่ระบุ</button><button data-mode="block"' + (rows.mode !== 'allow' ? ' class="on"' : '') + '>ซ่อนที่ระบุ</button></div>' +
        rowRules + '<button class="ac-btn gho sm" data-addrule style="margin-top:4px;">+ เพิ่มเงื่อนไขแถว</button>' +
        '</div><div></div></div>' +
      '</div>';
  }
  function wirePosCards() {
    var b = body();
    b.querySelectorAll('.ac-pos').forEach(function (card) {
      var idx = +card.dataset.idx, pos = cache.positions[idx];
      card.querySelector('[data-posname]').oninput = function () { pos.name = this.value; markDirty(); };
      card.querySelector('[data-delpos]').onclick = function () { cache.positions.splice(idx, 1); dirty = true; markDirty(); paintPositions(); };
      card.querySelectorAll('[data-modegrp] button').forEach(function (mb) {
        mb.onclick = function () { var grp = mb.parentElement.dataset.modegrp; pos[grp].mode = mb.dataset.mode; markDirty(); paintPositions(); };
      });
      card.querySelectorAll('[data-col]').forEach(function (cb) {
        cb.onchange = function () {
          var arr = pos.cols.fields, k = cb.dataset.col, i = arr.indexOf(k);
          if (cb.checked && i < 0) arr.push(k); else if (!cb.checked && i >= 0) arr.splice(i, 1);
          cb.closest('.ac-chk').classList.toggle('on', cb.checked); markDirty();
        };
      });
      var addr = card.querySelector('[data-addrule]');
      if (addr) addr.onclick = function () { pos.rows.rules = pos.rows.rules || []; pos.rows.rules.push({ type: 'group', value: '' }); dirty = true; markDirty(); paintPositions(); };
      card.querySelectorAll('.ac-rowrule').forEach(function (rr) {
        var ri = +rr.dataset.ri;
        rr.querySelectorAll('[data-rk]').forEach(function (ctl) { ctl.onchange = ctl.oninput = function () { pos.rows.rules[ri][ctl.dataset.rk] = ctl.value; markDirty(); }; });
        rr.querySelector('[data-delrule]').onclick = function () { pos.rows.rules.splice(ri, 1); dirty = true; markDirty(); paintPositions(); };
      });
    });
    ensureSaveBar();
  }

  // ──────────────── แท็บ ผูกผู้ใช้ ────────────────
  function renderAssign() {
    var b = body(); b.innerHTML = '<div class="ac-empty">⏳ กำลังโหลด…</div>';
    loadPerm().then(function (res) {
      if (!res || !res.ok) { b.innerHTML = '<div class="ac-empty">❌ ' + esc((res && res.error) || 'โหลดไม่สำเร็จ') + '</div>'; return; }
      paintAssign();
    }).catch(function () { b.innerHTML = '<div class="ac-empty">❌ ต่อเซิร์ฟเวอร์ไม่ได้</div>'; });
  }
  function paintAssign() {
    var b = body(), users = knownUsers();
    if (!cache.positions.length) { b.innerHTML = '<div class="ac-empty">⚠️ ยังไม่มีตำแหน่ง — ไปสร้างที่แท็บ “ตำแหน่ง” ก่อน</div>'; return; }
    var opts = function (sel) { return '<option value=""' + (!sel ? ' selected' : '') + '>— ยังไม่ผูก —</option>' + cache.positions.map(function (p) { return '<option value="' + esc(p.id) + '"' + (p.id === sel ? ' selected' : '') + '>' + esc(p.name) + '</option>'; }).join(''); };
    var html = '<div class="ac-sec">ผูกพนักงาน PIN → ตำแหน่ง (ทุกคนต้องผูก ไม่ผูก = มองไม่เห็นข้อมูล)</div>';
    html += '<div style="margin-bottom:12px;"><input class="ac-in" id="acNewUser" placeholder="+ เพิ่มชื่อผู้ใช้ที่ยังไม่มีในรายการ" style="max-width:320px;display:inline-block;"> <button class="ac-btn gho sm" id="acAddUser">เพิ่ม</button></div>';
    html += '<div class="ac-asg"><div class="u" style="color:#aaa;font-size:11px;">ผู้ใช้</div><div style="color:#aaa;font-size:11px;">ตำแหน่ง</div>';
    if (!users.length) html += '<div class="ac-empty" style="grid-column:1/-1;">— ยังไม่มีผู้ใช้ —</div>';
    users.forEach(function (u) {
      var sel = cache.userpos[u] || '';
      html += '<div class="u">' + esc(u) + '</div><select data-user="' + esc(u) + '" class="' + (sel ? '' : 'none') + '">' + opts(sel) + '</select>';
    });
    html += '</div>';
    b.innerHTML = html;
    b.querySelector('#acAddUser').onclick = function () {
      var v = (b.querySelector('#acNewUser').value || '').trim(); if (!v) return;
      if (!(v in cache.userpos)) cache.userpos[v] = '';
      markDirty(); paintAssign();
    };
    b.querySelectorAll('select[data-user]').forEach(function (sl) {
      sl.onchange = function () { cache.userpos[sl.dataset.user] = sl.value; sl.classList.toggle('none', !sl.value); markDirty(); };
    });
    ensureSaveBar();
  }

  // ──────────────── save bar (สำหรับ positions/assign) ────────────────
  function markDirty() { dirty = true; var sb = ov && ov.querySelector('#acSave'); if (sb) sb.disabled = false; foot('● มีการแก้ไขที่ยังไม่บันทึก', 'err'); }
  function ensureSaveBar() {
    var f = ov.querySelector('.ac-foot'); if (!f) return;
    if (!f.querySelector('#acSave')) {
      var wrap = document.createElement('span');
      wrap.innerHTML = '<button class="ac-btn sm" id="acSave" disabled>💾 บันทึกขึ้น Worker</button>';
      f.lastElementChild.replaceWith(wrap);
      wrap.querySelector('#acSave').onclick = saveAll;
    }
    var sb = ov.querySelector('#acSave'); if (sb) sb.disabled = !dirty;
  }
  function saveAll() {
    var sb = ov.querySelector('#acSave'); if (sb) { sb.disabled = true; sb.textContent = 'กำลังบันทึก…'; }
    Registry.permSet(adminKey, { positions: cache.positions, userpos: cache.userpos, by: (window.Auth && Auth.currentUser && Auth.currentUser()) || 'admin' })
      .then(function (r) {
        if (sb) sb.textContent = '💾 บันทึกขึ้น Worker';
        if (r && r.ok) { dirty = false; foot('✅ บันทึกแล้ว', 'ok'); toast('✅ บันทึกสิทธิ์ตำแหน่งขึ้น Worker'); if (window.PermEnforce) PermEnforce.refresh(); }
        else { foot('❌ ' + ((r && r.error) || 'บันทึกไม่สำเร็จ'), 'err'); if (sb) sb.disabled = false; }
      }).catch(function () { foot('❌ ต่อเซิร์ฟเวอร์ไม่ได้', 'err'); if (sb) sb.disabled = false; });
  }

  // ──────────────── คลิกขวาแถว → ซ่อนแถวนี้สำหรับตำแหน่ง (quick-add rule) ────────────────
  function quickHideRow(code, label) {
    css();
    code = String(code || '').trim();
    if (!code) { toast('แถวนี้ยังไม่ได้ลิงก์รหัสสินค้า'); return; }
    function go() {
      Registry.permGet(adminKey).then(function (res) {
        if (!res || !res.ok) { toast('❌ ' + ((res && res.error) || 'โหลดตำแหน่งไม่สำเร็จ')); return; }
        var positions = res.positions || [], userpos = res.userpos || {};
        if (!positions.length) { toast('ยังไม่มีตำแหน่ง — สร้างที่ระบบกลาง › ตำแหน่งก่อน'); open(); tab = 'positions'; return; }
        pickPos(positions, userpos);
      }).catch(function () { toast('❌ ต่อเซิร์ฟเวอร์ไม่ได้'); });
    }
    function pickPos(positions, userpos) {
      var d = document.createElement('div'); d.className = 'ac-ov';
      d.addEventListener('mousedown', function (e) { if (e.target === d) d.remove(); });
      var rows = positions.map(function (p) {
        var has = ((p.rows && p.rows.rules) || []).some(function (r) { return r.type === 'code' && String(r.value).trim() === code; });
        var modeNote = (p.rows && p.rows.mode === 'allow') ? '<span style="font-size:10.5px;color:#C0392B;"> · โหมด “ดูได้เฉพาะ” (ดูที่ตำแหน่ง)</span>' : '';
        return '<label class="ac-chk' + (has ? ' on' : '') + '" style="display:flex;width:100%;box-sizing:border-box;margin-bottom:6px;justify-content:space-between;">' +
          '<span><input type="checkbox" data-pid="' + esc(p.id) + '"' + (has ? ' checked' : '') + '> ' + esc(p.name) + modeNote + '</span></label>';
      }).join('');
      d.innerHTML = '<div class="ac-win" style="height:auto;max-height:88vh;width:440px;">' +
        '<div class="ac-head"><span>🏷️ ซ่อนแถวสำหรับตำแหน่ง</span><button class="ac-x">✕</button></div>' +
        '<div class="ac-body"><div style="font-size:12.5px;color:#888;margin-bottom:10px;">สินค้า: <b>' + esc(label || code) + '</b><br><span style="font-size:11px;color:#bbb;">' + esc(code) + '</span></div>' +
        '<div class="ac-sec">ติ๊กตำแหน่งที่จะ “ซ่อนแถวนี้” (โหมดซ่อนที่ระบุ)</div>' + rows + '</div>' +
        '<div class="ac-foot"><span class="ac-msg" id="qhMsg"></span><button class="ac-btn sm" id="qhSave">💾 บันทึกขึ้น Worker</button></div></div>';
      document.body.appendChild(d);
      d.querySelector('.ac-x').onclick = function () { d.remove(); };
      d.querySelector('#qhSave').onclick = function () {
        var sb = d.querySelector('#qhSave'); sb.disabled = true; sb.textContent = 'กำลังบันทึก…';
        d.querySelectorAll('[data-pid]').forEach(function (cb) {
          var p = positions.find(function (x) { return x.id === cb.dataset.pid; }); if (!p) return;
          p.rows = p.rows || { mode: 'block', rules: [] }; p.rows.rules = p.rows.rules || [];
          var idx = p.rows.rules.findIndex(function (r) { return r.type === 'code' && String(r.value).trim() === code; });
          if (cb.checked && idx < 0) p.rows.rules.push({ type: 'code', value: code });
          else if (!cb.checked && idx >= 0) p.rows.rules.splice(idx, 1);
        });
        Registry.permSet(adminKey, { positions: positions, by: (window.Auth && Auth.currentUser && Auth.currentUser()) || 'admin' }).then(function (r) {
          if (r && r.ok) { cache.positions = positions; toast('✅ บันทึกแล้ว'); if (window.PermEnforce) PermEnforce.refresh(); d.remove(); }
          else { var m = d.querySelector('#qhMsg'); m.className = 'ac-msg err'; m.textContent = '❌ ' + ((r && r.error) || 'บันทึกไม่สำเร็จ'); sb.disabled = false; sb.textContent = '💾 บันทึกขึ้น Worker'; }
        }).catch(function () { var m = d.querySelector('#qhMsg'); m.className = 'ac-msg err'; m.textContent = '❌ ต่อเซิร์ฟเวอร์ไม่ได้'; sb.disabled = false; sb.textContent = '💾 บันทึกขึ้น Worker'; });
      };
    }
    if (adminKey) { go(); return; }
    // ยังไม่มี adminKey → ขอรหัสก่อน (ใช้ overlay gate เล็ก)
    var g = document.createElement('div'); g.className = 'ac-ov';
    g.addEventListener('mousedown', function (e) { if (e.target === g) g.remove(); });
    g.innerHTML = '<div class="ac-win" style="height:auto;width:360px;"><div class="ac-head"><span>🔑 ใส่ ADMIN_KEY</span><button class="ac-x">✕</button></div>' +
      '<div class="ac-body" style="text-align:center;"><p style="font-size:12.5px;color:#999;margin:0 0 12px;">ยืนยันสิทธิ์แอดมินก่อนแก้สิทธิ์ตำแหน่ง</p>' +
      '<input class="ac-in" id="qhKey" type="password" placeholder="ADMIN_KEY" autocomplete="off"><div class="ac-msg err" id="qhKm" style="min-height:18px;margin:8px 0;"></div>' +
      '<button class="ac-btn" id="qhKgo" style="width:100%;">ยืนยัน</button></div></div>';
    document.body.appendChild(g);
    g.querySelector('.ac-x').onclick = function () { g.remove(); };
    var inp = g.querySelector('#qhKey'); setTimeout(function () { inp.focus(); }, 50);
    function submit() {
      var k = inp.value.trim(); if (!k) return;
      var go2 = g.querySelector('#qhKgo'); go2.disabled = true; go2.textContent = 'กำลังตรวจสอบ…';
      Registry.list(k).then(function (res) {
        if (res && res.ok) { adminKey = k; g.remove(); go(); }
        else { var m = g.querySelector('#qhKm'); m.textContent = '❌ ' + ((res && res.error) || 'รหัสไม่ถูกต้อง'); go2.disabled = false; go2.textContent = 'ยืนยัน'; }
      }).catch(function () { g.querySelector('#qhKm').textContent = '❌ ต่อเซิร์ฟเวอร์ไม่ได้'; go2.disabled = false; go2.textContent = 'ยืนยัน'; });
    }
    g.querySelector('#qhKgo').onclick = submit;
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); submit(); } });
  }

  window.AdminCentral = { open: open, close: close, quickHideRow: quickHideRow };
})();
