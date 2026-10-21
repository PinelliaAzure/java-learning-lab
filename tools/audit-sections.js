// 章节小节体检器：按 index.html 的 script 顺序加载教材数据，逐章输出小节级结构。
// 用法：node tools/audit-sections.js                 → 全部 84 章一行一章的汇总（按问题严重度排序）
//       node tools/audit-sections.js hashmap sql-basics → 指定章的逐节明细
// 只读：不修改任何文件。
var fs = require('fs');
var path = require('path');
var vm = require('vm');

var argv = process.argv.slice(2);
var ROOT = process.cwd();
var ri = argv.indexOf('--root');
if (ri >= 0) { ROOT = path.resolve(argv[ri + 1]); argv.splice(ri, 2); }
var args = argv.filter(function (a) { return a !== '.' && !/^-/.test(a); });
var html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
var re = /<script src="(js\/[^"]+)"><\/script>/g;
var m;
var order = [];
while ((m = re.exec(html))) order.push(m[1]);

var ctx = {};
ctx.window = ctx;
vm.createContext(ctx);
order.forEach(function (s) {
  if (!/^js\//.test(s)) return;
  if (/engine|search|menu|tools|code-exercises|code-lab|exams\.js/.test(s)) return;
  var p = path.join(ROOT, s);
  if (!fs.existsSync(p)) return;
  vm.runInContext(fs.readFileSync(p, 'utf8'), ctx, { filename: s });
});

var TB = ctx.JAVA_TEXTBOOK || {};
function isText(b) {
  return b.h != null || b.p != null || b.note != null || b.list != null || b.ol != null || b.table != null;
}
function text(b) {
  if (b.h != null) return b.h;
  if (b.p != null) return b.p;
  if (b.note != null) return b.note;
  if (b.list != null) return b.list.join(' ');
  if (b.ol != null) return b.ol.join(' ');
  if (b.table != null) return (b.table.head || []).join(' ') + (b.table.rows || []).map(function (r) { return r.join(' '); }).join(' ');
  return null;
}
function cjk(s) {
  var mm = String(s).match(/[\u4e00-\u9fff]/g);
  return mm ? mm.length : 0;
}
function core(h) {
  return h.replace(/^\d+(\.\d+)*\s*/, '').replace(/[：:，,、\s]/g, '').replace(/的|与|和|及/g, '');
}
var tails = ['小结', '追问', '练习'];

function scan(id) {
  var blocks = TB[id].blocks;
  var hIdx = [];
  blocks.forEach(function (b, i) { if (b.h != null) hIdx.push(i); });
  var sections = hIdx.map(function (hi, k) {
    var end = k + 1 < hIdx.length ? hIdx[k + 1] : blocks.length;
    var body = blocks.slice(hi + 1, end);
    var txt = body.filter(isText).length;
    var chars = body.reduce(function (a, b) { var t = text(b); return a + (t ? cjk(t) : 0); }, 0);
    return { h: blocks[hi].h, blocks: body.length, textBlocks: txt, chars: chars, seq: blocks[hi].h.match(/^\d+(\.\d+)*/) };
  });
  var seen = {};
  var dups = [];
  sections.forEach(function (s) {
    var c = core(s.h);
    if (seen[c]) dups.push(c); else seen[c] = 1;
  });
  var thin = sections.filter(function (s) { return s.textBlocks <= 1; });
  var seqs = sections.map(function (s) { return s.seq ? s.seq[0] : null; });
  var inc = true;
  var prev = null;
  seqs.forEach(function (s) {
    if (!s) return;
    var parts = s.split('.').map(Number);
    if (prev && parts[0] === prev[0]) { if (!(parts[1] > prev[1])) inc = false; }
    prev = parts;
  });
  var code = blocks.filter(function (b) { return b.code != null; }).length;
  var pair = 0;
  blocks.forEach(function (b, i) { if (b.code != null && blocks[i + 1] && blocks[i + 1].out != null) pair++; });
  var flows = blocks.filter(function (b) { return b.flow != null; }).length;
  var chars = blocks.reduce(function (a, b) { var t = text(b); return a + (t ? cjk(t) : 0); }, 0);
  var tailOrder = sections.slice(-3).map(function (s) { return core(s.h); });
  var tailOk = tailOrder.length === 3 && tails.every(function (t) { return tailOrder.some(function (x) { return x.indexOf(t) >= 0; }); });
  return { id: id, sections: sections, dups: dups, thin: thin, chars: chars, code: code, pair: pair, flows: flows, inc: inc, tailOk: tailOk, last3: sections.slice(-3).map(function (s) { return s.h; }) };
}

var ids = Object.keys(TB);
var rows = ids.map(scan);

if (args.length) {
  args.forEach(function (id) {
    if (!TB[id]) { console.log('!! 没有这个章: ' + id); return; }
    var r = rows.find(function (x) { return x.id === id; });
    console.log('=== ' + id + '  ' + r.sections.length + ' 节 / 正文 ' + r.chars + ' 字 / flow ' + r.flows + ' / code ' + r.code + ' (紧接 out ' + r.pair + ') ===');
    console.log('    编号递增: ' + (r.inc ? 'OK' : 'FAIL') + '   章尾三节: ' + (r.tailOk ? 'OK' : 'FAIL') + '  [' + r.last3.join(' → ') + ']');
    if (r.dups.length) console.log('    同名小节: ' + r.dups.join(' , '));
    r.sections.forEach(function (s, i) {
      var flag = s.textBlocks <= 1 ? '  <-- 1 段小节' : '';
      console.log('  ' + String(i + 1).padStart(2) + '. ' + s.h + '   [' + s.blocks + '块/' + s.textBlocks + '正文/' + s.chars + '字]' + flag);
    });
    console.log('');
  });
} else {
  rows.sort(function (a, b) { return b.thin.length - a.thin.length || b.sections.length - a.sections.length; });
  var totThin = 0;
  rows.forEach(function (r) {
    totThin += r.thin.length;
    console.log([r.id, '节 ' + r.sections.length, '1段 ' + r.thin.length, r.chars + '字', 'flow ' + r.flows,
      r.inc ? '' : '!!编号', r.tailOk ? '' : '!!章尾', r.dups.length ? '!!同名 ' + r.dups.join('/') : ''].filter(Boolean).join('  '));
  });
  console.log('');
  console.log('共 ' + rows.length + ' 章，小节 ' + rows.reduce(function (a, r) { return a + r.sections.length; }, 0) + '，1 段小节 ' + totThin);
}
