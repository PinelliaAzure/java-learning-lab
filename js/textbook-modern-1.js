/* 教材正文：现代 Java 与 AI 工程 第 1–4 章（Java 21–25 / 虚拟线程 / Boot 4 / Testcontainers） */
(function () {
  'use strict';
  var T = window.JAVA_TEXTBOOK || (window.JAVA_TEXTBOOK = {});

  T['modern-lts'] = {
    meta: '本章约 5200 字 · 建议 35 分钟 · 配套流程图与 3 道习题',
    blocks: [
      { h: '1.1 为什么 2026 年要重学版本节奏' },
      { p: '几年前团队讨论的默认问题是“上 8 还是上 11”，现在这个问题已经过时。2026 年的现实是：主流框架的基线早已抬到 17，Spring Boot 4 又把 Jakarta EE 11 与 JSpecify 空安全一起带了进来，而最新的 LTS 是 2025 年 9 月发布的 Java 25。选型讨论的重点已经从“要不要升”变成“以多快的节奏跟进，以及第一步从哪里下手”。' },
      { p: '节奏本身值得先记住：LTS 每两年一次，17 在 2021 年 9 月，21 在 2023 年 9 月，25 在 2025 年 9 月，下一个是 2027 年 9 月的 27。中间的功能版本每半年一个，只享受六个月的支持，适合尝鲜、不适合押在生产上。把这条时间轴记住，就能快速判断一个特性“现在能不能用”：只有在 LTS 上转正的特性，才值得写进需要长期维护的代码里。' },
      { p: '第二个变化是语法增量的性质变了。8 到 17 那一代的主线是补课：lambda、Stream、Optional、var、record、sealed，一次把缺失的现代语言能力补上。21 到 25 这一代更接近收口：把预览了几轮的 record 模式、switch 模式匹配、Gatherers、FFM 逐个转正，并把并发模型从“线程”整体挪向虚拟线程与作用域值。变化条目不多了，但每一条都直接牵动架构选型。' },

      { p: '把视角放回团队，这条时间轴的实际意义是：你今天写的代码，大概率要在两个 LTS 周期里活下去。一个 2023 年立项、跑在 17 上的系统，如果不做任何动作，到 2027 年会同时面对“17 的扩展支持接近尾声”和“下一个 LTS 已经发布两年”两个问题。反过来，如果每年花两周做一次小步跟进，这两个问题都不会积累成项目。版本管理真正考验的不是技术判断，而是有没有把它排进日常节奏。' },
      { h: '1.2 Java 25 LTS 到底给了什么' },
      { p: 'Java 25 于 2025 年 9 月 GA，是目前新项目应当默认选择的版本。它值得单独记下来的改动可以分三类：语言层的收尾、库层的补强、以及平台层与运行时的清理。下面这张表列出的都是会实际影响你写代码或选参数的项目。' },
      { table: { head: ['JEP / 特性', '内容', '状态'], rows: [
        ['JEP 440 / 441', 'record 模式、switch 模式匹配', '21 转正'],
        ['JEP 456', '未命名变量与模式 _', '22 转正'],
        ['JEP 454', 'FFM（外部函数与内存 API）', '22 转正'],
        ['JEP 485', 'Stream Gatherers', '24 转正'],
        ['JEP 506', 'Scoped Values', '25 转正'],
        ['JEP 505', '结构化并发', '25 第五次预览'],
        ['预览特性', '紧凑源文件与实例 main', '25 仍为预览'],
        ['JEP 519 / 503', '紧凑对象头转正、移除 32 位 x86 端口', '25 落地']
      ] } },
      { p: '表里“转正”和“预览”的差别不是文字游戏。预览特性要加 --enable-preview 才能编译和运行，而且下一个版本可能改签名，一旦写进业务代码，升级 JDK 时就会编译失败，甚至行为变化。所以生产代码的原则很朴素：只用转正的，预览特性放在实验分支里观察，等它转正再合并。' },
      { note: '<b>提示：</b>判断一个 API 是否转正，看 JEP 的状态，不要看博客标题。很多文章把“第 N 次预览”直接写成“新特性发布”，照抄会踩坑。' },
      { p: '平台层的两处清理也值得知道。JEP 503 移除了 32 位 x86 端口，说明老平台的包袱正在被主动卸掉；JEP 519 让紧凑对象头转正，在支持的平台上能明显降低每个对象的内存开销，属于纯运行时优化，代码一行不用改。这两条加起来说明 25 不只是一次语法更新，它同时在给运行时的长期演进铺路。' },
      { p: '对业务团队来说，25 最划算的收益其实不是新语法，而是“可以放心用 21 就在的东西”。虚拟线程、模式匹配、SequencedCollection 这些在 21 上已经稳定的能力，到了 25 才真正成为“团队不需要额外解释就能用”的默认项。' },

      { p: '还有一件容易被忽略的事：25 之所以让人觉得“变化不大”，是因为最受影响的那部分发生在运行时。虚拟线程在 21 就转正了，到 25 才被广泛默认使用；分代 ZGC 在 23 转正，到 25 才成为很多团队评估后的默认选择；紧凑对象头在 25 转正，直接影响的是堆占用和缓存命中率，而不是任何一行代码。这类改动不会出现在语法教学里，却决定了同样硬件能扛多少请求。' },
      { p: '另一个观察是模块导入声明这类“写法层面的糖”仍在预览中。它允许用一行 import module java.base 取代一长串 import，出发点是把“教学示例要写十行 import”这个尴尬消掉。看到这类特性时，正确的态度是知道它存在、知道它还没定稿，然后继续用现在的写法，而不是抢先把预览语法铺进团队规范。' },
      { h: '1.3 模式匹配：从 instanceof 链到穷尽分派' },
      { p: '21 转正的两条 JEP 是一对。record 模式（440）让对象可以被解构，switch 模式匹配（441）让 switch 按类型与结构分派，配合 sealed 接口还能拿到穷尽性检查。它们合起来替换的，正是那种“先 instanceof 判断、再强转、再取值”的老写法。下面这段代码把三层结构一次写完。' },
      { code: 'sealed interface Shape permits Circle, Rect, Triangle {}\nrecord Circle(double r) implements Shape {}\nrecord Rect(double w, double h) implements Shape {}\nrecord Triangle(double base, double h) implements Shape {}\n\nstatic double area(Shape s) {\n    return switch (s) {\n        case Circle c                 -> Math.PI * c.r() * c.r();\n        case Rect r when r.w() == r.h() -> r.w() * r.h();   // guard 守卫\n        case Rect r                   -> r.w() * r.h();\n        case Triangle t               -> t.base() * t.h() / 2;\n    };   // sealed 类型下无 default 也能编译\n}' },
      { out: '面积=78.53981633974483\n面积=16.0\n面积=6.0' },
      { p: '这段代码有三个细节值得停下来看。第一，没有 default，因为 Shape 是 sealed，编译器会检查 permits 列出的每个子类型都被覆盖，漏一个是编译错误而不是运行期兜底。第二，when 守卫让同一个类型可以按条件细分，比在分支体里再写 if 干净得多。第三，模式变量 c、r、t 是强类型的，不再需要手工强转，也不会因为写错类型名而在运行期抛 ClassCastException。' },
      { p: '嵌套模式能一次解构两层结构。比如一个订单里包着收货地址，地址里包着城市，过去要写三行取值，现在一行写完。写法上要注意顺序：外层类型在前，字段名按 record 定义的顺序排列，多余的成分用未命名变量占位。' },
      { code: 'record Address(String city, String street) {}\nrecord Order(String id, Address shipTo) {}\n\nstatic String cityOf(Order o) {\n    return switch (o) {\n        case Order(var id, Address(var city, _)) when !city.isBlank() -> city;\n        case Order(var id, Address(_, _)) -> \"未填写城市\";\n    };\n}' },
      { out: '城市=杭州\n城市=未填写城市' },
      { p: '很多人第一次写模式匹配会写得比强转链更长，原因通常是分支切得太细。合理的切法是按“业务上真正不同的处理”来分，而不是按类型一一对应。如果两个分支的处理逻辑完全一样，就应该合并成一个多标签分支，而不是复制两遍。' },
      { p: '还有一条边界：switch 的模式匹配不做隐式空值处理。选择器为 null 时仍然抛 NullPointerException，除非你显式写 case null。这一点和 if 链的行为一致，但很多人因为“看起来像类型分派”而误以为 null 会被吞掉，线上就会见到 NPE。' },

      { p: '在 21 之前，处理这种多类型分派的标准做法是访问者模式：每种类型一个 accept 方法，每种处理逻辑一个访问者类。它能做到穷尽性，但代价是每个新类型要改一圈，而且访问者里的状态管理很别扭。sealed 加模式匹配把这件事压回到一个 switch 里，穷尽性由编译器保证，新增子类型时所有遗漏的 switch 会在编译期一起报出来。这条迁移路径值得记住，因为很多老代码库里还留着访问者模式的痕迹。' },
      { p: '实现层面还有一点值得知道：带类型模式的 switch 会编译成 invokedynamic 引导的类型分派，第一次执行时有一次性引导开销，之后走的是和手写判断接近的路径。所以不必担心“模式匹配比 if 慢”，但也不要指望它更快。把它当成可读性工具，而不是性能工具，判断会更稳。' },
      { h: '1.4 未命名变量 _：把“我不用”写在签名上' },
      { p: 'JEP 456 在 22 转正，允许在“语法要求有名字、但逻辑上用不到”的位置写一个下划线。这些位置包括 catch 参数、lambda 参数、增强 for 的循环变量、try-with-resources 的资源变量，以及 record 模式里的成分。它带来的不是新能力，而是可读性：读者一眼就能确认这个值是故意被丢弃的，不是漏写。' },
      { p: '在解构场景里它的价值最明显。一个四字段的 record，你只关心其中一个，老写法要给另外三个起名，名字还得起得有意义，否则静态检查会抱怨；新写法直接写四个下划线，意图清清楚楚，也不会被误读成“这个变量以后会用”。' },
      { code: '// catch 参数不需要时\ntry {\n    return Integer.parseInt(raw);\n} catch (NumberFormatException _) {\n    return 0;\n}\n\n// lambda 参数不需要时\nmap.forEach((_, count) -> total.add(count));\n\n// record 模式里只关心一个成分\nif (o instanceof Order(var id, Address(_, _))) {\n    System.out.println(\"订单 \" + id);\n}' },
      { out: '0\n计数=42\n订单 A-1001' },
      { p: '边界要说清三点。第一，下划线是不可读的占位符，在同一个模式里可以出现多次，但你不能读它的值，也不能给它赋值。第二，它不能当作普通标识符继续使用；在很老的代码里下划线曾经是合法变量名，这条从 9 开始就被收紧了。第三，它不改变语义，只是让意图显式化，别指望它带来任何性能收益。' },
      { p: '团队里推这条特性时，最好同时定一条风格约定：什么时候允许用下划线。我的建议是“只在变量确实不可能被使用的位置用”，比如异常对象只用来标识类型、lambda 的第二个参数是累计值。如果一段代码里出现大量下划线，通常说明这个 record 的字段设计过宽，值得回头看看是不是该拆。' },

      { h: '1.5 Gatherers：把自定义中间操作变成一等公民' },
      { p: 'Stream 的中间操作长期只有 map、filter、flatMap、distinct、sorted、limit 这一套。遇到滑动窗口、按大小分批、去重保序这类需求，过去只有两条路：硬写成 collector（但 collector 只能放在终端），或者干脆退回 for 循环。JEP 485 在 24 转正，给出了第三条路：Stream.gather 加一个 Gatherer 实现。' },
      { p: 'Gatherer 的结构可以理解成四件套：初始状态、整合器（integrator）、组合器（combiner，并行时才会被调用）、以及可选的收尾器（finisher）。最常用的是顺序版本 Gatherer.ofSequential 配一个整合器；需要提前结束的场景，让整合器返回 false 即可短路。' },
      { code: '// 固定大小滑窗：每 3 个元素一组\nList<String> logs = List.of(\"a\", \"b\", \"c\", \"d\", \"e\");\n\nList<List<String>> windows = logs.stream()\n        .gather(Gatherers.windowSliding(3))\n        .toList();\n\n// 自定义：遇到 e 就提前结束\nList<Integer> head = Stream.of(1, 2, 3, 4, 5)\n        .gather(Gatherers.fold(() -> 0, Integer::sum))\n        .toList();' },
      { out: '[[a, b, c], [b, c, d], [c, d, e]]\n[15]' },
      { p: '内置的几个工厂方法覆盖了大部分现实需求：windowSliding 做滑动窗口，windowFixed 做定长分批，fold 做聚合，scan 做前缀累积，mapConcurrent 做“并发执行但保持顺序”。最后这个值得单独说一句：它让 IO 密集流水线的并行化变成一行代码，配合 JDK 21 之后的虚拟线程，能把“逐个调用下游”的串行代码顺手变成受控并发，而不必自己管理线程池和结果顺序。' },
      { p: '什么时候不该用？当这段逻辑只有两三行、也没有第二处会用到时，一个 for 循环比一个 Gatherer 更好读——Gatherer 的价值在“同一个中间操作要在多处复用”，以及“需要短路或延迟消费语义”。判断标准可以简化成一句：如果抽出来之后还要写注释解释参数含义，就先不抽。' },
      { p: '还有一个实践上的注意点：Gatherer 的状态是每个流实例独立的，不要去捕获外部可变变量。想让“分组”这种有状态逻辑可并行，就必须把状态放进整合器的中间结果里，并正确实现组合器，否则并行流下结果会错乱，而且这种错误在小数据量上几乎测不出来。' },

      { p: '和 collector 的分工也要理清。collector 是终端操作，负责把整个流收敛成一个结果；Gatherer 是中间操作，输出仍然是流，后面还能继续接 map、filter、collect。很多过去硬写成 collector 的“分批”逻辑，本质上是中间操作，改成 Gatherer 之后组合性立刻变好：分批之后还能再过滤、再限流，这是 collector 做不到的。' },
      { h: '1.6 FFM：用纯 Java 调 C' },
      { p: 'JNI 长久以来的痛点是胶水太多：要写 C 头文件、编译动态库、处理局部引用与线程附着，出错时往往直接是段错误或进程崩溃，连堆栈都没有。JEP 454 在 22 转正，把这套能力收进标准库：java.lang.foreign 提供 MemorySegment（带边界检查的内存段）、Arena（生命周期管理）、Linker（函数签名映射）以及 downcall、upcall 两类方法句柄。' },
      { p: '三个概念记住就够用。Arena 管内存的生死，try-with-resources 关闭后它分配的所有内存段立刻失效，之后再访问抛的是异常而不是段错误；MemoryLayout 描述结构体与数组的布局；MethodHandle 表示一个具体的 C 函数。这套设计最大的收益，是把“非法内存访问”从“进程崩溃”变成“可捕获的运行时异常”。' },
      { code: 'import java.lang.foreign.*;\nimport java.lang.invoke.MethodHandle;\n\npublic class NativeDemo {\n    public static void main(String[] args) throws Throwable {\n        Linker linker = Linker.nativeLinker();\n        MethodHandle strlen = linker.downcallHandle(\n                linker.defaultLookup().find(\"strlen\").orElseThrow(),\n                FunctionDescriptor.of(ValueLayout.JAVA_LONG, ValueLayout.ADDRESS));\n\n        try (Arena arena = Arena.ofConfined()) {\n            MemorySegment text = arena.allocateFrom(\"hello ffi\");\n            long len = (long) strlen.invokeExact(text);\n            System.out.println(\"长度=\" + len);\n        }\n    }\n}' },
      { out: '长度=9' },
      { note: '<b>提示：</b>使用 FFM 需要在启动参数里加 --enable-native-access=ALL-UNNAMED（或写明具体模块），否则运行时打印受限警告；按当前的收紧趋势，未来版本可能直接拒绝未声明的调用。' },
      { p: '迁移判断要克制。只有当确实需要调用本地库时才值得上 FFM：加解密硬件库、图像编解码、工业设备 SDK、以及部分科学计算库。绝大多数被归因为“JNI 慢”的性能问题，实际热点在 SQL 往返、JSON 序列化和锁竞争上，先把这三处查清楚，比换调用方式收益大一个量级。' },

      { h: '1.7 实例 main 与紧凑源文件（预览）' },
      { p: '这一条在 25 上仍然是预览：允许一个 .java 文件不写类、不写 public static void main，直接写顶级方法甚至顶级语句，用 java Hello.java 就能跑。它的目标不是替代工程结构，而是让“教第一个程序”和“写一次性小脚本”不必先解释类、包、修饰符这一整套东西。' },
      { code: '// 文件 Hello.java（25 预览，需 --enable-preview）\nvoid main() {\n    String name = args().findFirst().orElse(\"world\");\n    System.out.println(\"Hi, \" + name);\n}\n\nint add(int a, int b) {\n    return a + b;\n}' },
      { out: '$ java --enable-preview Hello.java\nHi, world\n$ java --enable-preview Hello.java 张三\nHi, 张三' },
      { p: '预览身份意味着两点现实约束：必须加 --enable-preview，且下一个版本可能改语法。所以它适合教学演示、代码评审里的小例子、以及一次性脚本原型；不适合进生产代码库。团队里如果确实有“用 Java 写运维脚本”的需求，可以先拿它做原型，但正式交付仍建议用标准的单文件源码启动方式——带 class 的单文件源码启动从 11 起就支持，稳定且不需要预览开关。' },
      { p: '这条特性真正想解决的问题，是 Java 在“第一个程序”的体验上长期输给 Python 和 JavaScript。从工程角度看它没什么用；从语言生态看，它决定了新人对这门语言的第一印象。判断它值不值得关注，取决于你是把它当教学工具还是当生产特性——这两件事的答案完全不同。' },

      { p: '从工程角度看，这条特性的价值几乎为零：生产代码有明确的包结构和构建工具，不会因为省掉一个 class 关键字而变好。但从生态角度看它很重要——它决定了“第一次接触 Java”的人要不要先理解 public class 与文件名必须一致这类约定。评价一个语言特性时把这两个视角分开，就不容易在技术讨论里吵起来。' },
      { h: '1.8 8/11/17/21 的支持状态与升级路径' },
      { p: '版本选型真正难的地方不是“哪个新”，而是“哪个还有人修”。先看一张按公开路线图整理的对照表。这里用的是 Oracle 的口径，Azul、Adoptium、BellSoft 等发行版的维护窗口各不相同，正式采购前必须以厂商合同为准。' },
      { table: { head: ['版本', '发布', '公开路线图口径', '建议定位'], rows: [
        ['8', '2014-03', '公开更新早已结束，靠第三方发行版维持', '仅限遗留系统过渡'],
        ['11', '2018-09', '商用支持约在 2026-09 到期', '必须开始规划迁移'],
        ['17', '2021-09', 'premier 约到 2026-09，extended 到 2029-09', '可作最低兼容基线'],
        ['21', '2023-09', 'premier 约到 2028-09', '虚拟线程可用，稳妥选择'],
        ['25', '2025-09', 'premier 约到 2030-09', '新项目默认目标']
      ] } },
      { p: '从这张表能读出一个很实际的压力点：11 的窗口在 2026 年前后到期，而 17 的 premier 窗口也在这个区间。也就是说，2026 年做版本规划，实际上是在决定“未来三到五年的基线”，而不是“今年要不要升”。把它当成一次性项目去做，几乎必然延期。' },
      { p: '升级路径有一个反直觉的结论：不要一级一级跳。从 8 直接到 17 的痛，通常比 8 到 11 再到 17 更小，因为中间版本的弃用与移除会叠加成两轮破坏，等于把同样的问题解两遍。正确做法是选一个目标 LTS 一次跳到位，然后按编译错误逐类修。' },
      { flow: ['盘点依赖与字节码版本', 'CI 与镜像切到目标 JDK', '编译并清空弃用警告', '按错误分类批量修复', '全量回归与压测', '灰度发布与回滚预案'] },
      { p: '落地时按四个动作推进最省力。第一步用 jdeps 扫全部依赖，把仍依赖 javax.*、仍打包老 ASM、或用了移除 API 的库列出来，先换库再改代码；第二步把 CI 的 toolchain、Docker 基础镜像、本地开发环境同时切到目标 JDK，避免“我这能跑”；第三步单独开一个分支，只做编译与启动，不动业务逻辑，让回归范围可控；第四步再逐步启用新特性，比如把某些 synchronized 换成 ReentrantLock 以配合虚拟线程。' },
      { p: '四类错误占绝大多数：javax 命名空间没换、字节码增强库（老版本 ASM、CGLIB、ByteBuddy）不认识新 class 文件版本、反射访问被模块系统拦下、以及被移除的 JVM 参数或 GC 选项。前三类可以用 jdeps 加启动日志一次捞出来，最后一类只能靠对比参数清单逐个试。' },
      { code: '$ java -version\nopenjdk version "25" 2025-09-16 LTS\nOpenJDK Runtime Environment (build 25+36-LTS)\n\n$ jdeps --multi-release 25 --jdk-internals target/app.jar\ncom.example.Legacy  ->  sun.misc.Unsafe\ncom.example.Legacy  ->  jdk.internal.misc.SharedSecrets' },
      { out: 'openjdk version "25" 2025-09-16 LTS\nOpenJDK Runtime Environment (build 25+36-LTS)\n\ncom.example.Legacy  ->  sun.misc.Unsafe\ncom.example.Legacy  ->  jdk.internal.misc.SharedSecrets' },
      { p: '最后是节奏建议。把 JDK 升级当成季度任务，而不是五年一次的战役：每季度跟一次小版本（例如 25.0.x，包含安全修复），每年评估一次下一个 LTS 的预览特性，让团队始终知道“下一步升什么、要改哪里”。这样做的好处是，升级永远是一个小 PR，而不是一次需要全公司协调的大项目。' },

      { p: '如果目标是 17 或 21，还有一条额外的取舍：17 的优势是库兼容性最广、踩坑资料最多；21 的优势是虚拟线程与模式匹配同时可用，且窗口更长。对新项目，21 是比 17 更好的起点；对存量系统，先把 17 作为最低兼容基线，再评估是否直接跳到 25，往往比“17 然后 21 然后 25”三次迁移更省总成本。' },
      { h: '1.9 本章小结' },
      { p: '这一章的主线，是把版本号变成一组可执行的判断。回头看，能带走的东西不多，但每一条都会在真实项目里反复用到。' },
      { list: [
        'LTS 每两年一个：17、21、25，下一个是 27；当前默认目标是 25。',
        'record 模式与 switch 模式匹配在 21 转正，配合 sealed 接口能拿到穷尽性编译检查。',
        '未命名变量 _（22 转正）只提升可读性，不改变语义；它不能读、不能赋值。',
        'Gatherers（24 转正）让自定义中间操作成为一等公民，但两三行的逻辑仍应写成循环。',
        'FFM（22 转正）替代 JNI，记得加 --enable-native-access；迁移前先确认热点真的在本地调用。',
        '紧凑源文件与实例 main 在 25 仍是预览，只适合教学与脚本原型。',
        '升级别一级一级跳，选目标 LTS 一次跳到位，再按错误分类修。'
      ] },
      { p: '如果只记一句话，就记这句：先确定支持窗口，再决定语法。语法用错了改起来便宜，版本选错了会被迫在某个季度之外做一次没有预算的迁移。' }
    ]
  };

  T['virtual-threads'] = {
    meta: '本章约 5200 字 · 建议 35 分钟 · 配套流程图与 3 道习题',
    blocks: [
      { h: '2.1 虚拟线程为什么在 2026 年才真正流行' },
      { p: '“一个请求一个线程”本来是最好写的并发模型：请求进来开线程，代码从上往下写，异常用 try-catch 接，调试时栈是连续的。它的问题只有一个——线程太贵。平台线程的栈按 MB 预留，操作系统调度一个线程的成本在微秒级，几千个并发连接就把机器压垮。于是行业转向了异步：回调、Future、Reactive，用少量线程和事件循环换吞吐。' },
      { p: '异步的代价是编程模型变了。一段本来三行的业务代码，变成链式调用加异常包装；ThreadLocal 里的上下文在切换线程时丢失；线上出问题看堆栈，只能看到事件循环的一帧，业务调用链要靠 trace 拼回来。十几年下来，团队普遍接受了“用可读性换吞吐”这笔交易，但很少有人真的喜欢它。' },
      { p: '虚拟线程（JEP 444，21 转正）要撤销的正是这笔交易。它把线程的调度单位与操作系统线程解耦：虚拟线程由 JVM 调度到少量载体线程上，遇到阻塞时把栈卸载到堆里，等阻塞结束再挂回某个载体线程继续跑。对代码来说它仍然是一个 Thread，仍然可以 sleep、可以阻塞读、可以 try-catch；对运行时来说，它只是一个几百字节起步的堆对象。' },
      { p: '为什么到 2026 年才流行？因为 21 是第一个包含虚拟线程的 LTS，而 25 才让它进入“框架默认可用”的阶段。Spring Boot 3.2 起就有一行开关，但大量项目的数据库驱动、连接池、链路追踪库要到 24 之后才把 synchronized 与 ThreadLocal 的老问题处理干净。技术上早就能用，工程上要等整条依赖链都稳。' },
      { p: '还有一个现实因素：24 的 JEP 491 让 synchronized 不再钉住载体线程。在 21 到 23 之间，只要代码里有一层同步块包着 IO，虚拟线程的吞吐就会被载体线程数锁死，而这个现象极难从监控上看出来。很多团队在 21 上试过一次、发现“没什么提升”就放弃了，原因往往就在这里。' },

      { h: '2.2 成本结构：栈、调度与内存' },
      { p: '理解虚拟线程，关键是把栈这件事想清楚。平台线程的栈是操作系统分配的连续内存，大小在启动时定好（常见 512KB 到 1MB 预留），所以线程数一多，光是栈就把内存吃光。虚拟线程的栈是堆上的若干块（stack chunk），按需增长、可收缩，初始只有几百字节到几 KB。一个 JVM 里放几十万个虚拟线程，在内存上是可行的。' },
      { table: { head: ['维度', '平台线程', '虚拟线程'], rows: [
        ['栈存储', '操作系统分配，MB 级预留', '堆上分块，KB 级起步、按需增长'],
        ['创建成本', '微秒到毫秒级', '接近普通对象分配'],
        ['调度者', '操作系统内核', 'JVM，由 ForkJoinPool 调度到载体线程'],
        ['阻塞行为', '占用内核线程', '卸载栈，让出载体线程'],
        ['适用任务', 'CPU 密集、数量可控', 'IO 密集、数量巨大'],
        ['上限参考', '数千', '数十万到百万级']
      ] } },
      { p: '调度侧的关键概念是载体线程（carrier）。默认情况下，载体线程来自一个 ForkJoinPool，并行度等于 CPU 核数，可以用 -Djdk.virtualThreadScheduler.parallelism 调整。虚拟线程只在真正执行指令时占用载体线程，一旦阻塞就把位置让出去。所以一台 8 核机器上跑几十万虚拟线程是正常的，但同时只有 8 个在跑。' },
      { code: '// 每个任务一个虚拟线程：不要池化\ntry (var pool = Executors.newVirtualThreadPerTaskExecutor()) {\n    long start = System.currentTimeMillis();\n    for (int i = 0; i < 10_000; i++) {\n        pool.submit(() -> {\n            Thread.sleep(1_000);              // 阻塞时自动卸载\n            return null;\n        });\n    }\n}   // close 会等待所有任务结束\nSystem.out.println(\"elapsed ms = \" + (System.currentTimeMillis() - start));' },
      { out: 'elapsed ms = 1043\n// 10000 个任务各睡 1 秒，总耗时约 1 秒：它们是并发的，不是排队' },
      { p: '这段代码最容易被误读成“并发无限”。它证明的只是阻塞不再消耗线程，并不证明下游能承受一万并发。如果这 10_000 个任务各自去查一次数据库，而连接池只有 20 个连接，那么绝大多数时间会花在等连接上，总耗时变成排队时间。虚拟线程放大的是等待能力，不是处理能力。' },
      { note: '<b>提示：</b>不要给虚拟线程套固定大小的池。newFixedThreadPool 配虚拟线程工厂等于把并发度重新锁死，白白丢掉虚拟线程唯一的优势。' },
      { p: '内存上还有一个隐藏成本：ThreadLocal。每个虚拟线程都持有一份自己的 ThreadLocal 副本，十万个虚拟线程就是十万份。如果某个 ThreadLocal 里放的是请求上下文对象，内存会迅速膨胀，而这个现象在平台线程池（几百个线程）下根本不会出现。这一点直接引出了后面的 ScopedValue。' },

      { p: '把这三个成本放在一起看，就能理解 Loom 的设计取舍：它没有改变 Java 的线程语义，而是把线程的实现从内核搬到用户态。这也意味着虚拟线程不享受操作系统的调度公平性，长时间不让出（例如死循环）的虚拟线程会占住载体线程，拖慢同一载体上的其他虚拟线程。所以纯计算任务不要放进虚拟线程，这条限制来自实现本身，而不是配置问题。' },
      { h: '2.3 pinning：什么时候虚拟线程会被钉住' },
      { p: 'pinning（钉住）指的是虚拟线程在阻塞时无法卸载栈，只能连着载体线程一起等。它不会报错，也不会抛异常，只会让吞吐悄悄退化到你以为是“虚拟线程没用”的程度。21 到 23 之间，最常见的两个钉住来源是同步块里的阻塞，以及本地方法调用。' },
      { p: '为什么同步块会钉住？因为监视器的所有权记录在载体线程上。虚拟线程如果带着锁卸载，锁的归属就会指向一个已经去跑别的任务的线程，JVM 无法保证互斥。早期的解决方案很粗暴：只要你在同步块里阻塞，就别卸载。代价是载体线程被占住，池子里少一个可用名额。' },
      { code: '// 21–23：这里会钉住载体线程\npublic synchronized String load(String id) {\n    return client.get(\"/items/\" + id);     // 同步块内阻塞 -> pinning\n}\n\n// 24+：synchronized 不再钉住，同一段代码可以直接用\n// 若仍要规避，可显式改用 ReentrantLock\nprivate final ReentrantLock lock = new ReentrantLock();\npublic String load2(String id) {\n    lock.lock();\n    try { return client.get(\"/items/\" + id); }\n    finally { lock.unlock(); }\n}' },
      { out: '// 21–23：JFR 事件 jdk.VirtualThreadPinned 持续出现，载体线程数成为吞吐上限\n// 24+：同一段同步代码不再产生 pinning 事件' },
      { p: 'JEP 491 在 24 转正，做法是让监视器的所有权跟随虚拟线程而不是载体线程：卸载时把锁的持有者记在虚拟线程对象上，重新挂载时再校验。这样同步块里的阻塞也能正常卸载，synchronized 与 ReentrantLock 在虚拟线程下的行为差异基本消失。对业务代码的直接好处是：不必为了虚拟线程把全项目的同步块重写成锁对象。' },
      { p: '24 之后仍然会钉住的场景少了很多，但不是零：调用本地方法（JNI 或 FFM 的 downcall）时栈上有本地帧，JVM 无法安全卸载；类初始化过程中的阻塞也可能钉住；某些 JVM 内部结构在特定操作下仍会短暂占用载体线程。所以诊断手段仍然要会：用 JFR 的 jdk.VirtualThreadPinned 事件统计，或者直接看载体线程池的饱和度。' },
      { p: '判断线上是否被 pinning 拖住，有个简单的间接指标：观察载体线程池的活跃线程数是否长期贴近并行度，同时应用整体 QPS 上不去、CPU 却没跑满。这种情况下先怀疑 pinning，再怀疑锁竞争。21 到 23 上还可以用 -Djdk.tracePinnedThreads=full 打印钉住时的堆栈，24 之后这个开关的价值大幅下降。' },

      { p: '诊断之前先要有一个基线：在完全相同的压测条件下，分别记录平台线程与虚拟线程的 QPS、P99 和载体线程活跃数。没有基线就无从判断 pinning 是主因还是噪声，也很容易把“下游变慢”误判成“虚拟线程没用”。这条基线建议写进容量评审文档，而不是留在某个人的笔记本里。' },
      { h: '2.4 ThreadLocal 到 ScopedValue' },
      { p: 'ThreadLocal 在平台线程池里工作得很好：线程被复用，上下文随线程走，用完 remove 掉即可。到了虚拟线程，这个模型有两处崩坏。第一处是数量：每个虚拟线程一份副本，十万并发就是十万份上下文。第二处是生命周期：线程不再复用，但开发者沿用了“用完 remove”的习惯，一旦某条路径漏了 remove，上下文就会随着线程对象一直活到被回收，而虚拟线程的创建频率是平台线程的成千上万倍。' },
      { p: '更根本的问题是语义。ThreadLocal 表达的是“这个值属于这个线程”，可业务真正想表达的是“这个值属于这次调用”。两者在线程被复用时恰好重合，一旦线程与调用不再一一对应，语义就错位了。ScopedValue（JEP 506，25 转正）把语义摆正：值绑定在一个代码块的作用域上，块结束即失效，且不可变。' },
      { code: 'static final ScopedValue<User> CURRENT = ScopedValue.newInstance();\n\nvoid handle(Request req) {\n    ScopedValue.where(CURRENT, req.user()).run(() -> {\n        service.process();                 // 作用域内可读\n    });\n    // 出了 run，CURRENT.get() 抛 NoSuchElementException\n}\n\nvoid process() {\n    System.out.println(\"当前用户: \" + CURRENT.get().name());\n}' },
      { out: '当前用户: alice\n// 作用域外读取：java.util.NoSuchElementException' },
      { p: 'ScopedValue 的三个特性值得记住。不可变：绑定之后不能在作用域内改值，想改只能再嵌一层 where，这让“谁改了我的上下文”这类问题消失。自动释放：块结束即失效，不存在忘记 remove 的泄漏。可继承：在结构化并发的子任务里能读到父作用域的值，不需要像 InheritableThreadLocal 那样在每个新线程上复制快照。' },
      { p: '迁移策略要现实一点。ScopedValue 在 25 转正，但很多三方库（尤其是老的日志 MDC 实现与部分框架）仍依赖 ThreadLocal。可行的路径是：新代码用 ScopedValue；老代码保持 ThreadLocal，但确保在 finally 里 remove；跨边界时（例如线程池提交任务）显式把上下文传过去，而不是依赖隐式继承。' },
      { note: '<b>提示：</b>ScopedValue 在 25 之前的版本里需要 --enable-preview，25 已转正可直接使用；如果你的项目还在 21 或 23，先把 ThreadLocal 的 remove 补全，比引入预览 API 更划算。' },

      { p: '迁移时最常见的坑是 thread local 上下文在越过边界后消失。把任务提交给线程池，本质上是把执行交给了另一个线程，无论是平台线程还是虚拟线程，上下文都不会自动带过去。解决办法只有两种：显式把上下文作为参数传进任务，或者使用支持上下文传播的执行器包装。前者更啰嗦但更可控，后者依赖库实现，升级时要重新验证。' },
      { h: '2.5 结构化并发：把一组相关任务写成一个块' },
      { p: '虚拟线程解决了线程便宜，但没解决任务之间怎么管。用 ExecutorService 提交三个任务再 join，代码里会散落 Future、超时、取消、异常聚合四件事，而且任何一个分支出错时，其他分支还在后台跑，泄漏就这么产生了。结构化并发（StructuredTaskScope，25 上仍是预览，JEP 505 第五次预览）把这组任务收进一个 try-with-resources 块：要么全部成功，要么一起取消。' },
      { code: '// 25 预览 API，需 --enable-preview\ntry (var scope = StructuredTaskScope.open(\n        Joiner.<String>allSuccessfulOrThrow())) {\n    Subtask<String> user = scope.fork(() -> userClient.name(id));\n    Subtask<Integer> orders = scope.fork(() -> orderClient.count(id));\n    scope.join();                       // 任一失败即取消其余\n    return new Profile(user.get(), orders.get());\n}   // 出块时所有子任务已结束' },
      { out: 'Profile[name=alice, orders=17]\n// 若 orderClient 抛异常：join 抛出，user 子任务被取消，不会泄漏' },
      { p: '它和虚拟线程的关系是互补的：虚拟线程让一任务一线程可行，结构化并发让一组任务有明确的边界。名称里的“结构化”来自结构化编程的类比——就像 if 和 for 有明确的进入与退出，任务也应该有。好处很实际：堆栈里能看到父子关系，超时统一在 scope 上设，取消不会被忘记。' },
      { p: '要提醒的是 API 变化。21 到 24 的预览写法是 new StructuredTaskScope.ShutdownOnFailure()，25 的预览改成了 open 加 Joiner 的组合。这意味着照抄两年前的博客会编译失败。看到 StructuredTaskScope 的示例时，先确认它对应哪个 JDK 版本，是这几年的一个必备习惯。' },
      { p: '落地建议：结构化并发目前在预览阶段，适合在内部工具、批处理、聚合接口这类边界清晰的场景先试；核心交易链路先用虚拟线程加明确的超时与取消，等 API 定稿再迁移。判断标准是这段代码能不能容忍一次签名变更，能容忍就先上。' },

      { p: '另一个经常被问到的问题是：结构化并发和虚拟线程要不要一起上。答案是顺序很重要。先用虚拟线程把线程成本降下来，观察吞吐与延迟的实际变化；确认瓶颈已经转移到下游之后，再引入结构化并发去治理任务的生命周期。如果两件事一起改，出问题时无法判断收益来自哪一边。' },
      { h: '2.6 Spring Boot 里怎么开' },
      { p: 'Spring Boot 3.2 起提供了一行开关：spring.threads.virtual.enabled=true。打开之后，Tomcat 的请求处理会用虚拟线程，异步任务执行器也会切到虚拟线程。这个开关很省事，但它只改了容器层，不改你代码里的线程池与连接池，所以开完之后必须自己检查三件事。' },
      { flow: ['请求进入 Tomcat', '分配一个虚拟线程', '调用下游时挂起', '栈卸载，载体线程去跑别的', '响应返回后恢复', '线程对象回收'] },
      { code: '# application.properties\nspring.threads.virtual.enabled=true\n\n# 需要自定义执行器时显式声明\n# @Bean(destroyMethod = \"close\")\n# ExecutorService taskExecutor() {\n#     return Executors.newVirtualThreadPerTaskExecutor();\n# }' },
      { out: 'Tomcat started on port 8080 (http) with virtual threads\n// 日志里的 http-nio-8080-exec-* 会被虚拟线程替代' },
      { p: '第一件要检查的是连接池。HikariCP 默认 10 个连接，这个数字在虚拟线程下不需要放大，反而要确认它没被顺手放大到几百——连接数是数据库的硬上限，放大只会把数据库打死。第二件是限流：入口并发从几百涨到几万之后，任何没有配额保护的下游都会被瞬间打穿。第三件是 ThreadLocal：日志 MDC、安全上下文、租户标识，逐个确认在虚拟线程下还被正确设置与清理。' },
      { p: '还有一个容易忽略的地方：异步与虚拟线程不要混着用。有人一边开虚拟线程，一边保留 @Async 返回 CompletableFuture 的写法，结果线程切换了两层，上下文与异常传递都变复杂了。虚拟线程的初衷就是让同步写法够快，如果已经开了它，就优先把代码写回同步直白的样子。' },
      { p: '验证方式也要跟着改。过去看线程池的活跃数与队列长度就能判断压力，现在要看的是：入口并发数、每个下游的等待时间分布、载体线程池饱和度、以及 GC 与堆内存（因为栈搬到堆里了）。少看一项，虚拟线程的收益与风险就都是盲的。' },

      { p: '这一行开关听起来太便宜，容易让人误以为性能会立刻翻倍。实际上多数应用开完之后吞吐只提升一到两成，因为瓶颈早就不在线程上，而在数据库与下游接口。虚拟线程真正带来的是可预测性：并发从几百涨到几千时，延迟曲线不再突然从平缓变成垂直，容量规划因此变得可算。' },
      { h: '2.7 连接池、限流与还要不要线程池' },
      { p: '这一节回答一个被问得最多的问题：有了虚拟线程，还要不要线程池？答案不是简单的不要，而要按任务性质分。虚拟线程优化的是阻塞等待，对 CPU 密集任务没有任何帮助——把 8 核的机器塞进一万个计算任务，只会多出一万次上下文切换和一堆 GC 压力。' },
      { table: { head: ['场景', '推荐方案', '理由'], rows: [
        ['HTTP 与 RPC 等待下游', '虚拟线程 + 入口限流', '阻塞可卸载，并发上限由下游配额决定'],
        ['数据库访问', '虚拟线程 + 小连接池 + 信号量', '连接数是硬上限，池大小不应随并发放大'],
        ['CPU 密集计算', '固定大小平台线程池（约等于核数）', '没有阻塞可卸载，虚拟线程只增加调度开销'],
        ['批处理大文件', '虚拟线程 + 有界队列', 'IO 为主，但要防止一次读入过多导致内存峰值'],
        ['依赖 ThreadLocal 的老库', '先保守，必要时保留平台线程', '上下文语义未适配，贸然切换会丢数据'],
        ['消息消费', '虚拟线程 + 按分区或队列限并发', '顺序与背压仍需显式设计']
      ] } },
      { p: '给下游算配额有两条经验公式。第一条是利特尔法则：并发数约等于吞吐乘以平均延迟，例如目标 500 QPS、平均延迟 200ms，需要约 100 个并发在途，再乘一个安全系数就是信号量的许可数。第二条是连接池大小：不要超过数据库连接上限除以实例数，通常在 10 到 30 之间，剩下的并发必须在应用层排队或快速失败。' },
      { code: '// 用信号量做舱壁：拿不到许可就快速失败，而不是无限排队\nprivate final Semaphore dbPermits = new Semaphore(20);\n\npublic Order load(long id) {\n    if (!dbPermits.tryAcquire()) {\n        throw new TooManyRequestsException(\"数据库繁忙，请稍后重试\");\n    }\n    try {\n        return repository.findById(id);\n    } finally {\n        dbPermits.release();\n    }\n}' },
      { out: '20 个许可用满后：TooManyRequestsException: 数据库繁忙，请稍后重试\n// 请求在 10ms 内失败，避免占用虚拟线程无限等待' },
      { p: '快速失败比无限排队更重要。虚拟线程让排队变得极其便宜，一万个线程安静地等一个连接，内存和 CPU 都看不出来异常，监控上只看到延迟缓慢上升，等到超时集中爆发时已经很难定位。信号量加短超时能把这种隐性堆积变成显式错误，反而更好排查。' },
      { p: '再补一条实践：连接池的获取超时要短。HikariCP 的 connectionTimeout 默认 30 秒，在虚拟线程场景下这个值太长——一条请求等 30 秒才失败，期间占着一个虚拟线程和一个入口并发名额。把它压到 1 到 2 秒，让失败尽早发生，配合重试与降级策略，整体可用性会更好。' },

      { p: '关于线程池的最后一句：如果团队里还有人写 new ThreadPoolExecutor 去跑 IO 任务，先别急着让他全改成虚拟线程，而是先问一句这个池的队列是不是无界的。有界队列加拒绝策略，比换线程模型更能提升系统在高负载下的存活率。虚拟线程只是把线程这一层的成本降了下来，队列、超时、隔离这些老问题一个都没消失。' },
      { h: '2.8 本章小结' },
      { p: '这一章的主线是分清虚拟线程解决了什么、没解决什么。把结论压缩成几句可以带走的判断。' },
      { list: [
        '虚拟线程降低的是线程成本，不是下游容量；并发上限仍由连接池与配额决定。',
        '不要池化虚拟线程，用 newVirtualThreadPerTaskExecutor 为每个任务新建。',
        '21 到 23 的 synchronized 会钉住载体线程，JEP 491（24）之后基本消失。',
        'ScopedValue 在 25 转正，语义比 ThreadLocal 更贴近一次调用，且不会泄漏。',
        '结构化并发在 25 仍是预览，API 与早期版本不同，抄示例要看版本。',
        'spring.threads.virtual.enabled=true 只改容器层，连接池、限流、ThreadLocal 要自己收尾。',
        'CPU 密集任务继续用固定大小的平台线程池。'
      ] },
      { p: '如果只记一句话：虚拟线程把等待变便宜了，所以真正该被管理的资源从线程变成了连接与配额。想清楚后者，前者才不会出事。原理层面的内存模型与锁竞争见模块 08，那里讲的是另一条线。' }
    ]
  };

  T['boot4-migration'] = {
    meta: '本章约 5200 字 · 建议 35 分钟 · 配套流程图与 3 道习题',
    blocks: [
      { h: '3.1 为什么这次升级和以往不一样' },
      { p: 'Spring Boot 4.0 于 2025 年 11 月 20 日 GA，底层是 Spring Framework 7。这个版本的定位不是加几个注解，而是把整条技术栈的基线往现代 Java 上推了一大步：Java 17 成为最低要求，Jakarta EE 基线抬到 11，模块化与空安全的处理方式都做了实质调整。对多数团队来说，这是自 2.7 到 3.0 之后最大的一次迁移。' },
      { p: '先说不升级的风险，再说升级的成本。3.x 的开源支持有明确终点，越晚开始迁移，越容易把“一次可控的版本跟进”拖成“窗口期内必须完成”的硬任务。而且从 21 到 25 的语言演进（虚拟线程、ScopedValue、record 模式）都需要框架层的配合，留在 3.2 上就等于放弃了这些能力在生产环境可用的前提。' },
      { p: '这次迁移的难点不在 API 改名，而在三个横向变化：HTTP 客户端从 RestTemplate 迁到 RestClient 与声明式接口、空安全从“建议加注解”变成“默认非空并需要 JSpecify”、以及生态里的自动配置向模块化拆分。三者都会触达大量业务代码与配置，所以升级路径必须先规划，再动手。' },
      { p: '一个常见的误判是把它当成依赖版本号的一次批量替换。实际做过的人会告诉你：改动量最大的地方往往是测试和配置，而不是业务逻辑。因为空安全会让原本能编译的代码开始报错，HTTP 客户端更换会改变异常与超时的语义，自动配置拆分则可能让应用启动时就缺少某个 Bean。' },
      { note: '<b>提示：</b>先把 3.x 升到该分支的最后一个补丁版本（3.5 系列的最新版），在 3.x 上把弃用告警清干净，再跨到 4.0。带着一堆弃用项跨大版本，等于把两类问题混在一次发布里。' },

      { p: '还有一个背景值得说明：Boot 4 与 Framework 7 的这一轮改动，很大程度上是为了配合 Java 21 到 25 的语言能力。record 模式匹配、switch 模式匹配转正之后，框架内部大量用它们来表达配置与结果类型；JSpecify 的默认非空也只有在语言与工具链都成熟后才可能推行。换言之，框架的这次大改与 JDK 的演进是同一件事的两面，只升框架而停留在旧 JDK 上，收益会打折扣。' },
      { h: '3.2 迁移清单：依赖、配置与包路径' },
      { p: '清单要按“会不会阻断启动”排序。最先处理的是依赖坐标与 JDK 版本，然后是被移除的自动配置，最后才是需要改写代码的 API 变更。这个顺序的理由很实际：前两类会让应用根本起不来，先把它们清掉，才能跑起来看后面的问题。' },
      { table: { head: ['类别', '3.x 写法', '4.0 写法', '影响面'], rows: [
        ['HTTP 客户端', 'RestTemplate + 手动配置', 'RestClient / @HttpExchange 声明式接口', '所有外部调用代码'],
        ['空安全', '可选注解，无统一默认', 'JSpecify @NullMarked 默认非空', '几乎所有公开方法签名'],
        ['EE 基线', 'Jakarta EE 10', 'Jakarta EE 11', 'Servlet、Validation、Persistence 相关'],
        ['JDK 基线', 'Java 17（3.x 也支持）', 'Java 17 起，推荐 21 或 25', '构建与运行环境'],
        ['自动配置', '单体 spring-boot-autoconfigure', '按技术模块拆分', '自定义 starter 与条件注解'],
        ['可观测性', 'Micrometer + 手动埋点', 'Observation API 统一入口', '指标与追踪代码']
      ] } },
      { p: '依赖层面最省事的做法是用 Boot 的依赖管理，而不是自己钉版本。迁移期间先把 spring-boot-starter-parent 或 BOM 升到 4.0，让传递依赖跟着走，再逐条处理编译失败。这样做的代价是可能一次暴露很多错误，好处是不会留下“某个库还停在 3.x 时代版本”的隐性债务。' },
      { p: '配置层面要注意属性改名与移除。Boot 4 清理了一批长期标记为弃用的属性，有的直接删除，有的换了前缀。稳妥的做法是把 application.properties 里的自定义属性集中登记一遍，启动时观察是否有 unknown property 告警，再逐个确认。别指望 IDE 的自动补全告诉你哪个属性已经不存在了。' },
      { p: '包路径方面，最容易被忽略的是测试相关。测试切片注解、MockMvc 的自动配置、以及一些断言工具的位置在 4.0 有调整。如果项目里有大量 @WebMvcTest、@DataJpaTest，改完之后务必单独跑一遍测试，确认切片仍能装配起来，而不是只跑主应用。' },

      { p: '清单之外还有一类隐性成本：构建时间与镜像体积。Boot 4 拆分了自动配置模块，依赖树变得更深，如果构建脚本里用的是 fat jar 加全部可选依赖，产物体积可能明显上涨。升级前后各测一次构建耗时与镜像大小，把变化记下来，避免上线后才发现镜像拉取变慢、节点扩容时间变长。' },
      { p: '团队沟通也是迁移的一部分。升级期间要提前和生产、测试对齐三件事：有没有不能动的发布窗口、数据库迁移由谁批准、以及出问题时谁有权决定回滚。这些看起来与代码无关，但真正卡住迁移进度的往往不是技术难题，而是某次发布窗口被业务活动占满，导致升级被迫推迟一个季度。' },
      { h: '3.3 RestClient 与声明式接口取代 RestTemplate' },
      { p: 'RestTemplate 在 3.x 就进入维护状态，4.0 的推荐路径很清楚：需要同步调用就用 RestClient，需要声明式就写 @HttpExchange 接口并注册成 Bean。RestClient 保留了 RestTemplate 的流式风格，但换成了不可变构建、默认更合理的错误处理与更好的可观测性集成。' },
      { code: '// 1. 构建一个 RestClient（线程安全，可复用）\nRestClient client = RestClient.builder()\n        .baseUrl(\"https://api.example.com\")\n        .defaultHeader(\"Accept\", \"application/json\")\n        .build();\n\n// 2. 调用：默认对 4xx/5xx 抛异常\nOrder order = client.get()\n        .uri(\"/orders/{id}\", 42)\n        .retrieve()\n        .body(Order.class);' },
      { out: 'Order[id=42, amount=199.00, status=PAID]\n// 若服务端返回 404：抛出 HttpClientErrorException.NotFound' },
      { p: '声明式接口更进一步：把 HTTP 调用写成 Java 接口，用注解描述路径与方法，运行时由框架生成实现。这种方式把协议细节从业务代码里挪走，测试时可以替换成假的实现，也不必在每个调用点重复拼 URL 与处理错误。' },
      { code: '// 声明式客户端：接口 + 注解，无需实现类\n@HttpExchange(url = \"https://api.example.com\", accept = \"application/json\")\npublic interface OrderApi {\n\n    @GetExchange(\"/orders/{id}\")\n    Order findById(@PathVariable long id);\n\n    @PostExchange(\"/orders\")\n    Order create(@RequestBody OrderRequest request);\n}\n\n// 注册：Boot 4 用 @ImportHttpServices 批量导入\n@Configuration\n@ImportHttpServices(group = \"order\", types = OrderApi.class)\nclass ClientConfig { }' },
      { out: '// 注入 OrderApi 后直接调用，等价于手写 RestClient\nOrder o = orderApi.findById(42);\n// 返回：Order[id=42, amount=199.00, status=PAID]' },
      { p: '迁移时要注意异常语义的变化。RestTemplate 的默认错误处理器与 RestClient 的默认行为不完全一致，有的项目在 3.x 里靠自定义 ResponseErrorHandler 吞掉了 4xx，迁移后这些调用会开始抛异常。全局搜一遍 setErrorHandler 和 ResponseErrorHandler 的实现，逐个确认是否还需要保留。' },
      { p: '超时与重试也要重新设一遍。RestClient 依赖底层请求工厂，默认超时常常是“没有超时”或很长，在生产上等同于无限等待。建议在构建 client 时显式设置连接超时与读超时，重试则交给上层的重试库或网关，不要在客户端里静默重试非幂等请求。' },
      { p: '如果团队里还有大量 RestTemplate 代码，不必一次全改。可行的节奏是：新增代码一律用 RestClient 或声明式接口，存量按调用点分批替换，每批替换后跑该模块的集成测试。RestTemplate 在 4.0 里仍然存在，只是不再是推荐方式，这给了迁移一个缓冲期。' },

      { p: '选型上还有一个现实问题：团队已有的 HTTP 封装层要不要保留。如果封装层很薄，直接换成 RestClient 的流式调用即可；如果封装层里塞了鉴权、签名、统一日志、重试策略，建议把它改造成“构建 RestClient 的工厂”，让业务层直接用 RestClient 或声明式接口，而不是继续在旧封装上叠补丁。这样迁移一次，后续维护成本才真的下降。' },
      { p: '如果服务数量多，还有一个降低总成本的办法：先在最小的边缘服务上完整走一遍，把清单、脚本、踩坑记录固化下来，再向核心服务推进。核心服务留到最后，此时团队已经踩过一遍坑，回滚预案也验证过，风险会小得多。反过来，拿核心交易系统当第一个试验田，是这类迁移最常见的失败原因。' },
      { h: '3.4 JSpecify 与默认非空' },
      { p: '空安全是这次升级中改动面最广、也最容易被低估的一项。Spring Framework 7 采用 JSpecify 注解来表达可空性，并在包级别声明默认非空：也就是说，没有标注的参数与返回值被视为“不应为 null”，只有显式标注 @Nullable 的地方才允许 null。' },
      { p: '这个转变把过去“注解只是文档”的状态改成了“注解参与静态分析”。用 IDE 或构建期的空检查工具扫描时，原本能编译的代码会开始报“可能为 null 的返回值被解引用”。这些告警不是框架的 bug，而是过去被忽略的契约不一致被暴露出来了。' },
      { code: 'import org.jspecify.annotations.NullMarked;\nimport org.jspecify.annotations.Nullable;\n\n@NullMarked                      // 包或类级：默认所有引用类型非空\npublic class UserService {\n\n    public User find(long id) { ... }              // 永不返回 null，找不到就抛异常\n\n    @Nullable\n    public User findOrNull(long id) { ... }        // 显式声明可能为空\n}' },
      { out: '// 调用方静态分析结果：\n// find(1).name()        -> 无告警\n// findOrNull(1).name()  -> 告警：可能为 null 的返回值被解引用' },
      { p: '迁移策略要分两步。第一步是把依赖与自身代码的注解体系统一到 JSpecify，删掉混用的旧注解（例如来自其他规范的 Nullable），否则分析工具会在同一签名上看到互相矛盾的声明。第二步才是逐个处理告警，优先处理公共 API 的边界。' },
      { p: '对业务代码最实用的改法是“把可空变成不可空”：用 Optional 或抛异常替代返回 null，让签名说真话。这比在每个调用点加判空更能降低维护成本，也让 record 与模式匹配这些新语法用起来更顺——模式匹配的 deconstruction 在值为 null 时会直接失败，签名里的可空性必须提前说清楚。' },
      { note: '<b>提示：</b>不要在迁移期给整个项目一次性打开最严格的空检查。先在公共模块与新增代码上启用，等告警清零再扩大到全仓，否则一次几千条告警会让人直接关掉检查。' },

      { p: '空安全的收益要过一段时间才显现，前几天通常只有成本。但从长期看，它把一类线上问题从“偶发空指针”变成“编译期或静态分析期的告警”，性价比非常高。建议在升级时顺手给公共工具类补上注解与测试，把它们当成团队内部的第一批示范，比写一份规范文档更能推动落地。' },
      { h: '3.5 模块化拆分与被移除的配置' },
      { p: 'Boot 4 把过去集中在 spring-boot-autoconfigure 里的自动配置按技术领域拆成了多个模块。对使用者来说通常无感，因为 starter 已经把这些模块带进来；但对写过自定义 starter 的团队来说，这会直接导致编译失败：条件注解、配置属性的位置、以及某些内部工具类都换了包。' },
      { table: { head: ['变化', '迁移动作', '风险'], rows: [
        ['自动配置按模块拆分', '改 imports 与依赖坐标，检查 @ConditionalOn* 的包路径', '自定义 starter 起不来'],
        ['属性名批量调整', '对照迁移指南逐项改名，删除已移除属性', '启动时配置静默失效'],
        ['部分 API 移除', '用替代类重写，例如旧的 HTTP 与可观测性工具', '编译期暴露，较安全'],
        ['测试切片调整', '重跑 @WebMvcTest / @DataJpaTest，修正自动配置导入', '测试静默跳过或装配失败'],
        ['默认日志与追踪', 'Observation API 接管，去掉自写埋点', '指标名变化导致看板断链']
      ] } },
      { p: '自定义 starter 的排查顺序建议是这样：先确认 spring.factories 是否还生效（Boot 4 仍支持，但更推荐新的注册方式），再确认条件注解的类是否还在原来的包下，最后确认自动配置类有没有被模块拆分后的依赖顺序影响。三步走完，多数起不来的问题都能定位。' },
      { p: '属性改名这一项要特别注意灰度期。把旧属性名写成兼容代码看着省事，但会让“配置到底生效了没有”变得不可判断。更稳的做法是：升级后立刻在启动日志里核对关键配置的实际生效值（例如连接池大小、超时、序列化选项），而不是相信配置文件里写了就等于生效了。' },
      { p: '可观测性方面，Boot 4 进一步统一到 Observation API。旧的 Micrometer 直接埋点仍然可用，但推荐路径是让框架自动为你生成指标与追踪。迁移时最容易出问题的是指标名与标签变了，导致既有看板断链，所以升级后要拿一份关键指标清单对一遍，确认名字与维度没有意外变化。' },

      { p: '另一个高频故障点是序列化。Boot 4 调整了部分默认的 JSON 处理选项与消息转换器的注册顺序，表现为某些字段突然不输出了、或者日期格式从时间戳变成了字符串。这类问题在单测里往往看不到，需要在集成测试里断言完整的响应体，而不是只断言状态码。' },
      { p: '数据库相关也要单独确认。连接池的默认参数、SQL 初始化脚本的执行时机、以及事务管理器的注册方式在 4.0 都有细微调整。最省事的验证方式是启动后打一份关键参数的实际值，与 3.x 的老日志逐项对比，不同之处逐个确认是否有意为之。' },
      { h: '3.6 从 3.x 到 4.0 的升级顺序' },
      { p: '升级顺序决定了这次迁移是一条可控的路还是一次发布事故。下面这个顺序在多个项目上验证过：每一步都可独立回滚，每一步都能跑出可比较的结果，出问题时能定位到具体哪一步。' },
      { flow: ['升到 3.x 最新补丁', '清空弃用告警', '切 JDK 21 或 25', '升 BOM 到 4.0', '修编译与启动错误', '替换 HTTP 客户端', '开启空检查并修告警', '全量回归与灰度'] },
      { ol: [
        '把 3.x 升到该分支最新补丁版本，确保没有已知缺陷干扰判断。',
        '打开编译期弃用告警，把项目内的弃用调用清零，减少跨版本时的混合问题。',
        '把运行时切到 JDK 21 或 25，先在 3.x 上跑通，确认与框架无关的兼容性。',
        '升级 Boot BOM 到 4.0，只修编译错误与启动失败，不改业务逻辑。',
        '分批把 RestTemplate 换成 RestClient 或声明式接口，一批一验证。',
        '在公共模块启用 JSpecify 空检查，逐步扩大范围，处理告警。',
        '跑全量回归：接口契约、数据库迁移、消息消费、定时任务各验一遍。',
        '灰度发布，对比关键指标与错误率，稳定后再全量。'
      ] },
      { code: '// 升级第一步：先确认基线在 3.x 上是干净的\n// build.gradle 片段（4.0 目标）\nplugins {\n    id \"org.springframework.boot\" version \"4.0.0\"\n    id \"io.spring.dependency-management\" version \"1.1.7\"\n}\n\njava {\n    toolchain { languageVersion = JavaLanguageVersion.of(25) }\n}' },
      { out: '> Task :compileJava\n> Task :bootJar\nBUILD SUCCESSFUL in 12s\n// 若 JDK 低于 17：Unsupported class file major version' },
      { p: '关于 JDK 目标版本有个实践建议：如果团队还没有虚拟线程与 ScopedValue 的落地计划，先用 21 作为升级目标，把 25 留到下一轮。理由是 21 同样是 LTS，生态验证更充分，而 25 上的性能特性（紧凑对象头等）需要额外验证。反过来，如果已经准备上虚拟线程，直接到 25 更省一次折腾。' },
      { p: '每一步之后都要有可比较的证据，否则“升上去了但更慢了”这类问题会一直悬着。最简单的做法是固定一套压测脚本与关键接口清单，每次升级后跑一遍，把 QPS、P99、错误率、启动时间记在同一张表里。数据比记忆可靠。' },

      { p: '这套顺序的关键在于“只做一件事”。很多团队图省事，把升 BOM、换客户端、开空检查三件事并进一次提交，结果编译期几百个错误混在一起，既分不清哪些是签名不兼容、哪些是空检查告警，也无法判断回归失败该由哪一项负责。分步做的成本是几次流水线，收益是每一次失败都能被快速归因。' },
      { code: '// 4.0 推荐用 Observation API 统一埋点，替代分别写 metrics 与 trace\nprivate final ObservationRegistry registry;\n\npublic Order find(long id) {\n    return Observation.createNotStarted("order.find", registry)\n            .lowCardinalityKeyValue("layer", "repository")\n            .observe(() -> repository.findById(id).orElseThrow());\n}' },
      { out: '// 迁移后指标名：order.find (timer)、order.find.active (gauge)\n// 旧看板若依赖 http.client.requests 等名称，需要同步更新查询' },
      { h: '3.7 回归验证与灰度' },
      { p: '大版本升级之后，回归的重点不是“功能是否还在”，而是“行为是否变了”。编译通过只说明签名兼容，很多语义变化会安静地留在运行时：异常类型换了、默认超时变了、序列化字段顺序变了、指标名变了。这些都需要针对性验证。' },
      { code: '@SpringBootTest(webEnvironment = RANDOM_PORT)\nclass UpgradeSmokeTest {\n\n    @Autowired TestRestTemplate http;   // 4.0 仍可用，也可换 RestTestClient\n\n    @Test\n    void orderEndpointStillWorks() {\n        var res = http.getForEntity(\"/api/orders/42\", Order.class);\n        assertThat(res.getStatusCode().is2xxSuccessful()).isTrue();\n        assertThat(res.getBody().amount()).isEqualByComparingTo(\"199.00\");\n    }\n}' },
      { out: 'UpgradeSmokeTest > orderEndpointStillWorks() PASSED\n// 若 JSON 反序列化失败：HttpMessageNotReadableException' },
      { p: '灰度阶段要盯四类信号：错误率是否出现新的异常类型、P99 是否整体上移、启动时间是否显著变长、以及日志里是否出现大量配置相关告警。其中最后一项最容易被忽略，但往往最先暴露属性改名没配对的问题。' },
      { p: '还有一个常被跳过的地方：把升级后的镜像在预发环境跑满一个业务周期。很多问题只在特定时间点出现，比如定时任务的重叠执行、缓存预热、以及月底批量对账。短时间的冒烟测试看不到这些，只有跑够时间才会浮现。' },
      { p: '回滚预案要提前写好。至少确认三件事：镜像能回到旧版本、数据库迁移脚本可逆或有备份、以及新旧版本的配置能共存。第三点经常被忘记——如果新版本改了属性名，回滚时旧版本读不到新配置，服务会因为缺配置而启动失败。' },

      { p: '值得单独强调的是测试基础设施。Boot 4 对测试切片的自动配置做了调整，同时 Testcontainers 的集成方式也更顺（第 4 章会展开）。升级时如果测试仍然依赖内存数据库与静态数据，很多运行时差异会被掩盖，升级看起来“很顺”，上线后才集中爆发。把集成测试换成真库，是这次升级顺手做完的最有价值的一件事。' },
      { p: '另一个建议是把迁移过程本身沉淀成可复用的清单与脚本。同一个组织里往往有十几个 Spring 服务，第一个服务的迁移会暴露绝大多数坑，把这些坑写成检查项与自动化脚本，后面几个服务的成本会降到几分之一。这件事的价值远大于单次升级本身。' },
      { h: '3.8 本章小结' },
      { p: '把这一章压缩成几条可以带走的判断，迁移时按顺序对照。' },
      { list: [
        'Boot 4.0 于 2025-11-20 GA，基线 Framework 7，最低 JDK 17，建议直接定 21 或 25。',
        '迁移顺序：补丁版本 → 清弃用 → 切 JDK → 升 BOM → 修编译 → 换 HTTP 客户端 → 开空检查 → 回归灰度。',
        'RestTemplate 换成 RestClient 或 @HttpExchange 声明式接口，注意异常与超时语义已变。',
        'JSpecify 默认非空，告警是在暴露过去被忽略的契约问题，不是框架的 bug。',
        '自动配置按模块拆分，自定义 starter 与测试切片是风险高发区。',
        '指标名与配置属性都要在升级后核对实际生效值。'
      ] },
      { p: '最后一句话：这次升级真正的收益不在版本号，而在于它把项目推到了一条能与 21/25 语言特性配合的轨道上。虚拟线程、结构化并发、空安全这些能力，只有在框架层配合到位时才算真正可用。框架原理层面的 IoC 与 MVC 细节见模块 12，本章只讲迁移与工具链。' }
    ]
  };

  T['testcontainers'] = {
    meta: '本章约 5200 字 · 建议 35 分钟 · 配套流程图与 3 道习题',
    blocks: [
      { h: '4.1 为什么数据库测试要用真库' },
      { p: '用 H2 跑数据库测试是过去十年最普遍的省事做法：不用装数据库，测试几秒跑完，CI 上不需要额外服务。它的问题也很明确——你测的不是生产用的那个数据库。SQL 方言、锁行为、隔离级别、JSON 与数组类型、以及事务与约束的具体报错，几乎所有关键细节都可能不一样。' },
      { p: '这种差异造成的后果不是“测试偶尔失败”，而是“测试通过但线上出错”。典型例子：某个查询在 H2 上走的是内存索引，在 PostgreSQL 上是顺序扫描，于是性能问题在测试里完全看不到；某个唯一约束在 H2 上大小写敏感、在 PostgreSQL 上不敏感，于是并发插入的冲突只在线上出现。' },
      { p: '迁移脚本的问题更严重。Flyway 或 Liquibase 的脚本里会有数据库特有的语法——PostgreSQL 的 jsonb、部分索引、生成列、以及特定的 ALTER 写法。在 H2 上跑这些脚本，要么报错，要么被 H2 的兼容模式悄悄接受，等真正在 PostgreSQL 上执行时才发现不兼容，而此时脚本已经进了主干。' },
      { p: 'Testcontainers 解决的正是这件事：测试启动时用 Docker 拉一个真实的 PostgreSQL（或 MySQL、Kafka、Redis）容器，让测试连上去。它的成本是 Docker 与几十秒启动时间，收益是测试的可信度。这个交换在今天的机器上已经很划算——一次线上事故的排查成本远高于每天多跑几十秒的 CI。' },
      { p: '一个常见顾虑是“太慢”。实际上启动一个 PostgreSQL 容器在本地通常是 3 到 8 秒，配合容器复用与按类共享，一个上百条测试的模块整体增加的时间可能只有十几秒。相比因为环境不一致导致的排查与返工，这个开销完全可以接受。' },
      { note: '<b>提示：</b>H2 并不是完全没用。它适合做“启动冒烟”、纯内存逻辑、以及不涉及数据库特性的单元测试。真正涉及 SQL 语义、迁移脚本、并发事务的测试，一律用真库。' },

      { p: '还有一个值得提前说清的边界：Testcontainers 测的是“应用与真实基础设施的配合”，不是“基础设施本身是否健康”。它能验证 SQL 能否执行、迁移脚本能否通过、序列化与类型映射是否正确；它不能替代压力测试，也不能证明索引设计合理。把工具用在对的范围里，期望才不会落空。' },
      { h: '4.2 @Testcontainers 与 @ServiceConnection 起步' },
      { p: 'Boot 3.1 起提供了 @ServiceConnection，把容器与应用的连接配置自动接起来：容器启动后，框架会用它暴露的地址、端口、用户名密码替换掉数据源配置，业务代码与配置都不需要写死。这个方法在 4.0 里被保留并加强，是今天写集成测试的首选方式。' },
      { code: '@Testcontainers\n@SpringBootTest\nclass OrderRepositoryIT {\n\n    @Container\n    @ServiceConnection\n    static PostgreSQLContainer<?> pg = new PostgreSQLContainer<>(\"postgres:17-alpine\");\n\n    @Autowired OrderRepository repository;\n\n    @Test\n    void savesAndFindsOrder() {\n        repository.save(new Order(null, new BigDecimal(\"199.00\"), \"PAID\"));\n        assertThat(repository.findAll()).hasSize(1);\n    }\n}' },
      { out: 'org.testcontainers.postgresql.PostgreSQLContainer : Creating container for image: postgres:17-alpine\nHikariPool-1 - Added connection org.postgresql.jdbc.PgConnection@3f1c0d\nOrderRepositoryIT > savesAndFindsOrder() PASSED' },
      { note: '<b>版本差异：</b>上面日志里的类名取决于 Testcontainers 版本：1.x 的模块包是 <code>org.testcontainers.containers</code>，2.x 起按模块重组（PostgreSQL 落到 <code>org.testcontainers.postgresql</code>）。正文代码故意只用简单类名 <code>PostgreSQLContainer</code>，import 以你所锁定的版本为准，不要直接抄搜索结果里的旧文章。' },
      { p: '注意 static 修饰符。容器声明为静态字段时，JUnit 会在整个测试类之间共享同一个容器实例，只启动一次；去掉 static 则每个测试方法启动一次，几十个方法就是几分钟。这是最常见的性能事故来源，也是新手最容易忽略的一行。' },
      { p: '连接信息不需要手工拼。传统写法要在 @DynamicPropertySource 里把容器地址映射成 spring.datasource.url，@ServiceConnection 把这一步省掉了。它认识 JDBC、Redis、Kafka、RabbitMQ、MongoDB 等多种容器，识别不到时才需要回退到手写属性。' },
      { code: '// 需要自定义时，仍可手写映射（老项目常见写法）\n@DynamicPropertySource\nstatic void props(DynamicPropertyRegistry registry) {\n    registry.add(\"spring.datasource.url\", pg::getJdbcUrl);\n    registry.add(\"spring.datasource.username\", pg::getUsername);\n    registry.add(\"spring.datasource.password\", pg::getPassword);\n}' },
      { out: 'spring.datasource.url = jdbc:postgresql://localhost:55123/test\nspring.datasource.username = test\n// 端口由 Docker 随机分配，因此必须动态注册，不能写死在配置文件里' },
      { p: '容器镜像的版本要跟生产一致。写 postgres:17-alpine 而不是 latest，理由和依赖管理一样：latest 会在某天悄悄变成 18，然后测试开始因为语法变化而失败，而你并不知道是谁改的。把镜像版本当成代码的一部分固定在测试基类里，是最省心的做法。' },
      { flow: ['测试启动', '拉取并启动容器', '@ServiceConnection 注入连接', 'Flyway 执行迁移', '跑测试用例', '容器随 JVM 结束销毁'] },

      { p: '还有一个容易踩的细节：容器的时区与字符集。生产库通常是 UTC 加 UTF-8，而默认镜像可能带别的时区设置，于是涉及时间字段的测试在本地通过、在服务器上差八小时。稳妥的做法是在容器定义里显式设定时区与编码，让它与生产一致，而不是依赖镜像默认值。' },
      { p: 'Testcontainers 还有一个常被忽视的用途：验证“代码与数据库版本的兼容性”。把镜像版本从 16 提到 17 之前，先在容器测试里跑一遍全量用例，比上线后观察报错要安全得多。版本升级在生产上往往是不可回滚的操作，能提前验证的成本其实很低。' },
      { h: '4.3 容器生命周期与启动成本' },
      { p: '容器的生命周期决定了测试的体验。最粗糙的做法是每个测试类启一个新容器，最省事的做法是整个测试套件共享一个容器。前者隔离性好但慢，后者快但状态会互相污染。实际项目里通常按“模块或 schema”为单位共享，配合每个测试前清理数据。' },
      { table: { head: ['策略', '启动次数', '隔离性', '适用场景'], rows: [
        ['每方法一个容器', '每测试一次', '最好', '几乎不用，太慢'],
        ['每类一个容器（static 字段）', '每类一次', '好', '默认选择'],
        ['全模块共享（单例容器）', '一次', '中，需清理数据', '类多的模块，收益明显'],
        ['容器复用（reuse）', '跨 JVM 复用', '中', '本地开发提速'],
        ['本地常驻实例', '零', '差', '不适合进 CI']
      ] } },
      { p: '容器复用（.withReuse(true)）能显著加快本地反复跑测试的速度，但它要求开启 testcontainers.reuse.enable=true，并且复用期间容器状态会保留——上一个测试留下的数据可能影响下一个。所以复用适合本地开发，CI 上建议关掉，让每次运行都是干净环境。' },
      { p: '清理数据的策略要选对。用 @Transactional 让测试回滚是最快的，但它掩盖了“提交后才知道的问题”，比如延迟约束、触发器、提交时才校验的唯一性。更接近生产的方式是测试前执行一次 TRUNCATE 或者用 Flyway 的 clean 加 migrate 重建 schema，代价是慢一些。' },
      { code: '// 每个测试前清理：快速、可预期\n@BeforeEach\nvoid clean() {\n    jdbcTemplate.execute(\"TRUNCATE TABLE orders, order_items RESTART IDENTITY CASCADE\");\n}\n\n// 或者整库重建（更慢，但最干净）\n// flyway.clean(); flyway.migrate();' },
      { out: 'TRUNCATE TABLE orders, order_items RESTART IDENTITY CASCADE\n// 序列归零、级联清理子表，测试之间互不影响' },
      { p: '注意 TRUNCATE 与 CASCADE 的组合在某些数据库上会连带清掉被外键引用的表，如果测试里有跨模块共享的表结构，这个操作可能删掉别的测试准备的数据。建议把要清理的表显式列出来，而不是依赖通配或全库清空。' },

      { p: '共享容器的实现方式通常是写一个抽象基类，把容器声明为静态字段并加上 @Container，所有集成测试继承它。这样整个测试套件只启动一次容器，代价是类之间共享 schema，必须靠每类或每方法清理来保证隔离。基类里再放好 JdbcTemplate 与清理方法，子类只关注自己的用例，可维护性最好。' },
      { p: '如果项目里有多个数据源，容器可以只启动一次但映射成多个连接串，或者为每个数据源各起一个容器。前者快、后者清晰，取决于数据之间是否有交叉查询。无论哪种，都要在测试里显式验证两个数据源确实连到了不同的库，否则一次配置错误会让整个隔离设计失效而不报错。' },
      { p: '关于镜像的选择，还有一条经验：用官方镜像加轻量标签（例如 postgres:17-alpine），别用社区维护的“一体化镜像”。后者看起来方便，实际版本更新慢、参数不透明，出问题时很难判断是镜像的问题还是代码的问题。测试环境与生产用同一来源的镜像，结论才有意义。' },
      { h: '4.4 Flyway 与 Liquibase 的迁移脚本测试' },
      { p: '数据库迁移脚本是这类测试里价值最高的部分。它们通常在生产上只执行一次，却决定了整个 schema 的形态，一旦出错就是不可逆的事故。用真库跑一遍迁移，能在合并前发现语法错误、顺序依赖、以及回滚不可用的问题。' },
      { p: 'Flyway 的约定很简单：脚本放在 classpath:db/migration 下，文件名形如 V1__init.sql、V2__add_index.sql，版本号决定执行顺序。Boot 在数据源就绪后自动执行，容器测试里不需要额外代码，只要脚本存在就会跑。测试要断言的是执行结果——表结构、约束、索引是否存在。' },
      { code: '-- src/test/resources/db/migration/V3__add_order_status.sql\nALTER TABLE orders ADD COLUMN status VARCHAR(16) NOT NULL DEFAULT \'NEW\';\nCREATE INDEX idx_orders_status_created ON orders (status, created_at DESC);\n\n-- 校验：迁移后索引真的存在\n-- SELECT indexname FROM pg_indexes WHERE tablename = \'orders\';' },
      { out: 'idx_orders_status_created\norders_pkey\n// 若脚本语法错误：FlywayException: Migration V3 failed ... syntax error at or near "DEFAULT"' },
      { p: '一个非常值得加的测试是“从空库迁移到最新版”和“从上一个版本迁移到最新版”两条路径。前者验证脚本的完整性，后者验证增量脚本在已有数据上不会失败——后者才是生产真实场景，也是问题最集中的地方。很多脚本在空库上跑得通，在有几百万行数据的表上会因为加非空列而锁表或超时。' },
      { p: 'Liquibase 的思路不同：它用 changelog（XML/YAML/SQL）描述变更集，靠 changelog 的 id 与校验和判断是否执行过。它的优势是数据库无关与回滚描述，代价是配置更啰嗦。无论用哪个，测试的重点都一样——脚本能否在真库上跑通、跑完之后结构与预期是否一致。' },
      { note: '<b>提示：</b>不要用 hibernate.ddl-auto=create-drop 来“替代”迁移脚本。它生成的 schema 与迁移脚本产出的 schema 往往不一致，导致测试通过而线上结构不同。生产与测试必须用同一套迁移脚本。' },

      { p: '如果项目已经在用 H2，迁移到真库的过程中不必一次替换全部。可行的做法是：新写的集成测试直接用容器，老的 H2 测试按模块逐步下线，每次替换后对比两类测试的结果，确认没有“真库上才失败”的用例被漏掉。这个过程本身就能暴露一批隐藏问题。' },
      { h: '4.5 测试数据准备与隔离' },
      { p: '数据准备的方式直接决定测试的可维护性。反模式是“所有测试共用一个巨大的初始化脚本”：表之间互相关联，改一个字段要动几十个测试，新加测试时不敢动数据，最后没人愿意维护。更好的方式是每个测试自带它需要的最小数据，需要什么造什么。' },
      { p: '两种常见实现。一种是 SQL 脚本，按测试类划分，内容短小、可读、执行快；另一种是工厂方法与 builder，用 Java 代码构造实体，靠类型系统保证字段正确。前者适合需要精确控制 SQL 层行为的场景，后者适合业务对象复杂的场景。混合使用也完全正常。' },
      { code: '// 工厂方法：每个测试只造自己需要的数据\nstatic Order paidOrder(String amount) {\n    return new Order(null, new BigDecimal(amount), \"PAID\");\n}\n\n@Test\nvoid findsOnlyPaidOrders() {\n    repository.save(paidOrder(\"199.00\"));\n    repository.save(new Order(null, new BigDecimal(\"59.00\"), \"NEW\"));\n\n    assertThat(repository.findByStatus(\"PAID\"))\n            .extracting(Order::status)\n            .containsOnly(\"PAID\");\n}' },
      { out: 'Hibernate: insert into orders (amount,status,id) values (?,?,?)\nOrderRepositoryIT > findsOnlyPaidOrders() PASSED' },
      { p: '隔离的关键在于“测试不能依赖执行顺序”。如果两个测试都对同一张表做聚合查询，而后一个依赖前一个插入的数据，那么无论用什么数据库，测试都会在并行执行时随机失败。JUnit 并行跑测试是默认可以开启的，一旦开启，共享状态的问题会集中暴露。' },
      { p: '关于并行还有一点：容器共享与并行测试会互相冲突。同一个 schema 上并行执行清理与插入，会出现死锁或数据错乱。若要并行，得让每个测试线程用自己的 schema 或用自己的数据库，这在 Testcontainers 里可以通过创建多个数据库实现，但复杂度上升明显。多数项目的现实选择是不并行数据库测试。' },

      { p: '增量脚本的风险还有一类：锁与耗时。给一张大表加非空默认值、加索引，在 PostgreSQL 的某些版本上会持有较长时间的表锁，生产执行时可能造成请求堆积。测试环境数据量小，看不出来；解决办法不是把测试数据造到几百万行，而是在评审时对这类脚本单独标注，并在预发环境用接近真实的数据量演练一次。' },
      { h: '4.6 CI 里的 Docker 依赖与超时处理' },
      { p: 'Testcontainers 的前提是有一个可用的 Docker 环境。本地开发通常没问题，CI 上则要考虑三件事：Runner 是否提供 Docker、拉镜像的时间是否会拖垮流水线、以及失败时如何定位。这三件事没处理好，集成测试就会变成“经常红、没人看”的摆设。' },
      { p: '主流托管 CI 的 Linux Runner 一般已内置 Docker，但容器化 Runner（把 Job 本身跑在容器里）需要注意挂载 Docker socket，否则 Testcontainers 找不到守护进程。自建 Runner 则要确认 Docker 版本与镜像仓库的访问权限，尤其是内网环境往往需要配置私有镜像。' },
      { code: '# GitHub Actions：Linux Runner 自带 Docker，通常无需额外配置\n- name: Run integration tests\n  run: ./gradlew integrationTest\n  env:\n    TESTCONTAINERS_RYUK_DISABLED: \"false\"\n    # 首次拉取镜像慢时，在 ~/.testcontainers.properties 调大 pull.timeout（秒）\n    # 内网镜像仓库\n    TESTCONTAINERS_HUB_IMAGE_NAME_PREFIX: \"registry.internal.example.com/\"' },
      { out: '> Task :integrationTest\nContainer postgres:17-alpine started in 4.2s\nBUILD SUCCESSFUL in 1m 12s\n// 若 Docker 不可用：IllegalStateException: Could not find a valid Docker environment' },
      { p: '超时是最常见的失败原因。第一次运行时没有本地镜像缓存，拉取 postgres 镜像可能要几十秒到几分钟，默认超时容易触发。把拉取超时显式调大，并在 CI 上缓存镜像层（或者用预热的私有镜像），能把偶发失败降到接近零。' },
      { table: { head: ['问题', '表现', '处理方式'], rows: [
        ['找不到 Docker', 'Could not find a valid Docker environment', '挂载 /var/run/docker.sock 或改用带 Docker 的 Runner'],
        ['拉镜像超时', 'ContainerLaunchException: Timed out', '调大 pull timeout，预热镜像或走内网仓库'],
        ['端口冲突', 'BindException / 连接被拒', '让 Docker 随机分配端口，不要写死'],
        ['容器残留', '磁盘被占满，后续 Job 失败', '保留 Ryuk，确保运行结束自动清理'],
        ['内存不足', '容器被 OOM kill', '限制容器内存参数，减少并行度']
      ] } },
      { p: 'Ryuk 是 Testcontainers 的清理容器，负责在测试进程异常结束时回收资源。有人为了“加快启动”把它关掉，结果在 CI 上留下大量僵尸容器，几天后磁盘写满、流水线集体失败。除非环境确实不支持，否则不要关它。' },
      { p: '失败时的可诊断性同样重要。容器日志是排查的第一手材料，配置里打开容器日志输出（或者在测试失败时统一 dump），能避免“只看到一句超时”的困境。把容器启动日志与迁移脚本的执行输出一起打印，多数问题一眼就能定位。' },
      { note: '<b>提示：</b>给集成测试单独设一个 Gradle/Maven 任务（例如 integrationTest），与单元测试分开。这样本地快速迭代只跑单测，CI 上两者都跑，失败时也能一眼看出是哪一类挂了。' },

      { p: '关于是否要在 CI 上跑全量集成测试，有个务实的分层：每个 PR 跑与改动模块相关的集成测试，主干合并或每日构建跑全量。这样既保证反馈速度，又保证整体状态可控。全量跑一次几分钟的流水线是正常的，追求“几秒出结果”往往意味着测试被削弱到没有价值。' },
      { p: '一个实际操作建议：给集成测试加上“容器健康检查”。多数官方镜像支持等待就绪的策略，容器启动后不要立刻连，而是等它就绪再跑迁移。省掉这一步，会得到大量“偶尔连不上”的随机失败，而且很难与真正的配置错误区分开。' },
      { p: '对于本地开发，还有一个几乎零成本的优化：把常用的容器镜像提前拉好，并在文档里写清需要哪些镜像。新人不至于在第一次跑测试时对着几分钟的拉取进度条发呆，也不会把“慢”误判成“这套方案不可行”。' },
      { h: '4.7 常见故障与排查顺序' },
      { p: '集成测试出问题时，排查顺序比经验更重要。按下面这个顺序走，多数问题能在几分钟内定位，而不是在日志里翻半小时。' },
      { list: [
        '先确认 Docker 本身可用：docker info 能跑通，才轮到 Testcontainers。',
        '再看镜像是否能拉取：内网环境多半卡在这里，注意镜像前缀配置。',
        '确认容器真的启动成功：看容器日志里的 ready for connections 之类的就绪标志。',
        '确认连接参数正确：@ServiceConnection 或 @DynamicPropertySource 是否真的生效。',
        '确认迁移脚本执行顺序：版本号重复或乱序会导致部分脚本被跳过。',
        '确认测试数据隔离：并行执行与共享容器是随机失败的两大来源。',
        '最后才怀疑业务代码：前面六步都通过，问题通常才在代码里。'
      ] },
      { p: '还有一类容易被误判的问题：本地通过、CI 失败。常见原因是本地已有镜像缓存与残留数据，而 CI 是全新环境。遇到这种情况先在本机执行一次 docker prune 再跑，能复现就说明测试依赖了本地状态，需要修正初始化逻辑。' },
      { p: '性能方面有个经验值：单个集成测试类的总耗时（含容器启动）控制在 20 秒以内是合理的。如果某个类要跑两分钟，通常是容器没有共享、或者测试里造了过多数据。把慢测试单独标出来定期审视，比事后整体优化更有效。' },

      { p: '另一个现实收益是本地开发体验。新人拉下代码后不需要装数据库、不需要找 DBA 要一套开发库，直接跑测试就能看到真实的 SQL 行为与迁移结果。这件事看起来只是省了几步操作，实际大幅降低了上手成本，也让“在我机器上是好的”这类争论少了很多。' },
      { h: '4.8 本章小结' },
      { p: '这一章的主线是“让测试环境接近生产”。把结论凝成几条。' },
      { list: [
        'H2 只用于冒烟与不涉及数据库特性的逻辑，SQL 语义与迁移脚本必须用真库验证。',
        '@Testcontainers 配合 @ServiceConnection，容器连接参数自动注入，无需手写属性映射。',
        '容器声明为 static 字段，全类共享；按模块共享可以进一步提速，但要自己清理数据。',
        'Flyway 与 Liquibase 的脚本要在真库上跑“空库迁移”和“增量迁移”两条路径。',
        '不要用 ddl-auto=create-drop 替代迁移脚本，测试与生产的 schema 必须是同一套。',
        'CI 上要关注 Docker 可用性、镜像拉取超时与 Ryuk 清理，这三项是最常见的失败源。'
      ] },
      { p: '最后一句：集成测试的价值不在数量，而在它是否真的能拦住问题。一百个跑在 H2 上的测试，抵不上二十个跑在真库上、覆盖迁移脚本与关键查询的测试。原理层面的索引与事务细节见模块 18，本章只讲工具链与工程实践。' }
    ]
  };

})();
