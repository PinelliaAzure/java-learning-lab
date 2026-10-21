/* 精读补充 3：异常泛型 + 函数式 + IO + 并发（17 课） */
(function () {
  'use strict';
  var D = window.JAVA_DEEP || (window.JAVA_DEEP = {});

  D['exceptions'] = {
    summary: [
      'Error 不处理，受检异常强制处理，RuntimeException 多半是 bug。',
      '能处理就捕获，处理不了就包装后继续抛。',
      '资源关闭用 try-with-resources，别手写 finally。'
    ]
  };

  D['custom-exception'] = {
    summary: [
      '业务异常继承 RuntimeException，外部问题用受检异常。',
      '异常信息写清楚“操作 + 数据 + 期望”。',
      '永远保留 cause，不要只打印 message。'
    ]
  };

  D['generics'] = {
    summary: [
      '泛型把类型错误提前到编译期。',
      'PECS：生产者用 extends，消费者用 super。',
      '泛型不能 new T()、new T[]，也不能 instanceof。'
    ]
  };

  D['erasure'] = {
    summary: [
      '泛型只在编译期存在，运行时被擦除。',
      '不能创建泛型数组，不能对泛型类型 instanceof。',
      '仅泛型参数不同的方法不能重载。'
    ]
  };

  D['lambda'] = {
    summary: [
      '函数式接口 = 只有一个抽象方法的接口。',
      '参数类型可省略，单参数可省括号。',
      '捕获的局部变量不能重新赋值。'
    ]
  };

  D['stream'] = {
    summary: [
      '源 → 中间操作 → 终止操作，缺一不可。',
      '流只能消费一次，消费后需要重新创建。',
      'parallelStream 不是万能加速，注意线程安全和顺序。'
    ]
  };

  D['optional'] = {
    summary: [
      'Optional 主要用作可能为空的方法返回值。',
      '优先 orElse/orElseGet/orElseThrow，不要直接 get。',
      '不要做字段、参数和集合元素。'
    ]
  };

  D['io-streams'] = {
    summary: [
      '二进制用字节流，文本用字符流。',
      '字符流内部仍要指定编码，默认编码因平台而异。',
      '流一定要关闭，优先 try-with-resources。'
    ]
  };

  D['buffered'] = {
    summary: [
      '缓冲流减少 IO 次数，文本读取首选 BufferedReader。',
      'readLine 返回 null 表示结束，循环条件要判空。',
      '写完记得 flush/close，否则最后一段可能丢失。'
    ]
  };

  D['nio-files'] = {
    summary: [
      'Path 表示路径，Files 提供操作。',
      '小文件 readString/writeString，大文件用流式处理。',
      '遍历得到的 Stream 要关闭。'
    ]
  };

  D['serialization'] = {
    summary: [
      'Serializable 只是标记，字段默认全部序列化。',
      '敏感字段加 transient，版本号显式声明。',
      '现代项目优先 JSON，原生序列化注意安全风险。'
    ]
  };

  D['network-json'] = {
    summary: [
      'HTTP 调用四步：客户端、请求、发送、判状态码。',
      'JSON 键必须双引号，对象映射靠字段名或注解。',
      '网络异常和业务错误分开处理。'
    ]
  };

  D['thread-basics'] = {
    summary: [
      'start 启动新线程，run 只是方法调用。',
      '线程状态由 JVM 调度，不要用 sleep 猜顺序。',
      '中断是协作式的，线程要主动检查标志。'
    ]
  };

  D['sync-volatile'] = {
    summary: [
      'count++ 不是原子操作，必须加锁或用原子类。',
      'synchronized 三者都保证，volatile 只保证可见性和有序性。',
      '锁对象要唯一，临界区尽量小。'
    ]
  };

  D['executors'] = {
    summary: [
      '线程池先核心、再队列、再最大、最后拒绝。',
      '生产环境用有界队列 + 明确拒绝策略，别用 Executors 快捷工厂。',
      '用完 shutdown，Future.get 要设超时。'
    ]
  };

  D['concurrent-collections'] = {
    summary: [
      '并发容器保证单操作安全，组合操作仍要原子方法或加锁。',
      '读多写少用 CopyOnWriteArrayList，队列用 BlockingQueue。',
      'CompletableFuture 要处理异常分支。'
    ]
  };

  D['deadlock-jmm'] = {
    summary: [
      '破坏任意一个必要条件就能避免死锁，最常用固定加锁顺序。',
      '线上卡死先 jstack，看持有和等待关系。',
      'happens-before 保证可见性，volatile/锁插入内存屏障禁止重排。'
    ]
  };
})();
