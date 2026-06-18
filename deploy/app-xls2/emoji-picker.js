/* ตัวเลือกอีโมจิ/ไอคอน (openEmojiPicker + custom icons) — แยกจาก index.html
   ใช้ global: $, promptDialog, makeDraggable, PopupStack · เปิด global: openEmojiPicker */
(function () {
  function $(id) { return document.getElementById(id); }
  // ---------- ตัวเลือกอีโมจิแยกหมวด (คลิกไอคอนสถานะ) ----------
  var EMOJI_CATS = [
    { name: 'สถานะ / จุดสี', list: ['🟢','🔴','🟠','🟡','🔵','🟣','⚫','⚪','🟤','🟩','🟥','🟧','🟨','🟦','🟪','⬛','⬜','🔶','🔷','🔸','🔹','🔺','🔻','▲','▼','◆','●','○','■','□','★','☆','✦','✱','✳️','❇️','⭐','🌟'] },
    { name: 'เครื่องหมาย / ถูก-ผิด', list: ['✅','❌','✔️','✖️','☑️','✗','✓','⛔','🚫','❎','➕','➖','➗','✚','➰','〰️','⁉️','‼️','❓','❔','❗','❕','⚠️','🔆','🔅','♻️','🆕','🆖','🆗','🆒','🆙','🔱','⚜️','🈵','🈳','🅿️'] },
    { name: 'ขนส่ง / คลัง / โรงงาน', list: ['🚚','🚛','🚐','🛻','🚗','🚙','🏎️','🚜','📦','📫','📮','🏬','🏭','🏗️','🏠','🏢','🏪','🛒','🛍️','🧰','🧱','📥','📤','📨','🗃️','🗄️','🗂️','📋','📑','⚓','⛴️','🚢','✈️','🛩️','🚀','🪜','🔩','⛓️'] },
    { name: 'ราคา / เงิน / โปรโมชั่น', list: ['💰','💵','💴','💶','💷','💸','🪙','💳','🧾','🏷️','🔖','🎁','🎀','🎯','🎊','🎉','📉','📈','📊','💹','🤑','💲','💱','🏧','⚖️','🛎️','🔔','💎','👑','🥇'] },
    { name: 'ดาว / รางวัล / เด่น', list: ['⭐','🌟','✨','💫','🏆','🥇','🥈','🥉','👑','💎','🔱','🎖️','🏅','🎗️','🌠','🔆','❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💯','🆗','🔥','⚡','🌈'] },
    { name: 'แจ้งเตือน / ไฟ / สภาพ', list: ['🔥','💥','⚡','❄️','💧','🩸','💦','🌡️','☀️','🌙','⛅','🌧️','⛈️','🌪️','🚨','🔊','🔇','📢','📣','🔔','🔕','⏰','⏳','⌛','🕐','📅','📆','🗓️','⏱️','⏲️'] },
    { name: 'ลูกศร / ทิศทาง', list: ['⬆️','⬇️','⬅️','➡️','↗️','↘️','↙️','↖️','↕️','↔️','🔼','🔽','⏫','⏬','▶️','◀️','⏩','⏪','🔄','🔃','🔁','🔂','↩️','↪️','⤴️','⤵️','🔀','➰','〽️','✳️'] },
    { name: 'มือ / คน / เครื่องมือ', list: ['👍','👎','👌','👏','🙌','✋','🤚','🖐️','🤝','👀','👁️','💪','🧑‍🔧','👷','🧑‍💼','🛠️','🔧','🔨','⚙️','🔩','🪛','⛏️','🔗','🔒','🔓','🔑','🗝️','📌','📍','📎','🖇️','✏️','🖊️','🖍️','📝'] },
    { name: 'สินค้า / ยาง / รถ', list: ['🛞','🚗','🚙','🚐','🛻','🚛','🏍️','🛵','🚲','🦽','🛺','🚓','🚑','🚒','🏎️','🚘','🚖','🧨','🛢️','⛽','🔋','🔌','🧯','🪫','🔦','💡','🔭','🔬','🧲','⚗️'] },
    { name: 'ทั่วไป / สัญลักษณ์', list: ['📁','📂','🗒️','📊','📈','📉','🗂️','🏁','🚩','🎌','🏳️','🏴','🔰','〽️','©️','®️','™️','🔟','#️⃣','*️⃣','0️⃣','1️⃣','2️⃣','3️⃣','🅰️','🅱️','🆎','🅾️','ℹ️','🔣'] }
  ];
  var CUSTOM_ICON_KEY = 'dpl_custom_icons';
  function customIcons() { try { var v = JSON.parse(localStorage.getItem(CUSTOM_ICON_KEY)); return Array.isArray(v) ? v : []; } catch (e) { return []; } }
  function saveCustomIcons(a) { localStorage.setItem(CUSTOM_ICON_KEY, JSON.stringify(a.slice(0, 60))); }
  function addCustomIcon(v) { v = (v || '').trim().slice(0, 8); if (!v) return; var a = customIcons().filter(function (x) { return x !== v; }); a.unshift(v); saveCustomIcons(a); }
  function removeCustomIcon(v) { saveCustomIcons(customIcons().filter(function (x) { return x !== v; })); }
  var emojiPickEl = null;
  function openEmojiPicker(anchor, current, onPick) {
    if (!emojiPickEl) { emojiPickEl = document.createElement('div'); emojiPickEl.className = 'emoji-pick'; document.body.appendChild(emojiPickEl); }
    function catHtml(name, items, isCustom) {
      var seen = {}; items = items.filter(function (e) { if (!e || seen[e]) return false; seen[e] = 1; return true; });
      var tiles = items.map(function (e) {
        return '<button type="button" class="emoji-it' + (e === current ? ' on' : '') + (isCustom ? ' emoji-custom' : '') + '" data-e="' + e.replace(/"/g, '&quot;') + '" title="' + (isCustom ? 'คลิกเลือก · คลิกขวาลบ' : 'คลิกเลือก') + '">' + e + '\uFE0E</button>';
      }).join('');
      if (isCustom) tiles += '<button type="button" class="emoji-it emoji-add" data-add="1" title="เพิ่มไอคอนเอง (วางอีโมจิ/สัญลักษณ์จากที่ไหนก็ได้)">＋</button>';
      return '<div class="emoji-cat">' + name + '</div><div class="emoji-grid">' + tiles + '</div>';
    }
    function render(filter) {
      var f = (filter || '').trim();
      var html = '';
      var cust = customIcons();
      if (!f && cust.length || !f) html += catHtml('⭐ ของฉัน / เพิ่มเอง', cust, true);
      EMOJI_CATS.forEach(function (cat) {
        var items = cat.list.filter(function (e) { return e && e.length <= 5; });
        if (f) items = items.filter(function (e) { return e.indexOf(f) >= 0; });
        if (items.length) html += catHtml(cat.name, items, false);
      });
      emojiPickEl.querySelector('.emoji-body').innerHTML = html || '<div class="emoji-empty">ไม่พบ — กด Enter เพื่อใช้ตัวที่พิมพ์/วาง</div>';
    }
    emojiPickEl.innerHTML = '<div class="emoji-head">เลือกไอคอน <span class="emoji-head-hint">(ลากแถบนี้เพื่อย้าย)</span><span class="emoji-x">✕</span></div>' +
      '<input class="emoji-q" placeholder="🔍 พิมพ์/วางอีโมจิ แล้ว Enter เพื่อใช้ทันที">' +
      '<div class="emoji-body"></div>' +
      '<div class="emoji-foot"><button type="button" class="btn emoji-addbtn">＋ เพิ่มจากภายนอก</button><button type="button" class="btn emoji-clear">ล้างไอคอน</button></div>';
    render('');
    var q = emojiPickEl.querySelector('.emoji-q');
    q.oninput = function () { render(q.value); };
    q.onkeydown = function (e) { if (e.key === 'Enter') { e.preventDefault(); var v = q.value.trim(); if (v) { addCustomIcon(v.slice(0, 8)); onPick(v.slice(0, 8)); close(); } } };
    function promptAdd() {
      promptDialog('เพิ่มไอคอนเอง', 'วาง/พิมพ์อีโมจิหรือสัญลักษณ์ใดก็ได้ (คัดลอกจากเว็บ/แอปอื่น)', '', function (v) {
        if (v == null) return; v = v.trim(); if (!v) return;
        addCustomIcon(v.slice(0, 8)); render(q.value);
      });
    }
    emojiPickEl.querySelector('.emoji-body').onclick = function (e) {
      var add = e.target.closest('[data-add]'); if (add) { promptAdd(); return; }
      var b = e.target.closest('.emoji-it'); if (!b) return;
      if (b.dataset.e && b.classList.contains('emoji-custom')) addCustomIcon(b.dataset.e);
      onPick(b.dataset.e); close();
    };
    emojiPickEl.querySelector('.emoji-body').oncontextmenu = function (e) {
      var b = e.target.closest('.emoji-custom'); if (!b) return;
      e.preventDefault(); removeCustomIcon(b.dataset.e); render(q.value);
    };
    emojiPickEl.querySelector('.emoji-addbtn').onclick = promptAdd;
    emojiPickEl.querySelector('.emoji-clear').onclick = function () { onPick(''); close(); };
    emojiPickEl.querySelector('.emoji-x').onclick = close;
    // ตำแหน่ง: ใต้ปุ่มไอคอน ไม่หลุดจอ
    var r = anchor.getBoundingClientRect();
    emojiPickEl.style.display = 'flex';
    var w = emojiPickEl.offsetWidth, h = emojiPickEl.offsetHeight;
    var left = Math.min(r.left, window.innerWidth - w - 10);
    var top = (r.bottom + h + 8 < window.innerHeight) ? r.bottom + 6 : Math.max(8, window.innerHeight - h - 10);
    emojiPickEl.style.left = Math.max(8, left) + 'px';
    emojiPickEl.style.top = Math.max(8, top) + 'px';
    emojiPickEl.style.right = 'auto'; emojiPickEl.style.transform = 'none';
    makeDraggable(emojiPickEl, emojiPickEl.querySelector('.emoji-head'));
    PopupStack.push(emojiPickEl, function () { close(); });
    setTimeout(function () { q.focus(); }, 30);
    function close() { emojiPickEl.style.display = 'none'; PopupStack.remove(emojiPickEl); document.removeEventListener('mousedown', outside, true); }
    function outside(ev) { if (!ev.target.closest('.emoji-pick') && !ev.target.closest('.stdef-icon')) close(); }
    setTimeout(function () { document.addEventListener('mousedown', outside, true); }, 0);
  }

  window.openEmojiPicker = openEmojiPicker;
})();
