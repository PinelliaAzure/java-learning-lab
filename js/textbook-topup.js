/* 给现有 14 章中不足 5000 字的章节补充内容 */
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

  beforeSummary('setup', [
    { h: '1.17 安装失败的排查清单' },
    { p: '安装失败大多不是 JDK 的问题，而是路径、权限或终端缓存的问题。按下面的顺序排查，通常几分钟就能定位。' },
    { list: [
      '下载的安装包与系统架构不匹配：Apple Silicon 要 aarch64，Intel Mac 要 x64。',
      '安装到了用户目录但没有权限，IDE 读不到；换到系统级目录或给当前用户授权。',
      'PATH 里旧 JDK 排在前面，java 和 javac 版本不一致；用 which -a java 查看所有命中。',
      '终端没有重开，环境变量还是旧值；关掉窗口重新打开。',
      '公司电脑有安全软件拦截，安装程序没有写注册表；用压缩版手动配置。'
    ] },
    { p: '排查时先确认“命令是否存在”，再确认“版本是否正确”，最后确认“项目使用的 JDK 是否与命令行一致”。这三层分开看，就不会把问题混在一起。' }
  ]);

  beforeSummary('jdk', [
    { h: '2.18 从源码到运行的命令清单' },
    { p: '把常用命令放在一起，方便对照。真正的项目会用 Maven/Gradle 包装这些步骤，但底层仍然是编译、打包、运行三件事。' },
    { code: 'javac Hello.java                 # 编译单个文件\njavac -d out src/**/*.java        # 编译到指定目录（需 shell 展开）\njava Hello                       # 运行默认包类\njava -cp out com.example.Hello   # 运行带包的类\njar -cvf app.jar -C out .        # 打包\njava -jar app.jar                # 运行可执行 jar', title: 'Commands' },
    { p: '带包运行时最容易错的是“类名写短了”。<code>java Hello</code> 只在默认包有效；如果类是 <code>com.example.Hello</code>，必须写全限定名，并确保 classpath 指向包的根目录，而不是包目录本身。' }
  ]);

  beforeSummary('vars', [
    { h: '3.16 用变量描述一个真实对象' },
    { p: '把一组相关变量组织起来，就能描述一个业务对象。下面用变量表示一本书，注意类型选择和命名：价格用 double 只是演示，真实金额应该用 BigDecimal；库存用 int；是否在售用 boolean。' },
    { code: 'String title = "Java 编程思想";\nString author = "Bruce Eckel";\ndouble price = 99.0;\nint stock = 12;\nboolean onSale = true;\nlong isbn = 9787111213826L;\n\nSystem.out.printf("《%s》 %s %.2f 元，库存 %d%n", title, author, price, stock);', title: 'BookVars.java' },
    { p: '命名要能直接读出含义：title、author、stock 比 a、b、c 好得多。类型要匹配取值范围：ISBN 有 13 位，超过 int，所以用 long。' }
  ]);

  beforeSummary('operators', [
    { h: '4.17 表达式求值练习' },
    { p: '读表达式时按优先级和结合性一步步算，不要凭感觉。下面几个表达式覆盖了整数除法、自增、短路和三元，建议先自己算再运行对照。' },
    { code: 'int a = 5, b = 2;\nSystem.out.println(a / b);            // 2\nSystem.out.println(a / 2.0);          // 2.5\nSystem.out.println(a % b);            // 1\nSystem.out.println(a++ + ++b);        // 5 + 3 = 8，a=6, b=3\nSystem.out.println(a > b ? "大" : "小"); // 大', title: 'Eval.java' },
    { table: { head: ['表达式', '结果', '关键点'], rows: [
      ['5 / 2', '2', '整数除法截断'],
      ['5 / 2.0', '2.5', '提升为 double'],
      ['5 % 2', '1', '取余'],
      ['a++ + ++b', '8', '先取值与先加一'],
      ['a > b ? "大" : "小"', '大', '三元只执行一个分支']
    ] } }
  ]);

  beforeSummary('scanner', [
    { h: '5.15 输入到校验的完整流程' },
    { p: '一个健壮的输入流程包含：提示、读取、校验、失败重试、关闭。很多作业只写了读取，用户输入错误就崩，这不是“能用”的程序。' },
    { flow: ['打印提示', '读取输入', '校验范围/类型', '失败则提示重试', '成功则保存', '关闭 Scanner'] },
    { p: '校验要具体：不要只说“输入错误”，而是告诉用户“数量必须是大于 0 的整数”。重试要有上限或让用户主动退出，避免死循环。' }
  ]);

  beforeSummary('control', [
    { h: '6.16 用循环和数组做一个小统计' },
    { p: '把数组、循环、分支组合起来，可以完成一个成绩统计器：遍历数组求和、找最值、按分数段计数。这个例子几乎用到了本章所有语法。' },
    { code: 'int[] scores = {88, 92, 75, 60, 95};\nint sum = 0, pass = 0, excellent = 0;\nfor (int s : scores) {\n    sum += s;\n    if (s >= 60) pass++;\n    if (s >= 90) excellent++;\n}\ndouble avg = (double) sum / scores.length;\nSystem.out.printf("平均 %.1f，及格 %d 人，优秀 %d 人%n", avg, pass, excellent);', title: 'ScoreStats.java' },
    { p: '注意 <code>(double) sum / scores.length</code>：如果两边都是 int，平均值会被截断。遍历用增强 for 更简洁，但需要下标时用普通 for。' }
  ]);

  beforeSummary('class-object', [
    { h: '2.13 对象设计练习：订单' },
    { p: '设计一个 Order 类：订单号、商品名、单价、数量，创建后计算总价。思考哪些字段应该 final，哪些方法应该由对象自己提供，而不是让外部拼装。' },
    { code: 'public class Order {\n    private final String id;\n    private final String product;\n    private final double price;\n    private final int quantity;\n\n    public Order(String id, String product, double price, int quantity) {\n        if (quantity <= 0) throw new IllegalArgumentException("数量必须为正");\n        this.id = id;\n        this.product = product;\n        this.price = price;\n        this.quantity = quantity;\n    }\n\n    public double total() { return price * quantity; }\n}', title: 'Order.java' },
    { p: '订单号、商品、单价、数量在创建后不应该变，所以用 final；总价由 total() 计算，而不是存一个可能过期的字段。这样对象始终自洽，也不会出现“改了数量忘了改总价”的 bug。' }
  ]);

  beforeSummary('polymorphism', [
    { h: '5.13 多态与依赖倒置' },
    { p: '依赖倒置原则说：高层模块不应该依赖低层模块，两者都应该依赖抽象。多态让这句话落地：Service 依赖 Notifier 接口，而不是 SmsNotifier 类；替换实现时 Service 不用改。' },
    { p: '判断一段代码是否真的用好了多态，看新增一个实现时要不要改调用方。如果每加一种类型都要改 if-else 或 switch，那只是“用了接口”，还没有得到多态的好处。' }
  ]);

  beforeSummary('enum-record', [
    { h: '7.14 枚举 switch 的穷尽性' },
    { p: '对枚举使用 switch 表达式时，如果覆盖了所有常量，编译器就不再要求 default；新增一个枚举常量后，所有没处理的 switch 会直接编译失败，提醒你补分支。这是枚举相对 int 常量的重要优势。' }
  ]);

  beforeSummary('packages-bean', [
    { h: '8.14 包的可见性与测试' },
    { p: '测试类通常和被测类放在同一个包下（src/test/java 对应目录），这样能访问包级可见的成员，又不需要为了测试把它们改成 public。包的边界设计得好，测试也会更容易。' },
    { list: [
      '对外 API 用 public，内部协作类用默认权限。',
      '测试放在同包，可访问包级成员，但不破坏封装。',
      '不要为了测试把所有字段都改成 public。',
      '包名与目录不一致时，编译和运行都会出问题。'
    ] }
  ]);
})();
