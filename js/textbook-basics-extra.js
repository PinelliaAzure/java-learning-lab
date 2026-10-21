/* 基础篇补充：环境细节、字节码、进制编码、位运算、输入缓冲、算法示例 */
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
    { h: '1.13 认识 JDK 目录结构' },
    { p: '装完 JDK 后，打开安装目录会看到 bin、conf、include、jmods、lib 等文件夹。知道它们各自放什么，排查问题时能快速定位，而不是只会重装。' },
    { list: [
      '<code>bin</code>：java、javac、jar、javadoc、jshell 等可执行命令，PATH 要指向这里。',
      '<code>conf</code>：JVM 和运行时配置，如 security、net.properties。',
      '<code>include</code>：JNI 头文件，写 native 扩展时才用。',
      '<code>jmods</code>：JDK 模块文件，jlink 裁剪运行时用。',
      '<code>lib</code>：核心类库和工具依赖，不要手动改。'
    ] },
    { h: '1.14 IDE 调试入门' },
      { p: '调试是比 print 更高效的排错方式。在行号左侧点一下设置断点，用 Debug 模式启动，程序会在断点处暂停；此时可以查看变量、调用栈，逐行执行。' },
      { p: '常用操作：Step Over 执行当前行不进入方法；Step Into 进入方法内部；Step Out 执行完当前方法返回；Resume 继续到下一个断点。配合 Watch 观察表达式，能快速定位空指针和逻辑错误。' },
      { h: '1.15 环境相关的常见问答' },
      { list: [
        '装了多个 JDK 怎么切换？IDE 里可以为每个项目单独选择 SDK；命令行通过 JAVA_HOME 和 PATH 控制。',
        '为什么服务器只要 JRE？服务器只运行编译好的程序，不需要 javac；但现代部署多用 JDK 镜像，方便排查。',
        'JDK 需要设置 CLASSPATH 吗？普通项目不需要，Maven/Gradle 会管理；手动设置错误反而添乱。',
        '安装路径能带空格吗？可以，但命令行引用要加引号，建议避免中文和空格。',
        '卸载旧 JDK 会影响项目吗？可能，项目可能依赖旧版本编译；先确认项目 JDK 配置。'
      ] }
  ]);

  beforeSummary('setup', [
    { h: '1.16 每天的学习节奏' },
    { p: '环境搭好后，建议每天固定 30~45 分钟：先用 10 分钟读教材和示例，再合上页面自己敲一遍，最后做本章习题。遇到报错先复制完整信息，定位关键词，再搜索；不要一看到红色就重装环境。' },
    { p: '练习目录按章节分文件夹，代码保留注释和运行结果。每周回头把一个旧例子重写一遍，比只看不动手有效得多。环境只搭一次，后面真正决定进度的是持续写代码。' }
  ]);

  beforeSummary('jdk', [
    { h: '2.11 字节码指令长什么样' },
    { p: '字节码是 JVM 的指令集，类似汇编但更抽象。每条指令一个字节的操作码，后面跟操作数。方法体里的局部变量、常量、方法调用都对应具体指令。' },
    { code: 'public static int add(int a, int b) { return a + b; }\n\n// javap -c 输出（简化）：\n// iload_0     把第 0 个 int 局部变量压栈\n// iload_1     把第 1 个 int 局部变量压栈\n// iadd        弹出两个 int 相加，结果压栈\n// ireturn     返回栈顶 int', title: 'Bytecode.java' },
    { table: { head: ['指令', '作用'], rows: [
      ['aload/iload', '把引用/整数局部变量压入操作数栈'],
      ['getstatic/putstatic', '读写静态字段'],
      ['invokevirtual', '调用实例方法（动态绑定）'],
      ['invokespecial', '调用构造器、私有方法、super'],
      ['new', '创建对象（未初始化）'],
      ['checkcast', '类型检查并转换'],
      ['ireturn/areturn', '返回 int/引用']
    ] } },
    { h: '2.12 类加载的五个阶段' },
    { p: 'JVM 不会一次性把所有类装进内存，而是用到时才加载。加载、验证、准备、解析、初始化，每一步都有明确职责；理解顺序，才能解释静态变量为什么先 0 后赋值。' },
    { list: [
      '<b>加载</b>：按全限定名找到 class 文件，读入内存，生成 Class 对象。',
      '<b>验证</b>：检查字节码格式、语义、安全，防止破坏 JVM。',
      '<b>准备</b>：为静态变量分配内存并赋零值。',
      '<b>解析</b>：把常量池的符号引用替换成直接引用。',
      '<b>初始化</b>：执行 static 块和静态赋值，才是代码里的初始值。'
    ] },
    { h: '2.13 编译期与运行期的分工' },
    { p: '编译期负责语法、类型、访问权限、受检异常等检查，把源码变成字节码；运行期负责类加载、内存分配、方法调用、GC 和 JIT。很多错误只能在运行期发现，比如空指针、越界、类型转换失败。' },
    { table: { head: ['阶段', '能发现的问题', '典型报错'], rows: [
      ['编译期', '语法、类型不匹配、缺少返回值、访问权限', '编译错误，无法生成 class'],
      ['运行期', '空指针、数组越界、类型转换、类找不到', '异常堆栈']
    ] } },
    { h: '2.14 解释、JIT 与 AOT' },
    { p: '解释器逐条执行，启动快、峰值慢；JIT 把热点方法编译成本地机器码，峰值快但需要预热；AOT（提前编译）在构建时就生成机器码，启动快但优化空间小。主流 JVM 采用解释 + JIT 混合，兼顾两者。' },
    { p: '这解释了两个现象：微基准测试要预热，否则测的是解释执行；长时间运行的服务，JIT 优化后性能可能比刚启动高很多。' },
    { h: '2.15 常见问答' },
    { list: [
      '为什么 class 文件能跨平台？因为它面向 JVM 指令集，不面向具体 CPU。',
      'JVM 是用什么写的？HotSpot 主要由 C++ 实现，本身也是运行在操作系统上的程序。',
      'java 命令和 javaw 有什么区别？javaw 在 Windows 上不弹控制台窗口，适合 GUI 程序。',
      '同一个类会被加载多次吗？同一个类加载器下只会加载一次，不同加载器可能各有一份。',
      'JDK 21 编译的 class 能在 JDK 17 跑吗？不能，class 版本更高，运行时会拒绝。'
    ] }
  ]);

  beforeSummary('jdk', [
    { h: '2.16 包、classpath 与运行命令' },
    { p: '真实项目不会把类放在默认目录，而是放在包里。包名对应目录，编译时用 -d 指定输出根目录，运行时要写全限定类名。classpath 告诉 JVM 去哪里找这些 class 和依赖。' },
    { code: `src/com/example/Hello.java

javac -d out src/com/example/Hello.java
java -cp out com.example.Hello
# -d 生成 out/com/example/Hello.class
# -cp 指定 classpath，运行 com.example.Hello`, title: '包与命令' },
    { p: '如果运行时提示“找不到或无法加载主类”，依次检查：classpath 是否包含 out 目录、包名是否与目录一致、类名是否写全、class 文件是否真的生成。用 <code>java -verbose:class</code> 可以看到类加载过程，快速定位加载了哪个 jar。' },
    { p: '依赖第三方 jar 时，classpath 用冒号（macOS/Linux）或分号（Windows）分隔多个路径。Maven/Gradle 会在打包时把依赖放进 fat jar 或 lib 目录，避免手写长 classpath。' }
  ]);

  beforeSummary('jdk', [
    { h: '2.17 main 方法为什么长这样' },
    { p: '<code>public static void main(String[] args)</code> 的每个部分都有原因：public 让 JVM 能访问；static 让 JVM 不用创建对象就能调用；void 表示不返回值；String[] args 接收命令行参数。JVM 启动时按这个固定签名查找入口，签名写错就提示“找不到 main 方法”。' },
    { p: '命令行执行 <code>java Hello a b</code> 时，args 是 ["a", "b"]；没有参数时是长度为 0 的数组，不是 null。理解这一点，就能写带参数的小工具，而不是每次都改代码。' }
  ]);

  beforeSummary('vars', [
    { h: '3.12 进制与位模式' },
    { p: '计算机只认识二进制。Java 源码里可以用 0b 写二进制、0 开头写八进制、0x 写十六进制。理解进制换算，才能看懂位运算、颜色值、权限标志和哈希。' },
    { code: 'int bin = 0b1010;     // 10\nint oct = 012;        // 10\nint hex = 0x0A;       // 10\nSystem.out.println(Integer.toBinaryString(10)); // 1010\nSystem.out.println(Integer.toHexString(255));   // ff', title: 'Radix.java' },
    { h: '3.13 字符与编码' },
    { p: 'char 是 16 位无符号整数，存的是 Unicode 码元。可以直接把 char 赋给 int 看到码点，也可以把整数强转成 char。中文字符在 UTF-8 里通常占 3 个字节，但在 char 里仍是一个码元。' },
    { code: 'char c = \'A\';\nint code = c;          // 65\nchar next = (char) (c + 1); // B\nSystem.out.println((int) \'中\'); // 20013', title: 'CharCode.java' },
    { h: '3.14 成员变量的默认值' },
    { table: { head: ['类型', '默认值'], rows: [
      ['byte/short/int/long', '0'],
      ['float/double', '0.0'],
      ['char', '\u0000（空字符）'],
      ['boolean', 'false'],
      ['引用类型', 'null']
    ] } },
    { p: '默认值只对成员变量和静态变量生效，局部变量没有默认值。数组创建后元素也有默认值，例如 new int[5] 全是 0，new String[5] 全是 null。' },
    { h: '3.15 常见问答' },
    { list: [
      '为什么 int 是 4 字节？Java 规范固定了基本类型宽度，保证跨平台行为一致。',
      'long 一定比 int 慢吗？64 位 JVM 上差别很小，按范围选类型即可。',
      'char 能存中文吗？能，Java 用 UTF-16 表示字符，常见中文是一个 char。',
      'String 是基本类型吗？不是，它是引用类型，底层是 final 字符数组（JDK 9+ 是 byte[]）。',
      '变量不初始化会怎样？成员变量有默认值，局部变量编译报错。'
    ] }
  ]);

  beforeSummary('operators', [
    { h: '4.12 短路真值表' },
    { table: { head: ['表达式', '结果', '右边是否执行'], rows: [
      ['false && x', 'false', '不执行'],
      ['true && x', 'x', '执行'],
      ['true || x', 'true', '不执行'],
      ['false || x', 'x', '执行']
    ] } },
    { p: '利用短路可以把“安全检查”和“真正操作”写在同一个条件里，例如 <code>list != null && list.size() > 0</code>。但不要把有副作用的操作放在右边，短路会让它有时执行、有时不执行。' },
    { h: '4.13 位运算实战：权限标志' },
    { p: '用二进制的每一位表示一种权限，用一个 int 同时存多个权限。判断权限用按位与，添加权限用按位或，移除权限用按位与非。这是很多框架和操作系统的做法。' },
    { code: 'int READ = 1;      // 001\nint WRITE = 2;     // 010\nint EXEC = 4;      // 100\n\nint perm = READ | WRITE;        // 011 = 3\nboolean canRead = (perm & READ) != 0;   // true\nboolean canExec = (perm & EXEC) != 0;   // false\nperm |= EXEC;                   // 111 = 7\nperm &= ~WRITE;                 // 101 = 5', title: 'Permission.java' },
    { h: '4.14 浮点数精度' },
    { p: 'float 和 double 用二进制科学计数法表示小数，很多十进制小数无法精确表示，所以会出现 0.1 + 0.2 = 0.30000000000000004。这不是 Java 的 bug，而是所有二进制浮点的共性。' },
    { code: 'System.out.println(0.1 + 0.2);          // 0.30000000000000004\nSystem.out.println(0.1 + 0.2 == 0.3);  // false\nSystem.out.println(Math.abs(0.1 + 0.2 - 0.3) < 1e-9); // true\n\nBigDecimal a = new BigDecimal("0.1");\nBigDecimal b = new BigDecimal("0.2");\nSystem.out.println(a.add(b));           // 0.3', title: 'Float.java' },
    { p: '比较浮点数不要用 ==，而是判断差值小于一个误差范围；金额、利率用 BigDecimal。科学计算可以接受误差，但也要用相对误差而不是精确相等。' },
    { h: '4.15 优先级速查' },
    { table: { head: ['优先级（高→低）', '运算符'], rows: [
      ['1', '() [] .'],
      ['2', '++ -- ! ~'],
      ['3', '* / %'],
      ['4', '+ -'],
      ['5', '<< >> >>>'],
      ['6', '< <= > >='],
      ['7', '== !='],
      ['8', '&'],
      ['9', '^'],
      ['10', '|'],
      ['11', '&&'],
      ['12', '||'],
      ['13', '? :'],
      ['14', '= += -= *= /= %=']
    ] } },
    { h: '4.16 常见问答' },
    { list: [
      'i++ 和 ++i 在 for 循环里有区别吗？作为独立更新语句没有区别。',
      '位运算比乘除快吗？现代 JIT 会优化，可读性优先，除非在热点代码里。',
      '== 能比较 String 吗？能编译，但比较的是地址，内容比较用 equals。',
      '三元运算符的结果类型是什么？两个分支会统一提升到共同类型。',
      '为什么 -7 % 2 是 -1？Java 的余数符号跟被除数一致，与数学取模不同。'
    ] }
  ]);

  beforeSummary('scanner', [
    { h: '5.11 输入缓冲区怎么工作' },
    { p: '键盘输入先进入操作系统的输入缓冲区，Scanner 再从缓冲区按规则读取。nextInt 只消费数字字符，遇到非数字就停；nextLine 一直读到换行并消费换行。理解“谁消费了什么”，就能解释各种读取错位。' },
    { p: '例如输入“18 男”并回车，nextInt 读走 18，缓冲区剩下“ 男\\n”；nextLine 会读到“ 男”，而不是空串；如果输入只有“18\\n”，nextLine 就读到空串。' },
    { h: '5.12 next 与 nextLine 的混用场景' },
    { code: 'System.out.print("姓名：");\nString name = sc.nextLine();      // 读整行\nSystem.out.print("年龄：");\nint age = Integer.parseInt(sc.nextLine()); // 统一用 nextLine 再转换\n\nSystem.out.print("城市：");\nString city = sc.next();          // 只读到空格\nsc.nextLine();                    // 清掉行尾', title: 'Mixed.java' },
    { p: '统一用 nextLine 读字符串，再手动转换数字，可以避免大部分换行残留问题；代价是要处理 NumberFormatException。两种方式都行，关键是团队内保持一致。' },
    { h: '5.13 从文件读输入' },
    { code: 'try (Scanner sc = new Scanner(Paths.get("input.txt"), StandardCharsets.UTF_8)) {\n    while (sc.hasNextLine()) {\n        System.out.println(sc.nextLine());\n    }\n}', title: 'FileInput.java' },
    { p: 'Scanner 也可以读文件，但大文件更推荐 BufferedReader 或 Files.lines，性能和内存更可控。Scanner 的优势是按类型解析方便，适合小规模和教学场景。' },
    { h: '5.14 常见问答' },
    { list: [
      'Scanner 需要 import 吗？需要，java.util.Scanner。',
      '多个 Scanner 能读同一个 System.in 吗？不建议，缓冲区会互相抢。',
      'nextLine 会读空格吗？会，整行包括空格；next 遇空格就停。',
      '输入中文会乱码吗？控制台编码与源文件编码不一致时可能乱码，统一 UTF-8。',
      'Scanner 关闭后还能再 new 一个吗？可以，但关闭 System.in 后可能影响其他读取。'
    ] }
  ]);

  beforeSummary('control', [
    { h: '6.12 嵌套循环与图形打印' },
    { p: '嵌套循环常用于二维表格、图形和组合枚举。外层控制行，内层控制列；打印时注意每行结束要换行。下面打印一个 5 行直角三角形。' },
    { code: 'for (int i = 1; i <= 5; i++) {\n    for (int j = 1; j <= i; j++) {\n        System.out.print("*");\n    }\n    System.out.println();\n}\n\n// *\n// **\n// ***\n// ****\n// *****', title: 'Triangle.java' },
    { h: '6.13 数组在内存中的样子' },
    { p: '数组对象在堆上，变量保存的是数组首地址；下标访问本质是“首地址 + 下标 × 元素大小”。这也是数组随机访问 O(1) 的原因。数组长度固定，创建后不能扩容，需要更大数组只能新建并复制。' },
    { note: '<b>注意：</b>数组是对象，赋值 <code>int[] b = a</code> 只复制引用，两个变量指向同一个数组；修改 b 的元素，a 也会变。需要独立副本用 Arrays.copyOf。' },
    { h: '6.14 两个基础算法实现' },
    { p: '线性查找逐个比较，找到返回下标，找不到返回 -1；冒泡排序相邻比较交换，每一轮把最大值推到末尾。它们不是最优解，但能练习循环、数组和边界。' },
    { code: 'static int indexOf(int[] a, int target) {\n    for (int i = 0; i < a.length; i++) {\n        if (a[i] == target) return i;\n    }\n    return -1;\n}\n\nstatic void bubbleSort(int[] a) {\n    for (int i = 0; i < a.length - 1; i++) {\n        for (int j = 0; j < a.length - 1 - i; j++) {\n            if (a[j] > a[j + 1]) {\n                int t = a[j];\n                a[j] = a[j + 1];\n                a[j + 1] = t;\n            }\n        }\n    }\n}', title: 'Algorithms.java' },
    { h: '6.15 常见问答' },
    { list: [
      'for 和 while 能互相改写吗？能，for 只是把初始化、条件、更新集中写了。',
      'switch 能判断区间吗？不能，区间用 if。',
      '数组能存对象吗？能，存的是引用；对象数组的每个元素默认 null。',
      '增强 for 能改数组元素吗？改元素副本无效，改对象字段有效。',
      'break 能跳出 if 吗？不能，break 只作用于循环或 switch。'
    ] }
  ]);
})();
