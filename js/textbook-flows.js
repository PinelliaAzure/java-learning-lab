/* 为面向对象章节补充关键流程图（静态，无交互） */
(function () {
  'use strict';
  var T = window.JAVA_TEXTBOOK;
  if (!T) return;

  function afterHeading(id, keyword, block) {
    var tb = T[id];
    if (!tb) return;
    for (var i = 0; i < tb.blocks.length; i++) {
      if (tb.blocks[i].h && tb.blocks[i].h.indexOf(keyword) >= 0) {
        tb.blocks.splice(i + 1, 0, block);
        return;
      }
    }
  }

  afterHeading('methods', '1.3', {
    flow: ['main 调用 add', '压入 add 栈帧', '执行方法体', 'return 返回值', '弹出栈帧', '回到 main']
  });

  afterHeading('class-object', '2.4', {
    flow: ['执行 new', '堆上分配内存', '调用构造器', '返回对象引用', '栈变量保存引用']
  });

  afterHeading('inheritance', '4.3', {
    flow: ['new Dog()', '调用 Dog 构造器', 'super(name)', '初始化 Animal 部分', '初始化 Dog 字段', '执行 Dog 构造体']
  });

  afterHeading('polymorphism', '5.3', {
    flow: ['a.speak()', '取对象实际类型', '查找方法表', '执行对应实现']
  });
})();
