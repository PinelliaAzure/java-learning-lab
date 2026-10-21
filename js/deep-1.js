/* 精读补充 1：准备篇 + Java 起步 + 面向对象（14 课） */
(function () {
  'use strict';
  var D = window.JAVA_DEEP || (window.JAVA_DEEP = {});

  D['setup'] = {
    why: '环境是新手的第一道坎。版本选错、PATH 没配、文件名和类名不一致，都会让你在“Hello World”之前就放弃。把这条链路一次走通，后面才谈得上写代码。',
    walk: [
      ['java -version', '输出版本号说明运行环境可用；没有输出或提示找不到命令，就是没装或 PATH 没配。'],
      ['javac -version', '编译器的版本。只装 JRE 的人这条会失败，因为 JRE 不包含 javac。'],
      ['JAVA_HOME', '指向 JDK 根目录，Maven、IDEA、Tomcat 都靠它找 JDK，不要指向 bin 目录。'],
      ['PATH 中加入 %JAVA_HOME%\\bin', '系统靠 PATH 查找命令；改完必须重开终端，否则读的还是旧值。'],
      ['javac Hello.java', '生成 Hello.class。文件名必须与 public 类名一致，大小写也要一致。'],
      ['java Hello', '启动 JVM 执行 Hello.class，命令后面是类名，不能加 .class 后缀。']
    ],
    summary: [
      '开发装 JDK，运行只需 JRE；JVM 负责执行字节码。',
      '验证顺序：java -version → javac -version → 编译 → 运行。',
      '报“找不到命令”先查 PATH，报“公共类应在文件中声明”先查文件名。'
    ]
  };

  D['jdk'] = {
    why: '很多人学了很久仍说不清“为什么 Java 能跨平台”“为什么会有 .class 文件”。答案就在 JDK、JRE、JVM 的分工里，这也是所有后续知识的底座。',
    walk: [
      ['.java 源文件', '你写的代码，人类可读；public 类名必须与文件名一致。'],
      ['javac 编译器', 'JDK 提供。它做语法检查，把源码翻译成与平台无关的字节码。'],
      ['.class 字节码', '不是机器码，JVM 才能读懂；同一份字节码可以在不同系统上运行。'],
      ['java 命令', '启动 JVM，加载类、找到 main 方法、开始执行。'],
      ['JVM', '解释执行字节码，把热点代码 JIT 编译成本地机器码；不同系统装不同的 JVM。'],
      ['JDK ⊃ JRE ⊃ JVM', 'JDK 含开发工具和 JRE，JRE 含 JVM 和核心类库。记住包含关系就不会混。']
    ],
    summary: [
      '源码先编译成字节码，再由 JVM 翻译成本地指令，所以能跨平台。',
      'javac 负责编译，java 负责运行，两者不能混用。',
      '报错先分清楚是编译期（javac）还是运行期（java）。'
    ]
  };

  D['vars'] = {
    why: '变量是程序存储数据的最小单元。类型决定了能存什么、占多少空间、会不会丢精度；不理解类型，后面所有计算和传参都会出错。',
    walk: [
      ['int age = 18;', '声明一个 4 字节整数变量，把字面量 18 存进去。'],
      ['long population = 8_100_000_000L;', '超过 int 范围必须加 L；下划线只是方便阅读。'],
      ['double price = 9.9;', '小数默认是 double；想用 float 必须加 F，否则编译报错。'],
      ['char grade = \'A\';', 'char 用单引号，只能放一个字符；String 用双引号，是引用类型。'],
      ['boolean pass = true;', '只有 true/false 两个值，不能写成 1/0。'],
      ['局部变量', '方法里的变量没有默认值，使用前必须赋值；成员变量才有 0/false/null。']
    ],
    summary: [
      '整数默认 int，小数默认 double；long 加 L，float 加 F。',
      '小范围可以自动转大范围，大转小必须强转且可能丢精度。',
      '局部变量先赋值再使用，命名用小驼峰。'
    ]
  };

  D['operators'] = {
    why: '运算符看起来简单，但整数除法、自增顺序、短路求值、强制转换这四处，是新手写错逻辑和面试被问倒的高频点。',
    walk: [
      ['7 / 2', '两边都是 int，结果截断为 3，不是 3.5；要小数至少一边转 double。'],
      ['7 % 2', '取余，结果是 1；判断奇偶、循环分组常用。'],
      ['7 / 2.0', '2.0 是 double，7 自动提升，结果 3.5。'],
      ['i++', '先取旧值参与表达式，再把 i 加一。'],
      ['++i', '先把 i 加一，再取新值参与表达式。'],
      ['c != 0 && a / c > 1', '左边为 false 时右边不执行，避免除零；把 && 写成 & 就没有这个保护。'],
      ['(int) 3.99', '强制转换直接截断小数，得到 3，不是四舍五入。']
    ],
    summary: [
      '整数相除会丢小数，需要小数就转 double。',
      '&& 和 || 会短路，常用来避免空指针和除零。',
      '强转可能丢精度或溢出，转换前先想清楚范围。'
    ]
  };

  D['scanner'] = {
    why: '只会输出不会输入，程序就只是个计算器。Scanner 是最简单的输入入口，而“nextInt 后 nextLine 读到空行”是新手第一个真实 bug。',
    walk: [
      ['new Scanner(System.in)', '把标准输入（键盘）包装成能按类型读取的工具。'],
      ['sc.nextLine()', '读取一整行，包含空格，读到回车为止。'],
      ['sc.nextInt()', '读取一个整数；遇到字母会抛 InputMismatchException。'],
      ['nextInt 后的 nextLine', 'nextInt 不吃回车，紧接着的 nextLine 会读到空串；多调用一次清掉换行。'],
      ['System.out.printf("%.2f", price)', '按格式输出，%.2f 保留两位小数，%n 是换行。'],
      ['sc.close()', '关闭输入流；关闭后再用会抛 IllegalStateException。']
    ],
    summary: [
      '字符串用 nextLine，数字用 nextInt/nextDouble。',
      '混用时要处理换行残留，否则会读到空行。',
      '格式化输出用 printf，比字符串拼接更可控。'
    ]
  };

  D['control'] = {
    why: '程序 = 数据 + 流程。分支决定走哪条路，循环决定重复多少次，数组把一批数据排成队；这三样组合起来就能写真正的业务逻辑。',
    walk: [
      ['int[] nums = {3, 8, 5};', '创建长度 3 的数组，合法下标是 0、1、2。'],
      ['for (int i = 0; i < nums.length; i++)', '用 length 控制边界，不要手写 3；i 从 0 开始。'],
      ['sum += nums[i];', '把当前元素累加到 sum，循环结束得到总和。'],
      ['if / else if / else', '从上到下判断，命中一个分支就结束，范围小的条件放前面。'],
      ['switch (x) { case ... }', '适合等值多选；传统写法忘 break 会穿透，箭头语法不会。'],
      ['增强 for', '只读遍历更简洁，但拿到的是元素副本，改它不会改数组。']
    ],
    summary: [
      '数组长度固定、下标从 0 开始，越界抛 ArrayIndexOutOfBoundsException。',
      '已知次数用 for，未知次数用 while，至少执行一次用 do-while。',
      '分支条件注意顺序，循环注意边界。'
    ]
  };

  D['methods'] = {
    why: '方法是代码复用的最小单位，也是理解“栈帧、值传递、重载”的入口。不会拆方法，代码很快就会变成一个几百行的 main。',
    walk: [
      ['static int add(int a, int b)', '返回类型 + 方法名 + 参数列表；static 表示属于类，不需要对象就能调用。'],
      ['return a + b;', '把结果交回调用处，方法立即结束；有返回值的方法每条路径都要 return。'],
      ['int result = add(3, 4);', '实参 3、4 的值复制给形参 a、b；方法内改 a、b 不影响外面。'],
      ['add(int,int) 与 add(int,int,int)', '参数个数不同构成重载，编译器按实参选择。'],
      ['int... nums', '可变参数本质是数组，必须放最后；调用时可传 0~n 个。'],
      ['if (n <= 1) return 1;', '递归的终止条件；没有它就会无限压栈，最终 StackOverflowError。']
    ],
    summary: [
      'Java 只有值传递：基本类型传副本，对象传引用的副本。',
      '重载看参数列表，不看返回值；重写发生在父子类之间。',
      '方法要短、名字要表达意图，一个方法只做一件事。'
    ]
  };

  D['class-object'] = {
    why: '面向对象的第一步不是背概念，而是看懂“new 的时候内存里发生了什么”。理解了栈引用和堆对象，封装、继承、多态才不会学成口号。',
    walk: [
      ['class Student { ... }', '类只是模板，定义字段和方法；此时还没有任何对象。'],
      ['new Student("Tom", 18)', '在堆上分配对象，调用构造器给字段赋值，返回引用。'],
      ['Student s = ...', '栈上的变量 s 保存引用地址，不是对象本身。'],
      ['构造器', '名字与类名相同、没有返回值；写了有参构造器后，默认无参构造器消失。'],
      ['this.name = name', 'this 指当前对象，用来区分同名字段和参数。'],
      ['Student s2 = s1', '复制的是引用，两个变量指向同一个堆对象；改一个另一个也看到。']
    ],
    summary: [
      '类是模板，对象是实例；new 在堆上创建，变量在栈上存引用。',
      '构造器负责初始化，this 代表当前对象。',
      '对象内容比较用 equals，不要用 == 比地址。'
    ]
  };

  D['encapsulation'] = {
    why: '如果字段全公开，任何代码都能把余额改成负数、把年龄改成 -1。封装不是“写 getter/setter”，而是让对象始终处于合法状态。',
    walk: [
      ['private int balance;', '外部不能直接读写，所有访问必须经过类的方法。'],
      ['public void deposit(int amount)', '对外暴露业务动作，而不是暴露字段本身。'],
      ['if (amount <= 0) { ... return; }', '在入口处校验，非法参数直接拒绝，余额保持不变。'],
      ['balance += amount;', '只有校验通过才修改状态，保证不变式。'],
      ['public int getBalance()', '只读入口，外部可以查看但不能随意改。'],
      ['static int count', '静态字段被所有对象共享，适合计数、常量；静态方法没有 this。']
    ],
    summary: [
      '字段私有、方法公开，在方法里做校验。',
      '只暴露业务需要的操作，不要机械生成所有 setter。',
      'static 属于类，实例成员属于对象，别混用。'
    ]
  };

  D['inheritance'] = {
    why: '继承能复用代码，但也会把子类和父类绑死。理解构造顺序和重写规则，才能判断什么时候该继承、什么时候该用组合。',
    walk: [
      ['class Dog extends Animal', 'Dog 获得 Animal 的非 private 成员，表达“狗是一种动物”。'],
      ['super(name)', '子类构造器第一行调用父类构造器；不写也会隐式调用 super()。'],
      ['@Override', '让编译器检查是否真的重写；方法名或参数写错会立刻报错。'],
      ['重写规则', '方法名、参数相同，返回类型兼容，访问权限不能变小。'],
      ['构造顺序', '先构造父类部分，再构造子类部分；父类没有无参构造器时子类必须显式 super(...)。'],
      ['final / static / private', 'final 禁止重写，static 是隐藏，private 子类看不见，都不算重写。']
    ],
    summary: [
      '继承表达 is-a，组合表达 has-a；优先组合。',
      '子类构造前一定先构造父类。',
      '重写加 @Override，重载看参数列表。'
    ]
  };

  D['polymorphism'] = {
    why: '多态是框架和接口编程的根基：调用方只依赖父类，新增子类不用改代码。理解“编译看左边、运行看右边”，才能看懂 Spring 里的各种注入。',
    walk: [
      ['Animal a = new Dog();', '向上转型安全，因为 Dog 一定是 Animal；a 只能调用 Animal 声明的方法。'],
      ['a.speak()', '编译期检查 Animal 有没有 speak，运行时按对象真实类型 Dog 找实现。'],
      ['方法表', 'JVM 根据对象头里的类元数据定位方法版本，这就是动态绑定。'],
      ['Dog d = (Dog) a;', '向下转型要求 a 实际指向 Dog，否则 ClassCastException。'],
      ['a instanceof Dog d', '先判断再转，JDK 16+ 可直接绑定变量，最安全。'],
      ['字段', '字段没有多态，a.name 取的是 Animal 里声明的字段。']
    ],
    summary: [
      '实例方法看运行时类型，字段看声明类型。',
      '向上转型自动、安全；向下转型先 instanceof。',
      '多态让调用方依赖抽象，而不是具体实现。'
    ]
  };

  D['abstract-interface'] = {
    why: '抽象类和接口是“设计接口”的工具。分不清它们，就会写出既不能扩展、又难以测试的类层次。',
    walk: [
      ['abstract class Shape', '抽象类可以有字段、构造器、普通方法和抽象方法，适合放公共状态。'],
      ['abstract double area();', '抽象方法没有方法体，强制子类实现；子类不实现就得也是抽象类。'],
      ['interface Shape', '接口描述能力，方法默认 public abstract，字段默认 public static final。'],
      ['default String describe()', '接口默认方法，给老接口加新能力而不破坏实现类。'],
      ['implements A, B', '一个类可以实现多个接口，弥补单继承限制。'],
      ['怎么选', '需要共享字段/模板 → 抽象类；只描述能力、要多实现 → 接口。']
    ],
    summary: [
      '抽象类可以有状态，接口不能有实例字段。',
      '接口方法默认公共抽象，default 方法提供默认实现。',
      '面向接口编程，调用方依赖能力而不是实现。'
    ]
  };

  D['enum-record'] = {
    why: '枚举让常量集合类型安全，record 让数据载体不用写几百行样板代码。它们是现代 Java 最常用的两个语法糖。',
    walk: [
      ['enum Level { LOW, HIGH }', '枚举常量在类加载时创建，全局唯一，天然单例。'],
      ['LOW(1), HIGH(10)', '枚举可以有字段和构造器，常量后面传参。'],
      ['switch (level)', '枚举可直接用于 switch，编译器还能检查是否覆盖所有常量。'],
      ['record Point(int x, int y)', '自动生成全参构造器、x()/y()、equals、hashCode、toString。'],
      ['p.x()', 'record 的访问器没有 get 前缀；字段 private final，没有 setter。'],
      ['使用场景', '固定集合用枚举；DTO/返回值用 record；需要可变状态就别用 record。']
    ],
    summary: [
      '枚举是类，常量是单例，可带字段和方法。',
      'record 适合不可变数据载体，自动生成样板方法。',
      'record 不适合需要无参构造器或可变状态的框架实体。'
    ]
  };

  D['packages-bean'] = {
    why: '项目一大，类就会重名、权限就会混乱。包和访问修饰符是组织代码的规则，JavaBean 则是框架识别对象的共同约定。',
    walk: [
      ['package com.example.model;', '声明包，文件必须放在对应目录；包名通常用域名倒写。'],
      ['import java.util.List;', '引入其他包的类；同包和 java.lang 不需要 import。'],
      ['private / default / protected / public', '可见范围从本类 → 本包 → 本包+子类 → 全局，逐级放宽。'],
      ['private String title;', '字段私有，外部只能通过方法访问。'],
      ['public String getTitle()', 'JavaBean 规范：getXxx/isXxx；框架靠它识别属性。'],
      ['public Book() {}', '无参构造器让 Spring、Jackson、MyBatis 能反射创建对象。']
    ],
    summary: [
      '包名对应目录，import 不递归子包。',
      '成员默认 private，方法按需公开。',
      'JavaBean = 私有字段 + 无参构造 + getter/setter。'
    ]
  };
})();
