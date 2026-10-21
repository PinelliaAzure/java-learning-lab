#!/usr/bin/env node
// tools/tag-audit.js —— 教材 code 块 / 答案代码块 的 lang 只读体检器（零依赖，只用 Node 内置模块）
// 用法：
//   node tools/tag-audit.js                    全站汇总表（每章一行）+ 全站合计 + 非 java 清单 + 疑似错标清单
//   node tools/tag-audit.js <章id...>          只看指定章（逐块详表）
//   node tools/tag-audit.js --root <目录> ...  指定项目根（默认 cwd）
// 退出码：0 无发现；1 有疑似错标（shell 首行不是命令 / java 首行是命令行）
//
// ★ 判定口径与 tools/verify.js 的规则 15/16 必须一致。本轮文件边界只允许动
//   verify.js / audit-tail.js / 新建 tag-audit.js，没有可新建的公共模块，因此
//   CODE_LANGS / LANG_CMDS / meaningfulLine / shellHead / javaHead / langIssue
//   在这里是刻意重复的一份副本：改命令表或改判定，两处必须同步。
//   块序号 = 该章 blocks 数组下标（0 起），与 verify.js 规则 15/16 的定位写法一致。
var fs = require('fs');
var vm = require('vm');
var path = require('path');

var ROOT = process.cwd();
var only = [];
var argv = process.argv.slice(2);
for (var ai = 0; ai < argv.length; ai++) {
  if (argv[ai] === '--root') { ROOT = argv[++ai]; continue; }
  only.push(argv[ai]);
}

/* ---------- 与 verify.js 规则 15/16 同步的判定零件 ---------- */
var CODE_LANGS = ['java', 'shell', 'sql', 'xml', 'props', 'http', 'docker', 'text'];
/* 输出用标签：只为非 ASCII 友好的语言给中文名，其余原样 */
var LANG_LABEL = { text: '文本' };
function labelOf(lang) { return LANG_LABEL[lang] || lang; }
// java 注释行：// 开头、/* 开头、* 续行（用 new RegExp 写，避免转义层级差异）
var JAVA_COMMENT_RE = new RegExp('^(//|/[*]|[*])');
var SHELL_COMMENT_RE = new RegExp('^(#|//|::|rem\\b)', 'i');
var LANG_CMDS = ('javac java javap jps jcmd jmap jstack jstat jfr jshell jar jdeps jlink jarsigner jpackage jconsole jdb ' +
  'mvn mvnw gradle gradlew git ' +
  'docker curl npm npx openssl keytool mysql psql redis-cli ss netstat lsof kill export echo cd ls mkdir rm cp mv ' +
  'source which readlink unzip tar grep sed awk chmod ulimit sysctl top ps wrk ab jq ' +
  'cat less more head tail tee touch ln pwd env printenv printf find xargs sort uniq wc cut tr diff make ' +
  'sudo su apt apt-get brew yum dnf rpm dpkg systemctl service launchctl ssh scp rsync telnet nc ping dig ' +
  'nslookup whoami id hostname uname date file base64 shasum sha256sum node python python3 pip pip3 pnpm yarn go ' +
  'wait sleep time nohup seq open code vim nano exit true false').split(' ');

function meaningfulLine(code, commentRe) {
  var lines = String(code == null ? '' : code).replace(/\r\n?/g, '\n').split('\n');
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].replace(/\s+$/, '');
    var t = line.trim();
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

function shellHead(line) {
  var s = String(line).trim();
  if (!s) return '取不到首个非空非注释行（空块或整块只有注释）';
  if (s.indexOf('$ ') === 0) return '';
  for (var guard = 0; guard < 8; guard++) {
    var m = /^([A-Za-z_][A-Za-z0-9_]*)=/.exec(s);
    if (!m) break;
    var rest = s.slice(m[0].length);
    if (rest.slice(0, 2) === '$(') {
      var depth = 0; var j = 0;
      for (; j < rest.length; j++) {
        var c = rest.charAt(j);
        if (c === '(') depth++;
        else if (c === ')') { depth--; if (!depth) { j++; break; } }
      }
      rest = rest.slice(j);
    } else {
      var v = /^\S*/.exec(rest);
      rest = rest.slice(v[0].length);
    }
    s = rest.replace(/^\s+/, '');
    if (!s) return '';
  }
  var w = /^[^\s;|&<>]+/.exec(s);
  if (!w) return '首行取不到命令：「' + clip(line, 40) + '」';
  if (LANG_CMDS.indexOf(w[0]) < 0) return '首行首个命令「' + w[0] + '」不在命令表内';
  return '';
}

function javaHead(line) {
  var t = String(line).trim();
  if (!t) return '';
  if (t.charAt(0) === '$') return 'java 块首行以「' + clip(t, 12) + '」命令提示符开头';
  var w = /^(\S+)/.exec(t);
  if (!w) return '';
  var word = w[1];
  if (/[().;="'%{}\[\]]/.test(word)) return '';
  if (LANG_CMDS.indexOf(word) >= 0) return 'java 块首行首个词是命令「' + word + '」';
  return '';
}

function langIssue(code, lang) {
  if (lang === 'shell') return shellHead(meaningfulLine(code, SHELL_COMMENT_RE));
  if (lang === 'java') return javaHead(meaningfulLine(code, JAVA_COMMENT_RE));
  return '';
}

/* 取出正文里所有 <pre class="tb-ans-code" ...> 代码块（含 data-lang） */
function answerPres(html) {
  var out = [];
  var at = 0;
  for (;;) {
    var i = html.indexOf('<pre class="tb-ans-code"', at);
    if (i < 0) break;
    var gt = html.indexOf('>', i);
    if (gt < 0) break;
    var tag = html.slice(i, gt + 1);
    var m = /data-lang="([^"]*)"/.exec(tag);
    var close = html.indexOf('</pre>', gt + 1);
    out.push({ lang: m ? m[1] : '', start: gt + 1, end: close < 0 ? html.length : close });
    at = close < 0 ? html.length : close + 6;
  }
  return out;
}

/* ---------- 数据加载：按 index.html 的 <script src> 真实顺序 ---------- */
function loadData() {
  var html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  var re = /<script\s+src="([^"]+)"/g;
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
  var SKIP = /js\/(engine|search|menu|tools|code-exercises|code-lab|exams)\.js$/;
  var loaded = 0;
  for (var j = 0; j < srcs.length; j++) {
    if (SKIP.test(srcs[j])) continue;
    var f = path.join(ROOT, srcs[j]);
    if (!fs.existsSync(f)) continue;
    vm.runInContext(fs.readFileSync(f, 'utf8'), ctx, { filename: srcs[j] });
    loaded++;
  }
  return { TEXTBOOK: ctx.JAVA_TEXTBOOK || {}, scripts: srcs.length, loaded: loaded };
}

/* ---------- 小工具 ---------- */
function clip(s, n) {
  var t = String(s).replace(/\s+/g, ' ');
  return t.length > n ? t.slice(0, n) + '…' : t;
}
/* 显示宽度：CJK 记 2 列，保证表头与 ASCII 数据列对齐 */
function dw(s) {
  var t = String(s); var n = 0;
  for (var i = 0; i < t.length; i++) n += t.charCodeAt(i) > 0x2e80 ? 2 : 1;
  return n;
}
function pad(s, n) {
  var t = String(s);
  while (dw(t) < n) t += ' ';
  return t;
}
function firstLine(code) {
  var lines = String(code == null ? '' : code).split('\n');
  for (var i = 0; i < lines.length; i++) if (lines[i].trim()) return lines[i].trim();
  return '';
}
function histStr(hist, missing, illegal) {
  var parts = [];
  for (var i = 0; i < CODE_LANGS.length; i++) {
    var k = CODE_LANGS[i];
    if (hist[k]) parts.push(labelOf(k) + ' ' + hist[k]);
  }
  if (missing) parts.push('缺 ' + missing);
  if (illegal) parts.push('非法 ' + illegal);
  return parts.length ? parts.join(' / ') : '—';
}
function newHist() {
  var h = {};
  for (var i = 0; i < CODE_LANGS.length; i++) h[CODE_LANGS[i]] = 0;
  return h;
}

/* ---------- 单章体检 ---------- */
function auditChapter(id, tb) {
  var blocks = (tb && tb.blocks) || [];
  var res = {
    id: id, tbTotal: 0, ansTotal: 0,
    tbHist: newHist(), ansHist: newHist(),
    tbMissing: 0, tbIllegal: 0, ansMissing: 0, ansIllegal: 0,
    nonJava: [], suspects: []
  };
  blocks.forEach(function (b, i) {
    if (!Object.prototype.hasOwnProperty.call(b, 'code')) return;
    res.tbTotal++;
    var lang = b.lang == null ? '' : String(b.lang).trim();
    if (!lang) res.tbMissing++;
    else if (CODE_LANGS.indexOf(lang) < 0) res.tbIllegal++;
    else res.tbHist[lang]++;
    var msg = lang ? langIssue(b.code, lang) : '';
    if (msg) res.suspects.push({ where: '#' + i, lang: lang || '(缺)', msg: msg, first: firstLine(b.code) });
    if (lang !== 'java') res.nonJava.push({ where: '#' + i, lang: lang || '(缺)', first: firstLine(b.code), title: b.title || '' });
  });
  blocks.forEach(function (b, i) {
    if (!Object.prototype.hasOwnProperty.call(b, 'ol')) return;
    b.ol.forEach(function (item, q) {
      answerPres(String(item)).forEach(function (pre) {
        res.ansTotal++;
        var lang = pre.lang == null ? '' : String(pre.lang).trim();
        if (!lang) res.ansMissing++;
        else if (CODE_LANGS.indexOf(lang) < 0) res.ansIllegal++;
        else res.ansHist[lang]++;
        var code = String(item).slice(pre.start, pre.end);
        var msg = lang ? langIssue(code, lang) : '';
        var where = '#' + i + ' 第' + (q + 1) + '题';
        if (msg) res.suspects.push({ where: where, lang: lang || '(缺)', msg: msg, first: firstLine(code) });
        if (lang !== 'java') res.nonJava.push({ where: where, lang: lang || '(缺)', first: firstLine(code), title: '' });
      });
    });
  });
  return res;
}

/* ---------- 输出 ---------- */
var data = loadData();
var T = data.TEXTBOOK;
var allIds = Object.keys(T).sort();
var ids = only.length ? only : allIds;
var rows = [];
var miss = [];
ids.forEach(function (id) {
  if (!T[id]) { miss.push(id); return; }
  rows.push(auditChapter(id, T[id]));
});

console.log('=== tag-audit：教材 code 块 / 答案代码块 的 lang 体检（只读）===');
console.log('数据：' + data.scripts + ' 个 script 引用，按 index.html 顺序加载 ' + data.loaded + ' 个（跳过 engine/search/menu/tools/code-exercises/code-lab/exams）');
console.log('口径：块序号 = blocks 数组下标（0 起）；允许 lang：' + CODE_LANGS.join(' / '));
console.log('');

if (only.length) {
  /* 指定章：逐块详表 */
  rows.forEach(function (x) {
    console.log('章 ' + x.id);
    console.log('  教材 code ' + x.tbTotal + ' 块（' + histStr(x.tbHist, x.tbMissing, x.tbIllegal) + '）');
    console.log('  答案代码块 ' + x.ansTotal + ' 块（' + histStr(x.ansHist, x.ansMissing, x.ansIllegal) + '）');
    if (x.nonJava.length) {
      console.log('  非 java 块清单：');
      x.nonJava.forEach(function (n) {
        console.log('    ' + x.id + '  ' + pad(n.where, 12) + pad(labelOf(n.lang), 8) + clip(n.first, 60));
      });
    } else {
      console.log('  非 java 块清单：无');
    }
    if (x.suspects.length) {
      console.log('  疑似错标：');
      x.suspects.forEach(function (s) {
        console.log('    ' + x.id + '  ' + pad(s.where, 12) + pad(s.lang, 8) + s.msg + '｜首行「' + clip(s.first, 40) + '」');
      });
    } else {
      console.log('  疑似错标：无');
    }
    console.log('');
  });
} else {
  /* 全站汇总表 */
  console.log(pad('章 id', 24) + pad('教材 code', 10) + pad('答案代码块', 12) + pad('疑似错标', 10) + '非 java');
  rows.forEach(function (x) {
    var h = histStr(x.tbHist, x.tbMissing, x.tbIllegal);
    console.log(pad(x.id, 24) + pad(String(x.tbTotal), 10) + pad(String(x.ansTotal), 12) +
      pad(String(x.suspects.length), 10) + h);
  });
  console.log('');
  /* 全站「非 java」块清单（章 id / 块序号 / lang / 首行前 60 字符） */
  console.log('--- 非 java 块清单（章 id / 块序号 / lang / 首行前 60 字符）---');
  var nNonJava = 0;
  rows.forEach(function (x) {
    x.nonJava.forEach(function (n) {
      nNonJava++;
      console.log(pad(x.id, 24) + pad(n.where, 14) + pad(labelOf(n.lang), 8) + clip(n.first, 60));
    });
  });
  if (!nNonJava) console.log('（无：全部 code 块与答案代码块都是 java）');
  console.log('');
}

/* ---------- 全站合计 ---------- */
var sum = {
  tb: 0, ans: 0, tbMissing: 0, tbIllegal: 0, ansMissing: 0, ansIllegal: 0,
  tbHist: newHist(), ansHist: newHist(), suspects: [], nonJava: 0
};
rows.forEach(function (x) {
  sum.tb += x.tbTotal; sum.ans += x.ansTotal;
  sum.tbMissing += x.tbMissing; sum.tbIllegal += x.tbIllegal;
  sum.ansMissing += x.ansMissing; sum.ansIllegal += x.ansIllegal;
  sum.nonJava += x.nonJava.length;
  CODE_LANGS.forEach(function (k) { sum.tbHist[k] += x.tbHist[k]; sum.ansHist[k] += x.ansHist[k]; });
  x.suspects.forEach(function (s) { sum.suspects.push({ id: x.id, where: s.where, lang: s.lang, msg: s.msg, first: s.first }); });
});

console.log('--- ' + (only.length ? '本章范围' : '全站') + '合计 ---');
console.log('教材 code ' + sum.tb + ' 块：' + histStr(sum.tbHist, sum.tbMissing, sum.tbIllegal));
console.log('答案代码块 ' + sum.ans + ' 块：' + histStr(sum.ansHist, sum.ansMissing, sum.ansIllegal));
console.log('非 java 块 ' + sum.nonJava + ' 个（清单见上）');
console.log('疑似错标 ' + sum.suspects.length + ' 处（口径 = verify.js 规则 16）');
sum.suspects.forEach(function (s) {
  console.log('  ' + s.id + '  ' + pad(s.where, 12) + pad(s.lang, 8) + s.msg + '｜首行「' + clip(s.first, 40) + '」');
});
if (miss.length) console.log('未找到的章：' + miss.join(', '));
process.exit(sum.suspects.length || sum.tbMissing || sum.ansMissing || sum.tbIllegal || sum.ansIllegal ? 1 : 0);
