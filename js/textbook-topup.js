/* 给现有 14 章中不足 5000 字的章节补充内容 */
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

  appendTo('setup', '常见报错逐条排查', [
    { p: '还有一类报错发生在安装阶段而不是运行阶段：上面几条都是“装完了用不了”，下面几条是“根本没装成”。症状看着很像，入口却完全不同，装完之后用不了，可以先过一遍这里。' },
    { list: [
      '安装包与系统架构不匹配：Apple Silicon 要 aarch64，Intel Mac 要 x64，装错了能启动，编译或跑项目时才报架构错误。',
      '装到了用户目录却没有读权限，终端和 IDE 行为不一致；换到系统级目录，或者给当前用户授权。',
      '公司电脑的安全软件拦截了安装程序，注册表没写进去；改用免安装的压缩版，手动配置 JAVA_HOME 和 PATH。',
      'PATH 里旧 JDK 排在前面时，用 <code>which -a java</code> 能看到所有命中，确认到底在用哪一个。'
    ] },
    { p: '把排查顺序固定成三步就不容易乱：先确认命令是否存在，再确认版本是否正确，最后确认项目使用的 JDK 是否与命令行一致。三层分开看，问题就不会混在一起。' }
  ]);

  appendTo('jdk', '包、classpath 与 main 方法', [
    { p: '把散在几节里的命令集中列一次，方便对照。真正的项目会用 Maven/Gradle 包装这些步骤，但底层仍然是编译、打包、运行三件事。' },
    { code: 'javac Hello.java                 # 编译单个文件\njavac -d out src/**/*.java        # 编译到指定目录（需 shell 展开）\njava Hello                       # 运行默认包类\njava -cp out com.example.Hello   # 运行带包的类\njar -cvf app.jar -C out .        # 打包\njava -jar app.jar                # 运行可执行 jar', title: 'Commands' },
    { p: '打包这一行要和入口类一起看：<code>jar -cvf</code> 只是把目录压成 zip，清单里没有 Main-Class，<code>java -jar</code> 会报 “no main manifest attribute”。要直接运行，就在打包时用 <code>jar -cfe app.jar com.example.Hello</code> 指定入口，或者交给构建工具的 mainClass 配置。' }
  ]);

  appendTo('vars', '类型选择的实用清单', [
    { p: '把一组相关变量组织起来，就能描述一个业务对象。下面用变量表示一本书，注意类型选择和命名：价格用 double 只是演示，真实金额应该用 BigDecimal；库存用 int；是否在售用 boolean。' },
    { code: 'String title = "Java 编程思想";\nString author = "Bruce Eckel";\ndouble price = 99.0;\nint stock = 12;\nboolean onSale = true;\nlong isbn = 9787111213826L;\n\nSystem.out.printf("《%s》 %s %.2f 元，库存 %d%n", title, author, price, stock);', title: 'BookVars.java' },
    { p: '命名要能直接读出含义：title、author、stock 比 a、b、c 好得多。类型要匹配取值范围：ISBN 有 13 位，超过 int，所以用 long；而 int 装不下的金额、精度不能丢的比例，都该用 BigDecimal。' }
  ]);

  appendTo('operators', '优先级与括号', [
    { p: '规则背不下来，就用几道小题练手感：先把结果写在纸上，再运行对照。下面这几行覆盖整数除法、类型提升、取余、自增和三元，正好是实际写代码时最容易算错的地方。' },
    { code: 'int a = 5, b = 2;\nSystem.out.println(a / b);            // 2\nSystem.out.println(a / 2.0);          // 2.5\nSystem.out.println(a % b);            // 1\nSystem.out.println(a++ + ++b);        // 5 + 3 = 8，a=6, b=3\nSystem.out.println(a > b ? "大" : "小"); // 大', title: 'Eval.java' },
    { table: { head: ['表达式', '结果', '关键点'], rows: [
      ['5 / 2', '2', '整数除法截断'],
      ['5 / 2.0', '2.5', '提升为 double'],
      ['5 % 2', '1', '取余'],
      ['a++ + ++b', '8', '先取值与先加一'],
      ['a > b ? "大" : "小"', '大', '三元只执行一个分支']
    ] } }
  ]);

  // 这一节带的 flow 块与本章其它图不共享标题定位，保留独立小节，只把文字补到不再与前面重复
  beforeSummary('scanner', [
    { h: '5.15 输入到校验的完整流程' },
    { p: '一个能用的输入流程是五步：提示、读取、校验、失败重试、关闭。很多作业只写了读取这一步，用户一旦输错程序就崩，那不是“能用”的程序，只是“运气好时能跑”。' },
    { flow: ['打印提示', '读取输入', '校验范围/类型', '失败则提示重试', '成功则保存', '关闭 Scanner'] },
    { p: '提示要具体到能照着改：不要只说“输入错误”，而要说明“数量必须是大于 0 的整数”。重试要有上限，或者显式给一个退出方式，否则一次手滑就能把程序锁在循环里。Scanner 读到流程结束再关闭，别在读下一项之前就关掉。' }
  ]);

  appendTo('control', '四个基础算法', [
    { p: '把数组、循环、分支揉在一起的最小学生作业是成绩统计：遍历数组求和、按分数段计数，最后算平均。这个例子几乎用到了本章所有语法，写通了，循环和数组就算过关了。' },
    { code: 'int[] scores = {88, 92, 75, 60, 95};\nint sum = 0, pass = 0, excellent = 0;\nfor (int s : scores) {\n    sum += s;\n    if (s >= 60) pass++;\n    if (s >= 90) excellent++;\n}\ndouble avg = (double) sum / scores.length;\nSystem.out.printf("平均 %.1f，及格 %d 人，优秀 %d 人%n", avg, pass, excellent);', title: 'ScoreStats.java' },
    { p: '注意 <code>(double) sum / scores.length</code>：两边都是 int 时平均值会被截断。遍历用增强 for 更简洁，但需要下标时还得用普通 for；计数和求和写在同一个循环里，比遍历两遍更常见。' }
  ]);

  appendTo('class-object', '综合案例：银行账户对象', [
    { p: '把同样的套路换到订单上，取舍会更清楚：一个 Order 有订单号、商品名、单价、数量，创建后总价由对象自己算。哪些字段应该 final，哪些结果该由方法算出来而不是存成字段，这道题专门练这两件事。' },
    { code: 'public class Order {\n    private final String id;\n    private final String product;\n    private final double price;\n    private final int quantity;\n\n    public Order(String id, String product, double price, int quantity) {\n        if (quantity <= 0) throw new IllegalArgumentException("数量必须为正");\n        this.id = id;\n        this.product = product;\n        this.price = price;\n        this.quantity = quantity;\n    }\n\n    public double total() { return price * quantity; }\n}', title: 'Order.java' },
    { p: '订单号、商品、单价、数量在创建后不该变，所以用 final；总价由 total() 算出来，而不是存一个可能过期的字段。这样对象始终自洽，也就不会出现“改了数量忘了改总价”的 bug。' }
  ]);

  appendTo('polymorphism', '多态如何支撑开闭原则', [
    { p: '依赖倒置原则说：高层模块不应该依赖低层模块，两者都应该依赖抽象。多态让这句话落地——Service 依赖 Notifier 接口，而不是 SmsNotifier 类，换一种通知方式时 Service 一行都不用改。判断一段代码有没有真正拿到多态的好处，只看一件事：新增一个实现时要不要改调用方。如果每加一种类型都要动 if-else 或 switch，那只是“用了接口”，逻辑还绑在调用方身上。' }
  ]);

  appendTo('enum-record', 'switch 与 EnumMap', [
    { p: '还有一个实践上的选择，和上面“新常量走 default”正好互补：如果你希望漏掉常量时编译器就报错，就别在 switch 里写 default 兜底。用 switch 表达式（有返回值的那种）并列出全部常量时，编译器替你做了穷尽性检查，一旦有人加了一个常量，所有没补分支的地方都编译不过，问题在写代码的当天就暴露。写一个 <code>default: throw new IllegalStateException(...)</code> 看着稳，实际把这个检查关掉了——新常量会悄悄落进 default，等到运行时才抛异常。这也是枚举相对 int 常量的实质优势：int 的分支漏一个，编译器和运行时都不吭声，只有用户会碰上。' }
  ]);

  appendTo('packages-bean', '四种访问权限：四个真实场景', [
    { p: '最后补一条实践：包的边界设计得好，测试也会更容易。测试类通常和被测类放在同一个包下（<code>src/test/java</code> 对应同样的目录结构），这样既能访问包级可见的成员，又不需要为了测试把成员改成 public。为了测试而放开权限，等于拿封装换临时方便。' },
    { list: [
      '对外 API 用 public，内部协作类用默认权限。',
      '测试放在同包，可访问包级成员，但不破坏封装。',
      '不要为了测试把所有字段都改成 public。',
      '包名与目录不一致时，编译和运行都会出问题。'
    ] }
  ]);
})();
