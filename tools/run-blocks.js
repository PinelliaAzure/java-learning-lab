#!/usr/bin/env node
/* tools/run-blocks.js —— 教材 Java 代码块「真编译 + 真运行 + 输出比对」可选闸门
 *
 * 用法：
 *   node tools/run-blocks.js                     全量跑（纯静态站的全部 Java 代码块 + 自测答案块）
 *   node tools/run-blocks.js --chapter regex     只跑某章（可重复传多个 --chapter）
 *   node tools/run-blocks.js --chapter executors --limit 5
 *   node tools/run-blocks.js --json              输出机器可读结果（JSON）
 *   node tools/run-blocks.js --strict            出现 C 类编译错误或 OUT-DIFF 时退出码 1
 *   node tools/run-blocks.js --jobs 8            并发编译数（默认 4）
 *   node tools/run-blocks.js --root <路径>       项目根（默认当前目录）
 *
 * 退出码：默认恒为 0（可选工具，不做 CI 红线）；--strict 下有编译失败或 OUT-DIFF -> 1；参数/环境错误 -> 2
 *
 * 数据来源：按 index.html 里 <script src> 的真实顺序用 node vm 加载（跳过 engine/search/menu/
 * tools/code-exercises/code-lab/exams 这几个运行期脚本），读 window.JAVA_TEXTBOOK。
 * 收两类样本：
 *   1) 教材正文 code 块（block.lang === 'java'，代码是未转义原文）
 *   2) 章尾自测答案里的 <pre class="tb-ans-code" data-lang="java">（HTML 片段，必须先做实体反转义）
 * 注意：教材 code 块的真实结构是 {lang, code, title} 三键（不是两键），lang 与 code 同级。
 *
 * 预筛跳过（不计入失败），分两类：
 *   片段类：无类型声明 / 顶层游离语句（类后面还有 new B(); 之类）/ 混入命令行（Java 类后面跟着
 *           javac、java、mvn 等）/ 多个 public 类（一块展示两个 public 类，无法单文件编译）
 *   依赖类：第三方 import / 含占位符 / 正文明确标注「故意报错」
 * 是否「完整编译单元」由 scanUnit() 顶层词法扫描判定（跳过注释、字符串、字符、文本块，按 depth 0
 * 的 { } ; 切片段），不靠正则撞 class 关键字 —— 关键字只出现在注释里的块会被正确归为无类型声明。
 * 每个样本都在自己的临时目录里编译与运行（javac -d 同一目录，子进程 cwd 也是该目录），跑完整棵
 * 临时目录删除 —— 教材里大量 File I/O 示例会往当前目录写 a.txt / *.bin，cwd 不隔离就会污染仓库。
 *
 * 编译通过的、源码里有 static void main 的，真跑一次（超时 10s），stdout 与该块紧跟的 out 块
 * 逐行比对（去首尾空行、保留内部空行）；stdout 不符时会再拿 stdout+stderr 比一次（教材 out 块
 * 常把异常栈也算进「输出」），两者都不符才记 OUT-DIFF。
 */
'use strict';

var fs = require('fs');
var os = require('os');
var vm = require('vm');
var path = require('path');
var child = require('child_process');

var RELEASE = '25';
var RUN_TIMEOUT_MS = 10000;
var COMPILE_TIMEOUT_MS = 60000;

/* ============================================================
   一、参数
   ============================================================ */
function parseArgs(argv) {
  var o = {
    root: process.cwd(), chapters: [], limit: 0,
    json: false, strict: false, jobs: 4, help: false, bad: ''
  };
  for (var i = 0; i < argv.length; i++) {
    var a = argv[i];
    if (a === '--root') o.root = path.resolve(argv[++i] || '');
    else if (a === '--chapter') { var c = argv[++i]; if (c) o.chapters.push(c); }
    else if (a === '--limit') o.limit = parseInt(argv[++i], 10) || 0;
    else if (a === '--json') o.json = true;
    else if (a === '--strict') o.strict = true;
    else if (a === '--jobs') o.jobs = Math.max(1, Math.min(16, parseInt(argv[++i], 10) || 1));
    else if (a === '-h' || a === '--help') o.help = true;
    else if (!o.bad) o.bad = a;
  }
  return o;
}

var USAGE = [
  '用法：node tools/run-blocks.js [--chapter <章id>]... [--limit N] [--json] [--strict] [--jobs N] [--root <路径>]',
  '  不带参数 = 全量；退出码默认 0（可选工具），--strict 时编译失败/OUT-DIFF 返回 1。'
].join('\n');

/* ============================================================
   二、按 index.html 的 script 顺序在 vm 里加载教材数据
   （字典序会漏掉 textbook-flows.js 运行期注入的 flow 块）
   ============================================================ */
function loadData(root) {
  var html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  var re = /<script\s+src="([^"]+)"><\/script>/g;
  var srcs = [];
  var m;
  while ((m = re.exec(html))) srcs.push(m[1]);

  var ctx = {
    window: {},
    document: { addEventListener: function () {}, querySelector: function () { return null; } },
    localStorage: { getItem: function () { return null; }, setItem: function () {} },
    location: { hash: '' },
    console: console
  };
  ctx.window = ctx;
  vm.createContext(ctx);

  /* 运行期脚本：不产出数据，且在 node 里需要 DOM，一律跳过 */
  var SKIP = /js\/(engine|search|menu|tools|code-exercises|code-lab|exams)\.js$/;
  for (var j = 0; j < srcs.length; j++) {
    if (SKIP.test(srcs[j])) continue;
    vm.runInContext(fs.readFileSync(path.join(root, srcs[j]), 'utf8'), ctx, { filename: srcs[j] });
  }
  return ctx.JAVA_TEXTBOOK || {};
}

/* ============================================================
   三、收集样本
   ============================================================ */
function unescapeHtml(s) {
  return String(s)
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
}

/* 取某章 blocks 里第 i 个块前后各一两个块的纯文本，用于判定「正文标注故意报错」 */
function nearbyText(blocks, i) {
  var parts = [];
  for (var k = i - 2; k <= i + 2; k++) {
    if (k === i || k < 0 || k >= blocks.length) continue;
    var b = blocks[k];
    if (b.p != null) parts.push(String(b.p));
    else if (b.note != null) parts.push(String(b.note));
    else if (b.li != null) parts.push(String(b.li));
  }
  return parts.join('\n').replace(/<[^>]+>/g, '');
}

function collectSamples(T, only) {
  var ids = only.length ? only : Object.keys(T);
  var out = [];
  var missing = [];
  var answerPre = /<pre class="tb-ans-code"([^>]*)>([\s\S]*?)<\/pre>/g;

  for (var n = 0; n < ids.length; n++) {
    var id = ids[n];
    var tb = T[id];
    if (!tb) { missing.push(id); continue; }
    var blocks = tb.blocks || [];

    for (var i = 0; i < blocks.length; i++) {
      var b = blocks[i];
      if (b.lang !== 'java' || b.code === undefined) continue;
      var next = blocks[i + 1];
      var expected = next && next.out != null ? String(next.out) : null;
      out.push({
        chapter: id,
        kind: 'block',
        label: id + '#b' + i,
        name: b.title ? String(b.title) : '',
        code: String(b.code),
        expected: expected,
        near: nearbyText(blocks, i)
      });
    }

    var q = 0;
    for (var k = 0; k < blocks.length; k++) {
      var bo = blocks[k];
      if (!bo.ol) continue;
      for (var t = 0; t < bo.ol.length; t++) {
        var item = String(bo.ol[t]);
        answerPre.lastIndex = 0;
        var mm;
        while ((mm = answerPre.exec(item))) {
          var attrs = mm[1] || '';
          var lm = /data-lang="([^"]*)"/.exec(attrs);
          if (!lm || lm[1] !== 'java') continue;
          q++;
          out.push({
            chapter: id,
            kind: 'ans',
            label: id + '#ans' + q,
            name: '',
            code: unescapeHtml(mm[2]),
            expected: null,
            near: item.slice(0, mm.index).replace(/<[^>]+>/g, '')
          });
        }
      }
    }
  }
  return { samples: out, missing: missing };
}

/* ============================================================
   四、预筛分类（跳过的样本不计入失败）
   ============================================================ */
var JDK_IMPORT_ROOTS = /^(java|jdk|org\.w3c|org\.xml|org\.ietf)\./;
var NON_JDK_JAVAX = /^javax\.(servlet|persistence|validation|inject|enterprise|ws|mail|transaction|cache|jms|xml\.bind)\./;

function thirdPartyImport(code) {
  var lines = code.split('\n');
  for (var i = 0; i < lines.length; i++) {
    var m = /^\s*import\s+(?:static\s+)?([A-Za-z_$][\w$]*(?:\.[\w$]+)*)/.exec(lines[i]);
    if (!m) continue;
    var pkg = m[1];
    if (NON_JDK_JAVAX.test(pkg)) return pkg.split('.').slice(0, 2).join('.');
    if (!JDK_IMPORT_ROOTS.test(pkg)) return pkg.split('.').slice(0, 2).join('.');
  }
  return '';
}

/* 顶层词法扫描：跳过注释 / 字符串 / 字符 / 文本块，按 depth 0 的 { } ; 把源码切成顶层片段。
   教材里很多块是片段而不是完整编译单元（类后面直接跟一句 new B();、或者 Java 类后面接着
   javac/java 命令行），直接送 javac 只会得到「需要类、接口…」这类噪声，必须先分流。 */
function scanUnit(code) {
  var frags = [];
  var buf = '';
  var depth = 0;
  var state = 'n';
  var i = 0;
  var n = code.length;
  while (i < n) {
    var ch = code.charAt(i);
    var two = code.substr(i, 2);
    if (state === 'n') {
      if (two === '//') { state = 'lc'; i += 2; buf += ' '; continue; }
      if (two === '/*') { state = 'bc'; i += 2; buf += ' '; continue; }
      if (code.substr(i, 3) === '"""') { state = 'tb'; i += 3; buf += '""'; continue; }
      if (ch === '"') { state = 's'; i += 1; buf += '""'; continue; }
      if (ch === "'") { state = 'c'; i += 1; buf += "''"; continue; }
      if (ch === '{') { depth += 1; buf += ch; i += 1; continue; }
      if (ch === '}') {
        depth -= 1;
        buf += ch;
        i += 1;
        if (depth <= 0) { depth = 0; frags.push(buf); buf = ''; }
        continue;
      }
      if (ch === ';' && depth === 0) { buf += ch; i += 1; frags.push(buf); buf = ''; continue; }
      buf += ch;
      i += 1;
      continue;
    }
    if (state === 'lc') { if (ch === '\n') state = 'n'; i += 1; continue; }
    if (state === 'bc') { if (two === '*/') { state = 'n'; i += 2; } else i += 1; continue; }
    if (state === 's') { if (ch === '\\') { i += 2; continue; } if (ch === '"') state = 'n'; i += 1; continue; }
    if (state === 'c') { if (ch === '\\') { i += 2; continue; } if (ch === "'") state = 'n'; i += 1; continue; }
    if (state === 'tb') { if (code.substr(i, 3) === '"""') { state = 'n'; i += 3; } else i += 1; continue; }
    i += 1;
  }
  if (buf.replace(/\s+/g, '')) frags.push(buf);
  return frags;
}

var PKG_IMPORT_RE = /^\s*(?:package|import)\s/;
var ANNO_RE = '(?:@\\s*[A-Za-z_$][\\w$.]*(?:\\s*\\([^)]*\\))?\\s*)*';
var MODS_RE = '(?:(?:public|protected|private|static|final|abstract|sealed|non-sealed|strictfp)\\s+)*';
var DECL_RE = new RegExp('^\\s*' + ANNO_RE + MODS_RE + '(?:@\\s*interface|class|interface|enum|record)\\s+[A-Za-z_$][\\w$]*');
var PUB_DECL_RE = new RegExp('^\\s*' + ANNO_RE + 'public\\s');
var CLI_RE = /^\s*(?:javac|java|javap|jar|jshell|mvn|gradle|docker|kubectl|curl|ps)\b/;

/* 判定一块是不是「完整编译单元」：decls=顶层类型声明数，pubDecls=其中 public 的个数，
   stray=顶层除 package/import/类型声明以外的游离语句（片段特征）。 */
function analyzeUnit(code) {
  var frags = scanUnit(code);
  var out = { decls: 0, pubDecls: 0, stray: [] };
  for (var i = 0; i < frags.length; i++) {
    var f = frags[i];
    if (PKG_IMPORT_RE.test(f)) continue;
    if (DECL_RE.test(f)) {
      out.decls += 1;
      if (PUB_DECL_RE.test(f)) out.pubDecls += 1;
      continue;
    }
    if (!f.replace(/[\s;]/g, '')) continue;
    out.stray.push(f.replace(/\s+/g, ' ').slice(0, 60));
  }
  return out;
}

function hasPlaceholder(code) {
  if (code.indexOf('\u2026') >= 0) return true;                 /* 中文省略号 */
  if (/\bXXX\b/.test(code)) return true;
  if (/\bTODO\b/.test(code)) return true;
  /* 变长参数 ... 是合法 Java，先把 varargs 声明抹掉再看剩下的 ... */
  var stripped = code.replace(/[A-Za-z_$][\w$.<>\[\],\s]*\.\.\.\s*[A-Za-z_$][\w$]*/g, ' ');
  if (/\.\.\./.test(stripped)) return true;
  if (/待补|此处省略|略去|自行补全/.test(code)) return true;
  return false;
}

function classify(s) {
  var unit = analyzeUnit(s.code);
  if (!unit.decls) return 'no-type';
  if (unit.stray.length) {
    for (var i = 0; i < unit.stray.length; i++) {
      if (CLI_RE.test(unit.stray[i])) return 'mixed-cli';
    }
    return 'stray';
  }
  if (unit.pubDecls > 1) return 'multi-public';
  var tp = thirdPartyImport(s.code);
  if (tp) return 'third-party';
  if (hasPlaceholder(s.code)) return 'placeholder';
  if (/故意/.test(s.near) || /故意/.test(s.code)) return 'intentional-error';
  return '';
}

/* ============================================================
   五、文件名 / 公共类名 / main
   ============================================================ */
var TYPE_RE = /(?:^|[^\w$])(public\s+)?((?:final\s+|abstract\s+|static\s+|sealed\s+|non-sealed\s+|strictfp\s+)*)(class|interface|enum|record|@interface)\s+([A-Za-z_$][\w$]*)/g;

function publicTypeName(code) {
  TYPE_RE.lastIndex = 0;
  var m;
  while ((m = TYPE_RE.exec(code))) {
    if (m[1]) return m[3] === '@interface' ? m[4] : m[4];
  }
  return '';
}

function hasMain(code) {
  return /static\s+void\s+main\s*\(\s*(?:final\s+)?String/.test(code) ||
         /static\s+void\s+main\s*\(\s*(?:final\s+)?java\.lang\.String/.test(code);
}

function sanitize(id) {
  return String(id).replace(/[^A-Za-z0-9_$]+/g, '_');
}

/* ============================================================
   六、编译 + 运行 + 比对
   ============================================================ */
function normalizeLines(text) {
  var lines = String(text == null ? '' : text).replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  while (lines.length && !lines[0].trim()) lines.shift();
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
  return lines;
}

function diffLines(expected, actual, max) {
  var out = [];
  var n = Math.max(expected.length, actual.length);
  for (var i = 0; i < n && out.length < max; i++) {
    var e = i < expected.length ? expected[i] : '<缺失行>';
    var a = i < actual.length ? actual[i] : '<多余行>';
    if (e !== a) {
      out.push({ line: i + 1, expected: e, actual: a });
    }
  }
  return out;
}

function clip(s, n) {
  s = String(s);
  return s.length > n ? s.slice(0, n) + '\u2026' : s;
}

function firstErrorLine(stderr) {
  var lines = String(stderr || '').split('\n');
  for (var i = 0; i < lines.length; i++) {
    if (/error:/.test(lines[i])) return clip(lines[i].trim(), 160);
  }
  for (var j = 0; j < lines.length; j++) {
    if (lines[j].trim()) return clip(lines[j].trim(), 160);
  }
  return '（javac 无输出）';
}

function listClasses(dir) {
  var files;
  try { files = fs.readdirSync(dir); } catch (e) { return []; }
  var out = [];
  for (var i = 0; i < files.length; i++) {
    if (!/\.class$/.test(files[i])) continue;
    if (files[i].indexOf('$') >= 0) continue;
    out.push(files[i].slice(0, -6));
  }
  out.sort();
  return out;
}

function compileOnce(dir, file, cb) {
  child.execFile('javac', [
    '--release', RELEASE, '-encoding', 'UTF-8', '-nowarn', '-d', dir, file
  ], { timeout: COMPILE_TIMEOUT_MS, maxBuffer: 4 * 1024 * 1024, cwd: dir }, function (err, stdout, stderr) {
    cb(!err, String(stderr || '') + String(stdout || ''));
  });
}

function runOnce(dir, cls, cb) {
  child.execFile('java', [
    '-Dfile.encoding=UTF-8', '-Dstdout.encoding=UTF-8', '-Dstderr.encoding=UTF-8',
    '-cp', dir, cls
  /* cwd 必须是该样本自己的临时目录：教材里大量 File I/O 示例会往当前目录写 a.txt / *.bin，
     若继承本进程的 cwd（项目根）就会污染仓库 */
  ], { timeout: RUN_TIMEOUT_MS, maxBuffer: 4 * 1024 * 1024, cwd: dir }, function (err, stdout, stderr) {
    var timedOut = !!(err && err.killed);
    var code = err && typeof err.code === 'number' ? err.code : (err ? 1 : 0);
    cb({ ok: !err, timedOut: timedOut, code: code, stdout: String(stdout || ''), stderr: String(stderr || '') });
  });
}

function processSample(sample, tmpRoot, cb) {
  var dir = path.join(tmpRoot, sanitize(sample.chapter), sanitize(sample.label));
  var res = {
    label: sample.label, chapter: sample.chapter, kind: sample.kind,
    status: 'compiled', file: '', expected: sample.expected != null, diff: [], note: ''
  };
  try { fs.mkdirSync(dir, { recursive: true }); } catch (e) {
    res.status = 'error'; res.note = '建临时目录失败：' + e.message; return cb(res);
  }

  var pub = publicTypeName(sample.code);
  var base = pub ? pub : 'S_' + sanitize(sample.chapter) + '_' + sanitize(sample.label.replace(/^[^#]*#/, ''));
  var file = path.join(dir, base + '.java');
  try { fs.writeFileSync(file, sample.code, 'utf8'); } catch (e) {
    res.status = 'error'; res.note = '写文件失败：' + e.message; return cb(res);
  }
  res.file = file;

  compileOnce(dir, file, function (ok, diag) {
    if (!ok) {
      res.status = 'compile-fail';
      res.note = firstErrorLine(diag);
      return cb(res);
    }
    var classes = listClasses(dir);
    if (!classes.length) { res.status = 'compile-fail'; res.note = 'javac 通过但没有产出 class 文件'; return cb(res); }

    if (!hasMain(sample.code)) { res.status = 'compiled'; return cb(res); }

    /* 公共类优先，其余按名字顺序逐个试；遇到「没有 main 方法」就换下一个候选 */
    var candidates = classes.slice();
    if (pub && candidates.indexOf(pub) >= 0) {
      candidates.splice(candidates.indexOf(pub), 1);
      candidates.unshift(pub);
    }
    var attempts = Math.min(candidates.length, 3);
    var i = 0;
    function tryNext() {
      if (i >= attempts) {
        res.status = 'no-main'; res.note = '所有候选类都找不到 main'; return cb(res);
      }
      var cls = candidates[i++];
      runOnce(dir, cls, function (r) {
        if (!r.ok && /Main method not found|could not find or load main class/i.test(r.stderr)) return tryNext();
        res.status = 'ran';
        res.note = cls;
        if (r.timedOut) {
          res.status = 'run-timeout';
          res.note = cls + '（超过 ' + Math.round(RUN_TIMEOUT_MS / 1000) + 's）';
          return cb(res);
        }
        if (!r.ok) {
          res.runtimeError = true;
          res.note = cls + '；' + firstErrorLine(r.stderr);
        }
        if (sample.expected == null) { if (!r.ok) res.status = 'run-error'; return cb(res); }

        var want = normalizeLines(sample.expected);
        var gotOut = normalizeLines(r.stdout);
        var gotAll = normalizeLines(String(r.stdout).replace(/[\r\n]+$/, '') + (r.stderr ? '\n' + r.stderr : ''));
        var sameOut = want.join('\n') === gotOut.join('\n');
        var sameAll = want.join('\n') === gotAll.join('\n');
        if (sameOut || sameAll) {
          res.status = 'pass';
          if (!sameOut && sameAll) res.note = '（stdout+stderr 才匹配）';
          return cb(res);
        }
        res.status = 'out-diff';
        res.diff = diffLines(want, gotOut, 5);
        res.want = want.length;
        res.got = gotOut.length;
        /* 并发/时序造成的乱序：行集相同、只是先后不同，标注出来便于人工判读 */
        if (want.slice().sort().join('\n') === gotOut.slice().sort().join('\n')) {
          res.note = '（行集相同，仅顺序不同：并发/时序导致，不是教材写错）';
        }
        cb(res);
      });
    }
    tryNext();
  });
}

/* 有界并发池（ES5 回调） */
function runPool(items, concurrency, worker, done) {
  var total = items.length;
  if (!total) return done();
  var next = 0, active = 0, finished = 0;
  function pump() {
    while (active < concurrency && next < total) {
      active++;
      /* eslint-disable no-loop-func */
      (function (item) {
        worker(item, function () {
          active--; finished++;
          if (finished === total) done(); else pump();
        });
      })(items[next++]);
    }
  }
  pump();
}

/* ============================================================
   七、主流程
   ============================================================ */
function main() {
  var o = parseArgs(process.argv.slice(2));
  if (o.help) { console.log(USAGE); process.exit(0); }
  if (o.bad) { console.error('未知参数：' + o.bad + '\n' + USAGE); process.exit(2); }
  if (!fs.existsSync(path.join(o.root, 'index.html'))) {
    console.error('找不到 ' + path.join(o.root, 'index.html') + '\n' + USAGE);
    process.exit(2);
  }
  var javacVer = '';
  try {
    javacVer = String(child.execFileSync('javac', ['-version'], { encoding: 'utf8' })).trim();
  } catch (e) {
    console.error('本机没有可用的 javac，无法做真编译校验：' + e.message);
    process.exit(2);
  }

  var T = loadData(o.root);
  var got = collectSamples(T, o.chapters);
  if (got.missing.length) {
    console.error('找不到这些章：' + got.missing.join(', '));
    process.exit(2);
  }

  var samples = got.samples;
  var skip = { 'no-type': 0, 'stray': 0, 'mixed-cli': 0, 'multi-public': 0,
               'third-party': 0, 'placeholder': 0, 'intentional-error': 0 };
  var toCompile = [];
  for (var i = 0; i < samples.length; i++) {
    var why = classify(samples[i]);
    if (why) { skip[why]++; samples[i].skip = why; continue; }
    toCompile.push(samples[i]);
  }
  var overLimit = 0;
  if (o.limit > 0 && toCompile.length > o.limit) {
    overLimit = toCompile.length - o.limit;
    toCompile = toCompile.slice(0, o.limit);
  }

  var tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'jll-run-blocks-'));
  var t0 = Date.now();
  var results = [];

  runPool(toCompile, o.jobs, function (sample, next) {
    processSample(sample, tmpRoot, function (res) {
      results.push(res);
      next();
    });
  }, function () {
    var elapsed = (Date.now() - t0) / 1000;
    try { fs.rmSync(tmpRoot, { recursive: true, force: true }); } catch (e) {}

    var counts = {
      compiled: 0, compileFail: 0, ran: 0, pass: 0, outDiff: 0,
      runError: 0, runTimeout: 0, noMain: 0, error: 0
    };
    for (var r = 0; r < results.length; r++) {
      var st = results[r].status;
      if (st === 'compile-fail') counts.compileFail++;
      else if (st === 'pass') { counts.compiled++; counts.ran++; counts.pass++; }
      else if (st === 'out-diff') { counts.compiled++; counts.ran++; counts.outDiff++; }
      else if (st === 'ran') { counts.compiled++; counts.ran++; }
      else if (st === 'compiled') counts.compiled++;
      else if (st === 'run-error') { counts.compiled++; counts.ran++; counts.runError++; }
      else if (st === 'run-timeout') { counts.compiled++; counts.ran++; counts.runTimeout++; }
      else if (st === 'no-main') counts.compiled++;
      else counts.error++;
    }
    counts.runnable = results.filter(function (x) { return x.status === 'pass' || x.status === 'out-diff' || x.status === 'ran'; }).length;

    var blockN = 0, ansN = 0;
    for (var s = 0; s < samples.length; s++) { if (samples[s].kind === 'ans') ansN++; else blockN++; }

    var summary = {
      root: o.root,
      javac: javacVer,
      chapters: o.chapters,
      samples: samples.length,
      samplesBlock: blockN,
      samplesAnswer: ansN,
      skipped: skip,
      skippedTotal: skip['no-type'] + skip['stray'] + skip['mixed-cli'] + skip['multi-public'] +
                   skip['third-party'] + skip['placeholder'] + skip['intentional-error'],
      submitted: toCompile.length,
      overLimit: overLimit,
      counts: counts,
      elapsedSec: Math.round(elapsed * 10) / 10,
      results: results
    };

    if (o.json) {
      console.log(JSON.stringify(summary, null, 2));
    } else {
      printText(summary);
    }
    var bad = counts.compileFail + counts.outDiff + counts.error;
    if (o.strict && bad > 0) process.exit(1);
    process.exit(0);
  });
}

function pad(s, n) {
  s = String(s);
  while (s.length < n) s += ' ';
  return s;
}

/* 编译失败按首条错误归类，便于判断「多少是真代码问题、多少是依赖前文上下文」 */
function errKind(note) {
  note = String(note || '');
  if (/找不到符号/.test(note)) return '找不到符号（依赖前文上下文 / 缺 import）';
  if (/程序包[\s\S]*不存在/.test(note)) return '程序包不存在（外部依赖）';
  if (/是公共的/.test(note)) return '多个 public 类（一块多文件）';
  if (/非法字符/.test(note)) return '非法字符（混入非 Java 内容）';
  if (/需要类、接口|语句不应在|非法的开头/.test(note)) return '不是完整编译单元';
  if (/没有 void main/.test(note)) return '紧凑源文件缺 main';
  return '其他';
}

function printText(sum) {
  var c = sum.counts;
  console.log('=== run-blocks · 教材 Java 代码块真编译 + 真运行比对 ===');
  console.log('根目录  ' + sum.root);
  console.log('编译器  ' + sum.javac + '（--release ' + RELEASE + '）');
  console.log('范围    ' + (sum.chapters.length ? sum.chapters.join(',') : '全部章节'));
  console.log('----------------------------------------------------------------');
  console.log(pad('样本', 12) + sum.samples + '（教材块 ' + sum.samplesBlock + ' + 自测答案 ' + sum.samplesAnswer + '）');
  console.log(pad('跳过', 12) + sum.skippedTotal + '（其中）');
  console.log('            片段：无类型声明 ' + sum.skipped['no-type'] +
    ' / 顶层游离语句 ' + sum.skipped['stray'] +
    ' / 混入命令行 ' + sum.skipped['mixed-cli'] +
    ' / 多个 public 类 ' + sum.skipped['multi-public']);
  console.log('            依赖：第三方 import ' + sum.skipped['third-party'] +
    ' / 占位符 ' + sum.skipped['placeholder'] +
    ' / 故意报错 ' + sum.skipped['intentional-error']);
  console.log(pad('送编', 12) + sum.submitted + (sum.overLimit ? '（--limit 截断，另有 ' + sum.overLimit + ' 个未送编）' : ''));
  console.log(pad('编译通过', 12) + c.compiled + (c.compileFail ? '   失败 ' + c.compileFail + '（C 类）' : '   失败 0'));
  console.log(pad('可直跑', 12) + c.runnable + '   运行异常 ' + c.runError + '   超时 ' + c.runTimeout + '   无 main ' + c.noMain);
  console.log(pad('OUT-DIFF', 12) + c.outDiff + (c.pass ? '   输出全对 ' + c.pass : ''));
  console.log(pad('耗时', 12) + sum.elapsedSec + 's');
  console.log('----------------------------------------------------------------');

  var fails = sum.results.filter(function (r) { return r.status === 'compile-fail'; });
  var diffs = sum.results.filter(function (r) { return r.status === 'out-diff'; });
  var errs = sum.results.filter(function (r) { return r.status === 'error' || r.status === 'run-timeout'; });
  var runErr = sum.results.filter(function (r) { return r.status === 'run-error'; });

  if (fails.length) {
    console.log('[编译失败 / C 类]  按首条错误分组');
    var kinds = {};
    for (var q = 0; q < fails.length; q++) {
      var kk = errKind(fails[q].note);
      kinds[kk] = (kinds[kk] || 0) + 1;
    }
    for (var kn in kinds) {
      if (Object.prototype.hasOwnProperty.call(kinds, kn)) console.log('  ' + pad(kinds[kn], 4) + kn);
    }
    console.log('  --- 逐条 ---');
    for (var i = 0; i < fails.length; i++) {
      console.log('  FAIL  ' + fails[i].label + '  ' + fails[i].note);
    }
    console.log('----------------------------------------------------------------');
  }
  if (diffs.length) {
    console.log('[OUT-DIFF 逐行比对（前 5 行差异）]');
    for (var j = 0; j < diffs.length; j++) {
      var d = diffs[j];
      console.log('  DIFF  ' + d.label + '  期望 ' + d.want + ' 行 / 实得 ' + d.got + ' 行 ' + (d.note || ''));
      for (var k = 0; k < d.diff.length; k++) {
        var one = d.diff[k];
        console.log('          L' + one.line + '  - ' + clip(one.expected, 140));
        console.log('          L' + one.line + '  + ' + clip(one.actual, 140));
      }
    }
    console.log('----------------------------------------------------------------');
  }
  if (runErr.length) {
    console.log('[运行抛异常（不比对，仅提示）]');
    for (var q = 0; q < runErr.length; q++) console.log('  RUN   ' + runErr[q].label + '  ' + runErr[q].note);
    console.log('----------------------------------------------------------------');
  }
  if (errs.length) {
    console.log('[环境/超时问题]');
    for (var z = 0; z < errs.length; z++) console.log('  ' + errs[z].status.toUpperCase() + '  ' + errs[z].label + '  ' + errs[z].note);
    console.log('----------------------------------------------------------------');
  }
  if (!fails.length && !diffs.length) {
    console.log('没有编译失败，也没有 OUT-DIFF。');
  }
}

main();
