
// tools/audit-tail.js —— 章尾两节格式体检（常见追问 / 自测与练习）
// 用法：
//   node tools/audit-tail.js              全仓汇总（每章一行 PASS/FAIL）
//   node tools/audit-tail.js <章id...>    只查指定章
// 判定口径见 AUDIT-2026.md §10
var fs = require('fs');
var vm = require('vm');
var path = require('path');

var ROOT = process.cwd();
var args = process.argv.slice(2);
var only = [];
for (var i = 0; i < args.length; i++) {
  if (args[i] === '--root') { ROOT = args[++i]; continue; }
  only.push(args[i]);
}

function loadData() {
  var html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  var re = /<script src="([^"]+)"><\/script>/g;
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
  for (var j = 0; j < srcs.length; j++) {
    if (SKIP.test(srcs[j])) continue;
    vm.runInContext(fs.readFileSync(path.join(ROOT, srcs[j]), 'utf8'), ctx, { filename: srcs[j] });
  }
  return ctx.JAVA_TEXTBOOK;
}

function sections(blocks) {
  var out = [];
  var cur = null;
  for (var i = 0; i < blocks.length; i++) {
    if (blocks[i].h != null) { cur = { h: blocks[i].h, blocks: [] }; out.push(cur); }
    else if (cur) cur.blocks.push(blocks[i]);
  }
  return out;
}

function cjk(s) {
  var n = 0;
  for (var i = 0; i < s.length; i++) {
    var c = s.charCodeAt(i);
    if (c >= 0x4e00 && c <= 0x9fff) n++;
  }
  return n;
}

function stripTags(s) {
  return s.replace(/<[^>]+>/g, '');
}

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

function auditChapter(id, tb) {
  var errs = [];
  var secs = sections(tb.blocks || []);
  if (secs.length < 3) { errs.push('章尾不足三节（实得 ' + secs.length + '）'); return errs; }
  var faq = secs[secs.length - 2];
  var self = secs[secs.length - 1];
  var norm = function (h) { return h.replace(/^\d+(\.\d+)*\s*/, '').trim(); };
  if (norm(faq.h).indexOf('常见追问') < 0) errs.push('倒数第二节不是常见追问：' + faq.h);
  if (norm(self.h).indexOf('自测与练习') < 0) errs.push('末节不是自测与练习：' + self.h);

  // --- 常见追问：h + [flow] + 恰好一个 list ---
  var faqList = null;
  var faqFlow = 0;
  var stray = [];
  for (var i = 0; i < faq.blocks.length; i++) {
    var b = faq.blocks[i];
    if (b.flow) { faqFlow++; continue; }
    if (b.list) { if (faqList) { errs.push('常见追问出现多个 list 块'); } else faqList = b.list; continue; }
    stray.push(Object.keys(b)[0]);
  }
  if (stray.length) errs.push('常见追问含多余块：' + stray.join(','));
  if (!faqList) { errs.push('常见追问没有 list 块'); }
  else {
    if (faqList.length < 3 || faqList.length > 6) errs.push('常见追问条目数 ' + faqList.length + '（要求 3–6）');
    for (var k = 0; k < faqList.length; k++) {
      var it = faqList[k];
      if (!/^<b>问：/.test(it)) { errs.push('第 ' + (k + 1) + ' 条未以「<b>问：」开头'); continue; }
      if (it.indexOf('<br>答：') < 0) { errs.push('第 ' + (k + 1) + ' 条缺「<br>答：」'); continue; }
      var ans = it.slice(it.indexOf('<br>答：') + 6);
      var ac = cjk(stripTags(ans));
      if (ac < 50) errs.push('第 ' + (k + 1) + ' 条答案仅 ' + ac + ' 汉字（要求 ≥50）');
      if (ac > 320) errs.push('第 ' + (k + 1) + ' 条答案 ' + ac + ' 汉字（要求 ≤320）');
      if (it.indexOf('<details') >= 0) errs.push('第 ' + (k + 1) + ' 条不应含 details');
    }
  }

  // --- 自测与练习：h + [p] + 恰好一个 ol + [note] ---
  var ol = null;
  var bad = [];
  for (var j = 0; j < self.blocks.length; j++) {
    var sb = self.blocks[j];
    if (sb.p || sb.note) continue;
    if (sb.ol) { if (ol) errs.push('自测与练习出现多个 ol 块'); else ol = sb.ol; continue; }
    bad.push(Object.keys(sb)[0]);
  }
  if (bad.length) errs.push('自测与练习含不允许的块：' + bad.join(','));
  if (!ol) { errs.push('自测与练习没有 ol 块'); }
  else {
    if (ol.length < 3) errs.push('自测与练习仅 ' + ol.length + ' 题（要求 ≥3）');
    for (var q = 0; q < ol.length; q++) {
      var item = ol[q];
      var d = item.indexOf('<details class="tb-ans">');
      if (d < 0) { errs.push('第 ' + (q + 1) + ' 题缺 <details class="tb-ans">'); continue; }
      if (item.indexOf('<summary>参考答案</summary>') < 0) errs.push('第 ' + (q + 1) + ' 题的 summary 不是「参考答案」');
      if (item.indexOf('</details>') < 0) errs.push('第 ' + (q + 1) + ' 题 details 未闭合');
      if (item.slice(d).indexOf('<details') >= 0 && item.slice(d + 1).indexOf('<details') >= 0) errs.push('第 ' + (q + 1) + ' 题出现嵌套 details');
      var body = item.slice(d);
      body = body.replace(/^<details class="tb-ans"><summary>参考答案<\/summary>/, '').replace(/<\/details>[\s\S]*$/, '');
      // 与 tools/verify.js 规则 14 同一切法：answerShape() 只看 ans-body 内部内容（去掉外层 <div class="ans-body">）
      var ab = body.indexOf('<div class="ans-body">');
      if (ab >= 0) body = body.slice(ab + 22);
      var acut = body.indexOf('</div></details>');
      if (acut >= 0) body = body.slice(0, acut);
      else { var acut2 = body.indexOf('</div>'); if (acut2 >= 0) body = body.slice(0, acut2); }
      // 分流口径与 tools/verify.js 规则 14 同源：answerShape() 判 1–3 块形态（lang 两两不同、含 shell 则 shell 最后），
      // 只要出现任何代码块就仍是代码题；纯 shell 单块答案同样算代码题
      var shape = answerShape(body);
      if (shape.code) {
        for (var si = 0; si < shape.issues.length; si++) errs.push('第 ' + (q + 1) + ' 题：' + shape.issues[si]);
        if (body.indexOf('<b>预期现象</b>') >= 0) errs.push('第 ' + (q + 1) + ' 题是代码题，答案不该再有「预期现象」');
      } else {
        if (body.indexOf('<b>预期现象</b>') < 0) errs.push('第 ' + (q + 1) + ' 题缺「预期现象」（非代码题必须三段式）');
        var bc = cjk(stripTags(body));
        if (bc < 60) errs.push('第 ' + (q + 1) + ' 题答案仅 ' + bc + ' 汉字（要求 ≥60）');
        if (bc > 400) errs.push('第 ' + (q + 1) + ' 题答案 ' + bc + ' 汉字（要求 ≤400）');
      }
      var stem = item.slice(0, d).replace(/<[^>]+>/g, '');
      if (cjk(stem) < 8) errs.push('第 ' + (q + 1) + ' 题题面过短（' + cjk(stem) + ' 汉字）');
      if (/TODO|待补|略$|答案：略/.test(body)) errs.push('第 ' + (q + 1) + ' 题答案含占位词');
    }
  }
  return errs;
}

var T = loadData();
var ids = only.length ? only : Object.keys(T);
var fails = 0;
var total = 0;
for (var n = 0; n < ids.length; n++) {
  var id = ids[n];
  var tb = T[id];
  if (!tb) { console.log('MISSING  ' + id); fails++; continue; }
  total++;
  var errs = auditChapter(id, tb);
  if (errs.length) {
    fails++;
    console.log('FAIL  ' + id);
    for (var e = 0; e < errs.length; e++) console.log('        - ' + errs[e]);
  } else if (only.length) {
    console.log('PASS  ' + id);
  }
}
console.log('---');
console.log('章节 ' + total + ' ｜ PASS ' + (total - fails) + ' ｜ FAIL ' + fails + (only.length ? '' : '（只列 FAIL；全 PASS 时无输出）'));
process.exit(fails ? 1 : 0);

