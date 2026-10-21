/* 教材正文补充：每个 OOP 章节追加案例、追问与自测，凑足教材厚度 */
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

  function insertBeforeSummary(id, blocks) {
    var tb = T[id];
    if (!tb || !tb.blocks) return;
    continueNumbering(tb, blocks);
    var pos = tb.blocks.length;
    // 找到最后一个“本章小结”标题的位置，把补充内容插在它前面
    for (var i = tb.blocks.length - 1; i >= 0; i--) {
      if (tb.blocks[i].h && tb.blocks[i].h.indexOf('本章小结') >= 0) { pos = i; break; }
    }
    tb.blocks.splice.apply(tb.blocks, [pos, 0].concat(blocks));
  }

  insertBeforeSummary('methods', [
    { h: '1.12 综合案例：一个可复用的数组工具' },
    { p: '把前面学的签名、返回值、重载、可变参数组合起来，写一个数组工具类：既能求最大值，也能求平均值，还能判断是否包含某个值。注意每个方法只做一件事，参数和返回值都尽量明确。' },
    { code: 'public final class IntArrays {\n    private IntArrays() { }\n\n    public static int max(int[] a) {\n        if (a == null || a.length == 0) {\n            throw new IllegalArgumentException("数组不能为空");\n        }\n        int max = a[0];\n        for (int v : a) if (v > max) max = v;\n        return max;\n    }\n\n    public static double average(int... a) {\n        if (a.length == 0) return 0;\n        int sum = 0;\n        for (int v : a) sum += v;\n        return (double) sum / a.length;\n    }\n\n    public static boolean contains(int[] a, int target) {\n        for (int v : a) if (v == target) return true;\n        return false;\n    }\n}', title: 'IntArrays.java' },
    { p: '这个类只有静态方法，构造器私有，防止被实例化；max 对空数组抛异常而不是返回 0，因为 0 可能是合法最大值，返回 0 会掩盖错误；average 用可变参数，调用时可以直接传数字。每个方法都只有一个职责，测试起来非常直接。' },
    { h: '1.13 本章小结' },
    { list: [
      '方法是契约：调用者关心签名，实现者关心逻辑。',
      'Java 只有值传递；基本类型复制数值，对象复制引用地址。',
      '重载看参数列表，返回值不同不构成重载。',
      '递归必须有终止条件，否则 StackOverflowError。'
    ] },
    { h: '常见追问' },
    { list: [
      '<b>问：为什么 Java 不提供引用传递？</b><br>答：Java 只有值传递：基本类型传的是数值副本，对象传的是引用地址的副本。副本指向同一个对象，所以方法内能改对象内部状态，却没法把调用方的变量改指别的对象。统一成一种调用约定后，编译器与 JIT 不需要区分两套语义，调用方也不必担心自己的变量被方法偷偷换掉；需要「返回多个值」时用返回对象或数组，而不是靠输出参数。',
      '<b>问：返回值类型不同能不能构成重载？</b><br>答：不能。编译器在调用点只看方法名与实参类型来决定绑定哪个方法，方法签名等于名字加参数列表，返回值不参与判定。所以同一个类里写 <code>int f()</code> 和 <code>long f()</code> 会直接编译失败，报「method f() is already defined」。确实要按类型区分只能换名字（<code>parseInt</code> 与 <code>parseLong</code>），或者让调用方多传一个类型标记参数。',
      '<b>问：递归和循环怎么选？</b><br>答：递归适合问题本身自相似、状态能用参数表达的场合，比如二叉树遍历、归并排序、回溯搜索，代码短且容易论证正确；循环适合线性扫描和需要精确控制步长的场合。工程上还要看两点：栈深——每层递归占一个栈帧，深度上万基本会 <code>StackOverflowError</code>，循环不占栈；可读性——带两三个递归分支的问题硬改写成循环，要自己维护显式栈，反而更难维护。能用循环且逻辑仍清晰时优先循环。',
      '<b>问：方法参数用基本类型还是包装类？</b><br>答：看两件事：能不能为空、要不要表达缺省。业务上一个值确实可能缺失（数据库可为空列、JSON 没传这个字段），就用包装类并显式判空；计算密集、循环内高频调用的场景用基本类型，避免装箱。<code>Long sum</code> 在循环里自增会不断产生临时对象，而包装类的 <code>==</code> 只在 -128 到 127 的缓存范围内才等价于值比较，比较大小要用 <code>equals</code> 或先拆箱。',
      '<b>问：为什么工具类要写私有构造器？</b><br>答：工具类只有静态方法、没有实例状态，<code>new</code> 出来的对象没有任何用处，却会让读代码的人以为它有状态。私有构造器在编译期就堵死实例化，同时取消编译器自动生成的公开无参构造器；想连反射都挡住，就把构造器体写成 <code>throw new AssertionError()</code>，类本身再声明成 <code>final</code>，免得被继承出一条有状态的子类。JDK 的 <code>java.lang.Math</code>、<code>java.util.Collections</code> 都是这个写法。'
    ] },
    { h: '自测与练习' },
    { p: '四道题都请真敲一遍：前三题验证值传递、重载与栈深，最后一题体会类型擦除的限制。' },
    { ol: [
      '写一个 swap 方法，交换数组的两个下标，验证外部数组确实改变。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><b>预期现象</b>：调用后打印数组，两个位置上的元素已经互换，调用方持有的引用看到的内容跟着变了。<b>为什么</b>：数组是对象，传参复制的是引用地址，方法里的 <code>a</code> 与调用方的 <code>arr</code> 指向同一块堆内存，改的是元素而不是引用本身。<b>要点</b>：<code>static void swap(int[] a, int i, int j) { int t = a[i]; a[i] = a[j]; a[j] = t; }</code>；若写成 <code>static void swap(int x, int y)</code>，交换的只是两个副本，调用方毫无变化，这正是值传递的证据。</div></details>',
      '写三个重载的 area 方法，分别计算圆、矩形、三角形的面积。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><b>预期现象</b>：<code>area(2.0)</code> 得 12.566，<code>area(2, 3)</code> 得 6.0，<code>area(3, 4, 5)</code> 得 6.0（海伦公式），三个调用都能编译，按实参个数与类型自动选中版本。<b>为什么</b>：重载解析依次尝试「个数相同 → 类型精确匹配 → 拓宽转换 → 装箱与可变参数」，<code>int</code> 实参可以拓宽成 <code>double</code>，所以 <code>area(2, 3)</code> 落到两参数版本。<b>要点</b>：<code>area(double r)</code>、<code>area(double w, double h)</code>、<code>area(double a, double b, double c)</code>，三角形里 <code>double p = (a + b + c) / 2</code> 后取 <code>Math.sqrt(p * (p - a) * (p - b) * (p - c))</code>；三边不满足三角不等式时要抛 <code>IllegalArgumentException</code>。</div></details>',
      '用递归实现二分查找，并分析它的调用栈深度。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><b>预期现象</b>：在 10 个元素的有序数组里查找，最多递归 4 层（约为 log2(10) 向上取整再加 1），命中返回下标，找不到返回 -1。<b>为什么</b>：每层把区间折半，深度是 O(log n)，即便一亿个元素也只有约 27 层，远小于默认栈能承受的量级，所以二分查找用递归不会栈溢出，这也是它和线性递归的本质区别。<b>要点</b>：<code>static int bs(int[] a, int lo, int hi, int t)</code>，终止条件 <code>if (lo &gt; hi) return -1;</code>，中点写 <code>int mid = lo + (hi - lo) / 2</code> 避免 <code>lo + hi</code> 溢出，比较后只递归一侧，不要两侧都递。</div></details>',
      '把本章的 IntArrays 改成泛型版本，思考为什么不能直接 new T[]。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><b>预期现象</b>：把 <code>max</code> 改成 <code>static &lt;T extends Comparable&lt;T&gt;&gt; T max(T[] a)</code> 后，方法体能写但 <code>new T[10]</code> 编译不过，报 generic array creation。<b>为什么</b>：泛型在编译期被擦除，运行期 <code>T</code> 已经变成 <code>Object</code> 或它的上界，无法知道该分配什么元素类型的数组；而数组在运行期必须记住自己的元素类型，以便赋值时做 <code>ArrayStoreException</code> 检查，两者的类型策略冲突。<b>要点</b>：比较用 <code>a[i].compareTo(max) &gt; 0</code> 而不是 <code>&gt;</code>；要么传一个 <code>IntFunction&lt;T[]&gt;</code> 工厂（<code>Arrays.copyOf</code> 那套），要么内部改用 <code>List&lt;T&gt;</code>，实在要强转就写 <code>(T[]) new Object[n]</code> 并加注解抑制警告。</div></details>'
    ] }
  ]);

  insertBeforeSummary('class-object', [
    { h: '2.14 综合案例：银行账户对象' },
    { p: '设计一个 Account 类：字段有账号、余额；构造器校验账号非空、初始余额不能为负；方法有存款、取款、查询余额。再创建两个账户，演示对象之间互不影响，以及同一个对象被两个引用共享时的效果。' },
    { code: 'public class Account {\n    private final String id;\n    private long balance;\n\n    public Account(String id, long balance) {\n        if (id == null || id.isBlank()) throw new IllegalArgumentException("账号不能为空");\n        if (balance < 0) throw new IllegalArgumentException("初始余额不能为负");\n        this.id = id;\n        this.balance = balance;\n    }\n\n    public void deposit(long amount) {\n        if (amount <= 0) throw new IllegalArgumentException("金额必须为正");\n        balance += amount;\n    }\n\n    public void withdraw(long amount) {\n        if (amount <= 0) throw new IllegalArgumentException("金额必须为正");\n        if (amount > balance) throw new IllegalStateException("余额不足");\n        balance -= amount;\n    }\n\n    public long getBalance() { return balance; }\n    public String getId() { return id; }\n}', title: 'Account.java' },
    { p: 'Account 的 id 是 final 的，创建后不能改；balance 只能通过存取款改变，外部没有 setBalance。创建两个 Account 对象，它们的字段互不影响；如果把 a1 赋给 a2，两个引用指向同一个对象，通过 a2 存款，a1 的余额也会变。' },
    { h: '2.15 本章小结' },
    { list: [
      '类是模板，对象是实例；字段描述状态，方法描述行为。',
      'new 在堆上分配对象，变量在栈上保存引用；赋值复制的是引用。',
      '构造器负责初始化，写了有参构造器后默认无参构造器消失。',
      '内容相等用 equals；自定义类重写 equals 时同步重写 hashCode。'
    ] },
    { h: '常见追问' },
    { list: [
      '<b>问：Java 对象一定分配在堆上吗？</b><br>答：按语言规范，<code>new</code> 出来的对象归 GC 管理的堆内存，但 JIT 的逃逸分析可以把「只在方法内使用、没有逃逸出方法」的对象做标量替换，字段直接拆成局部变量放在栈上甚至寄存器里，所以实测中「对象一定在堆上」并不总成立。想看证据要开诊断参数（<code>-XX:+UnlockDiagnosticVMOptions -XX:+PrintEliminateAllocations</code>）或用 JITWatch 观察。这属于实现细节，写代码不能依赖它——<code>==</code> 的身份比较、<code>synchronized(obj)</code> 的锁语义都按堆对象定义。',
      '<b>问：把对象引用置为 null 就会立即回收吗？</b><br>答：不会。<code>a = null</code> 只是让这个引用不再指向堆对象，可达性分析在下次 GC 时才会判定它真的不可达，而回收时机由分代策略与内存压力决定。真正需要「尽快释放」时要处理的是长生命周期的容器：<code>static Map</code> 里的键、缓存里的条目、监听器列表，这些不清就永远是 GC Root 可达的。变量上显式写 null 只在一种场景有意义：一个很长的方法里先持有大数组、后面还有耗时计算，此时提前结束作用域或置 null 能让这批内存早点被回收；类字段上的 null 赋值通常没用。',
      '<b>问：为什么字符串常量池能复用对象？</b><br>答：因为 <code>String</code> 不可变：内部的 <code>byte[]</code>（Java 9 起，之前是 <code>char[]</code>）在创建后不会改，<code>hashCode</code> 还能缓存下来，所以多个引用共享同一个实例不会互相影响。<code>"abc"</code> 这样的字面量在类加载时进入字符串池（Java 7 起池从永久代移到堆），<code>intern()</code> 则把运行期拼出的字符串登记进池并返回池中已有的引用。若 String 可变，任何持有者都能改掉池里的内容并影响所有引用者，复用就无从谈起，这也是「不可变是共享安全前提」的最好例子。',
      '<b>问：两个对象 equals 相等，hashCode 一定相等吗？</b><br>答：按契约必须相等，这正是重写 <code>equals</code> 时不同步重写 <code>hashCode</code> 会导致灾难的原因：两个 equals 为 true 但哈希不同的对象会被放进 <code>HashMap</code> 的不同桶，<code>map.get(相等键)</code> 直接返回 null，<code>HashSet</code> 也去不了重。契约共有三条：同一次运行内同一对象的 hashCode 必须稳定；hashCode 相同的两个对象 equals 允许为 false（哈希冲突靠 equals 兜底）；任何非 null 对象与 null 比较 equals 必须为 false。用 IDE 或 <code>Objects.hash</code> 生成的实现天然满足。',
      '<b>问：构造器可以返回 null 吗？</b><br>答：不能。构造器没有返回值类型，也不能写 <code>return 值</code>；<code>new</code> 表达式的静态类型就是被 new 的那个类，只要构造器正常走完，调用方一定拿到非 null 引用（构造器里写 <code>return;</code> 是合法的，只表示提前结束）。真正会让 <code>new</code> 失败的是构造器抛异常——此时对象不会交给调用方，引用也不会被赋值。所以「可能为 null 的对象」只能来自方法返回值、字段、数组元素或转型结果，不可能来自构造器。'
    ] },
    { h: '自测与练习' },
    { p: '四道题都在 Account 与 Student 上动手：先自己写，再对照答案检查报错类型和字段可见性。' },
    { ol: [
      '给 Account 增加转账方法 transfer(Account target, long amount)，处理余额不足和 target 为 null。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><b>预期现象</b>：<code>a.transfer(b, 100)</code> 后 a 减 100、b 加 100；<code>a.transfer(null, 10)</code> 抛 <code>IllegalArgumentException</code>；<code>a.transfer(b, 1000000)</code> 抛 <code>IllegalStateException("余额不足")</code>，且两边余额都不变。<b>为什么</b>：转账是「一个动作改两个对象」的复合操作，必须在落地前完成全部前置校验，否则会出现「a 已扣、b 未加」的中间状态，余额守恒被破坏。<b>要点</b>：先判 <code>target == null || target == this</code> 与 <code>amount &lt;= 0</code>，再判 <code>amount &gt; balance</code>，最后才 <code>balance -= amount; target.balance += amount;</code>；同类对象可以直接读写私有字段，这是「同源访问」的合法用法。</div></details>',
      '让两个引用指向同一个 Account，验证修改互相可见；再用复制构造器创建独立副本。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><b>预期现象</b>：<code>Account a2 = a1;</code> 之后 <code>a2.deposit(50)</code>，<code>a1.getBalance()</code> 同步增加 50；而 <code>new Account(a1)</code> 生成的副本上存款，<code>a1</code> 的余额一点都不变。<b>为什么</b>：赋值复制的是引用地址，两个变量指向同一个堆对象，任何一方调用方法改的都是同一份字段；复制构造器新建了对象，字段值被复制一份，此后两者再无共享关系。<b>要点</b>：<code>public Account(Account other) { this(other.id, other.balance); }</code>；<code>id</code> 是 <code>final</code> 字段，只能在构造器里赋值一次，所以副本必须通过 <code>this(...)</code> 或直接赋一次完成，不能在构造器里再改。<code>getBalance()</code> 而不是字段直读，说明封装仍然生效。</div></details>',
      '给 Student 重写 equals 和 hashCode，让姓名和年龄相同即视为相等，并放进 HashSet 验证去重。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><b>预期现象</b>：两个姓名年龄都相同的 Student 加进 <code>HashSet</code> 后集合大小仍是 1；完全没重写时大小是 2，只重写 equals 不重写 hashCode 时同样是 2。<b>为什么</b>：<code>HashSet</code> 先用 <code>hashCode</code> 定位桶，再用 <code>equals</code> 比较桶内元素，两步缺一不可；只改 equals 时两者落在不同桶，根本不会进入逐元素比较，所以去重失效。<b>要点</b>：<code>public boolean equals(Object o) { if (this == o) return true; if (o == null || getClass() != o.getClass()) return false; Student s = (Student) o; return age == s.age &amp;&amp; Objects.equals(name, s.name); }</code> 与 <code>public int hashCode() { return Objects.hash(name, age); }</code>；用 <code>getClass()</code> 而不是 <code>instanceof</code> 才能保证对称性，参数类型必须是 <code>Object</code> 才构成重写。</div></details>',
      '思考：为什么实体类通常不建议用 record？列出至少两个原因。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><b>预期现象</b>：这道题没有命令可跑，做完后要对一个带 JPA 注解的类说清「为什么不能是 record」。<b>为什么</b>：一是 record 的组件全是 <code>private final</code>、没有 setter，而 Hibernate 等 ORM 需要无参构造器与可写状态才能做延迟加载和字段填充；二是 record 的 <code>equals</code>/<code>hashCode</code> 按全部组件生成且不可改，代理对象与懒加载场景容易判错；三是 record 隐式 final，不能被子类继承，而不少框架靠动态子类生成代理。<b>要点</b>：DTO/VO、查询结果行、事件对象、坐标值这类不可变载体用 record 最合适，<code>toString</code> 与 <code>equals</code> 白送；带 ORM 注解、需要可变生命周期的实体仍用普通类，必要时把不可变的值拆成 record 字段。</div></details>'
    ] }
  ]);

  insertBeforeSummary('encapsulation', [
    { h: '3.13 综合案例：购物车' },
    { p: '购物车需要维护商品列表和总价。外部不能直接改总价，只能通过添加、删除商品让总价自动重算；数量必须为正；删除不存在的商品要给出明确结果。这个案例把封装、集合和校验串在一起。' },
    { code: 'public class Cart {\n    private final Map<String, Integer> items = new LinkedHashMap<>();\n\n    public void add(String name, int quantity) {\n        if (name == null || name.isBlank()) throw new IllegalArgumentException("商品名不能为空");\n        if (quantity <= 0) throw new IllegalArgumentException("数量必须为正");\n        items.merge(name, quantity, Integer::sum);\n    }\n\n    public boolean remove(String name) {\n        return items.remove(name) != null;\n    }\n\n    public int totalQuantity() {\n        int total = 0;\n        for (int q : items.values()) total += q;\n        return total;\n    }\n\n    public Map<String, Integer> snapshot() {\n        return Map.copyOf(items);   // 返回不可变副本，防止外部改动内部状态\n    }\n}', title: 'Cart.java' },
    { p: '注意 snapshot 返回的是 <code>Map.copyOf(items)</code>，而不是 items 本身。如果直接返回内部 Map，外部就能调用 clear 清空购物车，封装被绕过。集合字段的 getter 要么返回副本，要么返回不可变视图。' },
    { h: '3.14 本章小结' },
    { list: [
      '封装 = 私有字段 + 受控入口 + 业务规则。',
      '访问权限从紧到松：private → 默认 → protected → public。',
      'static 属于类，实例成员属于对象；静态方法没有 this。',
      '初始化顺序：父类静态 → 子类静态 → 实例块 → 构造器。'
    ] },
    { h: '常见追问' },
    { list: [
      '<b>问：static 方法能被重写吗？</b><br>答：不能，只能被隐藏。静态方法在编译期就按变量的声明类型解析，子类里写同名同参的 static 方法只是把父类版本藏起来：<code>Parent p = new Child(); p.staticM()</code> 调的是 <code>Parent</code> 的版本，<code>Child.staticM()</code> 才是子类的版本。所以给静态方法加 <code>@Override</code> 会直接报编译错误。真正的多态只发生在实例方法上，靠虚方法表在运行时按对象真实类型分派；字段同理，也只看变量的声明类型。',
      '<b>问：static 字段什么时候初始化？</b><br>答：在类第一次被主动使用时初始化，且只执行一次：<code>new</code> 实例、访问静态字段或静态方法、反射 <code>Class.forName</code>（默认初始化）、子类初始化前先初始化父类。初始化按源码书写顺序执行静态赋值与 static 块，所以顺序很关键：<code>static { x = 5; }</code> 写在 <code>static int x;</code> 之前是合法的（赋值在左侧不算向前引用），但随后的声明又把 x 重置为 0，最终 x 是 0 而不是 5。只用编译期常量不会触发初始化，因为常量已被内联进调用方的字节码。',
      '<b>问：单例为什么常用 static？</b><br>答：单例要求全局只有一个实例，而静态字段属于类、生命周期跟着 Class 走，天然就是唯一的一份存储：<code>private static final Holder INSTANCE = new Holder();</code> 加私有构造器就能挡住外部 <code>new</code>。它比「全用静态方法」好在——单例仍是对象，可以实现接口、可以被注入、可以在测试里换成假实现，而纯静态方法既不能替换也无法多态。写法上优先用 <code>enum</code> 单例（天然防反射与反序列化），或双重检查加 <code>volatile</code>，<code>volatile</code> 的作用是防止指令重排让别的线程看到尚未初始化完成的对象。',
      '<b>问：工具类为什么要私有构造器？</b><br>答：防止被实例化。工具类只有静态方法，<code>new IntArrays()</code> 得到的对象没有任何状态，却让人误以为它有实例语义；私有构造器把「实例化会编译失败」变成一条硬约束，同时取消编译器自动生成的公开无参构造器。想更严格可以把类声明成 <code>final</code>、把构造器体写成 <code>throw new AssertionError()</code>，连反射创建也挡得住。JDK 里的 <code>java.lang.Math</code>、<code>java.util.Collections</code> 都是这个套路，也是对「静态成员不该有实例入口」的显式声明。',
      '<b>问：static 集合会导致内存泄漏吗？</b><br>答：会，只要静态容器只增不删。静态字段被 GC Root（类的 Class 对象）直接引用，容器里的对象整条引用链都不可达回收，于是 <code>static Map&lt;String, byte[]&gt; cache</code> 一直 put 不 remove，就等于把内存当黑洞；这也是「静态字段持有 Context / 大对象」被列为经典泄漏的根本原因。修法有几条：用带容量上限的 <code>LinkedHashMap</code> 做 LRU、用 <code>WeakHashMap</code> 让键可回收、用 <code>SoftReference</code> 做内存敏感缓存，或者干脆交给带过期策略的缓存库。'
    ] },
    { h: '自测与练习' },
    { p: '四道题都在 Cart 与 Person 上动手：重点看越界访问会不会被编译器或运行时挡住。' },
    { ol: [
      '给 Cart 增加修改数量的方法，数量为 0 时删除商品，负数抛异常。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><b>预期现象</b>：<code>cart.setQuantity("苹果", 0)</code> 之后 <code>cart.snapshot()</code> 里已经没有苹果，<code>totalQuantity()</code> 相应减少；传负数抛 <code>IllegalArgumentException</code>，内部状态不变。<b>为什么</b>：数量属于内部状态，外部只能通过行为改变它；把「0 等于删除」这条规则收进同一个入口，调用方不需要先判断再删，也不会出现「数量为 0 但商品还在列表里」的脏状态。<b>要点</b>：<code>if (q &lt; 0) throw new IllegalArgumentException("数量不能为负"); if (q == 0) { items.remove(name); return; } items.put(name, q);</code>；<code>snapshot()</code> 返回的是 <code>Map.copyOf</code> 副本，改它不影响内部状态。</div></details>',
      '给 Person 增加修改密码的方法，要求旧密码正确、新密码长度至少 8 位。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><b>预期现象</b>：旧密码错误抛 <code>IllegalStateException</code>，新密码 7 位抛 <code>IllegalArgumentException</code>，两者都通过后再用新密码调用校验方法返回 true，旧密码返回 false。<b>为什么</b>：密码是典型的「只写不读」字段——没有 getter，只暴露 <code>checkPassword</code> 这种判断型接口，连 <code>toString</code> 里也不能出现明文，否则日志、调试信息、异常堆栈都会把密码带出去。<b>要点</b>：<code>public void changePassword(String oldPw, String newPw)</code> 里先验旧密码再验新密码长度，顺序很重要，否则未授权者能通过报错信息试探；字段用 <code>private</code>，需要防止 String 驻留时考虑 <code>char[]</code> 并在用完后清零。</div></details>',
      '用 static 计数器统计某个类创建了多少对象，并在 main 结束时打印。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><b>预期现象</b>：创建 3 个对象后打印 3；如果把计数写成实例字段并在构造器里自增，打印的永远是 1，因为每次打印的都是新对象自己的那个计数器。<b>为什么</b>：计数是类级别的状态，必须属于类而不是某个实例，所以要用 <code>private static int count</code>；自增要放在所有构造路径都会经过的构造器里，若用 <code>this(...)</code> 串联构造器，只在最终那个构造器里加一次，不会重复计数。<b>要点</b>：<code>private static int count; Foo() { count++; } public static int count() { return count; }</code>；字段保持 private 只暴露静态 getter，多线程场景换成 <code>AtomicInteger</code> 或给自增加锁，否则会丢计数。</div></details>',
      '写一个类，验证静态块、实例块、构造器的执行顺序。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><b>预期现象</b>：输出顺序是静态块 → 实例块 → 构造器；连续 new 两次时静态块只出现一次，之后每次都是「实例块 → 构造器」。<b>为什么</b>：静态初始化属于类，第一次主动使用时执行一次；实例块会被编译器复制进每个构造器的 <code>super()</code> 之后、构造器体之前，所以它总是在父类构造完成后、本类构造器体之前运行，这是容易被忽略的次序。<b>要点</b>：<code>class T { static { System.out.println("static"); } { System.out.println("init"); } T() { System.out.println("ctor"); } }</code> 加两次 new，输出 static、init、ctor、init、ctor；有父类时的完整顺序是父静态 → 子静态 → 父实例块与父构造 → 子实例块与子构造。</div></details>'
    ] }
  ]);

  insertBeforeSummary('inheritance', [
    { h: '4.13 综合案例：员工薪资体系' },
    { p: '公司有普通员工和经理。普通员工按小时计薪，经理有固定月薪和奖金。两者都有姓名、工号，都能计算月薪。用继承抽取公共字段，用重写实现不同的计算方式。' },
    { code: 'abstract class Employee {\n    protected final String name;\n    protected final String id;\n\n    protected Employee(String name, String id) {\n        this.name = name;\n        this.id = id;\n    }\n\n    public abstract double monthlyPay();\n\n    public String describe() {\n        return name + "(" + id + ") 月薪 " + monthlyPay();\n    }\n}\n\nclass HourlyEmployee extends Employee {\n    private final double hours;\n    private final double rate;\n\n    HourlyEmployee(String name, String id, double hours, double rate) {\n        super(name, id);\n        this.hours = hours;\n        this.rate = rate;\n    }\n\n    public double monthlyPay() { return hours * rate; }\n}\n\nclass Manager extends Employee {\n    private final double base;\n    private final double bonus;\n\n    Manager(String name, String id, double base, double bonus) {\n        super(name, id);\n        this.base = base;\n        this.bonus = bonus;\n    }\n\n    public double monthlyPay() { return base + bonus; }\n}', title: 'Employee.java' },
    { p: 'Employee 把姓名、工号、describe 模板放在父类，把 monthlyPay 留给子类实现；新增“外包员工”时只需继承并实现 monthlyPay，describe 和调用方都不用改。这就是继承 + 多态的组合价值。' },
    { h: '4.14 本章小结' },
    { list: [
      '继承表达 is-a，组合表达 has-a；优先组合。',
      '创建子类对象先构造父类，super(...) 必须在第一行。',
      '重写要求同名同参、权限不变小、异常不变宽。',
      '所有类都继承 Object；toString/equals/hashCode 常需要重写。'
    ] },
    { h: '常见追问' },
    { list: [
      '<b>问：子类能继承父类的 private 字段吗？</b><br>答：字段确实存在于子类对象里——子类对象的内存布局包含父类的全部实例字段，父类方法里对它的读写仍然作用于这块内存。但「继承」在 Java 里指可访问性：<code>private</code> 成员对子类不可见，子类既不能写 <code>this.x</code> 也不能直接给它赋值，只能走父类提供的 public/protected 方法。这也是「私有字段 + 访问器」的真正价值——隐藏的不是内存，而是访问路径，父类因此可以在方法里加校验、加日志、加同步，改实现而不改契约。',
      '<b>问：父类构造器里调用被子类重写的方法会怎样？</b><br>答：会执行子类的版本，因为那仍然是一次虚方法调用；但此时子类对象的字段还没初始化（实例初始化在 <code>super()</code> 返回之后才执行），子类版本读到的字段是 0、null 或 false，于是出现「子类字段明明是 10，方法里却看到 0」的怪现象，而且没有任何编译警告。这是明确的设计陷阱，结论是：构造器里只调用 <code>private</code>、<code>static</code> 或 <code>final</code> 方法。确实需要在构造后回调时，把动作推迟到构造完成，由工厂方法或 <code>init()</code> 负责触发。',
      '<b>问：为什么组合优于继承？</b><br>答：继承在编译期绑定，并把子类的契约与父类的实现搅在一起：父类改一个方法实现，子类可能悄悄坏掉（脆弱基类问题）；子类还继承了父类的全部 API，即使大部分不该对外暴露。组合把被复用的对象当作字段，只转发真正需要的方法，耦合面小、可以在运行时替换实现，也不改变对外契约。判断标准是 is-a 是否成立：子类能替换父类且不改变父类契约才用继承，其余用组合加接口。<code>Stack extends Vector</code> 就是反例——<code>Vector.add(int, E)</code> 让栈能往中间插元素，栈的语义当场被破坏，官方后来也改成推荐 <code>ArrayDeque</code>。',
      '<b>问：final 类能有什么好处？</b><br>答：<code>final</code> 类不能被继承，它的方法都不再可重写，于是带来三样好处：安全性——<code>String</code> 若允许被继承，攻击者可以伪造一个内容和哈希都不变的子类对象穿过安全检查；不可变性可保证——不可变类的所有字段 final 且类本身 final，才能确认没有子类偷偷塞进可变字段或改掉状态；性能与优化——JIT 知道没有子类，可以放心内联、去虚化，把调用变成静态绑定。代价是限制了扩展，所以库里对「不打算被继承」的类型（如 <code>LocalDate</code>、<code>Integer</code>）会明确标 final。',
      '<b>问：接口和抽象类都能多态，为什么还要继承？</b><br>答：两者解决的问题不同：接口描述「能做什么」的能力契约，可以多实现、不携带实例状态，适合跨层次解耦与依赖注入；抽象类描述「是什么、怎么共享」，可以带字段、构造器、protected 辅助方法和固定的模板流程（final 模板方法加抽象步骤），适合一族实现共享骨架与状态。典型组合就是 <code>abstract class AbstractFileParser implements Parser</code>：接口给调用方依赖，抽象类给实现方复用。选择规则是：需要共享状态或流程又要多态，用抽象类；只共享签名与少量 default 行为，用接口。'
    ] },
    { h: '自测与练习' },
    { p: '四道题都围绕员工体系做：每题都要给出类图或输出，别只写解释。' },
    { ol: [
      '给员工体系增加一个「销售员工」，月薪 = 底薪 + 销售额 × 提成比例。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><b>预期现象</b>：<code>new SalesEmployee("张", "S01", 5000, 20000, 0.05).monthlyPay()</code> 返回 6000.0，<code>describe()</code> 直接沿用父类输出「张(S01) 月薪 6000.0」，父类与调用方一行都不用改。<b>为什么</b>：<code>describe</code> 在父类里调 <code>monthlyPay()</code>，这是一次虚方法调用，子类只实现算法就能改变整个输出，无需重写 describe，这正是模板与多态配合的价值。<b>要点</b>：<code>class SalesEmployee extends Employee { private final double base, sales, rate; SalesEmployee(String n, String id, double base, double sales, double rate) { super(n, id); ... } public double monthlyPay() { return base + sales * rate; } }</code>；<code>super(...)</code> 必须是构造器第一行，父类字段是 protected final 时子类只能读不能改。</div></details>',
      '在 Employee 中增加一个 final 方法 printPayslip，内部调用 monthlyPay，体会模板方法。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><b>预期现象</b>：<code>printPayslip</code> 标成 final 后，子类再写同名方法会编译失败，报 cannot override the final method；用父类引用打印任意子类对象，输出的都是该子类算出的月薪。<b>为什么</b>：模板方法把不变的部分（打印格式、前后装饰）留在父类并锁死，把可变的部分（月薪算法）留给子类重写或实现，这就是「别调用我，我会调用你」的好莱坞原则；锁死模板能防止子类绕过校验或改坏输出格式。<b>要点</b>：<code>public final void printPayslip() { System.out.println("== " + name + " =="); System.out.println("月薪 " + monthlyPay()); }</code>，<code>monthlyPay</code> 保持 abstract；如果想再灵活一点，把打印器作为参数传入而不是硬写 <code>System.out</code>。</div></details>',
      '写一个反例：让 Stack 继承 ArrayList，说明为什么这是糟糕的继承。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><b>预期现象</b>：<code>Stack&lt;String&gt; s = new Stack&lt;&gt;(); s.add(0, "插队");</code> 能编译通过，栈「只能从顶进出」的语义被绕过；<code>s.remove(0)</code> 甚至能删掉栈底元素，而所有调用 <code>push</code>/<code>pop</code> 的代码都没报错。<b>为什么</b>：子类继承了父类全部 public API，父类能做的操作对子类对象都成立，而栈的契约要求这些操作非法——继承把父类的实现细节写进了子类的契约；<code>java.util.Stack extends Vector</code> 就是被官方承认的设计失误。<b>要点</b>：正确做法是组合，<code>class Stack&lt;T&gt; { private final Deque&lt;T&gt; d = new ArrayDeque&lt;&gt;(); void push(T x) { d.push(x); } T pop() { return d.pop(); } }</code>，只暴露栈语义的那几个方法。</div></details>',
      '给 Dog 增加一个 fetch 方法，用向上转型和向下转型分别调用，比较编译与运行结果。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><b>预期现象</b>：<code>Animal a = new Dog(); a.fetch()</code> 编译失败，报找不到符号；<code>Dog d = (Dog) a; d.fetch()</code> 编译通过并正常执行；若 <code>Animal a = new Cat()</code> 再强转成 <code>Dog</code>，运行时抛 <code>ClassCastException</code>。<b>为什么</b>：编译期只按变量的声明类型检查方法是否存在，运行期才检查强转的目标类型与对象真实类型是否兼容——这就是「编译看左边，运行看右边」在转型上的体现，也解释了为什么强转必须先用 <code>instanceof</code> 判断。<b>要点</b>：<code>if (a instanceof Dog d) { d.fetch(); }</code>（Java 16 起支持模式变量）；向上转型不需要强转且永远安全，向下转型前必须判类型，否则就是把运行时错误留给线上。</div></details>'
    ] }
  ]);

  insertBeforeSummary('polymorphism', [
    { h: '5.13 综合案例：消息发送器' },
    { p: '系统需要通过短信、邮件、站内信发送通知，未来可能增加微信。定义 Notifier 接口和 send 方法，每种渠道一个实现；NotificationService 依赖接口，运行时注入不同实现。新增渠道时不修改服务代码。' },
    { code: 'interface Notifier {\n    void send(String to, String message);\n}\n\nclass SmsNotifier implements Notifier {\n    public void send(String to, String message) {\n        System.out.println("短信 -> " + to + ": " + message);\n    }\n}\n\nclass EmailNotifier implements Notifier {\n    public void send(String to, String message) {\n        System.out.println("邮件 -> " + to + ": " + message);\n    }\n}\n\nclass NotificationService {\n    private final List<Notifier> notifiers;\n\n    NotificationService(List<Notifier> notifiers) {\n        this.notifiers = notifiers;\n    }\n\n    void notifyAll(String to, String message) {\n        for (Notifier n : notifiers) n.send(to, message);\n    }\n}', title: 'Notifier.java' },
    { p: 'NotificationService 完全不知道具体渠道，只依赖 Notifier；新增微信只需写一个实现并加入列表。这就是“对扩展开放、对修改关闭”。如果把渠道写成 if-else，每加一种都要改服务类，测试范围也会扩大。' },
    { h: '5.14 本章小结' },
    { list: [
      '向上转型自动安全，转型后只能调用父类声明的方法。',
      '实例方法动态绑定：编译看左边，运行看右边。',
      '字段和 static 方法没有多态。',
      '向下转型先 instanceof，多态是开闭原则的实现基础。'
    ] },
    { h: '常见追问' },
    { list: [
      '<b>问：重载是多态吗？</b><br>答：广义上把「编译期多态（静态多态）」也算作多态——重载方法在编译期就按实参类型选定唯一的目标方法，编译出的字节码里已经是确定的方法引用。但 Java 语境里说的多态通常特指运行期多态：重写加向上转型，由虚方法表在运行时按对象的真实类型分派。区别的实用意义在于：重载的解析结果只看源码和变量的声明类型就能推导，重写则必须知道运行时对象是什么类型，所以「父类引用指向子类对象」才是实现开闭原则的基础。',
      '<b>问：构造器能多态吗？</b><br>答：不能。构造器不是实例方法，没有返回值、不能被重写，也就不参与虚方法分派；<code>new</code> 后面写的类名就是最终要创建的精确类型，不存在「父类引用加子类构造器」的运行时替换。容易混淆的是另一点：构造器内部调用一个可重写方法时，确实会走到子类的实现——那是方法分派，不是构造器本身在变，而且此时子类字段还没初始化。构造器只能重载，不能声明为 <code>final</code>、<code>static</code> 或 <code>abstract</code>。',
      '<b>问：private 方法能被多态调用吗？</b><br>答：不能。<code>private</code> 方法在编译期就静态绑定，调用点只看声明类型：父类的 public 方法里调用自己的 <code>private void helper()</code> 时，即使子类写了同名同参的 <code>helper</code>，执行的仍是父类版本——子类那个只是碰巧同名的新方法，与父类的没有重写关系，加 <code>@Override</code> 还会报错。同类的还有 <code>static</code> 方法与字段，都不支持多态。需要子类改变行为，就把 <code>helper</code> 改成 <code>protected</code> 或 <code>public</code>，让它进入虚方法表。',
      '<b>问：为什么字段不参与多态？</b><br>答：字段访问在编译期就按变量的声明类型解析成「对象起始地址 + 固定偏移」的读取指令（<code>getfield</code>），字节码里没有类似虚方法表的分派机制。于是 <code>Parent p = new Child(); p.value</code> 读到的一定是 <code>Parent</code> 定义的那个字段；如果子类也声明了同名 <code>value</code>，它是一块独立内存，同一个对象里就存在两个 <code>value</code>，各自有自己的值，这也是「子类隐藏字段」为什么危险。想要动态行为就把它变成方法（<code>p.getValue()</code>），方法才有重写与分派。',
      '<b>问：instanceof 和 getClass 有什么区别？</b><br>答：<code>instanceof</code> 判断「是这种类型或它的子类型」，对 null 永远返回 false，判断的是继承兼容性，正好对应强制转换是否安全；<code>getClass()</code> 返回运行时的精确类型，<code>a.getClass() == B.class</code> 要求完全相等，子类实例会被判为不同。实际用法：重写 <code>equals</code> 时用 <code>getClass() != o.getClass()</code> 才能保证对称性（否则父类与子类可能互判相等）；做分支处理时用 <code>instanceof</code>（Java 16 起可写 <code>if (o instanceof String s)</code>）才符合可替换原则。代理对象上两者表现也不同：<code>instanceof</code> 认接口，<code>getClass</code> 只会拿到代理类。'
    ] },
    { h: '自测与练习' },
    { p: '四道题都要求写出可运行的代码或类图：多态的判断依据只能靠跑出来的输出。' },
    { ol: [
      '给 Notifier 增加微信实现，验证 NotificationService 不需要修改。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><b>预期现象</b>：新增 <code>WeChatNotifier implements Notifier</code> 后，只要把它加进构造 <code>NotificationService</code> 的列表，<code>notifyAll</code> 就多打一行「微信 -> ...」，原短信与邮件的输出不变，服务类源码零改动。<b>为什么</b>：服务类依赖的是接口而不是具体实现，<code>for (Notifier n : notifiers) n.send(...)</code> 在运行时按每个元素的真实类型分派，新实现自然被接纳，这就是开闭原则的落地形态。<b>要点</b>：<code>class WeChatNotifier implements Notifier { public void send(String to, String m) { System.out.println("微信 -> " + to + ": " + m); } }</code>，装配处 <code>new NotificationService(List.of(new SmsNotifier(), new WeChatNotifier()))</code>；如果服务里原本写的是按字符串类型分支的 if-else，就必须改源码，这正是重构的动机。</div></details>',
      '写一个方法接收 Object，用 instanceof 分别处理 String、Integer、List。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><b>预期现象</b>：<code>describe("abc")</code> 走字符串分支输出长度 3，<code>describe(42)</code> 输出「整数 42」，<code>describe(List.of(1, 2))</code> 输出「列表，2 个元素」，<code>describe(null)</code> 落到最后的兜底分支。<b>为什么</b>：<code>instanceof</code> 按真实类型与继承关系判断并自动完成类型转换（Java 16 起写成模式变量），比 <code>getClass() ==</code> 更适合「粗分类」；<code>42</code> 传进 <code>Object</code> 参数时会自动装箱成 <code>Integer</code>，所以判断 <code>Integer</code> 才有效，而 <code>int</code> 是无法直接匹配的类型。<b>要点</b>：<code>if (o instanceof String s) return "长度 " + s.length(); if (o instanceof Integer i) return "整数 " + i; if (o instanceof List&lt;?&gt; l) return "列表，" + l.size() + " 个元素"; return "其他";</code>；判断顺序要把更具体的类型放前面，否则会被上界更宽的分支先吞掉。</div></details>',
      '用多态重构一段 if-else 类型的代码，画出重构前后的类图。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><b>预期现象</b>：重构前是一个 <code>calc(String type, double amount)</code> 里按 type 分支的 switch，新增类型必须改这个方法；重构后是 <code>interface Fee { double calc(double amount); }</code> 加 <code>VipFee</code>、<code>NormalFee</code> 等实现，调用方只持有 <code>Fee</code>，新增类型只加类不改调用方。<b>为什么</b>：条件分支把「会变化的维度」写死在方法体里，每次扩展都要重新编译并重测整条分支；多态把这个维度提升为类层次，新增对扩展开放、对修改关闭。<b>要点</b>：类图上重构前是 <code>Calculator</code> 依赖一个 type 字符串加若干分支，重构后是 <code>Calculator --&gt; Fee</code> 聚合到接口、三个实现类各自实现 <code>calc</code>；装配处用 <code>Map&lt;String, Fee&gt;</code> 或工厂按配置选实现，注意别把 switch 原封不动搬到工厂里当作「已重构」。</div></details>',
      '解释为什么「面向接口编程」能降低单元测试的难度。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><b>预期现象</b>：测试依赖 <code>Notifier</code> 的 <code>NotificationService</code> 时，可以传入一个只记录调用的假实现，断言「send 被调了 2 次、收件人是 alice」，全程不发真实邮件。<b>为什么</b>：接口是测试替身唯一的接入点。依赖具体类时，要么真的调用外部系统（慢且不可重复），要么必须生成子类代理，而 <code>final</code> 类、静态方法、在方法体里直接 <code>new</code> 依赖这几种写法都让替身无处下手。<b>要点</b>：依赖从构造器注入 <code>NotificationService(List&lt;Notifier&gt; notifiers)</code>，不要在方法里 <code>new SmsNotifier()</code>；测试侧写 <code>class RecordingNotifier implements Notifier</code> 记录参数，或用 Mockito 的 <code>verify</code>；「能不能方便地被替身替换」本身就是依赖设计好坏的一次体检。</div></details>'
    ] }
  ]);

  insertBeforeSummary('abstract-interface', [
    { h: '6.11 综合案例：文件解析器' },
    { p: '系统要解析 CSV、JSON、XML 三种文件。解析流程都是“打开 → 校验 → 解析 → 关闭”，只有解析步骤不同。用抽象类定义模板方法，把 parse 留给子类；再用接口 Parser 描述“能解析”的能力，方便替换实现。' },
    { code: 'abstract class AbstractFileParser implements Parser {\n    @Override\n    public final List<String> parse(String path) {\n        open(path);\n        validate();\n        List<String> rows = doParse();\n        close();\n        return rows;\n    }\n\n    protected abstract List<String> doParse();\n\n    protected void open(String path) { System.out.println("打开 " + path); }\n    protected void validate() { }\n    protected void close() { System.out.println("关闭文件"); }\n}\n\nclass CsvParser extends AbstractFileParser {\n    protected List<String> doParse() {\n        return List.of("a,b", "c,d");\n    }\n}\n\ninterface Parser {\n    List<String> parse(String path);\n}', title: 'Parser.java' },
    { p: '模板方法 parse 是 final 的，保证打开、校验、关闭一定执行；子类只实现 doParse，不会忘记释放资源。Parser 接口让调用方可以依赖抽象，测试时可以传入一个假实现，不需要真的读文件。' },
    { h: '6.12 本章小结' },
    { list: [
      '抽象类用于共享状态和模板流程，不能实例化。',
      '接口描述能力，可以多实现，方法默认 public abstract。',
      'default 方法用于接口演进，static/private 方法用于工具与复用。',
      '选择：有状态/模板用抽象类，纯能力/多实现用接口。'
    ] },
    { h: '常见追问' },
    { list: [
      '<b>问：抽象类可以有构造器吗？</b><br>答：可以，而且通常应该有——它供子类在 <code>super(...)</code> 里调用，用来初始化抽象类声明的字段、做参数校验。抽象类不能被 <code>new</code>，但它的构造器一定会在子类实例化时执行，顺序是先父后子。常见写法是把公共字段声明为 <code>protected final</code>，在抽象构造器里一次性赋值，这样任何子类都无法绕过校验、也没法把字段改成半成品状态；如果抽象类里放着大量静态工具方法却没有任何实例状态，那它其实更适合做成普通工具类或接口。',
      '<b>问：接口可以有构造器吗？</b><br>答：不可以。接口不是类，没有实例字段也没有实例初始化过程，谈不上构造器；接口里声明的字段隐式是 <code>public static final</code> 常量，在接口初始化阶段赋值，与「构造实例」是两件事。接口也不能被 <code>new</code>——<code>new Runnable() { ... }</code> 创建的是实现了该接口的匿名子类实例，不是接口实例。需要「半成品实现 + 状态」时，把公共部分挪到抽象类，接口只保留能力签名，这也是「抽象类管共享、接口管契约」的分工依据。',
      '<b>问：default 方法会被继承吗？</b><br>答：会。实现类可以直接调用从接口继承来的 default 方法，也可以重写它；它不强制实现类覆盖，正是为了接口演进——给已有接口加方法而不弄坏所有实现类，Java 8 给 <code>Collection</code> 加 <code>stream()</code> 就是这么做的。冲突规则要记住：一个类实现两个接口、两者有同签名的 default 方法时，编译器强制报错，实现类必须重写并用 <code>接口A.super.method()</code> 明确选择；如果父类里已有同签名的实方法，则父类版本优先于任何接口的 default。',
      '<b>问：一个类能同时继承抽象类并实现接口吗？</b><br>答：可以，而且这是框架里最常见的组合，例如 <code>abstract class AbstractFileParser implements Parser</code>，或者 <code>class CsvParser extends AbstractFileParser implements Closeable</code>。语法上 <code>extends</code> 必须写在 <code>implements</code> 之前，而且只能有一个父类、可以有多个接口。这样做的意义是把「共享实现」放在抽象类（字段、protected 钩子、模板方法），把「对外契约」放在接口（调用方只依赖接口），既复用了代码又保持了依赖倒置。父类与接口同签名时的优先级是：父类的实方法优先于接口的 default，抽象方法则由父类或子类的实现来满足。',
      '<b>问：接口里的字段为什么必须是 public static final？</b><br>答：因为接口描述的是能力契约，不承载实例状态：接口不能被实例化，也就没有对象来保存实例字段，字段只能是属于接口本身的常量。三个修饰符都隐式强制——<code>public</code> 因为实现类和调用方都要能读到，<code>static</code> 因为不属于任何实例，<code>final</code> 因为常量不该被任何实现修改。写 <code>int MAX = 10;</code> 会被编译器补成 <code>public static final int MAX = 10;</code>，之后再赋值就报「cannot assign a value to final variable」。真正需要可变的配置，用实现类字段或配置对象，不要塞进接口。'
    ] },
    { h: '自测与练习' },
    { p: '四道题都在 Parser 与 Comparable 上做：每题都要能说出「为什么这样拆接口」。' },
    { ol: [
      '给 Parser 增加 JsonParser，复用模板方法，只实现 doParse。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><b>预期现象</b>：新增 <code>class JsonParser extends AbstractFileParser { protected List&lt;String&gt; doParse() { return List.of("{\"a\":1}"); } }</code> 后，<code>new JsonParser().parse("x.json")</code> 依次打印「打开 x.json」和「关闭文件」，返回一行数据，而 open、validate、close 一行都没有重写。<b>为什么</b>：<code>parse</code> 在父类是 final 模板方法，固定了打开、校验、解析、关闭的次序；子类只提供变化的 <code>doParse</code>，公共流程与资源释放由父类保证，不会漏掉释放。<b>要点</b>：子类方法必须是 <code>protected</code>，不能缩成 private，因为父类的抽象方法就是 protected；若 <code>doParse</code> 抛异常，<code>close</code> 不会执行——真实代码应当用 try-with-resources 或 try/finally 包住解析步骤。</div></details>',
      '设计一个 Comparable 的自定义类，按价格排序，再用 Comparator 按名称排序。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><b>预期现象</b>：<code>Collections.sort(books)</code> 得到按价格升序的列表；<code>books.sort(Comparator.comparing(Book::name))</code> 得到按名称字典序的列表，而 <code>compareTo</code> 定义的天然顺序没有被动过。<b>为什么</b>：<code>Comparable</code> 表示「这个类的天然顺序」，只能有一个实现；<code>Comparator</code> 表示「外部规则」，可以有无数个，配合 <code>thenComparing</code> 还能组合多级排序，所以两者不是替代关系而是分工关系。<b>要点</b>：<code>public int compareTo(Book o) { return Double.compare(price, o.price); }</code>，不要写 <code>(int) (price - o.price)</code>——小数会被截断成 0，还可能溢出；排序里可能有 null 时用 <code>Comparator.nullsLast</code> 显式处理，否则抛 NPE。</div></details>',
      '把 Parser 拆成「可解析」和「可校验」两个接口，体会接口隔离。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><b>预期现象</b>：拆成 <code>interface Parsable { List&lt;String&gt; parse(String path); }</code> 与 <code>interface Validatable { void validate(); }</code> 后，只需要解析能力的调用方只依赖 <code>Parsable</code>，测试替身也不必再实现 <code>validate</code> 的空壳；<code>AbstractFileParser</code> 可以同时实现两者。<b>为什么</b>：接口隔离原则要求客户端不被强迫依赖它不用的方法——方法塞在一个大接口里，只做解析的替身和调用方都被迫跟着变，依赖面变大、编译耦合变强。<b>要点</b>：拆完若要兼容旧代码，就保留 <code>interface Parser extends Parsable, Validatable</code> 作为聚合入口；判断拆得对不对的标准是「依赖这组方法的调用方，会不会因为其中无关方法的变化而被迫重新编译或修改」，答案是否定才说明隔离到位。</div></details>',
      '写一个接口，包含 default 方法和 static 工具方法，各调用一次。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><b>预期现象</b>：实现类对象可以直接调用 <code>greet()</code>（继承来的 default 方法），但写 <code>obj.shout()</code> 编译失败——接口的 static 方法只能通过接口名调用，<code>Greeter.shout("hi")</code> 才合法，两处输出都正确。<b>为什么</b>：静态方法属于接口这个类型本身，不参与继承与分派；若允许被实现类继承，一个类实现两个接口且两者有同名静态方法时就会产生歧义，所以 Java 8 引入接口静态方法时明确规定必须用接口名限定。<b>要点</b>：<code>interface Greeter { default String greet(String n) { return "hi " + n; } static String shout(String n) { return shoutOf(n); } private static String shoutOf(String n) { return "HI " + n.toUpperCase(); } }</code>；Java 9 起的 private static 方法用来放 default 之间的公共逻辑，外部无法调用。</div></details>'
    ] }
  ]);

  insertBeforeSummary('enum-record', [
    { h: '7.11 综合案例：订单状态机' },
    { p: '订单状态不能随意跳转：待支付只能变成已支付或已取消，已支付只能发货，已完成不能回退。用枚举表达状态，并为每个状态定义允许的下一步，把规则集中起来，避免散落在 if-else 里。' },
    { code: 'public enum OrderState {\n    PENDING(Set.of("PAID", "CANCELLED")),\n    PAID(Set.of("SHIPPED")),\n    SHIPPED(Set.of("COMPLETED")),\n    COMPLETED(Set.of()),\n    CANCELLED(Set.of());\n\n    private final Set<String> next;\n\n    OrderState(Set<String> next) { this.next = next; }\n\n    public boolean canMoveTo(OrderState target) {\n        return next.contains(target.name());\n    }\n\n    public void moveTo(OrderState target) {\n        if (!canMoveTo(target)) {\n            throw new IllegalStateException(name() + " 不能变成 " + target);\n        }\n    }\n}', title: 'OrderState.java' },
    { p: '把规则放进枚举，新增状态时只改枚举定义，调用方统一用 canMoveTo 判断。相比一堆 if-else，规则更集中、更可测，也不会出现“漏写某个分支”。' },
    { h: '7.12 本章小结' },
    { list: [
      '枚举是类，常量是单例，可带字段、构造器和方法。',
      '枚举适合 switch 和 EnumMap；不要用 ordinal 持久化。',
      'record 适合不可变数据载体，访问器没有 get 前缀。',
      'sealed 限定子类型，配合模式匹配可穷尽检查。'
    ] },
    { h: '常见追问' },
    { list: [
      '<b>问：枚举可以被继承吗？</b><br>答：不能。枚举隐式继承 <code>java.lang.Enum</code>，而 Java 不支持类的多继承，所以它不能再 <code>extends</code> 别的类；编译器还会把枚举类型隐式声明为 final（除非某个常量带类体，那会为它生成一个匿名子类，但整个枚举本身仍然不能被外部继承）。枚举可以实现接口，例如 <code>enum Color implements Describable</code>，这也是让枚举携带行为的标准做法。反方向同样受限：普通类不能 <code>extends</code> 一个枚举。需要「closed 的子类型集合 + 数据」时，<code>sealed interface</code> 加 <code>record</code> 更现代。',
      '<b>问：枚举的 ordinal 能存数据库吗？</b><br>答：不建议。<code>ordinal()</code> 返回常量在源码里的声明位置（从 0 开始），一旦有人在中间插入或调换常量顺序，历史数据的含义就整体错位——这是静默的数据损坏，没有任何编译提示。要持久化就存 <code>name()</code>（唯一且稳定，但改名同样有风险），或自定义业务码 <code>private final int code</code>，读回来用 <code>valueOf</code> 或自建的 <code>Map&lt;Integer, State&gt;</code> 查表。同理，<code>ordinal</code> 也不该拿来做业务判断，<code>switch</code> 里直接用枚举常量本身的语义最清楚。',
      '<b>问：record 能实现接口吗？</b><br>答：能，而且推荐这么用：<code>record Circle(double r) implements Shape { public double area() { return Math.PI * r * r; } }</code>，record 可以实现任意多个接口，也能被其他代码按接口类型持有、放进 <code>List&lt;Shape&gt;</code> 参与多态。record 不能 <code>extends</code> 别的类（它隐式继承 <code>java.lang.Record</code>），但可以实现接口，也能出现在 <code>sealed interface</code> 的 <code>permits</code> 列表里（record 隐式 final，自己不能再声明为 <code>sealed</code> 或 <code>non-sealed</code>）。配合 <code>sealed interface</code> 与 <code>switch</code> 模式匹配，就能写出编译器可穷尽检查的表达式风格代码。',
      '<b>问：record 能有静态字段吗？</b><br>答：能。不可变约束只针对组件（也就是实例字段）：所有组件自动是 <code>private final</code>，在 record 体里再声明实例字段会直接编译失败，报「instance fields are not allowed in records」。但静态字段、静态方法、静态初始化块完全合法，例如 <code>record Money(long cents) { private static final Map&lt;String, Money&gt; CACHE = new HashMap&lt;&gt;(); }</code> 这种常量或缓存就写在里面。要注意静态可变状态被所有实例共享，和「值对象」的定位有冲突，通常只放常量或线程安全缓存，别用来存实例才能决定的东西。',
      '<b>问：record 的 equals 比较什么？</b><br>答：比较全部组件，按值相等，生成的实现等价于「类型必须相同 + 组件逐一 <code>Objects.equals</code>」，<code>hashCode</code> 也由全部组件派生，所以 record 天然满足 equals/hashCode 契约，可以直接做 <code>HashSet</code> 元素或 <code>HashMap</code> 主键。三个要注意的地方：组件若是数组或可变对象（<code>int[] data</code>），比较的是引用，得自己重写 <code>equals</code> 用 <code>Arrays.equals</code>；record 是 final 的，不存在父子类与 equals 的对称性问题；显式声明 <code>equals</code> 会覆盖生成版本，所以「部分字段参与比较」这种需求必须手写。'
    ] },
    { h: '自测与练习' },
    { p: '四道题都要求真跑一遍：枚举的状态机、EnumMap 的统计、record 的输出都要亲眼看到。' },
    { ol: [
      '给 OrderState 增加 REFUNDING 状态，并更新允许的跳转。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><b>预期现象</b>：枚举里加一行 <code>REFUNDING(Set.of("REFUNDED"))</code> 和 <code>REFUNDED(Set.of())</code>，同时把 <code>SHIPPED</code> 的目标改成 <code>Set.of("COMPLETED", "REFUNDING")</code>；之后 <code>SHIPPED.canMoveTo(REFUNDING)</code> 返回 true，<code>COMPLETED.canMoveTo(REFUNDING)</code> 仍返回 false。<b>为什么</b>：跳转规则存在每个常量自己的字段里，新增状态只改枚举定义，<code>moveTo</code> 的调用方和 <code>canMoveTo</code> 的实现都不用动，规则集中且可单测。<b>要点</b>：字段里写的是 <code>name()</code> 字符串，拼错不会编译报错，最好在静态块里用 <code>Enum.valueOf</code> 校验一遍；若想直接写 <code>Set&lt;OrderState&gt;</code>，在常量构造参数里引用其它常量是非法的（枚举静态字段不能在构造器里被引用），只能改成惰性方法。</div></details>',
      '用 EnumMap 统计一组订单中各状态的数量。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><b>预期现象</b>：给定 <code>List&lt;OrderState&gt; orders</code>，统计后 <code>m.get(OrderState.PAID)</code> 等于实际的已支付数量；没出现过的状态取不到值（返回 null）或打印 0，取决于你有没有预填。<b>为什么</b>：<code>EnumMap</code> 内部就是一个用 <code>ordinal</code> 做下标的数组，查找 O(1)、不做哈希计算，还天然按枚举声明顺序迭代，比 <code>HashMap</code> 更快更省内存，是「枚举适合当 Map 键」的典型收益。<b>要点</b>：<code>Map&lt;OrderState, Integer&gt; m = new EnumMap&lt;&gt;(OrderState.class); for (OrderState s : orders) m.merge(s, 1, Integer::sum);</code>；要输出全量表就先 <code>for (OrderState s : OrderState.values()) m.putIfAbsent(s, 0);</code>；高频统计用 <code>int[]</code> 按 ordinal 累加可以完全避免装箱。</div></details>',
      '把 Point 改成 record，比较它与普通类的 equals/toString 行为。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><b>预期现象</b>：<code>record Point(int x, int y)</code> 下 <code>new Point(1, 2).equals(new Point(1, 2))</code> 直接是 true，<code>toString()</code> 输出 <code>Point[x=1, y=2]</code>；改造前的普通类不重写时 equals 是引用比较（false），toString 是 <code>demo.Point@1b6d3586</code> 这样的哈希串。<b>为什么</b>：record 由编译器按组件生成 equals、hashCode、toString，访问器是 <code>x()</code> 而不是 <code>getX()</code>；普通类这几个方法必须手写或靠 IDE 生成，漏掉 hashCode 会让 <code>HashSet</code> 与 <code>HashMap</code> 的行为出错。<b>要点</b>：record 组件不可变、没有 setter，改一个坐标要写 <code>p = new Point(5, p.y())</code>；如果原来有 <code>setX</code>，改造就是一次「可变对象变不可变」的重构，修改点会全部暴露在编译期。</div></details>',
      '用 sealed + record + switch 模式匹配写一个图形面积计算器。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><b>预期现象</b>：<code>sealed interface Shape permits Circle, Rect</code> 加两个 record 实现后，<code>switch (s) { case Circle c -&gt; Math.PI * c.r() * c.r(); case Rect r -&gt; r.w() * r.h(); }</code> 不写 default 也能编译通过；若新增 <code>permits Square</code> 却忘了写分支，编译器立刻报「switch 表达式不完整」。<b>为什么</b>：sealed 把子类型集合封闭在编译期已知的范围内，编译器才能对 switch 做穷尽性检查，这是 instanceof 链和普通接口都做不到的——后两者新增实现时你只会在运行时收到一个漏算的结果。<b>要点</b>：<code>sealed interface Shape permits Circle, Rect { double area(); }</code> 加 <code>record Circle(double r) implements Shape { public double area() { return Math.PI * r * r; } }</code>；switch 的模式匹配在 Java 21 已正式，<code>case null</code> 要显式处理，否则传 null 会抛 NPE。</div></details>'
    ] }
  ]);

  insertBeforeSummary('packages-bean', [
    { h: '8.10 综合案例：一个分层的小项目' },
    { p: '一个最小的分层项目通常包含：model 放实体，repository 放数据访问，service 放业务，controller 放入口，util 放工具。包之间单向依赖：controller → service → repository → model。反向依赖会让代码难以测试和维护。' },
    { code: 'com.example.library\n├── LibraryApplication.java     // 启动类\n├── model/\n│   ├── Book.java               // JavaBean\n│   └── Reader.java\n├── repository/\n│   └── BookRepository.java     // 内存或数据库访问\n├── service/\n│   └── BookService.java        // 借书、还书规则\n├── controller/\n│   └── BookController.java     // HTTP 接口\n└── util/\n    └── IdGenerator.java        // 工具类', title: '项目结构' },
    { p: 'Book 作为 JavaBean 被 controller 接收 JSON、被 repository 存取、被 service 校验；BookController 只做参数转换和调用，不写业务；BookService 不依赖 HTTP；BookRepository 不依赖业务规则。每一层都可以单独测试。' },
    { h: '8.11 本章小结' },
    { list: [
      '包是命名空间 + 目录，类名与目录必须一致。',
      '访问权限从紧到松：private → 默认 → protected → public。',
      'JavaBean = 私有字段 + 无参构造 + 规范 getter/setter。',
      '框架依赖 JavaBean 约定，命名不规范就会“莫名其妙”失败。'
    ] },
    { h: '常见追问' },
    { list: [
      '<b>问：同包类需要 import 吗？</b><br>答：不需要。<code>import</code> 的作用只是把「短类名到全限定名」的映射告诉编译器，同包类本来就在同一个命名空间里，可以直接用短名；<code>java.lang</code> 包（<code>String</code>、<code>Object</code>、<code>Math</code>、<code>System</code>）也是隐式导入的。真正需要 import 的场景只有三种：其他包的类、其他包的静态成员（<code>import static java.util.Map.entry;</code>）、以及同名类冲突时用全限定名区分。另外要清楚：import 不影响运行期，既不加载类也不产生依赖，只在源码里做名字解析。',
      '<b>问：protected 和默认权限差在哪？</b><br>答：<code>protected</code> 比默认（包私有）多一条访问路径：不同包的子类也能访问，但只能通过 <code>this</code> 或该子类类型的引用访问，不能拿着父类引用去访问别的对象的 protected 成员。默认权限只在同包内可见，跨包连子类也不行。所以包私有适合包内协作的实现类，protected 适合明确留给子类重写的钩子方法——但要记得它同时也把方法暴露给了同包所有类，这一点常被忽略。设计上默认权限是最安全的缺省值，protected 只用在真的需要被继承者扩展的地方。',
      '<b>问：JavaBean 必须有 getter 吗？</b><br>答：JavaBean 规范判定的是「属性的读写能力由访问器是否存在决定」：只有 getter 就是只读属性，这是合法的 Bean——<code>getX()</code> 存在就能被 <code>Introspector</code>、Jackson、JSP EL 读到；只有 setter 则是只写属性。但很多框架在反序列化时必须找到 setter，或找到全参构造器加参数名，所以只读属性在接收 JSON 时会失败或需要额外注解（字段上加 <code>@JsonProperty</code>、或构造器上加 <code>@ConstructorProperties</code>）。判断标准很简单：给前端输出的 DTO 可以只留 getter，接收请求的 DTO 必须有可写入的入口。',
      '<b>问：Lombok 的 @Data 算 JavaBean 吗？</b><br>答：算，前提是它生成的访问器符合命名规范。<code>@Data</code> 在编译期通过注解处理器为每个非静态字段生成 <code>getX</code>/<code>setX</code>（<code>boolean</code> 字段生成 <code>isX</code>），同时生成 <code>equals</code>、<code>hashCode</code>、<code>toString</code> 和必需参数的构造器，编译产物与手写的 Bean 没有区别，运行时框架看到的就是普通 getter/setter——Lombok 没有运行时依赖。要注意的是：<code>@Data</code> 生成的 equals 默认不调用父类，有继承时要显式写 <code>@EqualsAndHashCode(callSuper = true)</code>；<code>boolean</code> 用 <code>isX</code> 而包装类型 <code>Boolean</code> 用 <code>getX</code>，两者混用容易在表单绑定与 JSON 属性名上踩坑。',
      '<b>问：包名能用大写吗？</b><br>答：语法允许（标识符不以数字开头即可），但命名约定要求全小写，理由有三条：一是包名对应目录，类名才大写开头，<code>Com.Example.Foo</code> 这样的写法与类名混排时几乎无法分辨谁是类型；二是构建工具、代码生成器、很多框架都按「大写开头是类型」来推断，反常规命名会触发工具异常；三是默认包（完全不写 <code>package</code>）在 Java 9 之后的模块化与多数框架里都不被支持，<code>import</code> 一个默认包里的类也是非法的。约定还要求包名与 Maven 的 groupId 对齐（都是反写域名），方便发布时一眼对应。'
    ] },
    { h: '自测与练习' },
    { p: '四道题都落到磁盘上的目录结构：javac 能编过、java 能跑起来才算做完。' },
    { ol: [
      '把本章的 Book 放进 com.example.model 包，写一个 service 调用它，体会 import。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><b>预期现象</b>：<code>src/com/example/model/Book.java</code> 首行是 <code>package com.example.model;</code>，<code>src/com/example/service/BookService.java</code> 首行是 <code>package com.example.service;</code> 并 <code>import com.example.model.Book;</code>；<code>javac -d out src/com/example/model/Book.java src/com/example/service/BookService.java</code> 编译通过，<code>java -cp out com.example.service.BookService</code> 能运行。<b>为什么</b>：包名必须与相对目录逐段一致，<code>javac</code> 正是按目录找源码、按包名放 class 文件；import 只让源码里能写短名 Book，删掉它就得写全限定名，编译出的字节码完全相同。<b>要点</b>：public 类必须与文件名同名；两个包之间只允许 service 依赖 model 这一条边，model 里不能反过来 import service。</div></details>',
      '把 Book 的字段改成 private，生成规范的 getter/setter，用 Jackson 序列化验证字段名。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><b>预期现象</b>：<code>private String title;</code> 配 <code>getTitle()/setTitle()</code> 后，序列化输出 <code>{"title":"...","price":0.0}</code>；把 getter 改名成 <code>getBookTitle()</code>，输出就变成 <code>{"bookTitle":...}</code>——属性名完全由 getter 推导，与字段名无关。<b>为什么</b>：Jackson 默认按 JavaBean 约定从访问器推属性名（<code>getX</code> 对应 <code>x</code>，首字母小写），只有 <code>@JsonProperty</code> 或可见性配置能覆盖；字段是 private 不影响序列化，反射本来就能读到私有成员。<b>要点</b>：jackson-databind 是外部依赖，若要在零依赖环境里验证，用 <code>Introspector.getBeanInfo(Book.class)</code> 打印 <code>PropertyDescriptor</code> 的名字即可看到 title、price；再试着删掉一个 getter，观察属性是否从列表里消失。</div></details>',
      '给 util 包写一个 IdGenerator，构造器私有，提供静态方法。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><b>预期现象</b>：其他包里的代码能调用 <code>IdGenerator.newId()</code>，但写 <code>new IdGenerator()</code> 会编译失败，报「IdGenerator() has private access in IdGenerator」。<b>为什么</b>：私有构造器在编译期就堵死了实例化路径，同时取消编译器自动生成的公开无参构造器；工具类只提供静态方法，没有实例状态，禁止实例化能把「不该这样用」变成编译期约束，而不是靠注释提醒。<b>要点</b>：<code>package com.example.util; public final class IdGenerator { private IdGenerator() { } public static String newId() { return UUID.randomUUID().toString(); } }</code>，包外使用前要 <code>import com.example.util.IdGenerator;</code>；需要递增且并发安全时换成 <code>AtomicLong</code> 计数。</div></details>',
      '画出一个分层项目的依赖箭头图，标出哪些依赖是允许的、哪些是反向依赖。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><b>预期现象</b>：画出来的箭头应当是 <code>controller -&gt; service -&gt; repository -&gt; model</code>，而 util 被所有人依赖却不依赖任何人；如果你画出 <code>model -&gt; service</code> 或 <code>repository -&gt; controller</code>，那就是反向依赖，也是最该立刻拆掉的一条边。<b>为什么</b>：依赖是有向的编译期耦合，单向层层依赖才能让上层实现可替换、下层能脱离数据库单独测试；反向依赖会形成环，改一个类牵动整条链，也解释不了「为什么改个 SQL 要重新编译业务层」。<b>要点</b>：model 最多依赖 JDK；service 依赖 repository 的接口（<code>BookRepository</code> 接口加 <code>InMemoryBookRepository</code> 实现）；controller 只做参数转换与调用；一旦出现 service 与 repository 双向箭头，就用依赖倒置把接口上移到 service 一侧。</div></details>'
    ] }
  ]);
})();
