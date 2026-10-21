/* 教材正文补充：每个 OOP 章节追加案例、追问与自测，凑足教材厚度 */
(function () {
  'use strict';
  var T = window.JAVA_TEXTBOOK;
  if (!T) return;

  function insertBeforeSummary(id, blocks) {
    var tb = T[id];
    if (!tb || !tb.blocks) return;
    var pos = tb.blocks.length;
    // 找到最后一个“本章小结”标题的位置，把补充内容插在它前面
    for (var i = tb.blocks.length - 1; i >= 0; i--) {
      if (tb.blocks[i].h && tb.blocks[i].h.indexOf('本章小结') >= 0) { pos = i; break; }
    }
    tb.blocks.splice.apply(tb.blocks, [pos, 0].concat(blocks));
  }

  insertBeforeSummary('methods', [
    { h: '1.11 综合案例：一个可复用的数组工具' },
    { p: '把前面学的签名、返回值、重载、可变参数组合起来，写一个数组工具类：既能求最大值，也能求平均值，还能判断是否包含某个值。注意每个方法只做一件事，参数和返回值都尽量明确。' },
    { code: 'public final class IntArrays {\n    private IntArrays() { }\n\n    public static int max(int[] a) {\n        if (a == null || a.length == 0) {\n            throw new IllegalArgumentException("数组不能为空");\n        }\n        int max = a[0];\n        for (int v : a) if (v > max) max = v;\n        return max;\n    }\n\n    public static double average(int... a) {\n        if (a.length == 0) return 0;\n        int sum = 0;\n        for (int v : a) sum += v;\n        return (double) sum / a.length;\n    }\n\n    public static boolean contains(int[] a, int target) {\n        for (int v : a) if (v == target) return true;\n        return false;\n    }\n}', title: 'IntArrays.java' },
    { p: '这个类只有静态方法，构造器私有，防止被实例化；max 对空数组抛异常而不是返回 0，因为 0 可能是合法最大值，返回 0 会掩盖错误；average 用可变参数，调用时可以直接传数字。每个方法都只有一个职责，测试起来非常直接。' },
    { h: '1.12 常见追问' },
    { list: [
      '为什么 Java 不支持引用传递？因为引用本身也是按值复制，语言层面统一为值传递，语义更简单、更安全。',
      '返回值类型不同能不能重载？不能，编译器只根据方法名和参数列表区分。',
      '递归和循环怎么选？递归表达力强但受栈深限制；能用循环且逻辑清晰时优先循环。',
      '方法参数用基本类型还是包装类？业务上可能为空的用包装类，计算密集且绝不为空的用基本类型。',
      '为什么工具类要私有构造器？防止被 new，也向阅读者表明“这是工具类，不应该有实例”。'
    ] },
    { h: '1.13 自测与练习' },
    { ol: [
      '写一个 swap 方法，交换数组的两个下标，验证外部数组确实改变。',
      '写三个重载的 area 方法，分别计算圆、矩形、三角形的面积。',
      '用递归实现二分查找，并分析它的调用栈深度。',
      '把本章的 IntArrays 改成泛型版本，思考为什么不能直接 new T[]。'
    ] }
  ]);

  insertBeforeSummary('class-object', [
    { h: '2.10 综合案例：银行账户对象' },
    { p: '设计一个 Account 类：字段有账号、余额；构造器校验账号非空、初始余额不能为负；方法有存款、取款、查询余额。再创建两个账户，演示对象之间互不影响，以及同一个对象被两个引用共享时的效果。' },
    { code: 'public class Account {\n    private final String id;\n    private long balance;\n\n    public Account(String id, long balance) {\n        if (id == null || id.isBlank()) throw new IllegalArgumentException("账号不能为空");\n        if (balance < 0) throw new IllegalArgumentException("初始余额不能为负");\n        this.id = id;\n        this.balance = balance;\n    }\n\n    public void deposit(long amount) {\n        if (amount <= 0) throw new IllegalArgumentException("金额必须为正");\n        balance += amount;\n    }\n\n    public void withdraw(long amount) {\n        if (amount <= 0) throw new IllegalArgumentException("金额必须为正");\n        if (amount > balance) throw new IllegalStateException("余额不足");\n        balance -= amount;\n    }\n\n    public long getBalance() { return balance; }\n    public String getId() { return id; }\n}', title: 'Account.java' },
    { p: 'Account 的 id 是 final 的，创建后不能改；balance 只能通过存取款改变，外部没有 setBalance。创建两个 Account 对象，它们的字段互不影响；如果把 a1 赋给 a2，两个引用指向同一个对象，通过 a2 存款，a1 的余额也会变。' },
    { h: '2.11 对象与引用的常见追问' },
    { list: [
      '对象一定在堆上吗？Java 对象通常分配在堆上，JIT 的逃逸分析可能把未逃逸对象优化到栈上，但这是实现细节。',
      '把对象置为 null 就会立即回收吗？不会，只是去掉一个可达引用，具体回收由 GC 决定。',
      '为什么字符串常量池能复用对象？因为 String 不可变，共享不会带来副作用。',
      '两个对象 equals 相等，hashCode 一定相等吗？重写规范要求相等对象必须有相同 hashCode。',
      '构造器可以返回 null 吗？不能，构造器没有返回值；new 永远返回新对象（除非构造器抛异常）。'
    ] },
    { h: '2.12 自测与练习' },
    { ol: [
      '给 Account 增加转账方法 transfer(Account target, long amount)，处理余额不足和 target 为 null。',
      '让两个引用指向同一个 Account，验证修改互相可见；再用复制构造器创建独立副本。',
      '给 Student 重写 equals 和 hashCode，让姓名和年龄相同即视为相等，并放进 HashSet 验证去重。',
      '思考：为什么实体类通常不建议用 record？列出至少两个原因。'
    ] }
  ]);

  insertBeforeSummary('encapsulation', [
    { h: '3.12 综合案例：购物车' },
    { p: '购物车需要维护商品列表和总价。外部不能直接改总价，只能通过添加、删除商品让总价自动重算；数量必须为正；删除不存在的商品要给出明确结果。这个案例把封装、集合和校验串在一起。' },
    { code: 'public class Cart {\n    private final Map<String, Integer> items = new LinkedHashMap<>();\n\n    public void add(String name, int quantity) {\n        if (name == null || name.isBlank()) throw new IllegalArgumentException("商品名不能为空");\n        if (quantity <= 0) throw new IllegalArgumentException("数量必须为正");\n        items.merge(name, quantity, Integer::sum);\n    }\n\n    public boolean remove(String name) {\n        return items.remove(name) != null;\n    }\n\n    public int totalQuantity() {\n        int total = 0;\n        for (int q : items.values()) total += q;\n        return total;\n    }\n\n    public Map<String, Integer> snapshot() {\n        return Map.copyOf(items);   // 返回不可变副本，防止外部改动内部状态\n    }\n}', title: 'Cart.java' },
    { p: '注意 snapshot 返回的是 <code>Map.copyOf(items)</code>，而不是 items 本身。如果直接返回内部 Map，外部就能调用 clear 清空购物车，封装被绕过。集合字段的 getter 要么返回副本，要么返回不可变视图。' },
    { h: '3.13 关于 static 的追问' },
    { list: [
      'static 方法能被重写吗？不能，只能被隐藏；多态调用看变量声明类型。',
      'static 字段什么时候初始化？类首次主动使用时，按书写顺序执行静态赋值和 static 块。',
      '单例为什么常用 static？实例保存在静态字段里，全局唯一，通过静态方法获取。',
      '工具类为什么要私有构造器？防止实例化，明确它是无状态工具。',
      'static 会导致内存泄漏吗？静态集合长期持有对象引用，确实可能阻止 GC。'
    ] },
    { h: '3.14 自测与练习' },
    { ol: [
      '给 Cart 增加修改数量的方法，数量为 0 时删除商品，负数抛异常。',
      '给 Person 增加修改密码的方法，要求旧密码正确、新密码长度至少 8 位。',
      '用 static 计数器统计某个类创建了多少对象，并在 main 结束时打印。',
      '写一个类，验证静态块、实例块、构造器的执行顺序。'
    ] }
  ]);

  insertBeforeSummary('inheritance', [
    { h: '4.11 综合案例：员工薪资体系' },
    { p: '公司有普通员工和经理。普通员工按小时计薪，经理有固定月薪和奖金。两者都有姓名、工号，都能计算月薪。用继承抽取公共字段，用重写实现不同的计算方式。' },
    { code: 'abstract class Employee {\n    protected final String name;\n    protected final String id;\n\n    protected Employee(String name, String id) {\n        this.name = name;\n        this.id = id;\n    }\n\n    public abstract double monthlyPay();\n\n    public String describe() {\n        return name + "(" + id + ") 月薪 " + monthlyPay();\n    }\n}\n\nclass HourlyEmployee extends Employee {\n    private final double hours;\n    private final double rate;\n\n    HourlyEmployee(String name, String id, double hours, double rate) {\n        super(name, id);\n        this.hours = hours;\n        this.rate = rate;\n    }\n\n    public double monthlyPay() { return hours * rate; }\n}\n\nclass Manager extends Employee {\n    private final double base;\n    private final double bonus;\n\n    Manager(String name, String id, double base, double bonus) {\n        super(name, id);\n        this.base = base;\n        this.bonus = bonus;\n    }\n\n    public double monthlyPay() { return base + bonus; }\n}', title: 'Employee.java' },
    { p: 'Employee 把姓名、工号、describe 模板放在父类，把 monthlyPay 留给子类实现；新增“外包员工”时只需继承并实现 monthlyPay，describe 和调用方都不用改。这就是继承 + 多态的组合价值。' },
    { h: '4.12 继承的常见追问' },
    { list: [
      '子类能继承父类的 private 字段吗？字段存在于对象中，但子类不能直接访问，只能通过父类方法。',
      '父类构造器里调用被子类重写的方法会怎样？会执行子类版本，但此时子类字段还没初始化，可能拿到默认值。',
      '为什么组合优于继承？组合耦合更低，可以在运行时替换，也不会暴露父类全部 API。',
      'final 类能有什么好处？不可变、线程安全、可以放心共享，例如 String。',
      '接口和抽象类都能多态，为什么还要继承？继承可以复用父类的字段和实现，接口只能复用签名和 default。'
    ] },
    { h: '4.13 自测与练习' },
    { ol: [
      '给员工体系增加一个“销售员工”，月薪 = 底薪 + 销售额 × 提成比例。',
      '在 Employee 中增加一个 final 方法 printPayslip，内部调用 monthlyPay，体会模板方法。',
      '写一个反例：让 Stack 继承 ArrayList，说明为什么这是糟糕的继承。',
      '给 Dog 增加一个 fetch 方法，用向上转型和向下转型分别调用，比较编译与运行结果。'
    ] }
  ]);

  insertBeforeSummary('polymorphism', [
    { h: '5.10 综合案例：消息发送器' },
    { p: '系统需要通过短信、邮件、站内信发送通知，未来可能增加微信。定义 Notifier 接口和 send 方法，每种渠道一个实现；NotificationService 依赖接口，运行时注入不同实现。新增渠道时不修改服务代码。' },
    { code: 'interface Notifier {\n    void send(String to, String message);\n}\n\nclass SmsNotifier implements Notifier {\n    public void send(String to, String message) {\n        System.out.println("短信 -> " + to + ": " + message);\n    }\n}\n\nclass EmailNotifier implements Notifier {\n    public void send(String to, String message) {\n        System.out.println("邮件 -> " + to + ": " + message);\n    }\n}\n\nclass NotificationService {\n    private final List<Notifier> notifiers;\n\n    NotificationService(List<Notifier> notifiers) {\n        this.notifiers = notifiers;\n    }\n\n    void notifyAll(String to, String message) {\n        for (Notifier n : notifiers) n.send(to, message);\n    }\n}', title: 'Notifier.java' },
    { p: 'NotificationService 完全不知道具体渠道，只依赖 Notifier；新增微信只需写一个实现并加入列表。这就是“对扩展开放、对修改关闭”。如果把渠道写成 if-else，每加一种都要改服务类，测试范围也会扩大。' },
    { h: '5.11 多态的常见追问' },
    { list: [
      '重载是多态吗？广义上叫编译期多态，但 Java 的动态绑定只针对重写。',
      '构造器能多态吗？构造器不是实例方法，不能重写，只能重载。',
      'private 方法能被多态调用吗？不能，子类看不见，调用的是父类自己的版本。',
      '为什么字段不参与多态？字段在编译期按声明类型解析，访问的是对应内存偏移。',
      'instanceof 和 getClass 有什么区别？instanceof 支持子类判断，getClass 要求完全相同。'
    ] },
    { h: '5.12 自测与练习' },
    { ol: [
      '给 Notifier 增加微信实现，验证 NotificationService 不需要修改。',
      '写一个方法接收 Object，用 instanceof 分别处理 String、Integer、List。',
      '用多态重构一段 if-else 类型的代码，画出重构前后的类图。',
      '解释为什么“面向接口编程”能降低单元测试的难度。'
    ] }
  ]);

  insertBeforeSummary('abstract-interface', [
    { h: '6.10 综合案例：文件解析器' },
    { p: '系统要解析 CSV、JSON、XML 三种文件。解析流程都是“打开 → 校验 → 解析 → 关闭”，只有解析步骤不同。用抽象类定义模板方法，把 parse 留给子类；再用接口 Parser 描述“能解析”的能力，方便替换实现。' },
    { code: 'abstract class AbstractFileParser implements Parser {\n    @Override\n    public final List<String> parse(String path) {\n        open(path);\n        validate();\n        List<String> rows = doParse();\n        close();\n        return rows;\n    }\n\n    protected abstract List<String> doParse();\n\n    protected void open(String path) { System.out.println("打开 " + path); }\n    protected void validate() { }\n    protected void close() { System.out.println("关闭文件"); }\n}\n\nclass CsvParser extends AbstractFileParser {\n    protected List<String> doParse() {\n        return List.of("a,b", "c,d");\n    }\n}\n\ninterface Parser {\n    List<String> parse(String path);\n}', title: 'Parser.java' },
    { p: '模板方法 parse 是 final 的，保证打开、校验、关闭一定执行；子类只实现 doParse，不会忘记释放资源。Parser 接口让调用方可以依赖抽象，测试时可以传入一个假实现，不需要真的读文件。' },
    { h: '6.11 抽象类与接口的追问' },
    { list: [
      '抽象类可以有构造器吗？可以，供子类调用，但不能直接 new。',
      '接口可以有构造器吗？不可以，接口没有实例状态。',
      'default 方法会被继承吗？会，实现类可以直接使用，也可以重写。',
      '一个类能同时继承抽象类并实现接口吗？可以，这也是框架里最常见的组合。',
      '接口里的字段为什么必须是 public static final？接口没有实例，字段只能是常量。'
    ] },
    { h: '6.12 自测与练习' },
    { ol: [
      '给 Parser 增加 JsonParser，复用模板方法，只实现 doParse。',
      '设计一个 Comparable 的自定义类，按价格排序，再用 Comparator 按名称排序。',
      '把 Parser 拆成“可解析”和“可校验”两个接口，体会接口隔离。',
      '写一个接口，包含 default 方法和 static 工具方法，各调用一次。'
    ] }
  ]);

  insertBeforeSummary('enum-record', [
    { h: '7.11 综合案例：订单状态机' },
    { p: '订单状态不能随意跳转：待支付只能变成已支付或已取消，已支付只能发货，已完成不能回退。用枚举表达状态，并为每个状态定义允许的下一步，把规则集中起来，避免散落在 if-else 里。' },
    { code: 'public enum OrderState {\n    PENDING(Set.of("PAID", "CANCELLED")),\n    PAID(Set.of("SHIPPED")),\n    SHIPPED(Set.of("COMPLETED")),\n    COMPLETED(Set.of()),\n    CANCELLED(Set.of());\n\n    private final Set<String> next;\n\n    OrderState(Set<String> next) { this.next = next; }\n\n    public boolean canMoveTo(OrderState target) {\n        return next.contains(target.name());\n    }\n\n    public void moveTo(OrderState target) {\n        if (!canMoveTo(target)) {\n            throw new IllegalStateException(name() + " 不能变成 " + target);\n        }\n    }\n}', title: 'OrderState.java' },
    { p: '把规则放进枚举，新增状态时只改枚举定义，调用方统一用 canMoveTo 判断。相比一堆 if-else，规则更集中、更可测，也不会出现“漏写某个分支”。' },
    { h: '7.12 枚举与 record 的追问' },
    { list: [
      '枚举可以被继承吗？不能，已经隐式继承 Enum，且通常是 final。',
      '枚举的 ordinal 能存数据库吗？不建议，常量顺序变化会导致历史数据错位，存 name 或自定义 code。',
      'record 能实现接口吗？能，record 可以实现接口并参与多态。',
      'record 能有静态字段吗？能，静态字段不属于实例，不受不可变限制。',
      'record 的 equals 比较什么？比较所有组件，按值相等。'
    ] },
    { h: '7.13 自测与练习' },
    { ol: [
      '给 OrderState 增加 REFUNDING 状态，并更新允许的跳转。',
      '用 EnumMap 统计一组订单中各状态的数量。',
      '把 Point 改成 record，比较它与普通类的 equals/toString 行为。',
      '用 sealed + record + switch 模式匹配写一个图形面积计算器。'
    ] }
  ]);

  insertBeforeSummary('packages-bean', [
    { h: '8.11 综合案例：一个分层的小项目' },
    { p: '一个最小的分层项目通常包含：model 放实体，repository 放数据访问，service 放业务，controller 放入口，util 放工具。包之间单向依赖：controller → service → repository → model。反向依赖会让代码难以测试和维护。' },
    { code: 'com.example.library\n├── LibraryApplication.java     // 启动类\n├── model/\n│   ├── Book.java               // JavaBean\n│   └── Reader.java\n├── repository/\n│   └── BookRepository.java     // 内存或数据库访问\n├── service/\n│   └── BookService.java        // 借书、还书规则\n├── controller/\n│   └── BookController.java     // HTTP 接口\n└── util/\n    └── IdGenerator.java        // 工具类', title: '项目结构' },
    { p: 'Book 作为 JavaBean 被 controller 接收 JSON、被 repository 存取、被 service 校验；BookController 只做参数转换和调用，不写业务；BookService 不依赖 HTTP；BookRepository 不依赖业务规则。每一层都可以单独测试。' },
    { h: '8.12 包与 JavaBean 的追问' },
    { list: [
      '同包类需要 import 吗？不需要，同包直接可见。',
      'protected 和默认权限差在哪？protected 多了“跨包子类可访问”。',
      'JavaBean 必须有 getter 吗？严格说需要可读属性；只写 getter 不写 setter 也可以，但反序列化可能失败。',
      'Lombok 的 @Data 算 JavaBean 吗？编译后生成 getter/setter，等价于 JavaBean，但要注意它生成的 equals/hashCode 语义。',
      '包名能用大写吗？语法允许，但约定全小写，避免与类名混淆。'
    ] },
    { h: '8.13 自测与练习' },
    { ol: [
      '把本章的 Book 放进 com.example.model 包，写一个 service 调用它，体会 import。',
      '把 Book 的字段改成 private，生成规范的 getter/setter，用 Jackson 序列化验证字段名。',
      '给 util 包写一个 IdGenerator，构造器私有，提供静态方法。',
      '画出一个分层项目的依赖箭头图，标出哪些依赖是允许的、哪些是反向依赖。'
    ] }
  ]);
})();
