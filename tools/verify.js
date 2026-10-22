#!/usr/bin/env node
/* java-learning-lab 一致性校验器（零依赖，只用 Node 内置模块）
 * 用法：node tools/verify.js <java-learning-lab 路径> [--meta id1,id2,...]
 * 退出码：全部规则 PASS -> 0，任一规则 FAIL -> 1，参数错误 -> 2
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execFileSync } = require('child_process');

const rootArg = process.argv[2] && process.argv[2].indexOf('--') !== 0 ? process.argv[2] : '';
const root = rootArg ? path.resolve(rootArg) : '';
if (!root || !fs.existsSync(path.join(root, 'index.html'))) {
  console.error('用法：node tools/verify.js <java-learning-lab 路径> [--meta id1,id2]');
  process.exit(2);
}
const metaArg = (function () {
  const i = process.argv.indexOf('--meta');
  if (i < 0 || !process.argv[i + 1]) return [];
  return process.argv[i + 1].split(',').map(function (s) { return s.trim(); }).filter(Boolean);
})();

/* ============================================================
   一、按 index.html 里 <script src> 的真实顺序在 vm 里加载
   （字典序会漏掉 textbook-flows.js 运行时注入的 flow 块）
   ============================================================ */
function makeEl(tagName) {
  const el = {
    tagName: String(tagName || 'div').toUpperCase(),
    innerHTML: '', textContent: '', value: '', id: '', className: '',
    dataset: {}, style: {}, children: [], childNodes: [],
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    scrollIntoView() {}, scrollTo() {}, focus() {}, blur() {}, remove() {},
    appendChild(c) { return c; }, insertBefore(c) { return c; }, removeChild(c) { return c; },
    setAttribute() {}, getAttribute() { return null; }, removeAttribute() {},
    addEventListener() {}, removeEventListener() {},
    querySelector() { return makeEl('div'); }, querySelectorAll() { return []; },
    closest() { return null; }, matches() { return false; },
    cloneNode() { return makeEl('div'); }, insertAdjacentHTML() {},
    getBoundingClientRect() { return { top: 0, left: 0, width: 0, height: 0 }; }
  };
  el.firstChild = null;
  el.lastChild = null;
  el.parentElement = null;
  Object.defineProperty(el, 'parentNode', {
    get() { return sharedEl; },
    set() {},
    configurable: true
  });
  return el;
}
const sharedEl = makeEl('div');

function loadProject() {
  const scripts = [];
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const re = /<script\s+src="([^"]+)"/g;
  let m;
  while ((m = re.exec(html))) scripts.push(m[1]);

  const doc = {
    readyState: 'complete',
    title: 'java-learning-lab',
    documentElement: makeEl('html'),
    body: makeEl('body'),
    head: makeEl('head'),
    querySelector() { return sharedEl; },
    querySelectorAll() { return []; },
    getElementById() { return sharedEl; },
    createElement(t) { return makeEl(t); },
    createTextNode(t) { return { textContent: String(t) }; },
    createDocumentFragment() { return makeEl('div'); },
    addEventListener() {}, removeEventListener() {}
  };
  const store = new Map();
  const sandbox = {
    console: { log() {}, warn() {}, error() {}, info() {}, debug() {} },
    JSON, Math, Date, Object, Array, String, Number, Boolean, RegExp, Error, TypeError,
    parseInt, parseFloat, isNaN, isFinite, encodeURIComponent, decodeURIComponent, encodeURI, decodeURI,
    Promise, Map, Set,
    setTimeout() { return 0; }, clearTimeout() {}, setInterval() { return 0; }, clearInterval() {},
    requestAnimationFrame() { return 0; },
    document: doc,
    localStorage: {
      getItem(k) { return store.has(k) ? store.get(k) : null; },
      setItem(k, v) { store.set(k, String(v)); },
      removeItem(k) { store.delete(k); }
    },
    location: { hash: '#/', href: 'http://localhost/index.html', pathname: '/index.html', search: '' },
    history: { pushState() {}, replaceState() {} },
    navigator: { userAgent: 'node-verify' },
    matchMedia() { return { matches: false, addEventListener() {}, removeEventListener() {}, addListener() {} }; },
    addEventListener() {}, removeEventListener() {}, scrollTo() {}, alert() {},
    innerWidth: 1280, innerHeight: 800,
    MutationObserver: function () { return { observe() {}, disconnect() {}, takeRecords() { return []; } }; },
    getComputedStyle() { return { getPropertyValue() { return ''; } }; }
  };
  sandbox.window = sandbox;
  sandbox.self = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);

  const missing = [];
  const failed = [];
  scripts.forEach(function (rel) {
    const file = path.join(root, rel);
    if (!fs.existsSync(file)) { missing.push(rel); return; }
    try {
      vm.runInContext(fs.readFileSync(file, 'utf8'), sandbox, { filename: file });
    } catch (e) {
      failed.push(rel + ': ' + e.message);
    }
  });

  return {
    scripts: scripts,
    missing: missing,
    failed: failed,
    COURSE: sandbox.JAVA_COURSE || [],
    TEXTBOOK: sandbox.JAVA_TEXTBOOK || {},
    GUIDES: sandbox.JAVA_GUIDES || {},
    DEEP: sandbox.JAVA_DEEP || {}
  };
}

const proj = loadProject();
const COURSE = proj.COURSE;
const TEXTBOOK = proj.TEXTBOOK;
const lessons = [];
COURSE.forEach(function (mod) {
  (mod.lessons || []).forEach(function (l) { lessons.push({ mod: mod, lesson: l }); });
});

/* ============================================================
   二、离线复算引擎的 meta 文案（与 js/engine.js 的 tbMetaText 同一算法）
   ============================================================ */
const META_QUIZ_RE = /\d+\s*道(?:习题|练习)/;

function tbText(b) {
  if (b.h) return b.h;
  if (b.p) return b.p;
  if (b.note) return b.note;
  if (b.list) return b.list.join(' ');
  if (b.ol) return b.ol.join(' ');
  if (b.table) return b.table.head.join(' ') + ' ' + b.table.rows.map(function (r) { return r.join(' '); }).join(' ');
  return '';
}

function cjkCount(s) {
  return (String(s).replace(/<[^>]+>/g, '').match(/[\u4e00-\u9fa5]/g) || []).length;
}

function tbStats(tb) {
  let cjk = 0;
  let hasFlow = false;
  (tb.blocks || []).forEach(function (b) {
    if (b.flow) hasFlow = true;
    const t = tbText(b);
    if (t) cjk += cjkCount(t);
  });
  return { cjk: cjk, minutes: Math.max(5, Math.ceil(cjk / 180)), hasFlow: hasFlow };
}

function tidyMeta(s) {
  const parts = String(s).split('·');
  const out = [];
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i].replace(/\s+/g, ' ').trim();
    if (!p) continue;
    if (out.length && out[out.length - 1] === p) continue;
    out.push(p);
  }
  return out.join(' · ');
}

function tbMetaText(tb, lesson) {
  const st = tbStats(tb);
  let meta = tb.meta || '';
  if (/本章约\s*\d+\s*字/.test(meta)) {
    meta = meta.replace(/本章约\s*\d+\s*字/, '本章约 ' + st.cjk + ' 字');
  } else {
    meta = '本章约 ' + st.cjk + ' 字' + (meta ? ' · ' + meta : '');
  }
  meta = meta.replace(/建议\s*\d+\s*分钟/, '建议 ' + st.minutes + ' 分钟');
  const quizCount = (lesson && lesson.quiz) ? lesson.quiz.length : 0;
  if (quizCount) meta = meta.replace(META_QUIZ_RE, quizCount + ' 道习题');
  if (!st.hasFlow) meta = meta.replace(/配套流程图\s*(?:与|和|及)?\s*/, '');
  meta = tidyMeta(meta);

  const segs = meta ? meta.split(' · ') : [];
  if (st.hasFlow && meta.indexOf('流程图') < 0) {
    let at = segs.length;
    for (let i = 0; i < segs.length; i++) {
      if (META_QUIZ_RE.test(segs[i])) { at = i; break; }
    }
    segs.splice(at, 0, '配套流程图');
  }
  if (quizCount && !META_QUIZ_RE.test(segs.join(' · '))) segs.push(quizCount + ' 道习题');
  return tidyMeta(segs.join(' · '));
}

/* ============================================================
   三、规则框架
   ============================================================ */
const results = [];
function rule(no, title, fn) {
  const r = { no: no, title: title, pass: true, facts: [], issues: [] };
  try {
    fn(r);
  } catch (e) {
    r.pass = false;
    r.issues.push('规则执行异常：' + e.message);
  }
  if (r.issues.length) r.pass = false;
  results.push(r);
}

const jsFiles = (function () {
  const out = [];
  const jsDir = path.join(root, 'js');
  if (fs.existsSync(jsDir)) {
    fs.readdirSync(jsDir).sort().forEach(function (f) {
      if (/\.js$/.test(f)) out.push(path.join(jsDir, f));
    });
  }
  fs.readdirSync(root).sort().forEach(function (f) {
    if (/\.js$/.test(f)) out.push(path.join(root, f));
  });
  return out;
})();

function short(s, n) {
  s = String(s).replace(/\s+/g, ' ');
  return s.length > n ? s.slice(0, n) + '…' : s;
}

/* ---------- 规则 1：模块/课程/教材一一对应 ---------- */
rule(1, '模块 / 课程 / 教材一一对应', function (r) {
  const tbKeys = Object.keys(TEXTBOOK);
  const lessonIds = lessons.map(function (x) { return x.lesson.id; });
  const noTb = lessonIds.filter(function (id) { return !TEXTBOOK[id]; });
  const orphan = tbKeys.filter(function (k) { return lessonIds.indexOf(k) < 0; });
  r.facts.push(COURSE.length + ' 模块 / ' + lessons.length + ' 课 / ' + tbKeys.length + ' 章教材');
  if (noTb.length) r.issues.push('缺少教材的课：' + noTb.join(', '));
  if (orphan.length) r.issues.push('孤立教材 key：' + orphan.join(', '));
  const dupIds = lessonIds.filter(function (id, i) { return lessonIds.indexOf(id) !== i; });
  if (dupIds.length) r.issues.push('重复的 lesson id：' + Array.from(new Set(dupIds)).join(', '));
});

/* ---------- 规则 2：quiz 结构 + 渲染后题量 ---------- */
rule(2, 'quiz 结构完整，且 meta 渲染后的题量等于 quiz.length', function (r) {
  let badQuiz = [];
  let metaMismatch = [];
  let total = 0;
  lessons.forEach(function (x) {
    const l = x.lesson;
    const quiz = Array.isArray(l.quiz) ? l.quiz : [];
    total += quiz.length;
    quiz.forEach(function (q, i) {
      const ok = q && typeof q.q === 'string' && Array.isArray(q.options) && q.options.length === 4 &&
        typeof q.answer === 'number' && q.answer >= 0 && q.answer < 4 &&
        typeof q.explain === 'string' && q.explain.length > 0;
      if (!ok) badQuiz.push(l.id + '#' + (i + 1));
    });
    const tb = TEXTBOOK[l.id];
    if (!tb) return;
    const text = tbMetaText(tb, l);
    const m = text.match(META_QUIZ_RE);
    const got = m ? parseInt(m[0], 10) : null;
    if (got !== quiz.length) metaMismatch.push(l.id + '：meta 写 ' + got + '，实际 ' + quiz.length);
    if (/·\s*·/.test(text) || /·\s*$/.test(text) || /^\s*·/.test(text)) {
      metaMismatch.push(l.id + '：分隔符残留「' + text + '」');
    }
    const hits = text.match(/配套流程图/g) || [];
    if (hits.length > 1) metaMismatch.push(l.id + '：重复短语「配套流程图」×' + hits.length);
    /* 幂等自检：把渲染结果当原文再渲染一次，必须逐字相同（引擎只做字符串操作，不会累积） */
    const again = tbMetaText({ meta: text, blocks: tb.blocks }, l);
    if (again !== text) metaMismatch.push(l.id + '：补齐不幂等，二次渲染得「' + again + '」');
  });
  r.facts.push(lessons.length + ' 课 / ' + total + ' 题；结构异常 ' + badQuiz.length + ' 条；meta 题量或分隔符异常 ' + metaMismatch.length + ' 课');
  badQuiz.slice(0, 8).forEach(function (s) { r.issues.push('quiz 结构异常：' + s); });
  metaMismatch.slice(0, 8).forEach(function (s) { r.issues.push(s); });
});

/* ---------- 规则 3：flow 块 <-> 文案「流程图」 ---------- */
rule(3, '有 flow 块的章必须写「流程图」，无 flow 块的章不得写', function (r) {
  const missText = [];
  const extraText = [];
  let chapters = 0;
  let flowChapters = 0;
  let flowBlocks = 0;
  lessons.forEach(function (x) {
    const tb = TEXTBOOK[x.lesson.id];
    if (!tb) return;
    const st = tbStats(tb);
    chapters++;
    if (st.hasFlow) flowChapters++;
    (tb.blocks || []).forEach(function (b) { if (b.flow) flowBlocks++; });
    const text = tbMetaText(tb, x.lesson);
    const hasText = text.indexOf('流程图') >= 0;
    if (st.hasFlow && !hasText) missText.push(x.lesson.id + '（原文：' + (tb.meta || '') + '）');
    if (!st.hasFlow && hasText) extraText.push(x.lesson.id + '（原文：' + (tb.meta || '') + '）');
  });
  r.facts.push(flowBlocks + ' 个 flow 块 / ' + chapters + ' 章中 ' + flowChapters + ' 章有图、' + (chapters - flowChapters) + ' 章无图');
  if (missText.length) {
    r.issues.push('有 flow 块但文案缺「流程图」' + missText.length + ' 章：');
    missText.slice(0, 6).forEach(function (s) { r.issues.push('  · ' + s); });
  }
  if (extraText.length) {
    r.issues.push('无 flow 块但文案含「流程图」' + extraText.length + ' 章：');
    extraText.slice(0, 6).forEach(function (s) { r.issues.push('  · ' + s); });
  }
});

/* ---------- 规则 4：章内小节号唯一且递增 ---------- */
rule(4, '章内小节号唯一且递增（3.12.1 不算 3.1）', function (r) {
  const bad = [];
  let numbered = 0;
  lessons.forEach(function (x) {
    const tb = TEXTBOOK[x.lesson.id];
    if (!tb) return;
    const seen = {};
    const seq = [];
    (tb.blocks || []).forEach(function (b) {
      if (!b.h) return;
      const m = String(b.h).match(/^(\d+)\.(\d+)(?![\d.])/);
      if (!m) return;
      numbered++;
      const major = parseInt(m[1], 10);
      const minor = parseInt(m[2], 10);
      const key = major + '.' + minor;
      if (seen[key]) bad.push(x.lesson.id + '：小节号重复 ' + key + '（' + b.h + '）');
      seen[key] = true;
      seq.push({ major: major, minor: minor, heading: b.h });
    });
    for (let i = 1; i < seq.length; i++) {
      const a = seq[i - 1];
      const b = seq[i];
      if (b.major < a.major || (b.major === a.major && b.minor <= a.minor)) {
        bad.push(x.lesson.id + '：小节号不递增 ' + a.heading + ' -> ' + b.heading);
      }
    }
  });
  r.facts.push(numbered + ' 个带号小节标题');
  bad.slice(0, 8).forEach(function (s) { r.issues.push(s); });
  if (bad.length > 8) r.issues.push('… 共 ' + bad.length + ' 条');
});

/* ---------- 规则 5：code 块后跟 out 块的比例 ---------- */
rule(5, 'code 块后紧跟 out 块的比例 >= 55%', function (r) {
  const per = [];
  let codeAll = 0;
  let pairedAll = 0;
  lessons.forEach(function (x) {
    const tb = TEXTBOOK[x.lesson.id];
    if (!tb) return;
    const blocks = tb.blocks || [];
    let code = 0;
    let paired = 0;
    blocks.forEach(function (b, i) {
      if (!b.code) return;
      code++;
      if (blocks[i + 1] && blocks[i + 1].out) paired++;
    });
    codeAll += code;
    pairedAll += paired;
    if (code) per.push({ id: x.lesson.id, code: code, paired: paired, ratio: paired / code });
  });
  const ratio = codeAll ? pairedAll / codeAll : 0;
  r.facts.push(codeAll + ' 个 code / ' + pairedAll + ' 个紧跟 out / 全站 ' + (ratio * 100).toFixed(1) + '%');
  if (ratio + 1e-9 < 0.55) {
    r.issues.push('全站比例 ' + (ratio * 100).toFixed(1) + '% < 55%');
    per.slice().sort(function (a, b) { return a.ratio - b.ratio; }).slice(0, 5).forEach(function (c) {
      r.issues.push('  最差：' + c.id + ' ' + c.paired + '/' + c.code + ' (' + Math.round(c.ratio * 100) + '%)');
    });
  }
});

/* ---------- 规则 6：同章 60 汉字以上的段落不重复 ---------- */
rule(6, '同章内 60 汉字以上的段落不重复', function (r) {
  const dups = [];
  let longParas = 0;
  lessons.forEach(function (x) {
    const tb = TEXTBOOK[x.lesson.id];
    if (!tb) return;
    const seen = {};
    (tb.blocks || []).forEach(function (b) {
      const t = b.p || b.note;
      if (!t) return;
      if (cjkCount(t) < 60) return;
      longParas++;
      const key = String(t).replace(/<[^>]+>/g, '').replace(/\s+/g, '');
      if (seen[key]) dups.push(x.lesson.id + '：重复段落「' + short(key, 24) + '」');
      seen[key] = true;
    });
  });
  r.facts.push(longParas + ' 个 60 字以上段落');
  dups.slice(0, 8).forEach(function (s) { r.issues.push(s); });
  if (dups.length > 8) r.issues.push('… 共 ' + dups.length + ' 条');
});

/* ---------- 规则 7：禁用推荐写法 ---------- */
rule(7, '全库无「推荐写法」级别的 WebSecurityConfigurerAdapter / javax.persistence / SimpleDateFormat', function (r) {
  /* 每个禁用写法都配官方替代品：同一行出现替代品 => 属对照 / 迁移语境，不是在推荐旧写法 */
  const patterns = [
    { name: 'WebSecurityConfigurerAdapter', successor: 'SecurityFilterChain' },
    { name: 'javax.persistence', successor: 'jakarta.persistence' },
    { name: 'SimpleDateFormat', successor: 'DateTimeFormatter' }
  ];
  /* 判定口径：命中行若处于警示 / 对比 / 迁移语境（别用、不是线程安全、用 xxx 替代等），
     说明它是在劝退而不是推荐写法，不计 FAIL；只有作为正例出现才告警。 */
  const exemptRe = /(弃用|废弃|替代|取代|改用|换成|应换|正确做法|不要|别用|不能|禁止|避免|不安全|错乱|优势|缺点|坑|反例|不推荐|过时|淘汰|移除|不再|deprecated|legacy|兼容)/i;
  let hits = 0;
  let cautionedHits = 0;
  const warns = [];
  jsFiles.forEach(function (f) {
    const rel = path.relative(root, f);
    const lines = fs.readFileSync(f, 'utf8').split('\n');
    lines.forEach(function (line, i) {
      patterns.forEach(function (pat) {
        if (line.indexOf(pat.name) < 0) return;
        hits++;
        if (exemptRe.test(line) || line.indexOf(pat.successor) >= 0) { cautionedHits++; return; }
        warns.push(rel + ':' + (i + 1) + ' ' + pat.name + '「' + short(line, 60) + '」');
      });
    });
  });
  r.facts.push(hits + ' 处提及：' + cautionedHits + ' 处在对照/警示语境，' + warns.length + ' 处作为推荐写法');
  warns.slice(0, 10).forEach(function (s) { r.issues.push(s); });
  if (warns.length > 10) r.issues.push('… 共 ' + warns.length + ' 处');
});

/* ---------- 规则 8：版本口径（LTS = 25，Java 8~ 到 25） ---------- */
rule(8, '含「LTS」的章提到 25；含「Java 8~」的章覆盖到 25', function (r) {
  const ltsBad = [];
  const rangeBad = [];
  let ltsChapters = 0;
  let rangeChapters = 0;
  lessons.forEach(function (x) {
    const tb = TEXTBOOK[x.lesson.id];
    if (!tb) return;
    const text = (tb.blocks || []).map(tbText).join(' ');
    if (/LTS/.test(text)) {
      ltsChapters++;
      if (!/(^|[^0-9])25([^0-9]|$)/.test(text)) {
        ltsBad.push(x.lesson.id + '：「' + short(text.match(/.{0,22}LTS.{0,22}/)[0], 60) + '」未提 25');
      }
    }
    const rangeRe = /Java\s*8\s*[~～\-–—]\s*(\d+)/g;
    let m;
    while ((m = rangeRe.exec(text))) {
      rangeChapters++;
      if (m[1] !== '25') rangeBad.push(x.lesson.id + '：' + m[0] + ' 应为 Java 8~25');
    }
  });
  r.facts.push(ltsChapters + ' 章提到 LTS / ' + rangeChapters + ' 处 Java 8~ 区间');
  ltsBad.slice(0, 8).forEach(function (s) { r.issues.push(s); });
  rangeBad.slice(0, 8).forEach(function (s) { r.issues.push(s); });
});

/* ---------- 规则 9：所有 js 通过 node --check ---------- */
rule(9, '所有 js 文件通过 node --check', function (r) {
  const bad = [];
  jsFiles.forEach(function (f) {
    try {
      execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' });
    } catch (e) {
      bad.push(path.relative(root, f) + '：' + short(String(e.stderr || e.message), 90));
    }
  });
  r.facts.push(jsFiles.length + ' 个 js 文件');
  bad.forEach(function (s) { r.issues.push(s); });
});

/* ---------- 规则 10：模块 no 与下标一致 ---------- */
rule(10, '模块 no 与数组下标一致（01..N 连续）', function (r) {
  const bad = [];
  COURSE.forEach(function (m, i) {
    const want = String(i + 1).padStart(2, '0');
    if (String(m.no) !== want) bad.push('下标 ' + i + ' 的模块 no=' + m.no + '，应为 ' + want + '（' + m.id + '）');
  });
  r.facts.push(COURSE.length + ' 个模块，no 范围 ' + (COURSE[0] ? COURSE[0].no : '-') + '..' + (COURSE.length ? COURSE[COURSE.length - 1].no : '-'));
  bad.slice(0, 8).forEach(function (s) { r.issues.push(s); });
});

/* ---------- 附加规则 11：index.html 引用的脚本都存在 ---------- */
rule(11, '附加：index.html 引用的脚本文件都存在', function (r) {
  r.facts.push(proj.scripts.length + ' 个 script 引用');
  if (proj.missing.length) {
    r.issues.push('引用但文件不存在 ' + proj.missing.length + ' 个：' + proj.missing.join(', '));
  }
  if (proj.failed.length) {
    proj.failed.forEach(function (s) {
      r.issues.push('脚本在 vm 桩环境抛错（未必是数据问题）：' + short(s, 110));
    });
  }
});

/* ---------- 附加规则 12：排布顺序表覆盖全部模块并已生效 ---------- */
rule(12, '附加：js/curriculum-order.js 的 ORDER 覆盖全部模块且已生效', function (r) {
  const f = path.join(root, 'js/curriculum-order.js');
  if (!fs.existsSync(f)) { r.issues.push('缺少 js/curriculum-order.js（模块排布顺序表）'); return; }
  const src = fs.readFileSync(f, 'utf8');
  const m = src.match(/var ORDER = (\[[^\]]*\])/);
  if (!m) { r.issues.push('未在 js/curriculum-order.js 中找到 ORDER 数组'); return; }
  let ORDER;
  try { ORDER = JSON.parse(m[1]); } catch (e) { r.issues.push('ORDER 解析失败：' + e.message); return; }
  const ids = COURSE.map(function (x) { return x.id; });
  const missing = ids.filter(function (id) { return ORDER.indexOf(id) < 0; });
  const extra = ORDER.filter(function (id) { return ids.indexOf(id) < 0; });
  r.facts.push(ORDER.length + ' 个顺序项，' + ids.length + ' 个模块');
  if (missing.length) r.issues.push('ORDER 缺少模块：' + missing.join(', '));
  if (extra.length) r.issues.push('ORDER 含不存在的模块 id：' + extra.join(', '));
  if (!missing.length && !extra.length && JSON.stringify(ORDER) !== JSON.stringify(ids)) {
    r.issues.push('实际数组顺序与 ORDER 不一致：' + ids.join(','));
  }
});

/* ---------- 附加规则 13/14 的公共零件：章尾两节的定位与统计 ---------- */
function normHead(h) {
  return String(h).replace(/^\d+(\.\d+)*\s*/, '').trim();
}
function cjkCount(s) {
  const m = String(s).match(/[\u4e00-\u9fff]/g);
  return m ? m.length : 0;
}
function noTags(s) {
  return String(s).replace(/<[^>]+>/g, '');
}
function blockKey(b) {
  const ks = Object.keys(b || {});
  return ks.length ? ks[0] : '?';
}
function chapterIds() {
  return Object.keys(TEXTBOOK).sort();
}
function tailSections(tb) {
  const blocks = (tb && tb.blocks) || [];
  const heads = [];
  blocks.forEach(function (b, i) { if (b.h != null) heads.push(i); });
  const out = [];
  heads.forEach(function (start, k) {
    const end = k + 1 < heads.length ? heads[k + 1] : blocks.length;
    const body = [];
    for (let i = start + 1; i < end; i++) body.push(blocks[i]);
    out.push({ h: blocks[start].h, body: body });
  });
  return out;
}

/* ---------- 附加规则 13：章尾倒数第二节「常见追问」格式统一 ---------- */
rule(13, '附加：章尾倒数第二节「常见追问」为 1 flow（可选）+ 1 个 3–6 条 list，条条含问/答前缀', function (r) {
  const ids = chapterIds();
  const bad = [];
  let withList = 0; let qa = 0; let withFlow = 0;
  ids.forEach(function (id) {
    const secs = tailSections(TEXTBOOK[id]);
    if (secs.length < 2) { bad.push(id + '：章尾不足两节（实得 ' + secs.length + ' 节）'); return; }
    const faq = secs[secs.length - 2];
    if (normHead(faq.h).indexOf('常见追问') < 0) {
      bad.push(id + '：倒数第二节不是「常见追问」，实为「' + faq.h + '」');
      return;
    }
    let list = null; let flows = 0;
    faq.body.forEach(function (b) {
      const k = blockKey(b);
      if (k === 'flow') { flows++; if (flows > 1) bad.push(id + '：常见追问出现多个 flow 块'); return; }
      if (k === 'list') { if (list) bad.push(id + '：常见追问出现多个 list 块'); else list = b.list; return; }
      bad.push(id + '：常见追问含不允许的块「' + k + '」');
    });
    if (!list) { bad.push(id + '：常见追问缺 list 块'); return; }
    withList++; qa += list.length; if (flows === 1) withFlow++;
    if (list.length < 3 || list.length > 6) bad.push(id + '：常见追问 ' + list.length + ' 条，要求 3–6 条');
    list.forEach(function (it, k) {
      const n = k + 1; const s = String(it);
      if (!/^<b>问：/.test(s)) bad.push(id + '：常见追问第 ' + n + ' 条未以「<b>问：」开头');
      if (s.indexOf('<details') >= 0) bad.push(id + '：常见追问第 ' + n + ' 条含 details（应写成纯文本问答）');
      const at = s.indexOf('<br>答：');
      if (at < 0) { bad.push(id + '：常见追问第 ' + n + ' 条缺「<br>答：」'); return; }
      const c = cjkCount(noTags(s.slice(at + 6)));
      if (c < 50) bad.push(id + '：常见追问第 ' + n + ' 条答案仅 ' + c + ' 汉字，要求 50–320');
      if (c > 320) bad.push(id + '：常见追问第 ' + n + ' 条答案 ' + c + ' 汉字，要求 50–320');
    });
  });
  r.facts.push(ids.length + ' 章章尾 / ' + withList + ' 个 list / ' + qa + ' 条问答 / ' + withFlow + ' 章带 flow');
  bad.slice(0, 40).forEach(function (s) { r.issues.push(s); });
  if (bad.length > 40) r.issues.push('……另有 ' + (bad.length - 40) + ' 条同类问题省略');
});

/* ---------- 附加规则 14：章尾末节「自测与练习」答案折叠完整 ---------- */
rule(14, '附加：章尾末节「自测与练习」为 1 个 3–9 题 ol（可选 1 p 前置 + 1 note 后置）；每题折叠答案要么三段式、要么是代码块（代码题不写「预期现象」）', function (r) {
  const ids = chapterIds();
  const bad = [];
  // 答案形态统一交给 answerShape()（与 tools/audit-tail.js 同源）：
  //   1 块：任一合法 lang（data-lang 缺省按 java；纯 shell 命令行答案合法）
  //   2 块：两块 lang 必须不同，含 shell 时 shell 必须是最后一块，两块之间只允许空白字符
  //   ≥3 块 / 两块同 lang / shell 在前 / gap 非空白 -> 违规
  let withOl = 0; let total = 0; let okQ = 0; let proseQ = 0; let codeQ = 0;
  let openTagsSum = 0; let closeTagsSum = 0;
  const shapeHist = { prose: 0, combo: {}, single: 0, pair: 0, triple: 0, irregular: 0 };
  ids.forEach(function (id) {
    const secs = tailSections(TEXTBOOK[id]);
    if (!secs.length) { bad.push(id + '：没有任何 h 小节'); return; }
    const self = secs[secs.length - 1];
    if (normHead(self.h).indexOf('自测与练习') < 0) {
      bad.push(id + '：末节不是「自测与练习」，实为「' + self.h + '」');
      return;
    }
    let ol = null; let pBefore = 0; let noteAfter = 0;
    self.body.forEach(function (b) {
      const k = blockKey(b);
      if (k === 'ol') { if (ol) bad.push(id + '：自测与练习出现多个 ol 块'); else ol = b.ol; return; }
      if (k === 'p') { if (ol) bad.push(id + '：自测与练习的 p 块出现在 ol 之后'); else pBefore++; return; }
      if (k === 'note') { if (!ol) bad.push(id + '：自测与练习的 note 块出现在 ol 之前'); else noteAfter++; return; }
      bad.push(id + '：自测与练习含不允许的块「' + k + '」');
    });
    if (pBefore > 1) bad.push(id + '：自测与练习有 ' + pBefore + ' 个 p 块，上限 1');
    if (noteAfter > 1) bad.push(id + '：自测与练习有 ' + noteAfter + ' 个 note 块，上限 1');
    if (!ol) { bad.push(id + '：自测与练习缺 ol 块'); return; }
    withOl++;
    if (ol.length < 3 || ol.length > 9) bad.push(id + '：自测与练习 ' + ol.length + ' 题，要求 3–9 题');
    ol.forEach(function (item, k) {
      const n = k + 1; const s = String(item); total++;
      const mark = bad.length;
      const d = s.indexOf('<details class="tb-ans">');
      if (d < 0) { bad.push(id + '：自测第 ' + n + ' 题缺 <details class="tb-ans">'); total--; return; }
      if (s.indexOf('<summary>参考答案</summary>') < 0) bad.push(id + '：自测第 ' + n + ' 题的 summary 不是「参考答案」');
      if (s.indexOf('</details>') < 0) bad.push(id + '：自测第 ' + n + ' 题 details 未闭合');
      const ds = s.indexOf('<div class="ans-body">');
      if (ds < 0) bad.push(id + '：自测第 ' + n + ' 题缺 <div class="ans-body">');
      let body = ds < 0 ? s.slice(d) : s.slice(ds + 22);
      const cut = body.indexOf('</div></details>');
      if (cut >= 0) body = body.slice(0, cut);
      if (/<p[ >]/.test(body)) bad.push(id + '：自测第 ' + n + ' 题答案内含 <p>（answer 里只放行内标签）');
      const shape = answerShape(body);
      openTagsSum += shape.openTags; closeTagsSum += shape.closeTags;
      const parts = shape.shape.split(' + ');
      if (!shape.code) shapeHist.prose++;
      else if (parts.length <= 3) {
        const key = parts.join('+');
        shapeHist.combo[key] = (shapeHist.combo[key] || 0) + 1;
        if (parts.length === 1) shapeHist.single++;
        else if (parts.length === 2) shapeHist.pair++;
        else shapeHist.triple++;
      } else shapeHist.irregular++;
      if (shape.code) {
        codeQ++;
        shape.issues.forEach(function (s) { bad.push(id + '：自测第 ' + n + ' 题：' + s); });
        if (body.indexOf('<b>预期现象</b>') >= 0) bad.push(id + '：自测第 ' + n + ' 题是代码题，答案里不该再有「预期现象」');
      } else {
        proseQ++;
        if (body.indexOf('<b>预期现象</b>：') < 0) bad.push(id + '：自测第 ' + n + ' 题缺 <b>预期现象</b>：（非代码题必须三段式）');
        if (body.indexOf('<b>为什么</b>：') < 0) bad.push(id + '：自测第 ' + n + ' 题缺 <b>为什么</b>：');
        if (body.indexOf('<b>要点</b>：') < 0) bad.push(id + '：自测第 ' + n + ' 题缺 <b>要点</b>：');
        const c = cjkCount(noTags(body));
        if (c < 80) bad.push(id + '：自测第 ' + n + ' 题答案正文仅 ' + c + ' 汉字，要求 80–400');
        if (c > 400) bad.push(id + '：自测第 ' + n + ' 题答案正文 ' + c + ' 汉字，要求 80–400');
      }
      if (bad.length === mark) okQ++;
    });
  });
  r.facts.push(ids.length + ' 章 / ' + withOl + ' 个自测 ol / ' + total + ' 题，折叠答案合规 ' + okQ + ' 题');
  r.facts.push('答案形态：三段式 ' + proseQ + ' 题 / 代码块 ' + codeQ + ' 题');
  const comboKeys = Object.keys(shapeHist.combo).sort();
  const comboList = comboKeys.map(function (k) { return k + ' ' + shapeHist.combo[k] + ' 题'; }).join('、');
  r.facts.push('代码题块形态（按语言组合）：' + (comboList || '无'));
  r.facts.push('答案 pre 开闭平衡：开 ' + openTagsSum + ' / 闭 ' + closeTagsSum);
  r.facts.push('其中：单块 ' + shapeHist.single + ' 题 / 双块 ' + shapeHist.pair + ' 题 / 3 块 ' + shapeHist.triple + ' 题' +
    (shapeHist.irregular ? ' / 违规形态 ' + shapeHist.irregular + ' 题' : ''));
  bad.slice(0, 40).forEach(function (s) { r.issues.push(s); });
  if (bad.length > 40) r.issues.push('……另有 ' + (bad.length - 40) + ' 条同类问题省略');
});
/* ============================================================
   附加规则 15/16 的公共零件：lang 允许集、命令表、首行判定
   ★ 常量 CODE_LANGS / LANG_CMDS 与函数 meaningfulLine / shellHead /
     javaHead / langIssue 在 tools/tag-audit.js 里有一份刻意的副本。
     本轮文件边界只允许动 verify.js / audit-tail.js / tag-audit.js，
     没有可新建的公共模块，所以只能重复；改命令表或改判定必须两处同步
     （tag-audit.js 文件头有同样的备注）。
   ============================================================ */
const CODE_LANGS = ['java', 'shell', 'sql', 'xml', 'props', 'http', 'docker', 'text'];
const LANG_CMDS = ('javac java javap jps jcmd jmap jstack jstat jfr jshell jar jdeps jlink jarsigner jpackage jconsole jdb ' +
  'where type defaults xcode-select ' +
  'mvn mvnw gradle gradlew git ' +
  'docker curl npm npx openssl keytool mysql psql redis-cli ss netstat lsof kill export echo cd ls mkdir rm cp mv ' +
  'source which readlink unzip tar grep sed awk chmod ulimit sysctl top ps wrk ab jq ' +
  // 补充项：基线表之外、但同样会出现在命令块首行的常用命令（降低误报，不影响判定方向）
  'cat less more head tail tee touch ln pwd env printenv printf find xargs sort uniq wc cut tr diff make ' +
  'sudo su apt apt-get brew yum dnf rpm dpkg systemctl service launchctl ssh scp rsync telnet nc ping dig ' +
  'nslookup whoami id hostname uname date file base64 shasum sha256sum node python python3 pip pip3 pnpm yarn go ' +
  'wait sleep time nohup seq open code vim nano exit true false').split(' ');

/* shell 关键字与结构词：出现在首行首词也算合法（for i in 1 2 3; do … done）
   ★ 与 LANG_CMDS 分开：javaHead 用 LANG_CMDS 判「java 块里塞命令」，关键字不能进去，
   否则以 for/if 开头的合法 Java 代码会被误判为命令行。 */
const SHELL_WORDS = ('for while until if case do then else elif fi done esac function time seq').split(' ');

/* 取出正文里所有 <pre class="tb-ans-code" ...> 代码块（含 data-lang） */
function answerPres(html) {
  const out = [];
  let at = 0;
  for (;;) {
    const i = html.indexOf('<pre class="tb-ans-code"', at);
    if (i < 0) break;
    const gt = html.indexOf('>', i);
    if (gt < 0) break;
    const tag = html.slice(i, gt + 1);
    const m = /data-lang="([^"]*)"/.exec(tag);
    const close = html.indexOf('</pre>', gt + 1);
    out.push({ tag: tag, lang: m ? m[1] : '', open: i, start: gt + 1, end: close < 0 ? html.length : close, closed: close >= 0 });
    at = close < 0 ? html.length : close + 6;
  }
  return out;
}

/* 答案体形态判定（纯静态，返回 issues 不带章/题前缀，由调用方拼「章 id + 第 N 题」）
   合法形态：0 块（三段式）/ 1–3 块；各块 lang 必须两两不同；若出现 shell，shell 必须是最后一块；
             第一个块之前只允许空白；相邻两块之间只允许空白字符；
             最后一个块之后只允许空白，或既有的「<b>要点</b>…」收尾段
   违规形态：第 4 块及以上 / 两块以上 lang 重复（含两个 java）/ shell 出现在非最后位置 /
             gap 非空白 / 代码块之外有残留文本 / 多余的 </pre> 未配对
   长度门槛按块自身 lang：shell 非空白 ≥10，其余合法 lang 非空白 ≥20；每块都必须闭合、内部不得含未转义 '<'
   ★ 本函数与 tools/audit-tail.js 里的 answerPres / answerShape 是刻意的同源副本
     （audit-tail 不 require verify.js，两个脚本各自独立运行），改判定必须两处同步。 */
function answerShape(body) {
  const PRE_OPEN = '<pre class="tb-ans-code"';
  const raw = String(body == null ? '' : body);
  const issues = [];
  const openCount = raw.split(PRE_OPEN).length - 1;
  const closeCount = raw.split('</pre>').length - 1;
  const extraClose = closeCount - openCount;
  if (extraClose > 0) {
    issues.push('多出 ' + extraClose + ' 个 </pre>（未配对：<pre class="tb-ans-code" ' + openCount + ' 个，</pre> ' + closeCount + ' 个）');
  }
  // 多出来的闭合标签先剔除，后面的残留文本与 gap 分析只针对真实块结构
  let src = raw;
  for (let k = 0; k < extraClose; k++) {
    const j = src.lastIndexOf('</pre>');
    if (j < 0) break;
    src = src.slice(0, j) + src.slice(j + 6);
  }
  const pres = answerPres(src);
  const langOf = function (p) { const l = String(p.lang == null ? '' : p.lang).trim(); return l || 'java'; };
  const shape = pres.length ? pres.map(langOf).join(' + ') : '三段式';
  if (!pres.length) return { code: false, shape: shape, pres: pres, issues: issues, openTags: openCount, closeTags: closeCount };
  if (pres.length > 3) {
    issues.push('答案出现 ' + pres.length + ' 个代码块（形态「' + shape + '」），最多 3 块');
  }
  for (let i = 1; i < pres.length; i++) {
    if (!pres[i - 1].closed) continue;
    const gap = src.slice(pres[i - 1].end + 6, pres[i].open);
    if (gap.replace(/\s/g, '') !== '') {
      issues.push('第 ' + i + ' 块与第 ' + (i + 1) + ' 块之间只能有空白字符（形态「' + shape + '」），实为「' + gap.replace(/\s+/g, ' ').trim().slice(0, 40) + '」');
    }
  }
  const seen = {};
  pres.forEach(function (p, i) {
    const l = langOf(p);
    if (seen[l] != null) issues.push('第 ' + (seen[l] + 1) + ' 块与第 ' + (i + 1) + ' 块的 lang 都是「' + l + '」（形态「' + shape + '」），各块 lang 必须两两不同');
    else seen[l] = i;
  });
  pres.forEach(function (p, i) {
    if (langOf(p) === 'shell' && i !== pres.length - 1) {
      issues.push('shell 代码块必须是最后一块（形态「' + shape + '」）：第 ' + (i + 1) + ' 块是 shell，后面还有 ' + (pres.length - i - 1) + ' 块');
    }
  });
  pres.forEach(function (p) {
    const name = langOf(p);
    const min = name === 'shell' ? 10 : 20;
    if (!p.closed) { issues.push(name + ' 代码块未闭合（形态「' + shape + '」）'); return; }
    const inner = src.slice(p.start, p.end);
    const n = inner.replace(/\s/g, '').length;
    if (n < min) issues.push(name + ' 代码块内容过短（非空白字符 ' + n + '，要求 ≥' + min + '，形态「' + shape + '」）');
    if (inner.indexOf('<') >= 0) issues.push(name + ' 代码块含未转义的 <（应写 &lt;，形态「' + shape + '」）');
  });
  const excerpt = function (s) {
    const t = s.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    return (t || s.replace(/\s+/g, ' ').trim()).slice(0, 40);
  };
  const head = src.slice(0, pres[0].open);
  if (head.replace(/\s/g, '') !== '') {
    issues.push('代码块之外有残留文本「' + excerpt(head) + '」（在第一个代码块之前）');
  }
  const tail = src.slice(pres[pres.length - 1].end + 6);
  if (tail.replace(/\s/g, '') !== '' && !/^\s*<b>要点<\/b>/.test(tail)) {
    issues.push('代码块之外有残留文本「' + excerpt(tail) + '」（在最后一个代码块之后）');
  }
  return { code: true, shape: shape, pres: pres, issues: issues, openTags: openCount, closeTags: closeCount };
}

/* 首个「非空非注释行」；shell 用 # 注释，java 用 // * 注释；反斜杠续行合并到同一行 */
function meaningfulLine(code, commentRe) {
  const lines = String(code == null ? '' : code).replace(/\r\n?/g, '\n').split('\n');
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].replace(/\s+$/, '');
    let t = line.trim();
    if (!t) continue;
    if (commentRe && commentRe.test(t)) continue;
    while (t.slice(-1) === '\\' && i + 1 < lines.length) {
      i++;
      line = t.slice(0, -1) + ' ' + lines[i].trim();
      t = line.trim();
    }
    return t;
  }
  return '';
}

/* 路径形态首词视为合法命令（可执行文件按路径直接调用，不需要在命令表里）：
     /usr/libexec/java_home -V、./gradlew build、../script.sh、~/bin/tool、
     C:\tools\jdk\bin\java、.\gradlew.bat、$JAVA_HOME/bin/java、${JAVA_HOME}/bin/java */
function isPathCmd(word) {
  /* 去掉成对引号后再判形态："$J21/bin/java" -cp out Hello 是命令，不是输出 */
  var qw = String(word).replace(/^["']|["']$/g, "");
  if (/^(\/|\.{1,2}[\\/]|~\/|[A-Za-z]:[\\/]|\\\\)/.test(qw)) return true;
  return /^\$\{?[A-Za-z_][A-Za-z0-9_]*\}?[\\/]/.test(qw);
}

/* shell 块首行判定：返回 '' 合规，否则返回原因 */
function shellHead(line) {
  let s = String(line).trim();
  if (!s) return '取不到首个非空非注释行（空块或整块只有注释）';
  if (s.indexOf('$ ') === 0) return '';
  for (let guard = 0; guard < 8; guard++) {
    const m = /^([A-Za-z_][A-Za-z0-9_]*)=/.exec(s);
    if (!m) break;
    let rest = s.slice(m[0].length);
    if (rest.slice(0, 2) === '$(') {
      let depth = 0; let j = 0;
      for (; j < rest.length; j++) {
        const c = rest.charAt(j);
        if (c === '(') depth++;
        else if (c === ')') { depth--; if (!depth) { j++; break; } }
      }
      rest = rest.slice(j);
    } else {
      const v = /^\S*/.exec(rest);
      rest = rest.slice(v[0].length);
    }
    s = rest.replace(/^\s+/, '');
    if (!s) return '';
  }
  const w = /^[^\s;|&<>]+/.exec(s);
  if (!w) return '首行取不到命令：「' + short(line, 40) + '」';
  if (LANG_CMDS.indexOf(w[0]) < 0 && SHELL_WORDS.indexOf(w[0]) < 0 && !isPathCmd(w[0])) {
    return '首行首个命令「' + w[0] + '」不在命令表内';
  }
  return '';
}

/* java 块首行判定：不得是 "$ " 提示符或命令行 */
function javaHead(line) {
  const t = String(line).trim();
  if (!t) return '';
  if (t.charAt(0) === '$') return 'java 块首行以「' + short(t, 12) + '」命令提示符开头';
  const w = /^(\S+)/.exec(t);
  if (!w) return '';
  const word = w[1];
  if (/[().;="'%{}\[\]]/.test(word)) return '';
  if (LANG_CMDS.indexOf(word) >= 0) return 'java 块首行首个词是命令「' + word + '」';
  return '';
}

function langIssue(code, lang) {
  /* 注释口径：# 与 // 注释行跳过；另认 Windows cmd 的 :: 与 REM（教材有 cmd 版命令块） */
  if (lang === 'shell') return shellHead(meaningfulLine(code, /^(#|\/\/|::|rem\b)/i));
  /* lang=text（目录树 / ASCII 图 / 纯文本）不做内容断言 */
  if (lang === 'java') return javaHead(meaningfulLine(code, /^(\/\/|\/\*|\*)/));
  return '';
}

/* ---------- 附加规则 15：每个 code 块 / 答案代码块都显式写合法 lang ---------- */
rule(15, '附则：每个教材 code 块与每条答案代码块都显式声明合法 lang（' + CODE_LANGS.join(' / ') + '）', function (r) {
  const ids = chapterIds();
  const bad = [];
  const tbHist = {}; const ansHist = {};
  CODE_LANGS.forEach(function (k) { tbHist[k] = 0; ansHist[k] = 0; });
  let tbAll = 0; let tbMissing = 0; let tbIllegal = 0;
  let ansAll = 0; let ansMissing = 0; let ansIllegal = 0;
  const norm = function (v) { return v == null ? '' : String(v).trim(); };

  ids.forEach(function (id) {
    const blocks = (TEXTBOOK[id] && TEXTBOOK[id].blocks) || [];
    blocks.forEach(function (b, i) {
      if (!Object.prototype.hasOwnProperty.call(b, 'code')) return;
      tbAll++;
      const lang = norm(b.lang);
      const where = id + ' #' + i + (b.title ? '（标题「' + b.title + '」）' : '');
      if (!lang) { tbMissing++; bad.push(where + '：教材 code 块缺 lang'); return; }
      if (CODE_LANGS.indexOf(lang) < 0) { tbIllegal++; bad.push(where + '：教材 code 块 lang「' + lang + '」不在允许集'); return; }
      tbHist[lang]++;
    });
    blocks.forEach(function (b, i) {
      if (!Object.prototype.hasOwnProperty.call(b, 'ol')) return;
      b.ol.forEach(function (item, q) {
        answerPres(String(item)).forEach(function (pre) {
          ansAll++;
          const lang = norm(pre.lang);
          const where = id + ' #' + i + ' 第 ' + (q + 1) + ' 题';
          if (!lang) { ansMissing++; bad.push(where + '：答案代码块缺 data-lang'); return; }
          if (CODE_LANGS.indexOf(lang) < 0) { ansIllegal++; bad.push(where + '：答案 data-lang「' + lang + '」不在允许集'); return; }
          ansHist[lang]++;
        });
      });
    });
  });

  r.facts.push('教材 code ' + tbAll + ' 块：' + CODE_LANGS.map(function (k) { return k + '=' + tbHist[k]; }).join(' ') +
    '／缺 lang ' + tbMissing + '／非法 ' + tbIllegal);
  r.facts.push('答案代码块 ' + ansAll + ' 块：' + CODE_LANGS.map(function (k) { return k + '=' + ansHist[k]; }).join(' ') +
    '／缺 data-lang ' + ansMissing + '／非法 ' + ansIllegal);
  bad.slice(0, 10).forEach(function (s) { r.issues.push(s); });
  if (bad.length > 10) r.issues.push('……共 ' + bad.length + ' 处，另有 ' + (bad.length - 10) + ' 处省略');
});

/* ---------- 附加规则 16：lang 与内容自洽（防贴错标签） ---------- */
rule(16, '附则：lang 与内容自洽——shell 块首行必须是已知命令或「$ 」提示符，java 块不得是命令行', function (r) {
  const ids = chapterIds();
  const bad = [];
  let tbShell = 0; let tbJava = 0; let ansShell = 0; let ansJava = 0;
  const check = function (code, lang, where) {
    const msg = langIssue(code, lang);
    if (msg) bad.push(where + ' lang=' + lang + '：' + msg + '（首行「' + short(meaningfulLine(code, lang === 'shell' ? /^#/ : /^(\/\/|\/\*|\*)/), 50) + '」）');
  };

  ids.forEach(function (id) {
    const blocks = (TEXTBOOK[id] && TEXTBOOK[id].blocks) || [];
    blocks.forEach(function (b, i) {
      if (!Object.prototype.hasOwnProperty.call(b, 'code')) return;
      const lang = b.lang == null ? '' : String(b.lang).trim();
      if (lang !== 'shell' && lang !== 'java') return;
      if (lang === 'shell') tbShell++; else tbJava++;
      check(b.code, lang, id + ' #' + i);
    });
    blocks.forEach(function (b, i) {
      if (!Object.prototype.hasOwnProperty.call(b, 'ol')) return;
      b.ol.forEach(function (item, q) {
        answerPres(String(item)).forEach(function (pre) {
          const lang = String(pre.lang == null ? '' : pre.lang).trim();
          if (lang !== 'shell' && lang !== 'java') return;
          if (lang === 'shell') ansShell++; else ansJava++;
          check(String(item).slice(pre.start, pre.end), lang, id + ' #' + i + ' 第 ' + (q + 1) + ' 题');
        });
      });
    });
  });

  r.facts.push('教材：shell ' + tbShell + ' 块 / java ' + tbJava + ' 块；答案：shell ' + ansShell + ' 块 / java ' + ansJava + ' 块');
  bad.slice(0, 10).forEach(function (s) { r.issues.push(s); });
  if (bad.length > 10) r.issues.push('……共 ' + bad.length + ' 处，另有 ' + (bad.length - 10) + ' 处省略');
});

/* ============================================================
   四、输出
   ============================================================ */
if (metaArg.length) {
  console.log('=== 抽查章 meta（离线复算 = 页面渲染口径）===');
  metaArg.forEach(function (id) {
    const item = lessons.find(function (x) { return x.lesson.id === id; });
    const tb = TEXTBOOK[id];
    if (!item || !tb) { console.log(id + '：未找到该课/教材'); return; }
    const st = tbStats(tb);
    console.log('- ' + id + '｜flow 块 ' + (st.hasFlow ? '有' : '无') + '｜quiz ' + item.lesson.quiz.length + ' 题');
    console.log('  原始：' + (tb.meta || '(空)'));
    console.log('  渲染：' + tbMetaText(tb, item.lesson));
  });
  console.log('');
}

let failedCount = 0;
results.forEach(function (r) {
  const tag = r.pass ? 'PASS' : 'FAIL';
  if (!r.pass) failedCount++;
  console.log('[' + tag + '] ' + r.no + '. ' + r.title);
  r.facts.forEach(function (f) { console.log('       实测：' + f); });
  r.issues.forEach(function (s) { console.log('       ' + s); });
});

const requiredFailed = results.filter(function (r) { return r.no <= 10 && !r.pass; }).length;
console.log('');
console.log('汇总：必测规则 ' + (results.filter(function (r) { return r.no <= 10; }).length - requiredFailed) + '/' +
  results.filter(function (r) { return r.no <= 10; }).length + ' PASS，' + failedCount + ' 条规则 FAIL（含附加规则）');
const code = failedCount ? 1 : 0;
console.log('退出码：' + code);
process.exit(code);
