/* =====================================================================
   排序算法可视化实验室 · 界面与播放引擎
   纯原生 JavaScript，无依赖，file:// 直接打开可用。
   ===================================================================== */
(function () {
  'use strict';

  var ALGOS = window.SORT_ALGORITHMS || [];

  /* ------------------------------------------------------------------
     状态
     ------------------------------------------------------------------ */
  var state = {
    algo: ALGOS[0],
    data: [],
    maxVal: 99,
    steps: [],
    index: 0,
    playing: false,
    speed: 6,
    size: 18,
    preset: 'random',
    raf: 0,
    lastTs: 0,
    acc: 0
  };

  var els = {};
  var barNodes = [];
  var auxMax = 1;

  /* ------------------------------------------------------------------
     小工具
     ------------------------------------------------------------------ */
  function $(id) { return document.getElementById(id); }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  function prefersReducedMotion() {
    try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
    catch (e) { return false; }
  }

  /* ------------------------------------------------------------------
     数据生成
     ------------------------------------------------------------------ */
  function generateData(n, preset) {
    var arr;
    if (preset === 'few') {
      var pool = [9, 23, 41, 62, 81, 96];
      arr = [];
      for (var i = 0; i < n; i++) arr.push(pool[Math.floor(Math.random() * pool.length)]);
      return arr;
    }

    var used = {};
    var values = [];
    while (values.length < n) {
      var v = 6 + Math.floor(Math.random() * 93);
      if (used[v]) continue;
      used[v] = true;
      values.push(v);
    }

    values.sort(function (a, b) { return a - b; });

    if (preset === 'reverse') {
      values.reverse();
      return values;
    }
    if (preset === 'nearly') {
      for (var k = 0; k < Math.max(2, Math.round(n / 9)); k++) {
        var i1 = Math.floor(Math.random() * n);
        var i2 = Math.min(n - 1, i1 + 1 + Math.floor(Math.random() * 2));
        var tmp = values[i1]; values[i1] = values[i2]; values[i2] = tmp;
      }
      return values;
    }
    return shuffle(values);
  }

  /* ------------------------------------------------------------------
     算法步骤
     ------------------------------------------------------------------ */
  function rebuildSteps() {
    state.steps = [];
    try {
      state.algo.run(state.data.slice(), function (step) {
        state.steps.push(step);
      });
    } catch (err) {
      console.error('生成动画步骤失败：', err);
      state.steps = [];
    }
    if (state.steps.length > 9000) state.steps.length = 9000;
    state.index = 0;
    state.maxVal = Math.max.apply(null, state.data.concat([1]));
  }

  function currentStep() {
    return state.steps[state.index] || null;
  }

  /* ------------------------------------------------------------------
     柱状图
     ------------------------------------------------------------------ */
  function buildBars() {
    els.bars.innerHTML = '';
    barNodes = [];
    var n = state.data.length;

    for (var i = 0; i < n; i++) {
      var wrap = document.createElement('div');
      wrap.className = 'bar-wrap';

      var value = document.createElement('span');
      value.className = 'bar-value';
      value.textContent = state.data[i];

      var track = document.createElement('div');
      track.className = 'bar-track';

      var bar = document.createElement('div');
      bar.className = 'bar';
      bar.style.height = pct(state.data[i]) + '%';
      bar.style.transitionDelay = Math.min(i * 12, 220) + 'ms';
      track.appendChild(bar);

      var index = document.createElement('span');
      index.className = 'bar-index';
      index.textContent = i;

      wrap.appendChild(value);
      wrap.appendChild(track);
      wrap.appendChild(index);
      els.bars.appendChild(wrap);

      barNodes.push({ wrap: wrap, value: value, bar: bar, index: index });
    }

    els.chart.classList.toggle('compact', n > 30);
    // 让入场动画只播放一次
    requestAnimationFrame(function () {
      barNodes.forEach(function (node) { node.bar.style.transitionDelay = ''; });
    });
  }

  function pct(v) {
    return Math.max(4, Math.round((v / state.maxVal) * 100));
  }

  function paint() {
    var step = currentStep();
    if (!step) return;

    var sortedSet = new Set(step.sorted);
    var compareSet = new Set(step.compare);
    var swapSet = new Set(step.swap);
    var range = step.range;

    for (var i = 0; i < barNodes.length; i++) {
      var node = barNodes[i];
      var cls = 'bar-wrap';
      var fullRange = range && range[0] === 0 && range[1] === barNodes.length - 1;
      if (range && !fullRange && i >= range[0] && i <= range[1]) cls += ' in-range';
      if (sortedSet.has(i)) cls += ' is-sorted';
      if (i === step.pivot) cls += ' is-pivot';
      if (swapSet.has(i)) cls += ' is-swap';
      if (compareSet.has(i)) cls += ' is-compare';
      node.wrap.className = cls;

      node.bar.style.height = pct(step.arr[i]) + '%';
      node.value.textContent = step.arr[i];
    }

    // 当前步骤说明
    els.noteText.textContent = step.note;
    els.note.classList.remove('pop');
    void els.note.offsetWidth;
    els.note.classList.add('pop');

    // 辅助视图（计数数组、桶、临时数组）
    renderAux(step.aux);

    // 统计
    els.counts.textContent = '比较 ' + step.compareCount + ' 次 · 移动 ' + step.moveCount + ' 次';
    els.stepNow.textContent = state.index + 1;
    els.stepTotal.textContent = state.steps.length;
    els.scrub.max = Math.max(0, state.steps.length - 1);
    els.scrub.value = state.index;
    var fill = state.steps.length <= 1 ? 100 : (state.index / (state.steps.length - 1)) * 100;
    els.scrub.style.setProperty('--fill', fill.toFixed(2) + '%');
  }

  function renderAux(aux) {
    if (!aux) {
      els.aux.hidden = true;
      els.aux.innerHTML = '';
      return;
    }
    els.aux.hidden = false;
    els.aux.innerHTML = '';

    var head = document.createElement('div');
    head.className = 'aux-title';
    head.textContent = aux.title || '';
    els.aux.appendChild(head);

    var box = document.createElement('div');
    box.className = 'aux-items';
    els.aux.appendChild(box);

    var items = aux.items || [];

    if (aux.kind === 'bars') {
      auxMax = Math.max.apply(null, items.map(function (it) { return Number(it.value) || 0; }).concat([1]));
      items.forEach(function (it) {
        var cell = document.createElement('div');
        cell.className = 'aux-bar' + (it.active ? ' active' : '');

        var holder = document.createElement('div');
        holder.className = 'aux-bar-holder';
        var mini = document.createElement('div');
        mini.className = 'aux-mini';
        var h = Math.max(3, Math.round((Number(it.value) || 0) / auxMax * 34));
        mini.style.height = h + 'px';
        holder.appendChild(mini);

        var count = document.createElement('span');
        count.className = 'aux-count';
        count.textContent = it.value;

        var label = document.createElement('span');
        label.className = 'aux-label';
        label.textContent = it.label;

        cell.appendChild(count);
        cell.appendChild(holder);
        cell.appendChild(label);
        box.appendChild(cell);
      });
      return;
    }

    items.forEach(function (it) {
      var chip = document.createElement('div');
      chip.className = 'aux-chip' + (it.active ? ' active' : '') + (it.value === '空' ? ' empty' : '');

      if (it.label !== '' && it.label != null) {
        var label = document.createElement('b');
        label.textContent = it.label;
        chip.appendChild(label);
      }
      var val = document.createElement('span');
      val.textContent = it.value;
      val.className = 'aux-value';
      chip.appendChild(val);

      if (it.sub) {
        var sub = document.createElement('em');
        sub.textContent = it.sub;
        chip.appendChild(sub);
      }
      box.appendChild(chip);
    });
  }

  /* ------------------------------------------------------------------
     播放控制
     ------------------------------------------------------------------ */
  function setPlaying(on) {
    state.playing = on;
    els.play.innerHTML = on ? iconPause() : iconPlay();
    els.play.setAttribute('aria-label', on ? '暂停' : '播放');
    els.play.classList.toggle('is-playing', on);
    els.stage.classList.toggle('playing', on);

    if (on) {
      if (state.index >= state.steps.length - 1) {
        state.index = 0;
        paint();
      }
      state.lastTs = 0;
      state.acc = 0;
      cancelAnimationFrame(state.raf);
      state.raf = requestAnimationFrame(tick);
    } else {
      cancelAnimationFrame(state.raf);
    }
  }

  function tick(ts) {
    if (!state.playing) return;
    if (!state.lastTs) state.lastTs = ts;
    var delta = Math.min(ts - state.lastTs, 250);
    state.lastTs = ts;
    state.acc += delta;

    var interval = 1000 / state.speed;
    var guard = 0;
    while (state.acc >= interval && guard < 4) {
      state.acc -= interval;
      guard++;
      if (state.index >= state.steps.length - 1) {
        setPlaying(false);
        return;
      }
      state.index++;
      paint();
    }
    if (state.playing) state.raf = requestAnimationFrame(tick);
  }

  function advance() {
    if (state.index < state.steps.length - 1) {
      state.index++;
      paint();
      return true;
    }
    setPlaying(false);
    return false;
  }

  function stepBy(dir) {
    setPlaying(false);
    state.index = Math.max(0, Math.min(state.steps.length - 1, state.index + dir));
    paint();
  }

  function restart() {
    setPlaying(false);
    state.index = 0;
    paint();
  }

  /* ------------------------------------------------------------------
     图标
     ------------------------------------------------------------------ */
  function iconPlay() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';
  }
  function iconPause() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>';
  }

  /* ------------------------------------------------------------------
     侧边栏
     ------------------------------------------------------------------ */
  function buildSidebar() {
    els.list.innerHTML = '';
    var lastGroup = null;

    ALGOS.forEach(function (algo) {
      if (algo.group !== lastGroup) {
        lastGroup = algo.group;
        var head = document.createElement('div');
        head.className = 'group-label';
        head.textContent = algo.group;
        els.list.appendChild(head);
      }

      var btn = document.createElement('button');
      btn.className = 'algo-item' + (algo.id === state.algo.id ? ' active' : '');
      btn.dataset.id = algo.id;
      btn.innerHTML =
        '<span class="algo-main"><b>' + algo.name + '</b><small>' + algo.en + '</small></span>' +
        '<span class="algo-tag">' + algo.tag + '</span>';

      btn.addEventListener('click', function () {
        selectAlgorithm(algo.id);
      });
      els.list.appendChild(btn);
    });
  }

  function revealActive() {
    var active = els.list.querySelector('.algo-item.active');
    if (!active || els.list.scrollWidth <= els.list.clientWidth) return;
    els.list.scrollLeft = Math.max(0, active.offsetLeft - 14);
  }

  function selectAlgorithm(id) {
    var next = ALGOS.filter(function (a) { return a.id === id; })[0];
    if (!next) return;
    state.algo = next;

    Array.prototype.forEach.call(els.list.querySelectorAll('.algo-item'), function (el) {
      el.classList.toggle('active', el.dataset.id === id);
    });
    revealActive();

    renderHeader();
    renderExplain();
    renderCode();
    renderCompareTable();

    rebuildSteps();
    buildBars();
    paint();
    setPlaying(true);

    try { localStorage.setItem('java-lab-sort-algo', id); } catch (e) {}
  }

  /* ------------------------------------------------------------------
     当前算法信息
     ------------------------------------------------------------------ */
  function renderHeader() {
    var a = state.algo;
    els.name.textContent = a.name;
    els.en.textContent = a.en;

    els.badges.innerHTML = '';
    addBadge(a.stable ? '稳定' : '不稳定', a.stable ? 'ok' : 'bad');
    addBadge(a.inPlace ? '原地排序' : '需要额外空间', a.inPlace ? 'info' : 'warn');
    addBadge(a.tag, 'tag');
  }

  function addBadge(text, kind) {
    var span = document.createElement('span');
    span.className = 'badge ' + kind;
    span.textContent = text;
    els.badges.appendChild(span);
  }

  /* ------------------------------------------------------------------
     讲解面板
     ------------------------------------------------------------------ */
  function renderExplain() {
    var a = state.algo;
    var html = '';

    html += '<p class="lead">' + escapeHtml(a.summary) + '</p>';

    html += '<div class="facts">' +
      fact('最好', a.best) + fact('平均', a.avg) + fact('最坏', a.worst) + fact('额外空间', a.space) +
      '</div>';

    html += '<h3>核心思想</h3><p>' + escapeHtml(a.idea) + '</p>';
    html += '<blockquote class="analogy"><span>💡 生活类比</span>' + escapeHtml(a.analogy) + '</blockquote>';

    html += '<h3>执行步骤</h3><ol class="steps">';
    a.steps.forEach(function (s) { html += '<li>' + escapeHtml(s) + '</li>'; });
    html += '</ol>';

    html += '<h3>关键点</h3><ul class="tips">';
    a.tips.forEach(function (s) { html += '<li>' + escapeHtml(s) + '</li>'; });
    html += '</ul>';

    html += '<h3>什么时候用</h3><p class="when">' + escapeHtml(a.when) + '</p>';

    els.panelExplain.innerHTML = html;
  }

  function fact(label, value) {
    return '<div class="fact"><span>' + escapeHtml(label) + '</span><b>' + escapeHtml(value) + '</b></div>';
  }

  /* ------------------------------------------------------------------
     Java 代码
     ------------------------------------------------------------------ */
  function renderCode() {
    var a = state.algo;
    els.javaName.textContent = a.javaName;
    els.javaCode.innerHTML = highlightJava(a.java);
    els.codeScroll.scrollTop = 0;
  }

  var KEYWORDS = {
    'abstract': 1, 'assert': 1, 'boolean': 1, 'break': 1, 'byte': 1, 'case': 1, 'catch': 1,
    'char': 1, 'class': 1, 'const': 1, 'continue': 1, 'default': 1, 'do': 1, 'double': 1,
    'else': 1, 'enum': 1, 'extends': 1, 'final': 1, 'finally': 1, 'float': 1, 'for': 1,
    'if': 1, 'implements': 1, 'import': 1, 'instanceof': 1, 'int': 1, 'interface': 1, 'long': 1,
    'new': 1, 'package': 1, 'private': 1, 'protected': 1, 'public': 1, 'return': 1, 'short': 1,
    'static': 1, 'super': 1, 'switch': 1, 'this': 1, 'throw': 1, 'throws': 1, 'try': 1,
    'void': 1, 'while': 1, 'true': 1, 'false': 1, 'null': 1
  };

  function highlightJava(code) {
    var out = '';
    var last = 0;
    var re = /(\/\/[^\n]*)|("(?:\\.|[^"\\])*")|(@[A-Za-z_]\w*)|([A-Za-z_$][\w$]*)|(\d+)/g;
    var m;

    while ((m = re.exec(code)) !== null) {
      out += escapeHtml(code.slice(last, m.index));
      last = re.lastIndex;

      if (m[1]) {
        out += '<span class="tok-com">' + escapeHtml(m[1]) + '</span>';
      } else if (m[2]) {
        out += '<span class="tok-str">' + escapeHtml(m[2]) + '</span>';
      } else if (m[3]) {
        out += '<span class="tok-ann">' + escapeHtml(m[3]) + '</span>';
      } else if (m[4]) {
        var word = m[4];
        if (KEYWORDS[word]) {
          out += '<span class="tok-kw">' + word + '</span>';
        } else if (/^[A-Z]/.test(word)) {
          out += '<span class="tok-type">' + word + '</span>';
        } else {
          out += escapeHtml(word);
        }
      } else {
        out += '<span class="tok-num">' + m[5] + '</span>';
      }
    }
    out += escapeHtml(code.slice(last));
    return out;
  }

  function copyCode() {
    var text = state.algo.java;
    function done() { showToast('已复制 ' + state.algo.javaName); }
    function fail() { showToast('复制失败，请手动选择代码'); }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(fallback);
    } else {
      fallback();
    }

    function fallback() {
      try {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        var ok = document.execCommand('copy');
        document.body.removeChild(ta);
        ok ? done() : fail();
      } catch (e) {
        fail();
      }
    }
  }

  /* ------------------------------------------------------------------
     对比表
     ------------------------------------------------------------------ */
  function renderCompareTable() {
    var html = '<div class="table-wrap"><table class="compare-table"><thead><tr>' +
      '<th>算法</th><th>最好</th><th>平均</th><th>最坏</th><th>额外空间</th><th>稳定性</th><th>一句话</th>' +
      '</tr></thead><tbody>';

    ALGOS.forEach(function (a) {
      html += '<tr data-id="' + a.id + '" class="' + (a.id === state.algo.id ? 'current' : '') + '">' +
        '<td><b>' + escapeHtml(a.name) + '</b><small>' + escapeHtml(a.en) + '</small></td>' +
        '<td>' + escapeHtml(a.best) + '</td>' +
        '<td>' + escapeHtml(a.avg) + '</td>' +
        '<td>' + escapeHtml(a.worst) + '</td>' +
        '<td>' + escapeHtml(a.space) + '</td>' +
        '<td>' + (a.stable ? '<span class="yes">稳定</span>' : '<span class="no">不稳定</span>') + '</td>' +
        '<td class="short">' + escapeHtml(a.summary) + '</td>' +
        '</tr>';
    });

    html += '</tbody></table></div>' +
      '<p class="table-note">点击任意一行可以切换算法；复杂度的“最好 / 最坏”取决于输入数据的初始顺序。</p>';

    els.panelCompare.innerHTML = html;

    Array.prototype.forEach.call(els.panelCompare.querySelectorAll('tbody tr'), function (tr) {
      tr.addEventListener('click', function () {
        selectAlgorithm(tr.dataset.id);
        switchTab('code');
      });
    });
  }

  /* ------------------------------------------------------------------
     标签页
     ------------------------------------------------------------------ */
  function switchTab(name) {
    Array.prototype.forEach.call(document.querySelectorAll('.tab'), function (btn) {
      btn.classList.toggle('active', btn.dataset.tab === name);
    });
    ['explain', 'code', 'compare'].forEach(function (key) {
      $('panel-' + key).hidden = key !== name;
    });
  }

  /* ------------------------------------------------------------------
     Toast
     ------------------------------------------------------------------ */
  var toastTimer = 0;
  function showToast(msg) {
    var toast = document.getElementById('toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'toast';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove('show'); }, 1800);
  }

  /* ------------------------------------------------------------------
     重建一组数据
     ------------------------------------------------------------------ */
  function newData(autoplay) {
    state.data = generateData(state.size, state.preset);
    rebuildSteps();
    buildBars();
    paint();
    if (autoplay !== false) setPlaying(true);
  }

  /* ------------------------------------------------------------------
     绑定事件
     ------------------------------------------------------------------ */
  function bind() {
    els.play.addEventListener('click', function () { setPlaying(!state.playing); });
    els.next.addEventListener('click', function () { stepBy(1); });
    els.prev.addEventListener('click', function () { stepBy(-1); });
    els.reset.addEventListener('click', restart);

    els.speed.addEventListener('input', function () {
      state.speed = Number(els.speed.value);
      els.speedVal.textContent = state.speed + ' 步/秒';
      try { localStorage.setItem('java-lab-sort-speed', String(state.speed)); } catch (e) {}
    });

    els.size.addEventListener('input', function () {
      els.sizeVal.textContent = els.size.value;
    });
    els.size.addEventListener('change', function () {
      state.size = Number(els.size.value);
      els.sizeVal.textContent = state.size;
      newData(true);
    });

    Array.prototype.forEach.call(document.querySelectorAll('[data-preset]'), function (btn) {
      btn.addEventListener('click', function () {
        state.preset = btn.dataset.preset;
        Array.prototype.forEach.call(document.querySelectorAll('[data-preset]'), function (b) {
          b.classList.toggle('active', b === btn);
        });
        newData(true);
      });
    });

    els.shuffle.addEventListener('click', function () { newData(true); });

    els.scrub.addEventListener('input', function () {
      setPlaying(false);
      state.index = Number(els.scrub.value);
      paint();
    });

    Array.prototype.forEach.call(document.querySelectorAll('.tab'), function (btn) {
      btn.addEventListener('click', function () { switchTab(btn.dataset.tab); });
    });

    els.copy.addEventListener('click', copyCode);

    document.addEventListener('keydown', function (e) {
      var tag = (document.activeElement && document.activeElement.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.code === 'Space') {
        e.preventDefault();
        setPlaying(!state.playing);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        stepBy(1);
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        stepBy(-1);
      } else if (e.key === 'r' || e.key === 'R') {
        restart();
      }
    });
  }

  /* ------------------------------------------------------------------
     初始化
     ------------------------------------------------------------------ */
  function init() {
    els = {
      list: $('algo-list'),
      name: $('algo-name'),
      en: $('algo-en'),
      badges: $('badges'),
      chart: $('chart'),
      bars: $('bars'),
      aux: $('aux'),
      note: $('note'),
      noteText: $('note-text'),
      stage: document.querySelector('.stage'),
      counts: $('counts'),
      stepNow: $('step-now'),
      stepTotal: $('step-total'),
      scrub: $('scrub'),
      play: $('btn-play'),
      next: $('btn-next'),
      prev: $('btn-prev'),
      reset: $('btn-reset'),
      speed: $('speed'),
      speedVal: $('speed-val'),
      size: $('size'),
      sizeVal: $('size-val'),
      shuffle: $('btn-shuffle'),
      panelExplain: $('panel-explain'),
      panelCode: $('panel-code'),
      panelCompare: $('panel-compare'),
      javaName: $('java-name'),
      javaCode: $('java-code'),
      codeScroll: $('code-scroll'),
      copy: $('copy-btn')
    };

    // 恢复上次的设置（file:// 下 localStorage 不可用时静默忽略）
    try {
      var savedAlgo = localStorage.getItem('java-lab-sort-algo');
      if (savedAlgo && ALGOS.some(function (a) { return a.id === savedAlgo; })) {
        state.algo = ALGOS.filter(function (a) { return a.id === savedAlgo; })[0];
      }
      var savedSpeed = Number(localStorage.getItem('java-lab-sort-speed'));
      if (savedSpeed >= 1 && savedSpeed <= 40) state.speed = savedSpeed;
    } catch (e) {}

    els.speed.value = state.speed;
    els.speedVal.textContent = state.speed + ' 步/秒';
    els.size.value = state.size;
    els.sizeVal.textContent = state.size;

    els.play.innerHTML = iconPlay();

    buildSidebar();
    revealActive();
    renderHeader();
    renderExplain();
    renderCode();
    renderCompareTable();
    bind();

    state.data = generateData(state.size, state.preset);
    rebuildSteps();
    buildBars();
    paint();

    if (!prefersReducedMotion()) {
      setTimeout(function () { setPlaying(true); }, 550);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
