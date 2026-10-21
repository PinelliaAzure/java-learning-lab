/* 新手精讲 3：函数式 + IO + 并发（12 课） */
(function () {
  'use strict';
  var G = window.JAVA_GUIDES || (window.JAVA_GUIDES = {});

  G['lambda'] = {
    goals: ['识别函数式接口', '写出带参数和返回值的 lambda', '用方法引用简化代码'],
    pitfalls: [
      '在 lambda 里修改外部局部变量，编译报错（必须 effectively final）。',
      'lambda 里的 this 指向外部类，不是匿名内部类自己的 this。',
      '给不是函数式接口的接口写 lambda，编译失败。'
    ],
    homework: '用 Comparator 分别按字符串长度、字母序排序同一个 List；再用 Runnable 起一个线程打印当前线程名，最后改写成方法引用。'
  };

  G['stream'] = {
    goals: ['写出 源 → 中间操作 → 终止操作 的流水线', '用 collect 做列表、分组、拼接', '解释惰性求值'],
    pitfalls: [
      '忘记终止操作，filter/map 根本没执行。',
      '在流里修改外部集合，导致副作用和并发问题。',
      'parallelStream 里操作非线程安全集合，结果错乱。'
    ],
    homework: '给定一组姓名，用 Stream 完成：过滤长度大于 3、转大写、按字母排序、用逗号拼接；再按姓名长度分组并统计每组人数。'
  };

  G['optional'] = {
    goals: ['用 of/ofNullable/empty 正确创建', '用 orElse/orElseThrow 安全取值', '避免把 Optional 当字段和参数'],
    pitfalls: [
      'Optional.of(null) 直接抛 NPE。',
      '用 get() 前不判断，空 Optional 抛 NoSuchElementException。',
      '把 Optional 塞进实体类字段，JSON 序列化结果很奇怪。'
    ],
    homework: '写一个根据 id 查用户的方法，返回 Optional<User>；调用方分别用 orElse、orElseThrow、map 三种方式处理“查不到”的情况。'
  };

  G['io-streams'] = {
    goals: ['区分字节流与字符流', '解释编码不一致为什么乱码', '正确关闭多个流'],
    pitfalls: [
      '用字符流复制图片，文件损坏。',
      '读写编码不一致导致乱码。',
      '只 flush 不 close，文件句柄泄漏。'
    ],
    homework: '写两个方法：一个按字节复制图片，一个按 UTF-8 逐行读取文本并统计行数；分别用错误的编码读取同一文件，观察乱码。'
  };

  G['buffered'] = {
    goals: ['用缓冲流提升读写效率', '用 readLine 逐行处理文本', '用 try-with-resources 自动关闭'],
    pitfalls: [
      '用 readLine 的返回值直接 equals，末尾 null 导致 NPE。',
      'BufferedWriter 写完不 flush/close，最后一段数据丢失。',
      '在 try 外面创建流，try 里面才使用，异常时无法自动关闭。'
    ],
    homework: '读取一个文本文件，统计行数、单词数和最长的一行；再用 BufferedWriter 把结果写回另一个文件，确保中文不乱码。'
  };

  G['nio-files'] = {
    goals: ['用 Path 表示和拼接路径', '用 Files 完成读写、复制、遍历', '知道 File 与 NIO 的区别'],
    pitfalls: [
      'writeString 默认覆盖原文件，追加要传 StandardOpenOption.APPEND。',
      'readAllLines 把大文件一次性读进内存，容易 OOM。',
      'Files.walk 忘记关闭 Stream。'
    ],
    homework: '用 Files 创建一个多级目录和文件，写入三行文本，再读出来打印；最后用 Files.walk 统计当前目录下所有 .java 文件数量。'
  };

  G['serialization'] = {
    goals: ['让类可序列化并声明 serialVersionUID', '理解 transient 的作用', '知道原生序列化的风险与替代方案'],
    pitfalls: [
      '父类没有无参构造器时，子类反序列化可能失败。',
      'transient 字段读回来是 null/0，不是原值。',
      '把不可信数据直接 ObjectInputStream 反序列化，存在安全漏洞。'
    ],
    homework: '写一个 User 类（name、password 加 transient），序列化到文件再反序列化，打印两个字段；再把 password 的 transient 去掉对比结果。'
  };

  G['thread-basics'] = {
    goals: ['用 Runnable/Callable 创建线程', '说清线程生命周期', '正确使用 start/join/interrupt'],
    pitfalls: [
      '调用 run() 而不是 start()，根本没有并发。',
      '在 UI 线程里 join 一个不会结束的线程，界面卡死。',
      '用 stop() 强杀线程，已废弃且不安全。'
    ],
    homework: '创建两个线程，一个打印奇数、一个打印偶数（1~20），用 join 保证主线程最后输出“完成”；再用 interrupt 让一个循环线程优雅退出。'
  };

  G['sync-volatile'] = {
    goals: ['解释 count++ 为什么不是原子操作', '用 synchronized 保护临界区', '区分 volatile 与锁的适用场景'],
    pitfalls: [
      '用 volatile 修饰计数器，结果仍然少加。',
      '每个线程 new 一把锁，等于没锁。',
      '在 synchronized 块里做远程调用，长时间占锁。'
    ],
    homework: '写两个线程各对 count 自增 1000 次，先不加锁运行多次观察结果；再加 synchronized 或换 AtomicInteger，验证结果稳定为 2000。'
  };

  G['executors'] = {
    goals: ['说清线程池七个参数', '解释任务提交后的去向', '正确关闭线程池'],
    pitfalls: [
      '线程池用完不 shutdown，JVM 无法退出。',
      'Future.get 不设超时，任务卡住时调用方永远阻塞。',
      '在任务里抛异常却不看 Future，异常被静默吞掉。'
    ],
    homework: '用 ThreadPoolExecutor 创建 2 核心、4 最大、有界队列的线程池，提交 10 个任务并打印线程名；再改用 Callable 提交一个带返回值的任务，用 get(1, SECONDS) 取结果。'
  };

  G['concurrent-collections'] = {
    goals: ['用 ConcurrentHashMap 替代 HashMap', '理解 CopyOnWriteArrayList 的取舍', '用 BlockingQueue 实现生产者消费者'],
    pitfalls: [
      '先 get 再 put 做计数，两个线程之间仍会丢更新。',
      '把 CopyOnWriteArrayList 用在频繁写入的场景。',
      'CompletableFuture 回调里抛异常不处理，结果永远不完成。'
    ],
    homework: '用 ConcurrentHashMap.merge 统计一段文本中每个单词出现的次数；再用 ArrayBlockingQueue(2) 写一个生产者/消费者，观察队列满/空时的阻塞。'
  };

  G['deadlock-jmm'] = {
    goals: ['说出死锁四个必要条件', '用 jstack 定位死锁', '理解 happens-before 与指令重排'],
    pitfalls: [
      '嵌套锁顺序不一致，两个线程互相等待。',
      '锁里调用外部回调，回调又去拿另一把锁。',
      '以为 volatile 能替代锁保证复合操作原子性。'
    ],
    homework: '写一个必然死锁的例子（两个线程反序拿两把锁），用 jstack 找到死锁报告；再改成固定顺序加锁，验证不再死锁。'
  };
})();
