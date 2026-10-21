/* 新手精讲 3：函数式 + IO + 并发（12 课） */
(function () {
  'use strict';
  var G = window.JAVA_GUIDES || (window.JAVA_GUIDES = {});

  G['lambda'] = {
    goals: ['识别函数式接口', '写出带参数和返回值的 lambda', '用方法引用简化代码'],
    flow: 'Lambda 是“把一段行为当参数传”的简写；它必须对应一个<b>只有一个抽象方法</b>的接口。',
    sections: [
      { h: '函数式接口是类型', p: 'Runnable 的 run() 无参无返回，Comparator 的 compare(a,b) 返回 int，Function 的 apply 接收一个值返回一个值。lambda 的形状必须和这个唯一抽象方法匹配。' },
      { h: '参数类型可以省略', p: '编译器能从目标类型推断参数类型，所以 (a, b) -> a.length() - b.length() 不需要写 String。只有一个参数时括号也能省略。' },
      { h: '方法引用是更短的写法', p: 'String::length 等价于 s -> s.length()，System.out::println 等价于 x -> System.out.println(x)。当 lambda 只调用一个已有方法时优先用它。' }
    ],
    pitfalls: [
      '在 lambda 里修改外部局部变量，编译报错（必须 effectively final）。',
      'lambda 里的 this 指向外部类，不是匿名内部类自己的 this。',
      '给不是函数式接口的接口写 lambda，编译失败。'
    ],
    homework: '用 Comparator 分别按字符串长度、字母序排序同一个 List；再用 Runnable 起一个线程打印当前线程名，最后改写成方法引用。'
  };

  G['stream'] = {
    goals: ['写出 源 → 中间操作 → 终止操作 的流水线', '用 collect 做列表、分组、拼接', '解释惰性求值'],
    flow: 'Stream 不存数据，只描述“怎么处理”。没有终止操作，中间操作一个都不会执行。',
    sections: [
      { h: '中间操作 vs 终止操作', p: 'filter/map/sorted/distinct 返回新的 Stream，是中间操作；collect/forEach/count/reduce 触发执行，是终止操作。' },
      { h: '常用收集器', p: 'Collectors.toList() 收集成列表，joining(",") 拼字符串，groupingBy(函数) 分组，counting() 计数。复杂报表基本都由这几个组合出来。' },
      { h: '惰性与一次性', p: '流水线会尽量把多个操作合并到一次遍历里；但一个 Stream 被消费后就不能复用，需要重新从数据源创建。' }
    ],
    pitfalls: [
      '忘记终止操作，filter/map 根本没执行。',
      '在流里修改外部集合，导致副作用和并发问题。',
      'parallelStream 里操作非线程安全集合，结果错乱。'
    ],
    homework: '给定一组姓名，用 Stream 完成：过滤长度大于 3、转大写、按字母排序、用逗号拼接；再按姓名长度分组并统计每组人数。'
  };

  G['optional'] = {
    goals: ['用 of/ofNullable/empty 正确创建', '用 orElse/orElseThrow 安全取值', '避免把 Optional 当字段和参数'],
    flow: 'Optional 的价值在<b>方法返回值</b>：用类型提醒调用方“这里可能没有值”。',
    sections: [
      { h: '三种创建方式', p: 'Optional.of(x) 要求非空，传 null 立即 NPE；Optional.ofNullable(x) 允许空；Optional.empty() 表示明确没有值。' },
      { h: '安全取值的组合', p: 'orElse(默认值) 空时返回默认值；orElseGet(Supplier) 延迟计算；orElseThrow() 空时抛异常；map 可以在有值时继续转换。' },
      { h: '不要这样用', p: 'if (opt.isPresent()) opt.get() 只是换了写法的 null 判断；Optional 不适合做字段、方法参数、集合元素，序列化也不友好。' }
    ],
    pitfalls: [
      'Optional.of(null) 直接抛 NPE。',
      '用 get() 前不判断，空 Optional 抛 NoSuchElementException。',
      '把 Optional 塞进实体类字段，JSON 序列化结果很奇怪。'
    ],
    homework: '写一个根据 id 查用户的方法，返回 Optional<User>；调用方分别用 orElse、orElseThrow、map 三种方式处理“查不到”的情况。'
  };

  G['io-streams'] = {
    goals: ['区分字节流与字符流', '解释编码不一致为什么乱码', '正确关闭多个流'],
    flow: '二进制用字节流，文本用字符流；字符流内部仍要经过编码解码，读写两端字符集必须一致。',
    sections: [
      { h: '字节流与字符流', p: 'InputStream/OutputStream 以 byte 为单位，适合图片、音频、压缩包；Reader/Writer 以 char 为单位，适合文本，调用 readLine 更方便。' },
      { h: '编码是桥梁', p: '文件里存的是字节，程序里处理的是字符。InputStreamReader 按 UTF-8 解码，OutputStreamWriter 按 UTF-8 编码；两边不一致就会出现“锟斤拷”。' },
      { h: '关闭顺序', p: '先打开的后关闭；用 try-with-resources 时 JVM 自动按相反顺序关闭。包装流关闭时会顺带关闭底层流，通常只关最外层。' }
    ],
    pitfalls: [
      '用字符流复制图片，文件损坏。',
      '读写编码不一致导致乱码。',
      '只 flush 不 close，文件句柄泄漏。'
    ],
    homework: '写两个方法：一个按字节复制图片，一个按 UTF-8 逐行读取文本并统计行数；分别用错误的编码读取同一文件，观察乱码。'
  };

  G['buffered'] = {
    goals: ['用缓冲流提升读写效率', '用 readLine 逐行处理文本', '用 try-with-resources 自动关闭'],
    flow: '缓冲流先在内存攒一批数据再统一读写，减少系统调用；try-with-resources 保证异常时也能关闭。',
    sections: [
      { h: '为什么要缓冲', p: '每读一个字节就访问一次磁盘非常慢。BufferedReader 内部有 8KB 缓冲，一次系统调用读一批，速度通常快一个数量级。' },
      { h: 'readLine 的边界', p: 'readLine 返回不含换行符的一行，读到末尾返回 null；它不能处理二进制，也不适合超大单行文本。' },
      { h: '自动关闭的顺序', p: 'try 括号里声明多个资源时，按声明的相反顺序关闭；关闭异常会被抑制并附加到主异常上，不会覆盖主异常。' }
    ],
    pitfalls: [
      '用 readLine 的返回值直接 equals，末尾 null 导致 NPE。',
      'BufferedWriter 写完不 flush/close，最后一段数据丢失。',
      '在 try 外面创建流，try 里面才使用，异常时无法自动关闭。'
    ],
    homework: '读取一个文本文件，统计行数、单词数和最长的一行；再用 BufferedWriter 把结果写回另一个文件，确保中文不乱码。'
  };

  G['nio-files'] = {
    goals: ['用 Path 表示和拼接路径', '用 Files 完成读写、复制、遍历', '知道 File 与 NIO 的区别'],
    flow: 'NIO.2 的核心是 <b>Path 表示路径，Files 提供操作</b>；比老的 File 类更清晰，也更容易处理异常。',
    sections: [
      { h: 'Path 只是路径', p: 'Path.of("data", "a.txt") 不会创建文件；resolve 拼接、relativize 求相对路径、normalize 去掉 . 和 ..。' },
      { h: 'Files 的常用方法', p: 'readString/writeString 一行读写，readAllLines 读成列表，copy/move/deleteIfExists 做文件操作，createDirectories 创建多级目录。' },
      { h: '遍历目录', p: 'Files.list 只看一层，Files.walk 递归整棵树，都返回 Stream<Path>，要用 try-with-resources 关闭流，避免句柄泄漏。' }
    ],
    pitfalls: [
      'writeString 默认覆盖原文件，追加要传 StandardOpenOption.APPEND。',
      'readAllLines 把大文件一次性读进内存，容易 OOM。',
      'Files.walk 忘记关闭 Stream。'
    ],
    homework: '用 Files 创建一个多级目录和文件，写入三行文本，再读出来打印；最后用 Files.walk 统计当前目录下所有 .java 文件数量。'
  };

  G['serialization'] = {
    goals: ['让类可序列化并声明 serialVersionUID', '理解 transient 的作用', '知道原生序列化的风险与替代方案'],
    flow: '序列化把对象变成字节流；反序列化再还原。Java 原生方案方便但脆弱，跨语言场景优先 JSON。',
    sections: [
      { h: 'Serializable 只是标记', p: '它没有方法，只告诉 JVM“这个类允许被序列化”。ObjectOutputStream.writeObject 会递归写出所有非 transient 字段。' },
      { h: 'serialVersionUID 是版本号', p: '类结构变化时，版本号不一致会抛 InvalidClassException。显式声明能让小的兼容改动通过，但不要随意改。' },
      { h: 'transient 与安全', p: '密码、令牌等字段加 transient 不参与序列化，反序列化后是默认值。原生反序列化还可能被恶意字节流利用，外部输入不要直接反序列化。' }
    ],
    pitfalls: [
      '父类没有无参构造器时，子类反序列化可能失败。',
      'transient 字段读回来是 null/0，不是原值。',
      '把不可信数据直接 ObjectInputStream 反序列化，存在安全漏洞。'
    ],
    homework: '写一个 User 类（name、password 加 transient），序列化到文件再反序列化，打印两个字段；再把 password 的 transient 去掉对比结果。'
  };

  G['thread-basics'] = {
    goals: ['用 Runnable/Callable 创建线程', '说清线程生命周期', '正确使用 start/join/interrupt'],
    flow: '线程是程序里的独立执行流；<b>start 才是启动新线程，run 只是普通方法调用</b>。',
    sections: [
      { h: '创建方式', p: '继承 Thread 或实现 Runnable 都能创建线程，推荐 Runnable（不占用继承名额）；需要返回值或抛异常用 Callable + FutureTask。' },
      { h: '生命周期', p: 'NEW → RUNNABLE → 可能进入 BLOCKED/WAITING/TIMED_WAITING → TERMINATED。状态由 JVM 调度决定，不要用 sleep 去“猜”顺序。' },
      { h: '协作而不是强杀', p: 'join 等待线程结束，sleep 让出 CPU 一段时间，interrupt 只是设置中断标志，线程要自己检查 isInterrupted 并退出。' }
    ],
    pitfalls: [
      '调用 run() 而不是 start()，根本没有并发。',
      '在 UI 线程里 join 一个不会结束的线程，界面卡死。',
      '用 stop() 强杀线程，已废弃且不安全。'
    ],
    homework: '创建两个线程，一个打印奇数、一个打印偶数（1~20），用 join 保证主线程最后输出“完成”；再用 interrupt 让一个循环线程优雅退出。'
  };

  G['sync-volatile'] = {
    goals: ['解释 count++ 为什么不是原子操作', '用 synchronized 保护临界区', '区分 volatile 与锁的适用场景'],
    flow: '并发问题分三类：<b>原子性、可见性、有序性</b>。synchronized 三者都管，volatile 只管后两个。',
    sections: [
      { h: '丢失更新是怎么发生的', p: 'count++ 分读取、加一、写回三步。两个线程可能同时读到 0，各自加一后写回 1，两次自增只生效一次。' },
      { h: 'synchronized 的边界', p: '锁对象必须全局唯一，临界区尽量小；静态方法锁的是 Class 对象，实例方法锁的是 this。' },
      { h: 'volatile 适合什么', p: '适合状态标志位（running=true/false），保证一个线程改了另一个立刻看到；但它不能保证 count++ 的原子性，计数要用 AtomicInteger。' }
    ],
    pitfalls: [
      '用 volatile 修饰计数器，结果仍然少加。',
      '每个线程 new 一把锁，等于没锁。',
      '在 synchronized 块里做远程调用，长时间占锁。'
    ],
    homework: '写两个线程各对 count 自增 1000 次，先不加锁运行多次观察结果；再加 synchronized 或换 AtomicInteger，验证结果稳定为 2000。'
  };

  G['executors'] = {
    goals: ['说清线程池七个参数', '解释任务提交后的去向', '正确关闭线程池'],
    flow: '线程池 = <b>复用线程 + 队列缓冲 + 拒绝策略</b>。核心线程满了进队列，队列满了扩到最大线程，再满就拒绝。',
    sections: [
      { h: '七个参数', p: '核心线程数、最大线程数、空闲存活时间、时间单位、任务队列、线程工厂、拒绝策略。面试和排障都绕不开它们。' },
      { h: '为什么不用 Executors 快捷工厂', p: 'newFixedThreadPool 用无界队列，任务堆积会 OOM；newCachedThreadPool 最大线程数是 Integer.MAX_VALUE，可能创建过多线程。生产环境自己 new ThreadPoolExecutor。' },
      { h: '提交与关闭', p: 'execute 无返回值，submit 返回 Future；shutdown 不再接新任务但等已提交任务跑完，shutdownNow 尝试中断。' }
    ],
    pitfalls: [
      '线程池用完不 shutdown，JVM 无法退出。',
      'Future.get 不设超时，任务卡住时调用方永远阻塞。',
      '在任务里抛异常却不看 Future，异常被静默吞掉。'
    ],
    homework: '用 ThreadPoolExecutor 创建 2 核心、4 最大、有界队列的线程池，提交 10 个任务并打印线程名；再改用 Callable 提交一个带返回值的任务，用 get(1, SECONDS) 取结果。'
  };

  G['concurrent-collections'] = {
    goals: ['用 ConcurrentHashMap 替代 HashMap', '理解 CopyOnWriteArrayList 的取舍', '用 BlockingQueue 实现生产者消费者'],
    flow: '并发容器只保证<b>单个操作</b>线程安全；多个操作组合仍要加锁或用原子方法（merge/compute）。',
    sections: [
      { h: 'ConcurrentHashMap', p: 'JDK 8 用 CAS + synchronized 锁单个桶，读几乎无锁；merge/compute 把“读改写”合成原子操作，适合计数。' },
      { h: 'CopyOnWriteArrayList', p: '写时复制整个数组，读操作完全不加锁，适合读多写少的监听器列表；写频繁时性能很差。' },
      { h: 'BlockingQueue 与 CompletableFuture', p: 'put 满时阻塞、take 空时阻塞，是生产者消费者的核心；CompletableFuture 用 thenApply/thenCompose 把异步任务串起来，避免回调地狱。' }
    ],
    pitfalls: [
      '先 get 再 put 做计数，两个线程之间仍会丢更新。',
      '把 CopyOnWriteArrayList 用在频繁写入的场景。',
      'CompletableFuture 回调里抛异常不处理，结果永远不完成。'
    ],
    homework: '用 ConcurrentHashMap.merge 统计一段文本中每个单词出现的次数；再用 ArrayBlockingQueue(2) 写一个生产者/消费者，观察队列满/空时的阻塞。'
  };

  G['deadlock-jmm'] = {
    goals: ['说出死锁四个必要条件', '用 jstack 定位死锁', '理解 happens-before 与指令重排'],
    flow: '死锁 = <b>互相持有、互相等待</b>。破坏循环等待最简单：所有线程按同一顺序加锁。',
    sections: [
      { h: '四个条件', p: '互斥、请求并保持、不可剥夺、循环等待。只要破坏任意一个就不会死锁；工程上最常用“固定加锁顺序”。' },
      { h: '怎么排查', p: 'jstack <pid> 会打印 “Found one Java-level deadlock”，直接列出线程、持有的锁、等待的锁。线上卡死先抓线程栈。' },
      { h: 'JMM 与可见性', p: 'happens-before 规定：锁释放先于获取、volatile 写先于读、线程 start 先于 run。volatile 和锁通过内存屏障禁止特定重排，双重检查单例必须加 volatile。' }
    ],
    pitfalls: [
      '嵌套锁顺序不一致，两个线程互相等待。',
      '锁里调用外部回调，回调又去拿另一把锁。',
      '以为 volatile 能替代锁保证复合操作原子性。'
    ],
    homework: '写一个必然死锁的例子（两个线程反序拿两把锁），用 jstack 找到死锁报告；再改成固定顺序加锁，验证不再死锁。'
  };
})();
