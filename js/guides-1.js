/* 新手精讲 1：Java 起步 + 面向对象（10 课） */
(function () {
  'use strict';
  var G = window.JAVA_GUIDES || (window.JAVA_GUIDES = {});

  G['jdk'] = {
    goals: ['分清 JDK、JRE、JVM 各自负责什么', '说出 .java → .class → 运行 的完整过程', '独立编译并运行第一个程序'],
    flow: '本课路线：<b>认识三个名词 → 看懂编译运行 → 亲手跑一遍</b>。先建立整体地图，后面每个知识点都能挂上去。',
    sections: [
      { h: '把三者想成一个工具箱', p: 'JVM 是发动机，负责执行字节码；JRE 是发动机 + 标准零件（核心类库），只能开不能造；JDK 是完整工具箱，额外提供 javac、jar、jshell，能造也能开。' },
      { h: '程序为什么要“编译两次”', p: 'javac 先把 .java 翻译成平台无关的 .class 字节码；运行时 JVM 再把字节码解释或 JIT 编译成本机指令。第一次翻译保证跨平台，第二次翻译交给各平台的 JVM。' },
      { h: '第一次运行要盯住三件事', p: '文件名与 public 类名一致、命令行在文件所在目录、java 后面跟类名而不是文件名。三条都满足，Hello World 一定能跑出来。' }
    ],
    pitfalls: [
      '把 javac 和 java 用反：javac 编译，java 运行。',
      '执行 java Hello.class：java 命令只接受类名。',
      '只装 JRE 就想编译：没有 javac，写不了自己的程序。'
    ],
    homework: '在命令行完成 Hello.java 的编译运行；然后删掉 .class 文件，观察 java 命令报什么错，理解“运行的是字节码而不是源码”。'
  };

  G['vars'] = {
    goals: ['正确选择 int/long/double/boolean/char', '写出合法的字面量并解释后缀', '说清局部变量为什么必须先赋值'],
    flow: '变量 = <b>类型 + 名字 + 值</b>。类型决定能存什么、占多大空间；名字是给人看的；值可以在运行中改变。',
    sections: [
      { h: '类型其实是在约定内存布局', p: 'int 固定 4 字节、long 8 字节、double 8 字节、char 2 字节。Java 不像 C 那样“看平台”，所以同一段代码在不同系统上结果一致。' },
      { h: '字面量的默认类型', p: '写 100 是 int，写 100L 才是 long；写 9.9 是 double，写 9.9F 才是 float。超出 int 范围却不加 L，编译直接报“整数过大”。' },
      { h: '局部变量没有默认值', p: '成员变量不赋值默认为 0/false/null，但方法里的局部变量必须显式初始化。编译器会检查“可能未初始化”，这是 Java 帮你提前发现 bug。' }
    ],
    pitfalls: [
      'long 变量写 8100000000 不加 L，编译报错。',
      '把 double 直接赋给 int，必须强转且会截断小数。',
      '在 if 块里声明的变量，出了块就不能再用。'
    ],
    homework: '声明并打印 byte、short、int、long、float、double、char、boolean 各一个变量；再用一行代码验证 1/3 与 1.0/3 的区别。'
  };

  G['operators'] = {
    goals: ['解释整数除法与取模的结果', '正确使用 ++/-- 和短路运算', '判断什么时候需要强制类型转换'],
    flow: '运算符的坑集中在三处：<b>整数除法、自增顺序、短路求值</b>。写之前先问“两边是什么类型”。',
    sections: [
      { h: '整数相除只会得到整数', p: '5 / 2 的结果是 2，小数部分被直接丢掉，不是四舍五入。想要小数，至少把其中一个操作数变成 double，例如 5 / 2.0。' },
      { h: 'i++ 和 ++i 的区别在“取值时机”', p: 'i++ 先取旧值参与表达式，再把 i 加一；++i 先把 i 加一，再取新值。单独写一行时两者等价，混在表达式里就要小心。' },
      { h: '短路是安全网，不是可选项', p: 'a != null && a.size() > 0 中，左边为 false 时右边根本不执行，所以不会空指针。把 && 写成 & 就会强制计算两边，反而可能出错。' }
    ],
    pitfalls: [
      '用 / 做平均分却忘了转 double，结果永远是整数。',
      '把 == 写成 =，编译可能通过但逻辑全错。',
      '强转 (int) 3.99 得到 3，不是 4。'
    ],
    homework: '写一个温度转换程序：摄氏转华氏保留一位小数；再输入两个整数，输出商和余数，要求商保留两位小数。'
  };

  G['control'] = {
    goals: ['用 if/switch 写出清晰的分支', '按场景选择 for/while/do-while', '安全地遍历和操作数组'],
    flow: '流程控制只有两类：<b>选一条路（分支）</b>和<b>重复走（循环）</b>。数组则是“一排同类型格子”，靠下标访问。',
    sections: [
      { h: 'if 从上到下，命中即停', p: '条件按顺序判断，第一个为 true 的分支执行完就跳出整个 if-else 链。范围小的条件放前面，否则会被宽条件提前截胡。' },
      { h: 'switch 适合“等值多选”', p: 'switch 判断的是“等于某个常量”，不适合区间。传统写法忘 break 会穿透到下一个 case；JDK 14+ 的箭头语法天然不穿透。' },
      { h: '数组的三个硬规则', p: '长度创建后固定、下标从 0 开始、越界抛 ArrayIndexOutOfBoundsException。遍历用 i < nums.length，不要手写长度。' }
    ],
    pitfalls: [
      'if (x = 1) 把比较写成赋值，编译报错（boolean 才行），但思路要警惕。',
      'for 循环里 i <= length，多跑一次导致越界。',
      '在增强 for 里修改数组元素值，改的是副本。'
    ],
    homework: '用数组保存 5 个成绩，输出总分、平均分、最高分；再用 switch 根据分数段打印等级（90+ 优秀、60+ 及格、否则不及格）。'
  };

  G['class-object'] = {
    goals: ['区分类与对象、声明与实例化', '写出带参构造器并用 this 赋值', '解释栈引用与堆对象的关系'],
    flow: '本课路线：<b>类是模板 → new 创建对象 → 栈里存引用、堆里放对象 → this 指代当前对象</b>。',
    sections: [
      { h: '构造器不是普通方法', p: '构造器名字与类名相同、没有返回类型，在 new 时自动调用。你不写，编译器送一个无参构造器；一旦写了有参构造器，默认无参的就消失了。' },
      { h: '一个对象，多个引用', p: 'Student s2 = s1 不会复制对象，只是让 s2 也指向堆里的同一个对象。通过任一引用改字段，另一个引用看到的值也会变。' },
      { h: 'this 是“当前对象”的代词', p: '当参数名和字段名相同，this.name 明确表示字段；在构造器第一行写 this(...) 可以调用本类另一个构造器。' }
    ],
    pitfalls: [
      '比较两个对象内容用 ==，比的是地址，应该重写 equals。',
      '写了有参构造器后，再写 new Student() 会编译失败。',
      '对象引用为 null 时调用方法，抛 NullPointerException。'
    ],
    homework: '写一个 Student 类（姓名、年龄、构造器、birthday 方法），创建两个对象，让两个引用指向同一个对象，修改其中一个的年龄并打印另一个，验证“共享同一个对象”。'
  };

  G['encapsulation'] = {
    goals: ['用 private + 方法保护字段', '在 setter/业务方法里做参数校验', '分清 static 成员与实例成员'],
    flow: '封装 = <b>藏起数据 + 暴露受控入口</b>。外部不能直接改字段，所有修改都经过你的方法，你就有机会校验、记录、兜底。',
    sections: [
      { h: '为什么 public 字段是坏味道', p: '外部可以把它改成任意值，对象随时处于非法状态。字段私有后，setter 里加一句“金额不能为负”，所有调用方自动受保护。' },
      { h: 'static 属于类，不属于某个对象', p: '静态字段被所有实例共享，静态方法没有 this。工具方法（Math.max）、常量（MAX_SIZE）适合 static；和对象状态有关的不要加。' },
      { h: '封装不是机械写 getter/setter', p: '只暴露业务真正需要的读写。比如余额只提供 deposit/withdraw 和 getBalance，不提供 setBalance，外部就无法绕过规则。' }
    ],
    pitfalls: [
      '所有字段都生成 public setter，等于没封装。',
      '在 static 方法里直接访问实例字段，编译报错。',
      'setter 里忘了 this，写成 name = name，赋值无效。'
    ],
    homework: '写一个 BankAccount：private 余额，提供 deposit/withdraw/getBalance；存款金额必须为正，取款不能超过余额；再写一个 static 计数器统计创建了几个账户。'
  };

  G['inheritance'] = {
    goals: ['用 extends 复用父类并正确调用 super', '遵守重写规则并使用 @Override', '判断什么时候不该用继承'],
    flow: '继承表达 <b>is-a</b>（狗是一种动物）。子类自动拥有父类非 private 成员，也可以改写行为；但继承会把两个类绑死，能组合就别硬继承。',
    sections: [
      { h: '构造子类对象，先构造父类', p: '子类构造器第一行一定是 super(...) 或 this(...)。即使不写，编译器也会插入 super()，所以父类没有无参构造器时子类会编译失败。' },
      { h: '重写的硬性规则', p: '方法名和参数列表必须相同，返回类型兼容，访问权限不能变小，不能抛更宽的受检异常。加 @Override 让编译器帮你检查，写错方法名会立刻报错。' },
      { h: 'final、static、private 不参与重写', p: 'final 方法禁止重写；static 方法属于类，子类同名只是“隐藏”；private 方法子类根本看不到，写了同名方法也不是重写。' }
    ],
    pitfalls: [
      '父类只写了有参构造器，子类却没写 super(...)，编译失败。',
      '重写时把参数类型改了，变成重载而不是重写。',
      '为了复用一行代码强行继承，导致类层次越来越僵。'
    ],
    homework: '写 Animal（name、speak）和 Dog/Cat 两个子类，重写 speak；在 Dog 构造器里用 super(name) 传名字，分别创建对象并调用。'
  };

  G['polymorphism'] = {
    goals: ['理解“编译看左边，运行看右边”', '说清动态绑定的过程', '安全地使用 instanceof 和向下转型'],
    flow: '多态 = <b>同一个方法调用，因对象不同而执行不同实现</b>。它是“面向接口编程”的底层支撑。',
    sections: [
      { h: '向上转型是安全的', p: 'Dog 一定是 Animal，所以 Animal a = new Dog() 不需要强转。通过 a 只能调用 Animal 声明过的方法，编译期就能检查。' },
      { h: '方法表决定运行时调用谁', p: '每个对象头里有关联的类元数据，调用实例方法时 JVM 按实际类型找到方法版本。所以 a.speak() 执行的是 Dog.speak。' },
      { h: '向下转型要先判断', p: 'Dog d = (Dog) a 要求 a 实际指向 Dog，否则抛 ClassCastException。先 if (a instanceof Dog d) 再转，是 JDK 16+ 的安全写法。' }
    ],
    pitfalls: [
      '以为 Animal a = new Dog() 后 a 能调用 Dog 独有方法——编译不通过。',
      '字段没有多态：a.name 取的是 Animal 里声明的字段。',
      'static 方法不参与动态绑定，看的是变量声明类型。'
    ],
    homework: '定义 Animal 数组，放入 Dog、Cat、Bird；循环调用 speak，观察输出；再写一个方法接收 Animal，内部用 instanceof 判断并调用子类独有方法。'
  };

  G['abstract-interface'] = {
    goals: ['用抽象类抽取公共状态和模板', '用接口描述一组能力并多实现', '根据需要选择抽象类或接口'],
    flow: '抽象类是 <b>半成品</b>，接口是 <b>能力清单</b>。一个类只能继承一个抽象类，但能实现多个接口。',
    sections: [
      { h: '抽象类可以有状态', p: '抽象类能声明字段、构造器、普通方法，适合放“子类共有的数据和流程”。抽象方法强制子类实现，否则子类也得是抽象类。' },
      { h: '接口默认是公共抽象方法', p: '接口里的方法默认 public abstract，字段默认 public static final。JDK 8 起可以有 default 方法，给老接口加新能力而不破坏实现类。' },
      { h: '选择口诀', p: '需要共享字段/构造器/模板代码 → 抽象类；只描述“能做什么”、需要多实现 → 接口。常见组合是抽象类实现接口，子类继承抽象类。' }
    ],
    pitfalls: [
      '接口不能 new，也不能有实例字段。',
      '实现类没实现全部抽象方法，编译报错。',
      '两个接口有同名 default 方法时，实现类必须重写消除冲突。'
    ],
    homework: '定义 Shape 接口（area、default describe），写 Circle、Rectangle 两个实现；再写一个抽象类 AbstractShape 持有 name 字段并实现 describe，让两个图形继承它。'
  };

  G['enum-record'] = {
    goals: ['用枚举表达固定集合', '给枚举加字段和构造器', '用 record 写不可变数据载体'],
    flow: '枚举解决“常量散落、类型不安全”；record 解决“只装数据的类写起来太啰嗦”。两者都是让代码更短、更安全。',
    sections: [
      { h: '枚举的本质是类', p: 'enum 编译后是一个继承 java.lang.Enum 的 final 类，每个常量都是类加载时创建的静态实例。所以它天然单例、线程安全，可直接用于 switch。' },
      { h: 'record 自动生成什么', p: 'record Point(int x, int y) 自动生成全参构造器、x()/y()、equals/hashCode/toString。字段 private final，没有 setter，适合 DTO、返回值、坐标这类值对象。' },
      { h: '什么时候别用 record', p: '需要可变状态、需要继承其他类、需要无参构造器给框架反射时，record 都不合适。它也不能继承类（但能实现接口）。' }
    ],
    pitfalls: [
      '枚举常量的构造器参数写错，编译报“无法应用构造器”。',
      'record 的访问器是 x() 不是 getX()，别按 JavaBean 习惯写。',
      '把 record 当实体类塞进 JPA，很多框架要求无参构造器。'
    ],
    homework: '写一个 Level 枚举（LOW/MEDIUM/HIGH，带 weight 字段和方法）；再写 record Book(String title, double price) 并创建实例，打印 title 和 price。'
  };
})();
