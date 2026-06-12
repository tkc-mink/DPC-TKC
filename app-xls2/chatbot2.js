/* ============================================================
   chatbot2.js — แชทบอทราคายาง 🤖 (มุมขวาล่าง)
   ตอบจากข้อมูลจริงในชีตผ่าน SG.dataRows() · เคารพโหมดแอดมิน/ผู้ใช้
   ============================================================ */
(function () {
  var XL2 = window.XL2;
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function fmt(v) { return XL2.isNumeric(v) ? XL2.fmtNum(XL2.toN(v)) : String(v || '-'); }
  function isAdmin() { return window.SG && SG.getMode() === 'admin'; }
  // แหล่งข้อมูล: ผู้ใช้/AI เห็นเฉพาะราคาที่มีผลแล้ว · แอดมินเห็นร่างล่าสุด
  function srcRows() { return isAdmin() ? SG.dataRows() : SG.effectiveDataRows(); }

  // ---------- AI plugin config (เชื่อม AI local เช่น Ollama / LM Studio) ----------
  var AICFG_KEY = 'xls2_ai_config';
  function loadCfg() {
    try { return Object.assign({ enabled: false, endpoint: '', model: '', apiKey: '' }, JSON.parse(localStorage.getItem(AICFG_KEY) || '{}')); }
    catch (e) { return { enabled: false, endpoint: '', model: '', apiKey: '' }; }
  }
  function saveCfg(c) { localStorage.setItem(AICFG_KEY, JSON.stringify(c)); }

  // บริบทราคาสำหรับ AI — ใช้ “ราคาที่มีผลแล้วเท่านั้น” เสมอ (ไม่ส่งราคาล่วงหน้า/ร่าง ไม่ส่งทุน/รหัสลับ)
  function aiContext() {
    var rows = SG.effectiveDataRows();
    var lines = rows.map(function (r) {
      var l = r.size + ' | ' + r.brand + ' ' + r.model + ' | ราคาตั้ง ' + fmt(r.retail);
      if (isAdmin()) l += ' | B ' + fmt(r.B) + ' | A ' + fmt(r.A) + ' | S ' + fmt(r.S);
      return l;
    });
    return 'รายการราคายาง (เฉพาะราคาที่มีผลแล้ว ณ ตอนนี้):\n' + lines.join('\n');
  }
  function aiAsk(q, imgDataUrl) {
    var cfg = loadCfg();
    var headers = { 'Content-Type': 'application/json' };
    if (cfg.apiKey) headers['Authorization'] = 'Bearer ' + cfg.apiKey;
    var userContent = imgDataUrl
      ? [{ type: 'text', text: q || 'อ่านรูปนี้แล้วตอบเกี่ยวกับราคายาง' }, { type: 'image_url', image_url: { url: imgDataUrl } }]
      : q;
    var body = {
      model: cfg.model || 'local',
      stream: false,
      messages: [
        { role: 'system', content: 'คุณคือผู้ช่วยราคายางของร้าน TKC ตอบสั้น กระชับ เป็นภาษาไทย อ้างอิงเฉพาะราคาในข้อมูลนี้เท่านั้น ห้ามเดาราคาเอง\n\n' + aiContext() },
        { role: 'user', content: userContent }
      ]
    };
    var ctrl = new AbortController();
    var t = setTimeout(function () { ctrl.abort(); }, 20000);
    return fetch(cfg.endpoint, { method: 'POST', headers: headers, body: JSON.stringify(body), signal: ctrl.signal })
      .then(function (res) { if (!res.ok) throw new Error('HTTP ' + res.status); return res.json(); })
      .then(function (data) {
        clearTimeout(t);
        var txt = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) ||
                  (data.message && data.message.content) || data.response || '';
        if (!txt) throw new Error('empty');
        return txt;
      });
  }

  // ---------- bot brain ----------
  function rowsMatch(q) {
    var rows = srcRows();
    var ql = q.toLowerCase();
    // ขนาด เช่น 195r14, 205/75r14c
    var szm = /(\d{3})(?:\/(\d{2,3}))?\s*r\s*(\d{2})/i.exec(ql);
    // ขอบ เช่น ขอบ 14
    var rimm = /ขอบ\s*(\d{2})/.exec(ql);
    var out = rows.filter(function (rw) {
      var hit = true;
      if (szm) {
        var s = rw.size.toLowerCase().replace(/\s/g, '');
        var want = szm[1] + (szm[2] ? '/' + szm[2] : '') + 'r' + szm[3];
        hit = s.indexOf(want) === 0 || s.replace('/', '').indexOf(want.replace('/', '')) === 0;
      }
      if (hit && rimm && !szm) hit = new RegExp('r' + rimm[1], 'i').test(rw.size);
      return hit;
    });
    // ยี่ห้อ / รุ่น ที่พิมพ์มา
    var brands = {}; rows.forEach(function (r) { if (r.brand) brands[r.brand.toLowerCase()] = 1; });
    var tokens = ql.split(/[\s,]+/).filter(Boolean);
    var bTok = tokens.find(function (t) { return brands[t]; });
    if (!bTok && /otani/i.test(ql)) bTok = 'ot';
    if (bTok) out = out.filter(function (r) { return r.brand.toLowerCase() === bTok || XL2.brandFull(r.brand).toLowerCase() === bTok; });
    var mTok = tokens.find(function (t) { return t.length >= 2 && rows.some(function (r) { return r.model.toLowerCase() === t || r.model.toLowerCase().replace(/[\s\-\/]/g, '') === t.replace(/[\s\-\/]/g, ''); }); });
    if (mTok) out = out.filter(function (r) { return r.model.toLowerCase() === mTok || r.model.toLowerCase().replace(/[\s\-\/]/g, '') === mTok.replace(/[\s\-\/]/g, ''); });
    return { list: out, hasFilter: !!(szm || rimm || bTok || mTok) };
  }

  function rowLine(rw) {
    var l = '<b>' + esc(rw.size) + '</b> · ' + esc(rw.brand) + ' ' + esc(rw.model) +
      ' — ราคาตั้ง <b>' + fmt(rw.retail) + '</b>';
    if (isAdmin()) {
      l += ' · ทุน ' + fmt(rw.cost) + ' · B ' + fmt(rw.B) + ' · A ' + fmt(rw.A) + ' · S ' + fmt(rw.S);
      if (XL2.isNumeric(rw.margin)) l += ' · Margin ' + (XL2.toN(rw.margin) > 0 ? '+' : '') + fmt(rw.margin);
    }
    if (rw.changed) l += ' ✏️';
    return l;
  }

  function answer(q) {
    var ql = q.toLowerCase().trim();
    if (!ql) return 'พิมพ์ถามได้เลยครับ เช่น “ราคา MK1000” หรือ “ยางถูกสุดขอบ 14”';

    // ถอดรหัสลับ (เฉพาะแอดมิน)
    var dm = /(?:ถอดรหัส|รหัส)\s*([a-zA-Z]{2,})/.exec(q);
    if (dm) {
      if (!isAdmin()) return 'ขออภัยครับ การถอดรหัสลับใช้ได้เฉพาะโหมดแอดมิน 🔒';
      var code = dm[1].toUpperCase();
      return 'รหัส <b>' + esc(code) + '</b>:<br>· ชุดทุน (COGS) → <b>' + (XL2.decode(code, XL2.C1) || '?') + '</b><br>· ชุดขายส่ง (Dealer) → <b>' + (XL2.decode(code, XL2.C2) || '?') + '</b>';
    }

    // มีปรับราคาอะไรบ้าง
    if (/ปรับ(ปรุง)?ราคา|เปลี่ยนราคา|อัพเดท|อัปเดต/.test(ql)) {
      var rows = srcRows().filter(function (r) { return r.changed; });
      if (!rows.length) return 'รอบนี้ยังไม่มีการปรับราคาครับ ✅';
      return 'รอบนี้มีการปรับราคา <b>' + rows.length + ' รายการ</b>:<br>' + rows.slice(0, 8).map(rowLine).join('<br>') + (rows.length > 8 ? '<br>…และอีก ' + (rows.length - 8) + ' รายการ' : '');
    }

    var m = rowsMatch(q);

    // ถูกสุด / แพงสุด
    if (/ถูก(ที่)?สุด|ประหยัด/.test(ql) || /แพง(ที่)?สุด/.test(ql)) {
      var pool = (m.hasFilter ? m.list : srcRows()).filter(function (r) { return XL2.isNumeric(r.retail); });
      if (!pool.length) return 'ไม่พบรายการที่ตรงเงื่อนไขครับ';
      var cheap = /ถูก|ประหยัด/.test(ql);
      pool.sort(function (a, b) { return XL2.toN(a.retail) - XL2.toN(b.retail); });
      var pick = cheap ? pool[0] : pool[pool.length - 1];
      return (cheap ? '🏷️ ถูกสุด' : '💎 แพงสุด') + (m.hasFilter ? 'ตามเงื่อนไข' : 'ในชีตนี้') + ':<br>' + rowLine(pick);
    }

    // margin (แอดมิน)
    if (/margin|กำไร|ส่วนต่าง/.test(ql)) {
      if (!isAdmin()) return 'ข้อมูล Margin ดูได้เฉพาะโหมดแอดมินครับ 🔒';
      var pool2 = (m.hasFilter ? m.list : srcRows()).filter(function (r) { return XL2.isNumeric(r.margin); });
      if (!pool2.length) return 'ไม่พบรายการครับ';
      pool2.sort(function (a, b) { return XL2.toN(b.margin) - XL2.toN(a.margin); });
      return '📈 Margin ' + (m.hasFilter ? 'ตามเงื่อนไข' : 'สูงสุด 5 อันดับ') + ':<br>' + pool2.slice(0, 5).map(rowLine).join('<br>');
    }

    // ค้นราคา
    if (m.hasFilter) {
      if (!m.list.length) return 'ไม่พบสินค้าที่ตรงกับ “' + esc(q) + '” ครับ ลองพิมพ์ขนาด เช่น 195R14 หรือชื่อรุ่น';
      var head = '🔎 พบ ' + m.list.length + ' รายการ:';
      return head + '<br>' + m.list.slice(0, 6).map(rowLine).join('<br>') + (m.list.length > 6 ? '<br>…และอีก ' + (m.list.length - 6) + ' รายการ (ลองระบุเพิ่ม)' : '');
    }

    return 'ผมตอบเรื่องราคาในชีตนี้ได้ครับ ลองถาม:<br>· “ราคา 195R14C”<br>· “MK1000 ราคาเท่าไหร่”<br>· “ยางถูกสุดขอบ 14”<br>· “มีปรับราคาอะไรบ้าง”' + (isAdmin() ? '<br>· “margin สูงสุด” · “ถอดรหัส TNLX”' : '');
  }

  // ---------- ไอคอนหมาหุ่นยนต์ชิบะอินุ 🐕🤖 ----------
  var SHIBA = '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-label="ชิบะหุ่นยนต์">' +
    '<line x1="32" y1="7" x2="32" y2="15" stroke="#777" stroke-width="3"/>' +
    '<circle cx="32" cy="6" r="3.4" fill="#d62828"/>' +
    '<polygon points="11,28 19,9 28,21" fill="#E8A33D" stroke="#9c6b1e" stroke-width="1.5"/>' +
    '<polygon points="53,28 45,9 36,21" fill="#E8A33D" stroke="#9c6b1e" stroke-width="1.5"/>' +
    '<polygon points="15.5,24 19.5,14.5 24,20.5" fill="#7a5220"/>' +
    '<polygon points="48.5,24 44.5,14.5 40,20.5" fill="#7a5220"/>' +
    '<rect x="10" y="17" width="44" height="38" rx="13" fill="#E8A33D" stroke="#9c6b1e" stroke-width="1.5"/>' +
    '<ellipse cx="32" cy="45" rx="16.5" ry="11.5" fill="#FFF6E8"/>' +
    '<rect x="15.5" y="28" width="13" height="9" rx="3.5" fill="#2b2b2b"/>' +
    '<rect x="35.5" y="28" width="13" height="9" rx="3.5" fill="#2b2b2b"/>' +
    '<circle cx="22" cy="32.5" r="2.2" fill="#7CFFB2"/>' +
    '<circle cx="42" cy="32.5" r="2.2" fill="#7CFFB2"/>' +
    '<rect x="28.5" y="40" width="7" height="5.5" rx="2.5" fill="#333"/>' +
    '<path d="M32 45.5 V49 M26.5 50 Q32 54 37.5 50" stroke="#333" stroke-width="2" fill="none" stroke-linecap="round"/>' +
    '<circle cx="14" cy="42" r="1.8" fill="#9c6b1e"/>' +
    '<circle cx="50" cy="42" r="1.8" fill="#9c6b1e"/>' +
    '</svg>';

  // ---------- UI ----------
  var open = false, panel, body, inp;
  function build() {
    var btn = document.createElement('button');
    btn.id = 'cbFab'; btn.title = 'แชทบอทราคายาง';
    btn.innerHTML = SHIBA;
    document.body.appendChild(btn);

    panel = document.createElement('div');
    panel.id = 'cbPanel';
    panel.innerHTML =
      '<div class="cb-head"><span class="cb-ava">' + SHIBA + '</span><div><div class="cb-name">น้องชิบะ</div><div class="cb-sub" id="cbSub">ผู้ช่วยราคายาง · ตอบจากข้อมูลในชีต</div></div>' +
      '<span class="cb-gear" title="ตั้งค่า AI plugin">⚙️</span><span class="cb-x" title="ปิด">✕</span></div>' +
      '<div class="cb-cfg" id="cbCfg">' +
        '<label class="cb-cfg-row"><input type="checkbox" id="aiEnabled" /> เปิดใช้ AI local (ปิด = ตอบจากกฎในตัว)</label>' +
        '<input id="aiEndpoint" placeholder="Endpoint เช่น http://localhost:11434/v1/chat/completions" />' +
        '<div style="display:flex;gap:6px;"><input id="aiModel" placeholder="โมเดล เช่น llama3.2" style="flex:1;" /><input id="aiKey" placeholder="API key (ถ้ามี)" style="flex:1;" /></div>' +
        '<div class="cb-cfg-note">🔒 บอท/AI จะเห็นเฉพาะ “ราคาปัจจุบันที่มีผลแล้ว” เท่านั้น — ราคาที่ตั้งเวลาล่วงหน้า/ยังไม่เผยแพร่ จะใช้ราคาเดิมจนกว่าถึงเวลา · ไม่ส่งทุน/รหัสลับให้ AI</div>' +
        '<div style="display:flex;gap:6px;justify-content:flex-end;"><button class="cb-chip" id="aiTest">🔌 ทดสอบ</button><button class="cb-chip" id="aiSave" style="background:#1d6f42;color:#fff;">บันทึก</button></div>' +
      '</div>' +
      '<div class="cb-body" id="cbBody"></div>' +
      '<div class="cb-chips" id="cbChips"></div>' +
      '<div class="cb-foot"><button id="cbAttach" title="แนบรูปให้บอทอ่าน">📷</button><button id="cbMic" title="คำสั่งเสียง (พูดถามได้เลย)">🎤</button><input id="cbInp" placeholder="ถามเรื่องราคา เช่น ราคา MK1000…" /><button id="cbSend">ส่ง</button><input type="file" id="cbFile" accept="image/*" style="display:none;" /></div>';
    document.body.appendChild(panel);
    body = panel.querySelector('#cbBody');
    inp = panel.querySelector('#cbInp');

    btn.onclick = function () { if (btn._dragged) { btn._dragged = false; return; } toggle(!open); };
    // ลากหุ่นยนต์ไปวางได้อิสระทุกตำแหน่ง (จำตำแหน่งถาวร)
    (function () {
      try { var p = JSON.parse(localStorage.getItem('xls2_fabpos') || 'null'); if (p) { btn.style.left = p.x + 'px'; btn.style.top = p.y + 'px'; btn.style.right = 'auto'; btn.style.bottom = 'auto'; } } catch (e) {}
      var dx = 0, dy = 0, moved = false, dragging = false;
      function down(e) {
        var pt = e.touches ? e.touches[0] : e;
        dragging = true; moved = false;
        var r = btn.getBoundingClientRect();
        dx = pt.clientX - r.left; dy = pt.clientY - r.top;
        document.addEventListener('mousemove', move, true); document.addEventListener('mouseup', up, true);
        document.addEventListener('touchmove', move, { passive: false, capture: true }); document.addEventListener('touchend', up, true);
      }
      function move(e) {
        if (!dragging) return;
        var pt = e.touches ? e.touches[0] : e;
        var x = pt.clientX - dx, y = pt.clientY - dy;
        x = Math.max(2, Math.min(window.innerWidth - btn.offsetWidth - 2, x));
        y = Math.max(2, Math.min(window.innerHeight - btn.offsetHeight - 2, y));
        btn.style.left = x + 'px'; btn.style.top = y + 'px'; btn.style.right = 'auto'; btn.style.bottom = 'auto';
        moved = true; if (e.cancelable) e.preventDefault();
      }
      function up() {
        document.removeEventListener('mousemove', move, true); document.removeEventListener('mouseup', up, true);
        document.removeEventListener('touchmove', move, { capture: true }); document.removeEventListener('touchend', up, true);
        if (moved) { btn._dragged = true; localStorage.setItem('xls2_fabpos', JSON.stringify({ x: parseInt(btn.style.left, 10), y: parseInt(btn.style.top, 10) })); if (typeof reposPanel === 'function') reposPanel(); }
        dragging = false;
      }
      btn.addEventListener('mousedown', down);
      btn.addEventListener('touchstart', down, { passive: true });
    })();
    function reposPanel() {
      var r = btn.getBoundingClientRect();
      panel.style.right = 'auto'; panel.style.bottom = 'auto';
      var ph = Math.min(panel.offsetHeight, window.innerHeight - 16);
      var top = r.top - ph - 8;
      if (top < 8) top = Math.min(r.bottom + 8, window.innerHeight - ph - 8);
      panel.style.top = Math.max(8, Math.min(top, window.innerHeight - ph - 8)) + 'px';
      panel.style.left = Math.max(8, Math.min(r.right - panel.offsetWidth, window.innerWidth - panel.offsetWidth - 8)) + 'px';
    }
    window.addEventListener('cb-open', reposPanel);
    // ลากหน้าต่างแชทด้วยหัวบนสุด (ย้ายขึ้น/ไปไหนก็ได้ · กันหลุดเฟรม)
    (function () {
      var head = panel.querySelector('.cb-head');
      var dx = 0, dy = 0, dragging = false;
      head.addEventListener('mousedown', function (e) {
        if (e.target.closest('.cb-x, .cb-gear')) return;
        dragging = true;
        var r = panel.getBoundingClientRect();
        dx = e.clientX - r.left; dy = e.clientY - r.top;
        panel.style.right = 'auto'; panel.style.bottom = 'auto';
        document.addEventListener('mousemove', pm, true); document.addEventListener('mouseup', pu, true);
        e.preventDefault();
      });
      function pm(e) {
        if (!dragging) return;
        var x = Math.max(6, Math.min(e.clientX - dx, window.innerWidth - panel.offsetWidth - 6));
        var y = Math.max(6, Math.min(e.clientY - dy, window.innerHeight - 40));
        panel.style.left = x + 'px'; panel.style.top = y + 'px';
      }
      function pu() { dragging = false; document.removeEventListener('mousemove', pm, true); document.removeEventListener('mouseup', pu, true); }
    })();
    panel.querySelector('.cb-x').onclick = function () { toggle(false); };
    panel.querySelector('#cbSend').onclick = send;
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') send(); });

    // settings
    var cfgEl = panel.querySelector('#cbCfg');
    panel.querySelector('.cb-gear').onclick = function () {
      var c = loadCfg();
      panel.querySelector('#aiEnabled').checked = !!c.enabled;
      panel.querySelector('#aiEndpoint').value = c.endpoint || '';
      panel.querySelector('#aiModel').value = c.model || '';
      panel.querySelector('#aiKey').value = c.apiKey || '';
      cfgEl.classList.toggle('open');
    };
    panel.querySelector('#aiSave').onclick = function () {
      saveCfg({ enabled: panel.querySelector('#aiEnabled').checked, endpoint: panel.querySelector('#aiEndpoint').value.trim(), model: panel.querySelector('#aiModel').value.trim(), apiKey: panel.querySelector('#aiKey').value.trim() });
      cfgEl.classList.remove('open');
      updateSub();
      bot(loadCfg().enabled ? '✅ เปิดใช้ AI local แล้ว — ผมจะอ้างอิงเฉพาะราคาที่มีผลแล้วเท่านั้น' : 'บันทึกแล้ว (ใช้โหมดตอบจากกฎในตัว)');
    };
    panel.querySelector('#aiTest').onclick = function () {
      saveCfg({ enabled: panel.querySelector('#aiEnabled').checked, endpoint: panel.querySelector('#aiEndpoint').value.trim(), model: panel.querySelector('#aiModel').value.trim(), apiKey: panel.querySelector('#aiKey').value.trim() });
      bot('🔌 กำลังทดสอบการเชื่อมต่อ…');
      aiAsk('ตอบสั้นๆ ว่าพร้อมใช้งาน')
        .then(function (txt) { bot('✅ เชื่อมต่อสำเร็จ: ' + esc(txt).slice(0, 200)); })
        .catch(function (e) { bot('❌ เชื่อมต่อไม่สำเร็จ (' + esc(e.message) + ') — ตรวจ endpoint/CORS ของ AI local'); });
    };

    renderChips();
    updateSub();
    bot('สวัสดีครับ 🐕 ผม “น้องชิบะ” ถามราคายางในชีตนี้ได้เลย เช่น พิมพ์ขนาด ยี่ห้อ หรือรุ่น · กด 🎤 พูดถาม หรือ 📷 แนบรูปให้ผมอ่านได้');

    // 🎤 คำสั่งเสียง (Web Speech API · ภาษาไทย)
    var micBtn = panel.querySelector('#cbMic'), rec = null, recOn = false;
    micBtn.onclick = function () {
      var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) { bot('ขออภัย เบราว์เซอร์นี้ไม่รองรับคำสั่งเสียง — ลอง Chrome หรือ Edge ครับ'); return; }
      if (recOn && rec) { rec.stop(); return; }
      rec = new SR();
      rec.lang = 'th-TH'; rec.interimResults = false; rec.maxAlternatives = 1;
      rec.onresult = function (ev) {
        var t = ev.results[0][0].transcript;
        inp.value = t;
        send();
      };
      rec.onend = function () { recOn = false; micBtn.classList.remove('rec'); };
      rec.onerror = function () { recOn = false; micBtn.classList.remove('rec'); bot('ฟังไม่ทัน/ไม่ได้ยินเสียง ลองกด 🎤 พูดใหม่อีกครั้งครับ'); };
      recOn = true; micBtn.classList.add('rec');
      try { rec.start(); } catch (e) {}
    };

    // 📷 แนบรูปให้บอทอ่าน (ต้องเปิด AI local ที่มีโมเดลอ่านภาพ)
    var fileEl = panel.querySelector('#cbFile');
    panel.querySelector('#cbAttach').onclick = function () { fileEl.click(); };
    fileEl.onchange = function () {
      var f = fileEl.files && fileEl.files[0];
      fileEl.value = '';
      if (!f) return;
      var rd = new FileReader();
      rd.onload = function () {
        var dataUrl = rd.result;
        msg('<img src="' + dataUrl + '" alt="รูปที่แนบ" />' + (inp.value ? '<div>' + esc(inp.value) + '</div>' : ''), 'me');
        var q = inp.value.trim(); inp.value = '';
        var cfg = loadCfg();
        if (!(cfg.enabled && cfg.endpoint)) {
          bot('ผมรับรูปไว้แล้ว แต่จะอ่านรูปได้ต้องเปิดใช้ AI local ก่อน — กด ⚙️ ใส่ endpoint ของโมเดลที่อ่านภาพได้ (เช่น llava, qwen-vl) แล้วแนบรูปใหม่ครับ');
          return;
        }
        var typing = document.createElement('div');
        typing.className = 'cb-msg bot'; typing.textContent = '⋯ กำลังอ่านรูป (AI local)';
        body.appendChild(typing); body.scrollTop = body.scrollHeight;
        aiAsk(q, dataUrl)
          .then(function (txt) { typing.remove(); bot(esc(txt).replace(/\n/g, '<br>')); })
          .catch(function (e) { typing.remove(); bot('❌ อ่านรูปไม่สำเร็จ (' + esc(e.message) + ') — ตรวจว่าโมเดลรองรับภาพไหม'); });
      };
      rd.readAsDataURL(f);
    };
  }
  function updateSub() {
    var s = panel.querySelector('#cbSub');
    if (s) s.textContent = loadCfg().enabled ? 'ผู้ช่วยราคายาง · 🔌 AI local · ราคาที่มีผลแล้วเท่านั้น' : 'ผู้ช่วยราคายาง · ตอบจากข้อมูลในชีต';
  }
  function renderChips() {
    var chips = ['ราคา 195R14C', 'ยางถูกสุดขอบ 14', 'มีปรับราคาอะไรบ้าง'];
    if (isAdmin()) chips.push('margin สูงสุด');
    var host = panel.querySelector('#cbChips');
    host.innerHTML = chips.map(function (c) { return '<button class="cb-chip">' + esc(c) + '</button>'; }).join('');
    host.querySelectorAll('.cb-chip').forEach(function (b) {
      b.onclick = function () { inp.value = b.textContent; send(); };
    });
  }
  function toggle(o) {
    open = o;
    panel.classList.toggle('open', o);
    if (o) { renderChips(); try { window.dispatchEvent(new Event('cb-open')); } catch (e) {} setTimeout(function () { inp.focus(); }, 60); }
  }
  function msg(html, who) {
    var d = document.createElement('div');
    d.className = 'cb-msg ' + who;
    d.innerHTML = html;
    body.appendChild(d);
    body.scrollTop = body.scrollHeight;
  }
  function bot(html) { msg(html, 'bot'); }
  function send() {
    var q = inp.value.trim(); if (!q) return;
    msg(esc(q), 'me');
    inp.value = '';
    var cfg = loadCfg();
    if (cfg.enabled && cfg.endpoint) {
      var typing = document.createElement('div');
      typing.className = 'cb-msg bot'; typing.textContent = '⋯ กำลังคิด (AI local)';
      body.appendChild(typing); body.scrollTop = body.scrollHeight;
      aiAsk(q)
        .then(function (txt) { typing.remove(); bot(esc(txt).replace(/\n/g, '<br>')); })
        .catch(function () {
          typing.remove();
          try { bot(answer(q) + '<div class="cb-fallback">⚠️ AI local ไม่ตอบ — ตอบจากกฎในตัวแทน</div>'); }
          catch (e) { bot('ขออภัย มีข้อผิดพลาดครับ'); }
        });
      return;
    }
    setTimeout(function () { try { bot(answer(q)); } catch (e) { bot('ขออภัย มีข้อผิดพลาดครับ'); } }, 220);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
