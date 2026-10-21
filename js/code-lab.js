/* 代码练习：输出预测 / 找错 / 填空 */
(function () {
  'use strict';
  var LIST = window.CODE_EXERCISES || [];
  var KEY = 'java-lab-code-v1';
  var ST = load();
  var filter = 'all';

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) { var o = JSON.parse(raw); return { done: o.done || {} }; }
    } catch (e) {}
    return { done: {} };
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(ST)); } catch (e) {} }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function doneCount() { return LIST.filter(function (x) { return ST.done[x.id]; }).length; }
  function okCount() { return LIST.filter(function (x) { return ST.done[x.id] && ST.done[x.id].ok; }).length; }

  /* ---------- 入口：由悬浮菜单调用 ---------- */
  (window.LAB_MENU = window.LAB_MENU || []).push({
    group: 'practice', order: 40, label: '代码练习', hint: '输出预测 / 找错 / 填空', icon: 'code',
    run: function () { open(); }
  });

  var modal = document.createElement('div');
  modal.className = 'exam-modal';
  modal.hidden = true;
  modal.innerHTML = '<div class="exam-card"><button class="exam-close" type="button">×</button><div class="exam-body code-body"></div></div>';
  document.body.appendChild(modal);
  var body = modal.querySelector('.code-body');

  function open() { modal.hidden = false; document.body.style.overflow = 'hidden'; renderList(); }
  function close() { modal.hidden = true; document.body.style.overflow = ''; }
  window.openCodeLab = open;
  modal.querySelector('.exam-close').addEventListener('click', close);
  modal.addEventListener('click', function (e) { if (e.target === modal) close(); });

  var TYPE = {
    output: { name: '输出预测', cls: 'out' },
    find: { name: '找错', cls: 'find' },
    fill: { name: '填空', cls: 'fill' }
  };

  function renderList() {
    var items = LIST.filter(function (x) {
      if (filter === 'all') return true;
      if (filter === 'wrong') return ST.done[x.id] && !ST.done[x.id].ok;
      return x.type === filter;
    });
    var chips = [['all', '全部'], ['output', '输出预测'], ['find', '找错'], ['fill', '填空'], ['wrong', '错题']]
      .map(function (p) { return '<button type="button" class="code-chip' + (filter === p[0] ? ' active' : '') + '" data-filter="' + p[0] + '">' + p[1] + '</button>'; }).join('');
    var stat = ['output','find','fill'].map(function (t) {
      var arr = LIST.filter(function (x) { return x.type === t; });
      var ok = arr.filter(function (x) { return ST.done[x.id] && ST.done[x.id].ok; }).length;
      return TYPE[t].name + ' ' + ok + '/' + arr.length;
    }).join(' · ');
    body.innerHTML =
      '<h2 class="exam-title">代码练习 <small>' + okCount() + ' / ' + LIST.length + ' 正确</small></h2>' +
      '<p class="exam-sub">' + stat + '。先读代码，预测输出、找出错误或补全空白，提交后立即判分并给解析。</p>' +
      '<div class="code-filters">' + chips + '</div>' +
      '<div class="code-list">' + (items.length ? items.map(function (x) {
        var d = ST.done[x.id];
        return '<button type="button" class="code-card" data-id="' + x.id + '">' +
          '<span class="code-type ' + TYPE[x.type].cls + '">' + TYPE[x.type].name + '</span>' +
          '<b>' + esc(x.title) + '</b><small>' + esc(x.module) + '</small>' +
          '<i class="' + (d ? (d.ok ? 'ok' : 'bad') : '') + '">' + (d ? (d.ok ? '✓' : '✗') : '') + '</i></button>';
      }).join('') : '<p class="tools-hint">这里还没有题目。</p>') + '</div>';
    body.querySelectorAll('[data-filter]').forEach(function (b) {
      b.addEventListener('click', function () { filter = b.getAttribute('data-filter'); renderList(); });
    });
    body.querySelectorAll('[data-id]').forEach(function (b) {
      b.addEventListener('click', function () { renderExercise(b.getAttribute('data-id')); });
    });
  }

  function renderExercise(id, feedback) {
    var x = LIST.filter(function (e) { return e.id === id; })[0];
    if (!x) return;
    var d = ST.done[id];
    var options = (x.options || []).map(function (o, i) {
      return '<button type="button" class="exam-opt" data-opt="' + i + '"><span>' + String.fromCharCode(65 + i) + '</span>' + o + '</button>';
    }).join('');
    body.innerHTML =
      '<div class="exam-head"><div><b>' + esc(x.title) + '</b><small>' + esc(x.module) + ' · ' + TYPE[x.type].name + '</small></div>' +
      '<button type="button" class="btn" id="code-back">返回列表</button></div>' +
      '<div class="exam-q">' + esc(x.prompt) + '</div>' +
      '<pre class="code-exercise"><code>' + esc(x.code) + '</code></pre>' +
      (x.type === 'fill'
        ? '<input class="code-input" id="code-input" type="text" placeholder="输入缺失的代码" autocomplete="off">'
        : '<div class="exam-opts">' + options + '</div>') +
      '<div class="code-actions"><button type="button" class="btn primary" id="code-submit">提交</button></div>' +
      '<div class="code-feedback" id="code-feedback"></div>';
    document.getElementById('code-back').addEventListener('click', renderList);
    var chosen = null;
    body.querySelectorAll('[data-opt]').forEach(function (b) {
      b.addEventListener('click', function () {
        body.querySelectorAll('[data-opt]').forEach(function (o) { o.classList.remove('selected'); });
        b.classList.add('selected'); chosen = Number(b.getAttribute('data-opt'));
      });
    });
    document.getElementById('code-submit').addEventListener('click', function () {
      var ok, answer;
      if (x.type === 'fill') {
        var v = (document.getElementById('code-input').value || '').trim();
        var accept = [x.answer].concat(x.accept || []);
        ok = accept.some(function (a) { return norm(v) === norm(a); });
      } else {
        if (chosen == null) { showFeedback('先选择一个答案。', ''); return; }
        ok = chosen === x.answer;
      }
      ST.done[id] = { ok: ok, at: Date.now() };
      save();
      var fb = document.getElementById('code-feedback');
      if (fb) fb.innerHTML = '';
      renderExercise(id, true);
      var f = document.getElementById('code-feedback');
      if (f) {
        f.className = 'code-feedback ' + (ok ? 'ok' : 'bad');
        f.innerHTML = '<b>' + (ok ? '✓ 正确' : '✗ 再想想') + '</b><p>' + x.explain + '</p>' +
          (x.type === 'fill' ? '<p class="muted">参考答案：' + esc(x.answer) + '</p>' : '') +
          '<p class="muted">正确选项：' + (x.type === 'fill' ? esc(x.answer) : String.fromCharCode(65 + x.answer) + '. ' + x.options[x.answer]) + '</p>';
      }
      var next = LIST[LIST.indexOf(x) + 1];
      var actions = document.querySelector('.code-actions');
      if (actions) {
        actions.innerHTML = '<button type="button" class="btn" id="code-back2">返回列表</button>' +
          '<button type="button" class="btn" id="code-redo">重做本题</button>' +
          (next ? '<button type="button" class="btn primary" id="code-next">下一题</button>' : '<span class="muted">已经是最后一题</span>');
        document.getElementById('code-back2').addEventListener('click', renderList);
        document.getElementById('code-redo').addEventListener('click', function () { renderExercise(id); });
        var n = document.getElementById('code-next');
        if (n) n.addEventListener('click', function () { renderExercise(next.id); });
      }
    });
  }

  function norm(s) {
    return String(s).replace(/\s+/g, '').replace(/^["']|["']$/g, '').replace(/;$/, '').toLowerCase();
  }
  function showFeedback(text, cls) {
    var f = document.getElementById('code-feedback');
    if (f) { f.className = 'code-feedback ' + cls; f.innerHTML = '<b>' + text + '</b>'; }
  }

  // 键盘：Esc 关闭
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !modal.hidden) close();
  });
})();
