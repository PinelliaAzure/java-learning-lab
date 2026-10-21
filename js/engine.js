/* =====================================================================
   Java 学习地图 · 引擎
   路由 / 侧边栏 / 学习进度 / 教材渲染 / 流程图 / 闯关练习
   ===================================================================== */
(function () {
  'use strict';

  var COURSE = window.JAVA_COURSE || [];
  var FLAT = [];
  var MODULES = {};

  COURSE.forEach(function (m) {
    m.lessons.forEach(function (l, i) {
      l._module = m;
      l._index = i;
      FLAT.push(l);
    });
    MODULES[m.id] = m;
  });

  function totalQuiz() { return FLAT.reduce(function (n, l) { return n + l.quiz.length; }, 0); }
  var KEY = 'java-lab-progress-v1';
  var store = { v: 1, lessons: {}, last: null };

  try {
    var raw = localStorage.getItem(KEY);
    if (raw) {
      var parsed = JSON.parse(raw);
      if (parsed && parsed.lessons) store = parsed;
    }
  } catch (e) { /* file:// 下可能不可用，忽略 */ }

  var state = {
    current: null,
    tab: 'learn',
    demoPos: 0,
    quiz: null,
    timer: 0
  };

  var els = {};

  /* ------------------------------------------------------------------
     基础工具
     ------------------------------------------------------------------ */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) {}
  }

  function statusOf(id) {
    return store.lessons[id] || {};
  }

  function lessonById(id) {
    for (var i = 0; i < FLAT.length; i++) if (FLAT[i].id === id) return FLAT[i];
    return null;
  }

  var toastTimer = 0;
  function toast(msg) {
    els.toast.textContent = msg;
    els.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { els.toast.classList.remove('show'); }, 2000);
  }

  function copyText(text, okMsg) {
    function done() { toast(okMsg || '已复制'); }
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
        ok ? done() : toast('复制失败，请手动选择');
      } catch (e) { toast('复制失败，请手动选择'); }
    }
  }

  /* ------------------------------------------------------------------
     Java 语法高亮
     ------------------------------------------------------------------ */
  var KEYWORDS = {
    'abstract': 1, 'assert': 1, 'boolean': 1, 'break': 1, 'byte': 1, 'case': 1, 'catch': 1,
    'char': 1, 'class': 1, 'const': 1, 'continue': 1, 'default': 1, 'do': 1, 'double': 1,
    'else': 1, 'enum': 1, 'extends': 1, 'final': 1, 'finally': 1, 'float': 1, 'for': 1,
    'if': 1, 'implements': 1, 'import': 1, 'instanceof': 1, 'int': 1, 'interface': 1,
    'long': 1, 'new': 1, 'package': 1, 'private': 1, 'protected': 1, 'public': 1, 'record': 1,
    'return': 1, 'sealed': 1, 'short': 1, 'static': 1, 'super': 1, 'switch': 1, 'synchronized': 1,
    'this': 1, 'throw': 1, 'throws': 1, 'transient': 1, 'try': 1, 'var': 1, 'void': 1,
    'volatile': 1, 'while': 1, 'true': 1, 'false': 1, 'null': 1, 'yield': 1
  };

  function highlightLine(line) {
    var out = '';
    var last = 0;
    var re = /(\/\/.*$)|("(?:\\.|[^"\\])*")|(@[A-Za-z_]\w*)|([A-Za-z_$][\w$]*)|(\d+(?:\.\d+)?)/g;
    var m;
    while ((m = re.exec(line)) !== null) {
      out += esc(line.slice(last, m.index));
      last = re.lastIndex;
      if (m[1]) out += '<span class="tok-com">' + esc(m[1]) + '</span>';
      else if (m[2]) out += '<span class="tok-str">' + esc(m[2]) + '</span>';
      else if (m[3]) out += '<span class="tok-ann">' + esc(m[3]) + '</span>';
      else if (m[4]) {
        if (KEYWORDS[m[4]]) out += '<span class="tok-kw">' + m[4] + '</span>';
        else if (/^[A-Z]/.test(m[4])) out += '<span class="tok-type">' + m[4] + '</span>';
        else out += esc(m[4]);
      } else {
        out += '<span class="tok-num">' + m[5] + '</span>';
      }
    }
    out += esc(line.slice(last));
    return out || '&nbsp;';
  }

  /* ------------------------------------------------------------------
     统一代码块组件 .cb：教材 code 块 / 答案 tb-ans-code / 练习 code-block 共用
     ------------------------------------------------------------------ */
  var CB_LABELS = {
    java: 'Java', shell: '命令', sql: 'SQL', xml: 'XML',
    props: '配置', http: 'HTTP', docker: 'Dockerfile', text: '文本'
  };

  /* 命令表：只有首词命中这些命令的行才加 "$ " 提示符，其余行按程序输出显示 */
  var CB_CMDS = {};
  ('javac java javap jdeps jps jcmd jmap jstack jstat jfr jshell jar mvn mvnw gradle gradlew git docker curl npm npx ' +
    'openssl keytool mysql psql redis-cli ss netstat lsof kill export cd ls mkdir rm cp mv source which readlink unzip tar grep ' +
    'sed awk chmod ulimit sysctl top ps wrk ab jq ' +
    'echo type where set setx chcp cls del copy start').split(' ').forEach(function (w) { CB_CMDS[w] = 1; });

  /* 未知或缺省的语言按纯文本处理（不做高亮、不加提示符） */
  function cbLang(lang) {
    var l = String(lang == null ? '' : lang).toLowerCase();
    return CB_LABELS[l] ? l : 'text';
  }

  /* 命令块单行：命令行给 "$ " 提示符（数据里自带的 "$ " 不重复显示），程序输出 / 注释行包一层 .cb-out */
  function cbShellLine(line) {
    if (!/\S/.test(line)) return '';                  /* 空行照旧，不加提示符也不包 .cb-out */
    var body = line.replace(/^\s+/, '');
    var isCmd = false;
    if (body.charAt(0) === '$') {
      body = body.slice(1).replace(/^ /, '');           /* 数据里自带 "$ " 的去重，避免显示成 "$ $ " */
      isCmd = true;
    } else if (/^::/.test(body) || /^[A-Za-z_][A-Za-z0-9_]*=/.test(body)) {
      isCmd = true;                                   /* Windows cmd 注释 / VAR=值 开头的环境变量行 */
    } else if (CB_CMDS[body.split(/\s+/)[0]]) {
      isCmd = true;
    }
    if (isCmd) return '<span class="cb-prompt">$</span> ' + esc(body);
    return '<span class="cb-out">' + esc(line) + '</span>';   /* 程序输出 / 注释：不加提示符，压暗显示 */
  }

  /* 命令块整块：逐行带状态——上一行（去尾空白）以 \ 结尾时，本行是命令的续行，
     不加第二个提示符也不压暗，只包 .cb-cont 让断言与样式能区分 */
  function cbShellBlock(text) {
    var prevCont = false;
    return text.split('\n').map(function (line) {
      var isCont = prevCont;
      prevCont = /\\$/.test(line.replace(/\s+$/, ''));
      if (isCont) return '<span class="cb-cont">' + esc(line) + '</span>';
      return cbShellLine(line);
    }).join('\n');
  }

  /* pre 内容：java 逐行高亮；shell 逐行判定命令 / 输出；其它语言（含 text）整块转义成纯文本 */
  function cbCodeHtml(lang, raw) {
    var l = cbLang(lang);
    var text = String(raw == null ? '' : raw);
    if (l === 'java') {
      return text.split('\n').map(function (line) { return highlightLine(line); }).join('\n');
    }
    if (l === 'shell') {
      return cbShellBlock(text);
    }
    return esc(text);
  }

  function cbHeadHtml(lang, title) {
    var l = cbLang(lang);
    return '<div class="cb-head"><span class="cb-dots"><i></i><i></i><i></i></span>' +
      '<span class="cb-lang">' + CB_LABELS[l] + '</span>' +
      (title ? '<span class="cb-title">' + esc(title) + '</span>' : '') +
      '<button class="cb-copy" type="button">复制</button></div>';
  }

  function codeBlockHtml(lang, raw, title, attrs) {
    var l = cbLang(lang);
    return '<div class="cb cb--' + l + '" data-lang="' + l + '"' + (attrs || '') + '>' +
      cbHeadHtml(l, title) +
      '<pre class="cb-pre"><code>' + cbCodeHtml(l, raw) + '</code></pre></div>';
  }

  /* 复制用的纯文本：命令块逐行剥掉行首 "$ "（渲染层每个命令行只加了一个提示符，剥掉即回到正文） */
  function codeCopyText(lang, text) {
    var t = String(text == null ? '' : text);
    if (cbLang(lang) !== 'shell') return t;
    return t.split('\n').map(function (line) { return line.replace(/^\s*\$\s?/, ''); }).join('\n');
  }

  var CB_COPY_BACK = 1400;

  /* 委托绑定：每个 .cb-copy 复制自己所在块 pre 的纯文本，按钮文字 1.4s 后复原 */
  function bindCodeCopy(root) {
    if (!root || root.__cbCopyBound) return;
    root.__cbCopyBound = true;
    root.addEventListener('click', function (e) {
      var btn = e.target && e.target.closest ? e.target.closest('.cb-copy') : null;
      if (!btn || !root.contains(btn)) return;
      var box = btn.closest('.cb');
      var pre = box ? box.querySelector('.cb-pre') : null;
      if (!pre) return;
      copyText(codeCopyText(box.getAttribute('data-lang'), pre.textContent), '已复制');
      btn.textContent = '已复制';
      clearTimeout(btn.__cbTimer);
      btn.__cbTimer = setTimeout(function () { btn.textContent = '复制'; }, CB_COPY_BACK);
    });
  }

  /* 答案块装饰：把 pre.tb-ans-code 包进 .cb 并补头部；java 重新高亮（pre 里是已转义 HTML，先取 textContent） */
  function decorateCodeBlocks(root) {
    if (!root) return 0;
    var done = 0;
    $all('.ans-body pre.tb-ans-code', root).forEach(function (pre) {
      if (pre.getAttribute('data-cb') === '1') return;    /* 已装饰过，重复渲染不再套娃 */
      var lang = cbLang(pre.getAttribute('data-lang'));
      var raw = pre.textContent;
      var box = document.createElement('div');
      box.className = 'cb cb--' + lang;
      box.setAttribute('data-lang', lang);
      box.innerHTML = cbHeadHtml(lang, '');
      pre.parentNode.insertBefore(box, pre);
      box.appendChild(pre);
      pre.setAttribute('data-cb', '1');
      pre.classList.add('cb-pre');
      if (lang === 'java') {
        pre.innerHTML = raw.split('\n').map(function (line) { return highlightLine(line); }).join('\n');
      }
      done++;
    });
    if (done) bindCodeCopy(root);
    return done;
  }
  /* 对外导出（供无浏览器验收）：__cbHtml(lang, raw, title) / __cbCopy(lang, raw) / __cbDecorate(root) */
  window.__cbHtml = codeBlockHtml;
  window.__cbCopy = codeCopyText;
  window.__cbDecorate = decorateCodeBlocks;

  /* ------------------------------------------------------------------
     主题：light / dark / auto
     ------------------------------------------------------------------ */
  var THEME_KEY = 'java-lab-theme';
  var themeMode = 'auto';
  var themeMq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  function resolvedTheme(mode) {
    if (mode === 'auto') return themeMq && themeMq.matches ? 'dark' : 'light';
    return mode;
  }

  function applyTheme() {
    var resolved = resolvedTheme(themeMode);
    document.documentElement.setAttribute('data-theme', resolved);
    document.documentElement.setAttribute('data-theme-mode', themeMode);
    $all('[data-mode]').forEach(function (btn) {
      var on = btn.getAttribute('data-mode') === themeMode;
      btn.classList.toggle('active', on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  function setTheme(mode) {
    if (mode !== 'light' && mode !== 'dark' && mode !== 'auto') return;
    themeMode = mode;
    try { localStorage.setItem(THEME_KEY, mode); } catch (e) {}
    applyTheme();
  }

  function onSystemThemeChange() {
    if (themeMode === 'auto') applyTheme();
  }

  function initTheme() {
    try {
      var saved = localStorage.getItem(THEME_KEY);
      if (saved) themeMode = saved;
    } catch (e) {}
    if (themeMode !== 'light' && themeMode !== 'dark' && themeMode !== 'auto') themeMode = 'auto';

    $all('[data-mode]').forEach(function (btn) {
      btn.addEventListener('click', function () { setTheme(btn.getAttribute('data-mode')); });
    });

    if (themeMq) {
      if (themeMq.addEventListener) themeMq.addEventListener('change', onSystemThemeChange);
      else if (themeMq.addListener) themeMq.addListener(onSystemThemeChange);
    }

    applyTheme();
  }

  /* ------------------------------------------------------------------
     顶栏与侧边栏
     ------------------------------------------------------------------ */
  function counts() {
    var done = 0, passed = 0;
    FLAT.forEach(function (l) {
      var s = statusOf(l.id);
      if (s.done) done++;
      if (s.passed) passed++;
    });
    return { done: done, passed: passed, total: FLAT.length };
  }

  function renderHeader() {
    var c = counts();
    var pct = c.total ? Math.round((c.done / c.total) * 100) : 0;
    els.statDone.textContent = c.done;
    var brandTotal = document.getElementById('brand-total');
    if (brandTotal) brandTotal.textContent = c.total;
    els.statPass.textContent = c.passed;
    var label = els.statDone.parentNode.querySelector('span');
    if (label) label.textContent = '/ ' + c.total + ' 已学';
    els.ringText.textContent = pct + '%';
    var C = 2 * Math.PI * 16;
    els.ringFill.style.strokeDashoffset = String(C * (1 - pct / 100));
  }

  function buildSidebar() {
    var html = '<button class="side-toggle" type="button"><span>课程目录 · ' + COURSE.length + ' 个模块</span><span class="chev">⌄</span></button>' +
      '<div class="side-head"><b>学习目录</b><span>' + COURSE.length + ' 个模块</span></div>';

    COURSE.forEach(function (m) {
      var done = m.lessons.filter(function (l) { return statusOf(l.id).done; }).length;
      html += '<div class="module" data-module="' + m.id + '">';
      html += '<button class="module-head" type="button">' +
        '<span class="mod-no">' + m.no + '</span>' +
        '<span class="mod-title">' + esc(m.title) + '</span>' +
        '<span class="mod-count" data-count="' + m.id + '">' + done + '/' + m.lessons.length + '</span>' +
        '<svg class="mod-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>' +
        '</button><div class="module-lessons">';

      m.lessons.forEach(function (l) {
        html += '<a class="lesson-link" href="#/' + l.id + '" data-id="' + l.id + '">' +
          '<span>' + esc(l.title) + '</span><span class="done-mark">✓</span></a>';
      });
      html += '</div></div>';
    });

    els.sidebar.innerHTML = html;

    var toggle = $('.side-toggle', els.sidebar);
    if (toggle) {
      toggle.addEventListener('click', function () {
        var open = els.sidebar.classList.toggle('open');
        if (!open) {
          els.sidebar.scrollTop = 0;
        } else {
          els.sidebar.scrollTop = 0;
        }
      });
    }

    els.sidebar.addEventListener('click', function (e) {
      var link = e.target.closest ? e.target.closest('.lesson-link') : null;
      if (link && window.innerWidth <= 720) els.sidebar.classList.remove('open');
    });

    $all('.module-head', els.sidebar).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var mod = btn.parentNode;
        mod.classList.toggle('collapsed');
      });
    });
  }

  function syncSidebar() {
    var currentId = state.current ? state.current.id : null;

    $all('.lesson-link', els.sidebar).forEach(function (a) {
      var s = statusOf(a.dataset.id);
      a.classList.toggle('active', a.dataset.id === currentId);
      a.classList.toggle('done', !!s.done);
      a.classList.toggle('passed', !!s.passed);
      var mark = $('.done-mark', a);
      if (mark) mark.textContent = s.passed ? '★' : '✓';
    });

    COURSE.forEach(function (m) {
      var done = m.lessons.filter(function (l) { return statusOf(l.id).done; }).length;
      var el = $('[data-count="' + m.id + '"]', els.sidebar);
      if (el) el.textContent = done + '/' + m.lessons.length;
    });

    // 桌面端让当前课在侧栏中可见；移动端目录是折叠的，不自动滚动
    if (window.innerWidth > 720) {
      var active = $('.lesson-link.active', els.sidebar);
      if (active) {
        var sRect = els.sidebar.getBoundingClientRect();
        var aRect = active.getBoundingClientRect();
        var vertical = els.sidebar.scrollHeight > els.sidebar.clientHeight + 10;
        if (vertical && (aRect.top < sRect.top || aRect.bottom > sRect.bottom)) {
          active.scrollIntoView({ block: 'nearest' });
        }
      }
    }
  }

  /* ------------------------------------------------------------------
     路由
     ------------------------------------------------------------------ */
  function hashId() {
    var m = location.hash.match(/^#\/(.+)$/);
    if (!m) return null;
    try { return decodeURIComponent(m[1]); } catch (e) { return m[1]; }
  }

  function route() {
    var id = hashId();
    if (!id) {
      renderHome();
      return;
    }

    var lesson = lessonById(id);
    if (!lesson) {
      renderHome();
      return;
    }

    if (state.current && state.current.id === lesson.id) return;
    openLesson(lesson);
  }

  function renderHome() {
    clearInterval(state.timer);
    if (state.diagramCleanup) {
      state.diagramCleanup();
      state.diagramCleanup = null;
    }
    state.current = null;
    state.quiz = null;

    var c = counts();
    var pct = c.total ? Math.round((c.done / c.total) * 100) : 0;
    var last = (store.last && lessonById(store.last)) || FLAT[0];

    var cards = COURSE.map(function (m) {
      var done = m.lessons.filter(function (l) { return statusOf(l.id).done; }).length;
      var len = m.lessons.length;
      var p = Math.round((done / len) * 100);
      var next = m.lessons.filter(function (l) { return !statusOf(l.id).done; })[0] || m.lessons[0];
      return '<a class="mcard' + (done === len ? ' done' : '') + '" href="#/' + next.id + '">' +
        '<span class="num">' + m.no + '</span>' +
        '<b>' + esc(m.title) + '</b>' +
        '<small>' + esc(m.desc) + '</small>' +
        '<div class="bar"><div class="track"><div class="fill" style="width:' + p + '%"></div></div>' +
        '<span class="count">' + done + '/' + len + '</span></div></a>';
    }).join('');

    els.main.innerHTML = '<section class="home">' +
      '<div class="hero">' +
      '<p class="eyebrow">JAVA FULL-STACK LEARNING MAP</p>' +
      '<h1>从<em>第一行代码</em><br>到<em>上线部署</em></h1>' +
      '<p class="sub">一张覆盖 Java 开发全流程的学习地图：' + COURSE.length + ' 个模块、' + FLAT.length + ' 个知识点、' + totalQuiz() +
      ' 道习题。每个知识点都可以先读教材、再看流程图，勾选“已学完”后解锁配套练习。</p>' +
      '<div class="hero-actions">' +
      '<a class="btn primary" href="#/' + last.id + '">' + (c.done ? '继续学习「' + esc(last.title) + '」' : '开始第一课') + ' →</a>' +
      '<button class="btn" id="home-scroll" type="button">浏览 ' + COURSE.length + ' 个模块 ↓</button>' +
      '</div>' +
      '<div class="hero-stats">' +
      '<div class="hero-stat"><b>' + FLAT.length + '</b><span>个知识点</span></div>' +
      '<div class="hero-stat"><b>' + totalQuiz() + '</b><span>道习题</span></div>' +
      '<div class="hero-stat"><b>' + c.done + '</b><span>已学完</span></div>' +
      '<div class="hero-stat"><b>' + c.passed + '</b><span>课已通过</span></div>' +
      '</div></div>' +
      '<div class="module-grid">' + cards + '</div>' +
      '<p class="home-foot">进度保存在本机浏览器（localStorage），换浏览器或清缓存会丢失；整个站点无需联网。</p>' +
      '</section>';

    var scrollBtn = $('#home-scroll');
    if (scrollBtn) {
      scrollBtn.addEventListener('click', function () {
        var grid = document.querySelector('.module-grid');
        if (grid) grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }

    syncSidebar();
    renderHeader();
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  function openLesson(lesson) {
    clearInterval(state.timer);
    state.current = lesson;
    state.tab = 'learn';
    state.demoPos = 0;
    state.quiz = null;
    store.last = lesson.id;
    save();

    renderLesson();
    var scrollBtn = $('#home-scroll');
    if (scrollBtn) {
      scrollBtn.addEventListener('click', function () {
        var grid = document.querySelector('.module-grid');
        if (grid) grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }

    syncSidebar();
    renderHeader();
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  /* ------------------------------------------------------------------
     课程页
     ------------------------------------------------------------------ */
  /* 教材统计：只数正文（h/p/note/list/ol/table）里的汉字，代码与流程图不计入阅读量 */
  function tbOf(lesson) {
    return (window.JAVA_TEXTBOOK && window.JAVA_TEXTBOOK[lesson.id]) || null;
  }

  function tbText(b) {
    if (b.h) return b.h;
    if (b.p) return b.p;
    if (b.note) return b.note;
    if (b.list) return b.list.join(' ');
    if (b.ol) return b.ol.join(' ');
    if (b.table) return b.table.head.join(' ') + ' ' + b.table.rows.map(function (r) { return r.join(' '); }).join(' ');
    return '';
  }

  function tbStats(tb) {
    var cjk = 0;
    var hasFlow = false;
    (tb.blocks || []).forEach(function (b) {
      if (b.flow) hasFlow = true;
      var t = tbText(b);
      if (t) cjk += (String(t).replace(/<[^>]+>/g, '').match(/[\u4e00-\u9fa5]/g) || []).length;
    });
    return { cjk: cjk, minutes: Math.max(5, Math.ceil(cjk / 180)), hasFlow: hasFlow };
  }

  /* 题量段的识别口径：N 道习题 / N 道练习 */
  var META_QUIZ_RE = /\d+\s*道(?:习题|练习)/;

  /* 按「 · 」切段后清掉空段与连续重复段，避免出现「 · · 」、结尾悬空分隔符或重复短语 */
  function tidyMeta(s) {
    var parts = String(s).split('·');
    var out = [];
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i].replace(/\s+/g, ' ').trim();
      if (!p) continue;
      if (out.length && out[out.length - 1] === p) continue;
      out.push(p);
    }
    return out.join(' · ');
  }

  function metaHtml(lesson) {
    var s = statusOf(lesson.id);
    var tb = tbOf(lesson);
    var meta = '<span class="meta-chip">预计 ' + (tb ? tbStats(tb).minutes : (lesson.minutes || 5)) + ' 分钟</span>' +
      '<span class="meta-chip level">' + esc(lesson.level || '入门') + '</span>' +
      '<span class="meta-chip">' + lesson.points.length + ' 个要点</span>' +
      '<span class="meta-chip">' + lesson.quiz.length + ' 道习题</span>';
    if (s.done) meta += '<span class="meta-chip done">✓ 已学完</span>';
    if (s.passed) meta += '<span class="meta-chip passed">★ 已掌握 ' + s.best + '%</span>';
    return meta;
  }

  function refreshMeta() {
    var el = document.querySelector('.lesson-meta');
    if (el && state.current) el.innerHTML = metaHtml(state.current);
  }

  function renderLesson() {
    var lesson = state.current;
    var m = lesson._module;
    var idx = FLAT.indexOf(lesson);
    var s = statusOf(lesson.id);

    var meta = metaHtml(lesson);

    var prev = FLAT[idx - 1];
    var next = FLAT[idx + 1];

    els.main.innerHTML =
      '<div class="crumbs"><b>模块 ' + m.no + '</b><span class="sep">/</span>' + esc(m.title) +
      '<span class="sep">/</span>第 ' + (lesson._index + 1) + ' 课</div>' +
      '<h1 class="lesson-title">' + esc(lesson.title) + '</h1>' +
      '<div class="lesson-meta">' + meta + '</div>' +
      '<div class="stepper" id="stepper"></div>' +
      '<div id="panel"></div>' +
      '<nav class="lesson-nav">' +
      (prev ? '<a class="nav-link" href="#/' + prev.id + '"><small>← 上一课</small><b>' + esc(prev.title) + '</b></a>' : '<span></span>') +
      (next ? '<a class="nav-link next" href="#/' + next.id + '"><small>下一课 →</small><b>' + esc(next.title) + '</b></a>' : '<span></span>') +
      '</nav>';

    renderStepper();
    renderPanel();
  }

  function renderStepper() {
    var s = statusOf(state.current.id);
    var quizLocked = !s.done;
    var steps = [
      { id: 'learn', no: '1', label: '知识讲解' },
      { id: 'quiz', no: '2', label: '练习验证', locked: quizLocked }
    ];

    var el = $('#stepper');
    el.innerHTML = steps.map(function (st) {
      var cls = 'step-btn' + (state.tab === st.id ? ' active' : '') + (st.locked ? ' locked' : '');
      return '<button class="' + cls + '" data-tab="' + st.id + '" type="button">' +
        '<i>' + st.no + '</i><span>' + st.label + '</span>' +
        (st.locked ? '<span class="lock">🔒</span>' : '') + '</button>';
    }).join('');

    $all('[data-tab]', el).forEach(function (btn) {
      btn.addEventListener('click', function () { switchTab(btn.dataset.tab); });
    });
  }

  function switchTab(tab) {
    var s = statusOf(state.current.id);
    if (tab === 'demo') return;
    if (tab === 'quiz' && !s.done) {
      toast('先勾选「我已学完」才能解锁练习');
      return;
    }
    if (state.tab === 'quiz' && tab !== 'quiz') state.quiz = null;
    state.tab = tab;
    renderStepper();
    renderPanel();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function renderPanel() {
    clearInterval(state.timer);
    if (state.diagramCleanup) {
      state.diagramCleanup();
      state.diagramCleanup = null;
    }
    var panel = $('#panel');
    if (!panel) return;

    if (state.tab === 'learn') renderLearn(panel);
    else renderQuiz(panel);

    /* 两个分支渲染完才统一装饰答案块、绑一次复制（幂等，切换标签页不会重复套娃） */
    decorateCodeBlocks(panel);
    bindCodeCopy(panel);

    applyTbJump();
  }

  /* ------------------------------------------------------------------
     搜索跳转：定位到教材命中的那一块
     ------------------------------------------------------------------ */
  var JUMP_HL = 'tb-jump-hit';

  function flashBlock(el) {
    el.classList.add(JUMP_HL);
    var oldOutline = el.style.outline;
    var oldBg = el.style.backgroundColor;
    el.style.outline = '2px solid currentColor';
    el.style.outlineOffset = '4px';
    el.style.backgroundColor = 'rgba(255, 193, 7, .18)';
    el.style.transition = 'background-color .4s ease';
    setTimeout(function () {
      el.classList.remove(JUMP_HL);
      el.style.outline = oldOutline;
      el.style.outlineOffset = '';
      el.style.backgroundColor = oldBg;
      el.style.transition = '';
    }, 1500);
  }

  /* 消费 window.__tbJump = { lessonId, bi }：命中当前课才处理，处理后清空意图 */
  function applyTbJump() {
    var j = window.__tbJump;
    if (!j || !state.current || j.lessonId !== state.current.id) return false;

    if (state.tab !== 'learn') {           /* 命中块在讲解页，先切回讲解页，意图留着交给重渲染后的本函数消费 */
      state.tab = 'learn';
      state.quiz = null;
      renderStepper();
      renderPanel();
      return true;
    }
    window.__tbJump = null;                /* 只在真正滚动前后清空，避免切页途中把意图丢掉 */
    if (typeof j.bi !== 'number' || j.bi < 0) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return true;
    }
    var panel = $('#panel');
    var el = panel ? panel.querySelector('[data-bi="' + j.bi + '"]') : null;
    if (!el) return true;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    flashBlock(el);
    return true;
  }
  window.__tbJumpApply = applyTbJump;

  /* ------------------------------------------------------------------
     知识讲解
     ------------------------------------------------------------------ */
  function renderTbBlocks(blocks) {
    return (blocks || []).map(function (b, bi) {
      var at = ' data-bi="' + bi + '"';
      if (b.h) return '<h3 class="tb-h"' + at + '>' + b.h + '</h3>';
      if (b.p) return '<p class="tb-p"' + at + '>' + b.p + '</p>';
      if (b.list) return '<ul class="tb-list"' + at + '>' + b.list.map(function (t) { return '<li>' + t + '</li>'; }).join('') + '</ul>';
      if (b.ol) return '<ol class="tb-ol"' + at + '>' + b.ol.map(function (t) { return '<li>' + t + '</li>'; }).join('') + '</ol>';
      if (b.code) return codeBlockHtml(b.lang, b.code, b.title, at);
      if (b.out) return '<div class="tb-out"' + at + '><b>运行结果</b><pre>' + esc(b.out) + '</pre></div>';
      if (b.note) return '<div class="tb-note"' + at + '>' + b.note + '</div>';
      if (b.flow) {
        return '<div class="tb-flow"' + at + '>' + b.flow.map(function (step, i) {
          var t = typeof step === 'string' ? step : step.t;
          var d = typeof step === 'string' ? '' : (step.d || '');
          return '<div class="tb-flow-step"><b>' + t + '</b>' + (d ? '<span>' + d + '</span>' : '') + '</div>' +
            (i < b.flow.length - 1 ? '<span class="tb-flow-arrow">→</span>' : '');
        }).join('') + '</div>';
      }
      if (b.table) {
        var head = b.table.head.map(function (h) { return '<th>' + h + '</th>'; }).join('');
        var rows = b.table.rows.map(function (r) {
          return '<tr>' + r.map(function (c) { return '<td>' + c + '</td>'; }).join('') + '</tr>';
        }).join('');
        return '<div class="tb-table"' + at + '><table><thead><tr>' + head + '</tr></thead><tbody>' + rows + '</tbody></table></div>';
      }
      return '';
    }).join('');
  }

  function tbMetaText(tb, lesson) {
    var st = tbStats(tb);
    var meta = tb.meta || '';
    if (/本章约\s*\d+\s*字/.test(meta)) {
      meta = meta.replace(/本章约\s*\d+\s*字/, '本章约 ' + st.cjk + ' 字');
    } else {
      meta = '本章约 ' + st.cjk + ' 字' + (meta ? ' · ' + meta : '');
    }
    meta = meta.replace(/建议\s*\d+\s*分钟/, '建议 ' + st.minutes + ' 分钟');
    var quizCount = (lesson && lesson.quiz) ? lesson.quiz.length : 0;
    if (quizCount) meta = meta.replace(META_QUIZ_RE, quizCount + ' 道习题');
    if (!st.hasFlow) meta = meta.replace(/配套流程图\s*(?:与|和|及)?\s*/, '');
    meta = tidyMeta(meta);

    /* 双向补齐：流程图段插在题量段之前，缺题量段补在末尾；补完再 tidyMeta 一次 */
    var segs = meta ? meta.split(' · ') : [];
    if (st.hasFlow && meta.indexOf('流程图') < 0) {
      var at = segs.length;
      for (var i = 0; i < segs.length; i++) {
        if (META_QUIZ_RE.test(segs[i])) { at = i; break; }
      }
      segs.splice(at, 0, '配套流程图');
    }
    if (quizCount && !META_QUIZ_RE.test(segs.join(' · '))) segs.push(quizCount + ' 道习题');
    return tidyMeta(segs.join(' · '));
  }

  function renderLearn(panel) {
    var lesson = state.current;
    var s = statusOf(lesson.id);
    var guide = (window.JAVA_GUIDES && window.JAVA_GUIDES[lesson.id]) || lesson.guide || null;
    var deep = (window.JAVA_DEEP && window.JAVA_DEEP[lesson.id]) || null;
    var tb = (window.JAVA_TEXTBOOK && window.JAVA_TEXTBOOK[lesson.id]) || null;

    var points = lesson.points.map(function (p, i) {
      return '<div class="point"><span class="point-no">' + String(i + 1).padStart(2, '0') + '</span>' +
        '<div class="point-body"><h3>' + esc(p.t) + '</h3><p>' + p.d + '</p></div></div>';
    }).join('');

    var guideHead = '';
    if (guide) {
      if (guide.goals && guide.goals.length) {
        guideHead += '<div class="guide-goals"><h3>学完这一课，你应该能</h3><ul>' +
          guide.goals.map(function (g) { return '<li>' + g + '</li>'; }).join('') + '</ul></div>';
      }
    }

    var pointsHtml = guide
      ? '<details class="points-details"><summary>要点速记（复习时展开）</summary><div class="points">' + points + '</div></details>'
      : '<div class="points-title">核心要点</div><div class="points">' + points + '</div>';

    var bodyHtml = '';
    if (tb) {
      bodyHtml = guideHead +
        '<div class="textbook"><div class="tb-meta">' + tbMetaText(tb, lesson) + '</div>' + renderTbBlocks(tb.blocks) + '</div>' +
        pointsHtml;
    }

    var pitfallsHtml = '';
    if (guide && guide.pitfalls && guide.pitfalls.length) {
      pitfallsHtml = '<div class="guide-pitfalls"><h4>新手常见错误</h4><ul>' +
        guide.pitfalls.map(function (t) { return '<li>' + t + '</li>'; }).join('') + '</ul></div>';
    }

    var homeworkHtml = '';
    if (guide && guide.homework) {
      homeworkHtml = '<div class="guide-homework"><b>动手作业</b><p>' + guide.homework + '</p></div>';
    }

    panel.innerHTML = '<div class="panel"><div class="panel-pad">' +
      '<p class="intro">' + lesson.intro + '</p>' +
      bodyHtml +
      pitfallsHtml +
      (deep && deep.summary && deep.summary.length
        ? '<div class="deep-summary"><h3>本课小结</h3><ul>' +
          deep.summary.map(function (t) { return '<li>' + t + '</li>'; }).join('') + '</ul></div>'
        : '') +
      homeworkHtml +
      (lesson.tip ? '<div class="tip"><b>💡 一句话记住</b><span>' + lesson.tip + '</span></div>' : '') +
      '<div class="cta-row">' +
      '<button class="check ' + (s.done ? 'checked' : '') + '" id="mark-done" type="button">' +
      '<span class="box">' + (s.done ? '✓' : '') + '</span>' +
      '<span>' + (s.done ? '我已学完' : '勾选：我已学完本知识点') + '</span>' +
      '</button>' +
      (s.done ? '<button class="btn ghost" data-go="quiz" type="button">去做习题</button>' : '') +
      '</div></div></div>';

    $('#mark-done').addEventListener('click', toggleDone);

    $all('[data-go]', panel).forEach(function (btn) {
      btn.addEventListener('click', function () { switchTab(btn.dataset.go); });
    });

    /* toggleDone 会直接重渲染讲解页，这里也补一次装饰与复制绑定（两者都幂等） */
    decorateCodeBlocks(panel);
    bindCodeCopy(panel);
  }

  /* 练习/示例代码：统一组件 .cb 的薄包装（默认 Java） */
  function codeBlock(code, title) {
    return codeBlockHtml('java', code, title);
  }

  function toggleDone() {
    var lesson = state.current;
    var s = statusOf(lesson.id);
    s.done = !s.done;
    if (s.done) {
      s.doneAt = Date.now();
      toast('已标记完成，练习已解锁');
    } else {
      toast('已取消完成标记');
    }
    store.lessons[lesson.id] = s;
    save();
    renderHeader();
    syncSidebar();
    renderStepper();
    refreshMeta();

    state.tab = 'learn';
    renderLearn($('#panel'));
  }

  /* ------------------------------------------------------------------
     闯关练习
     ------------------------------------------------------------------ */
  function renderQuiz(panel) {
    var lesson = state.current;
    var s = statusOf(lesson.id);

    if (!s.done) {
      panel.innerHTML = '<div class="panel"><div class="lock-card">' +
        '<div class="lock-icon">🔒</div><h3>练习还没有解锁</h3>' +
        '<p>先读完知识点，回到「知识讲解」勾选「我已学完」，这里就会给出对应的习题。</p>' +
        '<button class="btn primary" type="button" id="go-learn">去勾选 →</button>' +
        '</div></div>';
      $('#go-learn').addEventListener('click', function () { switchTab('learn'); });
      return;
    }

    if (!state.quiz) {
      state.quiz = { i: 0, selected: [], submitted: false, results: [], correct: 0, finished: false };
    }

    var q = lesson.quiz[state.quiz.i];

    if (state.quiz.finished) {
      renderResult(panel);
      return;
    }

    var dots = lesson.quiz.map(function (_, i) {
      var cls = 'qp-dot';
      if (i < state.quiz.results.length) cls += state.quiz.results[i] ? ' right' : ' wrong';
      else if (i === state.quiz.i) cls += ' on';
      return '<span class="' + cls + '"></span>';
    }).join('');

    panel.innerHTML = '<div class="panel"><div class="panel-pad">' +
      '<div class="quiz-top"><div class="quiz-progress">' + dots + '</div>' +
      '<span class="quiz-tag">' + (q.multi ? '多选' : '单选') + ' · ' + (state.quiz.i + 1) + ' / ' + lesson.quiz.length + '</span></div>' +
      '<div class="q-text">' + q.q + '</div>' +
      '<div class="options" id="options">' +
      q.options.map(function (opt, i) {
        return '<button class="option' + (state.quiz.selected.indexOf(i) >= 0 ? ' sel' : '') + '" data-opt="' + i + '" type="button">' +
          '<i>' + String.fromCharCode(65 + i) + '</i><span>' + opt + '</span></button>';
      }).join('') +
      '</div>' +
      '<div class="quiz-actions"><button class="btn primary" id="q-submit" type="button" disabled>提交答案</button>' +
      '<span class="quiz-tag" id="q-tip">选择后提交</span></div>' +
      '<div id="feedback"></div>' +
      '</div></div>';

    var submitBtn = $('#q-submit');
    var tip = $('#q-tip');
    submitBtn.disabled = state.quiz.selected.length === 0;

    $all('.option', panel).forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (state.quiz.submitted) return;
        var i = Number(btn.dataset.opt);
        if (q.multi) {
          var at = state.quiz.selected.indexOf(i);
          if (at >= 0) state.quiz.selected.splice(at, 1);
          else state.quiz.selected.push(i);
        } else {
          state.quiz.selected = [i];
        }
        $all('.option', panel).forEach(function (b) {
          b.classList.toggle('sel', state.quiz.selected.indexOf(Number(b.dataset.opt)) >= 0);
        });
        submitBtn.disabled = state.quiz.selected.length === 0;
      });
    });

    submitBtn.addEventListener('click', function () {
      if (state.quiz.submitted) {
        nextQuestion();
      } else {
        submitAnswer();
      }
    });

    function submitAnswer() {
      state.quiz.submitted = true;
      var answer = q.multi ? q.answer : [q.answer];
      var selected = state.quiz.selected.slice().sort();
      var isRight = answer.slice().sort().join(',') === selected.join(',');
      state.quiz.results.push(isRight);
      if (isRight) state.quiz.correct++;

      $all('.option', panel).forEach(function (btn) {
        var i = Number(btn.dataset.opt);
        btn.classList.remove('sel');
        if (answer.indexOf(i) >= 0) btn.classList.add('correct');
        else if (state.quiz.selected.indexOf(i) >= 0) btn.classList.add('wrong');
        btn.disabled = true;
      });

      var fb = $('#feedback');
      fb.innerHTML = '<div class="feedback ' + (isRight ? 'ok' : 'no') + '">' +
        '<b>' + (isRight ? '✓ 回答正确' : '✗ 再想一想') + '</b>' + q.explain + '</div>';

      var last = state.quiz.i === lesson.quiz.length - 1;
      submitBtn.textContent = last ? '查看成绩 →' : '下一题 →';
      tip.textContent = isRight ? '漂亮！' : '看完解析继续';
    }

    function nextQuestion() {
      if (state.quiz.i === lesson.quiz.length - 1) {
        finishQuiz();
        return;
      }
      state.quiz.i++;
      state.quiz.selected = [];
      state.quiz.submitted = false;
      renderQuiz(panel);
    }

    function finishQuiz() {
      state.quiz.finished = true;
      var total = lesson.quiz.length;
      var score = Math.round((state.quiz.correct / total) * 100);
      var pass = state.quiz.correct >= Math.ceil(total * 2 / 3);

      var s2 = statusOf(lesson.id);
      s2.done = true;
      s2.attempts = (s2.attempts || 0) + 1;
      if (score > (s2.best || 0)) s2.best = score;
      if (pass) s2.passed = true;
      store.lessons[lesson.id] = s2;
      save();

      renderHeader();
      syncSidebar();
      refreshMeta();
      renderResult(panel);

      if (pass) toast('恭喜通过，本课已通过 🎉');
    }
  }

  function renderResult(panel) {
    var lesson = state.current;
    var total = lesson.quiz.length;
    var score = Math.round((state.quiz.correct / total) * 100);
    var pass = state.quiz.correct >= Math.ceil(total * 2 / 3);

    var review = lesson.quiz.map(function (q, i) {
      var ok = state.quiz.results[i];
      return '<div class="review-item ' + (ok ? 'ok' : 'no') + '"><span>' + (ok ? '✓' : '✗') + '</span>' +
        '<div>' + q.q + '</div></div>';
    }).join('');

    panel.innerHTML = '<div class="panel"><div class="panel-pad">' +
      '<div class="result ' + (pass ? 'pass' : 'fail') + '">' +
      '<div class="result-ring">' + score + '</div>' +
      '<h3>' + (pass ? '这一关，过了。' : '差一点，再来一次。') + '</h3>' +
      '<p>' + (pass
        ? '答对 ' + state.quiz.correct + ' / ' + total + ' 题，本课已标记为「已通过」。继续下一课吧。'
        : '答对 ' + state.quiz.correct + ' / ' + total + ' 题。看看下面的错题，再挑战一次。') + '</p>' +
      '<div class="result-actions">' +
      '<button class="btn" id="retry" type="button">再练一次</button>' +
      '<button class="btn primary" id="next-lesson" type="button">继续下一课 →</button>' +
      '</div>' +
      '<div class="review-list">' + review + '</div>' +
      '</div></div></div>';

    $('#retry').addEventListener('click', function () {
      state.quiz = { i: 0, selected: [], submitted: false, results: [], correct: 0, finished: false };
      renderQuiz(panel);
    });

    $('#next-lesson').addEventListener('click', function () {
      var idx = FLAT.indexOf(lesson);
      var next = FLAT[idx + 1];
      if (next) location.hash = '#/' + next.id;
      else toast('已经是最后一课了，恭喜完成整张地图！');
    });
  }

  /* ------------------------------------------------------------------
     进度重置
     ------------------------------------------------------------------ */
  function resetProgress() {
    if (!window.confirm('确定要清空所有学习进度吗？勾选、成绩都会归零，且无法恢复。')) return;
    store = { v: 1, lessons: {}, last: state.current ? state.current.id : null };
    save();
    state.quiz = null;
    renderHeader();
    syncSidebar();
    if (!state.current) {
      renderHome();
    } else {
      refreshMeta();
      renderStepper();
      renderPanel();
    }
    toast('学习进度已重置');
  }
  /* 进度数据 → 重置 按钮调用 */
  window.resetLabProgress = resetProgress;

  /* ------------------------------------------------------------------
     初始化
     ------------------------------------------------------------------ */
  function shuffleQuizOptions() {
    FLAT.forEach(function (lesson) {
      lesson.quiz.forEach(function (q) {
        var correct = Array.isArray(q.answer) ? q.answer.slice() : [q.answer];
        var order = q.options.map(function (_, i) { return i; });
        for (var i = order.length - 1; i > 0; i--) {
          var j = Math.floor(Math.random() * (i + 1));
          var t = order[i]; order[i] = order[j]; order[j] = t;
        }
        var newOptions = order.map(function (i) { return q.options[i]; });
        var newAnswer = correct.map(function (a) { return order.indexOf(a); });
        q.options = newOptions;
        if (q.multi) {
          q.answer = newAnswer.sort(function (a, b) { return a - b; });
        } else {
          q.answer = newAnswer[0];
        }
      });
    });
  }

  function init() {
    shuffleQuizOptions();
    initTheme();
    els = {
      sidebar: $('#sidebar'),
      main: $('#main'),
      ringFill: $('#ring-fill'),
      ringText: $('#ring-text'),
      statDone: $('#stat-done'),
      statPass: $('#stat-pass'),
      toast: $('#toast')
    };

    buildSidebar();
    renderHeader();

    var resetBtn = $('#btn-reset');
    if (resetBtn) resetBtn.addEventListener('click', resetProgress);
    window.addEventListener('hashchange', route);

    route();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
