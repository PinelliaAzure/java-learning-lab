/* 顶栏搜索：课程名 / 模块 / 知识点 / 代码关键词 */
(function () {
  'use strict';
  var FLAT = [];
  (window.JAVA_COURSE || []).forEach(function (m) {
    m.lessons.forEach(function (l) { FLAT.push({ m: m, l: l }); });
  });
  var MAX = 8;

  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function strip(s) { var d = document.createElement('div'); d.innerHTML = s; return d.textContent || ''; }
  function hl(text, q) {
    var e = esc(text);
    if (!q) return e;
    var r = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    try { return e.replace(new RegExp('(' + r + ')', 'ig'), '<mark>$1</mark>'); } catch (err) { return e; }
  }

  /* 索引：标题 + 模块 + 导语 + 知识点正文 + 示例代码 */
  var INDEX = FLAT.map(function (x) {
    var body = (x.l.points || []).map(function (p) { return p.t + ' ' + strip(p.d); }).join(' ');
    var plain = ((x.l.intro || '') + ' ' + body + ' ' + (x.l.code || '')).replace(/\s+/g, ' ').trim();
    return {
      x: x,
      plain: plain,
      text: (x.l.title + ' ' + x.m.title + ' ' + plain).toLowerCase()
    };
  });

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
    '<input class="search-input" id="search-q" type="search" placeholder="搜索课程 / 知识点" autocomplete="off" spellcheck="false" aria-label="搜索课程">' +
    '<kbd class="search-kbd">/</kbd>' +
    '<div class="search-panel" id="search-panel" hidden></div>';
  var head = document.querySelector('.head-right');
  if (!head) return;
  head.insertBefore(wrap, head.firstChild);

  var input = wrap.querySelector('.search-input');
  var panel = wrap.querySelector('.search-panel');

  function hide() { panel.hidden = true; }

  function go(id) {
    hide();
    input.value = '';
    input.blur();
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

  function render() {
    var raw = input.value.trim();
    if (!raw) { hide(); return; }
    var q = raw.toLowerCase();
    var hits = INDEX.filter(function (it) { return it.text.indexOf(q) >= 0; })
      .map(function (it) { return { it: it, title: it.x.l.title.toLowerCase().indexOf(q) >= 0 ? 0 : 1 }; })
      .sort(function (a, b) { return a.title - b.title; })
      .slice(0, MAX)
      .map(function (h) { return h.it; });

    if (!hits.length) {
      panel.innerHTML = '<p class="search-hint">没有匹配「' + esc(raw) + '」的课程，换个关键词试试。</p>';
      panel.hidden = false;
      return;
    }
    panel.innerHTML = hits.map(function (it) {
      var x = it.x;
      return '<button type="button" class="search-hit" data-go="' + x.l.id + '">' +
        '<b>' + hl(x.l.title, raw) + '</b>' +
        '<small>' + esc(x.m.no + ' ' + x.m.title) + '</small>' +
        '<span>' + hl(snippet(it, q), raw) + '</span></button>';
    }).join('');
    panel.hidden = false;
  }

  panel.addEventListener('click', function (e) {
    var b = e.target.closest('[data-go]');
    if (b) go(b.getAttribute('data-go'));
  });

  input.addEventListener('input', render);
  input.addEventListener('focus', function () { if (input.value.trim()) render(); });
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { hide(); input.blur(); }
    else if (e.key === 'Enter') {
      var b = panel.querySelector('.search-hit.active') || panel.querySelector('.search-hit');
      if (b) go(b.getAttribute('data-go'));
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
})();
