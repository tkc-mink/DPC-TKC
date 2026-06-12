/* ============================================================
   img-layer.js — รูปภาพลอยบนตาราง (แบบ Excel)
   แนบไฟล์ / วางจากคลิปบอร์ด (ก๊อบจาก Google) / ลากไฟล์มาวาง
   ย้าย-ย่อขยาย-หมุน-ตัดภาพ (crop) - เรียงชั้นหน้า/หลัง
   คลิกขวามีเมนู · Copy/Cut/Paste/Delete ด้วยคีย์ลัด
   เก็บใน doc.images → บันทึก/สลับหมวดตามชีตอัตโนมัติ
   ============================================================ */
(function () {
  var layer = null, gw = null;
  var selId = null, clipObj = null, clipCut = false;
  var drag = null;   // {mode:'move|resize|rotate|crop-t/r/b/l', id, sx, sy, orig}
  var ctxEl = null;

  function doc() { return SG.getDoc(); }
  function imgs() { var d = doc(); if (!d.images) d.images = []; return d.images; }
  function byId(id) { return imgs().find(function (i) { return i.id === id; }); }
  function uid() { return 'i' + Date.now() + Math.floor(Math.random() * 999); }
  function persist() { SG.save(); }
  function pu() { if (SG.pushUndo) SG.pushUndo(); }   // จุด undo ร่วมกับตาราง (Ctrl+Z ย้อนได้)
  function maxZ() { return imgs().reduce(function (m, i) { return Math.max(m, i.z || 0); }, 0); }
  function minZ() { return imgs().reduce(function (m, i) { return Math.min(m, i.z || 0); }, 0); }

  // ---------- เพิ่มรูป ----------
  function addImage(src, x, y) {
    var im = new Image();
    im.onload = function () {
      var w = im.naturalWidth, h = im.naturalHeight;
      var cap = 320;
      if (w > cap) { h = h * cap / w; w = cap; }
      if (h > cap) { w = w * cap / h; h = cap; }
      var sc = gw ? gw.scrollLeft : 0, st = gw ? gw.scrollTop : 0;
      var o = { id: uid(), src: src, x: (x != null ? x : sc + 120), y: (y != null ? y : st + 120),
        w: Math.round(w), h: Math.round(h), rot: 0, z: maxZ() + 1, crop: { t: 0, r: 0, b: 0, l: 0 } };
      pu();
      imgs().push(o);
      selId = o.id;
      persist(); render();
      toast('🖼️ แนบรูปแล้ว — ลากย้าย/มุมย่อขยาย · คลิกขวาดูเมนู');
    };
    im.src = src;
  }
  function addFromFile(file, x, y) {
    if (!file || !/^image\//.test(file.type)) return;
    var rd = new FileReader();
    rd.onload = function () { addImage(rd.result, x, y); };
    rd.readAsDataURL(file);
  }
  function pickFile() {
    var inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'image/*';
    inp.onchange = function () { addFromFile(inp.files[0]); };
    inp.click();
  }
  // ---------- ค้นรูปในตัวโปรแกรม (แสดงผล + เลือกหลายรูป นำเข้าทันที) ----------
  var dlg = null, picked = {}, results = [], extFilter = 'all', lastQ = '';
  function extOf(u) {
    var m = /\.(png|jpe?g|gif|webp|svg|bmp|avif)(\?|#|$)/i.exec(String(u || ''));
    if (!m) return 'other';
    var e = m[1].toLowerCase();
    return e === 'jpeg' ? 'jpg' : e;
  }
  function renderResults() {
    var grid = dlg.querySelector('.is-grid');
    var list = results.map(function (x, i) { x._k = i; return x; }).filter(function (x) {
      var e = extOf(x.url || x.thumb);
      if (extFilter === 'all') return true;
      if (extFilter === 'other') return ['png', 'jpg', 'webp', 'gif', 'svg'].indexOf(e) < 0;
      return e === extFilter;
    });
    grid.innerHTML = list.length ? list.map(function (x) {
      var e = extOf(x.url || x.thumb).toUpperCase();
      return '<div class="is-it' + (picked[x._k] ? ' sel' : '') + '" data-k="' + x._k + '" title="' + (x.title || '').replace(/"/g, '') + '"><img loading="lazy" src="' + x.thumb + '" /><span class="is-ext">' + e + '</span><span class="is-chk">✓</span></div>';
    }).join('') : '<div class="is-msg">ไม่มีรูปนามสกุลนี้ในผลลัพธ์ — ลอง ทั้งหมด</div>';
  }
  function googleSearch() { openSearchDlg(); }
  function openSearchDlg() {
    if (!dlg) {
      dlg = document.createElement('div');
      dlg.className = 'imgsearch';
      dlg.innerHTML =
        '<div class="is-head">🔎 ค้นหารูปภาพ<span class="is-x" title="ปิด">✕</span></div>' +
        '<div class="is-bar"><input class="is-q" placeholder="พิมพ์คำค้น เช่น tire, ยางรถยนต์…" />' +
        '<button class="btn primary is-go">ค้นหา</button>' +
        '<button class="btn is-gg" title="เปิด Google รูปภาพในแท็บใหม่ (คัดลอกแล้วกลับมา Ctrl+V)">Google ↗</button></div>' +
        '<div class="is-exts"><span class="is-extlab">นามสกุล:</span>' +
        ['all|ทั้งหมด', 'png|PNG', 'jpg|JPG', 'webp|WEBP', 'gif|GIF', 'svg|SVG', 'other|อื่นๆ'].map(function (p, i) {
          var a = p.split('|');
          return '<span class="is-extchip' + (i === 0 ? ' on' : '') + '" data-ext="' + a[0] + '">' + a[1] + '</span>';
        }).join('') + '</div>' +
        '<div class="is-grid"></div>' +
        '<div class="is-foot"><span class="is-note">คลิกรูปเพื่อเลือกได้หลายรูป (คลังภาพเสรี Openverse/Wikimedia)</span>' +
        '<button class="btn primary is-import" disabled>นำเข้า 0 รูป</button></div>';
      document.body.appendChild(dlg);
      dlg.querySelector('.is-x').onclick = function () { dlg.style.display = 'none'; };
      dlg.querySelector('.is-go').onclick = function () { doSearch(dlg.querySelector('.is-q').value.trim()); };
      dlg.querySelector('.is-q').addEventListener('keydown', function (e) { if (e.key === 'Enter') doSearch(this.value.trim()); });
      dlg.querySelector('.is-gg').onclick = function () {
        var c = gcfg();
        var key = prompt('Google API key (Programmable Search) — ใส่ครั้งเดียวเก็บถาวร\nสร้างฟรีที่ console.cloud.google.com (Custom Search API) + cse.google.com', c.key || '');
        if (key === null) return;
        var cx = prompt('Search engine ID (cx) จาก programmablesearchengine.google.com\n(เปิด “ค้นรูปภาพ” ในเครื่องมือนั้นด้วย)', c.cx || '');
        if (cx === null) return;
        localStorage.setItem('xls2_gcse', JSON.stringify({ key: key.trim(), cx: cx.trim() }));
        toast(key.trim() && cx.trim() ? '✅ ตั้งค่า Google แล้ว — ค้นได้จาก Google โดยตรง' : 'ล้างค่า Google แล้ว (กลับไปใช้คลังภาพเสรี)');
        var q = dlg.querySelector('.is-q').value.trim();
        if (q && key.trim() && cx.trim()) doSearch(q);
      };
      dlg.querySelector('.is-gg').textContent = '⚙ Google';
      dlg.querySelector('.is-gg').title = 'ตั้งค่า Google API — ค้นรูปจาก Google โดยตรงด้วยคำที่พิมพ์';
      dlg.querySelector('.is-grid').onclick = function (e) {
        var it = e.target.closest('.is-it'); if (!it) return;
        openPreview(+it.dataset.k);   // คลิกรูป 1 ครั้ง → ดูรูปเต็มก่อน แล้วค่อยเลือก
      };
      dlg.querySelector('.is-import').onclick = importPicked;
      dlg.querySelector('.is-exts').onclick = function (e) {
        var c = e.target.closest('.is-extchip'); if (!c) return;
        extFilter = c.dataset.ext;
        dlg.querySelectorAll('.is-extchip').forEach(function (x) { x.classList.toggle('on', x === c); });
        // ค้นใหม่ตามนามสกุลที่เลือก → ได้ผลลัพธ์เต็มชุดของนามสกุลนั้น ไม่ใช่แค่กรองจาก 24 รูปเดิม
        if (lastQ) doSearch(lastQ);
        else renderResults();
      };
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && dlg) dlg.style.display = 'none'; });
    }
    dlg.style.display = 'flex';
    setTimeout(function () { dlg.querySelector('.is-q').focus(); }, 50);
  }
  function openPreview(k) {
    var x = results[k]; if (!x) return;
    var pv = document.createElement('div');
    pv.className = 'is-preview';
    var on = !!picked[k];
    pv.innerHTML = '<div class="isp-box">' +
      '<img src="' + (x.url || x.thumb) + '" />' +
      '<div class="isp-bar"><span class="isp-t">' + (x.title || '').replace(/</g, '&lt;') + '</span>' +
      '<span class="isp-act"><button class="btn isp-cancel">ยกเลิก (Esc)</button>' +
      '<button class="btn primary isp-pick">' + (on ? '✓ เลือกแล้ว — เอาออก' : '✓ เลือกรูปนี้') + '</button></span></div></div>';
    document.body.appendChild(pv);
    pv._esc = function (e) { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
    function close() { document.removeEventListener('keydown', pv._esc, true); pv.remove(); }
    pv.querySelector('.isp-box').onclick = function (e) { e.stopPropagation(); };
    pv.onclick = close;
    pv.querySelector('.isp-cancel').onclick = close;
    pv.querySelector('.isp-pick').onclick = function () {
      if (picked[k]) delete picked[k]; else picked[k] = results[k];
      var it = dlg.querySelector('.is-it[data-k="' + k + '"]');
      if (it) it.classList.toggle('sel', !!picked[k]);
      updImport();
      close();
    };
    document.addEventListener('keydown', pv._esc, true);
  }
  function updImport() {
    var n = Object.keys(picked).length;
    var b = dlg.querySelector('.is-import');
    b.disabled = !n;
    b.textContent = 'นำเข้า ' + n + ' รูป';
  }
  // ---------- ค้นหาอัจฉริยะ: ผสมคำ / แยกคำ / ขยายคำพ้อง + dedupe + จัดลำดับความตรง ----------
  var SYN = { otani: 'otani tire', ยาง: 'tire', ยางรถ: 'car tire', รถยนต์: 'car', ล้อ: 'wheel', ขอบ: 'tire rim', โลโก้: 'logo', ปิคอัพ: 'pickup truck', กระบะ: 'truck' };
  function expandWord(w) { return SYN[w.toLowerCase()] || w; }
  function buildQueries(raw) {
    var s = String(raw || '').trim().replace(/\s+/g, ' ');
    if (!s) return [];
    var words = s.split(' ');
    var qs = [];
    qs.push(s);                                           // 1) ทั้งวลีตามที่พิมพ์
    var expanded = words.map(expandWord).join(' ');
    if (expanded !== s) qs.push(expanded);               // 2) ขยายศัพท์ (otani→otani tire)
    if (words.length > 1) {
      qs.push(words.join(' OR '));                       // 3) แยกคำ OR (เจออย่างน้อยคำหนึ่ง)
      // 4) แยกทีละคำ (ขยายศัพท์ด้วย) — จับผลแม้คำใดคำหนึ่งไม่มีในคลัง
      words.forEach(function (w) { if (w.length > 1) { qs.push(w); var ex = expandWord(w); if (ex !== w) qs.push(ex); } });
    }
    // ตัดซ้ำ
    var seen = {}; return qs.filter(function (q) { q = q.trim(); if (!q || seen[q]) return false; seen[q] = 1; return true; });
  }
  function scoreOf(title, words) {
    var t = String(title || '').toLowerCase();
    var hit = 0; words.forEach(function (w) { if (w.length > 1 && t.indexOf(w.toLowerCase()) >= 0) hit++; });
    return hit;
  }
  function ovImages(q, extQ) {
    return fetch('https://api.openverse.org/v1/images/?q=' + encodeURIComponent(q) + '&page_size=40' + extQ)
      .then(function (r) { return r.json(); })
      .then(function (j) { return (j.results || []).map(function (x) { return { thumb: x.thumbnail, url: x.url, title: x.title || '' }; }); })
      .catch(function () { return []; });
  }
  // ค่าตั้ง Google Custom Search (key + cx) — ใส่ครั้งเดียวเก็บถาวร
  function gcfg() { try { return JSON.parse(localStorage.getItem('xls2_gcse') || '{}'); } catch (e) { return {}; } }
  function gImages(q) {
    var c = gcfg();
    var typ = (['png', 'jpg', 'gif', 'bmp', 'svg'].indexOf(extFilter) >= 0) ? '&fileType=' + (extFilter === 'jpg' ? 'jpg' : extFilter) : '';
    return fetch('https://www.googleapis.com/customsearch/v1?searchType=image&num=10&key=' + encodeURIComponent(c.key) + '&cx=' + encodeURIComponent(c.cx) + typ + '&q=' + encodeURIComponent(q))
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (j.error) throw j.error.message || 'gerror';
        return (j.items || []).map(function (x) {
          return { thumb: (x.image && x.image.thumbnailLink) || x.link, url: x.link, title: x.title || '' };
        });
      });
  }
  function doSearch(q) {
    if (!q) return;
    lastQ = q;
    var grid = dlg.querySelector('.is-grid');
    grid.innerHTML = '<div class="is-msg">⏳ กำลังค้นหา…</div>';
    picked = {}; results = []; updImport();
    var extQ = (['png', 'jpg', 'webp', 'gif', 'svg'].indexOf(extFilter) >= 0) ? '&extension=' + (extFilter === 'jpg' ? 'jpg' : extFilter) : '';
    var words = q.replace(/\s+/g, ' ').split(' ');
    // ถ้าตั้งค่า Google ไว้ → ค้นจาก Google ตรงๆ ด้วยคำที่พิมพ์ทุกคำ
    var gc = gcfg();
    if (gc.key && gc.cx) {
      grid.innerHTML = '<div class="is-msg">⏳ กำลังค้นจาก Google…</div>';
      gImages(q).then(function (list) {
        results = list.slice(0, 60);
        if (results.length) renderResults();
        else grid.innerHTML = '<div class="is-msg">Google ไม่พบรูปสำหรับ “' + q.replace(/</g, '&lt;') + '”</div>';
      }).catch(function (err) {
        grid.innerHTML = '<div class="is-msg">⚠️ Google: ' + String(err).replace(/</g, '&lt;') + '<br>ใช้คลังภาพเสรีแทน…</div>';
        setTimeout(function () { ovSearch(q, extQ, words, grid); }, 600);
      });
      return;
    }
    ovSearch(q, extQ, words, grid);
  }
  function ovSearch(q, extQ, words, grid) {
    var queries = buildQueries(q);
    Promise.all(queries.map(function (qq) { return ovImages(qq, extQ); })).then(function (lists) {
      // รวมผลตามลำดับความสำคัญ (คิวแรกได้น้ำหนักกว่า) + ตัดซ้ำด้วย url
      var seen = {}, merged = [];
      lists.forEach(function (list, qi) {
        list.forEach(function (x) {
          var key = x.url || x.thumb; if (!key || seen[key]) return; seen[key] = 1;
          x._score = scoreOf(x.title, words) * 10 - qi;   // คำตรงชื่อ + มาจากคิวตรงก่อน
          merged.push(x);
        });
      });
      merged.sort(function (a, b) { return (b._score || 0) - (a._score || 0); });
      results = merged.slice(0, 60);
      if (results.length) renderResults();
      else wikiFallback(q, grid);
    });
  }
  function wikiFallback(q, grid) {
    fetch('https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=' + encodeURIComponent(q) + '&gsrnamespace=6&gsrlimit=30&prop=imageinfo&iiprop=url&iiurlwidth=300&format=json&origin=*')
      .then(function (r) { return r.json(); })
      .then(function (j) {
        var pages = (j.query && j.query.pages) || {};
        results = Object.keys(pages).map(function (k) {
          var ii = pages[k].imageinfo && pages[k].imageinfo[0];
          return ii ? { thumb: ii.thumburl, url: ii.url, title: pages[k].title } : null;
        }).filter(Boolean);
        if (results.length) renderResults();
        else grid.innerHTML = '<div class="is-msg">ไม่พบรูป — ลองคำค้นอื่น หรือกดปุ่ม Google ↗ แล้วคัดลอกมาวาง</div>';
      })
      .catch(function () { grid.innerHTML = '<div class="is-msg">ค้นไม่สำเร็จ (เช็คอินเทอร์เน็ต) — ใช้ปุ่ม Google ↗ แทนได้</div>'; });
  }
  function importPicked() {
    var list = Object.keys(picked).map(function (k) { return picked[k]; });
    if (!list.length) return;
    toast('⏳ กำลังนำเข้า ' + list.length + ' รูป…');
    var off = 0;
    list.forEach(function (x) {
      var myOff = off; off += 30;
      // พยายามโหลดไฟล์เต็มก่อน (คมชัดเต็มรูป) · ถ้าต้นทางบล็อก ใช้ภาพย่อแทน
      fetch(x.url).then(function (r) { if (!r.ok) throw 0; return r.blob(); })
        .catch(function () { return fetch(x.thumb).then(function (r) { return r.blob(); }); })
        .then(function (b) {
          var rd = new FileReader();
          rd.onload = function () { addImage(rd.result, (gw ? gw.scrollLeft : 0) + 130 + myOff, (gw ? gw.scrollTop : 0) + 130 + myOff); };
          rd.readAsDataURL(b);
        }).catch(function () { toast('⚠️ นำเข้าบางรูปไม่สำเร็จ'); });
    });
    picked = {}; updImport();
    dlg.style.display = 'none';
  }

  function toast(s) { if (window.SG && SG.toast) SG.toast(s); else { var t = document.getElementById('toast'); if (t) { t.textContent = s; t.classList.add('show'); clearTimeout(t._tm); t._tm = setTimeout(function () { t.classList.remove('show'); }, 2600); } } }

  // ---------- render ----------
  function render() {
    if (!layer) return;
    var isAdmin = SG.getMode() === 'admin';
    layer.innerHTML = imgs().slice().sort(function (a, b) { return (a.z || 0) - (b.z || 0); }).map(function (o) {
      var cr = o.crop || { t: 0, r: 0, b: 0, l: 0 };
      var on = o.id === selId;
      return '<div class="imgw' + (on ? ' on' : '') + (clipObj && clipObj.id === o.id ? (clipCut ? ' cutmark' : ' copymark') : '') + '" data-img="' + o.id + '"' +
        ' style="left:' + o.x + 'px;top:' + o.y + 'px;width:' + o.w + 'px;height:' + o.h + 'px;transform:rotate(' + (o.rot || 0) + 'deg);z-index:' + (10 + (o.z || 0)) + ';">' +
        '<img src="' + o.src + '" draggable="false" style="clip-path:inset(' + cr.t + '% ' + cr.r + '% ' + cr.b + '% ' + cr.l + '%);" />' +
        (on && isAdmin ? '<span class="imh rot" data-h="rotate" title="ลากเพื่อหมุน"></span>' +
          ['nw', 'ne', 'sw', 'se'].map(function (d) { return '<span class="imh rs ' + d + '" data-h="rs-' + d + '"></span>'; }).join('') +
          (drag && drag.cropMode === o.id ? ['t', 'r', 'b', 'l'].map(function (d) { return '<span class="imh cp ' + d + '" data-h="cp-' + d + '" title="ลากเพื่อตัดขอบ"></span>'; }).join('') : '')
          : '') +
        '</div>';
    }).join('');
  }
  var cropTarget = null;   // id ที่อยู่ในโหมดตัดภาพ
  function renderAll() { render(); }

  // ---------- เมนูคลิกขวา ----------
  function closeMenu() { if (ctxEl) ctxEl.style.display = 'none'; }
  function openMenu(o, x, y) {
    if (!ctxEl) { ctxEl = document.createElement('div'); ctxEl.className = 'sg-ctx'; document.body.appendChild(ctxEl); }
    var reg = [];
    function it(ic, t, fn) { reg.push(fn); return '<div class="ctx-it" data-i="' + (reg.length - 1) + '"><span class="ctx-ic">' + ic + '</span><span class="ctx-tx">' + t + '</span></div>'; }
    function sep() { return '<div class="ctx-sep"></div>'; }
    ctxEl.innerHTML =
      it('✂️', 'ตัด (Ctrl+X)', function () { clipObj = JSON.parse(JSON.stringify(o)); clipCut = true; render(); }) +
      it('📋', 'คัดลอก (Ctrl+C)', function () { clipObj = JSON.parse(JSON.stringify(o)); clipCut = false; render(); toast('คัดลอกรูปแล้ว — Ctrl+V วาง'); }) +
      sep() +
      it('🖼️', cropTarget === o.id ? 'เสร็จสิ้นการตัดภาพ' : 'ตัดภาพ (crop)…', function () {
        cropTarget = (cropTarget === o.id) ? null : o.id;
        drag = cropTarget ? { cropMode: o.id } : null;
        render();
        if (cropTarget) toast('โหมดตัดภาพ: ลากขอบ บน/ล่าง/ซ้าย/ขวา เพื่อครอบตัด · คลิกขวา → เสร็จสิ้น');
      }) +
      it('♻️', 'รีเซ็ตการตัดภาพ', function () { pu(); o.crop = { t: 0, r: 0, b: 0, l: 0 }; persist(); render(); }) +
      it('↻', 'หมุน 90°', function () { pu(); o.rot = ((o.rot || 0) + 90) % 360; persist(); render(); }) +
      it('↺', 'หมุน −90°', function () { pu(); o.rot = ((o.rot || 0) - 90 + 360) % 360; persist(); render(); }) +
      sep() +
      it('⬆️', 'มาหน้าสุด', function () { pu(); o.z = maxZ() + 1; persist(); render(); }) +
      it('🔼', 'ขึ้นหนึ่งชั้น', function () { pu(); o.z = (o.z || 0) + 1.5; normZ(); persist(); render(); }) +
      it('🔽', 'ลงหนึ่งชั้น', function () { pu(); o.z = (o.z || 0) - 1.5; normZ(); persist(); render(); }) +
      it('⬇️', 'ไปหลังสุด', function () { pu(); o.z = minZ() - 1; persist(); render(); }) +
      sep() +
      it('🗑️', 'ลบรูป (Delete)', function () { removeImg(o.id); });
    ctxEl.style.display = 'block';
    var vw = window.innerWidth, vh = window.innerHeight;
    ctxEl.style.left = Math.min(x, vw - ctxEl.offsetWidth - 8) + 'px';
    var mh = ctxEl.offsetHeight;
    ctxEl.style.top = Math.max(8, Math.min(y > vh / 2 ? y - mh - 6 : y + 6, vh - mh - 8)) + 'px';
    ctxEl.onclick = function (e) {
      var el = e.target.closest('[data-i]'); if (!el) return;
      closeMenu(); reg[+el.dataset.i]();
    };
  }
  function normZ() {
    imgs().slice().sort(function (a, b) { return (a.z || 0) - (b.z || 0); }).forEach(function (o, i) { o.z = i + 1; });
  }
  function removeImg(id) {
    pu();
    var d = doc();
    d.images = imgs().filter(function (i) { return i.id !== id; });
    if (selId === id) selId = null;
    if (cropTarget === id) { cropTarget = null; drag = null; }
    persist(); render();
  }

  // ---------- ปฏิสัมพันธ์ ----------
  function onDown(e) {
    var hEl = e.target.closest ? e.target.closest('.imh') : null;
    var w = e.target.closest ? e.target.closest('.imgw') : null;
    if (!hEl && !w) { if (selId != null && !e.target.closest('.sg-ctx')) { selId = null; cropTarget = null; render(); } return; }
    if (SG.getMode() !== 'admin') return;
    var id = (hEl ? hEl.parentElement : w).dataset.img;
    var o = byId(id); if (!o) return;
    e.preventDefault(); e.stopPropagation();
    if (e.button === 2) { selId = id; render(); return; }   // contextmenu จะตามมา
    selId = id;
    var base = { x: o.x, y: o.y, w: o.w, h: o.h, rot: o.rot || 0, crop: JSON.parse(JSON.stringify(o.crop || { t: 0, r: 0, b: 0, l: 0 })) };
    var mode = hEl ? hEl.dataset.h : 'move';
    pu();   // จุด undo ก่อนเริ่มลาก (ย้าย/ย่อขยาย/หมุน/ครอป — Ctrl+Z ย้อนได้)
    drag = { id: id, mode: mode, sx: e.clientX, sy: e.clientY, orig: base, cropMode: cropTarget };
    render();
  }
  function onMove(e) {
    if (!drag || !drag.mode) return;
    var o = byId(drag.id); if (!o) return;
    var dx = e.clientX - drag.sx, dy = e.clientY - drag.sy, b = drag.orig;
    if (drag.mode === 'move') { o.x = b.x + dx; o.y = b.y + dy; }
    else if (drag.mode === 'rotate') {
      var el = layer.querySelector('.imgw[data-img="' + o.id + '"]');
      var r = el.getBoundingClientRect();
      var ang = Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180 / Math.PI + 90;
      o.rot = e.shiftKey ? Math.round(ang / 15) * 15 : Math.round(ang);
    }
    else if (/^rs-/.test(drag.mode)) {
      var d = drag.mode.slice(3);
      var ratio = b.w / b.h;
      var nw = b.w + (/e/.test(d) ? dx : -dx);
      nw = Math.max(24, nw);
      var nh = e.shiftKey ? Math.max(24, b.h + (/s/.test(d) ? dy : -dy)) : nw / ratio;
      if (/w/.test(d)) o.x = b.x + (b.w - nw);
      if (/n/.test(d)) o.y = b.y + (b.h - nh);
      o.w = Math.round(nw); o.h = Math.round(nh);
    }
    else if (/^cp-/.test(drag.mode)) {
      var side = drag.mode.slice(3), c = o.crop;
      if (side === 't') c.t = clampPct(b.crop.t + dy / b.h * 100, c.b);
      if (side === 'b') c.b = clampPct(b.crop.b - dy / b.h * 100, c.t);
      if (side === 'l') c.l = clampPct(b.crop.l + dx / b.w * 100, c.r);
      if (side === 'r') c.r = clampPct(b.crop.r - dx / b.w * 100, c.l);
    }
    render();
  }
  function clampPct(v, opposite) { return Math.max(0, Math.min(92 - (opposite || 0), Math.round(v))); }
  function onUp() {
    if (drag && drag.mode) { persist(); drag = cropTarget ? { cropMode: cropTarget } : null; render(); }
  }

  // ---------- คีย์ลัด + คลิปบอร์ด ----------
  function onKey(e) {
    var t = e.target;
    if (t && /INPUT|TEXTAREA|SELECT/.test(t.tagName)) return;
    if (e.key === 'Escape') { if (cropTarget || selId || clipObj) { cropTarget = null; clipCut = false; clipObj = null; selId = null; drag = null; render(); } return; }
    if (!selId) return;
    var o = byId(selId); if (!o) return;
    var meta = e.ctrlKey || e.metaKey;
    var k = e.key.toLowerCase();
    if (k.length === 1 && !/[a-z]/.test(k) && /^Key[A-Z]$/.test(e.code || '')) k = e.code.slice(3).toLowerCase();
    if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); e.stopPropagation(); removeImg(selId); }
    else if (meta && k === 'c') { e.preventDefault(); e.stopPropagation(); clipObj = JSON.parse(JSON.stringify(o)); clipCut = false; render(); toast('คัดลอกรูปแล้ว — Ctrl+V วาง · Esc ยกเลิก'); }
    else if (meta && k === 'x') { e.preventDefault(); e.stopPropagation(); clipObj = JSON.parse(JSON.stringify(o)); clipCut = true; render(); toast('ตัดรูปแล้ว — Ctrl+V วาง (Esc ยกเลิก)'); }
  }
  function onKeyPaste(e) {
    var meta = e.ctrlKey || e.metaKey;
    var k = e.key.toLowerCase();
    if (k.length === 1 && !/[a-z]/.test(k) && /^Key[A-Z]$/.test(e.code || '')) k = e.code.slice(3).toLowerCase();
    if (!(meta && k === 'v') || !clipObj) return;
    var t = e.target;
    if (t && /INPUT|TEXTAREA|SELECT/.test(t.tagName)) return;
    // วางรูปภายใน (สำเนา/ย้าย)
    e.preventDefault(); e.stopPropagation();
    var src = byId(clipObj.id);
    pu();
    if (clipCut && src) { src.x += 26; src.y += 26; src.z = maxZ() + 1; selId = src.id; clipCut = false; clipObj = null; }
    else {
      var copy = JSON.parse(JSON.stringify(clipObj));
      copy.id = uid(); copy.x += 26; copy.y += 26; copy.z = maxZ() + 1;
      imgs().push(copy); selId = copy.id;
    }
    persist(); render();
  }
  // วางรูปจากภายนอก (Google / โปรแกรมอื่น)
  function onPaste(e) {
    var t = e.target;
    if (t && /INPUT|TEXTAREA|SELECT/.test(t.tagName)) return;
    var items = (e.clipboardData && e.clipboardData.items) || [];
    for (var i = 0; i < items.length; i++) {
      if (/^image\//.test(items[i].type)) {
        e.preventDefault();
        addFromFile(items[i].getAsFile());
        return;
      }
    }
  }

  // ---------- init ----------
  function init() {
    gw = document.getElementById('gridwrap');
    if (!gw || !window.SG) return;
    layer = document.createElement('div');
    layer.id = 'imgLayer';
    gw.appendChild(layer);
    layer.addEventListener('mousedown', onDown, true);
    gw.addEventListener('mousedown', function (e) { if (!e.target.closest('.imgw') && selId != null) { selId = null; cropTarget = null; render(); } });
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    layer.addEventListener('contextmenu', function (e) {
      var w = e.target.closest ? e.target.closest('.imgw') : null;
      if (!w) return;
      e.preventDefault(); e.stopPropagation();
      var o = byId(w.dataset.img); if (!o) return;
      selId = o.id; render();
      openMenu(o, e.clientX, e.clientY);
    }, true);
    document.addEventListener('mousedown', function (e) { if (ctxEl && !e.target.closest('.sg-ctx')) closeMenu(); });
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('keydown', onKeyPaste, true);
    document.addEventListener('paste', onPaste);
    // ลากไฟล์รูปจากเครื่องมาปล่อยบนตาราง
    gw.addEventListener('dragover', function (e) { if (e.dataTransfer && [].some.call(e.dataTransfer.items || [], function (i) { return /^image\//.test(i.type); })) e.preventDefault(); });
    gw.addEventListener('drop', function (e) {
      var fs = e.dataTransfer && e.dataTransfer.files;
      if (!fs || !fs.length || !/^image\//.test(fs[0].type)) return;
      e.preventDefault(); e.stopPropagation();
      var r = gw.getBoundingClientRect();
      addFromFile(fs[0], gw.scrollLeft + e.clientX - r.left - 60, gw.scrollTop + e.clientY - r.top - 40);
    });
    // สลับหมวด → วาดรูปของหมวดใหม่
    var oReload = SG.reloadSheet;
    SG.reloadSheet = function () { var r = oReload.apply(SG, arguments); selId = null; cropTarget = null; render(); return r; };
    // undo/redo ของตาราง → วาดรูปใหม่ด้วย (รวม undo การครอป/ย้าย/หมุนรูป)
    var oUndo = SG.undo, oRedo = SG.redo;
    SG.undo = function () { var r = oUndo.apply(SG, arguments); render(); return r; };
    SG.redo = function () { var r = oRedo.apply(SG, arguments); render(); return r; };
    render();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.ImgLayer = { render: render, addImage: addImage, pickFile: pickFile, googleSearch: googleSearch, _state: function () { return { selId: selId, cropTarget: cropTarget, hasClip: !!clipObj }; } };
})();
