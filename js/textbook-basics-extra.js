/* 基础篇补充：环境细节、字节码、进制编码、位运算、输入缓冲、算法示例 */
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
    var tb = T[id];
    if (!tb) return;
    continueNumbering(tb, blocks);
    var pos = tb.blocks.length;
    for (var i = tb.blocks.length - 1; i >= 0; i--) {
      if (tb.blocks[i].h && tb.blocks[i].h.indexOf('本章小结') >= 0) { pos = i; break; }
    }
    tb.blocks.splice.apply(tb.blocks, [pos, 0].concat(blocks));
  }

  })();
