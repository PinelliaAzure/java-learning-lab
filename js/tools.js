/* 书签 / 笔记 / 进度数据：三个独立弹窗，由悬浮菜单分别打开 */
(function () {
  'use strict';
  var COURSE = window.JAVA_COURSE || [];
  var FLAT = [];
  COURSE.forEach(function (m) { m.lessons.forEach(function (l) { FLAT.push({ m: m, l: l }); }); });
  var KEY = 'java-lab-tools-v1';
  var T = load();

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) { var o = JSON.parse(raw); return { bookmarks: o.bookmarks || [], notes: o.notes || {} }; }
    } catch (e) {}
    return { bookmarks: [], notes: {} };
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(T)); } catch (e) {} }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function currentId() { var m = (location.hash || '').match(/^#\/(.+)$/); return m ? m[1] : null; }
  function byId(id) { return FLAT.filter(function (x) { return x.l.id === id; })[0]; }

  /* ---------- 入口：书签 / 笔记 / 数据 各自是「更多」菜单里的一项 ---------- */
  (window.LAB_MENU = window.LAB_MENU || []).push(
    { group: 'mine', order: 10, label: '书签', hint: '收藏的课程，一键跳回', icon: 'mark', run: function () { open('marks'); } },
    { group: 'mine', order: 20, label: '笔记', hint: '每课一条笔记，保存在本机', icon: 'note', run: function () { open('notes'); } },
    { group: 'mine', order: 30, label: '进度数据', hint: '导出 / 导入 / 重置进度', icon: 'data', run: function () { open('data'); } }
  );

  /* ---------- 弹窗 ---------- */
  var TITLES = { marks: '书签', notes: '笔记', data: '进度数据' };
  var modal = document.createElement('div');
  modal.className = 'exam-modal tools-modal';
  modal.hidden = true;
  modal.innerHTML = '<div class="exam-card" role="dialog" aria-modal="true" aria-label="书签">' +
    '<button class="exam-close" type="button" aria-label="关闭">×</button>' +
    '<div class="tools-body"></div></div>';
  document.body.appendChild(modal);
  var body = modal.querySelector('.tools-body');
  var tab = 'marks';

  function open(kind) {
    if (kind) tab = kind;
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    var card = modal.querySelector('.exam-card');
    if (card) card.setAttribute('aria-label', TITLES[tab] || '学习记录');
    render();
    var c = modal.querySelector('.exam-close'); if (c) c.focus();
  }
  function close() { modal.hidden = true; document.body.style.overflow = ''; }
  window.openTools = open;
  modal.querySelector('.exam-close').addEventListener('click', close);
  modal.addEventListener('click', function (e) { if (e.target === modal) close(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !modal.hidden) close(); });

  function render() {
    if (tab === 'marks') renderMarks();
    else if (tab === 'notes') renderNotes();
    else renderData();
  }

  /* ---------- 搜索已移到顶栏（js/search.js） ---------- */

  /* ---------- 书签 ---------- */
  function renderMarks() {
    var list = T.bookmarks.map(byId).filter(Boolean);
    body.innerHTML = '<h2 class="exam-title">书签 <small>' + list.length + '</small></h2>' +
      '<p class="exam-sub">在课程页点「☆ 收藏」即可加入；这里可以快速跳转或移除。</p>' +
      (list.length ? '<div class="tools-results">' + list.map(function (x) {
        return '<div class="tool-mark"><button type="button" class="tool-result" data-go="' + x.l.id + '">' +
          '<b>' + esc(x.l.title) + '</b><small>' + esc(x.m.no + ' ' + x.m.title) + '</small></button>' +
          '<button type="button" class="btn danger" data-unmark="' + x.l.id + '">移除</button></div>';
      }).join('') + '</div>' : '<p class="tools-hint">还没有书签。打开任意课程，点标题旁的「☆ 收藏」。</p>');
    body.querySelectorAll('[data-go]').forEach(function (b) {
      b.addEventListener('click', function () { location.hash = '#/' + b.getAttribute('data-go'); close(); });
    });
    body.querySelectorAll('[data-unmark]').forEach(function (b) {
      b.addEventListener('click', function () {
        T.bookmarks = T.bookmarks.filter(function (id) { return id !== b.getAttribute('data-unmark'); });
        save(); render(); decorate();
      });
    });
  }

  /* ---------- 笔记 ---------- */
  function renderNotes() {
    var cid = currentId();
    var sel = cid && byId(cid) ? cid : (FLAT[0] && FLAT[0].l.id);
    var options = FLAT.map(function (x) {
      return '<option value="' + x.l.id + '"' + (x.l.id === sel ? ' selected' : '') + '>' + esc(x.m.no + ' ' + x.m.title + ' / ' + x.l.title) + '</option>';
    }).join('');
    body.innerHTML = '<h2 class="exam-title">笔记</h2>' +
      '<p class="exam-sub">选择课程写笔记，自动保存在本机；清空内容即删除。</p>' +
      '<select class="tools-select" id="note-lesson">' + options + '</select>' +
      '<textarea class="tools-note" id="note-text" placeholder="写下你的理解、易错点或待复习的问题…"></textarea>' +
      '<div class="tools-note-foot"><span id="note-status">已保存</span><span>' + Object.keys(T.notes).filter(function (k) { return T.notes[k]; }).length + ' 篇笔记</span>' +
      '<button type="button" class="btn" id="note-export">导出 Markdown</button></div>';
    var selEl = document.getElementById('note-lesson');
    var ta = document.getElementById('note-text');
    var status = document.getElementById('note-status');
    function show() { ta.value = T.notes[selEl.value] || ''; }
    show();
    selEl.addEventListener('change', show);
    document.getElementById('note-export').addEventListener('click', function () {
      if (!ta.value.trim()) { status.textContent = '还没有内容'; return; }
      var x = byId(selEl.value);
      var title = x ? x.l.title : selEl.value;
      var blob = new Blob(['# ' + title + '\n\n' + ta.value], { type: 'text/markdown' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'note-' + selEl.value + '.md';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1500);
    });
    var timer = 0;
    ta.addEventListener('input', function () {
      var id = selEl.value;
      if (ta.value.trim()) T.notes[id] = ta.value; else delete T.notes[id];
      save();
      status.textContent = '已保存';
      clearTimeout(timer);
      timer = setTimeout(function () { status.textContent = '已保存'; }, 800);
    });
  }

  /* ---------- 数据 ---------- */
  function applyImport(d) {
    if (!d || d.app !== 'java-learning-lab') throw new Error('不是本站导出的进度文件');
    if (!confirm('导入会覆盖当前进度，确定继续？')) return;
    if (d.progress) localStorage.setItem('java-lab-progress-v1', JSON.stringify(d.progress)); else localStorage.removeItem('java-lab-progress-v1');
    if (d.exams) localStorage.setItem('java-lab-exams-v1', JSON.stringify(d.exams)); else localStorage.removeItem('java-lab-exams-v1');
    if (d.codeLab) localStorage.setItem('java-lab-code-v1', JSON.stringify(d.codeLab)); else localStorage.removeItem('java-lab-code-v1');
    if (d.tools) localStorage.setItem(KEY, JSON.stringify(d.tools));
    alert('导入成功，页面将刷新。');
    location.reload();
  }

  function renderData() {
    var p = localStorage.getItem('java-lab-progress-v1') || 'null';
    var e = localStorage.getItem('java-lab-exams-v1') || 'null';
    var c = localStorage.getItem('java-lab-code-v1') || 'null';
    body.innerHTML = '<h2 class="exam-title">进度数据</h2>' +
      '<p class="exam-sub">导出会把学习进度、模块成绩、错题本、代码练习、书签和笔记打包成一个 JSON 文件；换电脑或浏览器时可导入恢复。</p>' +
      '<div class="tools-data-grid">' +
      '<div><b>学习进度</b><small>' + (p === 'null' ? '暂无' : Math.round(p.length / 1024) + ' KB') + '</small></div>' +
      '<div><b>考试记录</b><small>' + (e === 'null' ? '暂无' : Math.round(e.length / 1024) + ' KB') + '</small></div>' +
      '<div><b>代码练习</b><small>' + (c === 'null' ? '暂无' : Math.round(c.length / 1024) + ' KB') + '</small></div>' +
      '<div><b>书签 / 笔记</b><small>' + T.bookmarks.length + ' 个书签 · ' + Object.keys(T.notes).length + ' 篇笔记</small></div>' +
      '</div>' +
      '<div class="exam-actions-row" style="justify-content:flex-start">' +
      '<button type="button" class="btn primary" id="tools-export">导出 JSON</button>' +
      '<label class="btn" for="tools-import">导入文件</label>' +
      '<input id="tools-import" type="file" accept=".json,application/json" hidden>' +
      '</div>' +
      '<p class="tools-hint">也可以把导出的 JSON 粘贴到下面，直接导入（方便在没有文件选择器的环境使用）。</p>' +
      '<textarea class="tools-note" id="import-text" placeholder="粘贴导出的 JSON 内容…" style="min-height:110px"></textarea>' +
      '<div class="exam-actions-row" style="justify-content:flex-start"><button type="button" class="btn" id="import-text-btn">从文本导入</button></div>' +
      '<div class="tools-reset">' +
      '<div><b>重置学习进度</b><small>清空所有勾选与考试成绩；书签、笔记、代码练习记录会保留。</small></div>' +
      '<button type="button" class="btn danger" id="tools-reset">重置</button>' +
      '</div>';

    document.getElementById('tools-export').addEventListener('click', function () {
      var data = {
        app: 'java-learning-lab', version: 1, exportedAt: new Date().toISOString(),
        progress: safeParse(localStorage.getItem('java-lab-progress-v1')),
        exams: safeParse(localStorage.getItem('java-lab-exams-v1')),
        codeLab: safeParse(localStorage.getItem('java-lab-code-v1')),
        tools: T
      };
      var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'java-learning-progress-' + new Date().toISOString().slice(0, 10) + '.json';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
    });
    document.getElementById('tools-import').addEventListener('change', function (ev) {
      var file = ev.target.files && ev.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        try { applyImport(JSON.parse(reader.result)); } catch (err) { alert('导入失败：' + err.message); }
      };
      reader.readAsText(file);
    });
    document.getElementById('import-text-btn').addEventListener('click', function () {
      try { applyImport(JSON.parse(document.getElementById('import-text').value)); }
      catch (err) { alert('导入失败：' + err.message); }
    });
    document.getElementById('tools-reset').addEventListener('click', function () {
      if (typeof window.resetLabProgress === 'function') { close(); window.resetLabProgress(); }
      else { alert('页面还在加载，稍后再试。'); }
    });
  }
  function safeParse(s) { try { return s ? JSON.parse(s) : null; } catch (e) { return null; } }

  /* ---------- 课程页收藏按钮 ---------- */
  function decorate() {
    var title = document.querySelector('.lesson-title');
    if (!title) return;
    var id = currentId();
    if (!id) return;
    var metaRow = document.querySelector('.lesson-meta');
    var holder = metaRow || title.parentNode;
    var old = holder.querySelector('.bm-btn');
    var on = T.bookmarks.indexOf(id) >= 0;
    if (old) {
      var label = on ? '★ 已收藏' : '☆ 收藏';
      if (old.textContent !== label) old.textContent = label;
      old.classList.toggle('on', on);
      return;
    }
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'bm-btn' + (on ? ' on' : '');
    b.textContent = on ? '★ 已收藏' : '☆ 收藏';
    b.addEventListener('click', function () {
      if (T.bookmarks.indexOf(id) >= 0) T.bookmarks = T.bookmarks.filter(function (x) { return x !== id; });
      else T.bookmarks.push(id);
      save(); decorate();
    });
    holder.appendChild(b);
  }

  new MutationObserver(function () { decorate(); }).observe(document.getElementById('main') || document.body, { childList: true, subtree: true });
  decorate();
})();
