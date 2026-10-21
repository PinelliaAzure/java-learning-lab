/* 模块测验 / 结业考试 / 错题本 / 模块掌握度 */
(function () {
  'use strict';
  var COURSE = window.JAVA_COURSE || [];
  var EXTRA = window.EXAM_EXTRA || {};
  var LESSON_EXTRA = window.LESSON_EXTRA || {};
  var KEY = 'java-lab-exams-v1';
  var PASS_RATE = 2 / 3;
  var store = load();

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        var o = JSON.parse(raw);
        return { modules: o.modules || {}, final: o.final || null, wrong: o.wrong || [] };
      }
    } catch (e) {}
    return { modules: {}, final: null, wrong: [] };
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) {} }

  // 把补充题并入课程（只影响本页运行）
  COURSE.forEach(function (m) {
    m.lessons.forEach(function (l) {
      (LESSON_EXTRA[l.id] || []).forEach(function (q) { l.quiz.push(q); });
    });
  });

  function allQuestions() {
    var out = [];
    COURSE.forEach(function (m) {
      m.lessons.forEach(function (l) {
        l.quiz.forEach(function (q) { out.push({ q: q, module: m.id, lesson: l.id }); });
      });
      (EXTRA[m.id] || []).forEach(function (q) { out.push({ q: q, module: m.id, lesson: null }); });
    });
    return out;
  }

  function modulePool(m) {
    var out = [], seen = {};
    m.lessons.forEach(function (l) {
      l.quiz.forEach(function (q) { if (!seen[q.q]) { seen[q.q] = 1; out.push(q); } });
    });
    (EXTRA[m.id] || []).forEach(function (q) { if (!seen[q.q]) { seen[q.q] = 1; out.push(q); } });
    return out;
  }

  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function pick(arr, n) { return shuffle(arr).slice(0, n); }

  /* ---------- 入口：由悬浮菜单调用 ---------- */
  (window.LAB_MENU = window.LAB_MENU || []).push(
    { group: 'practice', order: 10, label: '模块测验', hint: '按模块抽 15 题', icon: 'quiz', run: function () { renderMenu(); } },
    { group: 'practice', order: 20, label: '结业考试', hint: '综合卷 + 交卷评分', icon: 'final', run: function () { startExam('final'); } },
    { group: 'practice', order: 30, label: '错题本', hint: '做错的题集中重做', icon: 'wrong', run: function () { renderWrong(); } }
  );

  var stats = document.querySelector('.head-stats');
  if (stats) {
    var st = document.createElement('div');
    st.innerHTML = '<b id="exam-mastered">0</b><span> 模块掌握</span>';
    stats.appendChild(st);
  }

  var modal = document.createElement('div');
  modal.className = 'exam-modal';
  modal.hidden = true;
  modal.innerHTML = '<div class="exam-card" role="dialog" aria-modal="true" aria-label="模块测验与结业考试"><button class="exam-close" type="button" aria-label="关闭">×</button><div class="exam-body"></div></div>';
  document.body.appendChild(modal);
  var body = modal.querySelector('.exam-body');

  var S = { mode: null, moduleId: null, questions: [], answers: [], index: 0, timer: null, remain: 0, title: '' };

  function open() {
    modal.hidden = false; document.body.style.overflow = 'hidden';
    var c = modal.querySelector('.exam-close'); if (c) c.focus();
  }
  function close() {
    modal.hidden = true; document.body.style.overflow = '';
    clearInterval(S.timer); S.timer = null;
  }
  modal.querySelector('.exam-close').addEventListener('click', close);
  modal.addEventListener('click', function (e) { if (e.target === modal) close(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !modal.hidden) close(); });

  function masteredCount() {
    return COURSE.filter(function (m) { return store.modules[m.id] && store.modules[m.id].passed; }).length;
  }
  function syncMastered() {
    var el = document.getElementById('exam-mastered');
    var n = String(masteredCount());
    if (el && el.textContent !== n) el.textContent = n;
  }

  function renderMenu() {
    clearInterval(S.timer);
    S.mode = 'menu';
    var rows = COURSE.map(function (m) {
      var rec = store.modules[m.id];
      var pool = modulePool(m);
      return '<div class="exam-row">' +
        '<div><b>' + m.no + ' ' + m.title + '</b><small>' + pool.length + ' 题 · 抽 15 题 · 20 分钟' +
        (rec && rec.passed ? ' · <span class="exam-pass">已掌握 ' + rec.best + '%</span>' : '') + '</small></div>' +
        '<button type="button" class="btn primary" data-start="' + m.id + '">' + (rec ? '再测一次' : '开始测验') + '</button></div>';
    }).join('');
    body.innerHTML = '<h2 class="exam-title">模块测验</h2>' +
      '<p class="exam-sub">每个模块随机抽 15 题，20 分钟，60% 通过；通过后该模块标记为「已掌握」。错题会自动进入错题本。</p>' +
      '<div class="exam-list">' + rows + '</div>' +
      '<div class="exam-foot"><button type="button" class="btn" data-exam="wrong">打开错题本（' + store.wrong.length + '）</button></div>';
    body.querySelectorAll('[data-start]').forEach(function (b) {
      b.addEventListener('click', function () { startExam(b.getAttribute('data-start')); });
    });
    open();
  }

  function startExam(moduleId, preset) {
    var questions, title, minutes;
    if (preset) {
      questions = preset; title = '错题重练'; minutes = Math.max(10, Math.ceil(questions.length * 1.2));
    } else if (moduleId === 'final') {
      var all = allQuestions().map(function (x) { return x.q; });
      questions = pick(all, Math.min(50, all.length));
      title = '结业考试'; minutes = 60;
    } else {
      var m = COURSE.filter(function (x) { return x.id === moduleId; })[0];
      if (!m) return;
      var pool = modulePool(m);
      var wrongSeeds = store.wrong.filter(function (w) { return w.module === moduleId; }).map(function (w) {
        return { q: w.q, options: w.options, answer: w.answer, explain: w.explain };
      });
      var seeds = pick(wrongSeeds, Math.min(5, wrongSeeds.length));
      var seen = {}; seeds.forEach(function (q) { seen[q.q] = 1; });
      var rest = pool.filter(function (q) { return !seen[q.q]; });
      var chosenSeeds = pick(seeds, seeds.length);
      questions = chosenSeeds.concat(pick(rest, Math.max(0, 15 - chosenSeeds.length))).slice(0, 15);
      title = '模块测验 · ' + m.no + ' ' + m.title; minutes = 20;
    }
    S = { mode: preset ? 'wrong' : (moduleId === 'final' ? 'final' : 'module'), moduleId: moduleId,
      questions: questions, answers: new Array(questions.length).fill(null), index: 0, timer: null,
      remain: minutes * 60, deadline: Date.now() + minutes * 60000, title: title };
    renderQuestion();
    open();
    S.timer = setInterval(function () {
      S.remain = Math.max(0, Math.ceil((S.deadline - Date.now()) / 1000));
      var t = document.getElementById('exam-timer');
      if (t) t.textContent = fmt(S.remain);
      if (S.remain <= 0) { clearInterval(S.timer); S.timer = null; finish(); }
    }, 1000);
  }

  function fmt(sec) {
    var m = Math.floor(sec / 60), s = sec % 60;
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  }

  function renderQuestion() {
    S.remain = Math.max(0, Math.ceil((S.deadline - Date.now()) / 1000));
    var q = S.questions[S.index];
    var opts = q.options.map(function (o, i) {
      return '<button type="button" class="exam-opt' + (S.answers[S.index] === i ? ' selected' : '') + '" data-opt="' + i + '">' +
        '<span>' + String.fromCharCode(65 + i) + '</span>' + o + '</button>';
    }).join('');
    body.innerHTML =
      '<div class="exam-head"><div><b>' + S.title + '</b><small>第 ' + (S.index + 1) + ' / ' + S.questions.length + ' 题</small></div>' +
      '<div class="exam-timer" id="exam-timer">' + fmt(S.remain) + '</div></div>' +
      '<div class="exam-q">' + q.q + '</div>' +
      '<div class="exam-opts">' + opts + '</div>' +
      '<div class="exam-nav">' +
      '<button type="button" class="btn" data-nav="prev"' + (S.index === 0 ? ' disabled' : '') + '>上一题</button>' +
      '<span class="exam-dots">' + S.questions.map(function (_, i) {
        return '<i class="' + (i === S.index ? 'cur' : S.answers[i] != null ? 'done' : '') + '"></i>';
      }).join('') + '</span>' +
      (S.index === S.questions.length - 1
        ? '<button type="button" class="btn primary" data-nav="submit">交卷</button>'
        : '<button type="button" class="btn primary" data-nav="next">下一题</button>') +
      '</div>';

    body.querySelectorAll('[data-opt]').forEach(function (b) {
      b.addEventListener('click', function () {
        S.answers[S.index] = Number(b.getAttribute('data-opt'));
        renderQuestion();
      });
    });
    var prev = body.querySelector('[data-nav=prev]');
    if (prev) prev.addEventListener('click', function () { if (S.index > 0) { S.index--; renderQuestion(); } });
    var next = body.querySelector('[data-nav=next]');
    if (next) next.addEventListener('click', function () { if (S.index < S.questions.length - 1) { S.index++; renderQuestion(); } });
    var sub = body.querySelector('[data-nav=submit]');
    if (sub) sub.addEventListener('click', function () {
      var unanswered = S.answers.filter(function (a) { return a == null; }).length;
      if (unanswered && !window.confirm('还有 ' + unanswered + ' 题未作答，确定交卷？')) return;
      finish();
    });
  }

  function finish() {
    clearInterval(S.timer); S.timer = null;
    var total = S.questions.length;
    var correct = 0, wrongs = [];
    S.questions.forEach(function (q, i) {
      var a = S.answers[i];
      var ok = Array.isArray(q.answer) ? q.answer.indexOf(a) >= 0 : a === q.answer;
      if (ok) correct++;
      else {
        wrongs.push(q);
        store.wrong.push({ q: q.q, options: q.options, answer: q.answer, explain: q.explain, module: S.moduleId, at: Date.now() });
      }
    });
    var pass = correct >= Math.ceil(total * PASS_RATE);
    if (S.mode === 'module' && S.moduleId !== 'final') {
      var rec = store.modules[S.moduleId] || { best: 0, passed: false };
      rec.best = Math.max(rec.best, Math.round(correct / total * 100));
      rec.passed = rec.passed || pass;
      rec.at = Date.now();
      store.modules[S.moduleId] = rec;
    }
    if (S.mode === 'final') {
      store.final = { best: Math.max((store.final && store.final.best) || 0, Math.round(correct / total * 100)), passed: (store.final && store.final.passed) || pass, at: Date.now() };
    }
    // 错题去重（按题干保留最新）
    var seen = {}, uniq = [];
    store.wrong.slice().reverse().forEach(function (w) { if (!seen[w.q]) { seen[w.q] = 1; uniq.push(w); } });
    store.wrong = uniq.reverse();
    save(); syncMastered(); decorate();
    renderResult(correct, total, pass, wrongs);
  }

  function renderResult(correct, total, pass, wrongs) {
    var pct = Math.round(correct / total * 100);
    body.innerHTML =
      '<div class="exam-result ' + (pass ? 'pass' : 'fail') + '">' +
      '<div class="exam-score">' + pct + '<small>分</small></div>' +
      '<h2>' + (pass ? '通过了' : '未通过') + '</h2>' +
      '<p>答对 ' + correct + ' / ' + total + ' 题' + (pass ? '，已通过线。' : '，需要至少 ' + Math.ceil(total * PASS_RATE) + ' 题。') + '</p>' +
      '<div class="exam-actions-row">' +
      '<button type="button" class="btn primary" data-again>再考一次</button>' +
      '<button type="button" class="btn" data-menu>返回列表</button>' +
      '<button type="button" class="btn" data-exam="wrong">查看错题本</button>' +
      '</div></div>' +
      (wrongs.length ? '<div class="exam-review"><h3>错题回顾</h3>' + wrongs.map(function (q) {
        var ans = Array.isArray(q.answer) ? q.answer[0] : q.answer;
        return '<div class="exam-review-item"><b>' + q.q + '</b><p>正确答案：' + q.options[ans] + '</p><p class="muted">' + q.explain + '</p></div>';
      }).join('') + '</div>' : '');
    body.querySelector('[data-again]').addEventListener('click', function () {
      if (S.mode === 'wrong') startWrongPractice(); else startExam(S.moduleId);
    });
    body.querySelector('[data-menu]').addEventListener('click', renderMenu);
    body.querySelector('[data-exam=wrong]').addEventListener('click', renderWrong);
  }

  function renderWrong() {
    clearInterval(S.timer);
    S.mode = 'wrong';
    if (!store.wrong.length) {
      body.innerHTML = '<h2 class="exam-title">错题本</h2><p class="exam-sub">还没有错题。做模块测验或结业考试，答错的题会自动收进来。</p><div class="exam-foot"><button class="btn" type="button" data-menu>返回</button></div>';
    } else {
      body.innerHTML = '<h2 class="exam-title">错题本 <small>' + store.wrong.length + ' 题</small></h2>' +
        '<p class="exam-sub">可以只重练错题；移除某题后它不再出现在这里。</p>' +
        '<div class="exam-list">' + store.wrong.map(function (w, idx) {
          var ans = Array.isArray(w.answer) ? w.answer[0] : w.answer;
          return '<div class="exam-review-item"><div class="wrong-head"><b>' + w.q + '</b>' +
            '<button type="button" class="wrong-remove" data-remove="' + idx + '">移除</button></div>' +
            w.options.map(function (o, j) { return '<p class="' + (j === ans ? 'right' : '') + '">' + String.fromCharCode(65 + j) + '. ' + o + '</p>'; }).join('') +
            '<p class="muted">' + w.explain + '</p></div>';
        }).join('') + '</div>' +
        '<div class="exam-foot"><button class="btn" type="button" data-menu>返回</button>' +
        '<button class="btn primary" type="button" id="practice-wrong">只练错题</button>' +
        '<button class="btn danger" type="button" id="clear-wrong">清空错题本</button></div>';
      body.querySelectorAll('[data-remove]').forEach(function (b) {
        b.addEventListener('click', function () {
          store.wrong.splice(Number(b.getAttribute('data-remove')), 1); save(); renderWrong();
        });
      });
      var p = document.getElementById('practice-wrong');
      if (p) p.addEventListener('click', startWrongPractice);
      var c = document.getElementById('clear-wrong');
      if (c) c.addEventListener('click', function () { if (confirm('清空全部错题？')) { store.wrong = []; save(); renderWrong(); } });
    }
    body.querySelector('[data-menu]').addEventListener('click', renderMenu);
    open();
  }

  function startWrongPractice() {
    var qs = store.wrong.map(function (w) { return { q: w.q, options: w.options, answer: w.answer, explain: w.explain }; });
    if (!qs.length) { renderWrong(); return; }
    startExam('wrong', pick(qs, Math.min(20, qs.length)));
  }

  function decorate() {
    var totalQ = 0;
    COURSE.forEach(function (m) { m.lessons.forEach(function (l) { totalQ += l.quiz.length; }); });
    var heroSub = document.querySelector('.hero .sub');
    if (heroSub && heroSub.textContent.indexOf('道习题') >= 0) {
      var fixed = heroSub.textContent.replace(/\d+ 道习题/, totalQ + ' 道习题');
      if (fixed !== heroSub.textContent) heroSub.textContent = fixed;
    }
    var heroStats = document.querySelectorAll('.hero-stat b');
    if (heroStats.length >= 2 && heroStats[1].textContent !== String(totalQ)) heroStats[1].textContent = totalQ;
    document.querySelectorAll('.mcard').forEach(function (card, i) {
      if (card.querySelector('.mcard-exam')) return;
      var m = COURSE[i];
      if (!m) return;
      var rec = store.modules[m.id];
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'mcard-exam' + (rec && rec.passed ? ' done' : '');
      b.textContent = rec && rec.passed ? '✓ 已掌握' : '测验';
      b.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); startExam(m.id); });
      card.appendChild(b);
    });
    syncMastered();
  }

  new MutationObserver(function () { decorate(); }).observe(document.getElementById('main') || document.body, { childList: true, subtree: true });
  decorate();
})();
