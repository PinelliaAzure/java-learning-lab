/* 悬浮功能菜单：把练习、资料、拓展入口收进一个按钮，按组排序显示 */
(function () {
  'use strict';
  var ICONS = {
    mark: '<path d="m12 4 2.4 5 5.6.8-4 4 1 5.6-5-2.6-5 2.6 1-5.6-4-4 5.6-.8Z"/>',
    note: '<path d="M4 20h4L18 10l-4-4L4 16v4Z"/><path d="m14 6 4 4"/>',
    data: '<path d="M5 19V9M12 19V5M19 19v-7"/>',
    quiz: '<path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"/>',
    final: '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5"/><path d="M10 13h6M10 17h4"/>',
    wrong: '<path d="M5 5h14v14H5z"/><path d="m9 9 6 6M15 9l-6 6"/>',
    code: '<path d="m9 8-4 4 4 4M15 8l4 4-4 4"/>',
    lab: '<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3"/>'
  };
  function icon(key) {
    var p = ICONS[key];
    return p ? '<svg viewBox="0 0 24 24" aria-hidden="true">' + p + '</svg>' : '';
  }

  /* 分组顺序即菜单里的先后：练题 → 自己的记录 → 拓展内容 */
  var GROUPS = [
    { id: 'practice', label: '练习与测验' },
    { id: 'mine', label: '我的资料' },
    { id: 'extra', label: '拓展内容' }
  ];
  function groupIndex(id) {
    for (var i = 0; i < GROUPS.length; i++) if (GROUPS[i].id === id) return i;
    return GROUPS.length;
  }

  var ITEMS = (window.LAB_MENU || []).slice();
  ITEMS.push({ group: 'extra', order: 10, label: '排序算法实验室', hint: '12 种排序逐步动画', icon: 'lab', href: 'sorting.html' });
  ITEMS = ITEMS.filter(function (it) { return it && it.label; });
  ITEMS.sort(function (a, b) {
    var ga = groupIndex(a.group), gb = groupIndex(b.group);
    if (ga !== gb) return ga - gb;
    return (a.order || 0) - (b.order || 0);
  });
  if (!ITEMS.length) return;

  var listHtml = '';
  ITEMS.forEach(function (it, i) {
    var gi = groupIndex(it.group);
    if (i === 0 || groupIndex(ITEMS[i - 1].group) !== gi) {
      var g = GROUPS[gi];
      listHtml += '<div class="fab-group">' + (g ? g.label : '其他') + '</div>';
    }
    var tag = it.href ? 'a' : 'button';
    var attr = it.href ? ' href="' + it.href + '"' : ' type="button"';
    listHtml += '<' + tag + ' class="fab-item"' + attr + ' data-idx="' + i + '">' +
      '<i>' + icon(it.icon) + '</i>' +
      '<span class="fab-item-text"><b>' + it.label + '</b><small>' + it.hint + '</small></span>' +
      (it.href ? '<em>↗</em>' : '') +
      '</' + tag + '>';
  });

  var fab = document.createElement('div');
  fab.className = 'fab';
  fab.innerHTML =
    '<div class="fab-panel" id="fab-panel" hidden>' +
      '<div class="fab-panel-head"><b>更多功能</b><button class="fab-close" type="button" aria-label="关闭">×</button></div>' +
      '<div class="fab-list">' + listHtml + '</div>' +
    '</div>' +
    '<button class="fab-btn" id="fab-btn" type="button" aria-expanded="false" aria-controls="fab-panel" aria-label="更多功能">' +
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg><span>更多</span>' +
    '</button>';
  document.body.appendChild(fab);

  var panel = fab.querySelector('.fab-panel');
  var btn = fab.querySelector('.fab-btn');

  function setOpen(v) {
    panel.hidden = !v;
    btn.setAttribute('aria-expanded', v ? 'true' : 'false');
    fab.classList.toggle('open', v);
  }

  btn.addEventListener('click', function () { setOpen(panel.hidden); });
  fab.querySelector('.fab-close').addEventListener('click', function () { setOpen(false); btn.focus(); });

  fab.querySelector('.fab-list').addEventListener('click', function (e) {
    var el = e.target.closest('.fab-item');
    if (!el) return;
    var it = ITEMS[Number(el.getAttribute('data-idx'))];
    setOpen(false);
    if (!it || it.href) return;
    if (typeof it.run === 'function') it.run();
  });

  document.addEventListener('click', function (e) {
    if (!fab.contains(e.target)) setOpen(false);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !panel.hidden) { setOpen(false); btn.focus(); }
  });
})();
