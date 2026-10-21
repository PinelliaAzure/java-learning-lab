
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
      var PRE = '<pre class="tb-ans-code">';
      if (body.indexOf(PRE) >= 0) {
        var ca = body.indexOf(PRE) + PRE.length;
        var cb = body.indexOf('</pre>', ca);
        if (cb < 0) errs.push('第 ' + (q + 1) + ' 题的代码块未闭合');
        else {
          var inner = body.slice(ca, cb);
          if (inner.replace(/\s/g, '').length < 20) errs.push('第 ' + (q + 1) + ' 题的代码块内容过短');
          if (inner.indexOf('<') >= 0) errs.push('第 ' + (q + 1) + ' 题的代码块含未转义的 <（应写 &lt;）');
        }
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

