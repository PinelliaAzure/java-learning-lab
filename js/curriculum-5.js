/* =====================================================================
   补充：准备篇、基础补强、SQL 与项目实战
   加载后先做一轮重编号；最终顺序与编号由 js/curriculum-order.js 决定
   ===================================================================== */
(function () {
  'use strict';

  var C = window.JAVA_COURSE;
  if (!C) return;

  function S(code, frames, title, hint) {
    return {
      type: 'steps', title: title, hint: hint, code: code,
      frames: frames.map(function (f) {
        return { line: f[0], vars: f[1], note: f[2], out: f[3] || '', heap: f[4] || null };
      })
    };
  }

  function D(nodes, edges, hint, title) {
    return { type: 'diagram', title: title, hint: hint, nodes: nodes, edges: edges };
  }

  function mod(id) {
    for (var i = 0; i < C.length; i++) if (C[i].id === id) return C[i];
    return null;
  }

  /* ----------------------------------------------------------------
     准备篇
     ---------------------------------------------------------------- */
  var setup = {
    id: 'setup',
    title: '从零安装 JDK 并跑通第一个程序',
    minutes: 12,
    level: '入门',
    intro: '很多新手不是卡在语法，而是卡在环境：JDK 装在哪、环境变量怎么配、命令行为什么找不到 javac、IDE 里怎么建项目。这一课把这条链路一次走完。',
    points: [
      { t: '选哪个版本', d: '学习阶段选 **LTS 版本**（JDK 25，21 可作过渡）。当前 LTS 是 25，21 是上一代 LTS；17/21 的生态与资料最常见，但不要一上来追最新非 LTS。' },
      { t: '安装后先验证', d: '打开终端执行 <code>java -version</code> 和 <code>javac -version</code>，两条都能输出版本号，才算装好。' },
      { t: 'JAVA_HOME 与 PATH', d: '<code>JAVA_HOME</code> 指向 JDK 安装目录；<code>PATH</code> 里加入 <code>%JAVA_HOME%\\bin</code>（Windows）或 <code>$JAVA_HOME/bin</code>（macOS/Linux），系统才能找到 java/javac。' },
      { t: 'IDE 只是编辑器', d: 'IntelliJ IDEA Community 或 VS Code + Java 插件都能写。IDE 帮你补全、编译、调试，但底层仍然是 javac 和 JVM。' },
      { t: '文件名必须匹配', d: 'public 类的类名必须和文件名一致，<code>Hello.java</code> 里只能有一个 public class Hello。' }
    ],
    code: `public class Hello {
    public static void main(String[] args) {
        System.out.println("Hello, Java!");
    }
}

// 1. 编译
javac Hello.java
// 2. 运行（不要加 .class）
java Hello
// 3. 输出
// Hello, Java!`,
    tip: '安装完先跑 <code>java -version</code>；报“找不到命令”九成是 PATH 没配或终端没重启。',
    demo: D([
      { id: 'dl', label: '下载 JDK', sub: '25 LTS', x: 3, y: 10, w: 15, h: 14, tone: 'amber', info: '从 Oracle / Eclipse Temurin / Amazon Corretto 下载对应系统的安装包。学习者选 Temurin 25 即可。' },
      { id: 'install', label: '安装', sub: '默认路径', x: 21, y: 10, w: 13, h: 14, tone: 'teal', info: '一路下一步即可。记住安装目录，后面配置 JAVA_HOME 要用。' },
      { id: 'env', label: 'JAVA_HOME', sub: '指向 JDK 根目录', x: 37, y: 10, w: 15, h: 14, tone: 'violet', info: 'Windows：系统属性 → 环境变量；macOS：~/.zshrc 里 export JAVA_HOME=...' },
      { id: 'path', label: 'PATH', sub: '加入 bin 目录', x: 55, y: 10, w: 13, h: 14, tone: 'violet', info: '把 %JAVA_HOME%\\bin 或 $JAVA_HOME/bin 加进 PATH，命令行才能直接调用 java/javac。' },
      { id: 'verify', label: '验证', sub: 'java -version', x: 71, y: 10, w: 14, h: 14, tone: 'blue', info: '再执行 javac -version。两条都成功，环境才算配好。' },
      { id: 'ide', label: 'IDE 建项目', sub: 'IDEA / VS Code', x: 21, y: 56, w: 16, h: 14, tone: 'teal', info: '新建 Java 项目，选择刚装的 JDK，创建 src 目录和 Hello 类。' },
      { id: 'run', label: '运行 main', sub: '绿色三角', x: 45, y: 56, w: 15, h: 14, tone: 'amber', info: 'IDE 会调用 javac 编译，再用 java 启动；控制台看到输出就成功了。' },
      { id: 'err', label: '常见报错', sub: '找不到命令 / 类名', x: 66, y: 56, w: 18, h: 14, tone: 'rose', info: '“javac 不是内部命令”= PATH 问题；“类 Hello 是公共的，应在 Hello.java 中声明”= 文件名与类名不一致。' }
    ], [
      { from: 'dl', to: 'install', label: '安装' },
      { from: 'install', to: 'env', label: '配置' },
      { from: 'env', to: 'path', label: '加入' },
      { from: 'path', to: 'verify', label: '验证' },
      { from: 'install', to: 'ide', label: '在 IDE 中打开', dashed: true },
      { from: 'ide', to: 'run', label: '运行' },
      { from: 'run', to: 'err', label: '出错时查', dashed: true }
    ], '点击每个节点：这是一条从下载到跑通的完整链路。', '环境搭建全流程'),
    guide: {
      goals: [
        '独立完成 JDK 下载、安装与环境变量配置',
        '能用命令行编译并运行一个 Java 程序',
        '在 IDE 中新建项目并解释每个目录的作用'
      ],
      pitfalls: [
        '只装了 JRE：能运行别人的程序，但没有 javac，无法编译自己的代码。',
        '改了环境变量却没重开终端：旧终端读的还是旧 PATH。',
        '文件名写成 hello.java：Windows 不区分大小写可能没事，Linux/macOS 会直接报错。'
      ],
      homework: '在命令行完成一次“新建 Hello.java → javac → java”的完整流程，然后把类名改成 HelloWorld，观察文件名必须跟着改；最后在 IDE 里重复一遍。'
    },
    quiz: [
      {
        q: '安装完成后，验证 JDK 是否可用，最直接的两条命令是？',
        options: ['java -version 和 javac -version', 'java -run 和 javac -run', 'jdk -version 和 jre -version', 'mvn -version 和 gradle -version'],
        answer: 0,
        explain: 'java 验证运行环境，javac 验证编译器。两条都输出版本号，说明 PATH 和 JDK 都正常。'
      },
      {
        q: '文件里写的是 <code>public class Hello</code>，文件名却叫 <code>Test.java</code>，编译会怎样？',
        options: ['正常通过', '报错：公共类 Hello 应在 Hello.java 中声明', '自动改名为 Hello.java', '运行时才报错'],
        answer: 1,
        explain: 'Java 要求 public 类的类名与文件名完全一致（包括大小写），否则 javac 直接报错。'
      },
      {
        q: 'PATH 环境变量的作用是？',
        options: ['保存 Java 源码', '告诉系统去哪些目录查找可执行命令', '设置 JVM 内存', '决定 JDK 版本'],
        answer: 1,
        explain: 'PATH 是命令搜索路径；把 JDK 的 bin 加进去，java/javac 才能全局使用。JAVA_HOME 才是 JDK 根目录。'
      }
    ]
  };

  /* ----------------------------------------------------------------
     Scanner
     ---------------------------------------------------------------- */
  var scanner = {
    id: 'scanner',
    title: '输入输出与 Scanner',
    minutes: 7,
    level: '入门',
    intro: '只会 System.out.println 的程序是“单向”的。真实的程序要能读取用户输入、格式化输出，而 Scanner 就是最常用的入口。',
    points: [
      { t: '三种输出', d: '<code>print</code> 不换行，<code>println</code> 换行，<code>printf</code> 按格式输出（%s 字符串、%d 整数、%.2f 两位小数）。' },
      { t: '读取输入', d: '<code>Scanner sc = new Scanner(System.in);</code> 之后用 <code>nextLine()</code> 读整行、<code>nextInt()</code> 读整数、<code>nextDouble()</code> 读小数。' },
      { t: '换行残留坑', d: '<code>nextInt()</code> 只读数字，不读你按下的回车；紧接着的 <code>nextLine()</code> 会读到一个空行。解决：在 nextInt 后多调用一次 nextLine()。' },
      { t: '关闭资源', d: 'Scanner 包装了 System.in，用完调用 <code>sc.close()</code>；在小型练习里不关也不会立刻出错，但养成习惯。' }
    ],
    code: `import java.util.Scanner;

public class InputDemo {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);

        System.out.print("请输入姓名：");
        String name = sc.nextLine();

        System.out.print("请输入年龄：");
        int age = sc.nextInt();

        System.out.printf("%s 今年 %d 岁%n", name, age);
        sc.close();
    }
}`,
    tip: '连续读“字符串 + 数字”时，先 nextLine 读字符串，再 nextInt；反过来要先吃掉换行。',
    demo: S(`Scanner sc = new Scanner(System.in);
String name = sc.nextLine();
int age = sc.nextInt();
System.out.println(name + "，" + age + " 岁");`, [
          [0, { sc: 'Scanner(System.in)' }, '创建 Scanner，把它接到标准输入（键盘）。'],
          [1, { sc: 'ready', name: '"小明"' }, '用户在控制台输入“小明”并回车，nextLine 读到整行。'],
          [2, { sc: 'ready', name: '"小明"', age: '18' }, 'nextInt 读取数字 18；注意它不会读走回车。'],
          [3, { sc: 'ready', name: '"小明"', age: '18' }, '拼接字符串并输出。', '小明，18 岁']
        ], '从键盘读数', '真实运行时，第 1、2 步会停住等待你输入。'),
    guide: {
      goals: [
        '用 Scanner 读取字符串、整数和小数',
        '用 printf 控制小数位数与对齐',
        '解释 nextInt 之后 nextLine 读到空行的原因'
      ],
      pitfalls: [
        '用 nextLine 读数字再 parseInt：遇到空行或空格会抛 NumberFormatException。',
        'nextInt 后直接 nextLine 读姓名：拿到的是空字符串。',
        'Scanner 关闭后再用：抛 IllegalStateException。'
      ],
      homework: '写一个“点餐”程序：依次读入菜名（可能含空格）、数量、单价，用 printf 输出“菜名 × 数量 = 总价（保留两位小数）”，并处理数量输入非数字的情况。'
    },
    quiz: [
      {
        q: '执行 <code>int n = sc.nextInt();</code> 后紧接着 <code>String s = sc.nextLine();</code>，s 很可能是？',
        options: ['下一行的内容', '空字符串（读到残留的换行）', '编译错误', 'null'],
        answer: 1,
        explain: 'nextInt 不消费回车，nextLine 读到这个换行就立即返回空串。需要额外调用一次 nextLine() 清掉。'
      },
      {
        q: '要输出保留两位小数的价格，应该用？',
        options: ['System.out.println(price)', 'System.out.printf("%.2f", price)', 'System.out.print(price, 2)', 'price.round(2)'],
        answer: 1,
        explain: 'printf 的 %.2f 表示保留两位小数；println 会输出完整精度。'
      },
      {
        q: '<code>sc.nextInt()</code> 时用户输入了字母，会发生什么？',
        options: ['返回 0', '抛 InputMismatchException', '自动跳过', '编译错误'],
        answer: 1,
        explain: 'Scanner 解析失败会抛 InputMismatchException（运行时异常），应当捕获或先校验输入。'
      }
    ]
  };

  /* ----------------------------------------------------------------
     方法
     ---------------------------------------------------------------- */
  var methods = {
    id: 'methods',
    title: '方法、参数传递与重载',
    minutes: 9,
    level: '入门',
    intro: '方法是把一段逻辑“打包”起来反复使用的最小单位。理解参数怎么传、返回值怎么回、重载怎么选，是写类之前必须跨过的一道坎。',
    points: [
      { t: '定义与调用', d: '<code>返回类型 方法名(参数列表) { ... }</code>。void 表示不返回值；有返回值的方法必须保证每条路径都 return。' },
      { t: 'Java 只有值传递', d: '基本类型传的是值的副本；对象传的是“引用的副本”。所以在方法里改对象字段会影响外部，但让参数指向新对象不会。' },
      { t: '重载 Overload', d: '同一个类里方法名相同、参数列表不同（类型/个数/顺序）。返回值不同不构成重载，编译器按实参类型选最匹配的版本。' },
      { t: '可变参数与递归', d: '<code>int... nums</code> 本质是数组，必须放参数最后；递归要有终止条件，否则 StackOverflowError。' }
    ],
    code: `public class Methods {
    static int add(int a, int b) {
        return a + b;
    }

    static int add(int a, int b, int c) {   // 重载：参数个数不同
        return a + b + c;
    }

    static int sum(int... nums) {           // 可变参数
        int total = 0;
        for (int n : nums) total += n;
        return total;
    }

    static int factorial(int n) {           // 递归
        if (n <= 1) return 1;
        return n * factorial(n - 1);
    }
}`,
    tip: '方法名要能说明“做什么”，参数名要说明“是什么”；一个方法只做一件事。',
    demo: S(`int a = 3, b = 4;
int result = add(a, b);
System.out.println(result);

static int add(int x, int y) {
    return x + y;
}`, [
          [0, { a: '3', b: '4' }, 'main 方法里准备两个实参 a、b。'],
          [1, { a: '3', b: '4', x: '3', y: '4' }, '调用 add：实参的值复制给形参 x、y，进入 add 的栈帧。'],
          [4, { x: '3', y: '4', 返回值: '7' }, '执行 x + y，得到 7，准备返回。'],
          [1, { a: '3', b: '4', result: '7' }, '返回值 7 赋给 result，add 的栈帧销毁。'],
          [2, { a: '3', b: '4', result: '7' }, '打印结果。', '7']
        ], '方法调用与返回', '注意 x、y 是 a、b 的副本；方法内的修改不会影响外面的基本类型变量。'),
    guide: {
      goals: [
        '独立定义、调用带参数和返回值的方法',
        '解释为什么 swap(int, int) 交换不了外部变量',
        '用重载和可变参数写出更通用的工具方法'
      ],
      pitfalls: [
        '在方法里写 int temp = a; a = b; b = temp; 以为能交换外部变量——只是交换了副本。',
        '重载时写 add(int) 和 add(long)，调用 add(1) 会优先选 int 版本。',
        '递归忘记写终止条件，运行时报 StackOverflowError。'
      ],
      homework: '写三个重载的 max 方法，分别求两个 int、三个 int、一个 int 数组的最大值；再写一个递归方法求斐波那契数列第 n 项，并用 n=10 验证结果。'
    },
    quiz: [
      {
        q: '下面哪个方法不能和 <code>void print(int x)</code> 构成重载？',
        options: ['void print(String s)', 'void print(int x, int y)', 'int print(int x)', 'void print(double d)'],
        answer: 2,
        explain: '参数列表完全相同、只有返回值不同，不构成重载，编译器会报“方法已定义”。'
      },
      {
        q: '<code>static void swap(int a, int b)</code> 内部交换 a、b，调用后外部变量会变吗？',
        options: ['会', '不会，交换的只是副本', '取决于是否加 final', '抛异常'],
        answer: 1,
        explain: '基本类型是值传递，方法内交换的是形参副本，外部实参不受影响。要交换数组元素或对象字段才行。'
      },
      {
        q: '可变参数 <code>sum(int... nums)</code> 在方法内部，nums 的实际类型是？',
        options: ['List<Integer>', 'int 数组', '单个 int', 'Collection'],
        answer: 1,
        explain: '可变参数本质是数组，可以直接用 nums.length 和增强 for 遍历。'
      }
    ]
  };

  /* ----------------------------------------------------------------
     包与 JavaBean
     ---------------------------------------------------------------- */
  var packages = {
    id: 'packages-bean',
    title: '包、访问权限与 JavaBean',
    minutes: 7,
    level: '入门',
    intro: '项目一大，类就会重名；权限一乱，代码就会互相耦合。包和访问修饰符是 Java 组织代码的两把尺子。',
    points: [
      { t: 'package 与目录', d: '源文件第一行写 <code>package com.example.model;</code>，文件就要放在 <code>src/com/example/model</code> 下。包名通常用公司域名的倒写。' },
      { t: 'import', d: '<code>import java.util.List;</code> 引入其他包的类；同包、java.lang 下的类不需要 import。import 不会递归导入子包。' },
      { t: '四种访问权限', d: '<code>private</code> 仅本类；默认（不写）本包；<code>protected</code> 本包 + 子类；<code>public</code> 全局。成员变量优先用 private。' },
      { t: 'JavaBean 规范', d: '私有字段 + public 无参构造器 + getter/setter + 实现 Serializable（可选）。框架（Spring、MyBatis、JSON 序列化）都依赖这套命名约定。' }
    ],
    code: `package com.example.model;

public class Book {
    private String title;
    private double price;

    public Book() {}

    public Book(String title, double price) {
        this.title = title;
        this.price = price;
    }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public double getPrice() { return price; }
    public void setPrice(double price) { this.price = price; }
}`,
    tip: '字段私有、方法公开；getter 命名必须是 <code>getXxx()</code>/<code>isXxx()</code>，否则框架可能识别不到。',
    demo: D([
      { id: 'root', label: 'com.example', sub: '项目根包', x: 6, y: 12, w: 22, h: 14, tone: 'amber', info: '包名对应目录结构；编译后 class 文件也按包分层存放。' },
      { id: 'model', label: 'model', sub: '实体类', x: 34, y: 12, w: 16, h: 14, tone: 'teal', info: '放 Book、User 这类数据对象，通常是 JavaBean。' },
      { id: 'service', label: 'service', sub: '业务逻辑', x: 54, y: 12, w: 16, h: 14, tone: 'teal', info: '放业务类，调用 model 和 dao；不要在这里写界面代码。' },
      { id: 'main', label: 'Main', sub: '入口', x: 74, y: 12, w: 14, h: 14, tone: 'violet', info: '启动类，负责组装和调用；默认包里的类不能被其他包导入。' },
      { id: 'pri', label: 'private', sub: '仅本类', x: 5, y: 60, w: 16, h: 11, tone: 'rose', info: '最严格。字段、内部辅助方法用它。' },
      { id: 'def', label: 'default', sub: '本包可见', x: 25, y: 60, w: 16, h: 11, tone: 'blue', info: '不写修饰符时的默认权限，同包可访问，子包不行。' },
      { id: 'pro', label: 'protected', sub: '本包 + 子类', x: 45, y: 60, w: 17, h: 11, tone: 'teal', info: '给子类留的扩展点，比 default 多一个“跨包子类可访问”。' },
      { id: 'pub', label: 'public', sub: '全局可见', x: 66, y: 60, w: 16, h: 11, tone: 'amber', info: '最宽松。只给真正对外的 API 用，不要所有类都 public。' }
    ], [
      { from: 'root', to: 'model', label: '包含' },
      { from: 'root', to: 'service', label: '包含' },
      { from: 'root', to: 'main', label: '包含' }
    ], '上排是包结构，下排是访问权限从紧到松。点击节点看说明。', '包与访问权限'),
    guide: {
      goals: [
        '按包组织多文件项目并正确使用 import',
        '说清四种访问修饰符的可见范围',
        '写出符合 JavaBean 规范的实体类'
      ],
      pitfalls: [
        '把类放在默认包，其他包 import 不到。',
        '以为 import com.example.* 会导入子包：通配符只匹配当前包。',
        'JavaBean 只写 getter 不写 setter，反序列化时字段永远是默认值。'
      ],
      homework: '建一个 com.example.library 包，包含 Book（JavaBean）、BookService（增删查）、Main（入口）三个类，把 Book 的 price 设为 private，并在 setPrice 里拒绝负数。'
    },
    quiz: [
      {
        q: '不写任何访问修饰符的成员，默认可见范围是？',
        options: ['仅本类', '本包', '本包和子类', '全局'],
        answer: 1,
        explain: '默认（package-private）权限只允许同一个包内的类访问；跨包子类也访问不到。'
      },
      {
        q: '关于 import，说法正确的是？',
        options: ['import com.example.* 会导入所有子包', '同包类不需要 import', 'import 会把类复制过来', 'java.lang 必须手动 import'],
        answer: 1,
        explain: '同包类、java.lang 下的类自动可见；通配符只导入当前包，不会递归子包。'
      },
      {
        q: '下面哪个类最符合 JavaBean 规范？',
        options: ['public class A { public int x; }', 'class B { private int x; public int getX(){...} public void setX(int x){...} }', 'record C(int x) {}', 'class D { final int x = 1; }'],
        answer: 1,
        explain: 'JavaBean 要求私有字段、无参构造器、公共 getter/setter。record 是不可变数据载体，不属于传统 JavaBean。'
      }
    ]
  };

  /* ----------------------------------------------------------------
     Arrays / Objects / BigDecimal
     ---------------------------------------------------------------- */
  var arraysTools = {
    id: 'arrays-tools',
    title: 'Arrays、Objects 与 BigDecimal',
    minutes: 8,
    level: '进阶',
    intro: '数组的打印、排序、复制，对象的判空与比较，金额的精确计算——这三类工具几乎每个项目都会用到，但新手常踩坑。',
    points: [
      { t: 'Arrays 工具类', d: '<code>toString</code> 打印数组、<code>sort</code> 排序、<code>copyOf</code> 扩容复制、<code>fill</code> 填充、<code>binarySearch</code> 二分查找（必须先排序）。' },
      { t: 'Objects 工具类', d: '<code>Objects.equals(a,b)</code> 安全比较 null、<code>Objects.hash(...)</code> 生成 hashCode、<code>Objects.requireNonNull(x,"msg")</code> 提前失败。' },
      { t: 'BigDecimal 用于金额', d: 'double 有二进制精度误差，0.1+0.2 不等于 0.3。金额用 <code>new BigDecimal("0.1")</code>（字符串构造），不要用 double 构造。' },
      { t: '比较与舍入', d: 'BigDecimal 的 <code>equals</code> 会比较 scale（1.0 与 1.00 不相等），比较数值用 <code>compareTo</code>；舍入用 <code>setScale(2, RoundingMode.HALF_UP)</code>。' }
    ],
    code: `int[] nums = {3, 1, 2};
Arrays.sort(nums);                    // [1, 2, 3]
System.out.println(Arrays.toString(nums));

int[] bigger = Arrays.copyOf(nums, 5); // 扩容，末尾补 0
boolean same = Objects.equals("a", "a");

BigDecimal a = new BigDecimal("0.1");
BigDecimal b = new BigDecimal("0.2");
System.out.println(a.add(b));          // 0.3

BigDecimal price = new BigDecimal("19.995")
        .setScale(2, RoundingMode.HALF_UP);   // 20.00`,
    tip: '金额计算四件套：BigDecimal、字符串构造、compareTo 比较、setScale 指定舍入。',
    demo: S(`double d = 0.1 + 0.2;
BigDecimal a = new BigDecimal("0.1");
BigDecimal b = new BigDecimal("0.2");
BigDecimal sum = a.add(b);
System.out.println(d);
System.out.println(sum);`, [
          [0, { d: '0.30000000000000004' }, 'double 用二进制表示小数，0.1 和 0.2 都无法精确存储，相加后出现误差。'],
          [1, { d: '0.30000000000000004', a: '0.1' }, '用字符串构造 BigDecimal，0.1 被精确表示。'],
          [2, { d: '0.30000000000000004', a: '0.1', b: '0.2' }, '0.2 同样精确表示。'],
          [3, { d: '0.30000000000000004', a: '0.1', b: '0.2', sum: '0.3' }, 'add 按十进制规则相加，得到精确的 0.3。'],
          [4, { sum: '0.3' }, '输出 double 的结果，能看到误差。', '0.30000000000000004'],
          [5, { sum: '0.3' }, '输出 BigDecimal 的结果。', '0.3']
        ], '为什么金额不能用 double', '这不是 Java 的 bug，而是二进制浮点数的固有特性。'),
    guide: {
      goals: [
        '用 Arrays 完成数组的打印、排序和复制',
        '用 Objects 安全地比较可能为 null 的对象',
        '用 BigDecimal 正确计算金额并控制小数位'
      ],
      pitfalls: [
        '用 new BigDecimal(0.1)（double 构造）——误差被原样带进来。',
        'BigDecimal 用 == 比较：比较的是引用地址。',
        'Arrays.binarySearch 前没排序：结果不可预测。'
      ],
      homework: '写一个“购物车结算”方法：用 BigDecimal 保存单价和数量，计算总价并保留两位小数（四舍五入）；再对比用 double 计算同一组数据的结果，打印两者的差异。'
    },
    quiz: [
      {
        q: '金额计算应该使用？',
        options: ['double', 'float', 'BigDecimal + 字符串构造', 'int 直接存元'],
        answer: 2,
        explain: 'double/float 有二进制精度误差；BigDecimal 用字符串构造才能精确表示十进制小数。'
      },
      {
        q: '<code>new BigDecimal("1.0").equals(new BigDecimal("1.00"))</code> 的结果是？',
        options: ['true', 'false', '编译错误', '抛异常'],
        answer: 1,
        explain: 'equals 会比较 scale，1.0 的 scale 是 1，1.00 是 2，所以不相等；数值比较要用 compareTo。'
      },
      {
        q: '快速打印一维数组内容，应该用？',
        options: ['System.out.println(arr)', 'Arrays.toString(arr)', 'arr.print()', 'String.valueOf(arr)'],
        answer: 1,
        explain: '直接打印数组得到的是类型@哈希；Arrays.toString 会把元素拼成 [1, 2, 3]。'
      }
    ]
  };

  /* ----------------------------------------------------------------
     SQL 基础
     ---------------------------------------------------------------- */
  var sqlBasics = {
    id: 'sql-basics',
    title: 'SQL 基础：增删改查',
    minutes: 8,
    level: '入门',
    intro: 'Java 后端的另一半是数据库。不会 SQL，JDBC、MyBatis、JPA 都无从谈起。这一课只讲最核心的 CRUD 和查询。',
    points: [
      { t: '表、行、列', d: '一张表就是一类数据（用户、订单）；一行是一条记录；一列是一个字段。主键唯一标识一行，通常自增。' },
      { t: '查询', d: '<code>SELECT 列 FROM 表 WHERE 条件 ORDER BY 列 DESC LIMIT n</code>。WHERE 支持 =、&gt;、LIKE、IN、BETWEEN、AND/OR。' },
      { t: '增删改', d: '<code>INSERT INTO 表(列...) VALUES(...)</code>、<code>UPDATE 表 SET 列=值 WHERE 条件</code>、<code>DELETE FROM 表 WHERE 条件</code>。忘写 WHERE 会全表更新/删除。' },
      { t: '连接与索引', d: '<code>JOIN ... ON</code> 把多张表按关联字段拼起来；索引加速查询但降低写入速度，主键和常用查询字段适合建索引。' }
    ],
    codeTitle: 'demo.sql',
    code: `-- 查询价格高于 50 的图书，按价格降序取前两本
SELECT name, price
FROM book
WHERE price > 50
ORDER BY price DESC
LIMIT 2;

-- 新增
INSERT INTO book(name, price) VALUES ('Java 入门', 59.0);

-- 修改（务必带 WHERE）
UPDATE book SET price = 49.0 WHERE id = 1;

-- 删除（务必带 WHERE）
DELETE FROM book WHERE id = 2;`,
    tip: '<code>UPDATE</code> 和 <code>DELETE</code> 先写 WHERE，再补前面的语句；执行前用 SELECT 验证条件命中哪些行。',
    demo: S(`SELECT name, price
FROM book
WHERE price > 50
ORDER BY price DESC
LIMIT 2;`, [
          [0, { 表: 'book', 行数: '5' }, '从 book 表读取 name、price 两列，先不急着输出。'],
          [2, { 条件: 'price > 50', 命中: '3 行' }, 'WHERE 过滤：只剩下价格大于 50 的记录。'],
          [3, { 排序: 'price DESC', 顺序: '贵 → 便宜' }, 'ORDER BY 按价格降序排列。'],
          [4, { 返回: '2 行' }, 'LIMIT 2 只取前两条。', '《Java 编程思想》 99.0\n《深入理解 JVM》 89.0']
        ], '一条查询的四个动作', 'SELECT 不会修改数据；UPDATE/DELETE 才会。'),
    guide: {
      goals: [
        '写出带 WHERE、ORDER BY、LIMIT 的查询',
        '完成 INSERT / UPDATE / DELETE 并避免全表误操作',
        '理解主键、索引和简单 JOIN 的作用'
      ],
      pitfalls: [
        'DELETE 忘了 WHERE，整表数据被清空（先备份、先 SELECT）。',
        '用字符串拼接 SQL 导致注入，应该用 PreparedStatement。',
        'LIKE "%关键字%" 以通配符开头，索引通常失效。'
      ],
      homework: '建一张 book 表（id 主键自增、name、price、author），插入 5 条数据；写三条查询：价格区间、按价格降序前 3、名字包含“Java”的书；最后用带 WHERE 的 UPDATE 改一本的价格并验证。'
    },
    quiz: [
      {
        q: '下面哪条语句会修改表中所有行的价格？',
        options: ['UPDATE book SET price = 0;', 'UPDATE book SET price = 0 WHERE id = 1;', 'SELECT * FROM book;', 'DELETE FROM book WHERE id = 1;'],
        answer: 0,
        explain: '没有 WHERE 的 UPDATE 会作用于全表，这是线上最危险的误操作之一。'
      },
      {
        q: '查询结果按价格从高到低排序，应该写？',
        options: ['ORDER BY price ASC', 'ORDER BY price DESC', 'SORT price DESC', 'GROUP BY price DESC'],
        answer: 1,
        explain: 'ORDER BY 默认 ASC（升序），DESC 表示降序。'
      },
      {
        q: '主键的作用是？',
        options: ['让表看起来整齐', '唯一标识一行记录', '自动创建索引并允许重复', '存储表名'],
        answer: 1,
        explain: '主键唯一且非空，用来精确定位一行；数据库通常还会为主键自动建索引。'
      }
    ]
  };

  /* ----------------------------------------------------------------
     项目实战：控制台
     ---------------------------------------------------------------- */
  var projectConsole = {
    id: 'project-console',
    title: '项目实战一：控制台图书管理系统',
    minutes: 15,
    level: '进阶',
    intro: '学完语法和集合，最缺的是“把知识拼成一个能跑的东西”。这个项目不依赖数据库和框架，只用 Java SE 完成一个可增删查改、能保存到文件的图书管理程序。',
    points: [
      { t: '先拆需求', d: '图书（id、书名、作者、价格、是否借出）、功能（新增、查询、借出、归还、删除、退出）、数据（内存 List + 文件持久化）。' },
      { t: '三层结构', d: 'Book 实体只存数据；BookService 负责业务规则（借出时校验是否已借）；Main 只负责菜单和输入输出。' },
      { t: '用集合存数据', d: '启动时从文件读入 List&lt;Book&gt;，每次修改后写回文件；查找用 Stream 或循环，删除注意不要在 for-each 里直接 remove。' },
      { t: '健壮性', d: '所有输入都要校验：id 不存在、价格非数字、重复借出。用 try-catch 包住解析，给用户明确提示，而不是抛堆栈。' }
    ],
    code: `public class Book {
    private int id;
    private String name;
    private String author;
    private double price;
    private boolean borrowed;
    // 构造器、getter/setter 省略
}

public class BookService {
    private final List<Book> books = new ArrayList<>();

    public void add(Book book) { books.add(book); }

    public Book findById(int id) {
        return books.stream()
                .filter(b -> b.getId() == id)
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("图书不存在: " + id));
    }

    public void borrow(int id) {
        Book book = findById(id);
        if (book.isBorrowed()) throw new IllegalStateException("已被借出");
        book.setBorrowed(true);
    }
}`,
    tip: '先让主流程跑通，再补校验和持久化；不要一开始就设计十几个类。',
    demo: D([
      { id: 'main', label: 'Main', sub: '菜单 / 输入输出', x: 5, y: 12, w: 18, h: 14, tone: 'amber', info: '只做界面：打印菜单、读用户选择、调用 Service、显示结果。不写业务规则。' },
      { id: 'service', label: 'BookService', sub: '增删查 / 借还', x: 28, y: 12, w: 20, h: 14, tone: 'teal', info: '业务核心：校验 id、判断是否已借出、维护集合。可以单独测试。' },
      { id: 'book', label: 'Book', sub: '实体', x: 53, y: 12, w: 16, h: 14, tone: 'violet', info: '只有字段和 getter/setter（JavaBean），不包含业务逻辑。' },
      { id: 'list', label: 'List<Book>', sub: '内存数据', x: 74, y: 12, w: 18, h: 14, tone: 'blue', info: '用 ArrayList 保存所有图书；启动时加载，修改后保存。' },
      { id: 'file', label: 'books.txt', sub: '持久化', x: 28, y: 58, w: 20, h: 14, tone: 'rose', info: '每行一条记录，用逗号或制表符分隔；也可以用 JSON。' },
      { id: 'ex', label: '异常处理', sub: '输入校验', x: 53, y: 58, w: 16, h: 14, tone: 'rose', info: '数字解析失败、id 不存在、重复借出，都要给用户可读的提示。' }
    ], [
      { from: 'main', to: 'service', label: '调用' },
      { from: 'service', to: 'book', label: '操作' },
      { from: 'service', to: 'list', label: '读写' },
      { from: 'list', to: 'file', label: '加载 / 保存', dashed: true },
      { from: 'service', to: 'ex', label: '抛出', dashed: true }
    ], '点击节点：先分清“谁负责什么”，再开始写代码。', '三层结构'),
    guide: {
      goals: [
        '把需求拆成实体、服务、入口三个职责清晰的类',
        '用集合和 Stream 完成增删查改',
        '把数据保存到文件并在启动时恢复'
      ],
      pitfalls: [
        '把 Scanner 和业务逻辑混在一个巨型 main 方法里，后期无法维护。',
        '在 for-each 遍历 List 时 remove，抛 ConcurrentModificationException。',
        '文件写入没有 flush/close，重启后数据丢失。'
      ],
      homework: '独立完成这个项目，并额外加两个功能：按作者查询、按价格排序显示；再把存储格式换成 JSON 字符串（可以手写拼接，不引入第三方库）。'
    },
    quiz: [
      {
        q: 'BookService 中“借书”时判断是否已借出，这属于？',
        options: ['界面逻辑', '业务规则', '持久化', '语法糖'],
        answer: 1,
        explain: '是否允许借出是业务规则，应放在 Service，Main 只负责调用并显示结果。'
      },
      {
        q: '遍历 List 删除元素时，正确做法是？',
        options: ['for-each 里直接 list.remove', '用 Iterator.remove 或 removeIf', '把 list 置空', '用 while(true)'],
        answer: 1,
        explain: 'for-each 底层是迭代器，直接修改集合会抛 ConcurrentModificationException；用 iterator.remove() 或 removeIf。'
      },
      {
        q: '项目启动时把文件读回 List，最适合放在？',
        options: ['每次查询时', 'Service 初始化时', 'UI 渲染时', '每次借书时'],
        answer: 1,
        explain: '启动时加载一次到内存，后续操作内存并在修改后写回，避免频繁 IO。'
      }
    ]
  };

  /* ----------------------------------------------------------------
     项目实战：Spring Boot
     ---------------------------------------------------------------- */
  var projectSpring = {
    id: 'project-spring',
    title: '项目实战二：Spring Boot REST 接口',
    minutes: 15,
    level: '进阶',
    intro: '把控制台项目升级成浏览器/前端能调用的 Web 接口：Spring Boot 负责启动和装配，Controller 接收请求，Service 处理业务，Repository 访问数据库。',
    points: [
      { t: '生成项目', d: '用 start.spring.io 选 Maven、Java 17+、Spring Web，下载后导入 IDE；<code>@SpringBootApplication</code> 启动内嵌 Tomcat。' },
      { t: '分层', d: 'Controller 只做参数接收和响应；Service 写业务；Repository 访问数据库。不要在 Controller 里写 SQL。' },
      { t: 'REST 接口', d: '<code>@GetMapping("/books/{id}")</code> 查、<code>@PostMapping</code> 增、<code>@PutMapping</code> 改、<code>@DeleteMapping</code> 删；返回对象自动转 JSON。' },
      { t: '测试与打包', d: '用 curl / Postman 调接口；<code>mvn package</code> 打出可执行 jar，<code>java -jar</code> 启动。' }
    ],
    code: `@RestController
@RequestMapping("/api/books")
public class BookController {
    private final BookService service;

    public BookController(BookService service) {
        this.service = service;
    }

    @GetMapping("/{id}")
    public Book get(@PathVariable long id) {
        return service.findById(id);
    }

    @PostMapping
    public Book create(@RequestBody Book book) {
        return service.save(book);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable long id) {
        service.delete(id);
    }
}`,
    tip: 'Controller 保持“薄”：一行调用 Service 即可；业务规则、事务、校验都放在 Service。',
    demo: D([
      { id: 'client', label: '浏览器 / 前端', sub: 'HTTP 请求', x: 4, y: 12, w: 18, h: 14, tone: 'blue', info: '发送 GET /api/books/1 或 POST /api/books，携带 JSON。' },
      { id: 'ctrl', label: 'Controller', sub: '@RestController', x: 27, y: 12, w: 19, h: 14, tone: 'amber', info: '解析路径参数和请求体，调用 Service，把返回值交给 Jackson 转 JSON。' },
      { id: 'svc', label: 'Service', sub: '业务 + 事务', x: 51, y: 12, w: 18, h: 14, tone: 'teal', info: '校验、业务规则、@Transactional 事务边界都在这一层。' },
      { id: 'repo', label: 'Repository', sub: '数据访问', x: 74, y: 12, w: 18, h: 14, tone: 'violet', info: 'JPA 或 MyBatis，只负责存取数据，不写业务判断。' },
      { id: 'db', label: '数据库', sub: 'MySQL / H2', x: 74, y: 58, w: 18, h: 14, tone: 'rose', info: '真实数据存储；本地练习可用 H2 内存库，启动即用。' },
      { id: 'json', label: 'JSON 响应', sub: '200 + 数据', x: 27, y: 58, w: 19, h: 14, tone: 'blue', info: '对象自动序列化为 JSON；异常由 @ControllerAdvice 统一转成错误结构。' }
    ], [
      { from: 'client', to: 'ctrl', label: '请求' },
      { from: 'ctrl', to: 'svc', label: '调用' },
      { from: 'svc', to: 'repo', label: '读写' },
      { from: 'repo', to: 'db', label: 'SQL' },
      { from: 'ctrl', to: 'json', label: '返回', dashed: true }
    ], '点击节点：请求从左到右，响应再回来。', '一个 REST 请求的分层'),
    guide: {
      goals: [
        '用 start.spring.io 创建并启动一个 Spring Boot 项目',
        '写出 GET/POST/DELETE 三个 REST 接口',
        '用 curl 或 Postman 验证接口返回 JSON'
      ],
      pitfalls: [
        'Controller 里直接 new Service，绕过 Spring 容器，依赖注入失效。',
        '忘记 @RequestBody，POST 收到的对象字段全是 null。',
        '端口被占用导致启动失败，改 server.port 或结束占用进程。'
      ],
      homework: '给图书接口补上“按书名模糊查询”和“修改价格”两个接口，用 curl 验证；再把内存 List 换成 H2 + Spring Data JPA，让数据在重启后仍在。'
    },
    quiz: [
      {
        q: 'REST 接口里，<code>/books/1</code> 中的 1 通常用哪个注解接收？',
        options: ['@RequestParam', '@PathVariable', '@RequestBody', '@RequestHeader'],
        answer: 1,
        explain: '路径变量用 @PathVariable；查询参数 ?id=1 才用 @RequestParam。'
      },
      {
        q: '@RestController 返回一个 Book 对象时，响应体默认是？',
        options: ['Book 的 toString', 'JSON', 'HTML 页面', '二进制'],
        answer: 1,
        explain: 'Spring Boot 默认集成 Jackson，会把对象序列化成 JSON 写入响应体。'
      },
      {
        q: '业务校验（如价格不能为负）最适合放在？',
        options: ['Controller', 'Service', 'Repository', '启动类'],
        answer: 1,
        explain: 'Controller 只负责协议转换，Service 承担业务规则；Repository 只做数据访问。'
      }
    ]
  };

  /* ----------------------------------------------------------------
     组装：新模块 / 新课程 / 重新编号
     ---------------------------------------------------------------- */
  var prep = {
    id: 'm0', no: '00', title: '准备篇', desc: '装好 JDK，跑通第一个程序',
    lessons: [setup]
  };

  var projects = {
    id: 'm13', no: '13', title: '项目实战', desc: '把知识拼成能跑的项目',
    lessons: [projectConsole, projectSpring]
  };

  C.unshift(prep);
  C.push(projects);

  var m1 = mod('m1');
  if (m1) m1.lessons.splice(3, 0, scanner);

  var m2 = mod('m2');
  if (m2) {
    m2.lessons.unshift(methods);
    m2.lessons.push(packages);
  }

  var m3 = mod('m3');
  if (m3) m3.lessons.push(arraysTools);

  var m11 = mod('m11');
  if (m11) m11.lessons.unshift(sqlBasics);

  // 重新编号，保证首页和面包屑连续
  C.forEach(function (m, i) {
    m.no = String(i + 1).padStart(2, '0');
  });
})();
