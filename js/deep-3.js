/* 精读补充 3：异常泛型 + 函数式 + IO + 并发（17 课） */
(function () {
  'use strict';
  var D = window.JAVA_DEEP || (window.JAVA_DEEP = {});

  D['exceptions'] = {
    why: '异常不是“出错就完蛋”，而是 Java 传递错误的机制。分不清受检/非受检、不会用 try-with-resources，就会写出到处 throws 或静默吞错的代码。',
    walk: [
      ['try { ... }', '把可能出错的代码放进来，一旦抛异常，后面的语句不再执行。'],
      ['catch (ArithmeticException e)', '只捕获能处理的类型；子类异常要写在父类前面。'],
      ['finally', '无论是否异常都会执行，适合释放资源；不要在 finally 里 return。'],
      ['try (BufferedReader br = ...)', '资源自动关闭，按声明的相反顺序；关闭异常会被抑制。'],
      ['throw new IllegalArgumentException(...)', '主动抛出异常，表达“参数非法”。'],
      ['throws IOException', '把受检异常交给调用方处理，调用方必须 try 或继续 throws。']
    ],
    summary: [
      'Error 不处理，受检异常强制处理，RuntimeException 多半是 bug。',
      '能处理就捕获，处理不了就包装后继续抛。',
      '资源关闭用 try-with-resources，别手写 finally。'
    ]
  };

  D['custom-exception'] = {
    why: '业务代码需要表达“余额不足”“订单已取消”，而不是抛一个笼统的 RuntimeException。自定义异常让错误可读、可分类、可处理。',
    walk: [
      ['extends RuntimeException', '业务规则拒绝用非受检异常，避免每层方法都写 throws。'],
      ['super(message)', '把可读信息传给父类，getMessage 能拿到。'],
      ['throw new BalanceException(...)', '在业务方法里主动抛出，中断正常流程。'],
      ['catch (BalanceException e)', '调用方按业务异常处理，给用户友好提示。'],
      ['new OrderException("下单失败", e)', '包装底层异常时保留 cause，日志里能看到根因堆栈。'],
      ['空 catch', '静默吞掉异常最危险，问题会被隐藏，排查时毫无线索。']
    ],
    summary: [
      '业务异常继承 RuntimeException，外部问题用受检异常。',
      '异常信息写清楚“操作 + 数据 + 期望”。',
      '永远保留 cause，不要只打印 message。'
    ]
  };

  D['generics'] = {
    why: '没有泛型时，集合取出来的都是 Object，必须强转，错误要到运行时才暴露。泛型把类型检查提前到编译期，是集合和安全 API 的基础。',
    walk: [
      ['class Box<T>', 'T 是类型参数，可用于字段、参数、返回值。'],
      ['Box<String> box = new Box<>()', '指定 T 为 String，set 只能接收 String，get 自动返回 String。'],
      ['static <T> T id(T t)', '泛型方法在返回类型前声明类型参数，调用时自动推断。'],
      ['<T extends Number>', '上界限制，方法里可以调用 Number 的 API。'],
      ['List<? extends Number>', '只读场景，可以接收 List<Integer>，但除 null 外不能写入。'],
      ['List<? super Integer>', '只写场景，可以写入 Integer，读取只能当 Object。']
    ],
    summary: [
      '泛型把类型错误提前到编译期。',
      'PECS：生产者用 extends，消费者用 super。',
      '泛型不能 new T()、new T[]，也不能 instanceof。'
    ]
  };

  D['erasure'] = {
    why: '泛型是编译期语法糖，运行时被擦除。不理解这一点，就无法解释为什么 List<String> 和 List<Integer> 的 getClass 相同，为什么不能创建泛型数组。',
    walk: [
      ['编译期检查', '编译器根据泛型做类型校验，不合法直接报错。'],
      ['擦除', '类型参数替换成上界（通常是 Object），并插入强制转换。'],
      ['a.getClass() == b.getClass()', '运行时都是 ArrayList，泛型信息不存在于对象本身。'],
      ['桥方法', '子类重写泛型方法时编译器生成 synthetic 方法，保证多态调用正确。'],
      ['new T[10]', '运行时不知道 T 是什么，无法创建具体类型数组。'],
      ['Signature 属性', '泛型信息保留在 class 文件的签名里，反射可以读到。']
    ],
    summary: [
      '泛型只在编译期存在，运行时被擦除。',
      '不能创建泛型数组，不能对泛型类型 instanceof。',
      '仅泛型参数不同的方法不能重载。'
    ]
  };

  D['lambda'] = {
    why: 'Lambda 把“一段行为”变成参数，是 Stream、排序、线程、回调的基础。不理解函数式接口，就只会照抄 (a, b) -> ... 而不知道它为什么能编译。',
    walk: [
      ['Runnable r = () -> ...', 'Runnable 只有一个抽象方法 run()，lambda 的形状与它匹配。'],
      ['Comparator<String> c = (a, b) -> ...', '参数类型可省略，编译器从目标类型推断。'],
      ['names.sort(c)', '把行为作为参数传进去，排序算法由 sort 负责。'],
      ['String::length', '方法引用，等价于 s -> s.length()；只调用一个已有方法时用它。'],
      ['int base = 10; x -> x + base', 'lambda 捕获局部变量，变量必须 effectively final。'],
      ['this', 'lambda 没有自己的 this，指向外部类；匿名内部类才有自己的 this。']
    ],
    summary: [
      '函数式接口 = 只有一个抽象方法的接口。',
      '参数类型可省略，单参数可省括号。',
      '捕获的局部变量不能重新赋值。'
    ]
  };

  D['stream'] = {
    why: '集合负责存数据，Stream 负责处理数据。过滤、转换、排序、分组用声明式写法完成，代码更短，但惰性和一次性两个特性必须理解。',
    walk: [
      ['list.stream()', '从集合创建流，不修改原集合。'],
      ['filter(n -> n.length() > 3)', '中间操作，保留满足条件的元素，返回新流。'],
      ['map(String::toUpperCase)', '中间操作，把每个元素转换成另一个值。'],
      ['sorted()', '中间操作，按自然顺序排序；可传 Comparator。'],
      ['collect(Collectors.toList())', '终止操作，触发真正执行并收集结果。'],
      ['没有终止操作', '中间操作只是记录配方，一个都不会执行。']
    ],
    summary: [
      '源 → 中间操作 → 终止操作，缺一不可。',
      '流只能消费一次，消费后需要重新创建。',
      'parallelStream 不是万能加速，注意线程安全和顺序。'
    ]
  };

  D['optional'] = {
    why: '空指针是 Java 最常见的运行时异常。Optional 用类型提醒调用方“这里可能没有值”，但它不是万能的 null 解药，用错反而更啰嗦。',
    walk: [
      ['Optional.of(x)', '要求 x 非空，传 null 立即抛 NPE。'],
      ['Optional.ofNullable(x)', '允许 x 为 null，返回 empty 或包装值。'],
      ['opt.orElse("默认")', '为空时返回默认值；默认值会立即计算。'],
      ['opt.orElseGet(() -> ...)', '延迟计算默认值，适合开销大的场景。'],
      ['opt.orElseThrow()', '为空时抛异常，适合“必须存在”的业务。'],
      ['if (opt.isPresent()) opt.get()', '等于换了写法的 null 判断，不推荐；用 map/ifPresent。']
    ],
    summary: [
      'Optional 主要用作可能为空的方法返回值。',
      '优先 orElse/orElseGet/orElseThrow，不要直接 get。',
      '不要做字段、参数和集合元素。'
    ]
  };

  D['io-streams'] = {
    why: '文件、网络、图片，所有数据最终都是字节。分不清字节流和字符流，就会把图片读坏，或者把中文读成乱码。',
    walk: [
      ['FileInputStream', '按字节读取文件，适合图片、音频、压缩包。'],
      ['in.read(buf)', '一次读一批字节到数组，返回实际读到的数量，-1 表示结束。'],
      ['FileReader / InputStreamReader', '把字节按字符集解码成字符，适合文本。'],
      ['OutputStream', '按字节写出；写完后 flush/close 才真正落盘。'],
      ['编码不一致', '写入用 UTF-8、读取用 GBK 就会乱码，两端必须一致。'],
      ['关闭顺序', '先打开的后关闭；try-with-resources 自动处理。']
    ],
    summary: [
      '二进制用字节流，文本用字符流。',
      '字符流内部仍要指定编码，默认编码因平台而异。',
      '流一定要关闭，优先 try-with-resources。'
    ]
  };

  D['buffered'] = {
    why: '每读一个字节就访问一次磁盘，程序会慢得离谱。缓冲流在内存攒一批再统一读写，通常能快一个数量级。',
    walk: [
      ['new BufferedReader(new FileReader(...))', '在字符流外套一层缓冲区，减少系统调用。'],
      ['br.readLine()', '读一整行，不含换行符；读到末尾返回 null。'],
      ['while ((line = br.readLine()) != null)', '先赋值再判断，是读文件的经典写法。'],
      ['BufferedWriter.write / newLine', '写入缓冲区；newLine 跨平台换行。'],
      ['flush()', '把缓冲区内容立即写出；close 前通常会自动 flush。'],
      ['try-with-resources', '异常时也能关闭，避免文件句柄泄漏。']
    ],
    summary: [
      '缓冲流减少 IO 次数，文本读取首选 BufferedReader。',
      'readLine 返回 null 表示结束，循环条件要判空。',
      '写完记得 flush/close，否则最后一段可能丢失。'
    ]
  };

  D['nio-files'] = {
    why: '老的 File 类 API 零散、错误信息不清晰。NIO.2 用 Path + Files 把文件操作统一起来，一行就能读写文件。',
    walk: [
      ['Path.of("data", "a.txt")', '只是路径对象，不要求文件存在；resolve 拼接、normalize 清理。'],
      ['Files.writeString(path, "hi")', '一行写文件，默认覆盖；追加要传 APPEND 选项。'],
      ['Files.readString(path)', '一行读整个文件，适合小文件；大文件用 BufferedReader 或 Files.lines。'],
      ['Files.copy / move / deleteIfExists', '常用文件操作，失败会抛 IOException。'],
      ['Files.list(dir)', '只看一层目录，返回 Stream<Path>，要关闭。'],
      ['Files.walk(dir)', '递归遍历整棵目录树，适合统计和批量处理。']
    ],
    summary: [
      'Path 表示路径，Files 提供操作。',
      '小文件 readString/writeString，大文件用流式处理。',
      '遍历得到的 Stream 要关闭。'
    ]
  };

  D['serialization'] = {
    why: '把对象存文件、通过网络传输，需要序列化。Java 原生序列化方便但脆弱，理解 serialVersionUID 和 transient 才能避免踩坑。',
    walk: [
      ['implements Serializable', '标记接口，告诉 JVM 这个类允许被序列化。'],
      ['serialVersionUID', '版本号；类结构变化时不匹配会抛 InvalidClassException。'],
      ['transient String password', '不参与序列化，反序列化后是 null。'],
      ['ObjectOutputStream.writeObject', '把对象递归写成字节流。'],
      ['ObjectInputStream.readObject', '读回对象，返回 Object，需要强转。'],
      ['JSON 替代', '跨语言、可读、体积小；外部输入不要直接反序列化 Java 字节流。']
    ],
    summary: [
      'Serializable 只是标记，字段默认全部序列化。',
      '敏感字段加 transient，版本号显式声明。',
      '现代项目优先 JSON，原生序列化注意安全风险。'
    ]
  };

  D['network-json'] = {
    why: '后端服务之间、前后端之间几乎都通过 HTTP + JSON 通信。不会发请求、不会解析 JSON，就无法对接任何真实系统。',
    walk: [
      ['HttpClient.newBuilder()', '创建客户端；复用同一个实例，内部有连接池。'],
      ['HttpRequest.newBuilder().uri(...)', '构造请求：URI、方法、请求头、超时。'],
      ['client.send(req, BodyHandlers.ofString())', '同步发送，阻塞直到响应；异步用 sendAsync。'],
      ['response.statusCode()', '先判断状态码，200 才解析业务数据。'],
      ['ObjectMapper.readValue(body, Book.class)', 'JSON 转对象；字段名要匹配，或用注解映射。'],
      ['connectTimeout / requestTimeout', '网络必须设超时，否则线程可能永久卡住。']
    ],
    summary: [
      'HTTP 调用四步：客户端、请求、发送、判状态码。',
      'JSON 键必须双引号，对象映射靠字段名或注解。',
      '网络异常和业务错误分开处理。'
    ]
  };

  D['thread-basics'] = {
    why: '并发让程序同时做多件事，也带来竞态、死锁和可见性问题。第一步是正确创建线程、理解生命周期，而不是一上来就背锁。',
    walk: [
      ['new Thread(runnable)', '创建线程对象，状态 NEW，还没有真正启动。'],
      ['t.start()', '交给调度器，进入 RUNNABLE；由 JVM 决定何时执行。'],
      ['t.run()', '只是普通方法调用，不会创建新线程。'],
      ['t.join()', '当前线程等待 t 结束，常用于保证输出顺序。'],
      ['Thread.sleep(1000)', '让当前线程休眠，不释放锁；可能被 interrupt 唤醒。'],
      ['t.interrupt()', '设置中断标志，线程要自己检查并退出，不是强杀。']
    ],
    summary: [
      'start 启动新线程，run 只是方法调用。',
      '线程状态由 JVM 调度，不要用 sleep 猜顺序。',
      '中断是协作式的，线程要主动检查标志。'
    ]
  };

  D['sync-volatile'] = {
    why: '两个线程各加 1000 次，结果却不是 2000——这是最经典的并发 bug。理解原子性、可见性、有序性，才知道什么时候该加锁。',
    walk: [
      ['count++', '分读取、加一、写回三步，不是原子操作。'],
      ['两个线程同时读 0', '各自加一后写回 1，两次自增只生效一次。'],
      ['synchronized (lock)', '同一时刻只有一个线程进入临界区，保证原子性和可见性。'],
      ['锁对象必须唯一', '每个线程 new 一把锁等于没锁；静态方法锁 Class。'],
      ['volatile', '保证可见性、禁止重排，但不保证复合操作原子性。'],
      ['AtomicInteger.incrementAndGet()', '基于 CAS 的无锁原子操作，适合高并发计数。']
    ],
    summary: [
      'count++ 不是原子操作，必须加锁或用原子类。',
      'synchronized 三者都保证，volatile 只保证可见性和有序性。',
      '锁对象要唯一，临界区尽量小。'
    ]
  };

  D['executors'] = {
    why: '每次 new Thread 都要创建和销毁操作系统线程，成本很高。线程池复用线程、控制并发数、管理任务队列，是并发的标准做法。',
    walk: [
      ['corePoolSize / maximumPoolSize', '核心线程常驻，最大线程是高峰期上限。'],
      ['任务队列', '核心线程满了进队列；队列满了才扩到最大线程。'],
      ['拒绝策略', '最大线程也满了，按策略抛异常、丢弃或让提交者执行。'],
      ['submit(Callable)', '返回 Future，可以拿返回值、取消、设超时。'],
      ['future.get(1, SECONDS)', '阻塞等待结果；超时抛 TimeoutException。'],
      ['shutdown()', '不再接新任务，已提交的任务继续跑完。']
    ],
    summary: [
      '线程池先核心、再队列、再最大、最后拒绝。',
      '生产环境用有界队列 + 明确拒绝策略，别用 Executors 快捷工厂。',
      '用完 shutdown，Future.get 要设超时。'
    ]
  };

  D['concurrent-collections'] = {
    why: 'HashMap、ArrayList 在多线程下会丢数据甚至出错。并发容器提供了安全的替代品，但“单个操作安全”不等于“组合操作安全”。',
    walk: [
      ['ConcurrentHashMap', 'JDK 8 用 CAS + synchronized 锁单个桶，读几乎无锁。'],
      ['map.merge(k, 1, Integer::sum)', '把读改写合成一个原子操作，适合计数。'],
      ['CopyOnWriteArrayList', '写时复制整个数组，读不加锁，适合读多写少。'],
      ['BlockingQueue.put/take', '队列满/空时阻塞，是生产者消费者的核心。'],
      ['CompletableFuture.thenApply', '异步任务完成后转换结果，链式组合。'],
      ['exceptionally', '处理异步链中的异常，避免结果永远不完成。']
    ],
    summary: [
      '并发容器保证单操作安全，组合操作仍要原子方法或加锁。',
      '读多写少用 CopyOnWriteArrayList，队列用 BlockingQueue。',
      'CompletableFuture 要处理异常分支。'
    ]
  };

  D['deadlock-jmm'] = {
    why: '两个线程各持一把锁、又等对方的锁，程序就永远卡住。死锁不是玄学，有四个必要条件，也有明确的预防和排查手段。',
    walk: [
      ['互斥', '资源同一时刻只能被一个线程持有。'],
      ['请求并保持', '持有 A 的同时去请求 B。'],
      ['不可剥夺', '已持有的锁不能被强行拿走。'],
      ['循环等待', 'T1 等 B、T2 等 A，形成环。'],
      ['固定加锁顺序', '所有线程按 A→B 的顺序加锁，破坏循环等待。'],
      ['jstack <pid>', '打印线程栈，直接给出 Found one Java-level deadlock。']
    ],
    summary: [
      '破坏任意一个必要条件就能避免死锁，最常用固定加锁顺序。',
      '线上卡死先 jstack，看持有和等待关系。',
      'happens-before 保证可见性，volatile/锁插入内存屏障禁止重排。'
    ]
  };
})();
