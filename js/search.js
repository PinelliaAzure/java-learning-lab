/* 顶栏搜索：课程名 / 模块 / 要点 / 教材正文 / 示例代码 */
(function () {
  'use strict';
  var FLAT = [];
  (window.JAVA_COURSE || []).forEach(function (m) {
    m.lessons.forEach(function (l) { FLAT.push({ m: m, l: l }); });
  });
  var MAX = 8;
  var PER_LESSON = 2;   /* 同一课最多占几条，剩下的名额让给其它课 */

  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function strip(s) { var d = document.createElement('div'); d.innerHTML = s; return d.textContent || ''; }
  function norm(s) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); }
  function hl(text, q) {
    var e = esc(text);
    if (!q) return e;
    var r = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    try { return e.replace(new RegExp('(' + r + ')', 'ig'), '<mark>$1</mark>'); } catch (err) { return e; }
  }

  /* 教材 block → 可搜索文本；代码是纯文本，不走 innerHTML，避免 List<T> 被当成标签吃掉 */
  function tbBlockText(b) {
    if (b.code) return norm(b.code);
    if (b.h) return norm(strip(b.h));
    if (b.p) return norm(strip(b.p));
    if (b.note) return norm(strip(b.note));
    if (b.list) return norm(strip(b.list.join(' ')));
    if (b.ol) return norm(strip(b.ol.join(' ')));
    return '';
  }

  /* 索引：课程本身一条（bi = -1）+ 教材每个 block 一条；同步一次建成 */
  var INDEX = (function build() {
    var T = window.JAVA_TEXTBOOK || {};
    var out = [];
    FLAT.forEach(function (x) {
      var l = x.l;
      var mod = x.m.no + ' ' + x.m.title;
      var titleLower = String(l.title).toLowerCase();
      var body = (l.points || []).map(function (p) { return p.t + ' ' + strip(p.d); }).join(' ');
      var plain = norm((l.intro || '') + ' ' + body + ' ' + (l.code || ''));
      out.push({
        id: l.id, bi: -1, type: '要点',
        title: l.title, mod: mod, plain: plain,
        text: (l.title + ' ' + x.m.title + ' ' + plain).toLowerCase(),
        titleLower: titleLower, order: out.length
      });

      var tb = T[l.id];
      if (!tb || !tb.blocks) return;
      var section = '';
      tb.blocks.forEach(function (b, bi) {
        if (b.h) section = norm(strip(b.h));
        var t = tbBlockText(b);
        if (!t) return;
        var label = section || '正文';
        out.push({
          id: l.id, bi: bi, type: '教材 · ' + label,
          title: l.title, mod: mod, plain: t,
          text: (l.title + ' ' + x.m.title + ' ' + label + ' ' + t).toLowerCase(),
          titleLower: titleLower, order: out.length
        });
      });
    });
    return out;
  })();

  /* 摘要只截取命中位置附近，避免出现「标题相关但摘要看不出为什么命中」 */
  function snippet(it, q) {
    var i = it.plain.toLowerCase().indexOf(q);
    if (i < 0) return it.plain.slice(0, 76);
    var start = Math.max(0, i - 30);
    if (start > 0) {
      var sp = it.plain.indexOf(' ', start);
      if (sp > -1 && sp < i) start = sp + 1;
    }
    var out = it.plain.slice(start, start + 84).trim();
    return (start > 0 ? '…' : '') + out + (start + 84 < it.plain.length ? '…' : '');
  }

  var wrap = document.createElement('div');
  wrap.className = 'search-wrap';
  wrap.innerHTML =
    '<svg class="search-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m16.5 16.5 4 4"/></svg>' +
    '<input class="search-input" id="search-q" type="search" placeholder="搜索课程 / 教材 / 代码" autocomplete="off" spellcheck="false" aria-label="搜索课程">' +
    '<kbd class="search-kbd">/</kbd>' +
    '<div class="search-panel" id="search-panel" hidden></div>';
  var head = document.querySelector('.head-right');
  if (!head) return;
  head.insertBefore(wrap, head.firstChild);

  var input = wrap.querySelector('.search-input');
  var panel = wrap.querySelector('.search-panel');

  function hide() { panel.hidden = true; }

  function currentId() {
    var m = location.hash.match(/^#\/(.+)$/);
    if (!m) return null;
    try { return decodeURIComponent(m[1]); } catch (e) { return m[1]; }
  }

  /* 先落跳转意图（engine.js 消费），再改 hash；已在本课则就地滚动 */
  function go(id, bi) {
    window.__tbJump = { lessonId: id, bi: bi };
    hide();
    input.value = '';
    input.blur();
    if (currentId() === id) {
      if (window.__tbJumpApply && window.__tbJumpApply()) return;
      window.__tbJump = null;
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    location.hash = '#/' + id;
  }

  function move(step) {
    var items = Array.prototype.slice.call(panel.querySelectorAll('.search-hit'));
    if (!items.length) return;
    var i = items.findIndex(function (b) { return b.classList.contains('active'); });
    i = i < 0 ? (step > 0 ? 0 : items.length - 1) : (i + step + items.length) % items.length;
    items.forEach(function (b) { b.classList.remove('active'); });
    items[i].classList.add('active');
    items[i].scrollIntoView({ block: 'nearest' });
  }

  function rank(it, q) {
    if (it.titleLower.indexOf(q) >= 0) return 0;
    if (it.bi < 0) return 1;
    return 2;
  }

  function search(raw) {
    var q = norm(raw).toLowerCase();
    if (!q) return [];
    var hits = [];
    for (var i = 0; i < INDEX.length; i++) {
      if (INDEX[i].text.indexOf(q) >= 0) hits.push(INDEX[i]);
    }
    hits.sort(function (a, b) { return rank(a, q) - rank(b, q) || a.order - b.order; });
    /* 同一课挤满 8 条会让搜索结果只剩一课：按已排好的名次重扫，单课超额的跳过，
       空出的名额顺延给后面名次的其它课（名次口径不变，仍是最多 MAX 条） */
    var picked = [];
    var used = {};
    for (var j = 0; j < hits.length && picked.length < MAX; j++) {
      var id = hits[j].id;
      var n = used[id] || 0;
      if (n >= PER_LESSON) continue;
      used[id] = n + 1;
      picked.push(hits[j]);
    }
    return picked;
  }

  function render() {
    var raw = input.value.trim();
    if (!raw) { hide(); return; }
    var hits = search(raw);
    if (!hits.length) {
      panel.innerHTML = '<p class="search-hint">没有匹配「' + esc(raw) + '」的内容，换个关键词试试。</p>';
      panel.hidden = false;
      return;
    }
    panel.innerHTML = hits.map(function (it) {
      return '<button type="button" class="search-hit" data-go="' + esc(it.id) + '" data-bi="' + it.bi + '">' +
        '<b>' + hl(it.title, raw) + '</b>' +
        '<small>' + esc(it.mod + ' · ' + it.type) + '</small>' +
        '<span>' + hl(snippet(it, raw.toLowerCase()), raw) + '</span></button>';
    }).join('');
    panel.hidden = false;
  }

  function pick(b) {
    go(b.getAttribute('data-go'), parseInt(b.getAttribute('data-bi'), 10));
  }

  panel.addEventListener('click', function (e) {
    var b = e.target.closest('[data-go]');
    if (b) pick(b);
  });

  input.addEventListener('input', render);
  input.addEventListener('focus', function () { if (input.value.trim()) render(); });
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { hide(); input.blur(); }
    else if (e.key === 'Enter') {
      var b = panel.querySelector('.search-hit.active') || panel.querySelector('.search-hit');
      if (b) pick(b);
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!panel.hidden) move(e.key === 'ArrowDown' ? 1 : -1);
    }
  });

  wrap.addEventListener('click', function (e) {
    if (e.target !== input) { input.focus(); if (input.value.trim()) render(); }
  });
  document.addEventListener('click', function (e) { if (!wrap.contains(e.target)) hide(); });
  document.addEventListener('keydown', function (e) {
    if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
    var t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
    e.preventDefault();
    input.focus();
    input.select();
  });
  window.addEventListener('hashchange', hide);

  /* 校验钩子：索引与查询逻辑对外只读暴露，便于断言脚本核对覆盖率 */
  window.__searchDebug = { index: INDEX, search: search, setQuery: function (q) { input.value = q; render(); }, panel: function () { return panel.innerHTML; } };
})();
