/* =====================================================================
   课程数据：Java 起步 / 面向对象 / 核心类库
   ===================================================================== */
(function () {
  'use strict';

  var C = window.JAVA_COURSE || (window.JAVA_COURSE = []);

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

  /* ================================================================
     模块 1 · Java 起步
     ================================================================ */
  C.push({
    id: 'm1',
    no: '01',
    title: 'Java 起步',
    desc: '环境、语法、变量与流程控制',
    lessons: [

      {
        id: 'jdk',
        title: 'JDK、JRE 与 JVM',
        minutes: 6,
        level: '入门',
        intro: '学 Java 的第一件事，不是敲代码，而是搞清楚你装的到底是什么。JDK、JRE、JVM 三个名字很像，但职责完全不同。',
        points: [
          { t: 'JDK = 开发工具包', d: 'Java Development Kit。包含 <code>javac</code> 编译器、<code>jar</code> 打包工具、<code>jshell</code>，以及完整的 JRE。写代码的人装它。' },
          { t: 'JRE = 运行环境', d: 'Java Runtime Environment = JVM + 核心类库。只运行已经编译好的程序，装 JRE 就够了。' },
          { t: 'JVM = 虚拟机', d: 'Java Virtual Machine 负责加载并执行 <code>.class</code> 字节码。它把同一份字节码翻译成不同操作系统的机器指令，这就是“一次编译，到处运行”。' },
          { t: '完整链路', d: '<code>.java</code> → <code>javac</code> 编译 → <code>.class</code> 字节码 → <code>java</code> 启动 JVM → 解释 / JIT 编译 → 机器码。' }
        ],
        code: `public class Hello {
    public static void main(String[] args) {
        System.out.println("Hello, Java!");
    }
}

// 编译：javac Hello.java
// 运行：java Hello`,
        tip: '记住包含关系：<b>JDK ⊃ JRE ⊃ JVM</b>。JDK 是最大的工具箱，JVM 是最里面的发动机。',
        demo: D([
          { id: 'src', label: 'Hello.java', sub: '源代码', x: 3, y: 12, w: 16, h: 15, tone: 'amber', info: '人类可读的 Java 源码文件，扩展名 .java。' },
          { id: 'javac', label: 'javac', sub: '编译器', x: 24, y: 12, w: 15, h: 15, tone: 'teal', info: 'JDK 提供的编译器，把源码编译成与平台无关的字节码。' },
          { id: 'class', label: 'Hello.class', sub: '字节码', x: 44, y: 12, w: 16, h: 15, tone: 'violet', info: 'JVM 能读懂的中间格式，不是机器码，也不绑定操作系统。' },
          { id: 'jvm', label: 'JVM', sub: '加载 + 执行', x: 65, y: 12, w: 15, h: 15, tone: 'rose', info: '类加载器读取 .class，解释器逐条执行，热点代码由 JIT 编译成本地机器码。' },
          { id: 'os', label: '操作系统 / CPU', sub: '真正执行', x: 84, y: 12, w: 13, h: 15, tone: 'blue', info: 'JVM 最终把指令交给操作系统和 CPU 执行。' },
          { id: 'jdk', label: 'JDK', sub: '开发工具包', x: 6, y: 64, w: 16, h: 14, tone: 'amber', info: 'javac、jar、jshell、jdb……写 Java 程序需要的全部工具。' },
          { id: 'jre', label: 'JRE', sub: '运行环境', x: 30, y: 64, w: 16, h: 14, tone: 'teal', info: 'JVM + Java 核心类库，运行已编译程序的最小集合。' }
        ], [
          { from: 'src', to: 'javac', label: '编译' },
          { from: 'javac', to: 'class', label: '生成' },
          { from: 'class', to: 'jvm', label: '加载' },
          { from: 'jvm', to: 'os', label: '执行' },
          { from: 'jdk', to: 'jre', label: '包含' },
          { from: 'jre', to: 'jvm', label: '包含', dashed: true },
          { from: 'jdk', to: 'javac', label: '提供', dashed: true }
        ], '点击每个方块看它负责什么。重点：源码经过两次“翻译”才变成 CPU 能执行的动作。', '从 .java 到机器码'),
        quiz: [
          {
            q: '同事给你一个已经编译好的 <code>Hello.class</code>，只想在你电脑上运行它。理论上最少需要安装什么？',
            options: ['JDK', 'JRE（含 JVM）', '只需要一个文本编辑器', '源码文件 Hello.java'],
            answer: 1,
            explain: '运行已编译的字节码只需要 JRE：JVM 负责执行，核心类库提供 System、String 等基础类。JDK 是给写代码的人用的。'
          },
          {
            q: '<code>javac</code> 命令的作用是？',
            options: ['启动 JVM 运行程序', '把 .java 源码编译成 .class 字节码', '把字节码翻译成 C 语言', '下载 Java 依赖'],
            answer: 1,
            explain: 'javac 是编译器，输入 .java，输出 .class 字节码；运行程序用的是 java 命令。'
          },
          {
            q: '关于“一次编译，到处运行”，下面哪句最准确？',
            options: ['字节码可以直接在 CPU 上运行', '同一份 .class 可以在任何装有对应 JVM 的平台上运行', '换操作系统必须重新用 javac 编译', 'JVM 只支持 Windows'],
            answer: 1,
            explain: '跨平台的是字节码 + JVM 这一层抽象。不同平台安装各自的 JVM，同一份 .class 不用重新编译。'
          }
        ]
      },

      {
        id: 'vars',
        title: '变量、基本类型与字面量',
        minutes: 7,
        level: '入门',
        intro: 'Java 是强类型语言：每个变量必须先声明类型，再使用。理解了 8 种基本类型和字面量规则，后面写代码就不会被“类型不匹配”卡住。',
        points: [
          { t: '8 种基本类型', d: '<code>byte</code> <code>short</code> <code>int</code> <code>long</code> <code>float</code> <code>double</code> <code>char</code> <code>boolean</code>。日常最常用 int、long、double、boolean、char。' },
          { t: '字面量规则', d: '整数默认是 int，超过约 21 亿要加 <code>L</code>；小数默认是 double，想用 float 要加 <code>F</code>；char 用单引号，String 用双引号。' },
          { t: '作用域与默认值', d: '局部变量从声明处生效到代码块结束，<b>使用前必须手动赋值</b>；成员变量有默认值（0 / false / null）。' },
          { t: '命名规范', d: '变量和方法用小驼峰 <code>studentAge</code>，类名用大驼峰 <code>StudentInfo</code>，常量全大写下划线 <code>MAX_SIZE</code>。' }
        ],
        code: `public class Variables {
    public static void main(String[] args) {
        int age = 18;
        long population = 8_100_000_000L;   // 超出 int 范围，加 L
        double price = 9.9;
        char grade = 'A';
        boolean pass = true;
        String name = "Java";               // 引用类型，不是基本类型

        System.out.println(name + " " + age + " " + grade + " " + pass);
    }
}`,
        tip: '下划线只是给人看的分隔符：<code>8_100_000_000L</code> 和 <code>8100000000L</code> 完全等价。',
        demo: S(`int age = 18;
age = age + 1;
double price = 9.9;
boolean pass = age >= 18;
System.out.println(pass);`, [
          [0, { age: '18' }, '声明 int 变量 age，把字面量 18 存进去。'],
          [1, { age: '19' }, '先算右边 age + 1 = 19，再赋值回 age。'],
          [2, { age: '19', price: '9.9' }, 'double 可以存小数；注意 9.9 默认就是 double。'],
          [3, { age: '19', price: '9.9', pass: 'true' }, '比较运算返回 boolean，19 >= 18 为 true。'],
          [4, { age: '19', price: '9.9', pass: 'true' }, 'println 把 boolean 转成字符串输出。', 'true']
        ], '变量是怎么被赋值的', '注意每一步“先计算右边，再赋值给左边”。'),
        quiz: [
          {
            q: '下面哪个写法能正确表示一个超过 int 范围的整数？',
            options: ['long x = 8100000000;', 'long x = 8100000000L;', 'int x = 8100000000L;', 'double x = 8100000000L;'],
            answer: 1,
            explain: '8100000000 超出 int 范围，字面量必须加 L 变成 long。A 会编译报错“integer number too large”，C 也不能把 long 直接塞进 int。'
          },
          {
            q: '<code>double price = 9.9; int p = price;</code> 会发生什么？',
            options: ['p 自动变成 9', '编译错误，需要强制类型转换', '运行时抛异常', 'p 变成 10（四舍五入）'],
            answer: 1,
            explain: 'double 范围比 int 大，赋值给 int 属于“窄化转换”，必须写 <code>(int) price</code>。强转会直接截断小数，得到 9。'
          },
          {
            q: '关于局部变量，说法正确的是？',
            options: ['不赋值也能直接使用，默认是 0', '使用前必须显式初始化', '只能在 main 方法里声明', '必须是引用类型'],
            answer: 1,
            explain: '局部变量没有默认值，编译器会检查“可能未初始化”。成员变量才有默认值 0 / false / null。'
          }
        ]
      },

      {
        id: 'operators',
        title: '运算符、类型转换与精度',
        minutes: 6,
        level: '入门',
        intro: '加减乘除人人会，但整数除法、自增顺序、短路求值这三件事，是笔试和线上 bug 的高发区。',
        points: [
          { t: '整数除法会截断', d: '<code>5 / 2</code> 得到 2 而不是 2.5；想要小数，至少让一个操作数是浮点数：<code>5 / 2.0</code>。' },
          { t: '++ 的前后之别', d: '<code>++i</code> 先加再参与表达式；<code>i++</code> 先参与表达式再加。单独一行写时两者没区别。' },
          { t: '短路求值', d: '<code>&&</code> 左边为 false 时右边不执行；<code>||</code> 左边为 true 时右边不执行。这常被用来避免空指针和除零。' },
          { t: '类型转换', d: '小 → 大自动提升（int → long → double）；大 → 小必须强转，可能丢精度或溢出：<code>(int) 3.99</code> 是 3，不是 4。' }
        ],
        code: `public class Operators {
    public static void main(String[] args) {
        int a = 7, b = 2;
        System.out.println(a / b);        // 3
        System.out.println(a / 2.0);      // 3.5
        System.out.println(a % b);        // 1

        int c = 0;
        // 短路：c != 0 为 false，右边的 a / c 根本不会执行
        boolean safe = (c != 0) && (a / c > 1);

        int i = 1;
        int x = i++;   // 先用 1，i 变成 2
        int y = ++i;   // i 先变成 3，y 得到 3
    }
}`,
        tip: '整数相除想保留小数，最稳的写法是先把其中一个转成 double：<code>(double) a / b</code>。',
        demo: S(`int a = 7, b = 2;
int div = a / b;
double exact = a / 2.0;
int c = 0;
boolean safe = (c != 0) && (a / c > 1);
System.out.println(div + " " + exact + " " + safe);`, [
          [0, { a: '7', b: '2' }, '一行声明两个 int，a = 7，b = 2。'],
          [1, { a: '7', b: '2', div: '3' }, '整数除法 7 / 2 直接截断小数，得到 3。'],
          [2, { a: '7', b: '2', div: '3', exact: '3.5' }, '2.0 是 double，a 自动提升为 double，结果 3.5。'],
          [3, { a: '7', b: '2', div: '3', exact: '3.5', c: '0' }, 'c = 0，准备演示短路。'],
          [4, { a: '7', b: '2', div: '3', exact: '3.5', c: '0', safe: 'false' }, 'c != 0 为 false，&& 短路，右边的 a / c 不会执行，避免除零异常。'],
          [5, { a: '7', b: '2', div: '3', exact: '3.5', c: '0', safe: 'false' }, '输出三个结果。', '3 3.5 false']
        ], '整数除法与短路求值', '第 4 步如果没有短路，就会触发 ArithmeticException。'),
        quiz: [
          {
            q: '<code>System.out.println(5 / 2);</code> 输出什么？',
            options: ['2.5', '2', '3', '编译错误'],
            answer: 1,
            explain: '两边都是 int，执行整数除法，小数部分被直接截断，结果是 2。'
          },
          {
            q: '执行 <code>int i = 1; int x = i++ + ++i;</code> 后，x 和 i 分别是？',
            options: ['x = 4, i = 3', 'x = 3, i = 3', 'x = 3, i = 2', 'x = 5, i = 3'],
            answer: 0,
            explain: 'i++ 先取 1（i 变 2），++i 先把 i 变 3 再取 3，所以 x = 1 + 3 = 4，i = 3。'
          },
          {
            q: '<code>false && (1 / 0 == 1)</code> 的结果是？',
            options: ['抛 ArithmeticException', 'false', 'true', '编译错误'],
            answer: 1,
            explain: '&& 左边是 false 就直接短路，右边完全不执行，所以不会触发除零异常，整个表达式为 false。'
          }
        ]
      },

      {
        id: 'control',
        title: '流程控制与数组',
        minutes: 8,
        level: '入门',
        intro: 'if 决定走哪条路，循环决定走多少步，数组把一批同类型数据排成队。这三样组合起来，就能写出真正干活的程序。',
        points: [
          { t: '分支', d: '<code>if / else if / else</code> 从上到下匹配，命中即停；<code>switch</code> 支持 int、String、enum，JDK 14+ 可用箭头语法，天然不会 case 穿透。' },
          { t: '循环', d: '<code>for</code> 适合已知次数；<code>while</code> 先判断再执行；<code>do-while</code> 至少执行一次。<code>break</code> 跳出整个循环，<code>continue</code> 跳过本次进入下一轮。' },
          { t: '数组', d: '长度固定、类型一致、下标从 0 开始。<code>nums.length</code> 是属性不是方法；越界会抛 <code>ArrayIndexOutOfBoundsException</code>。' },
          { t: '增强 for', d: '<code>for (int n : nums)</code> 写法简洁，适合只读遍历；它拿到的是元素副本，改 n 不会改数组本身。' }
        ],
        code: `public class Control {
    public static void main(String[] args) {
        int[] scores = {88, 92, 75, 60};
        int sum = 0;
        for (int i = 0; i < scores.length; i++) {
            sum += scores[i];
        }

        double avg = (double) sum / scores.length;
        if (avg >= 85) {
            System.out.println("优秀");
        } else if (avg >= 60) {
            System.out.println("及格");
        } else {
            System.out.println("不及格");
        }
    }
}`,
        tip: '遍历数组时优先用 <code>nums.length</code>，不要手写 4；数组长度是固定的，越界不会自动扩容。',
        demo: S(`int[] nums = {3, 8, 5};
int sum = 0;
for (int i = 0; i < nums.length; i++) {
    sum += nums[i];
}
System.out.println(sum);`, [
          [0, { nums: '[3, 8, 5]' }, '创建长度为 3 的数组，下标是 0、1、2。'],
          [1, { nums: '[3, 8, 5]', sum: '0' }, 'sum 初始化为 0。'],
          [2, { nums: '[3, 8, 5]', sum: '0', i: '0' }, 'i = 0，判断 0 < 3 成立，进入循环体。'],
          [3, { nums: '[3, 8, 5]', sum: '3', i: '0' }, 'sum = 0 + nums[0] = 3。'],
          [2, { nums: '[3, 8, 5]', sum: '3', i: '1' }, 'i 自增到 1，1 < 3 成立。'],
          [3, { nums: '[3, 8, 5]', sum: '11', i: '1' }, 'sum = 3 + nums[1] = 11。'],
          [2, { nums: '[3, 8, 5]', sum: '11', i: '2' }, 'i = 2，仍然小于 3。'],
          [3, { nums: '[3, 8, 5]', sum: '16', i: '2' }, 'sum = 11 + nums[2] = 16。'],
          [2, { nums: '[3, 8, 5]', sum: '16', i: '3' }, 'i = 3，3 < 3 不成立，循环结束。'],
          [5, { nums: '[3, 8, 5]', sum: '16' }, '输出累加结果 16。', '16']
        ], 'for 循环累加数组', '注意循环变量 i 的变化，以及 length 是 3 不是 2。'),
        quiz: [
          {
            q: '数组 <code>int[] nums = {3, 8, 5};</code>，访问 <code>nums[3]</code> 会怎样？',
            options: ['返回 0', '返回最后一个元素', '抛 ArrayIndexOutOfBoundsException', '返回 null'],
            answer: 2,
            explain: '合法下标是 0、1、2。访问 3 越界，运行时抛 ArrayIndexOutOfBoundsException。'
          },
          {
            q: 'switch 的某个 case 末尾忘记写 break，会发生什么？',
            options: ['编译错误', '只执行这个 case', '继续执行后面的 case（穿透）', '直接跳出 switch'],
            answer: 2,
            explain: '传统 switch 没有 break 会继续往下执行，叫 case 穿透。用 JDK 14+ 的箭头语法可以避免。'
          },
          {
            q: '<code>for (int i = 0; i < 3; i++)</code> 的循环体一共执行几次？',
            options: ['2 次', '3 次', '4 次', '不确定'],
            answer: 1,
            explain: 'i 依次为 0、1、2 时条件成立，共 3 次；i 变成 3 时退出。'
          }
        ]
      }
    ]
  });

  /* ================================================================
     模块 2 · 面向对象
     ================================================================ */
  C.push({
    id: 'm2',
    no: '02',
    title: '面向对象',
    desc: '类、对象、继承、多态与接口',
    lessons: [

      {
        id: 'class-object',
        title: '类、对象与构造器',
        minutes: 8,
        level: '入门',
        intro: '类是一张图纸，对象是按图纸造出来的实物。new 的那一刻，内存里发生了什么？搞懂这个，后面的封装、继承、多态才有落脚点。',
        points: [
          { t: '类与对象', d: '类描述“有哪些字段、有哪些方法”；对象是运行时真正存在的实例，用 <code>new</code> 创建，拥有独立的字段副本。' },
          { t: '构造器', d: '名字与类名相同、没有返回值。你不写，编译器送一个无参构造器；一旦写了有参构造器，默认无参构造器就消失了。' },
          { t: '内存分布', d: '局部变量 <code>s</code> 在栈上，存的是一个引用；<code>new Student(...)</code> 的对象在堆上。多个引用可以指向同一个对象。' },
          { t: 'this', d: '代表“当前对象”，常用于区分同名的成员变量和参数：<code>this.name = name;</code>。' }
        ],
        code: `public class Student {
    String name;
    int age;

    Student(String name, int age) {
        this.name = name;
        this.age = age;
    }

    void birthday() {
        age++;
    }

    public static void main(String[] args) {
        Student s = new Student("Tom", 18);
        s.birthday();
        System.out.println(s.age);   // 19
    }
}`,
        tip: '构造器不是普通方法：它没有返回类型，连 void 都不能写。',
        demo: S(`Student s = new Student("Tom", 18);
s.birthday();
System.out.println(s.age);`, [
          [0, { s: '#1' }, 'new 在堆上创建对象 #1，构造器把 name 设为 Tom、age 设为 18；栈上的 s 保存引用 #1。', '', [
            { title: '#1 Student', rows: [['name', '"Tom"'], ['age', '18']] }
          ]],
          [1, { s: '#1' }, '通过引用调用 birthday()，this 指向 #1，age++ 把堆里的 18 改成 19。', '', [
            { title: '#1 Student', rows: [['name', '"Tom"'], ['age', '19']] }
          ]],
          [2, { s: '#1' }, '读取 s.age，沿引用找到堆里的对象，拿到 19 并打印。', '19', [
            { title: '#1 Student', rows: [['name', '"Tom"'], ['age', '19']] }
          ]]
        ], 'new 到底做了什么', '左边是栈上的引用，右边是堆里的对象。'),
        quiz: [
          {
            q: '<code>new Student("Tom", 18)</code> 创建的对象分配在哪里？',
            options: ['栈', '堆', '方法区', '常量池'],
            answer: 1,
            explain: '所有 new 出来的对象都在堆上；栈里保存的只是指向它的引用。'
          },
          {
            q: '类里只写了一个有参构造器 <code>Student(String name)</code>，还能写 <code>new Student()</code> 吗？',
            options: ['可以，编译器会自动补无参构造器', '不可以，默认无参构造器已经失效', '可以，但会返回 null', '只有在 main 方法里可以'],
            answer: 1,
            explain: '只要显式写了任何构造器，编译器就不再赠送无参构造器。需要无参构造就自己再写一个。'
          },
          {
            q: '<code>this.age = age;</code> 中，左边的 <code>this.age</code> 指的是？',
            options: ['方法的局部变量', '当前对象的字段', '父类的字段', '一个静态变量'],
            answer: 1,
            explain: 'this 是当前对象的引用，this.age 明确表示“当前对象的 age 字段”，右边才是同名的参数。'
          }
        ]
      },

      {
        id: 'encapsulation',
        title: '封装、this 与 static',
        minutes: 7,
        level: '入门',
        intro: '把字段藏起来，只暴露必要的方法，并在方法里做校验——这就是封装。它让对象始终处于“合法状态”，是写业务代码最重要的习惯。',
        points: [
          { t: 'private + 方法', d: '字段用 <code>private</code> 修饰，外部不能直接改；通过 public 的 getter / setter 或业务方法访问，在方法里加校验。' },
          { t: 'static 属于类', d: '静态字段被所有对象共享，静态方法不能直接访问 this 和实例字段。工具方法（如 <code>Math.max</code>）通常是 static。' },
          { t: 'this 的两种用法', d: '区分同名变量；在构造器第一行调用本类另一个构造器：<code>this(name, 0)</code>。' },
          { t: '封装的收益', d: '外部代码不依赖内部实现，字段改名、加校验、加日志都不影响调用方；还能防止把余额改成负数这种非法状态。' }
        ],
        code: `public class Account {
    private int balance;

    public void deposit(int amount) {
        if (amount <= 0) {
            System.out.println("金额必须为正数");
            return;
        }
        balance += amount;
    }

    public int getBalance() {
        return balance;
    }
}`,
        tip: '并不是每个字段都要机械地写 getter/setter：只暴露业务真正需要的读写入口。',
        demo: S(`Account acc = new Account();
acc.deposit(100);
acc.deposit(-50);
System.out.println(acc.getBalance());`, [
          [0, { acc: '#1' }, '创建 Account 对象，balance 使用默认值 0。', '', [
            { title: '#1 Account', rows: [['balance', '0']] }
          ]],
          [1, { acc: '#1' }, 'deposit(100)：100 > 0，校验通过，balance 变成 100。', '', [
            { title: '#1 Account', rows: [['balance', '100']] }
          ]],
          [2, { acc: '#1' }, 'deposit(-50)：校验失败，打印提示并 return，balance 保持 100。', '金额必须为正数', [
            { title: '#1 Account', rows: [['balance', '100']] }
          ]],
          [3, { acc: '#1' }, '通过 getter 读取余额，输出 100。', '100', [
            { title: '#1 Account', rows: [['balance', '100']] }
          ]]
        ], '封装如何挡住非法数据', '注意第二次调用被 if 拦住了，余额没有变成 50。'),
        quiz: [
          {
            q: '把字段声明为 <code>private</code> 的主要目的是？',
            options: ['节省内存', '提高运行速度', '隐藏实现细节并控制合法状态', '让字段变成常量'],
            answer: 2,
            explain: 'private 阻止外部随意读写，所有修改都必须经过方法，从而可以在方法里校验、记录日志、保护不变式。'
          },
          {
            q: '关于 static 方法，说法正确的是？',
            options: ['可以直接访问 this', '可以直接访问实例字段', '属于类，通过类名调用，不能直接访问实例成员', '只能声明在接口里'],
            answer: 2,
            explain: 'static 方法不依赖某个具体对象，所以没有 this，也不能直接访问实例字段；它属于类本身。'
          },
          {
            q: '下面哪种写法最符合封装思想？',
            options: ['public int balance; 让外部直接改', 'private int balance; 提供带校验的 deposit 方法', '把所有字段都改成 static', '把 setter 写成 public 且不做任何检查'],
            answer: 1,
            explain: '字段私有 + 业务方法校验，既隐藏了实现，又保证余额不会被改成非法值。'
          }
        ]
      },

      {
        id: 'inheritance',
        title: '继承、super 与方法重写',
        minutes: 8,
        level: '入门',
        intro: '继承让子类复用父类的字段和方法，也可以按需改写。但继承是一把双刃剑：用得好减少重复，用不好会把类层次绑死。',
        points: [
          { t: 'extends', d: 'Java 是单继承：一个类只能有一个直接父类。子类拥有父类非 private 的成员，构造子类对象前一定会先构造父类。' },
          { t: 'super', d: '<code>super(...)</code> 调用父类构造器，必须是子类构造器的第一行；<code>super.method()</code> 调用父类被重写的方法。' },
          { t: '重写 Override', d: '方法名、参数列表、返回类型兼容；访问权限不能变小，不能抛更宽的受检异常。加 <code>@Override</code> 让编译器帮你检查。' },
          { t: '不能被重写', d: '<code>final</code>、<code>static</code>、<code>private</code> 方法不能被重写；<code>final</code> 类不能被继承（如 String）。' }
        ],
        code: `class Animal {
    String name;

    Animal(String name) {
        this.name = name;
    }

    void speak() {
        System.out.println(name + " 发出了声音");
    }
}

class Dog extends Animal {
    Dog(String name) {
        super(name);          // 必须先构造父类
    }

    @Override
    void speak() {
        System.out.println(name + " 汪汪叫");
    }
}`,
        tip: '重写是“子类改行为”，重载是“同类同名不同参数”，两者完全不同，别混。',
        demo: S(`Dog d = new Dog("旺财");
d.speak();
Animal a = d;
a.speak();`, [
          [0, { d: '#1' }, 'new Dog 先调用 super("旺财") 构造 Animal 部分，再完成 Dog 部分。', '', [
            { title: '#1 Dog', rows: [['name', '"旺财"'], ['类型', 'Dog']] }
          ]],
          [1, { d: '#1' }, 'd.speak() 调用的是 Dog 重写后的版本。', '旺财 汪汪叫', [
            { title: '#1 Dog', rows: [['name', '"旺财"'], ['类型', 'Dog']] }
          ]],
          [2, { d: '#1', a: '#1' }, '向上转型：a 的编译类型是 Animal，但运行时仍指向 Dog 对象。', '', [
            { title: '#1 Dog', rows: [['name', '"旺财"'], ['类型', 'Dog']] }
          ]],
          [3, { d: '#1', a: '#1' }, 'a.speak() 依然执行 Dog 的版本——方法看运行时类型，这就是多态。', '旺财 汪汪叫', [
            { title: '#1 Dog', rows: [['name', '"旺财"'], ['类型', 'Dog']] }
          ]]
        ], '继承与重写', '构造顺序：先父后子；方法调用：看实际对象。'),
        quiz: [
          {
            q: '子类构造器的第一行通常必须做什么？',
            options: ['调用 super(...) 或 this(...)', '声明返回值', '给所有字段赋值', '调用 main 方法'],
            answer: 0,
            explain: '创建子类对象前必须先完成父类部分的初始化，所以第一行只能是 super(...) 或本类另一个构造器 this(...)。'
          },
          {
            q: '下面哪个方法不能被子类重写？',
            options: ['public void run()', 'protected void eat()', 'final void sleep()', 'void walk()'],
            answer: 2,
            explain: 'final 方法禁止重写。static 方法是被隐藏而不是重写，private 方法子类根本看不到。'
          },
          {
            q: '重写方法时，把父类的 <code>public</code> 改成 <code>private</code> 会怎样？',
            options: ['正常运行', '编译错误：访问权限不能变小', '变成重载', '运行时才报错'],
            answer: 1,
            explain: '重写要求访问权限不能比父类更严格，public → private 会被编译器直接拒绝。'
          }
        ]
      },

      {
        id: 'polymorphism',
        title: '多态与动态绑定',
        minutes: 8,
        level: '进阶',
        intro: '“父类引用指向子类对象”——这一句话背后，是 Java 最核心的运行机制：方法调用到底执行谁的版本，由运行时对象决定，而不是变量类型。',
        points: [
          { t: '向上转型', d: '<code>Animal a = new Dog();</code> 编译看左边，运行看右边。通过 a 只能调用 Animal 声明过的方法。' },
          { t: '动态绑定', d: '实例方法在运行时根据对象的实际类型选择版本；字段没有多态，访问的是变量声明类型里的字段。' },
          { t: '向下转型', d: '<code>Dog d = (Dog) a;</code> 需要强转。类型不匹配会抛 <code>ClassCastException</code>，先用 <code>instanceof</code> 判断更安全。' },
          { t: '多态的价值', d: '调用方只依赖父类或接口，新增子类不用改调用代码。这就是“对扩展开放，对修改关闭”的基础。' }
        ],
        code: `abstract class Animal {
    abstract void speak();
}

class Dog extends Animal {
    void speak() { System.out.println("Woof"); }
}

class Cat extends Animal {
    void speak() { System.out.println("Meow"); }
}

public class Demo {
    public static void main(String[] args) {
        Animal[] animals = {new Dog(), new Cat()};
        for (Animal a : animals) {
            a.speak();       // 运行时才决定调用谁
        }
    }
}`,
        tip: '记住：成员方法看运行时类型，成员变量看编译时类型。',
        demo: S(`Animal a = new Dog();
Animal b = new Cat();
a.speak();
b.speak();`, [
          [0, { a: '#1 (Dog)' }, '变量 a 的编译类型是 Animal，实际对象是 Dog。', '', [
            { title: '#1 Dog', rows: [['运行时类型', 'Dog'], ['speak()', 'Woof']] }
          ]],
          [1, { a: '#1 (Dog)', b: '#2 (Cat)' }, 'b 同样声明为 Animal，实际是 Cat。', '', [
            { title: '#1 Dog', rows: [['运行时类型', 'Dog']] },
            { title: '#2 Cat', rows: [['运行时类型', 'Cat']] }
          ]],
          [2, { a: '#1 (Dog)', b: '#2 (Cat)' }, 'a.speak() 根据 #1 的真实类型找到 Dog.speak。', 'Woof', [
            { title: '#1 Dog', rows: [['运行时类型', 'Dog']] },
            { title: '#2 Cat', rows: [['运行时类型', 'Cat']] }
          ]],
          [3, { a: '#1 (Dog)', b: '#2 (Cat)' }, 'b.speak() 找到 Cat.speak，输出 Meow。同一行代码，不同结果。', 'Meow', [
            { title: '#1 Dog', rows: [['运行时类型', 'Dog']] },
            { title: '#2 Cat', rows: [['运行时类型', 'Cat']] }
          ]]
        ], '同一行代码，两种结果', '编译器只检查 Animal 有没有 speak()，具体执行谁由对象决定。'),
        quiz: [
          {
            q: '<code>Animal a = new Dog(); a.speak();</code> 执行的是？',
            options: ['Animal.speak()', 'Dog.speak()', '编译错误', '两个都执行'],
            answer: 1,
            explain: '实例方法动态绑定，运行时对象是 Dog，所以执行 Dog 重写后的 speak()。'
          },
          {
            q: '关于向下转型，最安全的做法是？',
            options: ['直接强转，失败再说', '先用 instanceof 判断再强转', '用 toString() 判断', '把父类改成 final'],
            answer: 1,
            explain: 'instanceof 先确认运行时类型是否匹配，再强转，可以避免 ClassCastException。'
          },
          {
            q: '下面哪一项不参与多态？',
            options: ['实例方法', '成员变量', '接口方法实现', '重写的方法'],
            answer: 1,
            explain: '字段在编译期就按变量类型确定，没有动态绑定；多态只发生在可重写的实例方法上。'
          }
        ]
      },

      {
        id: 'abstract-interface',
        title: '抽象类、接口与默认方法',
        minutes: 8,
        level: '进阶',
        intro: '抽象类表达“是什么”，接口表达“能做什么”。Java 8 之后接口有了 default 方法，两者的边界变得更灵活，也更需要判断力。',
        points: [
          { t: '抽象类', d: '用 <code>abstract</code> 声明，可以有字段、构造器、普通方法，也可以有抽象方法。子类要么实现全部抽象方法，要么自己也是抽象类。' },
          { t: '接口', d: '定义一组能力，方法默认 <code>public abstract</code>，字段默认 <code>public static final</code>。一个类可以实现多个接口，弥补单继承的限制。' },
          { t: 'default 方法', d: 'JDK 8 起接口可以有 <code>default</code> 实现，方便给老接口加新方法而不破坏实现类；也可以有 static、private 方法。' },
          { t: '怎么选', d: '需要共享状态或模板代码 → 抽象类；只描述能力、需要多实现 → 接口。常见组合：抽象类实现接口，子类继承抽象类。' }
        ],
        code: `interface Shape {
    double area();

    default String describe() {
        return "面积是 " + area();
    }
}

class Circle implements Shape {
    private final double r;

    Circle(double r) { this.r = r; }

    @Override
    public double area() { return Math.PI * r * r; }
}`,
        tip: '接口中的字段天然是 <code>public static final</code>，不能有实例字段；抽象类可以有实例状态。',
        demo: D([
          { id: 'shape', label: 'interface Shape', sub: 'area() + default describe()', x: 30, y: 8, w: 40, h: 14, tone: 'violet', info: '接口只描述能力。default 方法提供默认实现，实现类可以不重写。' },
          { id: 'circle', label: 'class Circle', sub: 'implements Shape', x: 8, y: 42, w: 24, h: 14, tone: 'teal', info: '实现类必须提供 area() 的具体实现，describe() 可以直接复用接口的默认版本。' },
          { id: 'rect', label: 'class Rect', sub: 'implements Shape', x: 38, y: 42, w: 24, h: 14, tone: 'teal', info: '另一个实现类。调用方只依赖 Shape，新增图形不用改调用代码。' },
          { id: 'caller', label: '客户端代码', sub: 'Shape s = ...; s.describe()', x: 68, y: 42, w: 24, h: 14, tone: 'amber', info: '面向接口编程：只关心 Shape 能做什么，不关心具体是圆还是矩形。' },
          { id: 'abs', label: 'abstract class', sub: '可持有状态', x: 8, y: 74, w: 30, h: 14, tone: 'blue', info: '抽象类适合放共享字段、构造器和模板方法；一个类只能继承一个抽象类。' }
        ], [
          { from: 'circle', to: 'shape', label: '实现' },
          { from: 'rect', to: 'shape', label: '实现' },
          { from: 'caller', to: 'shape', label: '依赖', dashed: true },
          { from: 'abs', to: 'shape', label: '可实现', dashed: true }
        ], '接口定义能力，实现类提供细节。点击节点看区别。', '接口 vs 抽象类'),
        quiz: [
          {
            q: '一个类最多可以继承几个类、实现几个接口？',
            options: ['1 个类、1 个接口', '多个类、多个接口', '1 个类、多个接口', '多个类、1 个接口'],
            answer: 2,
            explain: 'Java 单继承多实现：extends 只能有一个直接父类，implements 后面可以跟多个接口。'
          },
          {
            q: '接口中的 <code>default</code> 方法是为了解决什么问题？',
            options: ['让接口可以实例化', '给已有接口新增方法时不破坏实现类', '替代抽象类', '让字段可以修改'],
            answer: 1,
            explain: 'JDK 8 引入 default 方法，主要是为了在接口演进时保持二进制兼容，老实现类不用被迫改代码。'
          },
          {
            q: '下面哪项是抽象类能做而接口不能做的？',
            options: ['定义抽象方法', '定义常量', '持有实例字段和构造器', '被继承'],
            answer: 2,
            explain: '接口没有实例状态，不能有实例字段和构造器；抽象类可以有字段、构造器和普通方法。'
          }
        ]
      },

      {
        id: 'enum-record',
        title: '枚举、record 与内部类',
        minutes: 7,
        level: '进阶',
        intro: '枚举适合固定集合，record 适合“只装数据”的类，内部类适合只在某个类里用的小帮手。这三个语法能让代码更短、更安全。',
        points: [
          { t: 'enum', d: '枚举本质是继承 <code>java.lang.Enum</code> 的类，天然单例、线程安全，可直接用于 switch。可以带字段、构造器和方法。' },
          { t: 'record', d: 'JDK 16 正式转正。一行声明不可变数据载体，自动生成构造器、getter（<code>x()</code>）、equals、hashCode、toString。' },
          { t: '内部类', d: '成员内部类、静态嵌套类、局部类、匿名内部类。匿名内部类常用于一次性的接口实现，JDK 8 后多数场景可被 lambda 替代。' },
          { t: '选择建议', d: '固定常量集合用枚举；DTO / 返回值用 record；只服务一个类的小结构用静态嵌套类；需要访问外部实例状态才用成员内部类。' }
        ],
        code: `enum Level {
    LOW(1), MEDIUM(5), HIGH(10);

    private final int weight;

    Level(int weight) { this.weight = weight; }

    public int weight() { return weight; }
}

record Point(int x, int y) {
    public Point {
        if (x < 0 || y < 0) throw new IllegalArgumentException("坐标不能为负");
    }
}`,
        tip: 'record 的字段是 <code>private final</code>，没有 setter；它适合当值对象，不适合做需要变化的实体。',
        demo: S(`Level lv = Level.HIGH;
Point p = new Point(3, 4);
System.out.println(lv + " " + lv.weight());
System.out.println(p.x() + "," + p.y());
System.out.println(p);`, [
          [0, { lv: 'HIGH' }, '枚举常量在类加载时就创建好，全局只有 HIGH 这一个实例。'],
          [1, { lv: 'HIGH', p: 'Point[x=3, y=4]' }, 'new Point(3,4) 调用规范构造器，先校验再赋值。'],
          [2, { lv: 'HIGH', p: 'Point[x=3, y=4]' }, 'lv 打印名字，weight() 返回构造时传入的 10。', 'HIGH 10'],
          [3, { lv: 'HIGH', p: 'Point[x=3, y=4]' }, 'record 自动生成的访问器是 x()、y()，不是 getX()。', '3,4'],
          [4, { lv: 'HIGH', p: 'Point[x=3, y=4]' }, 'toString 也自动生成，输出 Point[x=3, y=4]。', 'Point[x=3, y=4]']
        ], '枚举与 record 的用法', '注意 record 的访问器没有 get 前缀。'),
        quiz: [
          {
            q: '关于 Java 的 enum，说法正确的是？',
            options: ['枚举常量是可变的对象', '枚举可以继承其他类', '枚举天然是单例，可安全用于 switch', '枚举不能有字段和方法'],
            answer: 2,
            explain: '每个枚举常量在类加载时创建一次，全局唯一；枚举已经隐式继承 Enum，不能再继承别的类，但可以有字段和方法。'
          },
          {
            q: 'record Point(int x, int y) 会自动生成哪些成员？',
            options: ['无参构造器和 setter', '全参构造器、x()/y()、equals、hashCode、toString', '只有 getX()/getY()', '一个抽象方法'],
            answer: 1,
            explain: 'record 自动生成规范构造器、同名访问器、equals/hashCode/toString，字段不可变，没有 setter。'
          },
          {
            q: '什么时候更适合用静态嵌套类而不是成员内部类？',
            options: ['需要访问外部类的实例字段时', '不需要访问外部实例、只想逻辑上归类时', '需要被继承时', '需要实现接口时'],
            answer: 1,
            explain: '静态嵌套类不持有外部实例引用，更省内存也不容易造成内存泄漏；只有确实需要访问外部实例状态时才用成员内部类。'
          }
        ]
      }
    ]
  });

  /* ================================================================
     模块 3 · 核心类库
     ================================================================ */
  C.push({
    id: 'm3',
    no: '03',
    title: '核心类库',
    desc: '字符串、包装类、日期与正则',
    lessons: [

      {
        id: 'string',
        title: 'String 与字符串常量池',
        minutes: 7,
        level: '入门',
        intro: 'String 是最常用的类，也是最容易在面试里被追问的类：为什么不可变？== 和 equals 有什么区别？常量池到底缓存了什么？',
        points: [
          { t: '不可变', d: 'String 内部是 <code>final</code> 字符数组（JDK 9+ 是 byte[]），任何“修改”都会产生新对象。好处是线程安全、可缓存 hash、可共享。' },
          { t: '常量池', d: '字面量 <code>"Java"</code> 会进入字符串常量池；相同字面量复用同一个对象。<code>new String("Java")</code> 则一定在堆上创建新对象。' },
          { t: '== vs equals', d: '<code>==</code> 比较引用地址；<code>equals</code> 被 String 重写成逐字符比较内容。判断内容相等永远用 equals。' },
          { t: 'intern()', d: '把堆上的字符串加入常量池并返回池中引用。适合大量重复字符串的场景，但不要滥用。' }
        ],
        code: `String a = "Java";              // 常量池
String b = "Java";              // 复用同一个对象
String c = new String("Java");  // 堆上新对象

System.out.println(a == b);        // true
System.out.println(a == c);        // false
System.out.println(a.equals(c));   // true
System.out.println(a == c.intern()); // true`,
        tip: '判断字符串内容是否相等，永远写 <code>"abc".equals(s)</code>，把常量放前面还能避免空指针。',
        demo: S(`String a = "Java";
String b = "Java";
String c = new String("Java");
System.out.println(a == b);
System.out.println(a == c);
System.out.println(a.equals(c));`, [
          [0, { a: '#pool "Java"' }, '字面量 "Java" 先去常量池找，没有就创建；a 指向池中对象。'],
          [1, { a: '#pool "Java"', b: '#pool "Java"' }, 'b 复用同一个字面量，a 和 b 指向同一地址。'],
          [2, { a: '#pool "Java"', b: '#pool "Java"', c: '#heap "Java"' }, 'new String 强制在堆上新建对象，内容相同但地址不同。'],
          [3, { a: '#pool', b: '#pool', c: '#heap' }, 'a == b 比较地址，相同，输出 true。', 'true'],
          [4, { a: '#pool', b: '#pool', c: '#heap' }, 'a == c 地址不同，输出 false。', 'false'],
          [5, { a: '#pool', b: '#pool', c: '#heap' }, 'equals 逐字符比较内容，输出 true。', 'true']
        ], '常量池与堆的区别', '== 比地址，equals 比内容。'),
        quiz: [
          {
            q: '<code>String a = "hi"; String b = new String("hi");</code>，<code>a == b</code> 的结果是？',
            options: ['true', 'false', '编译错误', '运行时异常'],
            answer: 1,
            explain: 'a 指向常量池，b 指向堆上的新对象，地址不同，== 为 false；a.equals(b) 才是 true。'
          },
          {
            q: 'String 被设计成不可变，下面哪项不是它的好处？',
            options: ['可以安全地共享和缓存', 'hashCode 可以缓存', '拼接字符串时不会产生新对象', '多线程访问天然安全'],
            answer: 2,
            explain: '不可变恰恰意味着每次拼接都会产生新对象；大量拼接应该用 StringBuilder。'
          },
          {
            q: '判断两个字符串内容是否相等，应该用？',
            options: ['==', 'equals', 'hashCode 相等即可', 'toString 相等即可'],
            answer: 1,
            explain: '== 比较引用；equals 才是内容比较。hashCode 相同只能说明散列位置相同，不能保证内容相同。'
          }
        ]
      },

      {
        id: 'builder-boxing',
        title: 'StringBuilder 与包装类',
        minutes: 7,
        level: '入门',
        intro: '循环里用 + 拼字符串，为什么会被代码审查打回？Integer 的 128 为什么和 127 表现不一样？这一课把这两个坑一次讲透。',
        points: [
          { t: 'StringBuilder', d: '可变字符序列，<code>append</code> 在原对象上追加，避免循环中反复创建 String。线程安全场景用 <code>StringBuffer</code>。' },
          { t: '包装类', d: '每个基本类型都有包装类（int → Integer）。集合只能存对象，所以需要装箱；泛型也依赖包装类。' },
          { t: '自动装箱/拆箱', d: 'JDK 5 起 <code>Integer i = 1;</code> 自动装箱。包装类为 null 时拆箱会抛 <code>NullPointerException</code>。' },
          { t: 'Integer 缓存', d: 'Integer 默认缓存 -128~127。这个范围内 <code>==</code> 可能为 true，范围外比较地址为 false，所以包装类比较一律用 equals。' }
        ],
        code: `StringBuilder sb = new StringBuilder();
for (int i = 0; i < 1000; i++) {
    sb.append(i).append(',');
}
String result = sb.toString();

Integer a = 127, b = 127;
Integer c = 128, d = 128;
System.out.println(a == b);   // true（缓存）
System.out.println(c == d);   // false（新对象）`,
        tip: '循环内拼接用 StringBuilder；包装类比较用 equals；能不用包装类就不用，避免拆箱 NPE。',
        demo: S(`StringBuilder sb = new StringBuilder();
sb.append("Java").append(" ").append(21);
String s = sb.toString();
System.out.println(s);`, [
          [0, { sb: '""' }, '创建 StringBuilder，内部维护一个可扩容的字符数组。'],
          [1, { sb: '"Java 21"' }, 'append 链式调用，在原对象上追加，没有创建新的 StringBuilder。'],
          [2, { sb: '"Java 21"', s: '"Java 21"' }, 'toString 生成一个新的 String 返回。'],
          [3, { sb: '"Java 21"', s: '"Java 21"' }, '输出结果。', 'Java 21']
        ], 'StringBuilder 的可变缓冲', '对比一下：如果用 + 拼接，每一步都会产生新的 String 对象。'),
        quiz: [
          {
            q: '在循环里拼接大量字符串，应该优先使用？',
            options: ['String 的 + 号', 'StringBuilder', 'StringBuffer 一定更好', 'char 数组手动扩容'],
            answer: 1,
            explain: 'String 不可变，+ 会不断创建新对象；StringBuilder 在同一个缓冲区追加，效率高。只有多线程共享同一个缓冲区时才考虑 StringBuffer。'
          },
          {
            q: '<code>Integer a = 127, b = 127; a == b</code> 的结果是？',
            options: ['true', 'false', '编译错误', '随机'],
            answer: 0,
            explain: 'Integer 缓存 -128~127，a 和 b 指向缓存里的同一个对象，所以 == 为 true。'
          },
          {
            q: '<code>Integer n = null; int x = n;</code> 会怎样？',
            options: ['x 变成 0', '编译错误', '运行时 NullPointerException', 'x 变成 null'],
            answer: 2,
            explain: '把 Integer 赋给 int 会触发自动拆箱，本质是调用 n.intValue()，n 为 null 时抛 NPE。'
          }
        ]
      },

      {
        id: 'datetime',
        title: '日期时间 API',
        minutes: 6,
        level: '入门',
        intro: '老的 Date / Calendar 可变、线程不安全、月份从 0 开始，坑很多。JDK 8 的 java.time 用不可变对象重新设计了这一切，新项目请直接用它。',
        points: [
          { t: '常用类型', d: '<code>LocalDate</code> 只有日期，<code>LocalTime</code> 只有时间，<code>LocalDateTime</code> 两者都有，<code>Instant</code> 是时间戳，<code>ZonedDateTime</code> 带时区。' },
          { t: '不可变', d: '所有修改操作都返回新对象：<code>d.plusDays(1)</code> 不会改变 d。这天然线程安全，也不会出现“共享日期被悄悄改掉”。' },
          { t: '格式化', d: '<code>DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")</code>，线程安全，可复用。' },
          { t: '时间差', d: '<code>Duration</code> 算时分秒，<code>Period</code> 算年月日；用 <code>ChronoUnit.DAYS.between(a, b)</code> 也很方便。' }
        ],
        code: `LocalDate today = LocalDate.of(2024, 1, 31);
LocalDate nextMonth = today.plusMonths(1);   // 2024-02-29（闰年）

DateTimeFormatter fmt = DateTimeFormatter.ofPattern("yyyy年MM月dd日");
System.out.println(today.format(fmt));

long days = ChronoUnit.DAYS.between(today, nextMonth);
System.out.println(days);`,
        tip: 'plusMonths 会自动处理月末：1 月 31 日加一个月是 2 月 29 日（闰年），不会溢出到 3 月。',
        demo: S(`LocalDate d = LocalDate.of(2024, 1, 31);
LocalDate next = d.plusMonths(1);
System.out.println(d);
System.out.println(next);`, [
          [0, { d: '2024-01-31' }, 'of() 创建不可变的日期对象。'],
          [1, { d: '2024-01-31', next: '2024-02-29' }, 'plusMonths 返回新对象；2024 是闰年，2 月自动取 29 日。'],
          [2, { d: '2024-01-31', next: '2024-02-29' }, '原对象 d 没有被修改，仍然输出 1 月 31 日。', '2024-01-31'],
          [3, { d: '2024-01-31', next: '2024-02-29' }, 'next 是独立的新对象。', '2024-02-29']
        ], '不可变的日期对象', '每次 plus 都产生新对象，原对象永远不变。'),
        quiz: [
          {
            q: '为什么新项目推荐用 LocalDate 而不是 java.util.Date？',
            options: ['LocalDate 性能更高', 'LocalDate 可变', 'LocalDate 不可变且线程安全，API 更清晰', 'Date 已经不能用了'],
            answer: 2,
            explain: 'java.time 类型全部不可变、线程安全，月份从 1 开始，API 语义清晰；Date 可变且月份从 0 开始，容易出错。'
          },
          {
            q: '<code>LocalDate.of(2024, 1, 31).plusMonths(1)</code> 的结果是？',
            options: ['2024-03-02', '2024-02-29', '2024-02-28', '抛异常'],
            answer: 1,
            explain: '2024 是闰年，2 月有 29 天；plusMonths 会把日期调整到目标月份的最后一天，不会溢出。'
          },
          {
            q: 'DateTimeFormatter 相比 SimpleDateFormat 的优势是？',
            options: ['线程安全，可复用', '支持更多语言', '不需要模式字符串', '只能格式化 LocalDate'],
            answer: 0,
            explain: 'SimpleDateFormat 不是线程安全的，多线程共享会出问题；DateTimeFormatter 不可变且线程安全。'
          }
        ]
      },

      {
        id: 'regex',
        title: '正则、Math 与常用工具',
        minutes: 6,
        level: '入门',
        intro: '正则不是“高级技巧”，而是处理文本的日常工具：校验手机号、提取订单号、批量替换。掌握几个常用元字符就够应付大多数场景。',
        points: [
          { t: '常用元字符', d: '<code>\\d</code> 数字，<code>\\w</code> 字母数字下划线，<code>\\s</code> 空白，<code>.</code> 任意字符，<code>+ * ? {n,m}</code> 控制次数，<code>^ $</code> 首尾。' },
          { t: 'String 内置方法', d: '<code>matches</code> 要求整个字符串匹配；<code>replaceAll</code>、<code>split</code> 也接受正则。复杂提取用 <code>Pattern</code> + <code>Matcher</code>。' },
          { t: '转义', d: 'Java 字符串里反斜杠要写两次：正则 <code>\\d</code> 在 Java 中写成 <code>"\\\\d"</code>。' },
          { t: 'Math / Random', d: '<code>Math.max/min/abs/round/pow/sqrt</code> 都是静态方法；<code>ThreadLocalRandom.current().nextInt(a, b)</code> 更适合多线程。' }
        ],
        code: `String text = "order-2024-001";
boolean ok = text.matches("order-\\\\d{4}-\\\\d{3}");

String id = text.replaceAll("order-", "");
String[] parts = text.split("-");

int max = Math.max(3, 7);          // 7
double root = Math.sqrt(16);       // 4.0
int rnd = ThreadLocalRandom.current().nextInt(1, 10);`,
        tip: '正则先写小测试再上生产：<code>matches</code> 是全串匹配，<code>find</code> 才是找子串。',
        demo: S(`String text = "order-2024-001";
boolean ok = text.matches("order-\\\\d{4}-\\\\d{3}");
String id = text.replaceAll("order-", "");
System.out.println(ok);
System.out.println(id);`, [
          [0, { text: '"order-2024-001"' }, '待处理的订单字符串。'],
          [1, { text: '"order-2024-001"', ok: 'true' }, 'matches 要求整个字符串符合模式：4 位数字 + 3 位数字，返回 true。'],
          [2, { text: '"order-2024-001"', ok: 'true', id: '"2024-001"' }, 'replaceAll 把所有匹配 "order-" 的部分替换为空。'],
          [3, { text: '"order-2024-001"', ok: 'true', id: '"2024-001"' }, '输出校验结果。', 'true'],
          [4, { text: '"order-2024-001"', ok: 'true', id: '"2024-001"' }, '输出提取出的订单号。', '2024-001']
        ], '正则校验与替换', '注意 Java 字符串里 \\\\d 的双重转义。'),
        quiz: [
          {
            q: '在 Java 字符串中写正则“一个数字”，正确写法是？',
            options: ['"\\\\d"', '"\\d"', '"/d/"', '"d"'],
            answer: 0,
            explain: 'Java 字符串里反斜杠本身要转义，正则的 \\d 必须写成 "\\\\d"。'
          },
          {
            q: '<code>"abc123".matches("\\\\d+")</code> 的结果是？',
            options: ['true', 'false', '编译错误', '抛异常'],
            answer: 1,
            explain: 'matches 要求整个字符串都匹配 \\d+；"abc123" 前面有字母，所以是 false。想找子串要用 find()。'
          },
          {
            q: '下面哪个方法最适合从一段文本中提取所有订单号？',
            options: ['String.matches', 'Pattern + Matcher.find()', 'String.split', 'Math.random'],
            answer: 1,
            explain: 'matches 只判断整体，split 按分隔符切分；要多次提取子串，用 Pattern 编译后配合 Matcher.find() 循环。'
          }
        ]
      }
    ]
  });
})();
