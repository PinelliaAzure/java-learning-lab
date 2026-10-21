/* 新手精讲 1：Java 起步 + 面向对象（10 课） */
(function () {
  'use strict';
  var G = window.JAVA_GUIDES || (window.JAVA_GUIDES = {});

  G['jdk'] = {
    goals: ['分清 JDK、JRE、JVM 各自负责什么', '说出 .java → .class → 运行 的完整过程', '独立编译并运行第一个程序'],
    pitfalls: [
      '把 javac 和 java 用反：javac 编译，java 运行。',
      '执行 java Hello.class：java 命令只接受类名。',
      '只装 JRE 就想编译：没有 javac，写不了自己的程序。'
    ],
    homework: '在命令行完成 Hello.java 的编译运行；然后删掉 .class 文件，观察 java 命令报什么错，理解“运行的是字节码而不是源码”。'
  };

  G['vars'] = {
    goals: ['正确选择 int/long/double/boolean/char', '写出合法的字面量并解释后缀', '说清局部变量为什么必须先赋值'],
    pitfalls: [
      'long 变量写 8100000000 不加 L，编译报错。',
      '把 double 直接赋给 int，必须强转且会截断小数。',
      '在 if 块里声明的变量，出了块就不能再用。'
    ],
    homework: '声明并打印 byte、short、int、long、float、double、char、boolean 各一个变量；再用一行代码验证 1/3 与 1.0/3 的区别。'
  };

  G['operators'] = {
    goals: ['解释整数除法与取模的结果', '正确使用 ++/-- 和短路运算', '判断什么时候需要强制类型转换'],
    pitfalls: [
      '用 / 做平均分却忘了转 double，结果永远是整数。',
      '把 == 写成 =，编译可能通过但逻辑全错。',
      '强转 (int) 3.99 得到 3，不是 4。'
    ],
    homework: '写一个温度转换程序：摄氏转华氏保留一位小数；再输入两个整数，输出商和余数，要求商保留两位小数。'
  };

  G['control'] = {
    goals: ['用 if/switch 写出清晰的分支', '按场景选择 for/while/do-while', '安全地遍历和操作数组'],
    pitfalls: [
      'if (x = 1) 把比较写成赋值，编译报错（boolean 才行），但思路要警惕。',
      'for 循环里 i <= length，多跑一次导致越界。',
      '在增强 for 里修改数组元素值，改的是副本。'
    ],
    homework: '用数组保存 5 个成绩，输出总分、平均分、最高分；再用 switch 根据分数段打印等级（90+ 优秀、60+ 及格、否则不及格）。'
  };

  G['class-object'] = {
    goals: ['区分类与对象、声明与实例化', '写出带参构造器并用 this 赋值', '解释栈引用与堆对象的关系'],
    pitfalls: [
      '比较两个对象内容用 ==，比的是地址，应该重写 equals。',
      '写了有参构造器后，再写 new Student() 会编译失败。',
      '对象引用为 null 时调用方法，抛 NullPointerException。'
    ],
    homework: '写一个 Student 类（姓名、年龄、构造器、birthday 方法），创建两个对象，让两个引用指向同一个对象，修改其中一个的年龄并打印另一个，验证“共享同一个对象”。'
  };

  G['encapsulation'] = {
    goals: ['用 private + 方法保护字段', '在 setter/业务方法里做参数校验', '分清 static 成员与实例成员'],
    pitfalls: [
      '所有字段都生成 public setter，等于没封装。',
      '在 static 方法里直接访问实例字段，编译报错。',
      'setter 里忘了 this，写成 name = name，赋值无效。'
    ],
    homework: '写一个 BankAccount：private 余额，提供 deposit/withdraw/getBalance；存款金额必须为正，取款不能超过余额；再写一个 static 计数器统计创建了几个账户。'
  };

  G['inheritance'] = {
    goals: ['用 extends 复用父类并正确调用 super', '遵守重写规则并使用 @Override', '判断什么时候不该用继承'],
    pitfalls: [
      '父类只写了有参构造器，子类却没写 super(...)，编译失败。',
      '重写时把参数类型改了，变成重载而不是重写。',
      '为了复用一行代码强行继承，导致类层次越来越僵。'
    ],
    homework: '写 Animal（name、speak）和 Dog/Cat 两个子类，重写 speak；在 Dog 构造器里用 super(name) 传名字，分别创建对象并调用。'
  };

  G['polymorphism'] = {
    goals: ['理解“编译看左边，运行看右边”', '说清动态绑定的过程', '安全地使用 instanceof 和向下转型'],
    pitfalls: [
      '以为 Animal a = new Dog() 后 a 能调用 Dog 独有方法——编译不通过。',
      '字段没有多态：a.name 取的是 Animal 里声明的字段。',
      'static 方法不参与动态绑定，看的是变量声明类型。'
    ],
    homework: '定义 Animal 数组，放入 Dog、Cat、Bird；循环调用 speak，观察输出；再写一个方法接收 Animal，内部用 instanceof 判断并调用子类独有方法。'
  };

  G['abstract-interface'] = {
    goals: ['用抽象类抽取公共状态和模板', '用接口描述一组能力并多实现', '根据需要选择抽象类或接口'],
    pitfalls: [
      '接口不能 new，也不能有实例字段。',
      '实现类没实现全部抽象方法，编译报错。',
      '两个接口有同名 default 方法时，实现类必须重写消除冲突。'
    ],
    homework: '定义 Shape 接口（area、default describe），写 Circle、Rectangle 两个实现；再写一个抽象类 AbstractShape 持有 name 字段并实现 describe，让两个图形继承它。'
  };

  G['enum-record'] = {
    goals: ['用枚举表达固定集合', '给枚举加字段和构造器', '用 record 写不可变数据载体'],
    pitfalls: [
      '枚举常量的构造器参数写错，编译报“无法应用构造器”。',
      'record 的访问器是 x() 不是 getX()，别按 JavaBean 习惯写。',
      '把 record 当实体类塞进 JPA，很多框架要求无参构造器。'
    ],
    homework: '写一个 Level 枚举（LOW/MEDIUM/HIGH，带 weight 字段和方法）；再写 record Book(String title, double price) 并创建实例，打印 title 和 price。'
  };
})();
