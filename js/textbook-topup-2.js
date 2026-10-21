/* 补齐 SQL、Spring 项目及少量不足 5000 字的章节 */
(function () {
  'use strict';
  var T = window.JAVA_TEXTBOOK;
  if (!T) return;

  function beforeSummary(id, blocks) {
    var tb = T[id];
    if (!tb) return;
    var pos = tb.blocks.length;
    for (var i = tb.blocks.length - 1; i >= 0; i--) {
      if (tb.blocks[i].h && tb.blocks[i].h.indexOf('本章小结') >= 0) { pos = i; break; }
    }
    tb.blocks.splice.apply(tb.blocks, [pos, 0].concat(blocks));
  }

  beforeSummary('sql-basics', [
    { h: '13.11 数据类型与 NULL' },
    { p: '建表时要为每一列选择合适的数据类型：整数用 INT/BIGINT，金额用 DECIMAL，字符串用 VARCHAR/CHAR，时间用 DATETIME/TIMESTAMP。类型选得过大浪费空间，选得过小会截断或溢出。' },
    { table: { head: ['类型', '用途', '注意'], rows: [
      ['INT / BIGINT', '整数、主键', '主键常用 BIGINT 防溢出'],
      ['DECIMAL(p,s)', '金额、精确小数', '不要用 FLOAT/DOUBLE 存金额'],
      ['VARCHAR(n)', '变长字符串', 'n 是字符数，不是字节数'],
      ['DATETIME', '日期时间', '不带时区；跨时区用 TIMESTAMP'],
      ['TINYINT', '布尔/小整数', '0/1 表示 false/true']
    ] } },
    { p: 'NULL 表示“未知”，不是 0 也不是空字符串。任何与 NULL 的比较（=、<、>）结果都是 UNKNOWN，必须用 IS NULL / IS NOT NULL。聚合函数会忽略 NULL，COUNT(*) 统计行数，COUNT(column) 只统计非 NULL。' },
    { code: 'SELECT * FROM book WHERE author IS NULL;\nSELECT COUNT(*) AS total, COUNT(author) AS with_author FROM book;', title: 'null.sql' },
    { h: '13.12 事务与隔离级别' },
    { p: '事务是一组要么全成功、要么全回滚的操作，满足 ACID：原子性、一致性、隔离性、持久性。银行转账是典型例子：扣款和入账必须一起成功。' },
    { p: '隔离级别从低到高：READ UNCOMMITTED（可能脏读）、READ COMMITTED（避免脏读）、REPEATABLE READ（避免不可重复读，MySQL 默认）、SERIALIZABLE（避免幻读，但并发最差）。级别越高，一致性越强，吞吐越低。' },
    { code: 'START TRANSACTION;\nUPDATE account SET balance = balance - 100 WHERE id = 1;\nUPDATE account SET balance = balance + 100 WHERE id = 2;\nCOMMIT;\n-- 出错时 ROLLBACK;', title: 'transaction.sql' },
    { h: '13.13 索引与执行计划' },
    { p: '索引是 B+ 树结构，能快速定位行。主键自带聚簇索引；普通索引保存主键值再回表。联合索引遵循最左前缀：INDEX(a,b,c) 能用于 a、a+b、a+b+c，不能跳过 a 直接用 b。' },
    { p: '用 EXPLAIN 看执行计划：type 从好到差大致是 system/const/eq_ref/ref/range/index/ALL；key 是实际使用的索引；rows 是预估扫描行数。出现 ALL 且 rows 很大，通常需要加索引或改写查询。' },
    { code: 'EXPLAIN SELECT * FROM book WHERE author = \'Tom\' AND price > 50;\nCREATE INDEX idx_author_price ON book(author, price);', title: 'index.sql' },
    { h: '13.14 表设计与三范式' },
    { p: '第一范式：每列不可再分；第二范式：非主键列完全依赖主键；第三范式：非主键列不依赖其他非主键列。实际项目会在范式与查询性能之间权衡，适度冗余（如订单快照）是允许的。' },
    { list: [
      '一表一职责，不要把用户、订单、商品塞进一张表。',
      '主键用无业务含义的自增/雪花 ID，避免业务变更。',
      '金额用 DECIMAL，时间用统一时区，状态用枚举/字典表。',
      '为高频查询建索引，但不要给每个列都建。',
      '删除用软删除（deleted 标记）还是物理删除，要提前约定。'
    ] },
    { h: '13.15 常见追问' },
    { list: [
      'COUNT(*) 和 COUNT(1) 有区别吗？现代优化器基本一样，COUNT(column) 会忽略 NULL。',
      'WHERE 和 HAVING 能互换吗？WHERE 在分组前过滤行，HAVING 在分组后过滤组。',
      'JOIN 和子查询哪个快？取决于执行计划，很多优化器会把子查询改写成 JOIN。',
      '索引越多越好吗？不是，写入要维护索引，过多会拖慢 INSERT/UPDATE。',
      '事务越大越好吗？不是，长事务占锁、胀日志，应尽量短。'
    ] }
  ]);

  beforeSummary('project-spring', [
    { h: '12.13 配置文件与环境隔离' },
    { p: 'Spring Boot 用 application.yml 管理配置，支持多环境 profile：application-dev.yml、application-prod.yml。启动时用 --spring.profiles.active=prod 选择，敏感信息用环境变量注入，不要提交到 Git。' },
    { code: 'server:\n  port: 8080\nspring:\n  datasource:\n    url: ${DB_URL:jdbc:mysql://localhost:3306/demo}\n    username: ${DB_USER:root}\n    password: ${DB_PASSWORD:}\n  jpa:\n    hibernate:\n      ddl-auto: update', title: 'application.yml' },
    { p: '配置优先级大致是：命令行参数 > 环境变量 > application-{profile}.yml > application.yml。排查“配置没生效”时，先看启动日志里的 active profile，再确认键名和缩进。' }
  ]);

  beforeSummary('vars', [
    { h: '3.17 怎么选类型' },
    { p: '选类型时先问三个问题：会不会超过 21 亿（是则 long）、需不需要小数（是则 double 或 BigDecimal）、是不是金额（是则 BigDecimal）。布尔用 boolean，单个字符用 char，字符串用 String。不要为了省空间把 ID 用 short，后期扩容会非常痛苦。' }
  ]);

  beforeSummary('operators', [
    { h: '4.18 让表达式更可读' },
    { p: '复杂表达式先拆成有名字的中间变量，再组合。例如 <code>boolean canVote = age >= 18 && hasId && !banned;</code> 比把三个条件塞进 if 更容易读和测试。括号不是多余，它把优先级意图写清楚了。' }
  ]);

  beforeSummary('scanner', [
    { h: '5.16 Scanner 与 BufferedReader 怎么选' },
    { p: 'Scanner 胜在按类型解析、写法简单，适合教学和小工具；BufferedReader 胜在按行读取快、内存可控，适合大文件和日志。读取大文件时不要用 Scanner 逐行扫，几百万行会明显变慢。需要按类型解析又追求性能时，可以 BufferedReader 读行 + 手动 split/parse。' }
  ]);

  beforeSummary('polymorphism', [
    { h: '5.14 多态与里氏替换' },
    { p: '里氏替换原则：子类对象必须能替换父类对象而不破坏程序。子类可以扩展行为，但不应该改变父类承诺的语义（比如重写方法后抛出父类没有的异常、返回不符合约定的值）。多态的安全前提，是每个实现都遵守同一份契约。' }
  ]);

  beforeSummary('packages-bean', [
    { h: '8.15 包设计与依赖方向' },
    { p: '包之间应该单向依赖：controller → service → repository → model，util 被所有人依赖但不依赖业务。反向依赖（model 依赖 controller）会让编译、测试和复用都变困难。可以用 ArchUnit 这类工具在 CI 里检查依赖方向。' }
  ]);
})();
