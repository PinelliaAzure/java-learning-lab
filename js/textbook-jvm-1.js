/* 教材正文：JVM 内存 / 垃圾回收 / 类加载 / 字节码调优 / 反射 / 注解（每章约 5200 字以上） */
(function () {
  'use strict';
  var T = window.JAVA_TEXTBOOK || (window.JAVA_TEXTBOOK = {});

  T['jvm-memory'] = {
    meta: '本章约 5600 字 · 建议 35 分钟 · 配套内存地图、四类溢出定位与 4 道习题',
    blocks: [
      { h: '1.1 为什么先画一张内存地图' },
      { p: '很多人对 JVM 的第一印象是“面试才用得上”：平时写业务代码，内存不是自动管的吗？直到某天服务在凌晨挂掉，日志最后一行是 <code>java.lang.OutOfMemoryError: Java heap space</code>；或者某个接口突然超时，线程栈里全是同一个递归方法。这时才会发现，报错信息其实已经把答案写出来了，只是我们读不懂它指的是哪块内存。' },
      { p: '这一章要做的事情很具体：把 JVM 运行时内存画成一张地图，标清楚每个区域属于谁、装什么、什么时候创建、溢出时报什么错、对应哪个启动参数。地图记住了，后面垃圾回收、类加载、性能调优才有地方落脚——GC 只在堆里工作，类加载只往方法区写，栈溢出和堆溢出根本是两回事，调错参数只会白费力气。' },
      { p: '读法建议：第一遍抓主线“线程私有还是线程共享”，第二遍记四类典型错误分别属于哪个区域，第三遍再抠栈帧、常量池、TLAB 这些细节。名词多不要紧，重要的是遇到问题时知道往哪儿查、看到报错时知道该动哪个参数。' },

      { h: '1.2 从 .java 到运行时数据区：总览' },
      { p: '<code>javac</code> 把 .java 编译成 .class。.class 里没有 CPU 指令，只有字节码、常量池和类的结构描述。字节码是介于源码和机器码之间的中间语言：它面向 JVM 而不是面向 x86 或 ARM，所以同一份 .class 可以在不同平台上运行，这才是“一次编译，到处运行”的真实含义——跨的是 JVM 这一层，不是源码直接跨平台。' },
      { p: '运行阶段 JVM 做三件事：把类从 .class 读进内存（类加载）、把字节码翻译成当前平台能执行的指令（解释执行与 JIT 编译）、在运行过程中分配和回收内存（运行时数据区与垃圾回收）。可以把它想成一个房东兼翻译：翻译负责让程序跑起来，房东负责分配房间，并在客人离开后把房间收回来。' },
      { p: 'Java 虚拟机规范只规定“有哪些区域、每个区域负责什么”，不规定具体实现。比如方法区是规范里的概念，HotSpot 在 JDK 8 之前用永久代实现，JDK 8 之后换成元空间。所以“方法区等于永久代吗”这个问题，标准答案是：不等于，前者是规范里的逻辑区域，后者是某个版本的具体实现。' },
      { p: '规范把运行时内存分成五块：程序计数器、虚拟机栈、本地方法栈属于线程私有，随线程创建和销毁；堆和方法区属于所有线程共享，随 JVM 启动而创建、随 JVM 退出而销毁。此外还有一块直接内存，它不在运行时数据区里，但通过 NIO 使用得非常频繁，排查内存问题时必须一起看。' },
      { flow: ['javac 编译出 .class', '类加载进方法区', 'main 方法压入栈帧', 'new 在堆上分配对象', '引用存进局部变量表', '方法返回栈帧弹出', '对象不可达后被 GC 回收'] },
      { p: '这条链路串起了本章所有概念：类信息进方法区，方法调用进栈，对象进堆，引用连接栈和堆。理解“谁引用谁”是后面学可达性分析的基础——GC 判断对象能不能回收，看的就是从栈上的引用出发还能不能走到它。' },
      { p: '主线只有一句：线程私有意味着每个线程一份、互不干扰，所以栈溢出只影响当前线程；线程共享意味着所有线程抢同一块，所以堆溢出会影响整个进程，一个线程把堆吃满，其他线程也会跟着 OOM。把这句话记住，后面每个区域都只是它的展开。' },
      { table: { head: ['区域', '线程', '主要存放', '典型错误'], rows: [
        ['程序计数器', '私有', '下一条要执行的字节码地址', '不会 OOM'],
        ['虚拟机栈', '私有', '栈帧：局部变量表、操作数栈', 'StackOverflowError'],
        ['本地方法栈', '私有', 'native 方法的调用现场', 'StackOverflowError'],
        ['堆', '共享', '对象实例、数组', 'Java heap space'],
        ['方法区 / 元空间', '共享', '类元数据、运行时常量池、静态变量', 'Metaspace'],
        ['直接内存', '堆外', 'NIO 的 DirectByteBuffer', 'Direct buffer memory']
      ] } },

      { h: '1.3 程序计数器：最小却最特殊' },
      { p: '程序计数器（Program Counter Register）是一块很小的内存，记录当前线程正在执行的字节码行号，准确说是下一条要执行的指令地址。字节码解释器工作时，就是靠它来取指令、取下一条指令，循环和分支也依赖它跳转。' },
      { p: '为什么必须是线程私有？因为 CPU 在多个线程之间轮流切换，一个线程被挂起、过一会儿再恢复，必须知道刚才执行到哪儿了。如果计数器是共享的，线程 A 恢复执行时可能接着线程 B 的位置继续跑，程序立刻错乱。所以每个线程都有一份自己的计数器，切换时随线程上下文一起保存和恢复。' },
      { p: '它的特殊性在于：这是规范中唯一没有规定任何 OutOfMemoryError 的区域，也是唯一在运行时大小固定、不会扩张收缩的区域。执行 native 方法时，计数器的值是未定义的，因为 native 方法由本地代码执行，不由字节码解释器驱动。' },
      { note: '<b>一句话记忆：</b>程序计数器管“执行到哪一行”，它最小、最快、线程私有，永远不会溢出。面试里问“哪个区域不会 OOM”，答案就是它。' },

      { h: '1.4 虚拟机栈与栈帧' },
      { p: '线程启动时，JVM 为它分配一个虚拟机栈，大小由 <code>-Xss</code> 决定（64 位 Linux 上的 HotSpot 默认约 1MB）。栈里装的基本单位叫栈帧（Stack Frame），每调用一个方法就压入一帧，方法返回就弹出。栈是后进先出，所以最后被调用的方法最先结束，这也是异常栈轨迹里“越靠上越是最近的调用”的原因。' },
      { p: '一个栈帧由四部分组成。局部变量表：以 Slot（32 位）为单位，存放方法参数和方法内声明的局部变量；long 和 double 占两个 Slot；对象引用存的是地址，不是对象本身。操作数栈：计算的临时工作区，执行 <code>a + b</code> 时先把两个数压栈，再弹出相加，结果压回栈顶。动态链接：指向运行时常量池中该方法的符号引用，用于在运行时把符号引用解析成直接引用。返回地址：方法正常返回或异常退出后，调用者应该接着执行哪条指令。' },
      { p: '局部变量表的大小在编译期就确定了，写在 class 文件 Code 属性的 <code>max_locals</code> 里。方法里声明多少局部变量，编译后就分配多少槽位，运行时不存在“按需扩容”。这也解释了一个常见现象：把一个大对象赋给局部变量，只要方法没结束、变量还在作用域内，这个对象就一直被引用着，GC 不会回收它。' },
      { lang: 'java', code: 'public class CallStack {\n    static void a() { b(); }\n    static void b() { c(); }\n\n    static void c() {\n        StackTraceElement[] st = Thread.currentThread().getStackTrace();\n        System.out.println("栈深度: " + st.length);\n        for (StackTraceElement e : st) {\n            System.out.println(e.getClassName() + "." + e.getMethodName());\n        }\n    }\n\n    public static void main(String[] args) {\n        a();\n    }\n}', title: 'CallStack.java' },
      { out: '栈深度: 5\njava.lang.Thread.getStackTrace\nCallStack.c\nCallStack.b\nCallStack.a\nCallStack.main' },
      { p: '数组第 0 个元素是 <code>getStackTrace</code> 自己，然后是 c、b、a、main。读栈轨迹要从下往上：最下面是入口，最上面是当前停住的位置。线上排查卡死时，<code>jstack</code> 打出来的就是每个线程这样一串帧；看到大量线程停在同一个方法上，基本就能判断是锁竞争还是死循环。' },
      { p: '本地方法栈和虚拟机栈作用类似，只不过它为 native 方法服务。HotSpot 把两者合并实现，所以调 <code>-Xss</code> 会同时影响它们；规范允许虚拟机栈固定大小或动态扩展，HotSpot 选择固定大小，栈满了直接抛 StackOverflowError，而不是去申请更多内存。' },

      { h: '1.5 栈溢出：递归的代价' },
      { p: '递归是最容易触发栈溢出的写法，因为它每深入一层就要压一个栈帧。下面这段代码故意没有终止条件，并用 catch 捕获 Error 来观察深度上限：' },
      { lang: 'java', code: 'public class StackOverflowDemo {\n    static int depth = 0;\n\n    static void recurse() {\n        depth++;\n        recurse();\n    }\n\n    public static void main(String[] args) {\n        try {\n            recurse();\n        } catch (StackOverflowError e) {\n            System.out.println("栈深度大约: " + depth);\n            System.out.println("错误类型: " + e.getClass().getName());\n        }\n    }\n}', title: 'StackOverflowDemo.java' },
      { out: '栈深度大约: 11423\n错误类型: java.lang.StackOverflowError' },
      { p: '输出里的深度不是固定值：它取决于 <code>-Xss</code>、栈帧大小（局部变量多少）、JDK 版本和平台，同一份代码在不同机器上可能是一万多次，也可能是两万次。所以不要背数字，只要知道“深度到上限就抛 StackOverflowError”，并且这个错误发生的位置和你调用的层数直接相关。' },
      { p: 'StackOverflowError 继承自 Error 而不是 Exception，所以 <code>catch (Exception e)</code> 抓不到它，写日志时容易“什么都没记下就退出了”。它出现的原因几乎都是代码问题：递归没有终止条件、终止条件写错（比如本该减到 0 却每次减 2，永远跳过 0）、递归深度随输入线性增长（链表太长、树太深、JSON 嵌套太深）。修复优先改代码。' },
      { p: '确实需要更深的栈时可以调大 <code>-Xss2m</code>，但要清楚代价：每个线程都占这么大一块，线程数一多，物理内存会被栈吃掉；而且栈变大只是把崩溃点往后推，输入再大一点照样溢出。递归能改成循环就改，这是最稳的做法。' },
      { p: '另有一种容易混淆的错误：<code>java.lang.OutOfMemoryError: unable to create new native thread</code>。它不是栈溢出，而是创建线程时系统资源不足——每个线程都要一个栈，线程太多，栈的总量超过了进程可用的虚拟内存或系统 ulimit 限制。定位方向是线程数、线程池配置和 <code>-Xss</code>，而不是堆大小。' },
      { note: '<b>常见误解：</b>“栈溢出就是内存不够，加内存就行。”——栈大小和物理内存是两回事，<code>-Xss</code> 限制的是单个线程的栈深度；盲目调大只会让每个线程更占内存，问题换个形式出现。' },

      { h: '1.6 堆：对象出生和成长的地方' },
      { p: '堆是所有线程共享的最大一块内存，几乎所有的对象实例和数组都在这里分配。规范的原话是“所有对象实例以及数组都应当在堆上分配”，但 JIT 的逃逸分析可以把只在方法内使用、不会逃逸出去的小对象拆成标量，实际不分配对象——这是编译器的优化，不改变 Java 语义，也不能依赖它。' },
      { p: '堆是垃圾回收的主战场。HotSpot 按分代管理：新生代由一块 Eden 和两块 Survivor 组成（默认比例 8:1:1，参数 <code>-XX:SurvivorRatio=8</code>），新对象在 Eden 出生；Eden 满了触发 Minor GC，存活对象被复制到 Survivor，年龄加一；年龄到阈值（默认 15，参数 <code>-XX:MaxTenuringThreshold</code>）或 Survivor 装不下时晋升老年代；老年代满了触发 Full GC。' },
      { p: '多线程同时 new 对象会有竞争，HotSpot 的解法是 TLAB（Thread Local Allocation Buffer）：每个线程在 Eden 里预分一小块私有区域，分配时在自己的 TLAB 里用“指针碰撞”完成，几乎不需要加锁；TLAB 用完再申请新的一块。这就是为什么高并发下对象分配依然很快，也是“堆是共享的，但分配可以很便宜”的原因。' },
      { lang: 'java', code: 'public class HeapMonitor {\n    public static void main(String[] args) {\n        Runtime rt = Runtime.getRuntime();\n        System.out.println("最大堆: " + rt.maxMemory() / 1024 / 1024 + " MB");\n        System.out.println("已用: " + (rt.totalMemory() - rt.freeMemory()) / 1024 / 1024 + " MB");\n\n        byte[] block = new byte[8 * 1024 * 1024];\n        System.out.println("分配 8MB 后已用: " + (rt.totalMemory() - rt.freeMemory()) / 1024 / 1024 + " MB");\n        System.out.println("数组长度: " + block.length);\n    }\n}', title: 'HeapMonitor.java' },
      { out: '最大堆: 256 MB\n已用: 2 MB\n分配 8MB 后已用: 10 MB\n数组长度: 8388608' },
      { p: '注意三个数字的区别：<code>totalMemory</code> 是当前已经向操作系统申请的堆大小，不是 <code>-Xmx</code>；<code>freeMemory</code> 是这块已申请内存里还没用的部分；<code>maxMemory</code> 才是 <code>-Xmx</code>。程序刚启动时 totalMemory 通常远小于 maxMemory，随着分配逐步扩大，所以生产环境建议 <code>-Xms</code> 和 <code>-Xmx</code> 设成一样，避免运行中反复扩容带来的抖动。' },
      { note: '<b>堆不是越大越好：</b>堆越大，一次 Full GC 要扫描和整理的对象越多，单次停顿可能更长；堆超过物理内存还会触发 swap，延迟从毫秒级变成秒级。堆大小的目标是在“装得下业务峰值”和“停顿可接受”之间取平衡。' },

      { h: '1.7 方法区与元空间：从永久代到 Metaspace' },
      { p: '方法区是规范里的逻辑区域，存放已被虚拟机加载的类信息、运行时常量池、静态变量，以及 JIT 编译后的代码缓存（HotSpot 把代码缓存单独放在 CodeCache 里）。它和堆一样是所有线程共享的，但规范对它的约束比堆松得多，不同虚拟机可以有不同实现。' },
      { p: 'JDK 7 及以前，HotSpot 用永久代（Permanent Generation）实现方法区，它位于堆的连续空间里，大小由 <code>-XX:MaxPermSize</code> 限制。永久代这个名字容易让人误以为对象永远不回收，其实它也会参与 Full GC，只是回收条件苛刻、大小难估，动态生成类多的应用经常抛 <code>java.lang.OutOfMemoryError: PermGen space</code>。' },
      { p: 'JDK 8 移除了永久代，改用元空间（Metaspace）：类的元数据放在本地内存里，不再受 <code>-Xmx</code> 限制，默认没有上限（受物理内存约束），可以用 <code>-XX:MaxMetaspaceSize</code> 设置上限。字符串常量池在 JDK 7 就已经从永久代移到堆中，所以“常量池在方法区”这句话要打个折扣：运行时常量池仍在方法区，字符串常量池在堆。' },
      { p: '为什么要改？永久代大小必须在启动时定好，调大占堆、调小容易溢出；元空间按需向操作系统申请，类卸载时还能把内存还给系统。代价是元空间泄漏更隐蔽：类加载器泄漏会让类和它的元数据一直活着，进程 RSS 持续上涨，但堆 dump 里看不出来。' },
      { lang: 'java', code: 'import java.lang.management.ManagementFactory;\nimport java.lang.management.MemoryPoolMXBean;\nimport java.lang.management.MemoryType;\nimport java.lang.management.MemoryUsage;\n\npublic class MetaSpaceDemo {\n    public static void main(String[] args) {\n        for (MemoryPoolMXBean pool : ManagementFactory.getMemoryPoolMXBeans()) {\n            MemoryUsage u = pool.getUsage();\n            if (u == null) continue;\n            System.out.printf("%-24s %-4s %6d KB / %6d KB%n",\n                    pool.getName(),\n                    pool.getType() == MemoryType.HEAP ? "堆" : "非堆",\n                    u.getUsed() / 1024, u.getCommitted() / 1024);\n        }\n    }\n}', title: 'MetaSpaceDemo.java' },
      { out: 'G1 Eden Space            堆     2048 KB /   4096 KB\nG1 Survivor Space        堆        0 KB /      0 KB\nG1 Old Gen               堆     1024 KB /   4096 KB\nMetaspace                非堆    5120 KB /   6144 KB\nCodeCache                非堆    1024 KB /   2048 KB\nCompressed Class Space   非堆     896 KB /   1024 KB' },
      { p: '输出的名字随收集器和 JDK 版本变化。Compressed Class Space 是开启指针压缩（64 位默认开启）后专门存放类元数据指针的一部分空间，默认上限 1GB，类特别多时它也会单独溢出，报错信息里会出现 Compressed class space。看到 Metaspace 或 Compressed class space，排查方向就是类数量、类加载器泄漏、动态代理和反射生成类的框架。' },

      { h: '1.8 运行时常量池与字符串常量池' },
      { p: 'class 文件里有一张常量池表，存放两类东西：字面量（字符串、整数、浮点常量）和符号引用（类名、字段名、方法名、方法描述符）。类加载后，这张表进入方法区，成为运行时常量池。符号引用在解析阶段被替换成直接引用，但字符串字面量一直留在池里供复用。' },
      { p: '字符串常量池是更具体的一层优化：字符串不可变且大量重复，如果每次字面量都新建对象，内存浪费会非常惊人。JVM 维护一张字符串表，执行 <code>String s = "java"</code> 时先查表，有就复用引用，没有才创建并登记。下面这段代码把几种常见写法的比较结果一次打出来：' },
      { lang: 'java', code: 'public class PoolDemo {\n    public static void main(String[] args) {\n        String a = "java";\n        String b = "java";\n        String c = new String("java");\n        String d = c.intern();\n        String e = "ja" + "va";\n        String f = "ja";\n        String g = f + "va";\n\n        System.out.println("a == b : " + (a == b));\n        System.out.println("a == c : " + (a == c));\n        System.out.println("a == d : " + (a == d));\n        System.out.println("a == e : " + (a == e));\n        System.out.println("a == g : " + (a == g));\n    }\n}', title: 'PoolDemo.java' },
      { out: 'a == b : true\na == c : false\na == d : true\na == e : true\na == g : false' },
      { p: '逐行解释：a 和 b 都是字面量，指向常量池里同一个对象，所以为 true；c 用 new 强制在堆上创建新对象，地址不同，为 false；<code>intern()</code> 返回常量池里的那个引用，所以 d 和 a 相同；e 由两个字面量相加，javac 在编译期就折叠成 "java"，仍是同一个引用；g 由变量 f 参与拼接，编译期无法确定，运行期生成新对象，所以为 false。' },
      { note: '<b>实践建议：</b>比较字符串内容一律用 <code>equals</code>；不要用 <code>new String("x")</code>；循环里大量拼接用 <code>StringBuilder</code>。JDK 6 的 <code>intern()</code> 会把字符串复制进永久代，可能撑爆 PermGen；JDK 7 起常量池移到堆，这个坑基本消失，但 intern 仍然占堆，不要拿它当缓存。' },

      { h: '1.9 直接内存：不受 -Xmx 管的堆外内存' },
      { p: '直接内存不是运行时数据区的一部分，它是 JVM 通过 native 方法向操作系统申请的内存，典型使用者是 NIO 的 DirectByteBuffer。它不受 <code>-Xmx</code> 限制，只受物理内存和 <code>-XX:MaxDirectMemorySize</code> 限制（不显式设置时默认等于 <code>-Xmx</code>）。' },
      { p: '为什么需要它？普通 HeapByteBuffer 的数据在 Java 堆里，做文件或网络 IO 时，操作系统需要一块连续的内存，JVM 得先把数据复制到堆外缓冲区，多一次复制。DirectByteBuffer 直接在堆外分配，省掉这次复制，所以高吞吐的网络框架（比如 Netty）大量使用直接内存。' },
      { p: '代价有两个：分配和释放比堆内慢，因为要走系统调用；它不受 GC 直接管理。DirectByteBuffer 对象本身在堆里，当它被回收时，由 Cleaner（内部基于虚引用实现）触发释放堆外内存。如果堆很小、DirectByteBuffer 对象迟迟不被回收，就可能出现“堆没满但堆外爆了”的情况。' },
      { lang: 'java', code: 'import java.nio.ByteBuffer;\n\npublic class DirectMemoryDemo {\n    public static void main(String[] args) {\n        int size = 64 * 1024 * 1024;\n        ByteBuffer buffer = ByteBuffer.allocateDirect(size);\n        buffer.putInt(0, 42);\n\n        System.out.println("直接内存容量: " + buffer.capacity() / 1024 / 1024 + " MB");\n        System.out.println("是否直接缓冲: " + buffer.isDirect());\n        System.out.println("读回数据: " + buffer.getInt(0));\n    }\n}', title: 'DirectMemoryDemo.java' },
      { out: '直接内存容量: 64 MB\n是否直接缓冲: true\n读回数据: 42' },
      { p: '排查时看进程的 RSS：堆 dump 正常、GC 日志正常，但 RSS 持续上涨，就往直接内存、线程栈、元空间、JNI 这几个方向查。报错信息是 <code>java.lang.OutOfMemoryError: Direct buffer memory</code>，对应参数 <code>-XX:MaxDirectMemorySize</code>。' },

      { h: '1.10 四类溢出的定位方法与参数速查' },
      { p: '内存问题的排查顺序是固定的：先读错误信息确定区域，再看监控确认趋势，最后 dump 找具体对象。跳过第一步直接调参数，往往只是把问题推迟，而不是解决。下面这张表把最常见的报错和对应区域放在一起：' },
      { table: { head: ['报错信息', '所在区域', '先看什么', '常用参数'], rows: [
        ['Java heap space', '堆', '对象是否持续增长、GC 后能否降下来', '-Xms / -Xmx'],
        ['StackOverflowError', '虚拟机栈', '递归终止条件、调用深度', '-Xss'],
        ['Metaspace / Compressed class space', '元空间', '类数量、类加载器是否泄漏', '-XX:MaxMetaspaceSize'],
        ['Direct buffer memory', '直接内存', '进程 RSS、Netty 缓冲区', '-XX:MaxDirectMemorySize'],
        ['GC overhead limit exceeded', '堆', 'GC 耗时占比过高，接近只做 GC', '先查泄漏，再调堆'],
        ['unable to create new native thread', '线程栈 / 系统', '线程数、ulimit、线程池', '-Xss、ulimit']
      ] } },
      { p: '举一个最常见的场景：服务运行几小时后 OOM，重启就好，几小时后又 OOM。这几乎可以断定是泄漏而不是容量不足——容量不足会在启动后很快出现，且与运行时长关系不大；泄漏则是随时间稳定上涨，GC 只能暂时压下去。' },
      { ol: [
        '看错误信息，确定是哪个区域（heap、metaspace、direct buffer、stack）。',
        '用 <code>jps -l</code> 找到 Java 进程号，确认没有找错进程。',
        '用 <code>jstat -gcutil &lt;pid&gt; 1000</code> 每秒看一次 GC：老年代占用是否只涨不降、Full GC 是否越来越频繁。',
        '用 <code>jmap -histo:live &lt;pid&gt; | head -30</code> 看存活对象排行，哪个类的实例和字节数异常。',
        '用 <code>jmap -dump:live,format=b,file=heap.hprof &lt;pid&gt;</code> 导出堆，或用 <code>jcmd &lt;pid&gt; GC.heap_dump</code>。',
        '用 MAT / JProfiler 打开 dump，看 Dominator Tree 找占用最大的对象，再沿 GC Roots 路径找“谁还引用着它”。',
        '回到业务代码，找静态集合只增不减、缓存没有过期、监听器没有注销、流没有关闭这类泄漏点。'
      ] },
      { lang: 'java', code: 'import java.util.ArrayList;\nimport java.util.List;\n\npublic class HeapOOM {\n    public static void main(String[] args) {\n        List<byte[]> list = new ArrayList<>();\n        int i = 0;\n        while (true) {\n            list.add(new byte[1024 * 1024]);\n            if (++i % 10 == 0) {\n                System.out.println("已分配 " + i + " MB");\n            }\n        }\n    }\n}', title: 'HeapOOM.java' },
      { out: '已分配 10 MB\n已分配 20 MB\n已分配 30 MB\nException in thread "main" java.lang.OutOfMemoryError: Java heap space' },
      { p: '这段代码配 <code>-Xmx64m</code> 运行，分配几十 MB 后就会抛 heap space。它的价值是让你亲眼看到报错的样子、退出码和栈轨迹。真实项目里的泄漏藏得更深：静态 Map 只 put 不 remove、ThreadLocal 用完不 remove、监听器注册后不注销、缓存没有过期策略、数据库连接或输入流没有关闭。' },
      { p: '加上 <code>-XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=/data/dump</code> 后，OOM 的瞬间会自动生成 hprof 文件，事后慢慢分析。生产环境建议默认开启这个参数：OOM 往往几秒内就重启了，没有现场就只能靠猜。' },
      { p: '参数不需要背，但要能看懂。下表按区域归类了最常用的一组，看到启动脚本里的参数时，至少要能说出它管哪块内存。' },
      { table: { head: ['参数', '作用', '常见写法'], rows: [
        ['-Xms / -Xmx', '堆初始大小 / 最大大小', '-Xms2g -Xmx2g（建议相等）'],
        ['-Xmn', '新生代大小（等价于设置 NewSize 和 MaxNewSize）', '-Xmn1g'],
        ['-XX:NewRatio', '老年代与新生代的比例', '-XX:NewRatio=2 表示 1:2'],
        ['-XX:SurvivorRatio', 'Eden 与单个 Survivor 的比例', '-XX:SurvivorRatio=8 即 8:1:1'],
        ['-Xss', '单线程栈大小', '-Xss1m，递归深可调到 2m'],
        ['-XX:MetaspaceSize', '元空间首次触发 GC 的阈值（不是初始大小）', '-XX:MetaspaceSize=128m'],
        ['-XX:MaxMetaspaceSize', '元空间上限', '-XX:MaxMetaspaceSize=512m'],
        ['-XX:MaxDirectMemorySize', '直接内存上限', '-XX:MaxDirectMemorySize=1g'],
        ['-XX:+HeapDumpOnOutOfMemoryError', 'OOM 时自动导出堆', '配合下一行使用'],
        ['-XX:HeapDumpPath', 'dump 文件路径', '-XX:HeapDumpPath=/data/dump']
      ] } },
      { p: '最后强调一句：参数是最后一步。先用 <code>jps</code>、<code>jstat</code>、<code>jmap</code>、<code>jstack</code>、<code>jcmd</code> 拿到数据，确认瓶颈在哪，再决定调什么。没有数据支撑的调参，本质是在碰运气，而且会把真正的问题掩盖掉。' },

      { h: '1.11 本章小结' },
      { list: [
        '运行时数据区五块：程序计数器、虚拟机栈、本地方法栈线程私有；堆、方法区线程共享；直接内存是堆外补充。',
        '程序计数器唯一不会 OOM；栈溢出抛 StackOverflowError，堆溢出抛 Java heap space，元空间溢出抛 Metaspace。',
        '栈帧包含局部变量表、操作数栈、动态链接、返回地址；局部变量表大小编译期确定，是 GC Roots 的一部分。',
        '堆分新生代（Eden + 两个 Survivor）和老年代；TLAB 让对象分配几乎无锁；JDK 8 起方法区由元空间实现。',
        '排查顺序：读错误信息 → 确认区域 → jstat 看趋势 → dump 找对象 → 回到代码找泄漏点。'
      ] },

      { h: '1.12 常见追问' },
      { list: [
        '<b>问：栈和堆有什么区别？</b><br>答：栈线程私有，随方法调用自动进出，一个方法对应一个栈帧，里面放局部变量表、操作数栈、动态链接和返回地址，满了抛 <code>StackOverflowError</code>；堆线程共享，由 GC 管理，放对象实例和数组，满了抛 <code>OutOfMemoryError: Java heap space</code>。所以栈溢出是调用深度问题，先看递归终止条件，必要时调 <code>-Xss</code>；堆溢出是容量或泄漏问题，先看对象为什么回收不掉，再决定调不调 <code>-Xmx</code>。',
        '<b>问：为什么程序计数器不会 OOM？</b><br>答：它只记录当前线程下一条要执行的字节码指令地址，大小在 JVM 启动时就固定，跑循环、走分支都不会让它增长，规范里也没有为这个区域定义任何 OutOfMemoryError。它是运行时数据区五个区域里唯一不会溢出的一个，代价是它确实很小；执行 native 方法时它的值甚至是未定义的，因为那段代码不由字节码解释器驱动。',
        '<b>问：元空间会 OOM 吗？</b><br>答：会。它默认不设上限，只受物理内存约束，可以用 <code>-XX:MaxMetaspaceSize</code> 限制；开启指针压缩后还有一块 Compressed Class Space，默认上限 1GB，类特别多时它会先单独溢出。反射、CGLIB 动态代理、JSP 编译、热部署不断生成新类，或者类加载器泄漏导致类无法卸载时，就会抛 Metaspace 或 Compressed class space 溢出。',
        '<b>问：堆外内存怎么排查？</b><br>答：先看进程 RSS 与堆使用量的差值，如果堆 dump 正常、GC 日志正常但 RSS 持续上涨，就按顺序查直接内存、线程栈、元空间、JNI 这四块。手段包括用 <code>-XX:MaxDirectMemorySize</code> 限制直接内存上限、统计 Netty 的缓冲区计数、用 <code>jcmd &lt;pid&gt; VM.native_memory</code>（需先加 <code>-XX:NativeMemoryTracking=summary</code> 开启，要更细的分类用 <code>detail</code>）看分类明细。报错信息是 <code>OutOfMemoryError: Direct buffer memory</code>。',
        '<b>问：-Xms 和 -Xmx 为什么要设成一样？</b><br>答：初始值和最大值不同时，运行中堆会反复扩容和收缩，扩容往往伴随一次 Full GC，带来停顿抖动，内存占用也难以预估。设成一样就把这些动作提前到启动阶段，换来更稳定的延迟，代价是启动时就提交这么多内存，不过提交的是虚拟内存，物理内存仍按实际使用增长。容器里还要留出堆外空间，别把上限顶到容器限额。'
      ] },

      { h: '1.13 自测与练习' },
      { ol: [
        '写一个方法打印当前线程的栈深度，并在 main 里经三层方法调用后运行，观察输出顺序，说明为什么最上面的帧是最近调用的方法。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><pre class="tb-ans-code" data-lang="java">public class StackDepth {\n  static int depth() {\n    return Thread.currentThread()\n        .getStackTrace().length;\n  }\n\n  static void first() {\n    System.out.println("first  " + depth());\n    second();\n  }\n\n  static void second() {\n    System.out.println("second " + depth());\n    third();\n  }\n\n  static void third() {\n    System.out.println("third  " + depth());\n    StackTraceElement[] st =\n        Thread.currentThread().getStackTrace();\n    for (StackTraceElement e : st) {\n      System.out.println("  " + e.getClassName()\n          + "." + e.getMethodName());\n    }\n  }\n\n  public static void main(String[] args) {\n    first();\n  }\n}</pre><b>要点</b>：每个方法调用压一帧，栈后进先出，所以 getStackTrace 数组最上面一条正是刚执行的那一行，最早进入的 main 在最底；把 third 改成无条件自调用，深度会一路涨到 StackOverflowError。</div></details>',
        '把 StackOverflowDemo 的 <code>-Xss</code> 从默认调到 2m 重新运行，记录栈深度变化，并解释为什么调大栈解决不了所有递归问题。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><pre class="tb-ans-code" data-lang="java">public class StackOverflowDemo {\n  static int depth = 0;\n\n  static void recurse() {\n    depth++;\n    recurse();\n  }\n\n  public static void main(String[] args) {\n    try {\n      recurse();\n    } catch (StackOverflowError e) {\n      System.out.println("最大深度: " + depth);\n      System.out.println("异常: "\n          + e.getClass().getName());\n    }\n  }\n}\n\njavac StackOverflowDemo.java\njava StackOverflowDemo\njava -Xss2m StackOverflowDemo\n\n# 两次运行对比「最大深度」，异常类型都是\n# java.lang.StackOverflowError</pre><b>要点</b>：深度约等于线程栈大小除以单个栈帧大小，栈翻倍深度大致也翻倍，它只是把崩溃点往后推；而且每个线程都要占这么大的栈，线程数一多内存先炸，所以先改代码把递归写成循环，再考虑调参数。</div></details>',
        '用 <code>-Xmx64m</code> 运行 HeapOOM，观察报错前打印的分配进度，再用 <code>-XX:+HeapDumpOnOutOfMemoryError</code> 生成 dump，用 MAT 找占用最大的对象。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><pre class="tb-ans-code" data-lang="java">import java.util.ArrayList;\nimport java.util.List;\n\npublic class HeapOOM {\n  static final List&lt;byte[]> CACHE =\n      new ArrayList&lt;>();\n\n  public static void main(String[] args) {\n    for (int i = 1; i &lt;= 200; i++) {\n      CACHE.add(new byte[1024 * 1024]);\n      System.out.println("已分配 " + i + " MB");\n    }\n  }\n}\n\njavac HeapOOM.java\njava -Xmx64m \\\n  -XX:+HeapDumpOnOutOfMemoryError \\\n  -XX:HeapDumpPath=/tmp HeapOOM\n\n# 几十 MB 后抛 java.lang.OutOfMemoryError:\n#   Java heap space，退出码 1\n# /tmp 下留下 java_pid&lt;pid>.hprof</pre><b>要点</b>：静态 final 的 List 是 GC Root，每个 1MB 数组始终可达，GC 收不掉，所以是内存真的留错了而不是 GC 太慢；MAT 里看 Dominator Tree，byte[] 占绝对多数，再沿 GC Roots 引用链追到 CACHE 确认持有方没释放。</div></details>',
        '解释 PoolDemo 中五个比较结果各自的原因；如果把 <code>String g = f + "va"</code> 改成 <code>String g = "ja" + "va"</code>，结果会怎样变化？<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><b>预期现象</b>：原样运行输出 true、false、true、true、false；改完之后第五行 <code>a == g</code> 也变成 true。<b>为什么</b>：前四个分别对应字面量复用、<code>new</code> 强制在堆上新建、<code>intern()</code> 返回常量池引用、编译期常量折叠；第五行原本有变量参与只能在运行期拼接，改成两个字面量后 javac 直接折叠成常量池里的 <code>java</code>。<b>要点</b>：javac 只折叠编译期常量，任何变量参与都会退化成运行期拼接。</div></details>',
        '（动手）给自己电脑上的一个 Java 程序加上 <code>-XX:+PrintCommandLineFlags</code> 运行，读出实际生效的堆、栈、收集器参数，并对照本章表格说明每个参数的作用。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><pre class="tb-ans-code" data-lang="shell">javac Hello.java\n\n# 1. 看实际生效的启动参数\njava -XX:+PrintCommandLineFlags -version\n#  -XX:InitialHeapSize=268435456\n#  -XX:MaxHeapSize=4294967296\n#  -XX:+UseG1GC\n\n# 2. 看全部参数再过滤\njava -XX:+PrintFlagsFinal -version | \\\n  grep -E "HeapSize|StackSize|UseG1GC"\n\n# 3. 运行中的进程也能看\njps -l\njcmd &lt;pid> VM.flags</pre><b>要点</b>：打印出来的是 JVM 按机器规格推导后的实际值，不是你手写的默认值，容器和大内存机器上差异最明显；-Xms/-Xmx 管堆的起止大小，-Xss 管每个线程的栈，收集器看 Use 系列开关。</div></details>'
      ] },
      { note: '<b>练习提示：</b>第 4 题的关键是“编译期常量折叠”与“运行期拼接”的区别；第 5 题不需要改代码，只要在命令行加参数，观察 JVM 打印出来的最终配置。' },
    ]
  };

  T['gc'] = {
    meta: '本章约 5700 字 · 建议 40 分钟 · 配套分代流程图、收集器对比与 5 道习题',
    blocks: [
      { h: '2.1 为什么“自动回收”不等于“没有代价”' },
      { p: '写 C 或 C++ 的人对 <code>malloc</code> 和 <code>free</code> 一定不陌生：申请了内存就必须记得释放，忘记就是泄漏，重复释放就是崩溃。Java 把这件事交给了垃圾回收器，程序员不用写 free，也不需要关心对象什么时候消失。这是 Java 最实在的生产力优势之一。' },
      { p: '但“自动”不等于“免费”。GC 要占用 CPU 线程，要在某个时刻暂停用户线程去标记和搬运对象，暂停多久、多久暂停一次，直接决定接口的 P99 延迟。很多线上事故不是代码逻辑错了，而是堆慢慢涨满，Full GC 越来越频繁，最后要么 OOM，要么健康检查超时被负载均衡摘掉。' },
      { p: '这一章的主线只有三步：先找到垃圾（可达性分析），再把垃圾挪走（回收算法），最后尽量少暂停（收集器与参数）。分代、记忆集、写屏障这些概念，都是为了让这三步在真实系统里跑得更快。' },

      { h: '2.2 怎么判断一个对象是垃圾：可达性分析与 GC Roots' },
      { p: '有两种经典思路。第一种是引用计数：给每个对象记一个被引用次数，多一个引用加一，少一个引用减一，归零就回收。它实现简单、回收及时，缺点是处理不了循环引用——A 引用 B、B 引用 A，即使外部已经没有任何人引用它们，两者的计数都不是零，永远回收不掉。' },
      { p: '第二种是可达性分析：从一组称为 GC Roots 的对象出发，沿着引用链遍历，能走到的对象标记为存活，走不到的就是垃圾。循环引用在这里完全不是问题，因为 A 和 B 互相引用，但从 GC Roots 出发根本走不到它们，整条环会一起被回收。Java 用的是这一种。' },
      { p: '遍历的过程叫标记。为了不长时间暂停，现代收集器大多用三色标记法：白色表示还没访问，灰色表示自己访问过了但子引用还没扫描完，黑色表示自己和子引用都处理完了。并发标记时用户线程还在修改引用，需要靠写屏障或读屏障维持“黑色对象不能直接指向白色对象”的正确性，这就是 G1 的写屏障和 ZGC 的读屏障存在的原因。' },
      { lang: 'java', code: 'class Node {\n    Node next;\n    byte[] payload = new byte[1024 * 1024];\n}\n\npublic class CycleGC {\n    public static void main(String[] args) throws Exception {\n        Node a = new Node();\n        Node b = new Node();\n        a.next = b;\n        b.next = a;\n\n        java.lang.ref.WeakReference<Node> ref = new java.lang.ref.WeakReference<>(a);\n        a = null;\n        b = null;\n\n        System.gc();\n        Thread.sleep(200);\n        System.out.println("循环引用的对象是否被回收: " + (ref.get() == null));\n    }\n}', title: 'CycleGC.java' },
      { out: '循环引用的对象是否被回收: true' },
      { p: '如果用引用计数，a 和 b 互相持有对方，计数永远不会归零，这两个对象会一直占着 2MB。可达性分析从 GC Roots 出发走不到它们，所以整条环被判定为垃圾，一次回收就清掉了。' },
      { note: '<b>提醒：</b><code>System.gc()</code> 只是“建议”JVM 执行回收，JVM 可以不立刻执行。输出 true 说明这次确实回收了，但不要在生产代码里依赖它来保证时机。' },
      { p: 'GC Roots 是可达性分析的起点，也是“对象为什么还没被回收”这个问题的最终答案。规范没有穷举，HotSpot 的实践主要包括下面几类：' },
      { table: { head: ['GC Root 类型', '具体例子', '为什么算根'], rows: [
        ['虚拟机栈中的引用', '方法参数、局部变量、临时对象', '线程正在使用，不能回收'],
        ['方法区静态属性', 'static 字段引用的对象', '类还活着，静态字段就有效'],
        ['方法区常量', '字符串常量池、final 常量', '常量池中的引用一直有效'],
        ['本地方法栈 / JNI', 'native 方法里持有的引用', '本地代码可能还在用'],
        ['JVM 内部引用', '基本类型的 Class 对象、常驻异常、系统类加载器', '虚拟机自身运行需要'],
        ['同步锁与 JMX', 'synchronized 持有的对象、注册的 MBean', '锁和监控注册表持有引用']
      ] } },
      { p: '注意判断标准：一个对象是否存活，取决于从这些根出发能不能走到它，而不是它自己有没有被别的对象引用。所以一个对象即使被另一个垃圾对象引用，只要整条链都不可达，它们会一起被回收；反过来，一个对象即使没人直接引用它，只要静态字段还指着它，它就活着。' },
      { p: '这里要引入“安全点”（Safepoint）的概念：GC 不能在任何时刻随意暂停线程，必须等线程走到安全点，比如方法调用、循环回边、异常跳转。所以“GC 暂停”并不是瞬间发生的，日志里的停顿时间也不等于整个标记过程的耗时。' },

      { h: '2.3 三种基础回收算法' },
      { p: '所有收集器都是三种基础算法的组合或变体。理解它们的取舍，比背收集器名字重要得多。' },
      { table: { head: ['算法', '做法', '优点', '缺点', '典型场景'], rows: [
        ['标记-清除', '标记存活对象，清除未标记的', '实现简单，不需要移动对象', '产生碎片，大对象可能找不到连续空间', 'CMS 老年代'],
        ['标记-复制', '存活对象复制到另一半空间，清空原空间', '无碎片，分配快', '浪费空间，复制有成本', '新生代、G1 的 Evacuation'],
        ['标记-整理', '存活对象向一端移动，清理边界外内存', '无碎片，不浪费空间', '移动对象要更新引用，成本高', '老年代、Serial Old']
      ] } },
      { p: '标记-清除的问题是碎片：回收后内存里到处是空洞，虽然总空闲空间够，但可能找不到一块连续的区域放一个大数组，于是提前触发下一次 GC。标记-复制解决了碎片，但要把空间分成两半，利用率低；新生代用 8:1:1 的布局把这个浪费压到了 10%。' },
      { p: '标记-整理介于两者之间：不浪费空间也不产生碎片，代价是移动对象后必须更新所有指向它的引用，而且移动过程必须暂停用户线程。所以它适合老年代这种“回收次数少、存活对象多”的场景。' },
      { p: '分代收集不是第四种算法，而是一种策略：按对象的年龄把它们放在不同区域，对不同区域用最合适的算法。理解了这一点，再看收集器就只是“在哪个区域、用哪种算法、开几个线程、要不要并发”的组合。' },
      { p: '还有一个绕不开的难题：并发标记期间的“漏标”。用户线程一边跑一边改引用，可能刚建立“已标记对象 → 新对象”的引用，标记线程却已经处理完那个对象，新对象就被漏掉了。解决办法有两类：增量更新（CMS 采用）把被修改的引用记录下来，重新标记阶段以这些引用为根再扫一遍；原始快照 SATB（G1 采用）把被删除的引用记录下来，按标记开始那一刻的对象图快照来算，新建立的关系不追。两者都靠写屏障在引用赋值时插入一小段记录逻辑，代价是每次赋值多几条指令。' },

      { h: '2.4 分代假说与堆的布局' },
      { p: '分代的依据是三条经验规律，合称分代假说。弱分代假说：绝大多数对象朝生夕死，比如一次请求里创建的 DTO、字符串、临时集合，用完就扔。强分代假说：熬过越多次回收的对象越难死，比如缓存、连接池、配置对象。跨代引用假说：老年代引用新生代对象的情况很少，只占极少数。' },
      { p: '基于前两条，堆被分成新生代和老年代：新生代用复制算法，因为存活对象少，复制成本低；老年代用标记-清除或标记-整理，因为存活对象多，不适合大量复制。基于第三条，不需要为了少数跨代引用去扫描整个老年代，而是在新生代维护记忆集（Remembered Set），记录哪些老年代区域引用了新生代。' },
      { p: 'HotSpot 的新生代默认是 Eden : Survivor0 : Survivor1 = 8 : 1 : 1，也就是每次只有 10% 的空间被浪费，因为两个 Survivor 总有一个是空的。这个比例由 <code>-XX:SurvivorRatio=8</code> 控制，一般不建议改：调大 Survivor 能减少晋升，但 Eden 变小会让 Minor GC 更频繁。' },
      { p: '分配还有一个常被忽略的细节：TLAB。每个线程在 Eden 里预先划走一小块私有区域，分配对象时只移动自己那块区域的指针，不需要原子操作，也不需要和别的线程争锁。TLAB 用完再申请新的一块，直到 Eden 整体耗尽。所以“Eden 满了”在代码层面常常表现为“当前线程的 TLAB 用完了”。TLAB 默认开启，用 <code>-XX:+UseTLAB</code> 控制，<code>-XX:TLABSize</code> 可以指定初始大小，一般不需要手动调。' },
      { flow: ['新对象分配在 Eden', 'Eden 满触发 Minor GC', '存活对象复制到 Survivor', '对象年龄加一', '年龄达阈值或 Survivor 装不下', '晋升老年代', '老年代满触发 Full GC'] },
      { p: '需要强调的是，“新生代/老年代”是逻辑划分。G1 之后堆被切成大小相等的 Region，每个 Region 动态扮演 Eden、Survivor、Old 或 Humongous，但从回收策略上看，分代的思想依然保留：年轻代回收频繁且快，老年代回收稀少且慢。' },

      { h: '2.5 一次 Minor GC 的完整过程' },
      { p: '新对象优先在 Eden 的 TLAB 里分配。Eden 满了，触发一次 Minor GC（也叫 Young GC），整个过程分五步：' },
      { ol: [
        '暂停所有用户线程（Stop The World），因为接下来要移动对象地址。',
        '从 GC Roots 出发标记新生代中的存活对象，包括老年代通过记忆集指向它们的引用。',
        '把存活对象复制到空的 Survivor 区（或直接晋升老年代），复制后对象的年龄加一。',
        '清空 Eden 和刚才用过的 Survivor，两个 Survivor 角色互换。',
        '恢复用户线程，后续分配继续在 Eden 中进行。'
      ] },
      { p: '为什么用复制而不是清除？因为新生代存活率通常不到 10%，复制少量存活对象比清除大量垃圾更快，而且复制天然整理，不会产生碎片，后续分配可以用指针碰撞，速度极快。' },
      { p: '对象晋升老年代有几种情况。第一，年龄达到阈值 <code>-XX:MaxTenuringThreshold</code>，默认 15，G1 最大也是 15。第二，动态年龄判定：Survivor 中一批相同年龄的对象大小总和超过 Survivor 空间的一半，年龄大于等于该年龄的对象直接晋升，不需要等到 15。第三，大对象直接进老年代，参数 <code>-XX:PretenureSizeThreshold</code>，但它只对 Serial 和 ParNew 有效，G1 用 Humongous 区域处理大对象。' },
      { p: '还有一个容易被忽略的机制：空间分配担保。Minor GC 之前，JVM 会检查老年代最大可用连续空间是否大于新生代所有对象的总大小；如果不大于，就看是否允许担保失败，允许则尝试 Minor GC，否则直接改成 Full GC。这样做的目的是避免 Minor GC 之后存活对象无处可放。' },
      { p: '最后是 Stop The World。即使是最快的 Young GC，也要暂停所有用户线程，因为标记和复制过程中对象地址在变，用户线程不能同时访问。停顿时间与存活对象数量成正比，这也是“新生代不能无限大”的原因：新生代越大，单次回收要复制的存活对象越多，停顿越长。' },

      { h: '2.6 收集器家族：从 Serial 到 ZGC' },
      { p: '收集器的发展史，就是一部“减少停顿”的历史。下表按出现顺序排列，重点看每个收集器解决了什么问题、又引入了什么代价：' },
      { table: { head: ['收集器', '作用区域', '算法', '特点', '启用方式'], rows: [
        ['Serial', '新生代', '复制', '单线程，简单，停顿长', '-XX:+UseSerialGC'],
        ['ParNew', '新生代', '复制', 'Serial 的多线程版，配合 CMS', '-XX:+UseParNewGC'],
        ['Parallel Scavenge', '新生代', '复制', '吞吐优先，适合批处理', '-XX:+UseParallelGC'],
        ['Parallel Old', '老年代', '标记-整理', '与 Parallel Scavenge 搭配', '随 UseParallelGC 启用'],
        ['CMS', '老年代', '标记-清除（并发）', '低停顿，有碎片和浮动垃圾', '-XX:+UseConcMarkSweepGC（已移除）'],
        ['G1', '整堆 Region', '复制 + 标记-整理', '可预测停顿，JDK 9+ 默认', '-XX:+UseG1GC'],
        ['ZGC', '整堆', '染色指针 + 读屏障', '亚毫秒停顿，支持 TB 级堆', '-XX:+UseZGC']
      ] } },
      { p: 'Serial 是最古老的收集器，单线程，Client 模式下的默认选择。它停顿时间长，但简单、没有线程交互开销，在单核或小内存环境里反而效率高。今天它主要用于桌面应用和小型服务。' },
      { p: 'Parallel Scavenge 关注吞吐量，也就是用户代码时间占总时间的比例，适合后台批处理、离线计算这类“只关心跑完，不关心单次卡顿”的场景。它提供 <code>-XX:MaxGCPauseMillis</code> 和 <code>-XX:GCTimeRatio</code> 两个目标参数，但吞吐和停顿本身是矛盾的，调小停顿必然增加回收频率。' },
      { p: 'CMS 是第一个并发收集器，追求低停顿。它的四个阶段是：初始标记（STW，只标记直接可达对象）、并发标记（与用户线程同时跑）、重新标记（STW，修正并发期间的引用变化）、并发清除。缺点很明显：占用 CPU、产生浮动垃圾、标记-清除导致碎片；碎片严重时会退化成单线程的 Serial Old 做 Full GC，停顿反而更长。JDK 9 标记废弃，JDK 14 正式移除。' },
      { p: 'G1 把堆分成大小相等的 Region，优先回收“垃圾最多、收益最高”的 Region，所以叫 Garbage First。它用 <code>-XX:MaxGCPauseMillis</code> 设置目标停顿（默认 200ms），通过预测模型选择本次回收哪些 Region。JDK 9 起成为默认收集器，适合大多数在线服务。' },
      { p: 'ZGC 用染色指针把标记信息存在指针里，再用读屏障在访问对象时做修正，绝大部分工作并发完成，停顿控制在毫秒级甚至亚毫秒级，支持 TB 级堆。JDK 11 实验引入，JDK 15 转正，JDK 21 支持分代 ZGC。代价是吞吐略低、内存占用更高，适合大堆、低延迟场景。' },

      { h: '2.7 G1 的 Region 与可预测停顿' },
      { p: 'G1 的堆是一组 Region，每个 Region 大小相同，由 <code>-XX:G1HeapRegionSize</code> 指定（默认根据堆大小推算，范围 1MB 到 32MB，必须是 2 的幂）。每个 Region 在逻辑上扮演 Eden、Survivor、Old 或 Humongous 角色，Humongous 用来放超过 Region 一半的大对象，它连续占用多个 Region。' },
      { p: '一次 Young GC 只回收 Eden 和 Survivor。当老年代占用超过阈值（<code>-XX:InitiatingHeapOccupancyPercent</code>，默认 45%），触发并发标记周期；标记完成后进入 Mixed GC，同时回收年轻代和部分老年代 Region。这两个阶段交替出现，形成 G1 的回收节奏。' },
      { p: '<code>-XX:MaxGCPauseMillis</code> 是软目标，不是硬保证。G1 会根据历史数据预测每个 Region 的回收耗时，在目标时间内尽量多回收。设得太小（比如 20ms）会导致每次只回收很少 Region，垃圾堆积，最终触发 Full GC，结果反而更糟。' },
      { p: 'G1 的 Full GC 在 JDK 10 之前是单线程的，非常慢；JDK 10 起改为并行。所以“用了 G1 就不会 Full GC”是误解，它只是尽量避免，一旦发生，代价依然很高。' },
      { lang: 'java', code: 'import java.lang.management.GarbageCollectorMXBean;\nimport java.lang.management.ManagementFactory;\n\npublic class CollectorInfo {\n    public static void main(String[] args) {\n        for (GarbageCollectorMXBean bean : ManagementFactory.getGarbageCollectorMXBeans()) {\n            System.out.println(bean.getName()\n                    + " 回收次数=" + bean.getCollectionCount()\n                    + " 累计耗时=" + bean.getCollectionTime() + "ms");\n        }\n    }\n}', title: 'CollectorInfo.java' },
      { out: 'G1 Young Generation 回收次数=3 累计耗时=47ms\nG1 Old Generation 回收次数=0 累计耗时=0ms' },
      { p: '在别的收集器下，输出的名字会变成 PS Scavenge / PS MarkSweep（Parallel）、MarkSweepCompact（Serial）等。这个 API 适合做简单的监控埋点，但要拿到每次停顿的细节，还是得看 GC 日志。' },

      { h: '2.8 finalize 与 Cleaner：为什么不要依赖' },
      { p: '<code>finalize</code> 是 Object 的方法，对象被回收前“可能”被调用一次。它不可靠：不保证执行、不保证及时、只执行一次、执行后对象还可能“复活”，而且会让对象多存活至少一轮 GC，拖慢回收。JDK 9 起它被标记为废弃，JDK 18 标记为 for removal。' },
      { lang: 'java', code: 'public class FinalizeDemo {\n    static class Resource {\n        byte[] data = new byte[1024 * 1024];\n\n        @Override\n        protected void finalize() {\n            System.out.println("finalize 被调用");\n        }\n    }\n\n    public static void main(String[] args) throws Exception {\n        new Resource();\n        System.gc();\n        Thread.sleep(500);\n        System.out.println("主线程结束");\n    }\n}', title: 'FinalizeDemo.java' },
      { out: 'finalize 被调用\n主线程结束\n（顺序和是否输出都不保证，取决于 JVM 实现与回收时机）' },
      { p: '正确做法：文件、连接、锁这类资源用 try-with-resources 或在 finally 里显式关闭；确实需要兜底清理时用 <code>java.lang.ref.Cleaner</code>，把清理动作放在独立的 Runnable 里，避免匿名内部类持有外部对象，导致对象永远无法回收。' },
      { note: '<b>三条禁令：</b>不要用 finalize 写业务逻辑；不要依赖 System.gc() 控制时机；不要在 finalize 里让对象重新被引用——那是最危险的“复活”，会让内存彻底失控。' },

      { h: '2.9 读懂 GC 日志' },
      { p: 'JDK 9 起统一使用 <code>-Xlog</code>，旧的 <code>-XX:+PrintGCDetails</code> 已经废弃。最常用的开启方式是把所有 gc 相关的标签输出到文件，并带上时间戳和运行时长：' },
      { lang: 'shell', code: 'java -Xms2g -Xmx2g -Xlog:gc*:file=gc.log:time,uptime,level,tags -jar app.jar\n\n# 只看停顿，输出到控制台\njava -Xlog:gc:stdout -jar app.jar', title: '开启 GC 日志' },
      { lang: 'java', code: 'public class GcLogDemo {\n    public static void main(String[] args) {\n        for (int i = 0; i < 20; i++) {\n            byte[] block = new byte[4 * 1024 * 1024];\n            if (i % 5 == 0) {\n                System.out.println("第 " + i + " 轮");\n            }\n        }\n        System.out.println("结束");\n    }\n}', title: 'GcLogDemo.java' },
      { out: '[0.412s][info][gc] GC(0) Pause Young (Normal) (G1 Evacuation Pause) 24M->3M(64M) 2.113ms\n第 0 轮\n[0.620s][info][gc] GC(1) Pause Young (Normal) (G1 Evacuation Pause) 45M->6M(64M) 2.884ms\n第 5 轮\n... 结束' },
      { p: '这段日志可以拆成几块读：<code>GC(1)</code> 是第几次 GC；<code>Pause Young</code> 表示年轻代停顿，括号里是触发原因；<code>45M-&gt;6M(64M)</code> 表示回收前用了 45M、回收后剩 6M、堆总容量 64M；最后的 <code>2.884ms</code> 是这次停顿的耗时。' },
      { p: '看日志重点关注三件事：频率（多久一次）、停顿（单次多久、P99 是多少）、回收效果（每次能降多少）。如果每次回收后老年代占用都在上涨，说明有对象在持续晋升，要么是合理的缓存，要么是泄漏；如果 Full GC 频繁出现，日志里会写 <code>Pause Full (Allocation Failure)</code> 或 <code>Pause Full (G1 Compaction Pause)</code>，这是明确的危险信号。' },
      { p: '除了看单次日志，还要算两个汇总指标。一是 GC 时间占比，用 jstat 输出里的 GCT 除以进程运行时间，经验上超过 5% 就值得关注，超过 10% 通常说明参数或代码有问题。二是停顿分位数，把每次停顿排序看 P99，因为平均值会被大量极短的 Young GC 稀释，掩盖偶发的百毫秒级长停顿。线上接口的延迟抖动，往往就是这几次长停顿造成的，而平均值看起来一切正常。' },

      { h: '2.10 频繁 Full GC 的排查' },
      { p: '典型症状：接口 P99 从 50ms 涨到 2s，日志里 Full GC 每隔几秒一次，老年代占用在回收后仍然很高。下面这段代码故意让静态缓存无限增长，模拟最常见的一类泄漏：' },
      { lang: 'java', code: 'import java.util.HashMap;\nimport java.util.Map;\n\npublic class LeakDemo {\n    static final Map<Long, byte[]> CACHE = new HashMap<>();\n\n    public static void main(String[] args) {\n        for (long i = 0; ; i++) {\n            CACHE.put(i, new byte[512 * 1024]);\n            if (i % 20 == 0) {\n                Runtime rt = Runtime.getRuntime();\n                long used = (rt.totalMemory() - rt.freeMemory()) / 1024 / 1024;\n                System.out.println("i=" + i + " 已用堆=" + used + " MB 缓存条目=" + CACHE.size());\n            }\n        }\n    }\n}', title: 'LeakDemo.java' },
      { out: 'i=0 已用堆=3 MB 缓存条目=1\ni=20 已用堆=13 MB 缓存条目=21\n...\nException in thread "main" java.lang.OutOfMemoryError: Java heap space' },
      { p: '配 <code>-Xmx64m</code> 运行，很快就会看到堆被吃满。真实项目里缓存的键往往是用户 ID、商品 ID，增长速度和业务量成正比，所以表现是“运行几小时后 OOM，重启就好”。' },
      { p: '定位第一步是 <code>jstat -gcutil</code>，每秒打印一次各区域的占用比例和 GC 次数：' },
      { lang: 'shell', code: 'jps -l\njstat -gcutil 12345 1000', title: '观察 GC 趋势' },
      { out: '  S0     S1     E      O      M     CCS    YGC     YGCT    FGC    FGCT     GCT\n  0.00  96.88  45.20  98.61  95.12  92.40     18    0.312     7    2.845    3.157\n  0.00  98.02  12.30  99.02  95.30  92.55     19    0.330     8    3.402    3.732' },
      { p: 'O 列（老年代使用率）一直接近 100%，FGC 持续增长，GCT 占总运行时间的比例越来越高，基本可以判定是泄漏或堆太小。接着用 <code>jmap -histo:live &lt;pid&gt; | head -30</code> 看存活对象排行；如果 <code>[B</code>（byte 数组）和 <code>java.util.HashMap$Node</code> 排在最前面，且数量和业务量成正比，方向就明确了。' },
      { p: '修复思路：给缓存加容量上限和过期时间（Caffeine、Guava Cache），用弱引用或软引用持有可回收的数据，定期清理，避免用静态集合保存请求级对象。调大 <code>-Xmx</code> 只能推迟问题，不能解决泄漏。' },
      { p: '另一个常见诱因是显式调用 <code>System.gc()</code>：有些老代码在关键路径上调用它，等于主动触发 Full GC。可以用 <code>-XX:+DisableExplicitGC</code> 屏蔽，但改之前要确认没有库依赖它——现代 NIO 的直接内存回收靠 Cleaner，不依赖 System.gc()，一般可以安全屏蔽。' },

      { h: '2.11 调优原则与常用参数' },
      { p: '调优有三个目标：吞吐量、停顿时间、内存占用。三者不可能同时最优，这就是常说的“不可能三角”。批处理任务追求吞吐，可以容忍长停顿；在线接口追求低停顿，宁可多花 CPU；容器环境还要考虑内存上限，堆不能把容器撑爆。' },
      { p: '步骤永远是：先测量（GC 日志 + 监控），再定位（泄漏、容量不足还是参数不当），最后验证（压测对比）。没有测量就没有调优，凭感觉加参数只会把问题挪个位置。' },
      { list: [
        '堆大小：<code>-Xms2g -Xmx2g</code>，初始值和最大值相等，避免扩容抖动。',
        '新生代：<code>-Xmn1g</code> 或 <code>-XX:NewRatio=2</code>，新生代越大，Minor GC 越少但单次越久。',
        '晋升阈值：<code>-XX:MaxTenuringThreshold=6</code>，G1 下默认 15，最大 15。',
        '停顿目标：<code>-XX:MaxGCPauseMillis=200</code>，只对 G1 等支持目标停顿的收集器有效。',
        '并发线程：<code>-XX:ParallelGCThreads=8</code>、<code>-XX:ConcGCThreads=2</code>，容器里要按 CPU 限额设置。',
        '并发标记阈值：<code>-XX:InitiatingHeapOccupancyPercent=45</code>，老年代占用超过它就启动并发标记。',
        '日志与现场：<code>-Xlog:gc*:file=gc.log:time,uptime,level,tags</code> 加 <code>-XX:+HeapDumpOnOutOfMemoryError</code>。'
      ] },
      { p: '几个典型反模式：把 <code>-Xmx</code> 调到物理内存的 90%，留不出堆外内存和系统空间；新生代设得过大，单次 Young GC 变成几百毫秒；把 <code>MaxGCPauseMillis</code> 设成 10ms，导致回收过于频繁、吞吐暴跌；不看日志就照搬网上的“优化参数”。' },

      { h: '2.12 本章小结' },
      { list: [
        'Java 用可达性分析而不是引用计数，循环引用会被正常回收。',
        'GC Roots 包括栈引用、静态变量、常量、JNI 引用、JVM 内部引用等；安全点决定 GC 何时能暂停线程。',
        '分代假说带来新生代与老年代：新生代复制、老年代标记-清除或标记-整理；跨代引用靠记忆集处理。',
        '收集器从 Serial 到 G1 再到 ZGC，本质是在吞吐、停顿、内存之间做取舍；G1 是 JDK 9+ 默认。',
        '调优先看日志和监控：频率、停顿、回收效果；频繁 Full GC 优先怀疑泄漏，而不是急着调大堆。'
      ] },

      { h: '2.13 常见追问' },
      { list: [
        '<b>问：为什么 Java 不用引用计数？</b><br>答：引用计数处理不了循环引用，A 引用 B、B 又引用 A 时两边计数都不为零，即使外部已经没人引用它们也永远回收不掉；而且每次引用赋值都要维护计数，多线程下还得用原子操作，开销大、容易出错。可达性分析从 GC Roots 出发一次性遍历，能走到的是存活，走不到的一整条环可以一起回收，更可控。',
        '<b>问：Minor GC 和 Full GC 有什么区别？</b><br>答：Minor GC（也叫 Young GC）只回收新生代的 Eden 和 Survivor，存活对象少、复制量小，通常几毫秒到几十毫秒；Full GC 回收整个堆和方法区，可能还带整理与类卸载，停顿往往成百上千毫秒。日志里 Full GC 会写 <code>Pause Full</code>，看到它就说明该查泄漏或堆容量，而不是继续调小停顿目标。频繁 Full GC 而老年代回收后占用不降，基本可以判定为泄漏。',
        '<b>问：对象一定在 Eden 分配吗？</b><br>答：不一定。大对象可以绕过新生代直接进老年代，参数是 <code>-XX:PretenureSizeThreshold</code>，而且只对 Serial 和 ParNew 有效；G1 里超过 Region 一半的对象直接进 Humongous 区；逃逸分析判定不逃逸的小对象可能被标量替换，干脆不分配对象；即使分配在 Eden，也是先落到当前线程的 TLAB 里，TLAB 用完才申请新的一块。',
        '<b>问：G1 一定比 CMS 好吗？</b><br>答：不一定。G1 按 Region 回收并自带整理能力，可以用 <code>-XX:MaxGCPauseMillis</code> 设停顿目标，从 JDK 9 起是默认收集器，适合大多数在线服务；但在小堆、老旧版本或纯吞吐型负载下，Parallel 系列可能更快，CMS 在低延迟老年代回收上也曾经很能打（JDK 14 已移除）。选型要看堆大小、停顿要求和 JDK 版本，不能只看新旧。',
        '<b>问：堆越大越好吗？</b><br>答：不是。堆越大，一次 Full GC 要扫描和整理的对象越多，单次停顿可能反而更长；超过物理内存还会触发 swap，延迟从毫秒级掉到秒级。另外堆太大也会让 GC 线程的标记工作更分散。合理做法是先按业务峰值估容量，再用 GC 日志验证停顿，在「装得下」和「停顿可接受」之间取平衡，而不是把 <code>-Xmx</code> 顶到物理内存的九成。'
      ] },

      { h: '2.14 自测与练习' },
      { ol: [
        '运行 CycleGC，把 WeakReference 换成 static 字段里的强引用（保证该引用在 System.gc() 之后仍被使用）再跑一次，观察对象是否被回收，并解释可达性分析在这两次运行中的差别。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><pre class="tb-ans-code" data-lang="java">import java.lang.ref.WeakReference;\n\npublic class CycleGC {\n  static class Node {\n    Node next;\n    byte[] pad = new byte[1024];\n  }\n\n  static Node HOLD;   // 强引用开关\n\n  public static void main(String[] args)\n      throws Exception {\n    Node a = new Node();\n    Node b = new Node();\n    a.next = b;\n    b.next = a;          // 成环\n\n    WeakReference&lt;Node> w =\n        new WeakReference&lt;>(a);\n    // HOLD = a;         // 改强引用就打开这行\n    a = null;\n    b = null;\n\n    System.gc();\n    Thread.sleep(500);\n    System.out.println("w.get()==null : "\n        + (w.get() == null));\n  }\n}\n\njavac CycleGC.java\njava CycleGC</pre><b>要点</b>：静态字段 HOLD 是 GC Root，可达性分析从根出发能走到就判存活；弱引用不阻止回收，外部引用清空后那对成环对象整体不可达，被一起清掉——环不影响回收，只看有没有根能走到。System.gc() 只是建议，要 sleep 一下才观察得到。</div></details>',
        '用 <code>-Xmx64m -Xlog:gc</code> 运行 GcLogDemo，把日志里每次 GC 的「回收前-&gt;回收后」抄下来，判断有没有对象在持续晋升。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><pre class="tb-ans-code" data-lang="java">public class GcLogDemo {\n  static int sink;\n\n  public static void main(String[] args) {\n    for (int i = 0; i &lt; 60; i++) {\n      byte[] tmp = new byte[4 * 1024 * 1024];\n      sink = tmp.length;\n      if (i % 10 == 0) {\n        System.out.println("第 " + i + " 轮");\n      }\n    }\n  }\n}\n\njavac GcLogDemo.java\njava -Xmx64m -Xlog:gc GcLogDemo\n\n# [0.033s][info][gc] GC(16) Pause Young\n#   (G1 Humongous Allocation) 26M->1M(63M) 0.2ms</pre><b>要点</b>：每行末尾的「回收前->回收后(堆可用大小) 耗时」就是判据：循环里每轮 new 4MB 用完即弃，Eden 填满就 Young GC，回收后一直掉回几 MB 说明没有对象在持续晋升；如果回收后的数值逐次抬升，就是有对象在往老年代堆。4MB 的数组在 G1 里属于 Humongous 对象，日志里会专门标出来。</div></details>',
        '运行 LeakDemo，用 jstat 观察 O 列和 FGC 的变化，再用 jmap -histo 找出占用最多的类，说出你的判断依据。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><pre class="tb-ans-code" data-lang="java">import java.util.HashMap;\nimport java.util.Map;\n\npublic class LeakDemo {\n  // 只 put 不 remove\n  static final Map&lt;Integer, byte[]> CACHE =\n      new HashMap&lt;>();\n\n  public static void main(String[] args)\n      throws Exception {\n    for (int i = 1; ; i++) {\n      CACHE.put(i, new byte[1024 * 512]);\n      if (i % 20 == 0) {\n        System.out.println("条目 " + i);\n        Thread.sleep(200);\n      }\n    }\n  }\n}\n\njavac LeakDemo.java\njava -Xmx64m LeakDemo &amp;\njps -l\njstat -gcutil &lt;pid> 1000\njmap -histo:live &lt;pid> | head -20</pre><b>要点</b>：O 列只涨不降、FGC 次数持续增长就是泄漏；histo 排行前列是 [B 和 java.util.HashMap$Node，实例数与缓存条目数成正比，判断依据是静态字段是 GC Root，这些条目始终可达，GC 只能腾出 Eden 里的临时对象。</div></details>',
        '在一台机器上分别用 <code>-XX:+UseParallelGC</code> 和 <code>-XX:+UseG1GC</code> 跑同一个压测，对比吞吐和 P99 停顿，说明差异的原因。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><pre class="tb-ans-code" data-lang="java">public class GcBench {\n  public static void main(String[] args) {\n    long sum = 0;\n    long t0 = System.nanoTime();\n    for (int i = 0; i &lt; 20000000; i++) {\n      long[] tmp = new long[256];\n      sum += tmp.length + (i % 7);\n    }\n    long ms = (System.nanoTime() - t0)\n        / 1000000;\n    System.out.println("耗时 " + ms + " ms "\n        + sum);\n  }\n}\n\njavac GcBench.java\njava -Xmx256m -XX:+UseParallelGC \\\n  -Xlog:gc:file=parallel.log GcBench\njava -Xmx256m -XX:+UseG1GC \\\n  -Xlog:gc:file=g1.log GcBench\n\ngrep -o "[0-9.]*ms" parallel.log | sort -n \\\n  | tail -3\ngrep -o "[0-9.]*ms" g1.log | sort -n | tail -3</pre><b>要点</b>：两者吞吐往往只差百分之几，差别在停顿分布：Parallel 多线程 STW 复制整理，堆越大单次停顿越长；G1 按 Region 回收，按 MaxGCPauseMillis 挑收益高的先收，用一点吞吐换停顿可控。日志要排序取 P99，不能看平均值。</div></details>',
        '（思考）如果你的服务堆只有 512MB，但要求 P99 小于 100ms，你会选哪个收集器？还需要关注哪些指标？<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><b>预期现象</b>：这题没有唯一答案，能给出取舍理由即可：512MB 属于小堆，G1 通常够用，目标是让单次 Young GC 停在几十毫秒以内。<b>为什么</b>：小堆里 Region 数量少、单次待回收对象也少，G1 的停顿目标容易达成；ZGC 的低停顿优势在大堆才显现，小堆反而多付吞吐和额外内存的代价。<b>要点</b>：用 <code>-Xms512m -Xmx512m</code> 固定堆并给堆外留空间，关注 Young GC 频率（每秒几次）、单次停顿 P99、老年代回收后占用能否回落、FGC 是否为零，以及是否顶到容器内存上限被杀。</div></details>'
      ] },
      { note: '<b>练习提示：</b>第 3 题不要只看报错，重点是用 jstat 的数据建立“老年代只涨不降”的证据；第 5 题没有标准答案，能说出取舍理由比选出名字更重要。' },
    ]
  };

  T['classloading'] = {
    meta: '本章约 5800 字 · 建议 40 分钟 · 配套五阶段流程图、双亲委派示意图与 5 道习题',
    blocks: [
      { h: '3.1 为什么“能跑起来”背后还有一门学问' },
      { p: '你一定遇到过这几个报错：<code>java.lang.ClassNotFoundException</code>、<code>java.lang.NoClassDefFoundError</code>、<code>java.lang.NoSuchMethodError</code>。它们看起来都像“找不到类”，但原因完全不同：有的是 classpath 没配，有的是类初始化失败，有的是同一个类被两个加载器各加载了一份。' },
      { p: '学类加载的第一个收益是排错。第二个收益是理解框架：Spring Boot 的 fat jar 为什么能直接 java -jar 运行？Tomcat 为什么能让两个应用用不同版本的同一个库？热部署、插件化、字节码增强（比如 MyBatis 的 Mapper 代理、Lombok 的编译期改写）背后都是类加载机制。第三个收益是面试与设计能力：双亲委派几乎是 Java 面试的必问题，而它真正值钱的地方在于“什么时候需要打破它”。' },
      { p: '这一章按顺序讲四件事：class 文件长什么样、类从磁盘到内存要经过哪五步、类加载器如何协作、以及这些机制在真实框架里被怎么改造。' },

      { h: '3.2 class 文件：跨平台的中间语言' },
      { p: 'Java 的口号是“一次编写，到处运行”。它能做到这一点，是因为编译产物不是机器码，而是一种与平台无关的二进制格式——class 文件。javac 把 .java 编译成 .class，JVM 再把它读进来解释或编译执行。同一个 class 文件，在 Windows、Linux、macOS 上都能被对应平台的 JVM 加载。' },
      { p: 'class 文件是一串严格的二进制数据，用类似 C 结构体的方式描述，全部采用大端序。开头四个字节是魔数 <code>0xCAFEBABE</code>，JVM 靠它判断“这是不是一个 class 文件”，而不是靠扩展名。紧接着是两个小版本号（minor、major），JVM 会检查版本是否支持：用 JDK 17 编译的 class（major 61）放到 JDK 8 上跑，会直接报 UnsupportedClassVersionError。' },
      { p: '再往后是常量池。它是 class 文件的“资源仓库”，存放字面量（字符串、数字）和符号引用（类名、字段名、方法名、方法描述符）。常量池的每一项都有类型标记，比如 CONSTANT_Utf8 存字符串，CONSTANT_Class 存类名，CONSTANT_Methodref 存方法引用。常量池之后是访问标志、类索引、父类索引、接口表、字段表、方法表、属性表。' },
      { p: '关键在于：class 文件里的方法调用、字段访问，最初都是符号引用——只是一串名字，比如 <code>java/lang/Object."&lt;init&gt;":()V</code>。符号引用要等到类加载的“解析”阶段，才会被替换成指向内存中真实地址的直接引用。这也是“链接”这个词的含义：把一个个名字，接到真实的地址上。' },
      { lang: 'java', code: 'import java.io.DataInputStream;\nimport java.io.FileInputStream;\n\npublic class ClassFileDemo {\n    public static void main(String[] args) throws Exception {\n        String path = ClassFileDemo.class.getResource("ClassFileDemo.class").getPath();\n        try (DataInputStream in = new DataInputStream(new FileInputStream(path))) {\n            int magic = in.readInt();\n            int minor = in.readUnsignedShort();\n            int major = in.readUnsignedShort();\n            System.out.printf("魔数: 0x%X%n", magic);\n            System.out.println("版本: " + major + "." + minor);\n        }\n    }\n}', title: 'ClassFileDemo.java' },
      { out: '魔数: 0xCAFEBABE\n版本: 52.0' },
      { p: '52 对应 Java 8，61 对应 Java 17，65 对应 Java 21。这个数字在排查“环境版本不一致”时非常有用：本地能跑、服务器报 UnsupportedClassVersionError，多半是编译机和运行机的 JDK 版本不同。' },

      { h: '3.3 类加载的五个阶段' },
      { p: '类从 class 文件进入 JVM 内存，要经历加载、验证、准备、解析、初始化五个阶段。注意“加载”只是第一步，和“类加载”这个总称不是一回事。验证、准备、解析三步合称“链接”。' },
      { flow: ['加载：读字节流，生成 Class 对象', '验证：检查格式、语义、字节码安全', '准备：为静态变量分配内存并设零值', '解析：符号引用替换为直接引用', '初始化：执行静态变量赋值与静态代码块'] },
      { table: { head: ['阶段', '主要动作', '常见问题'], rows: [
        ['加载', '通过类的全限定名获取二进制字节流；转成方法区运行时结构；在堆中生成 Class 对象', 'ClassNotFoundException、找不到依赖'],
        ['验证', '文件格式验证、元数据验证、字节码验证、符号引用验证', 'VerifyError、ClassFormatError'],
        ['准备', '为 static 变量分配内存并赋零值（不是代码里的初始值）', '一般无异常，但容易误解初始值'],
        ['解析', '把常量池里的符号引用替换为直接引用', 'NoSuchMethodError、NoSuchFieldError'],
        ['初始化', '执行 clinit 方法：静态变量赋值 + 静态代码块，按源码顺序', 'ExceptionInInitializerError']
      ] } },
      { p: '加载阶段要做三件事：第一，通过类的全限定名获取字节流，来源可以是磁盘、jar、网络、数据库，甚至运行时动态生成；第二，把字节流代表的静态存储结构转成方法区的运行时数据结构；第三，在堆里生成一个代表该类的 java.lang.Class 对象，作为方法区数据的访问入口。' },
      { p: '注意“数组类”的特殊性：数组类本身不通过类加载器创建，而是由 JVM 直接在内存中生成；但数组的元素类型（比如 String）仍然要由对应的类加载器加载。所以 <code>String[].class.getClassLoader()</code> 返回的是加载 String 的加载器，而基本类型数组的加载器是 null。' },
      { p: '验证是 JVM 的安全防线。它要确认字节流符合规范、语义合法、字节码不会跳转到非法位置、不会把 int 当引用用、符号引用能解析到真实存在的类和方法。老教材里那句“用 <code>-Xverify:none</code> 关掉验证”已经失效：该选项在 JDK 13 被废弃、后续版本直接移除，实测 <code>java -Xverify:none -version</code> 报 <code>Unrecognized verification option: -Xverify:none</code>，JVM 根本起不来。验证开销在 HotSpot 里是类加载流程的一部分、由类加载器在加载类时保证，既无需也不能手工关闭；真想省启动时间，该用 AppCDS（<code>-XX:SharedArchiveFile</code>）这类缓存手段。' },
      { p: '验证具体查四类东西。文件格式验证看魔数是不是 0xCAFEBABE、主次版本号是否受当前 JVM 支持、常量池有没有越界索引；元数据验证看这个类有没有父类、是否错误地继承了 final 类、是否实现了接口里的全部抽象方法、字段和方法是否与父类冲突；字节码验证最复杂，要模拟执行，确认操作数栈不会溢出、跳转指令不会跳到方法体之外、类型转换合法；符号引用验证发生在解析时，确认引用的类、字段、方法确实存在且访问权限足够。任何一步失败都会抛 VerifyError 或 ClassFormatError，而不是等到运行时才莫名其妙地崩。' },
      { p: '准备阶段最容易被误解：如果一个类声明了 <code>static int value = 10;</code>，准备阶段结束后 value 是 0，不是 10；赋 10 发生在初始化阶段。但如果是 <code>static final int VALUE = 10;</code> 这种编译期常量，javac 会把它放进常量池，准备阶段就直接是 10。这个差别是很多“静态常量在类加载前就能用”现象的根源。' },
      { p: '解析阶段把符号引用换成直接引用，可以发生在初始化之前，也可以延迟到某个符号引用第一次被使用时——这就是“惰性解析”。它允许类在加载时不必把所有依赖都加载完，加快了启动速度，但也让某些错误推迟到运行时才暴露。' },

      { h: '3.4 初始化：什么时候才真正执行' },
      { p: '初始化阶段执行的是编译器自动生成的 <code>&lt;clinit&gt;</code> 方法，它由静态变量的赋值语句和静态代码块按源码顺序合并而成。注意它不包含实例构造器 <code>&lt;init&gt;</code>，也不包含父类的静态块——父类的 clinit 会先执行。' },
      { p: 'JVM 规范严格规定了“有且只有”六种情况会触发初始化，称为主动引用：' },
      { ol: [
        '遇到 new、getstatic、putstatic、invokestatic 四条指令时，对应的类还没初始化就先初始化它。',
        '使用反射（Class.forName、Method.invoke 等）访问某个类时。',
        '初始化一个类时，如果父类还没初始化，先初始化父类。',
        '虚拟机启动时，先初始化包含 main 方法的主类。',
        '使用动态语言支持（invokedynamic）时，解析到的方法句柄对应的类。',
        '接口中定义了 default 方法，实现类初始化时，该接口要先初始化。'
      ] },
      { p: '除此之外都是被动引用，不会触发初始化。最典型的三个例子：通过子类访问父类的静态字段，只会初始化父类；通过数组定义引用类，比如 <code>User[] users = new User[10]</code>，不会初始化 User；访问编译期常量，比如 <code>static final String NAME = "tom"</code>，不会初始化定义它的类，因为常量在编译时已经被写进调用方的常量池。' },
      { lang: 'java', code: 'class Parent {\n    static { System.out.println("Parent 初始化"); }\n    static int value = 100;\n}\n\nclass Child extends Parent {\n    static { System.out.println("Child 初始化"); }\n}\n\npublic class InitOrder {\n    public static void main(String[] args) {\n        System.out.println("准备访问 Parent.value");\n        System.out.println(Child.value);\n        System.out.println("准备创建数组");\n        Child[] arr = new Child[3];\n        System.out.println("数组长度=" + arr.length);\n    }\n}', title: 'InitOrder.java' },
      { out: '准备访问 Parent.value\nParent 初始化\n100\n准备创建数组\n数组长度=3' },
      { p: '输出里没有“Child 初始化”，因为通过 Child.value 访问的静态字段实际定义在 Parent 中，只有 Parent 被初始化；创建数组只是分配了一个数组对象，元素类型 Child 根本没被加载。' },
      { p: '初始化是线程安全的：JVM 保证 clinit 在多线程下只执行一次，其他线程会阻塞等待。这个特性常被用来实现单例（静态内部类写法），但也要小心：如果 clinit 里做了耗时操作或死锁，其他线程会一直卡在类初始化上，表现为一连串线程 BLOCKED。' },

      { h: '3.5 类加载器与双亲委派' },
      { p: '类加载器负责“通过全限定名获取字节流”这一步。JVM 内置三种：启动类加载器（Bootstrap）、扩展/平台类加载器（Extension/Platform）、应用类加载器（Application）。它们的职责范围不同，形成了一个层次结构。' },
      { table: { head: ['加载器', '加载范围', '实现语言', 'getClassLoader() 结果'], rows: [
        ['Bootstrap', 'JAVA_HOME/lib 下的核心类，如 java.lang.*', 'C++', 'null'],
        ['Extension（JDK 8）', 'JAVA_HOME/lib/ext 下的扩展 jar', 'Java', 'sun.misc.Launcher$ExtClassLoader'],
        ['Platform（JDK 9+）', 'JDK 模块中的平台类', 'Java', 'jdk.internal.loader.ClassLoaders$PlatformClassLoader'],
        ['Application', 'classpath 上的应用类与三方 jar', 'Java', 'sun.misc.Launcher$AppClassLoader'],
        ['自定义', '任意来源：网络、加密文件、数据库', 'Java', '自定义类实例']
      ] } },
      { p: '双亲委派的工作流程是：一个类加载器收到加载请求，先不自己加载，而是委派给父加载器；父加载器再委派给它的父加载器，直到 Bootstrap；只有父加载器无法完成（在自己的搜索范围内找不到）时，子加载器才尝试自己加载。所以加载顺序是自下而上委派、自上而下尝试。' },
      { p: 'ClassLoader.loadClass 的默认实现就是这套逻辑的模板：先用 findLoadedClass 查缓存，命中就直接返回；没有命中就委派 parent.loadClass；parent 抛出 ClassNotFoundException 时，才调用自己的 findClass 去搜索。所以自定义加载器通常只该重写 findClass，让 loadClass 保持“先委派、后自找”的顺序；如果你重写了 loadClass 却忘了调 super，双亲委派就断了，JDK 核心类可能被自己的实现覆盖，后果非常隐蔽。' },
      { p: '这个模型解决两个问题。第一，保证核心类唯一：不管你写多少遍 <code>java.lang.String</code>，最终都由 Bootstrap 加载 JDK 里的那一份，避免有人伪造一个 String 类混进运行时。第二，保证类的唯一性：同一个类被同一个加载器加载多次，得到的是同一个 Class 对象；不同加载器加载同名类，会得到两个互不相干的 Class，互相赋值会抛 ClassCastException。' },
      { p: '“类的唯一性”由加载器和全限定名共同决定。判断两个类是否相等，要同时看 <code>getClassLoader()</code> 和全限定名。这就是为什么两个模块各自依赖不同版本的 guava 时，即使类名相同也不会冲突——它们被不同的加载器加载，属于不同的类型。' },
      { lang: 'java', code: 'public class LoaderChain {\n    public static void main(String[] args) {\n        ClassLoader loader = LoaderChain.class.getClassLoader();\n        while (loader != null) {\n            System.out.println(loader.getClass().getName());\n            loader = loader.getParent();\n        }\n        System.out.println("Bootstrap 加载器（C++ 实现，Java 中为 null）");\n\n        System.out.println("String 的加载器: " + String.class.getClassLoader());\n        System.out.println("int 的加载器: " + int.class.getClassLoader());\n    }\n}', title: 'LoaderChain.java' },
      { out: 'jdk.internal.loader.ClassLoaders$AppClassLoader\njdk.internal.loader.ClassLoaders$PlatformClassLoader\nBootstrap 加载器（C++ 实现，Java 中为 null）\nString 的加载器: null\nint 的加载器: null' },
      { p: 'JDK 8 下第一行会是 sun.misc.Launcher$AppClassLoader，第二行是 ExtClassLoader。虽然名字变了，但结构没变：应用加载器的 parent 是平台加载器，平台加载器的 parent 是 null，代表 Bootstrap。' },

      { h: '3.6 双亲委派不是铁律：三次被打破与 Tomcat 的子优先' },
      { p: '双亲委派是一个“推荐模型”，不是强制约束。历史上它被打破过三次，每一次都是为了解决真实的工程问题。' },
      { p: '第一次是 JDK 1.2 之前。那时还没有双亲委派，用户自定义的 ClassLoader 要重写 <code>loadClass</code> 才能加载类。为了兼容老代码，JDK 在 loadClass 里留了后门：先检查 findLoadedClass 是否已加载，再委派父加载器，最后调用 <code>findClass</code>。自定义加载器只要重写 findClass，就既能享受双亲委派，又能加载自己的类。' },
      { p: '第二次是 SPI（服务提供者接口）。JDK 的核心类由 Bootstrap 加载，比如 <code>java.sql.DriverManager</code>；但它的实现类（比如 MySQL 驱动）在 classpath 上，Bootstrap 根本看不见。怎么办？引入线程上下文类加载器（Thread Context ClassLoader）：父加载器“请求”子加载器去加载实现类，方向反了过来。JDBC 4.0 之后用 ServiceLoader 自动发现驱动，底层就是这套机制。' },
      { p: '第三次是热部署与模块化。OSGi 希望每个 bundle 有自己的类加载器，能独立加载、卸载、热替换，这就要求打破“父加载器优先”；Tomcat 也是类似思路，Web 应用优先加载自己的类，避免和容器或其他应用冲突。' },
      { lang: 'java', code: 'import java.sql.Connection;\nimport java.sql.DriverManager;\n\npublic class SpiDemo {\n    public static void main(String[] args) throws Exception {\n        ClassLoader ctx = Thread.currentThread().getContextClassLoader();\n        System.out.println("上下文加载器: " + ctx.getClass().getName());\n        System.out.println("DriverManager 的加载器: " + DriverManager.class.getClassLoader());\n\n        Class<?> driver = Class.forName("com.mysql.cj.jdbc.Driver", true, ctx);\n        System.out.println("驱动类已加载: " + driver.getName());\n\n        Connection conn = DriverManager.getConnection(\n                "jdbc:mysql://localhost:3306/demo", "root", "123456");\n        System.out.println("连接成功: " + conn);\n    }\n}', title: 'SpiDemo.java' },
      { out: '上下文加载器: jdk.internal.loader.ClassLoaders$AppClassLoader\nDriverManager 的加载器: null\n驱动类已加载: com.mysql.cj.jdbc.Driver\n连接成功: com.mysql.cj.jdbc.ConnectionImpl@1b6d3586' },
      { p: '注意第二行是 null：DriverManager 由 Bootstrap 加载。如果没有上下文类加载器，它根本没法看到 classpath 上的 MySQL 驱动。这段代码需要用 <code>java -cp ".:mysql-connector-j.jar" SpiDemo</code> 运行，并且本地有可用的 MySQL。' },
      { p: 'Tomcat 可以同时部署多个 Web 应用，每个应用可能依赖不同版本的 Spring、不同版本的日志库。如果严格双亲委派，所有应用共用一个应用类加载器，必然冲突。所以 Tomcat 为每个应用创建一个 WebAppClassLoader，并改写了加载顺序：' },
      { ol: [
        '先检查自己的已加载类缓存。',
        '优先从 WEB-INF/classes 和 WEB-INF/lib 加载（而不是先委派父加载器）。',
        '找不到再委派给父加载器（Common、Catalina、System）。',
        'JDK 核心类（java.*）始终由 Bootstrap 加载，不允许应用覆盖。'
      ] },
      { p: '这个“子优先”的顺序让每个应用能用自己的库版本，同时通过“禁止覆盖 java.*”保住核心类的安全。代价是：应用之间不能直接传递对象，除非通过共享的接口（由 Common 加载器加载）；共享库要放在 Tomcat 的 lib 目录，而不是应用的 WEB-INF/lib。' },
      { p: '这也解释了为什么在 Tomcat 里用 ThreadLocal 要特别小心：线程是 Tomcat 的线程池创建的，如果应用把对象放进 ThreadLocal 却忘了 remove，线程被回收复用后，这个对象会一直被线程持有，而线程又持有应用的类加载器，最终导致整个应用无法卸载——这就是经典的内存泄漏。' },

      { h: '3.7 自定义类加载器' },
      { p: '写一个自定义加载器并不难：继承 ClassLoader，重写 <code>findClass</code>，在里面读取字节流并调用 <code>defineClass</code>。不要直接重写 loadClass，除非你明确想改变双亲委派的顺序。' },
      { lang: 'java', code: 'import java.io.IOException;\nimport java.nio.file.Files;\nimport java.nio.file.Path;\n\npublic class DirClassLoader extends ClassLoader {\n    private final Path dir;\n\n    public DirClassLoader(Path dir, ClassLoader parent) {\n        super(parent);\n        this.dir = dir;\n    }\n\n    @Override\n    protected Class<?> findClass(String name) throws ClassNotFoundException {\n        String file = name.replace(\'.\', \'/\') + ".class";\n        Path path = dir.resolve(file);\n        try {\n            byte[] bytes = Files.readAllBytes(path);\n            return defineClass(name, bytes, 0, bytes.length);\n        } catch (IOException e) {\n            throw new ClassNotFoundException(name, e);\n        }\n    }\n}', title: 'DirClassLoader.java' },
      { out: '加载器: DirClassLoader@6d06d69c\n实例: demo.Hello@7852e922' },
      { p: '这里把 parent 传成 null，等于让 Bootstrap 当父加载器，所以 demo.Hello 不会被应用加载器抢先加载。如果传 <code>getClass().getClassLoader()</code>，那么 classpath 上已经存在的 demo.Hello 会被父加载器加载，你的 findClass 根本不会执行——这是新手最常踩的坑。反过来说，自定义 ClassLoader 的构造函数第一行就该显式写 <code>super(null)</code> 切断父委派，否则父加载器永远抢先命中，你的 findClass 一次也不会被调用。' },
      { p: 'defineClass 有三条硬性规则：传入的必须是完整的 class 文件字节，从魔数一直到文件结尾，不能只传方法体；同一个加载器对同一个全限定名只能 defineClass 一次，第二次会抛 LinkageError；defineClass 只负责“造类”，不负责“初始化”，初始化仍然要等第一次主动引用。理解这三条，就能解释大部分自定义加载器报出的怪错。' },
      { p: '两个不同的 DirClassLoader 实例加载同一个类，会得到两个不同的 Class 对象。它们的全限定名相同，但 <code>==</code> 比较为 false，互相强转会抛 <code>ClassCastException: demo.Hello cannot be cast to demo.Hello</code>。这个报错看起来很荒谬，但它精确地说明了“类的身份 = 加载器 + 全限定名”。' },

      { h: '3.8 热替换与插件化' },
      { p: '热替换的核心思路：丢弃旧的类加载器，用新的加载器重新加载修改后的类。因为类一旦被加载就无法卸载（只能随加载器一起被回收），所以“卸载类”实际上是“卸载加载器”。' },
      { p: '类被真正回收要同时满足三个条件：该类的所有实例都已被回收；加载它的 ClassLoader 已被回收；该类的 Class 对象没有被任何地方引用，包括反射缓存和常量池。三者缺一不可，所以热替换时必须确保旧加载器没有任何残留引用，否则每次替换都在泄漏一个加载器，元空间会持续上涨，最终抛 OutOfMemoryError: Metaspace。' },
      { lang: 'java', code: 'public class HotSwapDemo {\n    static class Reloader extends ClassLoader {\n        private final byte[] bytes;\n        Reloader(byte[] bytes) { super(null); this.bytes = bytes; }\n        @Override\n        protected Class<?> findClass(String name) {\n            return defineClass(name, bytes, 0, bytes.length);\n        }\n    }\n\n    public static void main(String[] args) throws Exception {\n        byte[] v1 = read("Greeter.class");\n        Class<?> c1 = new Reloader(v1).loadClass("Greeter");\n        System.out.println(c1.getMethod("hello").invoke(c1.getDeclaredConstructor().newInstance()));\n\n        byte[] v2 = read("Greeter_v2.class");\n        Class<?> c2 = new Reloader(v2).loadClass("Greeter");\n        System.out.println(c2.getMethod("hello").invoke(c2.getDeclaredConstructor().newInstance()));\n        System.out.println("两个 Class 是否相同: " + (c1 == c2));\n    }\n\n    static byte[] read(String name) throws Exception {\n        return HotSwapDemo.class.getResourceAsStream(name).readAllBytes();\n    }\n}', title: 'HotSwapDemo.java' },
      { out: 'hello v1\nhello v2\n两个 Class 是否相同: false' },
      { p: '这段代码把同一份类名、不同内容的字节码交给两个加载器，实现了“同一个类名、两种行为”。实际框架（如 JRebel、Spring Boot DevTools）会更复杂：监听文件变化、编译、刷新上下文、清理旧加载器的引用。' },
      { p: '插件化的思路相同：每个插件一个加载器，插件之间通过接口通信，接口由父加载器加载，实现由子加载器加载。这样插件可以独立升级、卸载，互不影响。代价是内存管理要格外小心——只要有一个外部引用指向旧加载器的对象，整个加载器和它加载的所有类都无法回收，这就是“类加载器泄漏”。' },

      { h: '3.9 JDK 9 模块化带来的变化' },
      { p: 'JDK 9 引入了 JPMS（Java Platform Module System），把 JDK 拆成一个个模块，类加载器结构也随之调整：扩展类加载器改名为平台类加载器，Bootstrap 只加载 java.base 等核心模块，平台加载器加载其他标准模块，应用加载器加载 classpath 和模块路径上的类。' },
      { p: '模块化带来两个可见变化。第一，类的可见性受模块描述符约束：一个包只能被一个模块导出，默认情况下模块内部的包对其他模块不可见，反射访问也可能被 <code>--illegal-access</code> 或 <code>opens</code> 限制。第二，JDK 内部 API（如 sun.misc.Unsafe）默认不可访问，编译会警告，运行时可能报 InaccessibleObjectException。' },
      { p: '对普通业务开发来说，模块化最直接的影响是“升级 JDK 后反射报错”。解决办法是在启动参数里加 <code>--add-opens java.base/java.lang=ALL-UNNAMED</code>，或者升级依赖到支持新版本的版本。长期看，应该避免依赖 JDK 内部实现。' },

      { h: '3.10 类加载相关的常见错误' },
      { table: { head: ['错误', '含义', '典型原因', '排查方向'], rows: [
        ['ClassNotFoundException', '加载阶段找不到类', 'classpath 缺 jar、类名拼错、依赖没传递进来', '检查依赖树、类名大小写、jar 是否打进包'],
        ['NoClassDefFoundError', '编译时存在、运行时找不到', 'jar 冲突、类被另一个加载器加载、静态初始化失败后再次访问', '看 caused by、检查加载器、看是否有 ExceptionInInitializerError'],
        ['NoSuchMethodError', '解析阶段找不到方法', '依赖版本不一致，编译用新版本、运行用旧版本', 'mvn dependency:tree 找冲突，统一版本'],
        ['LinkageError / VerifyError', '链接失败', '同一个类被不同版本覆盖、字节码被篡改', '检查重复 jar、字节码增强工具'],
        ['ExceptionInInitializerError', 'clinit 抛异常', '静态块里访问 null、读配置失败、除零', '看 cause，修复静态初始化逻辑']
      ] } },
      { p: 'ClassNotFoundException 和 NoClassDefFoundError 最容易混。前者是“我要加载，但找不到”，通常发生在 <code>Class.forName</code> 或加载器 findClass 时；后者是“这个类之前能加载，但现在初始化失败了”，JVM 会把失败状态缓存下来，第二次访问直接抛 Error，不会重试。所以看到 NoClassDefFoundError，一定要往上翻日志找第一个异常。' },
      { p: 'NoSuchMethodError 几乎总是版本问题：编译时用的是 guava 32，运行时 classpath 里是 20，方法签名对不上。Maven 项目可以用 <code>mvn dependency:tree -Dverbose</code> 找出被覆盖的版本，再用 dependencyManagement 统一。' },
      { p: '还有一个隐蔽的坑：同一个类出现在两个 jar 里，类加载器按 classpath 顺序取第一个。如果两个版本行为不同，就会出现“本地正常、线上异常”的灵异现象。排查方法是打印 <code>clazz.getProtectionDomain().getCodeSource().getLocation()</code>，看这个类到底从哪个 jar 加载的。' },

      { h: '3.11 本章小结' },
      { list: [
        'class 文件是与平台无关的二进制格式，魔数 0xCAFEBABE，版本号决定能否被当前 JVM 加载。',
        '类加载分加载、验证、准备、解析、初始化五步；准备阶段只赋零值，初始化阶段才执行静态赋值与静态块。',
        '只有六种主动引用会触发初始化，数组、父类静态字段、编译期常量都属于被动引用。',
        '类加载器分 Bootstrap、Platform、Application 和自定义；双亲委派保证核心类唯一、类身份唯一。',
        '类的身份 = 加载器 + 全限定名；同名类被不同加载器加载会得到两个不同的 Class。',
        '双亲委派被 SPI、热部署、模块化打破，理解打破的动机比背结论更重要。'
      ] },

      { h: '3.12 常见追问' },
      { list: [
        '<b>问：双亲委派的好处是什么？</b><br>答：一是保证核心类唯一，不管应用里写多少遍 <code>java.lang.String</code>，最终都由启动类加载器加载 JDK 里的那一份，避免核心类被伪造替换；二是保证类身份唯一，同一个加载器下同一个全限定名只会被加载一次，两次拿到的 Class 是同一个对象；三是让加载职责分层，父加载器负责通用类，子加载器只管自己的搜索路径，便于复用与隔离。',
        '<b>问：如何打破双亲委派？</b><br>答：两条路。一是重写 <code>loadClass</code>，把「先委派父加载器」改成「先自己找」，Tomcat 的 WebAppClassLoader 就是子优先，让每个应用用自己那份库版本；二是保留委派顺序，改用线程上下文类加载器 <code>Thread.currentThread().getContextClassLoader()</code>，让父加载器反过来请求子加载器加载，JDBC 的 SPI 就是这么做的。模块化和热部署属于第三类，靠自定义加载器更换搜索范围实现。',
        '<b>问：两个类名相同、加载器不同，能互相转换吗？</b><br>答：不能直接强转，会抛 <code>ClassCastException</code>，报错里两个类名一模一样，看着很荒谬。原因是类的身份等于「加载器 + 全限定名」，两个 Class 对象用双等号比较是 false，JVM 视它们为不同类型。可行做法是让双方实现同一个由父加载器加载的接口，或者通过序列化、反射逐字段复制数据。',
        '<b>问：类什么时候会被卸载？</b><br>答：要同时满足三个条件：该类的所有实例都已被回收；加载它的 ClassLoader 已被回收；该类的 Class 对象没有被任何地方引用，包括反射缓存和常量池引用。三者缺一不可，所以「卸载类」实际上是「卸载加载器」。热部署最容易在这里翻车：漏掉一个静态引用或 ThreadLocal，旧加载器就永远回收不掉，元空间一路涨到 <code>OutOfMemoryError: Metaspace</code>。',
        '<b>问：Class.forName 和 ClassLoader.loadClass 有什么区别？</b><br>答：<code>Class.forName</code> 默认会初始化类，也就是执行静态变量赋值和静态代码块；<code>loadClass</code> 只完成加载（必要时链接），不触发初始化，要等第一次主动使用才执行。所以 JDBC 注册驱动必须用前者，否则静态块里的 <code>DriverManager.registerDriver</code> 不会跑。想只加载不初始化，用三参数版本 <code>Class.forName(name, false, loader)</code> 并显式指定加载器。'
      ] },

      { h: '3.13 自测与练习' },
      { ol: [
        '运行 ClassFileDemo，把输出的版本号和你本机 javac 的版本对应起来，再用 <code>--release 8</code> 编译一次，观察版本号变化。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><pre class="tb-ans-code" data-lang="java">import java.io.DataInputStream;\nimport java.io.InputStream;\n\npublic class ClassFileDemo {\n  public static void main(String[] args)\n      throws Exception {\n    InputStream raw = ClassFileDemo.class\n        .getResourceAsStream(\n            "ClassFileDemo.class");\n    DataInputStream in =\n        new DataInputStream(raw);\n    in.readInt();          // 魔数 CAFEBABE\n    int minor = in.readUnsignedShort();\n    int major = in.readUnsignedShort();\n    System.out.println("版本: " + major\n        + "." + minor);\n    in.close();\n  }\n}\n\njavac ClassFileDemo.java\njava ClassFileDemo\njavac --release 8 ClassFileDemo.java\njava ClassFileDemo\njavap -v ClassFileDemo | head -12</pre><b>要点</b>：major 就是目标字节码版本，8 对应 52，当前 LTS 的 Java 25 对应 69；用低版本 JVM 加载高版本 class 直接抛 UnsupportedClassVersionError，这是「本地能跑、服务器起不来」的头号原因。新版 javac 编 --release 8 会提示「源值 8 已过时」，能编但会告警。</div></details>',
        '运行 InitOrder，把 <code>Child.value</code> 改成 <code>new Child()</code>，预测并验证输出顺序，解释 clinit 与 init 的区别。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><pre class="tb-ans-code" data-lang="java">public class InitOrder {\n  static class Parent {\n    static int value = 100;\n    static {\n      System.out.println("Parent 初始化");\n    }\n  }\n\n  static class Child extends Parent {\n    static {\n      System.out.println("Child 初始化");\n    }\n  }\n\n  public static void main(String[] args) {\n    System.out.println(Child.value);  // 被动引用\n    // new Child();                  // 主动引用\n  }\n}\n\njavac InitOrder.java\njava InitOrder</pre><b>要点</b>：通过子类访问父类继承来的静态字段只是被动引用，只初始化 Parent；new 是主动引用，初始化子类前必须先初始化父类。<clinit> 由静态赋值和静态块按源码顺序合并而成，父类先执行且只执行一次；<init> 是实例构造逻辑，每次 new 都执行。</div></details>',
        '写一个自定义加载器加载 target/classes 下的类，分别用 parent=null 和 parent=应用加载器，观察 findClass 是否被调用。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><pre class="tb-ans-code" data-lang="java">import java.io.IOException;\nimport java.nio.file.Files;\nimport java.nio.file.Path;\n\npublic class MyLoader extends ClassLoader {\n  private final Path dir;\n\n  MyLoader(ClassLoader parent, Path dir) {\n    super(parent);\n    this.dir = dir;\n  }\n\n  @Override\n  protected Class&lt;?> findClass(String name)\n      throws ClassNotFoundException {\n    System.out.println("findClass: " + name);\n    Path f = dir.resolve(name + ".class");\n    try {\n      byte[] b = Files.readAllBytes(f);\n      return defineClass(name, b, 0, b.length);\n    } catch (IOException e) {\n      throw new ClassNotFoundException(name, e);\n    }\n  }\n\n  public static void main(String[] args)\n      throws Exception {\n    Path dir = Path.of("target/classes");\n    ClassLoader app =\n        MyLoader.class.getClassLoader();\n    new MyLoader(null, dir).loadClass("Hello");\n    new MyLoader(app, dir).loadClass("Hello");\n  }\n}\n\n# Hello.java 用正文里的示例类，放在当前目录\njavac -d target/classes Hello.java MyLoader.java\njava -cp target/classes MyLoader</pre><b>要点</b>：只重写 findClass：loadClass 默认先查已加载缓存、再委派父加载器，父能加载成功就轮不到子类的 findClass，所以第二行不打印；同一个加载器对同一个全限定名只能 define 一次，重复 define 会抛 LinkageError。</div></details>',
        '运行 HotSwapDemo，把两个 Class 对象造出的实例强转一次，捕获 ClassCastException，并解释为什么类名相同却不能转。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><pre class="tb-ans-code" data-lang="java">import java.lang.reflect.Constructor;\nimport java.nio.file.Files;\nimport java.nio.file.Path;\n\npublic class HotSwapDemo {\n  static class HotLoader extends ClassLoader {\n    private final Path file;\n\n    HotLoader(Path file) {\n      super(null);      // 不委派父加载器\n      this.file = file;\n    }\n\n    @Override\n    protected Class&lt;?> findClass(String name)\n        throws ClassNotFoundException {\n      try {\n        byte[] b = Files.readAllBytes(file);\n        return defineClass(name, b, 0, b.length);\n      } catch (Exception e) {\n        throw new ClassNotFoundException(name, e);\n      }\n    }\n  }\n\n  public static void main(String[] args)\n      throws Exception {\n    Bird v1 = new Bird();   // classpath 的版本\n    System.out.println(v1.hello());\n\n    ClassLoader l2 =\n        new HotLoader(Path.of("v2/Bird.class"));\n    Class&lt;?> c2 = l2.loadClass("Bird");\n    Object o2 = c2.getDeclaredConstructor()\n        .newInstance();\n    System.out.println("同一个类: "\n        + (o2.getClass() == Bird.class));\n    try {\n      Bird v2 = (Bird) o2;   // 抛 ClassCastException\n      System.out.println(v2.hello());\n    } catch (ClassCastException e) {\n      System.out.println("CCE: " + e.getMessage());\n    }\n  }\n}\n\njavac Bird.java HotSwapDemo.java\n# 改掉 Bird.java 里 hello 的返回文字，再编到 v2/\njavac -d v2 Bird.java\njava HotSwapDemo</pre><b>要点</b>：加载器默认先把请求委派给父加载器，父能加载到同名类就轮不到 findClass，所以这里必须 super(null) 才能真正隔离；两个类由两个不同加载器 define，类的身份是「加载器加全限定名」，JVM 判它们是不同类型，强转抛 ClassCastException 而报错两侧类名完全相同。热替换靠丢弃旧加载器实现，必须清干净所有引用，否则每次替换泄漏一个加载器，最终 OutOfMemoryError: Metaspace。</div></details>',
        '（思考）如果要设计一个插件系统，插件之间需要互相调用，你会怎么划分类加载器和接口？说说如何避免类加载器泄漏。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><b>预期现象</b>：合理设计是接口由父加载器加载、实现由每个插件自己的加载器加载，插件之间只通过共享接口通信，不传具体实现类型。<b>为什么</b>：接口在父加载器里只有一份，双方看到同一个 Class，强转才合法；实现放在各自加载器里，版本冲突被隔离，卸载时只丢一个加载器就够。<b>要点</b>：插件生命周期结束时清空静态引用、注销监听器、把 ThreadLocal remove 掉，用弱引用或显式销毁断开强引用，再用 <code>jcmd &lt;pid&gt; VM.metaspace</code> 观察类数量是否回落。</div></details>'
      ] },
      { note: '<b>练习提示：</b>第 3 题的重点是理解“父加载器能加载时，子加载器不会执行”；第 5 题要同时考虑隔离性（版本冲突）和通信（接口共享）这两个矛盾。' },
    ]
  };

  T['bytecode-tuning'] = {
    meta: '本章约 5900 字 · 建议 40 分钟 · 配套指令对照表、JIT 流程图与 6 个可运行示例',
    blocks: [
      { h: '4.1 为什么“写对”之后还要“写快”' },
      { p: '很多性能问题不是算法错了，而是写了看起来没问题、实际很贵的代码。比如在 for 循环里用 <code>+</code> 拼接字符串，在日志参数里调用 <code>toString()</code>，把 <code>Integer</code> 当计数器做百万次累加。这些问题在单次调用里几乎无感，放到每秒上万次的接口里，就会变成 CPU 100% 和频繁 Young GC。' },
      { p: '要判断“贵不贵”，绕不开两层知识。第一层是字节码：javac 把你的源码翻译成了什么指令，为什么一行简单的自动装箱会变成 <code>Integer.valueOf</code> 调用。第二层是 JIT：这些指令在运行时如何被编译成机器码，哪些优化（内联、逃逸分析、循环展开）会生效，哪些不会。' },
      { p: '这一章的目标不是让你成为编译器专家，而是建立三个能力：看得懂 javap 输出、能定位 CPU/内存/锁三类瓶颈、能写出对 JIT 友好的代码。调优的终点永远是数据和测量，而不是背参数。' },

      { h: '4.2 字节码长什么样' },
      { p: 'class 文件里除了方法字节码，还有常量池、字段表、方法表、属性表。常量池是符号的仓库，字符串、类名、方法名、描述符都以索引形式存在，字节码指令只带索引号，不带明文。描述符用一套紧凑记法表示类型：I 是 int，J 是 long，D 是 double，Ljava/lang/String; 是对象，[I 是 int 数组。看懂描述符，才能读懂 javap 的输出。' },
      { p: '用 <code>javac</code> 编译后，执行 <code>javap -c -p 类名</code> 就能看到反汇编。它展示每个方法的字节码指令、局部变量槽位和异常表。先看一个最简单的例子：' },
      { lang: 'java', code: 'public class BytecodeDemo {\n    public int add(int a, int b) {\n        int c = a + b;\n        return c * 2;\n    }\n\n    public static void main(String[] args) {\n        System.out.println(new BytecodeDemo().add(3, 4));\n    }\n}', title: 'BytecodeDemo.java' },
      { out: 'public int add(int, int);\n  Code:\n     0: iload_1          // 把第 1 个参数 a 压栈\n     1: iload_2          // 把第 2 个参数 b 压栈\n     2: iadd             // 弹出两个 int 相加，结果压栈\n     3: istore_3         // 弹出结果存入第 3 个局部变量槽 c\n     4: iload_3          // 把 c 压栈\n     5: iconst_2         // 常量 2 压栈\n     6: imul             // 相乘\n     7: ireturn          // 返回栈顶 int' },
      { p: '读字节码的关键是记住“栈式虚拟机”这个模型：绝大多数指令都从操作数栈取值，把结果压回栈。所以 <code>a + b</code> 要先把 a、b 依次压栈，再执行 iadd；局部变量表只负责存储，运算必须经过栈。' },
      { p: '指令的命名有规律：前缀表示类型，i 是 int，l 是 long，f 是 float，d 是 double，a 是引用（reference）；后缀表示动作，load 是局部变量到栈，store 是栈到局部变量，add/sub/mul/div 是运算，return 是返回。所以 <code>iload_1</code> 就是“把第 1 个 int 局部变量压栈”。' },
      { p: '还有个细节：<code>iload_0</code> 到 <code>iload_3</code> 是单字节的快捷指令，超过 3 的槽位要用 <code>iload 4</code> 这种带操作数的两字节形式。这就是为什么方法参数最好不超过 4 个——不是语法限制，而是字节码层面的小优化，虽然现代 JIT 早就不在乎这点差异了。' },

      { h: '4.3 常用指令速览' },
      { p: '指令由一个字节的操作码加零到多个操作数组成，所以指令总数最多 256 条。局部变量表下标、常量池索引这些操作数占一到两个字节，这也是为什么一个方法里的局部变量不能超过 65535 个、常量池不能超过 65535 项。字节码是栈式的：大部分指令从操作数栈弹出参数，把结果压回去，只有少数指令直接读写局部变量表。' },
      { table: { head: ['类别', '代表指令', '作用'], rows: [
        ['常量', 'iconst_0、ldc、bipush', '把常量压入操作数栈'],
        ['加载', 'iload、aload、dload', '局部变量 → 操作数栈'],
        ['存储', 'istore、astore', '操作数栈 → 局部变量'],
        ['运算', 'iadd、imul、ddiv、ineg', '算术运算'],
        ['类型转换', 'i2l、i2d、checkcast', '基本类型拓宽、引用类型检查'],
        ['对象', 'new、newarray、getfield、putfield', '创建对象、访问字段'],
        ['调用', 'invokevirtual、invokestatic、invokeinterface、invokedynamic', '四种方法调用'],
        ['控制', 'ifeq、goto、tableswitch、lookupswitch', '条件跳转、循环、switch'],
        ['返回', 'ireturn、areturn、return', '返回或结束 void 方法']
      ] } },
      { p: '四种调用指令的区别很重要。<code>invokestatic</code> 调静态方法，编译期就能确定目标；<code>invokespecial</code> 调构造器、私有方法和 super 方法，也是静态绑定；<code>invokevirtual</code> 调普通实例方法，运行时按实际类型分派，这是多态的实现方式；<code>invokeinterface</code> 调接口方法，同样要运行时查找，但查找方式不同。' },
      { p: 'JDK 7 引入的 <code>invokedynamic</code> 是第五种，它把“调什么方法”的决定权交给一个引导方法（BootstrapMethod），第一次执行时解析并缓存。Lambda 表达式、字符串拼接（JDK 9+ 的 indy 方案）、Kotlin 的一些特性都靠它实现。' },
      { p: '为什么 Lambda 不生成匿名内部类？因为 invokedynamic 更轻量：编译期只生成一个方法句柄的引导逻辑，运行时第一次调用才决定具体实现，避免了每个 Lambda 都产生一个 class 文件的开销。' },

      { h: '4.4 栈帧：方法执行时的内存结构' },
      { p: '每次方法调用都会创建一个栈帧，压入当前线程的虚拟机栈。栈帧包含四部分：局部变量表、操作数栈、动态链接、方法返回地址。方法返回时栈帧弹出，局部变量随之消失——这也是“栈上分配”能成立的前提。' },
      { p: '局部变量表以“槽”（slot）为单位，一个槽 32 位。int、float、引用占一个槽，long、double 占两个槽。实例方法的第 0 个槽固定是 this，所以上面的 add 方法里 a 是槽 1、b 是槽 2、c 是槽 3，和反汇编里的编号完全对应。' },
      { p: '操作数栈的深度在编译期就确定了，写在 class 文件的 Code 属性里（max_stack）。JVM 会检查字节码不会溢出这个深度。动态链接保存的是指向常量池的引用，用于把符号引用解析成直接引用。' },
      { p: '栈帧的大小直接影响递归深度：栈帧越大，同样大小的线程栈能容纳的调用层数越少，越容易 StackOverflowError。默认线程栈大小由 <code>-Xss</code> 控制，Linux 64 位通常 1MB，可以用 <code>-Xss512k</code> 调小以支持更多线程，但递归要相应收敛。' },
      { p: '栈溢出和堆溢出是两回事。前者报 <code>StackOverflowError</code>，通常是无限递归或递归太深；后者报 <code>OutOfMemoryError: Java heap space</code>，是对象太多。还有一种 <code>OutOfMemoryError: unable to create new native thread</code>，是线程数超过系统限制，不是内存不够，别搞混。' },

      { h: '4.5 解释执行与即时编译' },
      { p: '解释器的工作方式很朴素：取一条指令、查表找到对应的例程、执行、再取下一条。优势是启动快、不用等编译；劣势是每条指令都有一次分派开销，而且无法跨指令优化。JIT 的思路相反：先把一段代码整体编译成机器码，之后直接执行，省掉分派，还能做寄存器分配、循环展开和指令重排。两者不是替代关系，而是分工。' },
      { p: 'JVM 执行字节码有两条路径。启动阶段用解释器逐条执行，速度慢但启动快；某个方法被反复调用（变成“热点”），JIT 编译器就把它编译成本地机器码，之后直接执行机器码。两条路径并存，才能在启动速度和峰值性能之间取得平衡。' },
      { flow: ['javac 编译为 class 文件', '类加载进入方法区', '解释器逐条执行字节码', '统计方法调用与循环回边次数', '达到阈值触发 JIT 编译', '生成机器码并替换入口', '后续调用直接执行机器码'] },
      { p: '热点探测有两种方式：基于采样的计数器（定期看线程在哪个方法里）和基于计数器的热点探测（HotSpot 用这种）。方法调用计数器统计 invoke 次数，回边计数器统计循环体执行次数，两者之和超过阈值就触发编译。阈值由 <code>-XX:CompileThreshold</code> 控制，C1 默认 1500，C2 默认 10000。' },
      { p: '编译发生在后台编译线程，不阻塞用户线程；编译完成后，方法的入口地址被替换成机器码，正在执行的栈帧继续用解释方式跑完，下一次调用才走新入口。这个替换过程叫“栈上替换”（OSR），专门处理“循环体很热但方法本身调用不多”的情况。' },

      { h: '4.6 分层编译：C1 与 C2 的分工' },
      { p: 'HotSpot 内置两个 JIT 编译器。C1 编译快、优化保守，适合启动阶段；C2 编译慢、优化激进，能生成接近 C++ 的代码。JDK 7 之后默认开启分层编译，把执行分成五个层次，逐级提升：' },
      { table: { head: ['层级', '编译器', '特点', '典型用途'], rows: [
        ['0', '解释器', '不编译，逐条执行', '启动阶段、只执行一次的方法'],
        ['1', 'C1（无 profiling）', '编译快，只做基础优化', '简单方法、启动期热点'],
        ['2', 'C1（有限 profiling）', '采集少量类型信息', '过渡层'],
        ['3', 'C1（完整 profiling）', '采集完整类型与分支信息', '为 C2 提供数据'],
        ['4', 'C2', '激进优化，生成高质量机器码', '长期运行的热点方法']
      ] } },
      { p: '分层编译的价值在于“先快后好”：应用启动时方法先被 C1 快速编译，立刻获得不错的性能；运行一段时间后，C2 根据收集到的类型信息做深度优化。这就是为什么 Java 服务需要“预热”——刚启动的几分钟，大量方法还在解释执行或 C1 阶段，吞吐只有峰值的几分之一。' },
      { p: '可以用 <code>-XX:-TieredCompilation</code> 关闭分层编译，让方法直接进入 C2，减少预热时间但延长单次编译停顿；也可以 <code>-XX:TieredStopAtLevel=1</code> 只用到 C1，适合短生命周期的命令行工具。' },
      { p: '编译日志能验证这些行为：<code>-XX:+PrintCompilation</code> 会打印每个被编译的方法、层级和耗时。看到某个方法反复出现“made not entrant”（去优化），说明它的假设被打破了，JIT 退回解释执行，这类方法通常是性能热点。' },

      { h: '4.7 方法内联与逃逸分析' },
      { p: '方法内联是 JIT 最重要的优化，没有之一。它把被调用方法的字节码直接嵌入调用方，省掉调用开销，更重要的是为后续优化创造条件：内联之后，常量传播、死代码消除、循环展开才有发挥空间。' },
      { p: '内联的障碍是方法太大。JVM 用 <code>-XX:MaxInlineSize</code>（默认 35 字节码）控制普通方法的内联上限，用 <code>-XX:FreqInlineSize</code>（默认 325）控制热点方法的上限。方法体越大，越难被内联，性能就越依赖调用本身的开销。' },
      { p: '这也解释了一条实践建议：把大方法拆成小方法，不仅可读，还更容易被内联。相反，为了“减少调用”而手工把代码复制到一起，往往适得其反——JIT 本来就能内联，手工复制只会让方法变大、更难优化。' },
      { p: '逃逸分析回答一个问题：这个对象会不会“跑出”当前方法或线程？如果不会，JIT 可以做两种优化。标量替换：把对象拆成几个局部变量，根本不分配对象；栈上分配：对象随栈帧一起销毁，不进入堆。两者都能显著减少 GC 压力。' },
      { lang: 'java', code: 'public class EscapeDemo {\n    static class Point {\n        int x;\n        int y;\n        Point(int x, int y) { this.x = x; this.y = y; }\n    }\n\n    static int sum() {\n        Point p = new Point(3, 4);\n        return p.x + p.y;\n    }\n\n    public static void main(String[] args) {\n        long total = 0;\n        for (int i = 0; i < 10_000_000; i++) {\n            total += sum();\n        }\n        System.out.println(total);\n    }\n}', title: 'EscapeDemo.java' },
      { out: '70000000\n（-XX:+PrintEscapeAnalysis 在产品版 JDK 上用不了：它是诊断版（develop）VM 专用开关，实测直接报“VM option PrintEscapeAnalysis is develop and is available only in debug version of VM”，JVM 起不来；-XX:+PrintEliminateAllocations 同样只在 debug 版 VM 里存在。日常想验证逃逸分析与标量替换，产品版可用的是 -XX:+PrintCompilation 看热点方法有没有被编译、JFR（jdk.ObjectAllocationSample）看对象到底分配了多少，或用 JITWatch 读编译日志里的逃逸分析结论。）' },
      { p: 'sum 方法里的 Point 只在方法内使用，没有返回、没有赋给字段、没有传给其他线程，逃逸分析会判定它不逃逸，进而标量替换成两个 int。循环一千万次也不会产生一千万个对象。' },
      { p: '逃逸分析不是万能的：对象一旦被返回、被存入静态字段、被放入集合并传出方法，就“逃逸”了，只能老老实实分配在堆上。所以不要指望它来拯救糟糕的对象创建习惯——它只是锦上添花。' },

      { h: '4.8 实战：字符串拼接的三种写法' },
      { p: '字符串拼接是最常见的性能陷阱。编译器对 <code>+</code> 的处理在 JDK 8 和 JDK 9 之后不同：JDK 8 用 StringBuilder 的 append 链，JDK 9+ 用 invokedynamic 调用 StringConcatFactory。无论哪种，循环里用 <code>+</code> 都会反复创建中间对象。' },
      { lang: 'java', code: 'public class ConcatDemo {\n    public static void main(String[] args) {\n        int n = 20000;\n\n        long t1 = System.nanoTime();\n        String a = "";\n        for (int i = 0; i < n; i++) {\n            a += i;\n        }\n        long t2 = System.nanoTime();\n\n        StringBuilder sb = new StringBuilder();\n        for (int i = 0; i < n; i++) {\n            sb.append(i);\n        }\n        String b = sb.toString();\n        long t3 = System.nanoTime();\n\n        System.out.printf("加号拼接: %d ms, 长度=%d%n", (t2 - t1) / 1_000_000, a.length());\n        System.out.printf("StringBuilder: %d ms, 长度=%d%n", (t3 - t2) / 1_000_000, b.length());\n    }\n}', title: 'ConcatDemo.java' },
      { out: '加号拼接: 812 ms, 长度=48890\nStringBuilder: 1 ms, 长度=48890' },
      { p: '差距来自复杂度：每次 <code>+=</code> 都要新建一个 String，把旧内容复制进去再追加，总复制量是 O(n²)；StringBuilder 内部是可扩容的 char 数组，追加是摊销 O(1)。两万次就有几百倍差距，二十万次会直接卡死。' },
      { p: '正确做法：循环内拼接用 StringBuilder，并预估容量 <code>new StringBuilder(n * 4)</code> 避免扩容；单行的简单拼接（比如拼 SQL 片段）用 <code>+</code> 没问题，编译器会优化；多线程场景用 StringBuffer 或每线程一个 StringBuilder。' },
      { p: '另一个高频陷阱是日志：<code>log.debug("user: " + user)</code> 即使日志级别是 info，字符串拼接也会执行，还会调用 user.toString()。正确写法是占位符 <code>log.debug("user: {}", user)</code>，或者先判断 <code>if (log.isDebugEnabled())</code>。' },

      { h: '4.9 实战：自动装箱与循环里的对象' },
      { p: '自动装箱让代码更简洁，但代价常被忽略。<code>Integer sum = 0; sum += i;</code> 每次循环都会 <code>Integer.valueOf(i)</code> 再 <code>intValue()</code>，产生大量短命对象；更隐蔽的是 <code>Integer</code> 缓存只覆盖 -128 到 127，超出范围每次都是新对象。' },
      { lang: 'java', code: 'import java.util.ArrayList;\nimport java.util.List;\n\npublic class BoxingDemo {\n    public static void main(String[] args) {\n        long t1 = System.nanoTime();\n        Long sum = 0L;\n        for (long i = 0; i < 10_000_000L; i++) {\n            sum += i;\n        }\n        long t2 = System.nanoTime();\n\n        List<Integer> list = new ArrayList<>();\n        for (int i = 0; i < 1_000_000; i++) {\n            list.add(i);\n        }\n        long t3 = System.nanoTime();\n\n        System.out.printf("Long 累加: %d ms, 结果=%d%n", (t2 - t1) / 1_000_000, sum);\n        System.out.printf("装箱入集合: %d ms, 大小=%d%n", (t3 - t2) / 1_000_000, list.size());\n    }\n}', title: 'BoxingDemo.java' },
      { out: 'Long 累加: 96 ms, 结果=49999995000000\n装箱入集合: 38 ms, 大小=1000000' },
      { p: '如果换成基本类型 <code>long sum = 0L;</code>，累加通常只要几毫秒。一千万次装箱产生一千万个 Long 对象，即使大部分立刻变成垃圾，也足以让 Young GC 频繁触发。在热路径上，能用基本类型就不要用包装类型。' },
      { p: '集合也是对象放大器。<code>new ArrayList&lt;&gt;()</code> 默认容量 10，扩容时按 1.5 倍复制；如果能预估大小，直接 <code>new ArrayList&lt;&gt;(n)</code> 能省掉多次数组复制。HashMap 同理，默认 16、负载因子 0.75，预估容量时要用 <code>expected / 0.75 + 1</code>。' },
      { p: '还有两个常见浪费：在循环条件里调用 <code>list.size()</code>（现代 JIT 通常能优化，但可读性上不如提出去）；在循环里创建 SimpleDateFormat（它线程不安全，正确做法是用 DateTimeFormatter，它是不可变且线程安全的）。' },

      { h: '4.10 微基准与容器化环境' },
      { p: '容器里还有一个 JIT 相关的坑：CPU 限额很低时，JIT 编译线程会和业务线程抢 CPU，启动阶段反而更慢。可以用 <code>-XX:CICompilerCount=2</code> 限制编译线程数，或减少 GC 线程；但更常见的做法是给足 CPU request，别让 JVM 在半个核上跑，然后抱怨它启动慢。' },
      { p: '自己写 <code>System.nanoTime()</code> 前后计时，几乎一定会得到错误结论：JIT 可能把整个循环优化掉，预热不足导致数据失真，垃圾回收的时机随机。JMH 是 OpenJDK 官方的微基准框架，负责预热、统计、防止死代码消除。' },
      { lang: 'java', code: 'import org.openjdk.jmh.annotations.*;\nimport org.openjdk.jmh.runner.Runner;\nimport org.openjdk.jmh.runner.options.OptionsBuilder;\n\nimport java.util.concurrent.TimeUnit;\n\n@BenchmarkMode(Mode.AverageTime)\n@OutputTimeUnit(TimeUnit.NANOSECONDS)\n@Warmup(iterations = 3, time = 1)\n@Measurement(iterations = 5, time = 1)\n@Fork(1)\n@State(Scope.Thread)\npublic class StringBenchmark {\n    private int value = 42;\n\n    @Benchmark\n    public String concat() {\n        return "value=" + value;\n    }\n\n    @Benchmark\n    public String builder() {\n        return new StringBuilder().append("value=").append(value).toString();\n    }\n\n    public static void main(String[] args) throws Exception {\n        new Runner(new OptionsBuilder()\n                .include(StringBenchmark.class.getSimpleName())\n                .build()).run();\n    }\n}', title: 'StringBenchmark.java' },
      { out: 'Benchmark                  Mode  Cnt   Score   Error  Units\nStringBenchmark.builder    avgt    5  18.420 ± 0.512  ns/op\nStringBenchmark.concat     avgt    5  19.037 ± 0.634  ns/op' },
      { p: '结果可能出乎意料：单次拼接时，<code>+</code> 和 StringBuilder 几乎一样快，因为 JDK 9+ 的 indy 方案已经足够高效，而且 JIT 会把两者优化成相近的形态。所以“一律用 StringBuilder”并不准确——循环里必须用，单次拼接没必要。' },
      { p: '日志是另一个重灾区。很多团队在线上把日志级别调到 info，但代码里留着大量 debug 级别的拼接日志，即使不输出，字符串拼接和 toString 也照常执行。改成占位符写法后，参数只会在真正输出时才转成字符串，这是最容易拿到的一笔性能收益。' },
      { p: 'JMH 的注意事项：必须用 Maven/Gradle 引入依赖并用注解处理器生成基准代码；每个基准方法只做一件事；用 Blackhole 消费返回值防止死代码消除；不要在基准方法里写 IO 或 sleep；<code>@Fork</code> 至少要 1，避免同一个 JVM 里的状态污染。' },
      { p: '微基准解决“测得准”，容器化解决“跑得对”。容器里跑 Java 有两个经典坑。第一，JDK 8 早期版本识别不到 cgroup 限制，会按物理机内存设置默认堆，容器一启动就被 OOM Killer 杀掉。第二，CPU 限额导致 GC 线程数和 JIT 编译线程数按物理核数设置，线程过多反而互相抢 CPU。' },
      { list: [
        '<code>-XX:+UseContainerSupport</code>：JDK 10+ 默认开启，让 JVM 读取 cgroup 的 CPU 和内存限制。',
        '<code>-XX:MaxRAMPercentage=75.0</code>：按容器内存的百分比设置最大堆，比写死 -Xmx 更通用。',
        '<code>-XX:ActiveProcessorCount=4</code>：显式指定可用核数，避免 GC 线程数超标。',
        '<code>-XX:+ExitOnOutOfMemoryError</code>：OOM 时直接退出，交给编排系统重启，避免僵死。',
        '<code>-XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=/dump</code>：留现场，但要注意磁盘空间。'
      ] },
      { p: '堆外内存也要算进容器限额：Netty 的直接内存、JVM 自身的元空间、线程栈、代码缓存、GC 结构都要占空间。一个常见的经验是堆占容器内存的 70% 到 75%，剩下留给堆外；如果用了大量直接内存，还要再往下调。' },
      { p: '另一个容器特有的问题是 CPU 限流：<code>-XX:ParallelGCThreads</code> 默认按核数计算，容器只给 2 核但 JVM 以为有 32 核，就会开几十个 GC 线程，每次 GC 都在抢那 2 核，停顿反而变长。JDK 10+ 的 UseContainerSupport 会修正这一点，老版本必须手动设置。' },

      { h: '4.11 三类常见性能瓶颈与工具清单' },
      { p: '线上排查性能问题，先分类，再找工具。绝大多数问题落在三类里：CPU 打满、GC 频繁、锁竞争。三类的现象和工具完全不同，混在一起查会浪费大量时间。' },
      { table: { head: ['类型', '典型现象', '首选工具', '常见原因'], rows: [
        ['CPU 高', 'load 高、CPU 使用率接近 100%、接口变慢', 'top -Hp、jstack、async-profiler', '死循环、正则回溯、序列化、加密计算、频繁 GC 线程'],
        ['GC 频繁', '日志里 Young GC 密集、停顿抖动、吞吐下降', 'jstat、GC 日志、JFR', '对象创建过多、堆太小、缓存无上限'],
        ['锁竞争', 'CPU 不高但 RT 高、线程大量 BLOCKED', 'jstack、JFR、arthas thread', 'synchronized 粒度过大、锁顺序不一致、连接池过小']
      ] } },
      { p: 'CPU 高的排查套路：先用 <code>top -Hp &lt;pid&gt;</code> 找出占 CPU 最高的线程，把线程 ID 转成十六进制，再到 <code>jstack &lt;pid&gt;</code> 的输出里搜这个 nid，就能看到它正在执行的方法栈。连续采样三次，如果都是同一个方法，基本可以锁定热点。' },
      { p: '锁竞争的排查类似：jstack 里搜 <code>BLOCKED</code>，看它们在等哪个锁、持锁线程在干什么。如果大量线程卡在同一个 <code>synchronized</code> 方法上，说明锁粒度太大，考虑缩小临界区、分段锁或改用并发容器。' },
      { p: 'GC 频繁的排查在上一章讲过：先看 jstat 的 O 列和 FGC，再看 GC 日志的回收效果。这里补一个容易忽略的点：如果 CPU 高但业务线程栈看不出热点，可能是 GC 线程在抢 CPU，先排除 GC 再谈业务优化。' },
      { p: '还有一个隐蔽的瓶颈是“假 CPU 高”：容器里 CPU 被限流（throttling），应用线程被操作系统反复挂起，表现为 RT 抖动但 CPU 使用率不高。用 <code>cat /sys/fs/cgroup/cpu.stat</code> 看 nr_throttled 是否增长，能快速确认。' },
      { p: '三类瓶颈的判断方法也不同：CPU 高且 GC 正常，多半是算法或锁竞争，用火焰图看热点；CPU 不高但延迟高，先看 GC 停顿和线程阻塞，用 jstack 找 BLOCKED 和 WAITING；内存持续上涨且回收后不下降，用 jmap -histo 找对象大户。不要一上来就调参数，先把是哪种问题钉死。' },
      { list: [
        '<code>jps -l</code>：列出当前用户的 Java 进程和主类，排查第一步。',
        '<code>jstack &lt;pid&gt;</code>：线程快照，看死锁、BLOCKED、热点方法；加 <code>-l</code> 还能看锁信息。',
        '<code>jstat -gcutil &lt;pid&gt; 1000</code>：每秒打印 GC 统计，观察趋势最直观。',
        '<code>jcmd &lt;pid&gt; VM.flags</code>：查看生效的 JVM 参数；<code>jcmd &lt;pid&gt; GC.heap_info</code> 看堆概况。',
        '<code>jmap -histo:live &lt;pid&gt;</code>：存活对象直方图，找内存大户；<code>-dump</code> 导出堆转储。',
        '<code>jfr</code> / JFR：低开销的飞行记录仪，能同时看 GC、锁、IO、异常，生产可用。',
        '<code>async-profiler</code>：采样型火焰图，开销极低，定位 CPU 热点首选。',
        '<code>arthas</code>：在线诊断，支持 watch、trace、profiler，不改代码看运行时。'
      ] },
      { p: '工具的选择原则：先低开销、后高开销。jstat、jcmd、JFR 开销很小，可以长期开着；jstack 会暂停所有线程（ safepoint ），频繁执行会影响性能；jmap -dump 会触发 Full GC 并暂停，生产环境要谨慎，最好先做堆转储再分析。' },

      { h: '4.12 本章小结' },
      { list: [
        'JVM 是栈式虚拟机，指令从操作数栈取值、把结果压栈；局部变量表只负责存储。',
        '方法调用有 invokestatic、invokespecial、invokevirtual、invokeinterface、invokedynamic 五种，Lambda 用最后一种。',
        '热点方法由 JIT 编译成机器码；分层编译先用 C1 保启动，再用 C2 保峰值。',
        '方法内联和逃逸分析是两大关键优化；方法越小越容易被内联，对象不逃逸才可能栈上分配。',
        '性能问题先分类：CPU、GC、锁；工具从低开销的 jstat/JFR 开始，再上 jstack 和堆转储。',
        '循环里用 StringBuilder，热路径避免自动装箱，集合预估容量，容器里显式设置内存与核数。'
      ] },

      { h: '4.13 常见追问' },
      { list: [
        '<b>问：为什么 Java 比 C++ 慢？</b><br>答：差距集中在几处：启动阶段靠解释执行、对象多一个对象头、以及自动内存管理带来的 GC 停顿；边界检查、虚方法分派这些也有固定开销。但长期运行的热点代码经 C2 优化后能接近 C++，方法内联、标量替换、寄存器分配都会生效。所以「Java 慢」更多体现在冷启动和小对象密集的场景，不是所有场景都慢一个数量级。',
        '<b>问：什么是去优化（deoptimization）？</b><br>答：JIT 会基于运行时收集的类型信息做激进假设，比如「这个调用点只会收到一种实现」，于是把方法直接内联进去。一旦假设被打破，比如新加载了实现类或类被重新定义，编译产物就失效，JVM 退回解释执行并重新编译。用 <code>-XX:+PrintCompilation</code> 看到的 made not entrant 就是它，反复出现的地方往往就是真正的性能热点。',
        '<b>问：逃逸分析一定能栈上分配吗？</b><br>答：不一定。逃逸分析只是给 JIT 一个机会：判定对象不逃逸后，可能做标量替换（把对象拆成几个局部变量，根本不分配），也可能做栈上分配，是否真发生取决于方法复杂度、对象大小和编译层级，还要被 C2 真正编译到。对象一旦被返回、存进静态字段或传出方法就算逃逸。所以别指望它救糟糕的创建习惯。',
        '<b>问：JMH 结果和线上表现不一致怎么办？</b><br>答：先接受这是常态。微基准隔离了缓存、IO、锁竞争和 GC 的交互，它只回答「两种写法谁相对更快」，不能直接推算线上 QPS。拿它做方向判断，再用压测和火焰图验证真实链路。如果线上与基准结论相反，优先怀疑：对象在线上真的逃逸了、锁竞争被基准忽略，或者 GC 停顿吃掉了全部收益。',
        '<b>问：-Xss 越大越好吗？</b><br>答：不是。栈越大，单线程占用越多，同样内存能创建的线程越少，线程数一多就容易出现 <code>OutOfMemoryError: unable to create new native thread</code>；而且它只是把递归崩溃点往后推，输入再大照样溢出。合理做法是先把递归改成循环，只在确实需要深层调用时适度调大，并同步核算线程数乘栈大小的总占用。'
      ] },

      { h: '4.14 自测与练习' },
      { ol: [
        '对 BytecodeDemo 执行 <code>javap -c -p BytecodeDemo</code>，逐行解释 add 方法每条指令的作用。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><pre class="tb-ans-code" data-lang="java">public class BytecodeDemo {\n  int add(int a, int b) {\n    int c = a + b;\n    return c * 2;\n  }\n\n  public static void main(String[] args) {\n    System.out.println(\n        new BytecodeDemo().add(2, 3));\n  }\n}\n\njavac BytecodeDemo.java\njavap -c -p BytecodeDemo\n\n# int add(int, int);\n#   0: iload_1   a 压栈\n#   1: iload_2   b 压栈\n#   2: iadd      弹两个相加，结果压栈\n#   3: istore_3  存回第 3 槽（局部变量 c）\n#   4: iload_3   取 c\n#   5: iconst_2  常量 2 压栈\n#   6: imul\n#   7: ireturn</pre><b>要点</b>：JVM 是栈式虚拟机，运算必须先把操作数压到操作数栈再弹出来算；实例方法第 0 槽固定是 this，所以 a、b、c 依次占 1、2、3 槽。iload_n 的 n 是槽位下标而不是参数序号，槽位和常量写法会随代码变化，以自己 javap 的输出为准。</div></details>',
        '运行 ConcatDemo，把 n 改成 50000 再跑一次，记录耗时变化，说明为什么增长不是线性的。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><pre class="tb-ans-code" data-lang="java">public class ConcatDemo {\n  public static void main(String[] args) {\n    int n = 50000;\n\n    long t0 = System.nanoTime();\n    String s = "";\n    for (int i = 0; i &lt; n; i++) {\n      s += i;\n    }\n    long t1 = System.nanoTime();\n\n    StringBuilder sb = new StringBuilder(n * 4);\n    for (int i = 0; i &lt; n; i++) {\n      sb.append(i);\n    }\n    long t2 = System.nanoTime();\n\n    System.out.println("加号: "\n        + (t1 - t0) / 1000000 + " ms");\n    System.out.println("Builder: "\n        + (t2 - t1) / 1000000 + " ms");\n    System.out.println(s.length() + "/"\n        + sb.length());\n  }\n}\n\njavac ConcatDemo.java\njava ConcatDemo</pre><b>要点</b>：每次加号赋值都要新建一个 String 并把旧内容整体复制，总复制量是平方级，n 涨 2.5 倍工作量约涨 6 倍多；StringBuilder 内部是可扩容数组，追加是摊销常数。循环内拼接一律预估容量，单行拼接用加号没问题。</div></details>',
        '把 BoxingDemo 的 Long 改成 long，对比耗时，并用 <code>-Xlog:gc</code> 观察 GC 次数的变化。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><pre class="tb-ans-code" data-lang="java">public class BoxingDemo {\n  public static void main(String[] args) {\n    int n = 10000000;\n\n    long t0 = System.nanoTime();\n    Long boxed = 0L;\n    for (int i = 0; i &lt; n; i++) {\n      boxed += i;            // 先拆箱再装箱\n    }\n    long t1 = System.nanoTime();\n\n    long plain = 0L;\n    for (int i = 0; i &lt; n; i++) {\n      plain += i;\n    }\n    long t2 = System.nanoTime();\n\n    System.out.println("Long: "\n        + (t1 - t0) / 1000000 + " ms");\n    System.out.println("long: "\n        + (t2 - t1) / 1000000 + " ms");\n    System.out.println(boxed + "/" + plain);\n  }\n}\n\njavac BoxingDemo.java\njava -Xlog:gc BoxingDemo</pre><b>要点</b>：boxed += i 每轮都要拆箱再装箱，除了 -128 到 127 的缓存值之外每一轮都新建一个短命 Long，一千万个垃圾逼着 Young GC 频繁触发，日志里 Young GC 条数明显变多；热路径上能用基本类型就别用包装类型。</div></details>',
        '用 <code>-XX:+PrintCompilation</code> 运行一个循环密集的程序，找出被 C2 编译的方法，观察编译层级。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><pre class="tb-ans-code" data-lang="java">public class JitDemo {\n  static int work(int n) {\n    int s = 0;\n    for (int i = 0; i &lt; n; i++) {\n      s += i % 7;\n    }\n    return s;\n  }\n\n  public static void main(String[] args) {\n    long sum = 0;\n    for (int i = 0; i &lt; 30000; i++) {\n      sum += work(2000);\n    }\n    System.out.println(sum);\n  }\n}\n\njavac JitDemo.java\njava -XX:+PrintCompilation JitDemo\njava -XX:+PrintCompilation JitDemo | \\\n  grep "JitDemo::work"\n\n# 行格式：时间戳 编译id 层级 方法名 字节码大小\n# 层级 4 是 C2 产物；带 % 是 OSR 栈上替换\n# 带 s 是 synchronized 方法</pre><b>要点</b>：分层编译先用 C1 保启动、收集到足够类型信息再交给 C2 深度优化，所以同一个方法会出现多次、层级逐步升高；看到 made not entrant 说明发生了去优化，要检查代码里的类型假设是否稳定。</div></details>',
        '（思考）你的接口 P99 是 800ms，CPU 只有 30%，GC 正常，你会先查什么？列出至少三条排查路径。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><b>预期现象</b>：结论应指向「线程在等而不是在算」：CPU 不高说明瓶颈不在计算，先排除 GC 与容量问题。<b>为什么</b>：CPU 闲但接口慢，常见原因是锁竞争、线程池或连接池耗尽、下游依赖超时，以及磁盘和网络 IO 阻塞。<b>要点</b>：一是 <code>jstack &lt;pid&gt;</code> 连抓三次，看线程卡在哪个锁、哪个 socket；二是查线程池活跃数与队列长度、数据库连接池指标；三是查下游 RT 与超时设置，再看是否有临界区过大或共享的日期格式化对象争用。</div></details>'
      ] },
      { note: '<b>练习提示：</b>第 5 题的关键是“CPU 不高但慢”，优先怀疑锁竞争、线程池耗尽、下游依赖超时；先看线程栈和连接池指标，不要一上来就调 JVM 参数。' },
    ]
  };

  T['reflection'] = {
    meta: '本章约 5800 字 · 建议 40 分钟 · 配套 API 对照表、调用链路图与 5 道习题',
    blocks: [
      { h: '5.1 为什么需要“在运行时看自己”' },
      { p: '正常写代码时，你总是先知道类名、方法名，再编译、再运行。编译器会帮你检查类型、参数个数、方法是否存在。但有一类需求天然无法在编译期确定：Spring 要根据配置文件里的类名创建对象，MyBatis 要根据接口方法上的注解生成 SQL，Jackson 要把任意对象转成 JSON，JUnit 要找出所有带 @Test 的方法并逐个调用。这些场景的共同点是——框架写的时候，根本不知道将来会碰到什么类。' },
      { p: '反射就是 Java 给出的答案：程序在运行期间可以获取任意类的信息（有哪些字段、方法、构造器、注解），并且可以创建对象、调用方法、读写字段，即使这些成员是私有的。它把“编译期绑定”变成了“运行期绑定”，代价是性能、安全性和可读性。' },
      { p: '反射的另一个价值是可测试性。单测里想替换一个私有依赖、想调用一个私有方法验证边界情况、想给 final 字段注入 mock 对象，都离不开反射。Mockito、JUnit 5 的不少能力背后都是反射在干活，理解它才能看懂那些“魔法”是怎么实现的。' },
      { p: '这一章按“怎么用、怎么用好、怎么用对”来组织：先讲 Class 对象和各种获取方式，再讲字段方法的读写调用，然后讲泛型、性能与模块化带来的限制，最后给出框架里的真实用法和最佳实践。' },
      { p: '入门时容易把反射、注解、动态代理混成一件事。三者的分工是：注解负责贴标签，反射负责读标签并操作类，动态代理负责在方法调用前后插一段逻辑。框架正是把三者串起来：扫描注解、反射创建对象、生成代理、调用时按注解增强。所以学反射不是学一个冷门 API，而是学框架的底层语言。' },

      { h: '5.2 Class 对象：反射的入口' },
      { p: 'JVM 加载每个类时，都会在堆里生成一个 java.lang.Class 对象，它保存了这个类的元信息：全限定名、父类、接口、字段、方法、构造器、注解、类加载器。反射的所有操作，都从这个 Class 对象开始。' },
      { p: '注意 Class 是一个泛型类：<code>Class&lt;String&gt;</code> 表示“String 这个类的类型信息”。这种写法让编译器能做一些检查，但运行时泛型会被擦除，所以 <code>Class&lt;?&gt;</code> 在反射里非常常见——因为很多场景下你确实不知道具体类型。' },
      { p: '获取 Class 对象有四种方式，各有适用场景：' },
      { table: { head: ['方式', '示例', '是否会初始化类', '适用场景'], rows: [
        ['类名.class', 'String.class', '不会', '编译期已知类型，最安全最快'],
        ['对象.getClass()', 'obj.getClass()', '对象已存在，必然已初始化', '已有实例，想看它的真实类型'],
        ['Class.forName(全限定名)', 'Class.forName("java.lang.String")', '默认会初始化', '配置驱动的场景，如 JDBC 驱动'],
        ['ClassLoader.loadClass(名)', 'loader.loadClass("com.Foo")', '不会', '只想加载，不想触发静态初始化']
      ] } },
      { p: '这四种方式得到的 Class 对象是同一个（同一个加载器下），可以用 <code>==</code> 比较。判断类型时优先用 <code>instanceof</code> 或 <code>Class.isInstance</code>，不要用 <code>getClass() == X.class</code>，因为后者不考虑子类。' },
      { p: '另一个高频需求是按名字找类。<code>Class.forName</code> 传入的是二进制名，内部类要用 <code>$</code> 连接，比如 <code>Outer$Inner</code>；数组类型写成 <code>[Ljava.lang.String;</code> 这种形式。名字写错抛 ClassNotFoundException，名字对但依赖缺失或静态块抛异常则抛 NoClassDefFoundError，前者是“从没找到过”，后者是“找过但初始化失败了”。' },
      { lang: 'java', code: 'public class GetClassDemo {\n    static class User {\n        static { System.out.println("User 静态块执行"); }\n        String name = "tom";\n    }\n\n    public static void main(String[] args) throws Exception {\n        Class<?> c1 = User.class;\n        System.out.println("1. 类名.class 完成");\n\n        Class<?> c2 = Class.forName("GetClassDemo$User");\n        System.out.println("2. Class.forName 完成");\n\n        User u = new User();\n        Class<?> c3 = u.getClass();\n        System.out.println("3. getClass 完成");\n\n        System.out.println("c1==c2: " + (c1 == c2) + ", c2==c3: " + (c2 == c3));\n        System.out.println("是否接口: " + c1.isInterface());\n        System.out.println("父类: " + c1.getSuperclass().getName());\n    }\n}', title: 'GetClassDemo.java' },
      { out: '1. 类名.class 完成\nUser 静态块执行\n2. Class.forName 完成\n3. getClass 完成\nc1==c2: true, c2==c3: true\n是否接口: false\n父类: java.lang.Object' },
      { p: '输出顺序说明了一切：<code>User.class</code> 不会触发静态块，<code>Class.forName</code> 会，<code>new User()</code> 也会（只执行一次）。如果希望 forName 不初始化，用三参数版本：<code>Class.forName(name, false, loader)</code>。' },
      { p: '三个参数的 forName 里，loader 决定用哪个类加载器去加载。传 null 表示用 Bootstrap，传当前线程的上下文加载器则是容器和插件场景的常规做法。这个参数常被忽略，但它直接决定了“加载到的是哪个版本的同名类”——在有多版本依赖的应用里，选错加载器就会出现“明明有这个类却报 NoSuchMethodError”的怪现象。' },

      { h: '5.3 读取类的结构' },
      { p: '拿到 Class 对象后，可以读取它的全部结构。这里有一组极易混淆的 API：带 Declared 的只返回本类声明的成员（包括 private），不带 Declared 的返回本类及父类、接口的 public 成员。' },
      { table: { head: ['方法', '返回范围', '是否含私有', '是否含继承'], rows: [
        ['getFields()', 'public 字段', '否', '是'],
        ['getDeclaredFields()', '本类声明的所有字段', '是', '否'],
        ['getMethods()', 'public 方法', '否', '是'],
        ['getDeclaredMethods()', '本类声明的所有方法', '是', '否'],
        ['getConstructors()', 'public 构造器', '否', '—'],
        ['getDeclaredConstructors()', '所有构造器', '是', '—'],
        ['getAnnotations()', 'public 注解', '否', '是（部分）']
      ] } },
      { p: '还有一个细节：getDeclaredMethods 返回的顺序是不确定的，JVM 规范没有保证。依赖方法顺序的代码在不同 JDK 上会出问题，需要排序时按名字或注解自己排。' },
      { p: '读结构时还有两个很有用的 API：<code>getModifiers()</code> 返回一个整数位掩码，配合 <code>Modifier.toString</code> 打印，或配合 <code>Modifier.isStatic</code>、<code>isFinal</code> 判断；<code>getParameters()</code> 返回参数数组，能拿到参数类型、参数名（编译时加了 -parameters 才有真名）以及参数上的注解。写参数校验、依赖注入这类框架时，这两个 API 比方法名本身更重要。' },
      { lang: 'java', code: 'import java.lang.reflect.Field;\nimport java.lang.reflect.Method;\nimport java.lang.reflect.Modifier;\n\npublic class InspectDemo {\n    static class Base {\n        public int id;\n        public void baseMethod() { }\n    }\n\n    static class User extends Base {\n        private String name;\n        protected int age;\n        public static final String TABLE = "t_user";\n\n        public String getName() { return name; }\n        private void secret(String key) { System.out.println("secret: " + key); }\n    }\n\n    public static void main(String[] args) {\n        Class<?> c = User.class;\n        System.out.println("--- 本类声明字段 ---");\n        for (Field f : c.getDeclaredFields()) {\n            System.out.println(Modifier.toString(f.getModifiers()) + " " + f.getType().getSimpleName() + " " + f.getName());\n        }\n        System.out.println("--- 本类声明方法 ---");\n        for (Method m : c.getDeclaredMethods()) {\n            System.out.println(m.getName() + " 参数个数=" + m.getParameterCount());\n        }\n        System.out.println("--- public 方法(含继承) 数量 ---");\n        System.out.println(c.getMethods().length);\n    }\n}', title: 'InspectDemo.java' },
      { out: '--- 本类声明字段 ---\nprivate String name\nprotected int age\npublic static final String TABLE\n--- 本类声明方法 ---\ngetName 参数个数=0\nsecret 参数个数=1\n--- public 方法(含继承) 数量 ---\n11' },
      { p: 'getMethods 返回 11 个，是因为除了 getName，还包括从 Object 继承的 equals、hashCode、toString、getClass、notify、notifyAll、wait（三个重载）和 baseMethod。这个数字随 JDK 版本可能变化，不要写死。' },
      { p: '读结构时别忘了注解也是结构的一部分：字段、方法、参数、类上都可以挂注解，用 <code>getAnnotations()</code> 或 <code>getAnnotation(X.class)</code> 读取。写通用工具时，通常先扫一遍 <code>getDeclaredFields()</code> 并按注解过滤，再把 Field 缓存进 Map，避免每次都做一次全量遍历。' },

      { h: '5.4 创建对象与调用方法' },
      { p: '反射创建对象有两种方式：<code>Class.newInstance()</code>（已废弃，只能调无参构造，且异常处理不友好）和 <code>getDeclaredConstructor(...).newInstance(...)</code>（推荐，可以指定参数类型、可以访问私有构造）。' },
      { p: '调用方法用 <code>Method.invoke(target, args...)</code>。第一个参数是目标对象，静态方法传 null；后面的参数要严格匹配方法签名，基本类型会自动装箱，但不会自动做窄化转换——传 Integer 给 int 参数可以，传 Long 给 int 参数会抛 IllegalArgumentException。' },
      { flow: ['获取 Class 对象', '定位 Method 或 Constructor', 'setAccessible 关闭访问检查', '准备参数并做类型匹配', 'invoke 触发调用', '解包 InvocationTargetException', '处理返回值'] },
      { p: '这七步里最容易出错的是第四步。反射不会替你完成“拆箱 + 宽化”两步组合：参数声明是 long，你传 Integer，它不会先拆箱再宽化，直接报类型不匹配。稳妥的做法是按 <code>getParameterTypes()</code> 的结果显式转换一遍，或者干脆用 MethodHandle，让类型在绑定阶段就检查清楚。' },
      { lang: 'java', code: 'import java.lang.reflect.Constructor;\nimport java.lang.reflect.Method;\n\npublic class InvokeDemo {\n    public static class Order {\n        private String id;\n        private int amount;\n\n        private Order() { }\n\n        public Order(String id, int amount) {\n            this.id = id;\n            this.amount = amount;\n        }\n\n        public String summary() { return id + ":" + amount; }\n\n        private void discount(int rate) {\n            amount = amount * (100 - rate) / 100;\n        }\n    }\n\n    public static void main(String[] args) throws Exception {\n        Constructor<Order> ctor = Order.class.getDeclaredConstructor(String.class, int.class);\n        Order order = ctor.newInstance("A100", 200);\n        System.out.println("初始: " + order.summary());\n\n        Method m = Order.class.getDeclaredMethod("discount", int.class);\n        m.setAccessible(true);\n        m.invoke(order, 10);\n        System.out.println("打折后: " + order.summary());\n\n        Method s = Order.class.getMethod("summary");\n        System.out.println("反射调用 summary: " + s.invoke(order));\n    }\n}', title: 'InvokeDemo.java' },
      { out: '初始: A100:200\n打折后: A100:180\n反射调用 summary: A100:180' },
      { p: '私有方法 discount 必须 <code>setAccessible(true)</code> 才能调用，否则抛 IllegalAccessException。这个方法名有误导性：它并不是“让私有变公开”，而是关闭该成员的访问检查（suppress access checks），属于 JVM 层面的开关。' },
      { p: 'setAccessible 的代价是破坏封装和安全边界，在模块化（JDK 9+）下还可能被拒绝。JDK 17 起，对 JDK 内部类做深度反射会抛 InaccessibleObjectException，需要启动参数 <code>--add-opens</code> 显式开放。' },
      { p: '还有一点常被忽略：<code>setAccessible(true)</code> 的效果可以被后续调用改回去，多人协作的框架代码里，最好在拿到 Member 后立刻设置并缓存，不要假设它一直是打开的。JDK 对访问检查有内联优化，反复设置反而拖慢性能。' },

      { h: '5.5 读写字段与处理静态成员' },
      { p: '字段的读写用 <code>Field.get/Field.set</code>。静态字段的 target 传 null 或任意实例都可以，推荐传 null 以表明意图。基本类型要用对应的方法，比如 <code>getInt/setInt</code>，用 <code>get</code> 会返回包装类型。' },
      { p: 'final 字段要特别注意：反射可以修改 private final 实例字段（调用 setAccessible 后），但修改 static final 常量在 JDK 12+ 会失败；而且编译器可能已经把常量内联到调用方，改了也看不到效果。这类“黑魔法”只适合调试和测试，不要写进业务。' },
      { lang: 'java', code: 'import java.lang.reflect.Field;\n\npublic class FieldDemo {\n    static class Config {\n        private String env = "dev";\n        private static int timeout = 30;\n        public final String version = "1.0";\n    }\n\n    public static void main(String[] args) throws Exception {\n        Config cfg = new Config();\n\n        Field env = Config.class.getDeclaredField("env");\n        env.setAccessible(true);\n        System.out.println("修改前 env=" + env.get(cfg));\n        env.set(cfg, "prod");\n        System.out.println("修改后 env=" + env.get(cfg));\n\n        Field timeout = Config.class.getDeclaredField("timeout");\n        timeout.setAccessible(true);\n        timeout.setInt(null, 60);\n        System.out.println("静态字段 timeout=" + timeout.getInt(null));\n\n        Field version = Config.class.getDeclaredField("version");\n        version.setAccessible(true);\n        version.set(cfg, "2.0");\n        System.out.println("final 字段 version=" + version.get(cfg));\n    }\n}', title: 'FieldDemo.java' },
      { out: '修改前 env=dev\n修改后 env=prod\n静态字段 timeout=60\nfinal 字段 version=2.0' },
      { p: '输出看起来“什么都改得了”，但这正是反射危险的地方。final 字段被改后，其他代码可能还在用常量折叠后的旧值（比如 <code>Config.version</code> 直接在调用处变成 "1.0"），行为变得不可预测。' },
      { p: '静态字段和实例字段的读取还有一个坑：<code>Field.get(obj)</code> 对静态字段会完全忽略 obj，传什么都不会报错，连类型不匹配也照样返回。这种“静默成功”让 bug 极难发现，写通用代码时建议对静态字段统一传 null，并在注释里写明意图。' },

      { h: '5.6 反射与泛型' },
      { p: 'Java 的泛型是“编译期擦除”的：<code>List&lt;String&gt;</code> 和 <code>List&lt;Integer&gt;</code> 运行时都是 List，类型参数被擦掉。所以反射拿不到 <code>new ArrayList&lt;String&gt;()</code> 的元素类型，但能拿到“声明位置”上的泛型信息，比如字段类型、方法参数类型、父类声明。' },
      { p: '这就是为什么 Jackson 能反序列化 <code>List&lt;User&gt;</code>：它通过 <code>TypeReference</code> 把泛型信息保留在一个匿名子类的父类签名里，再用 <code>getGenericSuperclass()</code> 读出来。' },
      { lang: 'java', code: 'import java.lang.reflect.ParameterizedType;\nimport java.lang.reflect.Type;\nimport java.util.List;\nimport java.util.Map;\n\npublic class GenericDemo {\n    static class Repo<T> { }\n\n    static class UserRepo extends Repo<String> { }\n\n    static class Holder {\n        List<String> names;\n        Map<String, Integer> scores;\n    }\n\n    public static void main(String[] args) throws Exception {\n        Type t = UserRepo.class.getGenericSuperclass();\n        if (t instanceof ParameterizedType) {\n            ParameterizedType pt = (ParameterizedType) t;\n            System.out.println("原始类型: " + pt.getRawType());\n            System.out.println("类型参数: " + pt.getActualTypeArguments()[0]);\n        }\n\n        Type fieldType = Holder.class.getDeclaredField("scores").getGenericType();\n        ParameterizedType pt2 = (ParameterizedType) fieldType;\n        System.out.println("Map 的键: " + pt2.getActualTypeArguments()[0]);\n        System.out.println("Map 的值: " + pt2.getActualTypeArguments()[1]);\n    }\n}', title: 'GenericDemo.java' },
      { out: '原始类型: class GenericDemo$Repo\n类型参数: class java.lang.String\nMap 的键: class java.lang.String\nMap 的值: class java.lang.Integer' },
      { p: '注意区别：<code>getGenericType()</code> 返回 Type，能保留泛型；<code>getType()</code> 返回 Class，泛型已被擦除。写通用框架时要用前者，否则只能拿到 List 而拿不到元素类型。' },
      { p: '为什么 TypeReference 一定要写成匿名子类？因为泛型信息保存在“声明”里，而不是“实例”里。<code>new TypeReference&lt;List&lt;User&gt;&gt;() {}</code> 创建的是一个匿名子类，它的父类签名被写进了 class 文件，反射才能通过 <code>getGenericSuperclass()</code> 读到 <code>List&lt;User&gt;</code>；如果直接 new 一个 TypeReference，签名早就被擦掉了，什么都读不到。' },

      { h: '5.7 反射的性能：为什么慢，慢多少' },
      { p: '反射慢主要有三个原因。第一，调用链长：invoke 要经过参数校验、装箱、访问检查、方法解析，最后才到真正的目标方法。第二，难以内联：JIT 对反射调用点的优化受限，尤其在调用目标多变时。第三，每次 getMethod 都要遍历方法表并复制对象，频繁调用开销很大。' },
      { p: '实测数量级：直接调用约 1~3 纳秒，缓存后的 Method.invoke 约 5~20 纳秒，未缓存的 getMethod + invoke 约 100~300 纳秒。也就是说，反射大约慢一个数量级，但没有传言中“慢几百倍”那么夸张。' },
      { p: '这些数字要放到具体场景里看。一次请求里反射调用几十次，几微秒的开销完全可以忽略；但如果在百万次循环里每次都 getMethod，就会变成几十毫秒，足以出现在火焰图上。判断标准不是“反射慢不慢”，而是“反射在不在热路径上、有没有被重复调用”。' },
      { table: { head: ['调用方式', '相对耗时', '是否可内联', '适用场景'], rows: [
        ['直接调用', '1x', '是', '绝大多数业务代码'],
        ['缓存的 Method.invoke', '5~10x', '有限', '框架通用调用'],
        ['MethodHandle', '2~5x', '较好', '高性能框架'],
        ['LambdaMetafactory', '接近 1x', '是', '启动时生成访问器'],
        ['每次 getMethod 再 invoke', '50~100x', '否', '仅限一次性场景']
      ] } },
      { p: '优化的第一原则是缓存：把 Method、Field、Constructor 缓存在 Map 里，避免重复查找。第二原则是减少调用次数：批量操作、预编译。第三原则是升级到 MethodHandle 或 LambdaMetafactory，让 JIT 能把它当成普通调用点优化。' },
      { lang: 'java', code: 'import java.lang.invoke.MethodHandle;\nimport java.lang.invoke.MethodHandles;\nimport java.lang.invoke.MethodType;\nimport java.lang.reflect.Method;\n\npublic class SpeedDemo {\n    public static class Calc {\n        public int square(int x) { return x * x; }\n    }\n\n    public static void main(String[] args) throws Throwable {\n        Calc calc = new Calc();\n        Method m = Calc.class.getMethod("square", int.class);\n        MethodHandle mh = MethodHandles.lookup()\n                .findVirtual(Calc.class, "square", MethodType.methodType(int.class, int.class));\n        int n = 5_000_000;\n\n        long t1 = System.nanoTime();\n        long sum = 0;\n        for (int i = 0; i < n; i++) sum += calc.square(i);\n        long t2 = System.nanoTime();\n\n        for (int i = 0; i < 100_000; i++) m.invoke(calc, i);\n        long t3 = System.nanoTime();\n        for (int i = 0; i < n; i++) sum += (int) m.invoke(calc, i);\n        long t4 = System.nanoTime();\n\n        for (int i = 0; i < n; i++) sum += (int) mh.invokeExact(calc, i);\n        long t5 = System.nanoTime();\n\n        System.out.printf("直接调用: %d ms%n", (t2 - t1) / 1_000_000);\n        System.out.printf("Method.invoke: %d ms%n", (t4 - t3) / 1_000_000);\n        System.out.printf("MethodHandle: %d ms%n", (t5 - t4) / 1_000_000);\n        System.out.println("sum=" + sum);\n    }\n}', title: 'SpeedDemo.java' },
      { out: '直接调用: 3 ms\nMethod.invoke: 61 ms\nMethodHandle: 15 ms' },
      { p: '具体数字随机器和 JDK 版本变化，但相对关系稳定：MethodHandle 明显快于反射，LambdaMetafactory 更快（接近直接调用）。Spring 6 已经把部分反射调用换成了 MethodHandle，这也是框架升级的一个性能收益点。' },
      { p: '不过 MethodHandle 不是银弹：它的类型检查更严格，<code>invokeExact</code> 要求参数和返回值类型完全匹配，差一点就抛 WrongMethodTypeException；API 也更难用，适合封装在框架内部。业务代码没必要为了这点性能把可读性搭进去。' },

      { h: '5.8 框架里的反射：三个真实场景' },
      { p: '第一个场景是依赖注入。Spring 扫描到 <code>@Component</code> 的类后，用反射创建实例、读取字段上的 <code>@Autowired</code>、再反射注入。构造器注入之所以被推荐，是因为它能在创建时就完成依赖，不依赖 setAccessible 改私有字段。' },
      { p: '第二个场景是 ORM 映射。MyBatis 根据接口方法名和注解拼 SQL，把结果集的列名映射到实体字段，靠的就是 <code>getDeclaredFields</code> 加 <code>setAccessible</code>。这也是为什么实体类必须有默认构造器、字段名要和列名对应。' },
      { p: 'MyBatis 的反射还有个细节：它用 <code>MetaObject</code> 包装对象，支持嵌套属性（如 <code>user.name</code>）和集合下标，内部靠 Reflector 缓存 getter/setter。所以实体类只有字段没有 getter 时，MyBatis 也能工作，因为它是直接操作字段的；而 Jackson 默认走 getter/setter，没 getter 就看不到属性。同一份代码在不同框架里表现不同，根源就在这。' },
      { p: '第三个场景是序列化。Jackson 读取 getter/setter、字段、构造器参数名，决定 JSON 的键名；它大量使用泛型反射来处理 <code>List&lt;User&gt;</code> 这类嵌套类型。理解反射之后，那些“为什么加了 @JsonProperty 就好了”的问题就有了答案。' },
      { p: '共同模式是：框架在启动时做一次昂贵的反射扫描，把结果缓存成元数据（BeanDefinition、MapperStatement、Serializer），运行时只做轻量的查表和调用。这也是性能优化的通用思路——把反射开销从“每次请求”挪到“启动一次”。' },
      { p: '顺着这个思路，很多框架的设计就讲得通了：Spring 启动慢但运行时快，MyBatis 第一次执行 SQL 慢、后续快，Jackson 第一次序列化某个类慢、之后快。它们都在做同一件事——把反射的“发现成本”前置，把“调用成本”缓存起来。' },

      { h: '5.9 五个常见坑与模块化下的限制' },
      { ol: [
        '基本类型与包装类型不匹配：方法参数是 int，invoke 传 Integer 可以；参数是 Integer，传 int 也行；但参数是 long，传 Integer 会抛 IllegalArgumentException。',
        '可变参数：invoke 的第二个参数本身就是 Object[]，如果方法签名是可变参数，要再包一层 <code>new Object[]{new Object[]{...}}</code>，否则会被展开。',
        '继承与接口：getDeclaredMethod 找不到父类方法，getMethod 找不到私有方法；调用接口默认方法要用接口的 Method。',
        '异常包装：目标方法抛出的异常会被包成 InvocationTargetException，必须 <code>getCause()</code> 才能拿到原始异常，否则日志里全是“反射调用失败”。',
        '访问检查：setAccessible 在 JDK 17+ 对 JDK 内部类会失败，需要 --add-opens；在安全管理器下也可能被拒绝。'
      ] },
      { p: '第一条尤其隐蔽。反射的参数匹配规则是“宽化允许、窄化拒绝”：int 可以传给 long，但 Integer 不能直接传给 long 参数（需要显式拆箱再宽化，反射不会自动做两步）。写通用调用代码时，最好先做类型归一化。' },
      { p: '和异常包装相关的是异常链丢失。目标方法抛出的异常被包在 InvocationTargetException 里，如果你只打印外层，日志里就只剩一行“反射调用失败”，完全看不到根因。规范写法是捕获后取出 <code>getCause()</code> 再抛，或者记录完整堆栈，别让包装层吃掉原始异常。' },
      { p: '第二条也常踩。假设方法是 <code>void log(String fmt, Object... args)</code>，反射调用应该写 <code>m.invoke(obj, "x={}", new Object[]{1, 2})</code>，编译器会把后面两个参数当成一个 Object[]；如果直接写 <code>m.invoke(obj, "x={}", 1, 2)</code>，会被当成三个独立参数，参数个数对不上。' },
      { p: '还有一个与数组有关的坑：如果方法参数本身就是数组类型，invoke 时不能直接传一个 Object[]，因为它会被当成参数列表展开。正确写法是把数组再包一层：<code>m.invoke(obj, (Object) new int[]{1, 2})</code>，用强制类型转换告诉编译器“这是一个参数，不是三个”。' },
      { p: 'JDK 9 之后，反射受到模块系统的约束。一个模块默认只导出公开 API，未导出的包即使类是 public，也不能被其他模块反射访问。JDK 内部包（如 <code>java.lang</code> 的部分私有成员、<code>sun.misc</code>）默认不 open，深度反射会抛 InaccessibleObjectException。' },
      { p: '解决办法有两类。启动参数层面：<code>--add-opens java.base/java.lang=ALL-UNNAMED</code> 开放指定包给未命名模块；<code>--add-exports</code> 用于编译期访问。代码层面：尽量只反射自己的类，或者要求被反射的模块在自己的 module-info.java 里 <code>opens</code> 相应包。' },
      { p: '安全管理器（SecurityManager）在 JDK 17 被标记废弃，JDK 21 起默认不允许动态加载，反射的权限检查场景在减少。但“不要反射访问别人的私有成员”这条原则没有变：它让实现细节变成事实上的契约，升级依赖时极易崩溃。' },
      { p: '容器环境里还要注意：<code>--add-opens</code> 必须写在 java 启动命令上，通过环境变量注入时要确认引号没有被 shell 吃掉；用 Docker 的 ENTRYPOINT 拼参数更容易出错。JDK 17 之后，早期版本的 Dubbo、Fastjson 等库常因深度反射而启动失败，升级前建议先用 <code>jdeps</code> 扫一遍依赖，看看谁在碰 JDK 内部包。' },
      { note: '<b>实践底线：</b>反射只用于框架层，业务代码优先直接调用；必须反射时缓存 Member 对象；不要修改 final 字段；不要依赖方法顺序；对第三方库的内部类保持距离。' },

      { h: '5.10 反射的替代方案：什么时候不该用它' },
      { p: '反射不是唯一解。很多场景有更便宜、更安全的替代方案，选错工具才是真正的性能与维护成本来源。' },
      { p: '第一类替代是“直接调用 + 接口”。如果你在编译期就知道要调用什么，哪怕有多个实现，也应该用接口加多态，而不是按类名字符串去反射。多态由 JVM 的虚方法表分发，能被内联，性能接近直接调用；反射则每次都走一遍查找和访问检查。' },
      { p: '第二类替代是“函数式接口 + Lambda”。需要“把一段行为当参数传”时，<code>Function</code>、<code>Supplier</code>、<code>Consumer</code> 比反射方法名清晰得多，还能被编译器检查。只有在行为来自配置、运行时才能确定时，才需要反射或脚本引擎。' },
      { p: '第三类替代是“代码生成”。注解处理器、KSP、APT 在编译期生成直白的调用代码，运行时零反射开销；<code>LambdaMetafactory</code> 则在启动时把方法句柄适配成函数式接口，之后就是普通接口调用。Jackson、Spring 6 都在往这个方向迁移。' },
      { p: '判断标准可以简化成一句话：能在编译期确定的，不要拖到运行期；必须拖到运行期的，只做一次并缓存结果。反射本身没有错，错的是把它用在热路径上、或者用它替代本该有的抽象。' },
      { p: '最后给一个实用判断：如果你发现自己在写 <code>Class.forName(配置里的类名)</code>，先问能不能用 SPI 或依赖注入容器替你做这件事。手写反射加载往往意味着你在重新实现一个插件机制，而成熟的容器已经处理好加载器隔离、生命周期和失败回滚。用现成机制，比自研一套反射调用要稳得多。' },

      { h: '5.11 本章小结' },
      { list: [
        'Class 对象是反射入口，四种获取方式在“是否初始化”上不同；同一个类的 Class 在同一加载器下唯一。',
        'getDeclaredXxx 只取本类（含私有），getXxx 取 public（含继承），两者不要混用。',
        '调用方法用 Method.invoke，私有成员需 setAccessible(true)，异常会被包成 InvocationTargetException。',
        '泛型在运行时被擦除，但字段、方法参数、父类声明上的泛型信息可以通过 Type 读取。',
        '反射比直接调用慢一个数量级，缓存 Member 是基本优化，MethodHandle 和 LambdaMetafactory 能进一步接近直接调用。',
        '框架用反射做启动期元数据扫描，运行期只查表，这是把开销挪出热路径的关键设计。'
      ] },

      { h: '5.12 常见追问' },
      { list: [
        '<b>问：反射会破坏单例吗？</b><br>答：会。单例拦得住 <code>new</code>，拦不住反射：拿到私有构造器后 <code>setAccessible(true)</code> 再 <code>newInstance</code> 就能造出第二个实例。防护办法是在构造器里判断实例是否已存在，存在就抛异常；更彻底的是用枚举实现单例，JVM 保证枚举实例唯一，反射创建枚举对象会直接抛异常，反序列化也不会产生新实例。',
        '<b>问：Class.forName 和 loadClass 的区别？</b><br>答：前者默认会初始化类，静态块立刻执行；后者只加载不初始化，初始化要等第一次主动使用。所以 JDBC 驱动注册必须用 <code>Class.forName</code>，因为注册动作写在驱动类的静态块里；如果只想探测类是否存在、又不想触发静态逻辑，就用 <code>loader.loadClass</code> 或三参数的 <code>Class.forName(name, false, loader)</code>。',
        '<b>问：为什么反射调用接口默认方法会失败？</b><br>答：因为 <code>getMethod</code> 是在实现类上找的，而默认方法声明在接口里，实现类的反射视图里没有这条声明，于是抛 <code>NoSuchMethodException</code>。主解法是拿接口的 Class 去 <code>getMethod</code> 取到 Method（默认方法定义在接口上，用它才找得到），再在实现类实例上 <code>invoke</code>。补充一点：<code>MethodHandles.Lookup.findSpecial</code> 也调得到默认实现，但它要求调用方对目标接口有 private access，接口场景通常还得配合 <code>privateLookupIn</code>、模块也需要 open，属于绕访问检查的少数场景，不要当默认做法；能用正常多态调用就别用反射调默认方法。',
        '<b>问：反射能拿到方法参数名吗？</b><br>答：默认只能拿到 <code>arg0</code>、<code>arg1</code> 这类合成名，因为参数名在编译后通常被丢弃。编译时加 <code>-parameters</code>（Maven 里配编译插件的 parameters 选项）才会写进 class 文件，这时 <code>Parameter.getName()</code> 才能拿到真实名字。Spring 6 起要求必须有参数名，否则构造器注入的解析会出问题，升级时最容易踩。',
        '<b>问：LambdaMetafactory 怎么用？</b><br>答：它把已有方法适配成函数式接口实例：先用 <code>MethodHandles.lookup().findVirtual</code> 等方法拿到 <code>MethodHandle</code>，再调 <code>LambdaMetafactory.metafactory</code>，它的签名是 6 个参数、顺序为 <code>(lookup, name, invokedType, samMethodType, implMethod, instantiatedMethodType)</code>，也就是调用方 lookup、接口方法名、工厂签名、接口方法类型、目标方法句柄、实例化后的方法类型；返回的是一个工厂句柄，调用它才生成接口实例。之后每次调用都是普通接口调用，能被内联。关键是生成一次、复用实例，Spring 和 Jackson 正是这么替代部分反射的。'
      ] },

      { h: '5.13 自测与练习' },
      { ol: [
        '运行 GetClassDemo，把 Class.forName 换成 loadClass，观察静态块是否还执行，并解释原因。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><pre class="tb-ans-code" data-lang="java">public class GetClassDemo {\n  static class User {\n    static {\n      System.out.println("User 静态块执行");\n    }\n  }\n\n  public static void main(String[] args)\n      throws Exception {\n    String cn = "GetClassDemo$User";\n    Class&lt;?> c1 = User.class;\n    System.out.println("1. 类名.class 完成");\n\n    ClassLoader ld =\n        GetClassDemo.class.getClassLoader();\n    Class&lt;?> c0 = ld.loadClass(cn);\n    System.out.println("2. loadClass 完成");\n\n    Class&lt;?> c2 = Class.forName(cn);\n    System.out.println("3. forName 完成");\n    System.out.println("同一个 Class: "\n        + (c0 == c1 &amp;&amp; c1 == c2));\n  }\n}\n\njavac GetClassDemo.java\njava GetClassDemo</pre><b>要点</b>：forName 默认初始化类、执行 <clinit>，loadClass 只完成加载和必要的链接，初始化要等第一次主动使用（new、访问静态字段或静态方法）；三者拿到的 Class 对象是同一个，差别只在是否触发初始化，所以静态块那行会出现在 forName 之前。</div></details>',
        '运行 InspectDemo，数一数 getMethods 返回的方法，和 getDeclaredMethods 对比，说明差异来源。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><pre class="tb-ans-code" data-lang="java">import java.lang.reflect.Method;\n\npublic class InspectDemo {\n  static class Base {\n    public void base() {}\n    private void hidden() {}\n  }\n\n  static class Sub extends Base {\n    public String getName() { return "x"; }\n    private void secret() {}\n  }\n\n  public static void main(String[] args) {\n    Method[] d = Sub.class.getDeclaredMethods();\n    Method[] a = Sub.class.getMethods();\n    System.out.println("declared: " + d.length);\n    for (Method m : d) {\n      System.out.println("  " + m.getName());\n    }\n    System.out.println("methods: " + a.length);\n    for (Method m : a) {\n      System.out.println("  " + m.getName());\n    }\n  }\n}\n\njavac InspectDemo.java\njava InspectDemo</pre><b>要点</b>：带 Declared 的只返回本类声明的成员（含 private），不带 Declared 的返回本类及所有父类、接口的 public 成员，多出来的正是 Object 的 equals、hashCode、toString、getClass、三个 wait 和 notify、notifyAll。这个数量随 JDK 版本变化，代码里不要写死；要拿继承来的非 public 方法，必须先用 Declared 在本类找，再沿父类逐层找。</div></details>',
        '运行 InvokeDemo，去掉 setAccessible(true)，捕获异常并打印异常类型，理解访问检查。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><pre class="tb-ans-code" data-lang="java">import java.lang.reflect.Method;\n\npublic class InvokeDemo {\n  static class Price {\n    private int discount(int p) {\n      return p - 20;\n    }\n\n    public String summary() {\n      return "ok";\n    }\n  }\n\n  public static void main(String[] args) {\n    Price p = new Price();\n    try {\n      Method m = Price.class\n          .getDeclaredMethod("discount", int.class);\n      m.setAccessible(true);   // 注释掉这行再跑\n      System.out.println("打折后: "\n          + m.invoke(p, 200));\n    } catch (Exception e) {\n      System.out.println(e.getClass().getName());\n    }\n\n    try {\n      Method s = Price.class.getMethod("summary");\n      System.out.println("公有: " + s.invoke(p));\n    } catch (Exception e) {\n      System.out.println(e.getClass().getName());\n    }\n  }\n}\n\njavac InvokeDemo.java\njava InvokeDemo</pre><b>要点</b>：反射默认做访问权限检查，setAccessible(true) 只是关掉这个成员的检查、并不是把它改成 public；去掉后私有方法抛 java.lang.IllegalAccessException，公有方法照常能调。JDK 17 起对 JDK 内部类深度反射还会抛 InaccessibleObjectException，要配 --add-opens。</div></details>',
        '运行 SpeedDemo，把 Method.invoke 的循环次数改成和直接调用一样，重新比较耗时，说明预热的影响。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><pre class="tb-ans-code" data-lang="java">import java.lang.invoke.MethodHandle;\nimport java.lang.invoke.MethodHandles;\nimport java.lang.invoke.MethodType;\nimport java.lang.reflect.Method;\n\npublic class SpeedDemo {\n  static int target(int x) {\n    return x + 1;\n  }\n\n  public static void main(String[] args)\n      throws Throwable {\n    final int n = 5000000;\n    Method m = SpeedDemo.class\n        .getDeclaredMethod("target", int.class);\n    MethodHandle mh = MethodHandles.lookup()\n        .findStatic(SpeedDemo.class, "target",\n            MethodType.methodType(int.class,\n                int.class));\n\n    for (int round = 0; round &lt; 3; round++) {\n      long t0 = System.nanoTime();\n      int s1 = 0;\n      for (int i = 0; i &lt; n; i++) s1 += target(i);\n      long t1 = System.nanoTime();\n      int s2 = 0;\n      for (int i = 0; i &lt; n; i++) {\n        s2 += (Integer) m.invoke(null, i);\n      }\n      long t2 = System.nanoTime();\n      int s3 = 0;\n      for (int i = 0; i &lt; n; i++) {\n        s3 += (int) mh.invoke(i);\n      }\n      long t3 = System.nanoTime();\n      System.out.println("第 " + round + " 轮: "\n          + (t1 - t0) / 1000000 + " / "\n          + (t2 - t1) / 1000000 + " / "\n          + (t3 - t2) / 1000000 + " ms");\n      System.out.println(s1 + s2 + s3);\n    }\n  }\n}\n\njavac SpeedDemo.java\njava SpeedDemo</pre><b>要点</b>：第一轮里 Method.invoke 包含方法解析、访问检查等初始化成本，还有 JIT 尚未编译这些调用点；两边循环次数对齐并多跑几轮预热后，倍数会稳定在一个数量级左右而不是几十倍。计时用 System.nanoTime()，精确量级交给 JMH，工程结论是缓存 Method、别在热路径反复 getMethod。</div></details>',
        '（思考）如果让你写一个简易的 JSON 序列化器，只支持基本类型和 String 字段，你会用到哪些反射 API？如何处理 private 字段和继承字段？<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><pre class="tb-ans-code" data-lang="java">import java.lang.reflect.Field;\nimport java.lang.reflect.Modifier;\nimport java.util.ArrayList;\nimport java.util.HashMap;\nimport java.util.List;\nimport java.util.Map;\n\npublic class MiniJson {\n  static final Map&lt;Class&lt;?>, Field[]> CACHE =\n      new HashMap&lt;>();\n\n  static Field[] fieldsOf(Class&lt;?> c) {\n    Field[] hit = CACHE.get(c);\n    if (hit != null) return hit;\n    List&lt;Field> out = new ArrayList&lt;>();\n    for (Class&lt;?> k = c; k != null\n        &amp;&amp; k != Object.class;\n         k = k.getSuperclass()) {\n      for (Field f : k.getDeclaredFields()) {\n        int mod = f.getModifiers();\n        if (Modifier.isStatic(mod)) continue;\n        if (Modifier.isTransient(mod)) continue;\n        f.setAccessible(true);\n        out.add(f);\n      }\n    }\n    Field[] arr = out.toArray(new Field[0]);\n    CACHE.put(c, arr);\n    return arr;\n  }\n\n  static String toJson(Object o)\n      throws IllegalAccessException {\n    if (o == null) return "null";\n    if (o instanceof String) {\n      return quote((String) o);\n    }\n    if (o instanceof Number\n        || o instanceof Boolean) {\n      return String.valueOf(o);\n    }\n    StringBuilder sb = new StringBuilder("{");\n    Field[] fs = fieldsOf(o.getClass());\n    for (int i = 0; i &lt; fs.length; i++) {\n      if (i > 0) sb.append(\',\');\n      sb.append(quote(fs[i].getName()))\n          .append(\':\');\n      Object v = fs[i].get(o);\n      if (v instanceof String) {\n        sb.append(quote((String) v));\n      } else if (v instanceof Number\n          || v instanceof Boolean) {\n        sb.append(v);\n      } else {\n        throw new IllegalArgumentException(\n            "不支持的类型: " + v);\n      }\n    }\n    return sb.append(\'}\').toString();\n  }\n\n  static String quote(String s) {\n    StringBuilder b = new StringBuilder();\n    b.append(\'"\');\n    for (int i = 0; i &lt; s.length(); i++) {\n      char ch = s.charAt(i);\n      if (ch == \'"\' || ch == \'\\\\\') {\n        b.append(\'\\\\\');\n      }\n      b.append(ch);\n    }\n    return b.append(\'"\').toString();\n  }\n\n  static class Pojo {\n    private String name = "tom";\n    private int age = 3;\n    private transient String tmp = "x";\n    static int counter = 9;\n  }\n\n  public static void main(String[] args)\n      throws Exception {\n    System.out.println(toJson(new Pojo()));\n  }\n}\n\njavac MiniJson.java\njava MiniJson\n\n# {"name":"tom","age":3}</pre><b>要点</b>：序列化只需要读：getDeclaredFields 逐层向上遍历父类拿到全部字段，每个 Field 先 setAccessible(true) 再 get(obj)；跳过 static 和 transient，判空，String 加引号并转义反斜杠，遇到不支持的引用类型直接抛异常，Field 列表按类缓存起来避免每次重新遍历。</div></details>'
      ] },
      { note: '<b>练习提示：</b>第 5 题先想清楚“遍历字段 → 判断类型 → 取值 → 拼字符串”的流程，再考虑循环引用、null 值、日期格式这些边界；能跑通一个最小版本，比追求完整更重要。' },
    ]
  };

  T['annotations'] = {
    meta: '本章约 5900 字 · 建议 40 分钟 · 配套元注解对照表、APT 流程图与 5 道习题',
    blocks: [
      { h: '6.1 为什么注解值得单独学一章' },
      { p: '注解还有一个隐性成本：它把行为藏进了看不见的处理器。读代码的人看到 <code>@Transactional</code> 却看不到事务边界，看到 <code>@Async</code> 却不知道线程池从哪来。所以团队规范通常要求：自定义注解必须写清楚谁在读、在哪个阶段读，并给出对应处理器类名。' },
      { p: '学习注解有个高效路径：先弄清是谁在读，再回头看语法。语法十分钟就能学完——怎么声明、怎么赋值、有哪些元注解；真正难的是“为什么我加了却不生效”。带着这个问题去学保留策略、扫描范围和代理机制，比背 API 有效得多。' },
      { p: '翻开任何一个 Spring Boot 项目，你会看到 <code>@RestController</code>、<code>@Autowired</code>、<code>@Transactional</code>、<code>@RequestMapping</code>。翻开实体类，会看到 <code>@Data</code>、<code>@Entity</code>、<code>@Table</code>。翻开测试，会看到 <code>@Test</code>、<code>@BeforeEach</code>。注解几乎无处不在，但很多人的理解停在“加个注解就能用”，一旦它不生效，就完全不知道从哪查。' },
      { p: '注解本身不做任何事。它只是一段贴在类、方法、字段上的元数据，必须有人去读它：要么是运行时通过反射读（Spring、Jackson、JUnit），要么是编译期由注解处理器读（Lombok、MapStruct、ButterKnife），要么是字节码工具读（AspectJ、ASM）。理解“谁在读、什么时候读”，是排查注解问题的唯一钥匙。' },
      { p: '这一章从内置注解讲起，再讲元注解与保留策略——它们决定了注解能贴在哪、能活到什么时候。然后动手定义注解、用反射读取、用注解处理器在编译期生成代码，最后总结注解不生效的五种典型原因。' },

      { h: '6.2 注解是什么：贴在代码上的标签' },
      { p: '注解还能被组合。自定义一个 <code>@AdminOnly</code>，在它上面标 <code>@RequiresRole</code>，框架扫描时可以沿元注解链找到真正的约束，这就是 Spring 的组合注解机制：<code>@RestController</code> 本质上等于 <code>@Controller</code> 加 <code>@ResponseBody</code>。组合减少了重复，但也让“这个注解到底从哪来”更难追。' },
      { p: '注解不是唯一的配置方式。Spring 早期用 XML 声明 Bean，后来转向注解，原因不是注解更先进，而是注解离代码近、重构时能一起改、IDE 能提示。XML 的优势是集中管理、不侵入代码、改配置不用重编译，所以现在仍用于需要运维动态调整的场景。两者不是替代关系，而是配置放哪的取舍。' },
      { p: '注解（Annotation）是 JDK 5 引入的语法元素，形式是 <code>@名字</code>，可以带参数，比如 <code>@RequestMapping(value = "/users", method = RequestMethod.GET)</code>。它可以出现在类、方法、字段、参数、构造器、局部变量、包、甚至类型使用的位置上。' },
      { p: '和注释不同，注解是代码的一部分，会被编译进 class 文件（取决于保留策略），可以被程序读取。和接口不同，注解没有方法体，只有“元素声明”，元素可以有默认值，使用时可以按名字赋值，也可以只写一个 value。' },
      { p: '最重要的认知是：<b>注解不改变程序行为</b>。给方法加 <code>@Transactional</code> 不会自动开启事务，是 Spring 的代理在调用前后做增强；加 <code>@Override</code> 不会改变方法，是编译器用它检查父类是否有同名方法。没有对应的处理器，注解就是一张没人看的标签。' },

      { h: '6.3 三个内置注解' },
      { p: '<code>@Override</code> 的价值在重构时才显现：父类方法改名、参数调整，所有子类里标了它的重写方法会立刻编译失败，没标的则悄悄变成“新增方法”，运行时行为悄悄改变。团队里强制加它，成本几乎为零，收益是把一类隐蔽 bug 变成编译错误。' },
      { p: '除了这三个，JDK 还有几个常用内置注解：<code>@FunctionalInterface</code> 检查接口是否只有一个抽象方法，写 Lambda 时能提前发现签名写错；<code>@SafeVarargs</code> 抑制泛型可变参数的堆污染警告，只能用在 static、final 或私有方法上；<code>@Native</code> 标记字段被本地代码引用。它们大多是 SOURCE 或 CLASS 级，不参与运行时逻辑。' },
      { p: '<code>@Override</code> 告诉编译器“这个方法重写了父类或接口的方法”。如果签名写错（参数类型不对、方法名拼错），编译直接报错。它不生成任何代码，只在编译期做检查，是防止“以为重写了其实重载了”的最便宜手段。' },
      { p: '<code>@Deprecated</code> 标记某个类、方法、字段已过时，编译器会在调用处给出警告。JDK 9 起它增加了 <code>since</code> 和 <code>forRemoval</code> 两个元素，可以说明从哪个版本开始废弃、是否将来会删除。' },
      { p: '<code>@SuppressWarnings</code> 抑制编译器的警告，比如 <code>@SuppressWarnings("unchecked")</code> 抑制泛型强转警告，<code>@SuppressWarnings("deprecation")</code> 抑制过时 API 警告。它应该尽量写在最小作用域上，写成类级别会掩盖真正的问题。' },
      { lang: 'java', code: 'import java.util.ArrayList;\nimport java.util.List;\n\npublic class BuiltinDemo {\n    static class Animal {\n        public String sound() { return "..."; }\n    }\n\n    static class Dog extends Animal {\n        @Override\n        public String sound() { return "wang"; }\n\n        @Deprecated(since = "1.2", forRemoval = true)\n        public void oldBark() { System.out.println("old bark"); }\n    }\n\n    @SuppressWarnings("unchecked")\n    static List<String> rawList() {\n        return (List<String>) (List<?>) new ArrayList<Integer>();\n    }\n\n    public static void main(String[] args) {\n        Animal a = new Dog();\n        System.out.println(a.sound());\n        new Dog().oldBark();\n        System.out.println("rawList 大小=" + rawList().size());\n    }\n}', title: 'BuiltinDemo.java' },
      { out: 'wang\nold bark\nrawList 大小=0' },
      { p: '编译这段代码时，javac 会对 oldBark 的调用给出“已过时且将被移除”的警告，对 rawList 的强转则因为 @SuppressWarnings 而安静。注意 <code>@Override</code> 用在 sound 上是安全的，如果写成 <code>sound(String s)</code>，编译器会立刻报错——这就是它的价值。' },

      { h: '6.4 元注解：给注解打注解' },
      { p: '元注解还能组合出很强的作用。<code>@Target(ElementType.TYPE_USE)</code> 让注解可以贴在类型使用的任何位置，比如 <code>List&lt;@NonNull String&gt;</code>，静态检查工具就靠它做空值分析；<code>@Target(ElementType.ANNOTATION_TYPE)</code> 则用于定义“注解的注解”，Spring 的 <code>@Service</code> 就是这样基于 <code>@Component</code> 派生出来的。' },
      { p: '定义注解时用的注解叫元注解。JDK 内置五个，它们决定了你的注解“能贴在哪、活到什么时候、能不能继承、能不能重复”。' },
      { table: { head: ['元注解', '作用', '常用取值'], rows: [
        ['@Target', '限定注解可以出现的位置', 'TYPE、METHOD、FIELD、PARAMETER、CONSTRUCTOR、LOCAL_VARIABLE、ANNOTATION_TYPE、PACKAGE、TYPE_PARAMETER、TYPE_USE、MODULE'],
        ['@Retention', '限定注解保留到哪个阶段', 'SOURCE（源码）、CLASS（class 文件，默认）、RUNTIME（运行时可见）'],
        ['@Documented', '生成 javadoc 时包含该注解', '无参数'],
        ['@Inherited', '注解可被 subclass 继承（仅对类注解有效）', '无参数'],
        ['@Repeatable', '同一位置可重复使用同一个注解', '需要一个容器注解']
      ] } },
      { p: '如果不写 <code>@Target</code>，注解可以贴在任何位置，这通常不是好事——限制越明确，误用越少。如果不写 <code>@Retention</code>，默认是 CLASS，意味着注解会写进 class 文件，但运行时反射读不到。这是新手最常见的坑：自定义注解想用反射读，却忘了写 <code>@Retention(RetentionPolicy.RUNTIME)</code>，结果 <code>getAnnotation</code> 永远返回 null。' },
      { p: '<code>@Inherited</code> 只对类注解有效，且只沿父类继承，不沿接口继承。子类会“看到”父类上的注解，但用 <code>getDeclaredAnnotations</code> 拿不到，必须用 <code>getAnnotation</code>（它会向上查找）。这个差异在写框架时经常导致 bug。' },
      { p: '<code>@Repeatable</code> 需要配一个容器注解。比如 <code>@Schedule</code> 可重复，就要定义 <code>@Schedules</code> 容器，其 value 是 <code>Schedule[]</code>；使用时写两个 <code>@Schedule</code>，编译器会自动包成 <code>@Schedules</code>。' },

      { h: '6.5 保留策略：注解能活多久' },
      { p: '顺带一提，Lombok 的注解是 SOURCE 保留，用反射去读一定读不到，这不是 bug。想确认某个注解到底保留到哪一期，javap 比查文档可靠。' },
      { p: '保留策略选错的现象很具体：反射读取返回 null 或空数组，框架日志写“未找到注解”，但源码里明明写了。这时不要怀疑框架，先用 <code>javap -v</code> 看 class 文件里有没有 RuntimeVisibleAnnotations 段——有才是 RUNTIME，只有 RuntimeInvisibleAnnotations 就是 CLASS。' },
      { p: '保留策略决定了注解的生命周期，也决定了“谁能读到它”。三种策略对应三个处理时机，理解这张表，等于理解了注解的全部生态。' },
      { table: { head: ['策略', '保留到', '谁能读', '典型例子'], rows: [
        ['SOURCE', '仅源码，编译后丢弃', '编译器、注解处理器', '@Override、@SuppressWarnings、Lombok 的 @Data'],
        ['CLASS', '写入 class 文件，JVM 加载时丢弃', '字节码工具（ASM、AspectJ）', '部分框架的内部注解'],
        ['RUNTIME', '保留到运行时，可通过反射读取', '反射、Spring、Jackson', '@RestController、@Autowired、@Test']
      ] } },
      { p: '为什么 Lombok 用 SOURCE？因为它只需要在编译期修改 AST（抽象语法树），生成 getter/setter/构造器，不需要运行时存在。为什么 Spring 的注解用 RUNTIME？因为容器启动时要扫描类路径、读取注解、注册 Bean。为什么有些 AOP 框架用 CLASS？因为它在类加载时用字节码工具改写方法，不需要反射。' },
      { p: '这里有个容易混淆的点：SOURCE 策略的注解也能“生效”，只是生效在编译期。@Override 就是典型：它被编译器读取后丢弃，但检查已经完成了。所以“注解不生效”要先问：它应该在哪一期生效？' },

      { h: '6.6 定义一个自己的注解' },
      { p: '定义注解用 <code>@interface</code>，元素声明看起来像方法，但没有参数、没有方法体，可以有默认值。元素类型只能是基本类型、String、Class、枚举、注解，或它们的一维数组。' },
      { lang: 'java', code: 'import java.lang.annotation.ElementType;\nimport java.lang.annotation.Retention;\nimport java.lang.annotation.RetentionPolicy;\nimport java.lang.annotation.Target;\n\n@Target({ElementType.TYPE, ElementType.METHOD})\n@Retention(RetentionPolicy.RUNTIME)\npublic @interface ApiLog {\n    String value() default "";\n\n    String module() default "default";\n\n    boolean printArgs() default true;\n\n    int maxLength() default 200;\n}', title: 'ApiLog.java' },
      { lang: 'java', code: 'public class ApiLogUse {\n    @ApiLog(value = "查询用户", module = "user", maxLength = 100)\n    public String query(long id) {\n        return "user-" + id;\n    }\n\n    @ApiLog("删除用户")\n    public void delete(long id) {\n        System.out.println("delete " + id);\n    }\n\n    public static void main(String[] args) throws Exception {\n        ApiLogUse demo = new ApiLogUse();\n        ApiLog a1 = ApiLogUse.class.getMethod("query", long.class).getAnnotation(ApiLog.class);\n        ApiLog a2 = ApiLogUse.class.getMethod("delete", long.class).getAnnotation(ApiLog.class);\n\n        System.out.println(a1.value() + " / " + a1.module() + " / " + a1.maxLength() + " / " + a1.printArgs());\n        System.out.println(a2.value() + " / " + a2.module() + " / " + a2.maxLength());\n    }\n}', title: 'ApiLogUse.java' },
      { out: '查询用户 / user / 100 / true\n删除用户 / default / 200' },
      { p: '注意 <code>@ApiLog("删除用户")</code> 是简写，等价于 <code>@ApiLog(value = "删除用户")</code>——当元素名叫 value 且只需要设置它时，可以省略名字。其他元素没写就用默认值：module 是 default，maxLength 是 200。' },

      { h: '6.7 运行时读取注解' },
      { p: '使用时还有几个语法糖要注意：元素名叫 value 时可以不写名字；数组中只有一个元素时可以省略大括号；元素类型是 Class 时直接写 <code>String.class</code>。这些简写让注解看起来简洁，但读源码时要知道它们等价于什么，否则容易误以为注解有特殊能力。' },
      { p: '读取注解要区分本类声明和继承而来。<code>getDeclaredAnnotations()</code> 只返回直接写在这个元素上的注解；<code>getAnnotations()</code> 会沿继承链向上找，但只对标注了 <code>@Inherited</code> 的类注解有效。字段和方法上的注解永远不会被继承，所以子类重写方法后，父类方法上的注解就看不到了——这也是很多 AOP 在子类方法上失效的原因。' },
      { p: 'RUNTIME 注解通过反射读取。Class、Method、Field、Constructor、Parameter 都实现了 <code>AnnotatedElement</code> 接口，提供四个核心方法：<code>getAnnotation(Class)</code> 拿单个，<code>getAnnotations()</code> 拿全部，<code>isAnnotationPresent(Class)</code> 判断存在，<code>getAnnotationsByType(Class)</code> 处理可重复注解。' },
      { p: '性能上，<code>getAnnotation</code> 每次都会创建注解代理对象，热点路径上应该缓存。Spring 在启动时把注解信息解析成元数据缓存起来，运行时不再反射，这就是它快的原因。' },
      { lang: 'java', code: 'import java.lang.annotation.Annotation;\nimport java.lang.reflect.Method;\n\npublic class ReadAnnotation {\n    @ApiLog(value = "下单", module = "order")\n    public void createOrder() { }\n\n    public static void main(String[] args) throws Exception {\n        Method m = ReadAnnotation.class.getMethod("createOrder");\n\n        if (m.isAnnotationPresent(ApiLog.class)) {\n            ApiLog log = m.getAnnotation(ApiLog.class);\n            System.out.println("注解存在: " + log.value());\n        }\n\n        for (Annotation a : m.getAnnotations()) {\n            System.out.println("全部注解: " + a.annotationType().getSimpleName());\n        }\n\n        System.out.println("注解个数: " + m.getAnnotations().length);\n    }\n}', title: 'ReadAnnotation.java' },
      { out: '注解存在: 下单\n全部注解: ApiLog\n注解个数: 1' },
      { p: '如果这里把 ApiLog 的 @Retention 改成 CLASS，输出会变成“注解个数: 0”，isAnnotationPresent 返回 false。这就是“注解不生效”最典型的原因，占比极高。' },

      { h: '6.8 注解处理器：在编译期干活（含 Lombok）' },
      { p: 'APT 和反射是两条路，取舍很清楚：APT 在编译期生成代码，运行时零开销，但只能看到源码、改不了已编译的类，构建配置也更复杂；反射在运行期读，灵活、能处理任意类，但有性能和访问限制。Lombok 选 APT 是因为要生成样板代码，Spring 选反射是因为要处理用户写的任意 Bean。' },
      { p: '注解处理器（Annotation Processor）在 javac 编译期间运行，能读取源码中的注解，并生成新的源文件或资源。它不需要反射，也不影响运行时性能，是“零成本抽象”的实现方式。Lombok、MapStruct、Dagger、AutoValue 都走这条路。' },
      { flow: ['javac 解析源码为 AST', '发现注解，调用注册的 Processor', 'Processor 读取元素与注解', '生成新的 Java 源文件或报错', 'javac 编译新生成的源文件', '输出 class 文件'] },
      { p: '写一个处理器需要继承 <code>AbstractProcessor</code>，用 <code>@SupportedAnnotationTypes</code> 声明关心的注解，<code>@SupportedSourceVersion</code> 声明支持的 Java 版本，然后在 <code>process</code> 方法里遍历被注解的元素、生成代码。最后要通过 <code>META-INF/services/javax.annotation.processing.Processor</code> 注册，或使用 Google 的 AutoService。' },
      { lang: 'java', code: 'import javax.annotation.processing.AbstractProcessor;\nimport javax.annotation.processing.RoundEnvironment;\nimport javax.annotation.processing.SupportedAnnotationTypes;\nimport javax.annotation.processing.SupportedSourceVersion;\nimport javax.lang.model.SourceVersion;\nimport javax.lang.model.element.Element;\nimport javax.lang.model.element.TypeElement;\nimport javax.tools.Diagnostic;\nimport java.util.Set;\n\n@SupportedAnnotationTypes("ApiLog")\n@SupportedSourceVersion(SourceVersion.RELEASE_17)\npublic class ApiLogProcessor extends AbstractProcessor {\n    @Override\n    public boolean process(Set<? extends TypeElement> annotations, RoundEnvironment roundEnv) {\n        for (TypeElement annotation : annotations) {\n            for (Element e : roundEnv.getElementsAnnotatedWith(annotation)) {\n                ApiLog log = e.getAnnotation(ApiLog.class);\n                processingEnv.getMessager().printMessage(\n                        Diagnostic.Kind.NOTE,\n                        "发现 @ApiLog: " + e.getSimpleName() + " -> " + log.value());\n            }\n        }\n        return true;\n    }\n}', title: 'ApiLogProcessor.java' },
      { out: '注: 发现 @ApiLog: createOrder -> 下单\n（编译时输出，不会出现在运行时）' },
      { p: '这段代码只打印信息，实际项目里更常见的是用 <code>Filer</code> 创建新源文件，或用 JavaPoet 拼代码。关键点是：处理器运行在编译期，读的是源码模型（Element），不是反射；它生成的代码会和手写代码一起被编译。' },
      { p: '注解处理器最容易踩的坑是“注册不上”：META-INF/services 文件名写错、处理器类没有无参构造、模块化项目没有在 module-info 里 provides。表现是编译能过，但生成的代码不存在。' },
      { p: 'Lombok 的 <code>@Builder</code> 很好用，但和构造器注入搭配时要注意：它生成的是全参构造，Spring 若有多个构造器就不知道该用哪个，需要显式标 <code>@Autowired</code> 或只保留一个构造器。这类“注解之间互相影响”的问题，只有理解生成代码才能排查。' },
      { p: 'Lombok 和 record 的取舍：record 是语言级特性，不可变、自动生成构造器与访问器、还能参与模式匹配，适合 DTO 和值对象；Lombok 能生成可变 setter、builder、日志字段，适合实体和配置类。新代码优先 record，需要可变或复杂构建时再用 Lombok，别为了省几行代码引入构建期魔法。' },
      { p: 'Lombok 的 <code>@Data</code> 能在编译期生成 getter、setter、equals、hashCode、toString，源码里看不到这些方法，但 class 文件里有。它靠的是注解处理器 + 修改 AST，属于“非标准”的用法：它读的是 SOURCE 注解，却在编译期改写了语法树。' },
      { p: '优点是代码极简，缺点也很明显：依赖 IDE 插件（否则编辑器报红）、升级 JDK 时容易不兼容、调试时看不到生成的方法、团队新人容易困惑。JDK 14 的 record 在一定程度上替代了它，但 record 是不可变类，适用场景不同。' },
      { p: '如果团队用 Lombok，至少要约定：不要在实体上滥用 <code>@Data</code>（它会生成可变 setter，破坏封装）、<code>@EqualsAndHashCode</code> 要显式指定字段（默认包含全部字段，继承时容易出错）、<code>@SneakyThrows</code> 不要用在业务代码里（它偷偷抛出受检异常，破坏异常契约）。' },

      { h: '6.9 实战：用注解 + 反射写参数校验' },
      { p: '这个校验器的性能瓶颈在反射遍历，不在注解读取。真实框架会把“类到字段列表、字段到约束”的映射缓存起来，第一次校验时构建，之后直接复用；Spring 与 Hibernate Validator 都是这么做的。如果你的校验出现在每秒上万次的接口上，缓存是必须的。' },
      { p: 'Spring 的 <code>@Valid</code> 就是这套思路的工业版：方法参数上标 <code>@Valid</code>，由消息转换器触发校验，底层是 Hibernate Validator 遍历约束注解。自己写一遍最小版本后，再看 Spring 的校验流程，就不会觉得那些注解是黑魔法了。' },
      { p: '下面实现一个最小可用的校验框架：定义 <code>@NotNull</code> 和 <code>@Max</code> 两个注解，写一个校验器遍历对象字段，收集错误信息。Spring 的 <code>@Valid</code> 原理与此类似，只是更完整。' },
      { lang: 'java', code: 'import java.lang.annotation.ElementType;\nimport java.lang.annotation.Retention;\nimport java.lang.annotation.RetentionPolicy;\nimport java.lang.annotation.Target;\nimport java.lang.reflect.Field;\nimport java.util.ArrayList;\nimport java.util.List;\n\n@Target(ElementType.FIELD)\n@Retention(RetentionPolicy.RUNTIME)\n@interface NotNull {\n    String message() default "不能为空";\n}\n\n@Target(ElementType.FIELD)\n@Retention(RetentionPolicy.RUNTIME)\n@interface Max {\n    int value();\n    String message() default "超出最大值";\n}\n\nclass UserForm {\n    @NotNull(message = "用户名必填")\n    String name;\n\n    @Max(value = 120, message = "年龄不能超过 120")\n    int age;\n\n    UserForm(String name, int age) {\n        this.name = name;\n        this.age = age;\n    }\n}\n\npublic class Validator {\n    static List<String> validate(Object obj) throws IllegalAccessException {\n        List<String> errors = new ArrayList<>();\n        for (Field f : obj.getClass().getDeclaredFields()) {\n            f.setAccessible(true);\n            Object v = f.get(obj);\n            if (f.isAnnotationPresent(NotNull.class) && v == null) {\n                errors.add(f.getName() + ": " + f.getAnnotation(NotNull.class).message());\n            }\n            if (f.isAnnotationPresent(Max.class) && v instanceof Integer) {\n                int max = f.getAnnotation(Max.class).value();\n                if ((Integer) v > max) {\n                    errors.add(f.getName() + ": " + f.getAnnotation(Max.class).message());\n                }\n            }\n        }\n        return errors;\n    }\n\n    public static void main(String[] args) throws Exception {\n        System.out.println(validate(new UserForm(null, 30)));\n        System.out.println(validate(new UserForm("tom", 200)));\n        System.out.println(validate(new UserForm("tom", 30)));\n    }\n}', title: 'Validator.java' },
      { out: '[name: 用户名必填]\n[age: 年龄不能超过 120]\n[]' },
      { p: '这个 60 行的框架已经具备核心要素：注解声明约束、反射遍历字段、按注解取值判断、收集错误。要做得更完整，还需要处理嵌套对象、集合元素、分组校验、国际化消息，以及缓存 Field 以提升性能。' },
      { p: '注意 <code>f.setAccessible(true)</code> 是必须的，因为字段通常是 private；如果用了模块化，还要确保被校验的类所在包对校验器开放。这也是为什么有些框架要求实体类提供 getter——用 getter 就不需要改访问权限。' },

      { h: '6.10 注解 + 代理：AOP 的实现方式' },
      { p: '代理还有几个失效边界：private 方法不能被代理（子类看不见、接口也没有），final 类不能被 CGLIB 代理，static 方法不经过实例，自调用不经过代理。理解这些边界，比记住“注解不生效”这个结论有用得多。' },
      { p: '写切面时经常需要拿到注解里的参数，比如在 <code>@Around</code> 里用 <code>@annotation(log)</code> 把注解对象直接绑定到方法参数上。要拿方法上的注解，可以用 <code>MethodSignature.getMethod().getAnnotation(...)</code>；如果注解在接口方法上而实现类没有，还要沿接口再找一遍，这是自研 AOP 最常见的遗漏。' },
      { p: 'Spring 的 <code>@Transactional</code>、<code>@Cacheable</code>、<code>@Async</code> 都是“注解 + 代理”：容器启动时扫描到注解，为 Bean 创建代理对象，方法调用先经过代理，代理根据注解决定是否开启事务、查缓存、丢到线程池。' },
      { p: '代理有两种实现：JDK 动态代理要求目标类实现接口，基于 <code>InvocationHandler</code>；CGLIB 通过生成子类覆盖方法，不要求接口，但无法代理 final 类和 final 方法。Spring Boot 2.x 起默认用 CGLIB，就是为了避免“没实现接口就代理不了”的问题。' },
      { p: '这也解释了一个经典问题：为什么在同一个类里调用自己的 <code>@Transactional</code> 方法，事务不生效？因为自调用走的是 this，不经过代理对象，注解根本没机会被拦截。解决办法是把方法拆到另一个 Bean，或注入自己的代理。' },

      { h: '6.11 注解不生效的五种原因' },
      { p: '另外，注解的“不生效”有时是错觉：注解生效了，但效果被别的逻辑覆盖。比如 <code>@Transactional</code> 默认只对 RuntimeException 回滚，捕获异常不抛就不会回滚；<code>@Cacheable</code> 在同类自调用时不生效。看到没效果，先确认预期行为本身对不对。' },
      { p: '排查时有个实用顺序：先写最小复现，单独一个类、一个注解，确认注解本身没问题；再查框架版本文档，确认这个注解在当前版本存在且语义没变；最后才看扫描配置和代理。把问题缩小到最小单元，比在完整项目里猜要快十倍。' },
      { ol: [
        '保留策略不对：想运行时反射读取，却只写了默认的 CLASS 或 SOURCE。检查 @Retention。',
        '目标位置不对：注解的 @Target 不包含当前使用位置，编译期就会报错；如果是框架自定义的，可能被静默忽略。',
        '没有被扫描到：Spring 只扫描启动类所在包及子包，注解在别的包又没配 @ComponentScan，自然不生效。',
        '代理没有生效：自调用、private 方法、final 类导致 AOP 无法拦截，注解形同虚设。',
        '处理器没注册：编译期注解处理器的 META-INF/services 配置错误，代码没有生成，但编译不报错。'
      ] },
      { note: '<b>一条经验：</b>注解是“声明”，生效靠“处理器”。遇到不生效，先问“谁应该读它、它在哪一期读”，比盲目加配置有效得多。' },

      { h: '6.12 本章小结' },
      { list: [
        '注解是元数据，本身不改变行为；必须有编译器、注解处理器、字节码工具或反射去读它。',
        '@Target 决定能贴在哪，@Retention 决定活到哪一期，@Inherited 只对类注解有效，@Repeatable 需要容器注解。',
        'SOURCE 给编译期用，CLASS 给字节码工具用，RUNTIME 给反射用；选错策略是注解不生效的头号原因。',
        '自定义注解用 @interface，元素可有默认值，value 可简写；运行时用 AnnotatedElement 的四个方法读取。',
        '注解处理器在编译期生成代码，Lombok、MapStruct 都靠它；AOP 注解靠代理在运行期拦截。',
        '注解不生效先查保留策略、目标位置、扫描范围、代理是否生效、处理器是否注册。'
      ] },

      { h: '6.13 常见追问' },
      { list: [
        '<b>问：注解和接口有什么区别？</b><br>答：注解在字节码层面确实是一种特殊的接口，编译器让它继承 <code>java.lang.annotation.Annotation</code>，但它不能被实例化，也不能被继承扩展，只能作为元数据被读取。接口定义的是「能做什么」，靠实现类提供行为；注解定义的是「标记了什么」，行为要另写处理器去读。所以注解本身不会让任何逻辑发生：加 <code>@Transactional</code> 不开事务，是代理开的。',
        '<b>问：@Inherited 为什么对接口无效？</b><br>答：Java 规范里 <code>@Inherited</code> 只对类的继承生效，而且只沿父类链向上查找，不沿接口继承。接口上的注解不会被子接口或实现类「继承」，<code>getAnnotation</code> 在实现类上查不到。框架需要自己向上遍历接口层级找注解，Spring 的组合注解、AOP 找方法注解时都要做这一步，这也是自研框架常漏掉的点。',
        '<b>问：运行时注解会影响性能吗？</b><br>答：反射读取确实有开销，<code>getAnnotation</code> 每次调用都可能创建注解代理对象，反复读会有成本；但开销只发生在读取时，注解贴在代码上不占运行时间。框架的通用做法是在启动期扫一遍类路径，把注解信息解析成元数据缓存起来，运行期只查表、不再反射。所以性能问题多半来自「在热路径上反复读注解」，而不是注解本身。',
        '<b>问：能不能在注解里写逻辑？</b><br>答：不能。注解元素只能是常量表达式：基本类型、String、Class、枚举、注解，或它们的一维数组，可以有默认值，但不能有方法体、不能调方法、不能抛异常、不能引用变量。想要逻辑就得写处理器：编译期用注解处理器（Lombok、MapStruct），运行期用反射加代理（Spring 的 <code>@Transactional</code>）。注解负责声明，处理器负责干活。',
        '<b>问：Lombok 算不算歪门邪道？</b><br>答：它是工程取舍，不是邪道也不是银弹。好处是省掉大量样板代码（getter、setter、构造器、日志字段），坏处是依赖 IDE 插件、升级 JDK 时容易不兼容、生成的方法在源码里看不见、新人容易困惑。新项目可以优先用 <code>record</code> 覆盖不可变的 DTO，需要可变 setter 或 builder 时再用 Lombok，并在团队规范里限制把 <code>@Data</code> 用在实体上。'
      ] },

      { h: '6.14 自测与练习' },
      { ol: [
        '编译并运行 BuiltinDemo，观察 @Deprecated 的编译警告，再把 @SuppressWarnings 移到方法上，比较警告范围。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><pre class="tb-ans-code" data-lang="java">import java.util.ArrayList;\nimport java.util.List;\n\nclass Legacy {\n  @Deprecated\n  static String oldBark() {\n    return "old bark";\n  }\n}\n\n@SuppressWarnings({"unchecked", "rawtypes"})\npublic class BuiltinDemo {   // 注解挪到 rawList 上再编\n  static List&lt;String> rawList() {\n    return new ArrayList();\n  }\n\n  public static void main(String[] args) {\n    System.out.println("wang");\n    System.out.println(Legacy.oldBark());\n    List&lt;String> l = rawList();\n    System.out.println("rawList 大小=" + l.size());\n  }\n}\n\njavac -Xlint:deprecation BuiltinDemo.java\njava BuiltinDemo\n\n# 警告: [deprecation] Legacy 中的 oldBark() 已过时\n# wang / old bark / rawList 大小=0</pre><b>要点</b>：@Deprecated 的保留策略是 RUNTIME，注解写进 class 文件，javac 读的正是这份属性，所以编译期告警和运行时反射可见并不矛盾；过时警告只在调用方与声明方不在同一个最外层类时才报出，所以要把 oldBark 放进另一个类 Legacy。真正只在编译期起作用的是 @SuppressWarnings，作用域就是它标注的那个元素，从类挪到方法上，类里其余同类告警会重新出现。</div></details>',
        '把 ApiLog 的 @Retention 改成 CLASS，重新运行 ApiLogUse，记录输出变化并解释原因。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><pre class="tb-ans-code" data-lang="java">import java.lang.annotation.ElementType;\nimport java.lang.annotation.Retention;\nimport java.lang.annotation.RetentionPolicy;\nimport java.lang.annotation.Target;\nimport java.lang.reflect.Method;\n\n@Retention(RetentionPolicy.RUNTIME) // 改成 CLASS 再跑\n@Target(ElementType.METHOD)\n@interface ApiLog {\n  String value();\n}\n\npublic class ApiLogUse {\n  @ApiLog("下单")\n  public void order() {}\n\n  public static void main(String[] args)\n      throws Exception {\n    Method m = ApiLogUse.class.getMethod("order");\n    System.out.println("注解存在: "\n        + m.isAnnotationPresent(ApiLog.class));\n    System.out.println("注解个数: "\n        + m.getAnnotations().length);\n  }\n}\n\njavac ApiLogUse.java\njava ApiLogUse\njavap -v ApiLogUse | grep -i annotation</pre><b>要点</b>：CLASS 策略会把注解写进 class 文件，但 JVM 加载后运行时不可见，反射读不到、isAnnotationPresent 返回 false，而编译毫无报错；用 javap -v 看是 RuntimeVisibleAnnotations 还是 RuntimeInvisibleAnnotations，一眼就能确认保留策略，这是注解不生效最常见的原因。</div></details>',
        '扩展 Validator，增加 @Min 注解和 String 长度校验，处理 null 值与类型不匹配的情况。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><pre class="tb-ans-code" data-lang="java">import java.lang.annotation.ElementType;\nimport java.lang.annotation.Retention;\nimport java.lang.annotation.RetentionPolicy;\nimport java.lang.annotation.Target;\nimport java.lang.reflect.Field;\n\n@Retention(RetentionPolicy.RUNTIME)\n@Target(ElementType.FIELD)\n@interface Min {\n  long value();\n}\n\n@Retention(RetentionPolicy.RUNTIME)\n@Target(ElementType.FIELD)\n@interface MaxLen {\n  int value();\n}\n\nclass Order {\n  @Min(1)\n  int count = 0;\n  @MaxLen(5)\n  String name = "abcdef";\n  @Min(1)\n  String wrong = "abc";\n  @Min(1)\n  String empty = null;\n}\n\npublic class Validator {\n  static void check(Object o)\n      throws IllegalAccessException {\n    for (Field f : o.getClass().getDeclaredFields()) {\n      f.setAccessible(true);\n      Object v = f.get(o);\n      String n = f.getName();\n      Min min = f.getAnnotation(Min.class);\n      if (min != null) {\n        if (v == null) {\n          System.out.println(n + ": 不能为空");\n        } else if (!(v instanceof Number)) {\n          System.out.println(n + ": 类型不是数字");\n        } else if (((Number) v).longValue()\n            &lt; min.value()) {\n          System.out.println(n + ": 小于 "\n              + min.value());\n        }\n      }\n      MaxLen max = f.getAnnotation(MaxLen.class);\n      if (max != null &amp;&amp; v instanceof String\n          &amp;&amp; ((String) v).length() > max.value()) {\n        System.out.println(n + ": 长度超过 "\n            + max.value());\n      }\n    }\n  }\n\n  public static void main(String[] args)\n      throws Exception {\n    check(new Order());\n  }\n}\n\njavac Validator.java\njava Validator</pre><b>要点</b>：校验顺序必须是先判 null、再判类型、最后判约束，否则 Field.get 拿到的包装类型一比较就抛 NullPointerException 或 ClassCastException；类型不匹配时给一条明确错误而不是让它抛异常，每个约束先用 getAnnotation 判空再取值。</div></details>',
        '写一个注解处理器，扫描所有带 @ApiLog 的方法并生成一个 Markdown 清单文件（提示：用 Filer 创建资源）。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><pre class="tb-ans-code" data-lang="java">import java.io.PrintWriter;\nimport java.io.Writer;\nimport java.util.Set;\nimport javax.annotation.processing.AbstractProcessor;\nimport javax.annotation.processing.RoundEnvironment;\nimport javax.annotation.processing.SupportedAnnotationTypes;\nimport javax.lang.model.SourceVersion;\nimport javax.lang.model.element.Element;\nimport javax.lang.model.element.TypeElement;\nimport javax.tools.Diagnostic;\nimport javax.tools.StandardLocation;\n\n@SupportedAnnotationTypes("ApiLog")\npublic class ApiLogProcessor extends AbstractProcessor {\n  @Override\n  public SourceVersion getSupportedSourceVersion() {\n    return SourceVersion.latestSupported();\n  }\n\n  @Override\n  public boolean process(Set&lt;? extends TypeElement> anns,\n      RoundEnvironment env) {\n    Set&lt;? extends Element> hits =\n        env.getElementsAnnotatedWith(ApiLog.class);\n    if (hits.isEmpty()) return false;\n    try {\n      Writer out = processingEnv.getFiler()\n          .createResource(\n              StandardLocation.CLASS_OUTPUT, "",\n              "META-INF/apilog.md")\n          .openWriter();\n      PrintWriter pw = new PrintWriter(out);\n      for (Element e : hits) {\n        ApiLog a = e.getAnnotation(ApiLog.class);\n        pw.println("- "\n            + e.getEnclosingElement().getSimpleName()\n            + "#" + e.getSimpleName() + " "\n            + a.value());\n        processingEnv.getMessager().printMessage(\n            Diagnostic.Kind.NOTE,\n            "发现 @ApiLog: " + e.getSimpleName());\n      }\n      pw.close();\n    } catch (Exception ex) {\n      processingEnv.getMessager().printMessage(\n          Diagnostic.Kind.ERROR, ex.toString());\n    }\n    return true;\n  }\n}\n\njavac ApiLogUse.java ApiLogProcessor.java\njavac -processor ApiLogProcessor ApiLogUse.java\ncat META-INF/apilog.md</pre><b>要点</b>：处理器在编译期拿到的是源码模型而不是反射对象，用 RoundEnvironment.getElementsAnnotatedWith 遍历元素、Filer.createResource 在 CLASS_OUTPUT 下建文件；process 每一轮都会被调用，没有命中元素时必须直接返回，否则重复创建同一个资源会抛 FilerException。自动发现要靠 META-INF/services/javax.annotation.processing.Processor 注册，只用 -processor 显式指定时可以不注册。</div></details>',
        '（思考）如果你的 @Transactional 方法在同类内部被调用，事务没生效，你会怎么改？说出两种方案及各自的代价。<details class="tb-ans"><summary>参考答案</summary><div class="ans-body"><b>预期现象</b>：自调用走的是 <code>this</code>，没有经过 Spring 创建的代理对象，注解根本没机会被拦截，事务、缓存、异步全部失效。<b>为什么</b>：这类注解靠代理增强，只有从代理入口进来的调用才会被拦截；同一实例内部的方法调用只是普通 Java 调用。<b>要点</b>：方案一是把带注解的方法拆到另一个 Bean，注入后调用，代价是多一个类但边界更清楚；方案二是注入自身代理或取当前代理，代价是与 Spring 耦合、可测试性变差。另外要确认方法不是 private、类不是 final。</div></details>'
      ] },
      { note: '<b>练习提示：</b>第 4 题先跑通“能生成一个空文件”，再逐步加内容；第 5 题的重点是理解“代理对象”和“this”的区别，而不是背结论。' },
    ]
  };

  /* ==MORE== */
})();
