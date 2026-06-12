/* ============================================================
   sheet-grid.js — true-Excel grid core (v2)
   ทุกช่องเป็นเซลล์อิสระ: ค่า (v) หรือสูตร (f) + สไตล์ (s)
   depends: engine2.js (XL2), sheet-build.js (XL2Build)
   exposes window.SG
   ============================================================ */
(function () {
  var XL2 = window.XL2, esc = XL2.esc;

  var doc = null;
  var view = { mode: 'admin', zoom: 1, secret: false };
  var sel = { r: 0, c: 0, ar: 0, ac: 0 };
  var editing = null;          // {r,c, viaFx}
  var undoStack = [], redoStack = [], clip = null;
  var rootEl, inputEl, fxEl, nameEl, statusEl, sumEl, ctxEl, tipEl;
  var cover = {};              // "r:c" -> anchor key for merged-covered cells
  var dirty = false;

  // ---------- doc helpers ----------
  function key(r, c) { return r + ':' + c; }
  function cellAt(r, c) { return doc.cells[key(r, c)] || null; }
  function ensureCell(r, c) { var k = key(r, c); if (!doc.cells[k]) doc.cells[k] = { v: '', t: 'auto', s: {} }; return doc.cells[k]; }
  function snapshot() { return JSON.stringify({ cells: doc.cells, merges: doc.merges, colW: doc.colW, rowH: doc.rowH, nRows: doc.nRows, nCols: doc.nCols, adminRows: doc.adminRows, adminCols: doc.adminCols, name: doc.name, rowLinks: doc.rowLinks, condColors: doc.condColors, schedule: doc.schedule, rowSchedules: doc.rowSchedules, changes: doc.changes, images: doc.images || [], hideRows: doc.hideRows, hideCols: doc.hideCols, uHideRows: doc.uHideRows, uHideCols: doc.uHideCols }); }
  function restore(s) { var d = JSON.parse(s); doc.cells = d.cells; doc.merges = d.merges; doc.colW = d.colW; doc.rowH = d.rowH; doc.nRows = d.nRows; doc.nCols = d.nCols; doc.adminRows = d.adminRows; doc.adminCols = d.adminCols; doc.name = d.name; doc.rowLinks = d.rowLinks || {}; doc.condColors = d.condColors; doc.schedule = d.schedule; doc.rowSchedules = d.rowSchedules || {}; doc.changes = d.changes || {}; doc.images = d.images || []; doc.hideRows = d.hideRows || {}; doc.hideCols = d.hideCols || {}; doc.uHideRows = d.uHideRows || {}; doc.uHideCols = d.uHideCols || {}; }
  function pushUndo() { undoStack.push(snapshot()); if (undoStack.length > 80) undoStack.shift(); redoStack.length = 0; }
  function undo() { if (!undoStack.length) return; redoStack.push(snapshot()); restore(undoStack.pop()); afterChange(); toast('ย้อนกลับ'); }
  function redo() { if (!redoStack.length) return; undoStack.push(snapshot()); restore(redoStack.pop()); afterChange(); toast('ทำซ้ำ'); }
  function persist() { try { XL2.store.saveCurrent(doc); } catch (e) {} dirty = true; }
  function afterChange() { invalidate(); buildCover(); render(); persist(); }

  // ---------- merges ----------
  function buildCover() {
    cover = {};
    Object.keys(doc.merges || {}).forEach(function (k) {
      var m = doc.merges[k], p = k.split(':'), r = +p[0], c = +p[1];
      for (var rr = r; rr < r + m.rs; rr++) for (var cc = c; cc < c + m.cs; cc++)
        if (!(rr === r && cc === c)) cover[key(rr, cc)] = k;
    });
  }
  function anchorOf(r, c) {
    var cv = cover[key(r, c)];
    if (!cv) return { r: r, c: c };
    var p = cv.split(':'); return { r: +p[0], c: +p[1] };
  }

  // ---------- evaluation ----------
  var cache = null;
  function invalidate() { cache = null; }
  function valueOf(r, c, seen) {
    var k = key(r, c);
    if (!cache) cache = {};
    if (k in cache) return cache[k];
    var cell = doc.cells[k];
    var out = '';
    if (cell) {
      if (cell.f) {
        seen = seen || {};
        if (seen[k]) { cache[k] = '#วน!'; return '#วน!'; }
        seen[k] = 1;
        try { out = XL2.evaluate(cell.f, function (rr, cc) { return valueOf(rr, cc, seen); }); }
        catch (e) { out = '#ERR'; }
        delete seen[k];
      } else out = (cell.v != null ? cell.v : '');
    }
    cache[k] = out;
    return out;
  }
  function displayOf(r, c) {
    var cell = cellAt(r, c);
    var v = valueOf(r, c);
    if (v == null || v === '') return '';
    var t = cell ? cell.t : 'auto';
    if (t === 'text') return String(v);
    if (XL2.isNumeric(v)) {
      var n = XL2.toN(v);
      var s;
      var dp = (cell && cell.s && cell.s.dp != null) ? cell.s.dp : null;
      if (dp != null) s = n.toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp });
      else s = XL2.fmtNum(n);
      if (cell && cell.s && cell.s.pm && n > 0) s = '+' + s;
      return s;
    }
    return String(v);
  }

  // ---------- visibility (admin/user) ----------
  function rowHidden(r) {
    if (doc.hideRows && doc.hideRows[r]) return true;                 // ซ่อนแบบ Excel (ทั้งสองโหมด)
    if (view.mode === 'user') {
      if (doc.adminRows && doc.adminRows[r]) return true;            // ล็อก = ซ่อนจากผู้ใช้
      if (doc.uHideRows && doc.uHideRows[r]) return true;            // ซ่อนเฉพาะโหมดผู้ใช้
    }
    return false;
  }
  function colHidden(c) {
    if (doc.hideCols && doc.hideCols[c]) return true;
    if (view.mode === 'user') {
      if (doc.adminCols && doc.adminCols[c]) return true;
      if (doc.uHideCols && doc.uHideCols[c]) return true;
    }
    return false;
  }
  function stepRow(r, d) { var n = r + d; while (n >= 0 && n < doc.nRows && rowHidden(n)) n += d; return (n < 0 || n >= doc.nRows) ? r : n; }
  function stepCol(c, d) { var n = c + d; while (n >= 0 && n < doc.nCols && colHidden(n)) n += d; return (n < 0 || n >= doc.nCols) ? c : n; }

  // ---------- filter / search (สกรีนผล) ----------
  // admin: พิมพ์ค้นหาแล้วกรองทันที · user: ต้องเลือกเงื่อนไข+กดค้นหาก่อนจึงเห็นข้อมูล
  var flt = { q: '', brand: '', size: '', rim: '', applied: false };
  var lastMatchCount = 0;
  var USER_MAX = 60;            // ผู้ใช้: ผลลัพธ์เกิน 60 รายการ = ให้ระบุเงื่อนไขเพิ่ม
  var tooMany = false;
  function rowKind(r) {
    if (r < 2) return 'title';
    var m = doc.merges[r + ':0'];
    var v0 = String(valueOf(r, 0));
    if (m && m.cs > 1) return v0.indexOf('ขอบ') >= 0 ? 'sect' : 'title';
    if (v0 === 'ขนาด') return 'head';
    return 'data';
  }
  function rowSizeText(r) { var a = anchorOf(r, 0); return String(valueOf(a.r, 0)).split('\n')[0].trim(); }
  // แยกส่วนขนาดยาง: 205/75R14C → {w:205, series:'75', rim:'14'} · 185R14C → {w:185, series:'', rim:'14'}
  function parseSizeStr(t) {
    var m = /(\d{3})(?:\/(\d{2,3}))?\s*R\s*(\d{2})/i.exec(String(t || ''));
    if (!m) return null;
    return { w: m[1], series: m[2] || '', rim: m[3] };
  }
  // ความสูง (เส้นผ่าศูนย์กลาง) — หาจากช่องขนาด หรือคอลัมน์หมายเหตุของกลุ่ม เช่น "( 65.2 cm )"
  function rowDiaCm(r) {
    var re = /([\d.]+)\s*cm/i;
    var a = anchorOf(r, 0);
    var m = re.exec(String(valueOf(a.r, 0)));
    if (m) return parseFloat(m[1]);
    var mg = doc.merges[a.r + ':0'];
    var n = (mg && mg.cs === 1) ? mg.rs : 1;
    var noteCol = Math.min(22, doc.nCols - 1);
    for (var rr = a.r; rr < a.r + n && rr < doc.nRows; rr++) {
      var m2 = re.exec(String(valueOf(rr, noteCol)));
      if (m2) return parseFloat(m2[1]);
    }
    return null;
  }
  function rowText(r) {
    var out = [rowSizeText(r)];
    for (var c = 1; c < doc.nCols; c++) out.push(String(displayOf(r, c)));
    return out.join(' ').toLowerCase();
  }
  function filterActive() {
    if (view.mode === 'user') return true;
    return !!(flt.q || flt.brand || flt.size || flt.rim || flt.width || flt.series || flt.height);
  }
  function computeRowVis() {
    var vis = new Array(doc.nRows);
    lastMatchCount = 0; tooMany = false;
    if (!filterActive()) { for (var r0 = 0; r0 < doc.nRows; r0++) vis[r0] = !rowHidden(r0); return vis; }
    if (view.mode === 'user' && !flt.applied) { for (var r1 = 0; r1 < doc.nRows; r1++) vis[r1] = (rowKind(r1) === 'title' && r1 < 2); return vis; }
    var q = flt.q.toLowerCase();
    var curRim = '', kinds = [], rims = [];
    for (var r = 0; r < doc.nRows; r++) {
      var kind = rowKind(r); kinds[r] = kind;
      if (kind === 'sect') curRim = String(valueOf(r, 0));
      rims[r] = curRim;
      if (kind !== 'data') { vis[r] = false; continue; }
      if (rowHidden(r)) { vis[r] = false; continue; }
      var ok = true;
      var sz = parseSizeStr(rowSizeText(r));
      if (flt.rim) ok = !!(sz && sz.rim === flt.rim);
      if (ok && flt.width) ok = !!(sz && sz.w === flt.width);
      if (ok && flt.series) ok = !!(sz && (flt.series === 'full' ? !sz.series : sz.series === flt.series));
      if (ok && flt.height) {
        var dia = rowDiaCm(r);
        var target = (flt.hUnit === 'in') ? parseFloat(flt.height) * 2.54 : parseFloat(flt.height);
        ok = !!(dia && isFinite(target) && Math.abs(dia - target) <= 1.5);
      }
      if (ok && flt.brand && String(valueOf(r, 2)).trim() !== flt.brand) ok = false;
      if (ok && flt.size && rowSizeText(r) !== flt.size) ok = false;
      if (ok && q && rowText(r).indexOf(q) < 0) ok = false;
      if (ok && !String(valueOf(r, 2)).trim() && !rowSizeText(r)) ok = false;  // แถวเปล่าไม่ต้องโผล่
      vis[r] = ok;
      if (ok) lastMatchCount++;
    }
    // หัวเรื่อง/หัว section/หัวตาราง โผล่เมื่อ section นั้นมีผลลัพธ์
    if (view.mode === 'user' && lastMatchCount > USER_MAX) {
      tooMany = true;
      for (var rt = 0; rt < doc.nRows; rt++) vis[rt] = (rt < 2 && rowKind(rt) === 'title');
      return vis;
    }
    for (var r2 = 0; r2 < doc.nRows; r2++) {
      if (kinds[r2] === 'title' && r2 < 2) vis[r2] = true;
      else if (kinds[r2] === 'sect' || kinds[r2] === 'head' || kinds[r2] === 'title') {
        // มองไปข้างหน้าจนจบ section
        var any = false;
        for (var rr = r2 + 1; rr < doc.nRows; rr++) {
          if (kinds[rr] === 'sect') break;
          if (kinds[rr] === 'data' && vis[rr]) { any = true; break; }
        }
        vis[r2] = any;
      }
    }
    return vis;
  }
  function setFilter(o) {
    flt.q = (o.q || '').trim(); flt.brand = o.brand || ''; flt.size = o.size || ''; flt.rim = o.rim || '';
    flt.width = o.width || ''; flt.series = o.series || ''; flt.height = (o.height || '').toString().trim(); flt.hUnit = o.hUnit || 'cm';
    flt.applied = !!o.applied;
    render();
    return lastMatchCount;
  }
  function clearFilter() { flt = { q: '', brand: '', size: '', rim: '', width: '', series: '', height: '', hUnit: 'cm', applied: false }; render(); }
  function filterOptions() {
    if (!cache) cache = {};
    var brands = {}, sizes = {}, rims = {}, widths = {}, seriesL = {}, heights = {}, hasFull = false;
    for (var r = 0; r < doc.nRows; r++) {
      var kind = rowKind(r);
      if (kind !== 'data') continue;
      var b = String(valueOf(r, 2)).trim(); if (b) brands[b] = 1;
      var s = rowSizeText(r);
      if (s && s !== 'ขนาดใหม่') {
        sizes[s] = 1;
        var p = parseSizeStr(s);
        if (p) {
          rims[p.rim] = 1; widths[p.w] = 1;
          if (p.series) seriesL[p.series] = 1; else hasFull = true;
        }
        var dia = rowDiaCm(r);
        if (dia) heights[dia.toFixed(1)] = 1;
      }
    }
    function numSort(o) { return Object.keys(o).sort(function (a, b) { return (+a) - (+b); }); }
    return { brands: Object.keys(brands).sort(), sizes: Object.keys(sizes).sort(),
      rims: numSort(rims), widths: numSort(widths), seriesList: numSort(seriesL), hasFullSeries: hasFull,
      heights: numSort(heights) };
  }

  // ---------- render ----------
  function colW(c) { return Math.round((doc.colW[c] || 64) * view.zoom); }
  function rowH(r) { return Math.round((doc.rowH[r] || 19) * view.zoom); }

  function render() {
    if (!cache) cache = {};
    if (!doc.hideRows) doc.hideRows = {}; if (!doc.hideCols) doc.hideCols = {};
    if (!doc.uHideRows) doc.uHideRows = {}; if (!doc.uHideCols) doc.uHideCols = {};
    uiDark = !!(document.body && document.body.classList.contains('dark'));
    var isAdmin = view.mode === 'admin';
    var rowVis = computeRowVis();
    function firstVisIn(r0, rs) { for (var r = r0; r < r0 + rs && r < doc.nRows; r++) if (rowVis[r]) return r; return -1; }
    function visInSpan(r0, rs) { var n = 0; for (var r = r0; r < r0 + rs && r < doc.nRows; r++) if (rowVis[r]) n++; return Math.max(1, n); }
    function visColsInSpan(c0, cs) { var n = 0; for (var c = c0; c < c0 + cs && c < doc.nCols; c++) if (!colHidden(c)) n++; return Math.max(1, n); }
    var html = '<table class="sg" style="font-size:' + (10 * view.zoom) + 'px"><colgroup><col style="width:' + Math.round(30 * view.zoom) + 'px">';
    for (var c = 0; c < doc.nCols; c++) if (!colHidden(c)) html += '<col style="width:' + colW(c) + 'px">';
    html += '</colgroup>';
    // A-B-C header
    html += '<tr class="sg-abc" style="height:' + Math.round(18 * view.zoom) + 'px"><th class="sg-corner" title="เลือกทั้งหมด"></th>';
    for (var c2 = 0; c2 < doc.nCols; c2++) {
      if (colHidden(c2)) continue;
      var lockC = doc.adminCols && doc.adminCols[c2];
      html += '<th class="sg-h' + (lockC && isAdmin ? ' lockh' : '') + '" data-hc="' + c2 + '" title="คอลัมน์ ' + XL2.colName(c2) + (lockC ? ' · 🔒เฉพาะแอดมิน' : '') + '">' + XL2.colName(c2) +
        (isAdmin ? '<span class="sg-rzc" data-rz="' + c2 + '"></span>' : '') + '</th>';
    }
    html += '</tr>';
    if (!isAdmin) html += '<tr><td class="sg-uview" colspan="999">👁️ มุมมองผู้ใช้ — อ่านอย่างเดียว · แถว/คอลัมน์ 🔒 ถูกซ่อน</td></tr>';

    for (var r = 0; r < doc.nRows; r++) {
      if (!rowVis[r]) continue;
      var lockR = doc.adminRows && doc.adminRows[r];
      html += '<tr data-row="' + r + '" style="height:' + rowH(r) + 'px">';
      html += '<td class="sg-g' + (lockR && isAdmin ? ' lockg' : '') + '" data-gr="' + r + '" title="แถว ' + (r + 1) + (lockR ? ' · 🔒เฉพาะแอดมิน' : '') + (isAdmin && doc.changes && doc.changes[r] ? ' · ✏️ มีการปรับราคารอบนี้' : '') + '">' + (r + 1) + (isAdmin && doc.changes && doc.changes[r] ? '<span class="gchg-corner"></span>' : '') + (isAdmin ? '<span class="sg-rzr" data-rzr="' + r + '"></span>' : '') + '</td>';
      for (var c3 = 0; c3 < doc.nCols; c3++) {
        if (colHidden(c3)) continue;
        var k = key(r, c3);
        if (cover[k]) {
          var a = anchorOf(r, c3);
          var mA = doc.merges[a.r + ':' + a.c];
          // ถ้าแถวหัวผสานถูกกรองออก ให้แถวแรกที่มองเห็นเป็นเจ้าบ้านเซลล์แทน (เช่นช่องขนาด)
          if (c3 === a.c && !rowVis[a.r] && firstVisIn(a.r, mA.rs) === r) {
            html += tdHTML(a.r, c3, isAdmin, visInSpan(a.r, mA.rs), visColsInSpan(a.c, mA.cs));
          }
          continue;
        }
        var mg0 = doc.merges[k];
        if (mg0) html += tdHTML(r, c3, isAdmin, visInSpan(r, mg0.rs), visColsInSpan(c3, mg0.cs));
        else html += tdHTML(r, c3, isAdmin);
      }
      html += '</tr>';
    }
    if (view.mode === 'user' && !flt.applied) {
      html += '<tr><td class="sg-hint" colspan="999">🔍 เลือก ยี่ห้อ · ขนาด · ขอบ หรือพิมพ์คำค้น แล้วกด “ค้นหา” เพื่อแสดงรายการ</td></tr>';
    } else if (view.mode === 'user' && tooMany) {
      html += '<tr><td class="sg-hint sg-hint-warn" colspan="999">⚠️ พบ ' + lastMatchCount + ' รายการ — มากเกินไป (เกิน ' + USER_MAX + ') โปรดระบุ ยี่ห้อ / ขนาด / ขอบ เพิ่ม แล้วค้นหาใหม่</td></tr>';
    } else if (filterActive() && (view.mode === 'admin' || flt.applied) && lastMatchCount === 0) {
      html += '<tr><td class="sg-hint" colspan="999">ไม่พบรายการที่ตรงเงื่อนไข — ลองปรับคำค้นหรือกด ล้าง</td></tr>';
    }
    html += '</table>';
    rootEl.innerHTML = html;
    if (inputEl) rootEl.appendChild(inputEl);
    if (tipEl) rootEl.appendChild(tipEl);
    paintSel();
    updateBars();
    // เส้นขอบที่ผู้ใช้ตีไว้ วาดด้วย SVG overlay (คมชัด ต่อเนื่อง ตรงแบบ Excel)
    if (window.BorderOverlay) window.BorderOverlay.draw(rootEl, doc, view);
  }

  // ---------- โหมดมืด: สีตัวอักษรที่มืดจนกลืนกับพื้น → ปรับเป็นสีคอนทราสต์ชั่วคราว (เฉพาะตอนแสดงผล ไม่แตะข้อมูลจริง)
  var uiDark = false;
  function darkContrast(hex) {
    var h = String(hex).replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var r = parseInt(h.substr(0, 2), 16), g = parseInt(h.substr(2, 2), 16), b = parseInt(h.substr(4, 2), 16);
    if (isNaN(r) || isNaN(g) || isNaN(b)) return h;
    var lum = 0.299 * r + 0.587 * g + 0.114 * b;
    if (lum >= 140) return h;                       // สว่างพออยู่แล้ว
    function f(c) { var v = Math.round(c + (255 - c) * 0.55).toString(16); return v.length < 2 ? '0' + v : v; }
    return f(r) + f(g) + f(b);
  }

  // ตัวเลขแบบปลอดภัย (ค่าเก่าอาจเป็นข้อความ — ไม่ให้ throw จนหน้าพัง)
  function nOr(v, fb) { return XL2.isNumeric(v) ? XL2.toN(v) : fb; }

  function tdHTML(r, c, isAdmin, effRs, effCs) {
    var cell = cellAt(r, c), s = (cell && cell.s) || {};
    var mg = doc.merges[key(r, c)];
    var st = '';
    if (s.bg) st += 'background:#' + s.bg + ';';
    if (s.fc) st += 'color:#' + ((uiDark && !s.bg) ? darkContrast(s.fc) : s.fc) + ';';
    if (s.b) st += 'font-weight:700;';
    if (s.i) st += 'font-style:italic;';
    if (s.u) st += 'text-decoration:underline;';
    if (s.fs) st += 'font-size:' + Math.round(s.fs * view.zoom) + 'px;';
    if (s.ff) st += "font-family:'" + s.ff + "',Arial,sans-serif;";
    if (s.va) st += 'vertical-align:' + s.va + ';';
    if (s.mn) st += "font-family:Consolas,'Courier New',monospace;letter-spacing:.5px;";
    // เส้นขอบ (s.bd) ไม่วาดเป็น CSS border บน td อีกต่อไป — ใช้ SVG overlay แทน (ดู border-overlay.js)
    // เพื่อเลี่ยงปัญหา border-collapse: เส้นสีชนเส้นตารางเทา / เส้นหนาเยื้องข้างเดียว / เส้นประไม่ต่อกัน
    st += 'text-align:' + (s.al || (XL2.isNumeric(valueOf(r, c)) ? 'right' : 'left')) + ';';
    // สีตามเงื่อนไข (Margin): บวกเขียว / ลบแดง — ตั้งค่าสีได้ที่ doc.condColors
    if (s.cond === 'pn') {
      var cv = valueOf(r, c);
      if (XL2.isNumeric(cv)) {
        var cn = XL2.toN(cv), cc = doc.condColors || {};
        var pc = cn > 0 ? (cc.pos || '008000') : cn < 0 ? (cc.neg || 'C00000') : null;
        if (pc) st += 'color:#' + ((uiDark && !s.bg) ? darkContrast(pc) : pc) + ';';
      }
    }
    var cls = 'sg-c';
    var adm = isAdmin && ((doc.adminRows && doc.adminRows[r]) || (doc.adminCols && doc.adminCols[c]));
    if (adm) cls += ' adm';
    if (cell && cell.f) cls += ' hasf';
    var disp = displayOf(r, c);
    if (view.secret && (doc.adminCols && doc.adminCols[c]) && disp !== '' && !(cell && cell.f && /COGS|DEALER/i.test(cell.f))) disp = '•••';
    var linked = (c === 3 && doc.rowLinks && doc.rowLinks[r]);
    if (linked) cls += ' dblink';
    // สัญลักษณ์การปรับราคา
    var suffix = '', chg = doc.changes && doc.changes[r] && doc.changes[r][c];
    if (chg && isAdmin) {
      // มุมเขียว = ปรับขึ้น · มุมส้ม = ปรับลง · เท่าเดิม = ไม่แสดง (ยังไม่ถือว่าเปลี่ยน)
      var aCur = valueOf(r, c);
      var aOld = nOr(chg.old, 0), aNew = nOr(aCur, aOld);
      if (aNew > aOld) cls += ' chg chg-up';
      else if (aNew < aOld) cls += ' chg chg-dn';
    } else if (chg && !isAdmin && chg.sent) {
      var eff = parseEff(chg.effectiveAt);
      if (eff.getTime() > Date.now()) {
        cls += ' pend pclick';
        suffix = ' <span class="pbadge">⏳</span>';
      } else {
        var curV = valueOf(r, c);
        var oldN = nOr(chg.old, 0), curN = nOr(curV, oldN);
        if (curN > oldN) { cls += ' pclick'; suffix = ' <span class="arr arr-up">▲</span>'; }
        else if (curN < oldN) { cls += ' pclick'; suffix = ' <span class="arr arr-dn">▼</span>'; }
      }
    }
    var rsv = (effRs != null) ? effRs : (mg ? mg.rs : 0);
    var csv = (effCs != null) ? effCs : (mg ? mg.cs : 0);
    var span = (rsv > 1 || csv > 1 || mg) ? ' rowspan="' + Math.max(1, rsv) + '" colspan="' + Math.max(1, csv) + '"' : '';
    return '<td class="' + cls + '" data-r="' + r + '" data-c="' + c + '"' + span + (st ? ' style="' + st + '"' : '') +
      (linked ? ' title="🔗 ' + esc((XL2.dbInfo(doc.rowLinks[r]).code ? XL2.dbInfo(doc.rowLinks[r]).code + ' · ' : '') + XL2.dbInfo(doc.rowLinks[r]).name) + '"' : (chg && isAdmin && cls.indexOf(' chg') >= 0 ? ' title="✏️ ปรับรอบนี้ · เดิม: ' + esc(XL2.fmtNum(nOr(chg.old, 0))) + (cls.indexOf('chg-up') >= 0 ? ' (ขึ้น)' : ' (ลง)') + '"' : '')) +
      '>' + esc(disp).replace(/\n/g, '<br>') + suffix + '</td>';
  }

  // ---------- selection ----------
  function cellEl(r, c) { var a = anchorOf(r, c); return rootEl.querySelector('td[data-r="' + a.r + '"][data-c="' + a.c + '"]'); }
  function range() { return { r1: Math.min(sel.r, sel.ar), r2: Math.max(sel.r, sel.ar), c1: Math.min(sel.c, sel.ac), c2: Math.max(sel.c, sel.ac) }; }

  function paintSel() {
    rootEl.querySelectorAll('.sg-c.sel,.sg-c.act').forEach(function (e) { e.classList.remove('sel', 'act'); });
    rootEl.querySelectorAll('.sg-h.on,.sg-g.on').forEach(function (e) { e.classList.remove('on'); });
    var R = range();
    for (var r = R.r1; r <= R.r2; r++) for (var c = R.c1; c <= R.c2; c++) {
      // ช่องผสานที่จุดตั้งต้นอยู่นอกกรอบที่ลาก — ไม่ระบาย (ไม่ให้แถว/ตารางอื่นติดมาด้วย)
      var a = anchorOf(r, c);
      if (a.r < R.r1 || a.r > R.r2 || a.c < R.c1 || a.c > R.c2) continue;
      var el = rootEl.querySelector('td[data-r="' + a.r + '"][data-c="' + a.c + '"]');
      if (el) el.classList.add('sel');
    }
    var act = cellEl(sel.r, sel.c); if (act) act.classList.add('act');
    for (var c2 = R.c1; c2 <= R.c2; c2++) { var h = rootEl.querySelector('.sg-h[data-hc="' + c2 + '"]'); if (h) h.classList.add('on'); }
    for (var r2 = R.r1; r2 <= R.r2; r2++) { var g = rootEl.querySelector('.sg-g[data-gr="' + r2 + '"]'); if (g) g.classList.add('on'); }
    drawSelRect();
    updateBars();
  }
  // กรอบสีรอบช่วงที่เลือกทั้งหมด (เส้นทึบสีที่บันทึกไว้ — แบบ Excel)
  function drawSelRect() {
    var box = document.getElementById('selRect');
    var cells = rootEl.querySelectorAll('.sg-c.sel, .sg-c.act, .sg-c.fillpv');
    rootEl.classList.toggle('hasrange', cells.length >= 2);
    if (cells.length < 2) { if (box) box.style.display = 'none'; return; }
    var gr = rootEl.getBoundingClientRect();
    var minL = 1e9, minT = 1e9, maxR = -1e9, maxB = -1e9;
    cells.forEach(function (c) { var r = c.getBoundingClientRect(); if (r.width === 0 && r.height === 0) return; minL = Math.min(minL, r.left); minT = Math.min(minT, r.top); maxR = Math.max(maxR, r.right); maxB = Math.max(maxB, r.bottom); });
    if (!box) { box = document.createElement('div'); box.id = 'selRect'; rootEl.appendChild(box); }
    box.style.display = 'block';
    box.style.left = (minL - gr.left) + 'px';
    box.style.top = (minT - gr.top) + 'px';
    box.style.width = (maxR - minL) + 'px';
    box.style.height = (maxB - minT) + 'px';
  }

  function setActive(r, c, keepAnchor) {
    r = Math.max(0, Math.min(doc.nRows - 1, r));
    c = Math.max(0, Math.min(doc.nCols - 1, c));
    sel.r = r; sel.c = c;
    if (!keepAnchor) { sel.ar = r; sel.ac = c; }
    paintSel();
    var el = cellEl(r, c);
    if (el) {
      var rect = el.getBoundingClientRect(), pr = rootEl.getBoundingClientRect();
      if (rect.bottom > pr.bottom - 6) rootEl.scrollTop += rect.bottom - pr.bottom + 26;
      if (rect.top < pr.top + 24) rootEl.scrollTop -= (pr.top + 24 - rect.top);
      if (rect.right > pr.right - 6) rootEl.scrollLeft += rect.right - pr.right + 26;
      if (rect.left < pr.left + 34) rootEl.scrollLeft -= (pr.left + 34 - rect.left);
    }
  }

  function updateBars() {
    paintClip();
    if (nameEl) nameEl.textContent = XL2.refStr(sel.r, sel.c);
    var fsB = document.getElementById('fsBox');
    if (fsB && document.activeElement !== fsB) { var fc = cellAt(sel.r, sel.c); fsB.value = (fc && fc.s && fc.s.fs) ? fc.s.fs : 10; }
    if (fxEl && !editing) {
      var cell = cellAt(sel.r, sel.c);
      fxEl.value = cell ? (cell.f ? cell.f : (cell.v != null ? String(cell.v) : '')) : '';
    }
    if (statusEl) {
      var cell = cellAt(sel.r, sel.c);
      var info = cell && cell.f ? 'สูตร: ' + cell.f : (cell && cell.t === 'text' ? 'ข้อความ' : cell && cell.t === 'num' ? 'ตัวเลข' : 'อัตโนมัติ');
      statusEl.innerHTML = '<b>' + XL2.refStr(sel.r, sel.c) + '</b> · ' + esc(info);
    }
    if (sumEl) {
      var R = range(), nums = [], cnt = 0;
      for (var r = R.r1; r <= R.r2; r++) for (var c = R.c1; c <= R.c2; c++) {
        var v = valueOf(r, c);
        if (v !== '' && v != null) { cnt++; if (XL2.isNumeric(v)) nums.push(XL2.toN(v)); }
      }
      if (nums.length > 1) {
        var sum = nums.reduce(function (a, b) { return a + b; }, 0);
        sumEl.textContent = 'ผลรวม: ' + XL2.fmtNum(sum) + ' · เฉลี่ย: ' + XL2.fmtNum(sum / nums.length) + ' · จำนวน: ' + cnt;
      } else sumEl.textContent = '';
    }
  }

  // ---------- price-change tracking (ปรับปรุงรอบนี้) ----------
  var PRICE_NAME = { 7: 'ราคาตั้ง', 13: 'SUB-B', 16: 'SUB-A', 19: 'SUB-S' };
  function recordChange(r, c, oldVal) {
    if (!PRICE_NAME[c]) return;
    if (rowKind(r) !== 'data') return;
    doc.changes = doc.changes || {};
    var rc = doc.changes[r] = doc.changes[r] || {};
    if (!rc[c]) rc[c] = { old: oldVal, ts: Date.now() };   // เก็บราคาเดิมของรอบนี้ไว้ครั้งแรกครั้งเดียว
  }
  function parseEff(s) {
    if (!s || s === 'ทันที') return new Date(0);
    var d = new Date(String(s).replace(' ', 'T'));
    return isNaN(d.getTime()) ? new Date(0) : d;
  }
  // ถ้าปรับกลับมาเท่าราคาเดิม (และยังไม่เผยแพร่) → ลบเครื่องหมายทิ้ง ถือว่าไม่มีการเปลี่ยนแปลง
  function pruneChange(r, c) {
    var rc = doc.changes && doc.changes[r];
    if (!rc || !rc[c] || rc[c].sent) return;
    var cur = valueOf(r, c);
    var oldN = nOr(rc[c].old, 0);
    var curN = nOr(cur, NaN);
    if (curN === oldN) {
      delete rc[c];
      if (!Object.keys(rc).length) delete doc.changes[r];
    }
  }
  // มีการปรับจริงอย่างน้อย 1 ช่อง (ไม่นับที่ปรับกลับมาเท่าเดิม)
  function rowHasRealChange(r) {
    var rc = doc.changes && doc.changes[r];
    if (!rc) return false;
    return Object.keys(rc).some(function (c) {
      var e = rc[c];
      if (e.sent) return true;
      var cur = valueOf(r, +c);
      var oldN = nOr(e.old, 0);
      var curN = nOr(cur, oldN);
      return curN !== oldN;
    });
  }

  function clearChanges() {
    if (view.mode !== 'admin') return;
    pushUndo();
    doc.changes = {};
    afterChange(); toast('ล้างเครื่องหมายการปรับปรุง — เริ่มรอบใหม่');
  }

  // ---------- editing ----------
  function startEdit(initial, viaFx) {
    if (view.mode !== 'admin') { toast('มุมมองผู้ใช้ — อ่านอย่างเดียว'); return; }
    var a = anchorOf(sel.r, sel.c);
    editing = { r: a.r, c: a.c, viaFx: !!viaFx };
    var el = cellEl(a.r, a.c);
    if (el && !viaFx) {
      inputEl.style.display = 'block';
      inputEl.style.left = el.offsetLeft + 'px';
      inputEl.style.top = el.offsetTop + 'px';
      inputEl.style.width = Math.max(40, el.offsetWidth - 1) + 'px';
      inputEl.style.height = (el.offsetHeight - 1) + 'px';
      inputEl.style.fontSize = (10 * view.zoom) + 'px';
      var cell = cellAt(a.r, a.c);
      inputEl.value = (initial != null) ? initial : (cell ? (cell.f || (cell.v != null ? String(cell.v) : '')) : '');
      inputEl.focus();
      if (initial == null) inputEl.select();
    }
    if (fxEl) fxEl.value = inputEl.value;
  }
  function commitEdit(move) {
    if (!editing) return;
    var r = editing.r, c = editing.c;
    var val = editing.viaFx ? fxEl.value : inputEl.value;
    var cell = cellAt(r, c);
    var oldRepr = cell ? (cell.f || String(cell.v != null ? cell.v : '')) : '';
    if (oldRepr !== val) {
      pushUndo();
      recordChange(r, c, valueOf(r, c));
      var nc = ensureCell(r, c);
      if (val.charAt(0) === '=') { nc.f = val; }
      else {
        delete nc.f;
        nc.v = val;
        if (nc.t === 'num' && val !== '' && !XL2.isNumeric(val)) { /* เก็บตามพิมพ์ แต่เตือน */ toast('⚠ ช่องนี้กำหนดเป็นตัวเลข'); }
      }
      invalidate();
      pruneChange(r, c);
      afterChange();
    }
    editing = null;
    inputEl.style.display = 'none';
    if (move === 'down') setActive(stepRow(sel.r, 1), sel.c);
    else if (move === 'up') setActive(stepRow(sel.r, -1), sel.c);
    else if (move === 'right') setActive(sel.r, stepCol(sel.c, 1));
    else if (move === 'left') setActive(sel.r, stepCol(sel.c, -1));
    else paintSel();
    rootEl.focus();
  }
  function cancelEdit() { editing = null; inputEl.style.display = 'none'; updateBars(); rootEl.focus(); }

  // ---------- clipboard ----------
  function doCopy(cut) {
    var R = range(), rows = [], tsv = [];
    for (var r = R.r1; r <= R.r2; r++) {
      var line = [], vals = [];
      for (var c = R.c1; c <= R.c2; c++) {
        var cell = cellAt(r, c);
        vals.push(cell ? { f: cell.f, v: cell.v, t: cell.t, s: JSON.parse(JSON.stringify(cell.s || {})) } : null);
        line.push(String(valueOf(r, c)));
      }
      rows.push(vals); tsv.push(line.join('\t'));
    }
    clip = { rows: rows, r0: R.r1, c0: R.c1, range: { r1: R.r1, r2: R.r2, c1: R.c1, c2: R.c2 } };
    // จำว่าคัดลอกทั้งแถว/ทั้งคอลัมน์ (ไว้ใช้ “แทรกที่คัดลอก” แบบ Excel)
    clip.fullRows = (R.c1 === 0 && R.c2 === doc.nCols - 1);
    clip.fullCols = (R.r1 === 0 && R.r2 === doc.nRows - 1);
    if (clip.fullRows) {
      clip.rowHs = []; for (var rh = R.r1; rh <= R.r2; rh++) clip.rowHs.push(doc.rowH[rh] || 19);
      clip.mergesR = [];
      Object.keys(doc.merges).forEach(function (mk) {
        var p = mk.split(':'), mr = +p[0], mc2 = +p[1], m = doc.merges[mk];
        if (mr >= R.r1 && mr + m.rs - 1 <= R.r2) clip.mergesR.push({ dr: mr - R.r1, c: mc2, rs: m.rs, cs: m.cs });
      });
    }
    if (clip.fullCols) {
      clip.colWs = []; for (var cw = R.c1; cw <= R.c2; cw++) clip.colWs.push(doc.colW[cw] || 64);
      clip.mergesC = [];
      Object.keys(doc.merges).forEach(function (mk) {
        var p = mk.split(':'), mr = +p[0], mc3 = +p[1], m = doc.merges[mk];
        if (mc3 >= R.c1 && mc3 + m.cs - 1 <= R.c2) clip.mergesC.push({ r: mr, dc: mc3 - R.c1, rs: m.rs, cs: m.cs });
      });
    }
    try { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(tsv.join('\n')).catch(function () {}); } catch (e) {}
    clip.cut = !!cut;   // ตัด = ยังไม่ลบต้นทาง รอจนกว่าจะวาง (เหมือน Excel)
    paintClip();
    toast((cut ? 'ตัดแล้ว — เลือกปลายทางแล้ววาง (Ctrl+V)' : 'คัดลอกแล้ว' + (clip.fullRows ? ' (' + rows.length + ' แถวเต็ม)' : clip.fullCols ? ' (ทั้งคอลัมน์)' : '')) + ' · Esc = ยกเลิก');
  }

  // ขอบประช่วงที่คัดลอก (เส้นประเขียวแบบ Excel) · Esc = ยกเลิก
  function paintClip() {
    rootEl.querySelectorAll('.sg-c.cpm').forEach(function (e) { e.classList.remove('cpm'); });
    if (!clip || !clip.range) return;
    var R = clip.range;
    for (var r = R.r1; r <= R.r2 && r < doc.nRows; r++) for (var c = R.c1; c <= R.c2 && c < doc.nCols; c++) {
      var el = cellEl(r, c); if (el) el.classList.add('cpm');
    }
  }
  function clearClip(silent) {
    if (!clip) return;
    clip = null;
    paintClip();
    if (!silent) toast('ยกเลิกการคัดลอกแล้ว — คัดลอก/ตัดใหม่ได้เลย');
  }
  function doPaste() {
    if (!clip || view.mode !== 'admin') return;
    pushUndo();
    var R = range();
    var dr = R.r1 - clip.r0, dc = R.c1 - clip.c0;
    var isCut = !!clip.cut;
    var nRows = clip.rows.length, nCols = clip.rows[0] ? clip.rows[0].length : 0;
    for (var i = 0; i < nRows; i++) for (var j = 0; j < clip.rows[i].length; j++) {
      var r = R.r1 + i, c = R.c1 + j;
      if (r >= doc.nRows || c >= doc.nCols) continue;
      var src = clip.rows[i][j];
      if (PRICE_NAME[c]) recordChange(r, c, valueOf(r, c));
      if (!src) { delete doc.cells[key(r, c)]; continue; }
      var nc = ensureCell(r, c);
      nc.t = src.t; nc.s = JSON.parse(JSON.stringify(src.s));
      // ตัด→วาง = ย้าย (สูตรไม่เลื่อนอ้างอิง เหมือน Excel) · คัดลอก→วาง = เลื่อนอ้างอิง
      if (src.f) { nc.f = isCut ? src.f : XL2.shiftFormula(src.f, dr, dc); delete nc.v; }
      else { nc.v = src.v; delete nc.f; }
    }
    if (isCut && clip.range) {
      // ลบต้นทางเฉพาะส่วนที่ไม่ทับกับปลายทาง — ถึงตอนนี้ค่อยตัดจริง
      var S = clip.range;
      for (var sr = S.r1; sr <= S.r2; sr++) for (var sc = S.c1; sc <= S.c2; sc++) {
        if (sr >= R.r1 && sr < R.r1 + nRows && sc >= R.c1 && sc < R.c1 + nCols) continue;
        delete doc.cells[key(sr, sc)];
      }
      clip = null;   // ตัดใช้ได้ครั้งเดียว — จบงาน เส้นกระพริบหาย
    }
    afterChange(); toast(isCut ? 'ย้ายเรียบร้อย (ตัด → วาง)' : 'วางแล้ว');
  }
  function delRange() {
    if (view.mode !== 'admin') return;
    pushUndo();
    var R = range();
    for (var r = R.r1; r <= R.r2; r++) for (var c = R.c1; c <= R.c2; c++) {
      var cell = cellAt(r, c);
      if (cell) { delete cell.f; cell.v = ''; }
    }
    afterChange();
  }

  // ---------- fill handle (ลากมุมขวาล่าง copy ตามแถว/คอลัมน์) ----------
  function fillTo(tr, tc) {
    var R = range();
    pushUndo();
    // ทิศทางหลัก: แนวตั้งหรือแนวนอน
    if (tr > R.r2) { // ลงล่าง
      for (var r = R.r2 + 1; r <= tr && r < doc.nRows; r++) for (var c = R.c1; c <= R.c2; c++) copyShift(R.r1 + ((r - R.r1) % (R.r2 - R.r1 + 1)), c, r, c);
      sel.ar = R.r1; sel.ac = R.c1; sel.r = tr; sel.c = R.c2;
    } else if (tc > R.c2) { // ไปขวา
      for (var c2 = R.c2 + 1; c2 <= tc && c2 < doc.nCols; c2++) for (var r2 = R.r1; r2 <= R.r2; r2++) copyShift(r2, R.c1 + ((c2 - R.c1) % (R.c2 - R.c1 + 1)), r2, c2);
      sel.ar = R.r1; sel.ac = R.c1; sel.r = R.r2; sel.c = tc;
    }
    afterChange();
  }
  function copyShift(sr, sc, tr, tc) {
    var src = cellAt(sr, sc);
    if (!src) { delete doc.cells[key(tr, tc)]; return; }
    var nc = ensureCell(tr, tc);
    nc.t = src.t; nc.s = JSON.parse(JSON.stringify(src.s || {}));
    if (src.f) { nc.f = XL2.shiftFormula(src.f, tr - sr, tc - sc); delete nc.v; }
    else { nc.v = src.v; delete nc.f; }
  }

  // ---------- structure ops ----------
  function remapAll(fn) {
    // fn(r,c) -> [nr,nc] or null (deleted)
    var nc = {}, nm = {};
    Object.keys(doc.cells).forEach(function (k) {
      var p = k.split(':'), out = fn(+p[0], +p[1]);
      if (out) nc[out[0] + ':' + out[1]] = doc.cells[k];
    });
    Object.keys(doc.merges).forEach(function (k) {
      var p = k.split(':'), out = fn(+p[0], +p[1]);
      if (out) nm[out[0] + ':' + out[1]] = doc.merges[k];
    });
    doc.cells = nc; doc.merges = nm;
    // rewrite formulas
    Object.keys(doc.cells).forEach(function (k) {
      var cell = doc.cells[k];
      if (cell.f) cell.f = XL2.remapFormula(cell.f, function (r, c) { return fn(r, c); });
    });
  }
  function insertRow(at, silent) { insertRows(at, 1, silent); }
  function insertRows(at, n, silent) {
    if (view.mode !== 'admin') return;
    n = Math.max(1, n || 1);
    if (!silent) pushUndo();
    remapAll(function (r, c) { return [r >= at ? r + n : r, c]; });
    // ขยายช่วงผสานที่คร่อมจุดแทรก
    Object.keys(doc.merges).forEach(function (k) {
      var p = k.split(':'), r = +p[0], m = doc.merges[k];
      if (r < at && r + m.rs > at) m.rs += n;
    });
    for (var i = 0; i < n; i++) doc.rowH.splice(at, 0, doc.rowH[at] || 19);
    var na = {}; Object.keys(doc.adminRows).forEach(function (r) { r = +r; na[r >= at ? r + n : r] = 1; }); doc.adminRows = na;
    var nl = {}; Object.keys(doc.rowLinks || {}).forEach(function (r) { var code = doc.rowLinks[r]; r = +r; nl[r >= at ? r + n : r] = code; }); doc.rowLinks = nl;
    var ns = {}; Object.keys(doc.rowSchedules || {}).forEach(function (r) { var w = doc.rowSchedules[r]; r = +r; ns[r >= at ? r + n : r] = w; }); doc.rowSchedules = ns;
    var nch = {}; Object.keys(doc.changes || {}).forEach(function (r) { var v = doc.changes[r]; r = +r; nch[r >= at ? r + n : r] = v; }); doc.changes = nch;
    doc.nRows += n;
    if (!silent) { afterChange(); toast('แทรก ' + n + ' แถวที่แถว ' + (at + 1)); }
  }
  function deleteRow() {
    if (view.mode !== 'admin') return;
    var R = range(), n = R.r2 - R.r1 + 1;
    if (doc.nRows - n < 1) return;
    pushUndo();
    remapAll(function (r, c) { if (r >= R.r1 && r <= R.r2) return null; return [r > R.r2 ? r - n : r, c]; });
    // หดช่วงผสานที่คร่อมแถวที่ลบ
    Object.keys(doc.merges).forEach(function (k) {
      var p = k.split(':'), r = +p[0], m = doc.merges[k];
      var top = r < R.r1 ? r : null;
      if (top != null) {
        var spanEnd = r + m.rs - 1 + n; // พิกัดเดิมก่อนลบ (anchor ไม่ถูกย้าย)
        var oldEnd = r + m.rs - 1;
        // m.rs ยังอิงจำนวนเดิม: นับจำนวนแถวที่ถูกลบภายในช่วงเดิม
        var ov = Math.max(0, Math.min(R.r2, oldEnd) - R.r1 + 1);
        if (ov > 0) {
          m.rs -= ov;
          if (m.rs <= 1 && m.cs <= 1) delete doc.merges[k];
        }
      }
    });
    doc.rowH.splice(R.r1, n);
    var na = {}; Object.keys(doc.adminRows).forEach(function (r) { r = +r; if (r < R.r1) na[r] = 1; else if (r > R.r2) na[r - n] = 1; }); doc.adminRows = na;
    var nl = {}; Object.keys(doc.rowLinks || {}).forEach(function (r) { var code = doc.rowLinks[r]; r = +r; if (r < R.r1) nl[r] = code; else if (r > R.r2) nl[r - n] = code; }); doc.rowLinks = nl;
    var ns = {}; Object.keys(doc.rowSchedules || {}).forEach(function (r) { var w = doc.rowSchedules[r]; r = +r; if (r < R.r1) ns[r] = w; else if (r > R.r2) ns[r - n] = w; }); doc.rowSchedules = ns;
    var nch = {}; Object.keys(doc.changes || {}).forEach(function (r) { var v = doc.changes[r]; r = +r; if (r < R.r1) nch[r] = v; else if (r > R.r2) nch[r - n] = v; }); doc.changes = nch;
    doc.nRows -= n;
    setActive(Math.min(R.r1, doc.nRows - 1), sel.c);
    afterChange(); toast('ลบ ' + n + ' แถว');
  }
  function insertCol(at) { insertCols(at, 1); }
  function insertCols(at, n, silent) {
    if (view.mode !== 'admin') return;
    n = Math.max(1, n || 1);
    if (!silent) pushUndo();
    remapAll(function (r, c) { return [r, c >= at ? c + n : c]; });
    Object.keys(doc.merges).forEach(function (k) {
      var p = k.split(':'), c = +p[1], m = doc.merges[k];
      if (c < at && c + m.cs > at) m.cs += n;
    });
    for (var i = 0; i < n; i++) doc.colW.splice(at, 0, doc.colW[at] || 64);
    var na = {}; Object.keys(doc.adminCols).forEach(function (c) { c = +c; na[c >= at ? c + n : c] = 1; }); doc.adminCols = na;
    doc.nCols += n;
    if (!silent) { afterChange(); toast('แทรก ' + n + ' คอลัมน์ที่ ' + XL2.colName(at)); }
  }
  function deleteCol() {
    if (view.mode !== 'admin') return;
    var R = range(), n = R.c2 - R.c1 + 1;
    if (doc.nCols - n < 1) return;
    pushUndo();
    remapAll(function (r, c) { if (c >= R.c1 && c <= R.c2) return null; return [r, c > R.c2 ? c - n : c]; });
    doc.colW.splice(R.c1, n);
    var na = {}; Object.keys(doc.adminCols).forEach(function (c) { c = +c; if (c < R.c1) na[c] = 1; else if (c > R.c2) na[c - n] = 1; }); doc.adminCols = na;
    doc.nCols -= n;
    setActive(sel.r, Math.min(R.c1, doc.nCols - 1));
    afterChange(); toast('ลบ ' + n + ' คอลัมน์');
  }
  // ---------- แทรกสิ่งที่คัดลอก (ทั้งแถว/ทั้งคอลัมน์ หลายรายการ แบบ Excel) ----------
  function insertCopiedRows() {
    if (view.mode !== 'admin' || !clip || !clip.fullRows) return;
    pushUndo();
    var at = range().r1, n = clip.rows.length;
    insertRows(at, n, true);
    for (var i = 0; i < n; i++) {
      if (clip.rowHs && clip.rowHs[i]) doc.rowH[at + i] = clip.rowHs[i];
      for (var j = 0; j < clip.rows[i].length && j < doc.nCols; j++) {
        var src = clip.rows[i][j];
        if (!src) { delete doc.cells[key(at + i, j)]; continue; }
        var nc = ensureCell(at + i, j);
        nc.t = src.t; nc.s = JSON.parse(JSON.stringify(src.s));
        if (src.f) { nc.f = XL2.shiftFormula(src.f, (at + i) - (clip.r0 + i), 0); delete nc.v; }
        else { nc.v = src.v; delete nc.f; }
      }
    }
    (clip.mergesR || []).forEach(function (m) { doc.merges[(at + m.dr) + ':' + m.c] = { rs: m.rs, cs: m.cs }; });
    afterChange();
    sel.ar = at; sel.r = at + n - 1; sel.ac = 0; sel.c = doc.nCols - 1; paintSel();
    clearClip(true);   // แทรกแล้วล้างคลิปบอร์ด (เหมือน Excel)
    toast('แทรกแถวที่คัดลอก ' + n + ' แถว');
  }
  function insertCopiedCols() {
    if (view.mode !== 'admin' || !clip || !clip.fullCols) return;
    pushUndo();
    var at = range().c1, n = clip.rows[0].length;
    insertCols(at, n, true);
    for (var i = 0; i < clip.rows.length && i < doc.nRows; i++) {
      for (var j = 0; j < n; j++) {
        var src = clip.rows[i][j];
        if (!src) { delete doc.cells[key(i, at + j)]; continue; }
        var nc = ensureCell(i, at + j);
        nc.t = src.t; nc.s = JSON.parse(JSON.stringify(src.s));
        if (src.f) { nc.f = XL2.shiftFormula(src.f, 0, (at + j) - (clip.c0 + j)); delete nc.v; }
        else { nc.v = src.v; delete nc.f; }
      }
      if (clip.colWs) for (var w = 0; w < n; w++) doc.colW[at + w] = clip.colWs[w];
    }
    (clip.mergesC || []).forEach(function (m) { doc.merges[m.r + ':' + (at + m.dc)] = { rs: m.rs, cs: m.cs }; });
    afterChange();
    sel.ac = at; sel.c = at + n - 1; sel.ar = 0; sel.r = doc.nRows - 1; paintSel();
    clearClip(true);
    toast('แทรกคอลัมน์ที่คัดลอก ' + n + ' คอลัมน์');
  }

  function addRowsBottom(n) {
    if (view.mode !== 'admin') return;
    pushUndo(); doc.nRows += n; afterChange(); toast('เพิ่ม ' + n + ' แถวท้ายชีต');
  }

  // ---------- เพิ่มขนาด/เพิ่มรุ่น (เหมือน v1) ----------
  function sizeGroupOf(r) {
    var a = anchorOf(r, 0);
    var m = doc.merges[a.r + ':0'];
    if (m && m.cs !== 1) m = null;   // ผสานแนวนอน (หัวตาราง/แถบ) ไม่ใช่กลุ่มขนาด
    return { top: a.r, n: m ? m.rs : 1, hasMerge: !!m };
  }
  function copyRowPattern(srcR, dstR) {
    for (var c = 1; c < doc.nCols; c++) {
      var src = cellAt(srcR, c);
      if (!src) continue;
      var nc = ensureCell(dstR, c);
      nc.t = src.t;
      nc.s = JSON.parse(JSON.stringify(src.s || {}));
      if (src.f) { nc.f = XL2.shiftFormula(src.f, dstR - srcR, 0); delete nc.v; }
      else { nc.v = (c === 1 || c === 4 || c === 5) ? src.v : ''; delete nc.f; }  // คัดลอก ชั้น/DOT/ขอบสี ที่เหลือเว้นว่าง
    }
  }
  function addModelRow() {
    if (view.mode !== 'admin') return;
    pushUndo();
    var r = sel.r, g = sizeGroupOf(r);
    var at = r + 1;
    insertRow(at, true);
    copyRowPattern(r, at);
    // ให้แถวใหม่อยู่ในกลุ่มขนาดเดียวกัน (ขยายผสานคอลัมน์ A)
    var mk = g.top + ':0', m = g.hasMerge ? doc.merges[mk] : null;
    if (m) { if (at >= g.top + m.rs) m.rs++; }
    else { doc.merges[mk] = { rs: at - g.top + 1, cs: 1 }; }
    delete doc.cells[at + ':0'];
    afterChange();
    setActive(at, 2);
    toast('เพิ่มรุ่นใหม่ในกลุ่มขนาดเดิม — พิมพ์ยี่ห้อ/รุ่น/ราคาได้เลย');
  }
  function addSizeGroup() {
    if (view.mode !== 'admin') return;
    pushUndo();
    var g = sizeGroupOf(sel.r);
    var at = g.top + g.n;            // ต่อท้ายกลุ่มปัจจุบัน
    var tpl = at - 1;                // แถวสุดท้ายของกลุ่มเดิมเป็นต้นแบบ
    insertRow(at, true);
    copyRowPattern(tpl, at);
    doc.cells[at + ':0'] = { v: 'ขนาดใหม่', t: 'text', s: { bg: 'F2F2F2', fc: '0000FF', b: 1, al: 'center' } };
    afterChange();
    setActive(at, 0);
    toast('เพิ่มขนาดใหม่แล้ว — กด Enter พิมพ์ขนาดยาง');
  }
  function delSizeGroup() {
    if (view.mode !== 'admin') return;
    var g = sizeGroupOf(sel.r);
    var szCell = cellAt(g.top, 0);
    if (!confirm('ลบขนาด “' + (szCell ? String(szCell.v || valueOf(g.top, 0)).split('\n')[0] : '') + '” ทั้งกลุ่ม (' + g.n + ' แถว)?')) return;
    sel.ar = g.top; sel.r = g.top + g.n - 1; sel.ac = 0; sel.c = doc.nCols - 1;
    deleteRow();
  }

  // ---------- แทรกคอลัมน์คำนวณ: Margin / แปลโค้ด (อ้างอิงคอลัมน์ที่พิมพ์ระบุ) ----------
  function insertCalcCol(kind) {
    if (view.mode !== 'admin') return;
    var at = range().c2 + 1;
    var cA, cB, refIdx, fnName;
    if (kind === 'margin') {
      var p = prompt('เพิ่มคอลัมน์ Margin = ราคา − ทุน\nพิมพ์อ้างอิงจากตาราง เช่น H-G (ราคาตั้ง−ทุน) หรือ N-G (SUB-B−ทุน)', 'H-G');
      if (p === null) return;
      var m = /^\s*([A-Za-z]{1,2})\s*-\s*([A-Za-z]{1,2})\s*$/.exec(p);
      if (!m) { toast('รูปแบบไม่ถูก — พิมพ์เช่น H-G'); return; }
      cA = XL2.colIndex(m[1].toUpperCase()); cB = XL2.colIndex(m[2].toUpperCase());
    } else {
      var refL = prompt('แปลโค้ดจากคอลัมน์ไหน? พิมพ์ชื่อคอลัมน์ เช่น G (ทุน) หรือ N (ราคาส่ง)', 'G');
      if (refL === null) return;
      if (!/^[A-Za-z]{1,2}$/.test(refL.trim())) { toast('พิมพ์ชื่อคอลัมน์ เช่น G'); return; }
      refIdx = XL2.colIndex(refL.trim().toUpperCase());
      var setSel = prompt('ใช้ชุดรหัสไหน?\n1 = ชุดทุน (COGS: X T N S F V L C B K)\n2 = ชุดขายส่ง (DEALER: O I Z M D E H Y P R)', '1');
      if (setSel === null) return;
      fnName = (setSel.trim() === '2') ? 'DEALER' : 'COGS';
    }
    pushUndo();
    insertCols(at, 1, true);
    invalidate();
    // ปรับอ้างอิงถ้าคอลัมน์ที่อ้างอยู่หลังจุดแทรก (ตัวอักษรเลื่อน)
    if (cA != null && cA >= at) cA++;
    if (cB != null && cB >= at) cB++;
    if (refIdx != null && refIdx >= at) refIdx++;
    for (var r = 0; r < doc.nRows; r++) {
      var rk = rowKind(r);
      if (rk === 'head') {
        doc.cells[r + ':' + at] = { v: (kind === 'margin' ? 'Margin' : 'รหัส\nแปลโค้ด'), t: 'text', s: { bg: kind === 'margin' ? 'FFF2CC' : 'FCE4D6', b: 1, al: 'center', fs: 9 } };
      } else if (rk === 'data') {
        var n = r + 1;
        if (kind === 'margin') doc.cells[r + ':' + at] = { f: '=' + XL2.colName(cA) + n + '-' + XL2.colName(cB) + n, t: 'num', s: { pm: 1, cond: 'pn', fs: 9, al: 'center' } };
        else doc.cells[r + ':' + at] = { f: '=' + fnName + '(' + XL2.colName(refIdx) + n + ')', t: 'text', s: { bg: 'FFF7EF', fc: 'B15C00', b: 1, mn: 1, al: 'center' } };
      }
    }
    doc.colW[at] = 66;
    afterChange();
    setActive(sel.r, at);
    toast(kind === 'margin' ? '➕ เพิ่มคอลัมน์ Margin (' + XL2.colName(cA) + '−' + XL2.colName(cB) + ') ที่ ' + XL2.colName(at) : '➕ เพิ่มคอลัมน์แปลโค้ด ' + fnName + '(' + XL2.colName(refIdx) + ') ที่ ' + XL2.colName(at));
  }

  // ---------- merge ----------
  function toggleMerge() {
    if (view.mode !== 'admin') return;
    var R = range();
    var k = key(R.r1, R.c1);
    pushUndo();
    if (doc.merges[k] && R.r1 === R.r2 && R.c1 === R.c2) { delete doc.merges[k]; afterChange(); toast('ยกเลิกผสานเซลล์'); return; }
    // ถ้ามี merge ใดๆ ในช่วง → ยกเลิกทั้งหมด
    var had = false;
    Object.keys(doc.merges).forEach(function (mk) {
      var p = mk.split(':'), r = +p[0], c = +p[1];
      if (r >= R.r1 && r <= R.r2 && c >= R.c1 && c <= R.c2) { delete doc.merges[mk]; had = true; }
    });
    if (!had && (R.r1 !== R.r2 || R.c1 !== R.c2)) {
      doc.merges[k] = { rs: R.r2 - R.r1 + 1, cs: R.c2 - R.c1 + 1 };
      toast('ผสานเซลล์ ' + XL2.refStr(R.r1, R.c1) + ':' + XL2.refStr(R.r2, R.c2));
    } else toast('ยกเลิกผสานเซลล์');
    afterChange();
  }

  // ---------- borders (ตีเส้นแบบ Excel · เลือกสี/ลายเส้นได้) ----------
  var bdOpts = { style: 'solid', color: '000000' };
  function setBorderOpts(o) { if (o.style) bdOpts.style = o.style; if (o.color) bdOpts.color = o.color; }
  function bdCss(v) {
    if (v == null) return null;
    if (typeof v === 'number' || /^\d+$/.test(String(v))) return (String(v) === '2' ? '2px' : '1px') + ' solid #000';
    var p = String(v).split('|');
    return (p[0] === '2' ? '2px' : '1px') + ' ' + (p[1] || 'solid') + ' #' + (p[2] || '000000');
  }
  // ค่าเส้น: 1=บาง, 2=หนา · เก็บใน cell.s.bd = {t,r,b,l}
  function applyBorders(mode) {
    if (view.mode !== 'admin') return;
    pushUndo();
    var R = range();
    function setB(r, c, side, val) {
      var cell = ensureCell(r, c); cell.s = cell.s || {};
      var bd = cell.s.bd = cell.s.bd || {};
      if (val) bd[side] = val; else delete bd[side];
      if (!Object.keys(bd).length) delete cell.s.bd;
    }
    var thick = /thick/.test(mode) ? 2 : 1;
    var val1 = '1|' + bdOpts.style + '|' + bdOpts.color;
    var valT = thick + '|' + bdOpts.style + '|' + bdOpts.color;
    for (var r = R.r1; r <= R.r2; r++) for (var c = R.c1; c <= R.c2; c++) {
      if (mode === 'none') { var cell = cellAt(r, c); if (cell && cell.s) delete cell.s.bd; continue; }
      if (mode.indexOf('erase') === 0) {
        var ce = cellAt(r, c); if (ce && ce.s && ce.s.bd) {
          if (mode === 'erase-all') { delete ce.s.bd; }
          else {
            if (/bottom/.test(mode) && r === R.r2) delete ce.s.bd.b;
            if (/top/.test(mode) && r === R.r1) delete ce.s.bd.t;
            if (/left/.test(mode) && c === R.c1) delete ce.s.bd.l;
            if (/right/.test(mode) && c === R.c2) delete ce.s.bd.r;
          }
        }
        continue;
      }
      if (mode === 'all') { setB(r, c, 't', val1); setB(r, c, 'b', val1); setB(r, c, 'l', val1); setB(r, c, 'r', val1); continue; }
      if (mode === 'topbottom') { if (r === R.r1) setB(r, c, 't', valT); if (r === R.r2) setB(r, c, 'b', valT); continue; }
      if (/^outer/.test(mode)) {
        if (r === R.r1) setB(r, c, 't', valT);
        if (r === R.r2) setB(r, c, 'b', valT);
        if (c === R.c1) setB(r, c, 'l', valT);
        if (c === R.c2) setB(r, c, 'r', valT);
        continue;
      }
      if (/^bottom/.test(mode) && r === R.r2) setB(r, c, 'b', valT);
      if (/^top/.test(mode) && r === R.r1) setB(r, c, 't', valT);
      if (/^left/.test(mode) && c === R.c1) setB(r, c, 'l', valT);
      if (/^right/.test(mode) && c === R.c2) setB(r, c, 'r', valT);
    }
    afterChange();
    var names = { none: 'ลบเส้นออก', all: 'เส้นขอบทั้งหมด', outer: 'เส้นขอบนอก', 'outer-thick': 'เส้นขอบนอกหนา', bottom: 'เส้นล่าง', 'bottom-thick': 'เส้นล่างหนา', top: 'เส้นบน', left: 'เส้นซ้าย', right: 'เส้นขวา' };
    toast('ตีเส้น: ' + (names[mode] || mode));
  }

  // ---------- styles & types ----------
  function applyStyle(prop, val) {
    if (view.mode !== 'admin') return;
    pushUndo();
    var R = range();
    var target = val;
    if (val === 'toggle' && (prop === 'b' || prop === 'i' || prop === 'u')) {
      // แบบ Excel: ถ้ายังไม่หนาทั้งหมด → ทำให้หนาทุกตัว · ถ้าหนาหมดแล้ว → ค่อยเปลี่ยนเป็นบาง
      var allOn = true;
      for (var rr = R.r1; rr <= R.r2 && allOn; rr++) for (var cc = R.c1; cc <= R.c2; cc++) {
        var cz = cellAt(rr, cc); if (!(cz && cz.s && cz.s[prop])) { allOn = false; break; }
      }
      target = allOn ? null : 1;
    }
    for (var r = R.r1; r <= R.r2; r++) for (var c = R.c1; c <= R.c2; c++) {
      var cell = ensureCell(r, c); cell.s = cell.s || {};
      if (target === null) delete cell.s[prop];
      else cell.s[prop] = target;
    }
    afterChange();
  }
  function setType(t) {
    if (view.mode !== 'admin') return;
    pushUndo();
    var R = range();
    for (var r = R.r1; r <= R.r2; r++) for (var c = R.c1; c <= R.c2; c++) ensureCell(r, c).t = t;
    afterChange();
    toast('กำหนดรูปแบบ: ' + (t === 'num' ? 'ตัวเลข' : t === 'text' ? 'ข้อความ' : 'อัตโนมัติ'));
  }
  function linkDB() {
    if (view.mode !== 'admin') return;
    var codes = XL2.dbKeys();
    var code = prompt('รหัสสินค้า (ขนาด|ยี่ห้อ|รุ่น) เช่น:\n' + codes.slice(0, 4).join('\n'), codes[0] || '');
    if (!code) return;
    var field = prompt('ฟิลด์ที่ต้องการ: ทุน / ราคา / B / A / S / DOT', 'ราคา');
    if (!field) return;
    pushUndo();
    var a = anchorOf(sel.r, sel.c);
    var nc = ensureCell(a.r, a.c);
    nc.f = '=DB("' + code + '","' + field + '")'; delete nc.v;
    afterChange();
    toast('ลิงก์ฐานข้อมูล: ' + code + ' → ' + field);
  }

  // ---------- row ↔ product link (ทั้งแถว = สินค้ารหัสเดียว) ----------
  var pickEl = null;
  function openPicker(onPick) {
    if (!pickEl) {
      pickEl = document.createElement('div');
      pickEl.className = 'sg-pick';
      document.body.appendChild(pickEl);
    }
    var items = XL2.dbList();
    pickEl.innerHTML = '<div class="pk-head">🔗 เลือกสินค้าจาก DATABASE<span class="pk-x">✕</span></div>' +
      '<input class="pk-q" placeholder="ค้นหารหัสสินค้า / ขนาด / ยี่ห้อ / รุ่น…" />' +
      '<div class="pk-list"></div>' +
      '<div class="pk-note">แถวที่ลิงก์แล้ว: DOT จะเช็คจากฐานข้อมูล · ราคาตั้ง/B/A/S ที่ตั้งจะถูกส่งกลับไปเป็นราคาขายช่อง 1/2/3/4</div>';
    var q = pickEl.querySelector('.pk-q'), list = pickEl.querySelector('.pk-list');
    function renderList(filter) {
      var f = (filter || '').toLowerCase();
      list.innerHTML = items.filter(function (x) { return (x.code + ' ' + x.name + ' ' + x.key).toLowerCase().indexOf(f) >= 0; }).slice(0, 60)
        .map(function (x) { return '<div class="pk-it" data-code="' + esc(x.key) + '"><span class="pk-code">' + esc(x.code) + '</span><span class="pk-name">' + esc(x.name) + '</span></div>'; }).join('') || '<div class="pk-empty">ไม่พบ</div>';
    }
    renderList('');
    q.oninput = function () { renderList(q.value); };
    list.onclick = function (e) { var it = e.target.closest('.pk-it'); if (!it) return; closePicker(); onPick(it.dataset.code); };
    pickEl.querySelector('.pk-x').onclick = closePicker;
    pickEl.style.display = 'block';
    setTimeout(function () { q.focus(); }, 30);
  }
  function closePicker() { if (pickEl) pickEl.style.display = 'none'; }

  function linkRowDB() {
    if (view.mode !== 'admin') return;
    var r = sel.r;
    openPicker(function (code) {
      pushUndo();
      doc.rowLinks = doc.rowLinks || {};
      doc.rowLinks[r] = code;
      // DOT (E) เช็คจาก DB อัตโนมัติ
      var dot = ensureCell(r, 4);
      dot.f = '=DB("' + code + '","DOT")'; delete dot.v;
      // ยี่ห้อ (C) อ้างอิง DB เป็นอักษรย่อ (OTANI → OT) · สี/พื้นหลังของช่องยังตกแต่งเองได้
      var br = ensureCell(r, 2);
      br.f = '=DB("' + code + '","ยี่ห้อ")'; delete br.v;
      afterChange();
      var inf = XL2.dbInfo(code);
      toast('🔗 ลิงก์แถว ' + (r + 1) + ' กับ ' + inf.code + ' · ' + inf.name);
    });
  }
  function unlinkRow() {
    if (view.mode !== 'admin') return;
    if (!doc.rowLinks || !doc.rowLinks[sel.r]) { toast('แถวนี้ยังไม่ได้ลิงก์'); return; }
    pushUndo();
    delete doc.rowLinks[sel.r];
    afterChange(); toast('ยกเลิกลิงก์แถวแล้ว');
  }

  // ---------- ส่งราคาเข้า DB (ราคาตั้ง/B/A/S → ช่อง 1/2/3/4 · ใช้เวลาจากตารางเวลา) ----------
  var PRICE_COLS = [{ c: 7, slot: 1, n: 'ราคาตั้ง' }, { c: 13, slot: 2, n: 'B' }, { c: 16, slot: 3, n: 'A' }, { c: 19, slot: 4, n: 'S' }];
  function effectiveOf(r) { return (doc.rowSchedules && doc.rowSchedules[r]) || doc.schedule || 'ทันที'; }
  function setSchedule(at) { pushUndo(); doc.schedule = at || ''; persist(); toast(at ? '⏱ ราคาชุดนี้จะมีผล: ' + at : '⏱ ราคามีผลทันทีเมื่อส่ง'); }
  function setRowSchedule(at) {
    if (view.mode !== 'admin') return;
    pushUndo();
    doc.rowSchedules = doc.rowSchedules || {};
    if (at) doc.rowSchedules[sel.r] = at; else delete doc.rowSchedules[sel.r];
    persist(); render();
    toast(at ? '⏱ แถว ' + (sel.r + 1) + ' ใช้เวลาเฉพาะ: ' + at : 'แถว ' + (sel.r + 1) + ' กลับไปใช้เวลาของชีต');
  }
  function syncToDB() {
    if (view.mode !== 'admin') return;
    var links = doc.rowLinks || {}, rows = Object.keys(links);
    var hasChanges = Object.keys(doc.changes || {}).length > 0;
    if (!rows.length && !hasChanges) { toast('ยังไม่มีแถวที่ลิงก์ DB หรือการปรับราคา — คลิกขวาที่ช่องรุ่น → ลิงก์แถวกับสินค้า'); return; }
    var out = [];
    rows.forEach(function (r) {
      r = +r;
      var prices = {};
      PRICE_COLS.forEach(function (pc) { var v = valueOf(r, pc.c); if (XL2.isNumeric(v)) prices[pc.slot] = XL2.toN(v); });
      out.push({ code: links[r], row: r + 1, prices: prices, effectiveAt: effectiveOf(r), queuedAt: new Date().toISOString() });
    });
    try {
      var box = JSON.parse(localStorage.getItem('xls2_db_outbox') || '[]');
      box = box.concat(out);
      localStorage.setItem('xls2_db_outbox', JSON.stringify(box));
    } catch (e) {}
    // ประทับสถานะ “ส่งแล้ว” ให้ทุกรายการที่ปรับ — ผู้ใช้จะเห็น ⏳ (รอมีผล) หรือ ▲▼ (มีผลแล้ว)
    Object.keys(doc.changes || {}).forEach(function (r) {
      var rc = doc.changes[r];
      Object.keys(rc).forEach(function (c) { rc[c].sent = 1; if (!rc[c].effectiveAt) rc[c].effectiveAt = effectiveOf(+r); });
    });
    persist(); render();
    var perRow = Object.keys(doc.rowSchedules || {}).length;
    toast('📤 เผยแพร่การปรับราคา: ' + out.length + ' สินค้าลิงก์ DB · มีผล: ' + (doc.schedule || 'ทันที') + (perRow ? ' (+' + perRow + ' แถวตั้งเวลาเฉพาะ)' : ''));
  }

  // ---------- ซ่อน/เลิกซ่อนแถว-คอลัมน์ (แบบ Excel) ----------
  function hideRows() {
    if (view.mode !== 'admin') return;
    pushUndo(); var R = range();
    for (var r = R.r1; r <= R.r2; r++) doc.hideRows[r] = 1;
    afterChange(); toast('ซ่อนแถวแล้ว (คลิกขวา → เลิกซ่อน เพื่อแสดงอีก)');
  }
  function unhideRows() {
    if (view.mode !== 'admin') return;
    pushUndo(); var R = range();
    // เลิกซ่อนแถวที่อยู่ระหว่าง/ในช่วงที่เลือก
    for (var r = Math.max(0, R.r1 - 1); r <= R.r2 + 1 && r < doc.nRows; r++) delete doc.hideRows[r];
    afterChange(); toast('เลิกซ่อนแถวแล้ว');
  }
  function hideCols() {
    if (view.mode !== 'admin') return;
    pushUndo(); var R = range();
    for (var c = R.c1; c <= R.c2; c++) doc.hideCols[c] = 1;
    afterChange(); toast('ซ่อนคอลัมน์แล้ว');
  }
  function unhideCols() {
    if (view.mode !== 'admin') return;
    pushUndo(); var R = range();
    for (var c = Math.max(0, R.c1 - 1); c <= R.c2 + 1 && c < doc.nCols; c++) delete doc.hideCols[c];
    afterChange(); toast('เลิกซ่อนคอลัมน์แล้ว');
  }
  function showAllHidden() {
    if (view.mode !== 'admin') return;
    pushUndo(); doc.hideRows = {}; doc.hideCols = {};
    afterChange(); toast('แสดงแถว/คอลัมน์ที่ซ่อนไว้ทั้งหมด');
  }
  // ซ่อนเฉพาะโหมดผู้ใช้ (ไม่เกี่ยวกับ admin)
  function toggleUserHideRows() {
    if (view.mode !== 'admin') return;
    pushUndo(); var R = range(), all = true;
    for (var r = R.r1; r <= R.r2; r++) if (!doc.uHideRows[r]) { all = false; break; }
    for (var r2 = R.r1; r2 <= R.r2; r2++) { if (all) delete doc.uHideRows[r2]; else doc.uHideRows[r2] = 1; }
    afterChange(); toast(all ? 'เลิกซ่อนเฉพาะโหมดผู้ใช้' : '👁️ ซ่อนแถวนี้เฉพาะในโหมดผู้ใช้');
  }
  function toggleUserHideCols() {
    if (view.mode !== 'admin') return;
    pushUndo(); var R = range(), all = true;
    for (var c = R.c1; c <= R.c2; c++) if (!doc.uHideCols[c]) { all = false; break; }
    for (var c2 = R.c1; c2 <= R.c2; c2++) { if (all) delete doc.uHideCols[c2]; else doc.uHideCols[c2] = 1; }
    afterChange(); toast(all ? 'เลิกซ่อนคอลัมน์เฉพาะโหมดผู้ใช้' : '👁️ ซ่อนคอลัมน์นี้เฉพาะในโหมดผู้ใช้');
  }

  // ---------- lock (admin-only rows/cols) ----------
  function toggleLockRows() {
    if (view.mode !== 'admin') return;
    pushUndo();
    var R = range(), all = true;
    for (var r = R.r1; r <= R.r2; r++) if (!doc.adminRows[r]) { all = false; break; }
    for (var r2 = R.r1; r2 <= R.r2; r2++) { if (all) delete doc.adminRows[r2]; else doc.adminRows[r2] = 1; }
    afterChange(); toast(all ? 'ยกเลิกซ่อนแถวจากผู้ใช้' : '🔒 ซ่อนแถวจากผู้ใช้แล้ว');
  }
  function toggleLockCols() {
    if (view.mode !== 'admin') return;
    pushUndo();
    var R = range(), all = true;
    for (var c = R.c1; c <= R.c2; c++) if (!doc.adminCols[c]) { all = false; break; }
    for (var c2 = R.c1; c2 <= R.c2; c2++) { if (all) delete doc.adminCols[c2]; else doc.adminCols[c2] = 1; }
    afterChange(); toast(all ? 'ยกเลิกซ่อนคอลัมน์จากผู้ใช้' : '🔒 ซ่อนคอลัมน์จากผู้ใช้แล้ว');
  }

  // ---------- resize with tooltip + multi ----------
  var rz = null;
  function startRzCol(ci, x) {
    var R = range();
    var cols = (ci >= R.c1 && ci <= R.c2 && R.c1 !== R.c2) ? rangeArr(R.c1, R.c2) : [ci];
    rz = { kind: 'col', idx: ci, cols: cols, startX: x, w0: doc.colW[ci] || 64 };
    pushUndo();
  }
  function startRzRow(ri, y) {
    var R = range();
    var rows = (ri >= R.r1 && ri <= R.r2 && R.r1 !== R.r2) ? rangeArr(R.r1, R.r2) : [ri];
    rz = { kind: 'row', idx: ri, rows: rows, startY: y, h0: doc.rowH[ri] || 19 };
    pushUndo();
  }
  function rangeArr(a, b) { var o = []; for (var i = a; i <= b; i++) o.push(i); return o; }
  function moveRz(x, y) {
    if (!rz) return;
    if (rz.kind === 'col') {
      var w = Math.max(18, Math.round(rz.w0 + (x - rz.startX) / view.zoom));
      rz.cols.forEach(function (c) { doc.colW[c] = w; });
      showTip(x, y, 'กว้าง: ' + w + ' px' + (rz.cols.length > 1 ? ' × ' + rz.cols.length + ' คอลัมน์' : ''));
    } else {
      var h = Math.max(12, Math.round(rz.h0 + (y - rz.startY) / view.zoom));
      rz.rows.forEach(function (r) { doc.rowH[r] = h; });
      showTip(x, y, 'สูง: ' + h + ' px' + (rz.rows.length > 1 ? ' × ' + rz.rows.length + ' แถว' : ''));
    }
    invalidate(); buildCover(); render();
  }
  function endRz() { if (rz) { hideTip(); persist(); rz = null; } }
  function autofitCol(ci) {
    var ctx = document.createElement('canvas').getContext('2d');
    var max = 24;
    for (var r = 0; r < doc.nRows; r++) {
      var cell = cellAt(r, ci); if (!cell) continue;
      var s = cell.s || {};
      ctx.font = (s.b ? '700 ' : '') + (s.fs || 10) + 'px Arial';
      String(displayOf(r, ci)).split('\n').forEach(function (ln) {
        var w = ctx.measureText(ln).width + 10;
        if (w > max) max = w;
      });
    }
    pushUndo();
    doc.colW[ci] = Math.min(400, Math.ceil(max));
    afterChange(); toast('พอดีข้อความ: ' + XL2.colName(ci) + ' = ' + doc.colW[ci] + ' px');
  }
  function showTip(x, y, text) {
    tipEl.style.display = 'block';
    tipEl.style.left = (x - rootEl.getBoundingClientRect().left + rootEl.scrollLeft + 14) + 'px';
    tipEl.style.top = (y - rootEl.getBoundingClientRect().top + rootEl.scrollTop - 8) + 'px';
    tipEl.textContent = text;
  }
  function hideTip() { tipEl.style.display = 'none'; }

  // ---------- context menu (จัดหมวด + ซับเมนูย่อย) ----------
  function openCtx(x, y) {
    if (view.mode !== 'admin') return;
    var cell = cellAt(anchorOf(sel.r, sel.c).r, anchorOf(sel.r, sel.c).c);
    var t = cell ? cell.t : 'auto';
    var R = range(), nR = R.r2 - R.r1 + 1, nC = R.c2 - R.c1 + 1;
    var reg = [];
    function it(ic, tx, fn, hint) {
      reg.push(fn);
      return '<div class="ctx-it" data-i="' + (reg.length - 1) + '"><span class="ctx-ic">' + ic + '</span><span class="ctx-tx">' + esc(tx) + '</span>' + (hint ? '<span class="ctx-k">' + esc(hint) + '</span>' : '') + '</div>';
    }
    function sub(ic, tx, inner) {
      return '<div class="ctx-it has-sub"><span class="ctx-ic">' + ic + '</span><span class="ctx-tx">' + esc(tx) + '</span><span class="ctx-arr">▸</span><div class="ctx-flyout">' + inner + '</div></div>';
    }
    function sep() { return '<div class="ctx-sep"></div>'; }

    var html = '';
    // ใช้บ่อยสุด — อยู่ชั้นบนสุด
    html += it('✂️', 'ตัด', function () { doCopy(true); }, 'Ctrl+X');
    html += it('📋', 'คัดลอก', function () { doCopy(false); }, 'Ctrl+C');
    html += it('📌', 'วาง', doPaste, 'Ctrl+V');
    if (clip && clip.fullRows) html += it('➕', 'แทรกแถวที่คัดลอก (' + clip.rows.length + ' แถว)', insertCopiedRows);
    if (clip && clip.fullCols) html += it('➕', 'แทรกคอลัมน์ที่คัดลอก (' + clip.rows[0].length + ')', insertCopiedCols);
    if (clip) html += it('❌', 'ยกเลิกการคัดลอก', clearClip, 'Esc');
    html += sep();
    // หมวดย่อย (ชี้แล้วกางออกข้าง)
    html += sub('➕', 'แทรก',
      it('⬆️', 'แถวด้านบน (' + nR + ' แถว)', function () { insertRows(R.r1, nR); }) +
      it('⬇️', 'แถวด้านล่าง (' + nR + ' แถว)', function () { insertRows(R.r2 + 1, nR); }) +
      sep() +
      it('⬅️', 'คอลัมน์ซ้าย (' + nC + ')', function () { insertCols(R.c1, nC); }) +
      it('➡️', 'คอลัมน์ขวา (' + nC + ')', function () { insertCols(R.c2 + 1, nC); }) +
      sep() +
      it('🖼️', 'แทรกรูปภาพ…', function () { if (window.ImgLayer) ImgLayer.pickFile(); }) +
      it('🔎', 'ค้นหารูปใน Google…', function () { if (window.ImgLayer) ImgLayer.googleSearch(); }) +
      sep() +
      it('±', 'คอลัมน์ Margin (อ้างอิงราคา−ทุน)…', function () { insertCalcCol('margin'); }) +
      it('🔐', 'คอลัมน์แปลโค้ดเป็นอักษร (ระบุคอลัมน์อ้างอิง)…', function () { insertCalcCol('cipher'); }));
    html += sub('🗑️', 'ลบ / ล้าง',
      it('🗑️', 'ลบแถวที่เลือก (' + nR + ')', deleteRow) +
      it('🗑️', 'ลบคอลัมน์ที่เลือก (' + nC + ')', deleteCol) +
      sep() +
      it('🧹', 'ล้างค่าในช่อง', delRange, 'Del'));
    html += sub('🔣', 'รูปแบบเซลล์',
      it('🔢', 'ตัวเลข' + (t === 'num' ? '  ✓' : ''), function () { setType('num'); }) +
      it('🔤', 'ข้อความ' + (t === 'text' ? '  ✓' : ''), function () { setType('text'); }) +
      it('✨', 'อัตโนมัติ' + (t === 'auto' || !t ? '  ✓' : ''), function () { setType('auto'); }) +
      sep() +
      it('ƒ', 'ใส่สูตร…', function () { startEdit('='); }));
    // จัดตัวอักษร: จัดตำแหน่ง · สี · ขนาด · ฟอนต์
    function chip(htmlIn, fn, title) { reg.push(fn); return '<span class="ctx-chip" data-i="' + (reg.length - 1) + '" title="' + esc(title || '') + '">' + htmlIn + '</span>'; }
    function chipRow(label, chips) { return '<div class="ctx-row"><span class="ctx-rowlab">' + esc(label) + '</span><span class="ctx-chips">' + chips + '</span></div>'; }
    var FCs = [['000000', 'ดำ'], ['FF0000', 'แดง'], ['0000FF', 'น้ำเงิน'], ['008000', 'เขียว'], ['FF6600', 'ส้ม'], ['7030A0', 'ม่วง']];
    var BGs = [[null, 'ไม่มีสี'], ['FFFF00', 'เหลือง'], ['CCFFCC', 'เขียวอ่อน'], ['CCFFFF', 'ฟ้า'], ['FFCCFF', 'ชมพู'], ['FDE9D9', 'ส้มอ่อน']];
    html += sub('🅰️', 'จัดตัวอักษร',
      it('◧', 'ชิดซ้าย', function () { applyStyle('al', 'left'); }) +
      it('▤', 'กึ่งกลาง', function () { applyStyle('al', 'center'); }) +
      it('◨', 'ชิดขวา', function () { applyStyle('al', 'right'); }) +
      sep() +
      it('⤒', 'ชิดบน', function () { applyStyle('va', 'top'); }) +
      it('↔', 'กึ่งกลางแนวตั้ง', function () { applyStyle('va', 'middle'); }) +
      it('⤓', 'ชิดล่าง', function () { applyStyle('va', 'bottom'); }) +
      sep() +
      it('𝐁', 'ตัวหนา', function () { applyStyle('b', 'toggle'); }, 'Ctrl+B') +
      it('𝐼', 'ตัวเอียง', function () { applyStyle('i', 'toggle'); }, 'Ctrl+I') +
      it('U̲', 'ขีดเส้นใต้', function () { applyStyle('u', 'toggle'); }, 'Ctrl+U') +
      sep() +
      chipRow('ขนาด',
        chip('9', function () { applyStyle('fs', 9); }) + chip('10', function () { applyStyle('fs', null); }, 'ปกติ') +
        chip('12', function () { applyStyle('fs', 12); }) + chip('14', function () { applyStyle('fs', 14); }) +
        chip('18', function () { applyStyle('fs', 18); }) + chip('24', function () { applyStyle('fs', 24); })) +
      chipRow('สีอักษร',
        FCs.map(function (cdef) { return chip('<span class="ctx-dot" style="background:#' + cdef[0] + '"></span>', function () { applyStyle('fc', cdef[0]); }, cdef[1]); }).join('') +
        chip('✕', function () { applyStyle('fc', null); }, 'ค่าเดิม')) +
      chipRow('สีพื้น',
        BGs.map(function (bdef) { return bdef[0] ? chip('<span class="ctx-dot" style="background:#' + bdef[0] + ';border-color:#bbb;"></span>', function () { applyStyle('bg', bdef[0]); }, bdef[1]) : chip('✕', function () { applyStyle('bg', null); }, 'ไม่มีสี'); }).join('')) +
      sep() +
      chipRow('ฟอนต์',
        [['', 'ปกติ'], ['Arial Black', 'Black'], ['Tahoma', 'Tahoma'], ['Sarabun', 'สารบรรณ'], ['Prompt', 'พรอมพต์'], ['Kanit', 'คนิต']].map(function (fdef) {
          return chip('<span style="font-family:\'' + fdef[0] + '\'">' + esc(fdef[1]) + '</span>', function () { applyStyle('ff', fdef[0] || null); }, fdef[0] || 'ค่าเริ่มต้น');
        }).join('')));
    html += sub('🗄️', 'ฐานข้อมูล / ราคา',
      it('🔗', (doc.rowLinks && doc.rowLinks[sel.r]) ? ('ลิงก์: ' + XL2.dbInfo(doc.rowLinks[sel.r]).code + ' · ' + XL2.dbInfo(doc.rowLinks[sel.r]).name + ' (เปลี่ยน)…') : 'ลิงก์แถวกับสินค้า DB…', linkRowDB) +
      it('🗄️', 'ลิงก์เฉพาะช่องนี้…', linkDB) +
      it('⛓️', 'ยกเลิกลิงก์แถว', unlinkRow) +
      sep() +
      it('📤', 'อัพเดทราคาเข้า DB…', function () { var b = document.getElementById('btnSync'); if (b) b.click(); else syncToDB(); }) +
      it('⏱️', (doc.rowSchedules && doc.rowSchedules[sel.r]) ? ('เวลาเฉพาะแถว: ' + doc.rowSchedules[sel.r] + '…') : 'ตั้งเวลาใช้ราคาเฉพาะแถวนี้…', function () {
        var cur = (doc.rowSchedules && doc.rowSchedules[sel.r]) || '';
        var w = prompt('เวลาเริ่มใช้ราคาของแถวนี้ (เช่น 2026-06-15 08:00)\nเว้นว่าง = ใช้เวลาของชีต', cur);
        if (w === null) return;
        setRowSchedule(w.trim());
      }) +
      it('🧽', 'ล้างเครื่องหมายปรับราคา (เริ่มรอบใหม่)', clearChanges));
    html += sub('🙈', 'ซ่อน / ล็อก แถว-คอลัมน์',
      it('🙈', 'ซ่อนแถว (แบบ Excel)', hideRows) +
      it('👁️', 'เลิกซ่อนแถว', unhideRows) +
      it('🙈', 'ซ่อนคอลัมน์ (แบบ Excel)', hideCols) +
      it('👁️', 'เลิกซ่อนคอลัมน์', unhideCols) +
      it('🔄', 'แสดงที่ซ่อนทั้งหมด', showAllHidden) +
      sep() +
      it('🔒', 'ล็อกแถว (เฉพาะแอดมิน เห็น)', toggleLockRows) +
      it('🔒', 'ล็อกคอลัมน์ (เฉพาะแอดมิน)', toggleLockCols) +
      sep() +
      it('👁️', 'ซ่อนแถวนี้เฉพาะโหมดผู้ใช้', toggleUserHideRows) +
      it('👁️', 'ซ่อนคอลัมน์นี้เฉพาะผู้ใช้', toggleUserHideCols));
    html += sep();
    html += it('⊞', 'ผสาน/ยกเลิกผสานเซลล์', toggleMerge);

    ctxEl.innerHTML = html;
    ctxEl.style.display = 'block';
    var vw = window.innerWidth, vh = window.innerHeight;
    var lx = Math.min(x, vw - ctxEl.offsetWidth - 8);
    ctxEl.style.left = lx + 'px';
    // วิเคราะห์ตำแหน่งจอ: คลิกครึ่งล่าง → เมนูกางขึ้นข้างบนสุด · คลิกครึ่งบน → กางลงข้างล่าง
    var mh = ctxEl.offsetHeight;
    var topPos = (y > vh / 2) ? (y - mh - 6) : (y + 6);
    ctxEl.style.top = Math.max(8, Math.min(topPos, vh - mh - 8)) + 'px';
    // ซับเมนูย่อย: ขยับขึ้นให้พอดีจอ — ข้อมูลเยอะก็ขยับสูงขึ้นอีก
    ctxEl.querySelectorAll('.ctx-it.has-sub').forEach(function (itEl) {
      itEl.addEventListener('mouseenter', function () {
        var fly = itEl.querySelector('.ctx-flyout');
        if (!fly) return;
        fly.style.display = 'block';                 // โชว์ชั่วคราวเพื่อวัดความสูงจริง
        var ir = itEl.getBoundingClientRect();
        var fh = fly.offsetHeight;
        var desired = Math.max(8, Math.min(ir.top - 5, window.innerHeight - fh - 8));
        fly.style.top = (desired - ir.top) + 'px';
        fly.style.display = '';                      // คืนให้ CSS hover คุม
      });
    });
    // ถ้าชิดขอบขวา ให้ซับเมนูกางออกทางซ้ายแทน
    ctxEl.classList.toggle('flip', lx + ctxEl.offsetWidth + 200 > vw);
    ctxEl.onclick = function (e) {
      var el = e.target.closest('[data-i]');
      if (!el) return;
      closeCtx();
      reg[+el.dataset.i]();
    };
  }
  function closeCtx() { ctxEl.style.display = 'none'; }

  // ---------- price-change detail popover (คลิกดูรายละเอียด ขึ้น/ลงเท่าไหร่) ----------
  var popEl2 = null;
  function showPricePop(r, c, td) {
    var chg = doc.changes && doc.changes[r] && doc.changes[r][c];
    if (!chg) return;
    if (!popEl2) { popEl2 = document.createElement('div'); popEl2.className = 'sg-pricepop'; document.body.appendChild(popEl2); }
    var curV = valueOf(r, c);
    var oldN = nOr(chg.old, 0), curN = nOr(curV, oldN);
    var d = curN - oldN;
    var pct = oldN ? Math.round(Math.abs(d) / oldN * 1000) / 10 : 0;
    var eff = parseEff(chg.effectiveAt);
    var pending = eff.getTime() > Date.now();
    var name = PRICE_NAME[c] || 'ราคา';
    popEl2.innerHTML =
      '<div class="pp-head">' + (pending ? '⏳ กำลังจะปรับปรุงราคา' : (d > 0 ? '▲ ปรับขึ้นแล้ว' : d < 0 ? '▼ ปรับลงแล้ว' : 'ปรับปรุงแล้ว')) + '</div>' +
      '<div class="pp-row"><span>' + esc(name) + ' เดิม</span><b>' + XL2.fmtNum(oldN) + '</b></div>' +
      '<div class="pp-row"><span>' + (pending ? 'ราคาใหม่' : 'ปัจจุบัน') + '</span><b>' + XL2.fmtNum(curN) + '</b></div>' +
      (d !== 0 ? '<div class="pp-row pp-d ' + (d > 0 ? 'up' : 'dn') + '"><span>ส่วนต่าง</span><b>' + (d > 0 ? '+' : '−') + XL2.fmtNum(Math.abs(d)) + ' (' + pct + '%)</b></div>' : '') +
      (chg.effectiveAt && chg.effectiveAt !== 'ทันที' ? '<div class="pp-eff">มีผล: ' + esc(chg.effectiveAt) + '</div>' : '');
    var rect = td.getBoundingClientRect();
    popEl2.style.display = 'block';
    popEl2.style.left = Math.min(rect.left, window.innerWidth - 200) + 'px';
    popEl2.style.top = (rect.bottom + 4) + 'px';
  }
  function hidePricePop() { if (popEl2) popEl2.style.display = 'none'; }

  // ---------- fill down / right (Ctrl+D / Ctrl+R แบบ Excel) ----------
  function fillDown() {
    if (view.mode !== 'admin') return;
    var R = range();
    pushUndo();
    if (R.r1 === R.r2) { if (R.r1 > 0) for (var c = R.c1; c <= R.c2; c++) copyShift(R.r1 - 1, c, R.r1, c); }
    else for (var r = R.r1 + 1; r <= R.r2; r++) for (var c2 = R.c1; c2 <= R.c2; c2++) copyShift(R.r1, c2, r, c2);
    afterChange(); toast('เติมลง (Ctrl+D)');
  }
  function fillRight() {
    if (view.mode !== 'admin') return;
    var R = range();
    pushUndo();
    if (R.c1 === R.c2) { if (R.c1 > 0) for (var r = R.r1; r <= R.r2; r++) copyShift(r, R.c1 - 1, r, R.c1); }
    else for (var c = R.c1 + 1; c <= R.c2; c++) for (var r2 = R.r1; r2 <= R.r2; r2++) copyShift(r2, R.c1, r2, c);
    afterChange(); toast('เติมขวา (Ctrl+R)');
  }

  // เพิ่ม/ลดขนาดตัวอักษรทีละขั้น (เหมือนปุ่ม A˄ A˅ ของ Excel)
  var FS_STEPS = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 36, 48];
  function setFontSize(px) {
    if (view.mode !== 'admin') return;
    px = parseFloat(px); if (!(px >= 6 && px <= 96)) return;
    pushUndo();
    var R = range();
    for (var r = R.r1; r <= R.r2; r++) for (var c = R.c1; c <= R.c2; c++) { var cell = ensureCell(r, c); cell.s = cell.s || {}; cell.s.fs = px; }
    afterChange();
  }
  function stepFont(dir) {
    if (view.mode !== 'admin') return;
    pushUndo();
    var R = range();
    for (var r = R.r1; r <= R.r2; r++) for (var c = R.c1; c <= R.c2; c++) {
      var cell = ensureCell(r, c); cell.s = cell.s || {};
      var cur = cell.s.fs || 10;
      var i = 0;
      while (i < FS_STEPS.length - 1 && FS_STEPS[i] < cur) i++;
      if (dir > 0) i = Math.min(FS_STEPS.length - 1, (FS_STEPS[i] <= cur ? i + 1 : i));
      else i = Math.max(0, (FS_STEPS[i] >= cur ? i - 1 : i));
      cell.s.fs = FS_STEPS[i];
    }
    afterChange();
    toast(dir > 0 ? 'เพิ่มขนาดตัวอักษร' : 'ลดขนาดตัวอักษร');
  }

  // จัดการทศนิยม (เพิ่ม/ลดตำแหน่ง เหมือน Excel)
  function stepDp(dir) {
    if (view.mode !== 'admin') return;
    pushUndo();
    var R = range();
    for (var r = R.r1; r <= R.r2; r++) for (var c = R.c1; c <= R.c2; c++) {
      var cell = ensureCell(r, c); cell.s = cell.s || {};
      var cur = (cell.s.dp != null) ? cell.s.dp : 0;
      cell.s.dp = Math.max(0, Math.min(6, cur + dir));
    }
    afterChange();
    toast(dir > 0 ? 'เพิ่มทศนิยม' : 'ลดทศนิยม');
  }

  // ---------- keyboard ----------
  function onKey(e) {
    if (editing && !editing.viaFx) {
      if (e.key === 'Enter') { e.preventDefault(); commitEdit(e.shiftKey ? 'up' : 'down'); }
      else if (e.key === 'Tab') { e.preventDefault(); commitEdit(e.shiftKey ? 'left' : 'right'); }
      else if (e.key === 'Escape') { e.preventDefault(); cancelEdit(); }
      return;
    }
    var meta = e.ctrlKey || e.metaKey;
    if (meta) {
      var k = e.key.toLowerCase();
      // แป้นพิมพ์ภาษาไทย: Ctrl+X ส่ง “ฝ” มาแทน x → ใช้ตำแหน่งปุ่มจริง (e.code) แทน
      if (k.length === 1 && !/[a-z0-9+\-= ]/.test(k) && /^Key[A-Z]$/.test(e.code || '')) k = e.code.slice(3).toLowerCase();
      if (k === 'c') { e.preventDefault(); doCopy(false); }
      else if (k === 'x') { e.preventDefault(); doCopy(true); }
      else if (k === 'v') { e.preventDefault(); doPaste(); }
      else if (k === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
      else if (k === 'y') { e.preventDefault(); redo(); }
      else if (k === '+' || k === '=') {
        e.preventDefault();
        var R0 = range();
        if (clip && clip.fullRows) insertCopiedRows();
        else if (clip && clip.fullCols) insertCopiedCols();
        else if (R0.c1 === 0 && R0.c2 === doc.nCols - 1) insertRows(R0.r1, R0.r2 - R0.r1 + 1);
        else if (R0.r1 === 0 && R0.r2 === doc.nRows - 1) insertCols(R0.c1, R0.c2 - R0.c1 + 1);
      }
      else if (k === '-') {
        e.preventDefault();
        var R1 = range();
        if (R1.c1 === 0 && R1.c2 === doc.nCols - 1) deleteRow();
        else if (R1.r1 === 0 && R1.r2 === doc.nRows - 1) deleteCol();
      }
      else if (k === 'b') { e.preventDefault(); applyStyle('b', 'toggle'); }
      else if (k === 'i') { e.preventDefault(); applyStyle('i', 'toggle'); }
      else if (k === 'u') { e.preventDefault(); applyStyle('u', 'toggle'); }
      else if (k === 'a') { e.preventDefault(); sel.ar = 0; sel.ac = 0; sel.r = doc.nRows - 1; sel.c = doc.nCols - 1; paintSel(); toast('เลือกทั้งหมด (Ctrl+A)'); }
      else if (k === 's') { e.preventDefault(); save(); }
      else if (k === 'p') { e.preventDefault(); window.print(); }
      else if (k === 'f') { e.preventDefault(); var fq = document.getElementById('fq'); if (fq) fq.focus(); }
      else if (k === 'd') { e.preventDefault(); fillDown(); }
      else if (k === 'r') { e.preventDefault(); fillRight(); }
      else if (k === 'home') { e.preventDefault(); setActive(0, 0); }
      else if (k === 'end') { e.preventDefault(); setActive(doc.nRows - 1, doc.nCols - 1); }
      else if (k === ' ') { e.preventDefault(); sel.ar = 0; sel.r = doc.nRows - 1; paintSel(); }   // Ctrl+Space = ทั้งคอลัมน์
      else if (k === 'arrowdown') { e.preventDefault(); setActive(doc.nRows - 1, sel.c, e.shiftKey); }
      else if (k === 'arrowup') { e.preventDefault(); setActive(0, sel.c, e.shiftKey); }
      else if (k === 'arrowleft') { e.preventDefault(); setActive(sel.r, 0, e.shiftKey); }
      else if (k === 'arrowright') { e.preventDefault(); setActive(sel.r, doc.nCols - 1, e.shiftKey); }
      return;
    }
    // Logitech G-keys (ตั้งมาโครใน G HUB ให้ส่ง F13–F24)
    var GK = { F13: function () { doCopy(false); }, F14: function () { doCopy(true); }, F15: doPaste,
      F16: undo, F17: redo, F18: save, F19: addModelRow, F20: addSizeGroup, F21: toggleMerge,
      F22: function () { window.print(); }, F23: syncToDB, F24: function () { var b = document.getElementById('btnKeys'); if (b) b.click(); } };
    if (GK[e.key]) { e.preventDefault(); GK[e.key](); return; }
    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); setActive(stepRow(sel.r, 1), sel.c, e.shiftKey); break;
      case 'ArrowUp': e.preventDefault(); setActive(stepRow(sel.r, -1), sel.c, e.shiftKey); break;
      case 'ArrowLeft': e.preventDefault(); setActive(sel.r, stepCol(sel.c, -1), e.shiftKey); break;
      case 'ArrowRight': e.preventDefault(); setActive(sel.r, stepCol(sel.c, 1), e.shiftKey); break;
      case 'Tab': e.preventDefault(); setActive(sel.r, stepCol(sel.c, e.shiftKey ? -1 : 1)); break;
      case 'Enter': case 'F2': e.preventDefault(); startEdit(null); break;
      case 'Delete': case 'Backspace': e.preventDefault(); delRange(); break;
      case 'Home': e.preventDefault(); setActive(sel.r, 0); break;
      case 'End': e.preventDefault(); setActive(sel.r, doc.nCols - 1); break;
      case 'PageDown': e.preventDefault(); setActive(Math.min(doc.nRows - 1, sel.r + 20), sel.c, e.shiftKey); break;
      case 'PageUp': e.preventDefault(); setActive(Math.max(0, sel.r - 20), sel.c, e.shiftKey); break;
      case ' ': if (e.shiftKey) { e.preventDefault(); sel.ac = 0; sel.c = doc.nCols - 1; paintSel(); break; }   // Shift+Space = ทั้งแถว
        e.preventDefault(); startEdit(' '); break;
      case 'Escape':
        if (clip) { clearClip(); break; }
        if (sel.r !== sel.ar || sel.c !== sel.ac) { sel.ar = sel.r; sel.ac = sel.c; paintSel(); break; }   // ยกเลิกการลากเลือกหลายช่อง → เหลือช่องเดียว
        closeCtx(); break;
      default:
        if (e.key.length === 1 && !e.altKey) { e.preventDefault(); startEdit(e.key); }
    }
  }

  // ---------- mouse ----------
  var drag = null;  // 'cell' | 'gut' | 'head' | 'fill'
  function onMouseDown(e) {
    closeCtx();
    if (e.target.classList.contains('sg-rzc')) { startRzCol(+e.target.dataset.rz, e.clientX); e.preventDefault(); return; }
    if (e.target.classList.contains('sg-rzr')) { startRzRow(+e.target.dataset.rzr, e.clientY); e.preventDefault(); return; }
    // จุดจับมุมขวาล่าง (fill handle) — ลากเพื่อก๊อปปี้ลง/ขวาเหมือน Excel
    if (e.button === 0 && view.mode === 'admin') {
      var tdf = e.target.closest('td.sg-c');
      if (tdf) {
        var Rf = range();
        var brEl = cellEl(Rf.r2, Rf.c2);
        if (tdf === brEl || tdf.classList.contains('act')) {
          var rect = tdf.getBoundingClientRect();
          if (e.clientX > rect.right - 9 && e.clientY > rect.bottom - 9) {
            drag = 'fill'; fillTarget = null;
            e.preventDefault();
            return;
          }
        }
      }
    }
    if (e.target.classList.contains('sg-fh')) { drag = 'fill'; e.preventDefault(); return; }
    var h = e.target.closest('th.sg-h');
    if (h) {
      if (editing) commitEdit();
      var hc = +h.dataset.hc;
      var Rh = range();
      if (e.button === 2) {
        // คลิกขวา: ถ้าคอลัมน์นี้อยู่ในช่วงที่เลือกไว้แล้ว คงการเลือกหลายคอลัมน์ไว้ (สั่งงานทีเดียวได้ทั้งชุด)
        if (!(hc >= Rh.c1 && hc <= Rh.c2)) { sel.ac = hc; sel.c = hc; sel.ar = 0; sel.r = doc.nRows - 1; }
        paintSel(); rootEl.focus(); return;
      }
      if (e.shiftKey) sel.c = hc; else { sel.ac = hc; sel.c = hc; }
      sel.ar = 0; sel.r = doc.nRows - 1;
      drag = 'head'; paintSel(); rootEl.focus(); e.preventDefault(); return;
    }
    var g = e.target.closest('td.sg-g');
    if (g) {
      if (editing) commitEdit();
      var gr = +g.dataset.gr;
      var Rg = range();
      if (e.button === 2) {
        // คลิกขวา: ถ้าแถวนี้อยู่ในช่วงที่เลือกไว้แล้ว คงการเลือกหลายแถวไว้
        if (!(gr >= Rg.r1 && gr <= Rg.r2)) { sel.ar = gr; sel.r = gr; sel.ac = 0; sel.c = doc.nCols - 1; }
        paintSel(); rootEl.focus(); return;
      }
      if (e.shiftKey) sel.r = gr; else { sel.ar = gr; sel.r = gr; }
      sel.ac = 0; sel.c = doc.nCols - 1;
      drag = 'gut'; paintSel(); rootEl.focus(); e.preventDefault(); return;
    }
    if (e.target.classList.contains('sg-corner')) {
      sel.ar = 0; sel.ac = 0; sel.r = doc.nRows - 1; sel.c = doc.nCols - 1; paintSel(); rootEl.focus(); return;
    }
    var td = e.target.closest('td.sg-c');
    if (!td) return;
    if (editing) commitEdit();
    if (view.mode === 'user' && td.classList.contains('pclick')) {
      showPricePop(+td.dataset.r, +td.dataset.c, td);
    } else hidePricePop();
    if (e.button === 2) { // right click: keep selection if inside
      var r = +td.dataset.r, c = +td.dataset.c, R = range();
      if (r < R.r1 || r > R.r2 || c < R.c1 || c > R.c2) setActive(r, c);
      return;
    }
    setActive(+td.dataset.r, +td.dataset.c, e.shiftKey);
    drag = 'cell';
    rootEl.focus();
  }
  function onMouseMove(e) {
    if (rz) { moveRz(e.clientX, e.clientY); return; }
    if (!drag) return;
    if (drag === 'head') { var h = e.target.closest('th.sg-h'); if (h) { sel.c = +h.dataset.hc; paintSel(); } return; }
    if (drag === 'gut') { var g = e.target.closest('td.sg-g'); if (g) { sel.r = +g.dataset.gr; paintSel(); } return; }
    var td = e.target.closest('td.sg-c'); if (!td) return;
    if (drag === 'fill') { showFillPreview(+td.dataset.r, +td.dataset.c); return; }
    // ลากผ่านเซลล์ผสาน (ช่องขนาด/แถบหัว) → ขยายเฉพาะแถว ไม่ดึงคอลัมน์อื่นเข้ามา
    if ((td.rowSpan > 1 || td.colSpan > 1) && +td.dataset.c !== sel.ac) { setActive(+td.dataset.r, sel.c, true); return; }
    setActive(+td.dataset.r, +td.dataset.c, true);
  }
  var fillTarget = null;
  function showFillPreview(r, c) {
    fillTarget = { r: r, c: c };
    rootEl.querySelectorAll('.sg-c.fillpv').forEach(function (e) { e.classList.remove('fillpv'); });
    var R = range();
    if (r > R.r2) for (var rr = R.r2 + 1; rr <= r; rr++) for (var cc = R.c1; cc <= R.c2; cc++) mark(rr, cc);
    else if (c > R.c2) for (var cc2 = R.c2 + 1; cc2 <= c; cc2++) for (var rr2 = R.r1; rr2 <= R.r2; rr2++) mark(rr2, cc2);
    function mark(rr, cc) { var el = cellEl(rr, cc); if (el) el.classList.add('fillpv'); }
    drawSelRect();   // ขยายกรอบใหญ่ครอบพื้นที่ลากเติมทั้งหมด (กรอบเดียว ไม่มีเส้นรายช่อง)
  }
  function onMouseUp(e) {
    if (rz) { endRz(); return; }
    if (drag === 'fill' && fillTarget) {
      rootEl.querySelectorAll('.sg-c.fillpv').forEach(function (el) { el.classList.remove('fillpv'); });
      fillTo(fillTarget.r, fillTarget.c);
      fillTarget = null;
      drawSelRect();
    }
    drag = null;
  }
  function onDblClick(e) {
    if (e.target.classList.contains('sg-rzc')) { autofitCol(+e.target.dataset.rz); return; }
    if (e.target.classList.contains('sg-rzr')) { pushUndo(); delete doc.rowH[+e.target.dataset.rzr]; afterChange(); toast('คืนความสูงปกติ'); return; }
    var td = e.target.closest('td.sg-c'); if (!td) return;
    setActive(+td.dataset.r, +td.dataset.c);
    startEdit(null);
  }

  // ---------- misc ----------
  var toastT;
  function toast(msg) {
    var t = document.getElementById('toast'); if (!t) return;
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('show'); }, 1500);
  }

  function setMode(m) {
    if (editing) cancelEdit();
    view.mode = m === 'user' ? 'user' : 'admin';
    invalidate(); buildCover(); render();
    return view.mode;
  }
  function setZoom(z) { view.zoom = Math.max(0.5, Math.min(2, z)); render(); }
  function toggleSecret() { view.secret = !view.secret; render(); return view.secret; }

  // ---------- init ----------
  function init(opts) {
    rootEl = opts.root; fxEl = opts.fx; nameEl = opts.name; statusEl = opts.status; sumEl = opts.sum; ctxEl = opts.ctx;
    var saved = XL2.store.loadCurrent();
    doc = (saved && saved.cells) ? saved : window.XL2Build.fromPickup01();
    doc.adminRows = doc.adminRows || {}; doc.adminCols = doc.adminCols || {};
    doc.merges = doc.merges || {}; doc.colW = doc.colW || []; doc.rowH = doc.rowH || [];
    doc.rowLinks = doc.rowLinks || {};
    // migrate: ช่อง Margin (คอลัมน์ K) ใส่สีตามบวก/ลบ
    for (var mr = 0; mr < doc.nRows; mr++) {
      var mc = doc.cells[mr + ':10'];
      if (mc && mc.f && /^=H\d+-G\d+$/.test(mc.f)) { mc.s = mc.s || {}; if (!mc.s.cond) { mc.s.cond = 'pn'; delete mc.s.fc; } }
    }

    inputEl = document.createElement('input');
    inputEl.className = 'sg-input'; inputEl.style.display = 'none';
    tipEl = document.createElement('div');
    tipEl.className = 'sg-tip'; tipEl.style.display = 'none';

    buildCover(); render(); setActive(0, 0);

    rootEl.tabIndex = 0;
    rootEl.addEventListener('keydown', onKey);
    rootEl.addEventListener('mousedown', onMouseDown);
    rootEl.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    rootEl.addEventListener('dblclick', onDblClick);
    rootEl.addEventListener('contextmenu', function (e) { e.preventDefault(); openCtx(e.clientX, e.clientY); });
    document.addEventListener('mousedown', function (e) { var t = e.target && e.target.closest ? e.target : null; if (!t) return; if (!t.closest('.sg-ctx')) closeCtx(); if (!t.closest('.sg-pricepop') && !t.closest('td.pclick')) hidePricePop(); });
    // Esc ที่ไหนก็ได้ (แม้โฟกัสไม่อยู่ที่ตาราง): ยกเลิกคัดลอก/ตัด · ปิดเมนู · ปิดป๊อปอัพต่างๆ
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (editing) return;               // กำลังพิมพ์ — ให้ Esc ยกเลิกการพิมพ์ตามปกติ
      if (clip) clearClip();
      closeCtx(); hidePricePop(); closePicker();
    });
    inputEl.addEventListener('blur', function () { if (editing && !editing.viaFx) commitEdit(); });
    inputEl.addEventListener('input', function () { if (fxEl && editing) fxEl.value = inputEl.value; });

    // fx bar
    if (fxEl) {
      fxEl.addEventListener('focus', function () { if (view.mode !== 'admin') return; if (!editing) editing = { r: anchorOf(sel.r, sel.c).r, c: anchorOf(sel.r, sel.c).c, viaFx: true }; });
      fxEl.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); commitEdit('down'); }
        else if (e.key === 'Escape') { e.preventDefault(); cancelEdit(); }
      });
      fxEl.addEventListener('blur', function () { if (editing && editing.viaFx) commitEdit(); });
    }
    rootEl.focus();
  }

  // ---------- versions ----------
  function saveAs(name) {
    var id = 'v' + Date.now();
    var meta = { id: id, name: name || ('เวอร์ชัน ' + new Date().toLocaleString('th-TH')), savedAt: Date.now() };
    XL2.store.saveVersionDoc(id, doc);
    var vs = XL2.store.loadVersions(); vs.unshift(meta); XL2.store.saveVersions(vs);
    dirty = false; toast('บันทึกเป็น: ' + meta.name);
    return meta;
  }
  function save() { XL2.store.saveCurrent(doc); dirty = false; toast('บันทึกแล้ว'); }
  function openVersion(id) {
    var d = XL2.store.loadVersion(id); if (!d) return;
    doc = d; doc.adminRows = doc.adminRows || {}; doc.adminCols = doc.adminCols || {};
    undoStack.length = redoStack.length = 0;
    afterChange(); setActive(0, 0); toast('เปิดเวอร์ชันแล้ว');
  }
  function resetFromSource() {
    doc = window.XL2Build.fromPickup01();
    undoStack.length = redoStack.length = 0;
    afterChange(); setActive(0, 0); toast('โหลดต้นฉบับใหม่');
  }

  function setCondColors(o) {
    if (view.mode !== 'admin') return;
    pushUndo();
    doc.condColors = { pos: (o.pos || '008000'), neg: (o.neg || 'C00000') };
    afterChange(); toast('ตั้งสี Margin: บวก #' + doc.condColors.pos + ' · ลบ #' + doc.condColors.neg);
  }

  // ---------- data snapshot สำหรับโมดูลอื่น (เช่นแชทบอท) ----------
  function dataRows() {
    if (!cache) cache = {};
    var out = [];
    for (var r = 0; r < doc.nRows; r++) {
      if (rowKind(r) !== 'data') continue;
      var brand = String(valueOf(r, 2)).trim(), model = String(valueOf(r, 3)).trim();
      if (!brand && !model) continue;
      out.push({
        r: r, size: rowSizeText(r), brand: brand, model: model,
        dot: String(valueOf(r, 4)).trim(),
        cost: valueOf(r, 6), retail: valueOf(r, 7), margin: valueOf(r, 10),
        B: valueOf(r, 13), A: valueOf(r, 16), S: valueOf(r, 19),
        changed: !!(doc.changes && doc.changes[r])
      });
    }
    return out;
  }

  // ราคาที่ “มีผลจริง” เท่านั้น: ถ้าราคาถูกปรับแต่ยังไม่ถึงเวลา (หรือยังไม่เผยแพร่) จะคืนราคาเดิม
  var PRICE_FIELD = { 7: 'retail', 13: 'B', 16: 'A', 19: 'S' };
  function effectiveDataRows() {
    var rows = dataRows();
    rows.forEach(function (rw) {
      var rc = doc.changes && doc.changes[rw.r];
      if (!rc) return;
      Object.keys(PRICE_FIELD).forEach(function (c) {
        var e = rc[c]; if (!e) return;
        var effOk = e.sent && parseEff(e.effectiveAt).getTime() <= Date.now();
        if (!effOk) { rw[PRICE_FIELD[c]] = e.old; rw.pending = true; }
      });
    });
    return rows;
  }

  // โหลดชีตใหม่จาก store (ใช้ตอนสลับหมวด)
  function reloadSheet() {
    var saved = XL2.store.loadCurrent();
    doc = (saved && saved.cells) ? saved : window.XL2Build.fromPickup01();
    doc.adminRows = doc.adminRows || {}; doc.adminCols = doc.adminCols || {};
    doc.merges = doc.merges || {}; doc.colW = doc.colW || []; doc.rowH = doc.rowH || [];
    doc.rowLinks = doc.rowLinks || {}; doc.changes = doc.changes || {};
    doc.hideRows = doc.hideRows || {}; doc.hideCols = doc.hideCols || {}; doc.uHideRows = doc.uHideRows || {}; doc.uHideCols = doc.uHideCols || {};
    for (var mr = 0; mr < doc.nRows; mr++) {
      var mc = doc.cells[mr + ':10'];
      if (mc && mc.f && /^=H\d+-G\d+$/.test(mc.f)) { mc.s = mc.s || {}; if (!mc.s.cond) { mc.s.cond = 'pn'; delete mc.s.fc; } }
    }
    undoStack.length = redoStack.length = 0;
    if (editing) cancelEdit();
    invalidate(); buildCover(); render(); setActive(0, 0);
    persist();
  }

  // ---------- API สำหรับบอท/ปลั๊กอินภายนอก (Telegram bridge) ----------
  function apiSetCell(r, c, val) {
    if (r < 0 || r >= doc.nRows || c < 0 || c >= doc.nCols) throw 'out-of-range';
    pushUndo();
    recordChange(r, c, valueOf(r, c));
    var nc = ensureCell(r, c);
    if (String(val).charAt(0) === '=') { nc.f = String(val); delete nc.v; }
    else { delete nc.f; nc.v = val; }
    invalidate();
    pruneChange(r, c);
    afterChange();
    return valueOf(r, c);
  }

  window.SG = {
    init: init, render: render, undo: undo, redo: redo,
    copy: function () { doCopy(false); }, paste: doPaste, delRange: delRange, clearClip: clearClip,
    insertRow: insertRow, insertRows: insertRows, deleteRow: deleteRow, insertCol: insertCol, insertCols: insertCols, deleteCol: deleteCol, addRowsBottom: addRowsBottom,
    insertCopiedRows: insertCopiedRows, insertCopiedCols: insertCopiedCols, fillDown: fillDown, fillRight: fillRight,
    addModelRow: addModelRow, addSizeGroup: addSizeGroup, delSizeGroup: delSizeGroup,
    toggleMerge: toggleMerge, applyStyle: applyStyle, applyBorders: applyBorders, setBorderOpts: setBorderOpts, setType: setType, linkDB: linkDB, stepFont: stepFont, setFontSize: setFontSize, stepDp: stepDp,
    linkRowDB: linkRowDB, unlinkRow: unlinkRow, syncToDB: syncToDB,
    setSchedule: setSchedule, setRowSchedule: setRowSchedule, getSchedule: function () { return doc.schedule || ''; },
    setFilter: setFilter, clearFilter: clearFilter, filterOptions: filterOptions, getMatchCount: function () { return lastMatchCount; }, isTooMany: function () { return tooMany; },
    setCondColors: setCondColors, getCondColors: function () { return doc.condColors || { pos: '008000', neg: 'C00000' }; },
    clearChanges: clearChanges,
    toggleLockRows: toggleLockRows, toggleLockCols: toggleLockCols,
    hideRows: hideRows, unhideRows: unhideRows, hideCols: hideCols, unhideCols: unhideCols, showAllHidden: showAllHidden,
    toggleUserHideRows: toggleUserHideRows, toggleUserHideCols: toggleUserHideCols,
    setMode: setMode, getMode: function () { return view.mode; },
    setZoom: setZoom, getZoom: function () { return view.zoom; }, toggleSecret: toggleSecret,
    saveAs: saveAs, save: save, openVersion: openVersion, resetFromSource: resetFromSource,
    getDoc: function () { return doc; }, isDirty: function () { return dirty; },
    dataRows: dataRows, effectiveDataRows: effectiveDataRows, reloadSheet: reloadSheet, apiSetCell: apiSetCell, pushUndo: pushUndo,
    sel: sel, range: range, startEdit: startEdit
  };
})();
