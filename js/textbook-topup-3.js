/* 最后补齐 SQL 与两章少量缺口 */
(function () {
  'use strict';
  var T = window.JAVA_TEXTBOOK;
  if (!T) return;
  function beforeSummary(id, blocks) {
    var tb = T[id]; if (!tb) return;
    var pos = tb.blocks.length;
    for (var i = tb.blocks.length - 1; i >= 0; i--) {
      if (tb.blocks[i].h && tb.blocks[i].h.indexOf('本章小结') >= 0) { pos = i; break; }
    }
    tb.blocks.splice.apply(tb.blocks, [pos, 0].concat(blocks));
  }

  beforeSummary('sql-basics', [
    { h: '13.16 一个小型图书库的表设计' },
    { p: '假设要做图书借阅系统，至少需要三张表：book（图书）、reader（读者）、borrow（借阅记录）。borrow 表保存 book_id、reader_id、借出时间、归还时间，通过外键关联另外两张表。这样一本书可以被多次借阅，历史记录不会丢。' },
    { code: 'CREATE TABLE book (\n  id BIGINT PRIMARY KEY AUTO_INCREMENT,\n  title VARCHAR(100) NOT NULL,\n  author VARCHAR(50),\n  price DECIMAL(10,2) NOT NULL\n);\n\nCREATE TABLE reader (\n  id BIGINT PRIMARY KEY AUTO_INCREMENT,\n  name VARCHAR(50) NOT NULL\n);\n\nCREATE TABLE borrow (\n  id BIGINT PRIMARY KEY AUTO_INCREMENT,\n  book_id BIGINT NOT NULL,\n  reader_id BIGINT NOT NULL,\n  borrowed_at DATETIME NOT NULL,\n  returned_at DATETIME NULL,\n  FOREIGN KEY (book_id) REFERENCES book(id),\n  FOREIGN KEY (reader_id) REFERENCES reader(id)\n);', title: 'schema.sql' },
    { p: '设计时先想清楚“哪些数据会重复、哪些关系是一对多”。借阅记录是典型的多对多中间表；如果把借阅人直接塞进 book 表，历史记录会被覆盖，也无法统计借阅次数。' },
    { p: '建表只是第一步，真正决定系统能否长期运行的是约束、索引和事务边界。把这三件事在设计阶段定清楚，后面写 Java 代码会顺利很多。' },
    { h: '13.17 从 SQL 到 Java 的映射' },
    { p: '数据库里的表和 Java 里的类通常一一对应：一行数据映射成一个对象，一列映射成一个字段。查询结果用 ResultSet 逐行读取，或者交给 MyBatis/JPA 自动映射。理解这层映射，才能看懂 ORM 框架在做什么。' },
    { list: [
      '表名 → 类名，列名 → 字段名（下划线转驼峰）。',
      '主键 → id 字段，类型用 Long/Integer。',
      'DECIMAL → BigDecimal，DATETIME → LocalDateTime。',
      '外键 → 对象引用或单独的 id 字段。',
      '一对多 → List<子对象>，多对多 → 中间表实体。'
    ] }
  ]);

  beforeSummary('setup', [
    { p: '最后提醒：环境搭建是一次性成本，不要因为一次报错就反复重装。把安装路径、版本、报错原文记在笔记里，下次换电脑十分钟就能复原。' }
  ]);

  beforeSummary('scanner', [
    { h: '5.17 输入设计的可用性' },
    { p: '好的输入提示会告诉用户“要输入什么、格式是什么、出错怎么办”。例如“请输入 1~100 的整数”比“请输入”清晰得多；输入错误时保留已输入内容，允许直接重试，而不是让用户从头再来。' }
  ]);

  beforeSummary('packages-bean', [
    { h: '8.16 从包到模块' },
    { p: '包解决命名和可见性，模块（JPMS）进一步声明“依赖谁、导出谁”。普通业务项目用 Maven 多模块即可：每个模块一个 pom，模块之间通过依赖坐标引用，比单纯用包边界更清晰，也能独立构建和测试。' }
  ]);
})();
