/* 补齐 SQL、Spring 项目及少量不足 5000 字的章节 */
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

  appendTo('polymorphism', '多态的常见误区', [
    { p: '这份清单之外还有一条底线：里氏替换。子类对象必须能替换父类对象而不破坏程序，子类可以扩展行为，但不应该改变父类承诺的语义——重写后抛出父类没有的异常、返回不符合约定的值，都是在悄悄毁约。多态能安全工作的前提，是每个实现都遵守同一份契约；接口写得再漂亮，实现各自违约，运行期一样出事。' }
  ]);

  appendTo('packages-bean', '包的设计原则与分层依赖方向', [
    { p: '除了分层方向，还有一个单包级别的判断：<code>util</code> 通常是唯一被所有人依赖、自己却不依赖任何业务包的地方。它一旦反过来 import 了 service，依赖方向就断了，而且不会报错，只会在下次想复用 util 时被一串业务类拖住。判断一个包该不该单独存在，就看删掉它之后依赖是变清晰还是变乱。' }
  ]);
})();
