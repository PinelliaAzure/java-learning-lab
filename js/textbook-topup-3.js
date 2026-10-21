/* 最后补齐 SQL 与两章少量缺口 */
(function () {
  'use strict';
  var T = window.JAVA_TEXTBOOK;
  if (!T) return;
  var SEC = /^(\d+)\.(\d+)/;
  var SUB = /^(\d+)\.(\d+)\./;

  // 追加小节接着本章正文最大小节号编号；“本章小结”不是正文小节，插入后顺延到末尾，保证章内唯一且递增
  function continueNumbering(tb, blocks) {
    var major = '', max = 0, sumAt = -1, assigned = 0, b, i, m;
    for (i = 0; i < tb.blocks.length; i++) {
      b = tb.blocks[i];
      if (!b || typeof b.h !== 'string') continue;
      m = SEC.exec(b.h);
      if (!m) continue;
      if (!major) major = m[1];
      if (m[1] !== major) continue;
      if (b.h.indexOf('本章小结') >= 0) { sumAt = i; continue; }
      if (parseInt(m[2], 10) > max) max = parseInt(m[2], 10);
    }
    for (i = 0; i < blocks.length; i++) {
      b = blocks[i];
      if (!b || typeof b.h !== 'string') continue;
      if (SUB.test(b.h)) continue;
      m = SEC.exec(b.h);
      if (!m) continue;
      if (!major) major = m[1];
      max = max + 1;
      assigned = max;
      b.h = major + '.' + max + ' ' + b.h.slice(m[0].length).replace(/^\s+/, '');
    }
    if (sumAt >= 0 && assigned > 0) {
      m = SEC.exec(tb.blocks[sumAt].h);
      if (m) {
        tb.blocks[sumAt].h = major + '.' + (assigned + 1) + ' ' + tb.blocks[sumAt].h.slice(m[0].length).replace(/^\s+/, '');
      }
    }
  }

  function beforeSummary(id, blocks) {
    var tb = T[id]; if (!tb) return;
    continueNumbering(tb, blocks);
    var pos = tb.blocks.length;
    for (var i = tb.blocks.length - 1; i >= 0; i--) {
      if (tb.blocks[i].h && tb.blocks[i].h.indexOf('本章小结') >= 0) { pos = i; break; }
    }
    tb.blocks.splice.apply(tb.blocks, [pos, 0].concat(blocks));
  }

  // 把没有标题的补充块并进本章已有小节的末尾：按标题文字定位目标节，找不到就退回章尾插入，避免内容丢失
  function appendTo(id, title, blocks) {
    var tb = T[id];
    if (!tb) return;
    var bs = tb.blocks, start = -1, end, i;
    for (i = 0; i < bs.length; i++) {
      if (bs[i] && typeof bs[i].h === 'string' && bs[i].h.indexOf(title) >= 0) { start = i; break; }
    }
    if (start < 0) { beforeSummary(id, blocks); return; }
    for (end = start + 1; end < bs.length; end++) {
      if (bs[end] && bs[end].h != null) break;
    }
    bs.splice.apply(bs, [end, 0].concat(blocks));
  }

  appendTo('setup', '常见报错逐条排查', [
    { p: '最后留一条习惯：把安装路径、JDK 版本、完整报错原文记进一个文件。环境搭建是一次性成本，换电脑时照着这份记录十分钟就能复原，比凭记忆重来一遍可靠得多。' }
  ]);

  appendTo('packages-bean', '模块化（JPMS）', [
    { p: '真要把这层边界固化下来，普通业务项目用 Maven 多模块就够：每个模块一个 pom，模块之间通过依赖坐标引用，编译期就能拦住跨模块的直接访问，也能独立构建和测试。JPMS 的 exports/requires 更严格，适合 JDK 或框架这类需要强封装的项目。' }
  ]);
})();
