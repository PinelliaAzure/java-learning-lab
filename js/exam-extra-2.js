/* =====================================================================
   题库补充 2：异常与泛型 / 函数式 / IO 与 NIO / 并发 / JVM（按模块 id 挂载，与显示序号无关）
   ---------------------------------------------------------------------
   window.EXAM_EXTRA  —— 模块级补充题，每模块补到 18 题
   window.LESSON_EXTRA —— 课级补充题，每课补到至少 3 题
   题目均面向零基础，只考查本模块核心概念，不与已有 quiz 重复。
   依赖：需在 curriculum-1..7 之后加载；本文件不修改任何其他文件。
   ===================================================================== */
window.EXAM_EXTRA = window.EXAM_EXTRA || {};

Object.assign(window.EXAM_EXTRA, {

  /* ================================================================
     模块 5 · 异常与泛型（现有 9 题，补 9 题 → 18 题）
     ================================================================ */
  m5: [
    {
      q: '方法签名里写 <code>throws IOException</code> 与在方法体里写 <code>throw new IOException()</code>，区别是？',
      options: [
        'throws 声明可能抛出的异常，throw 真正抛出异常对象',
        'throws 是语句，真正抛出异常；throw 只是声明',
        '两者完全等价',
        'throws 只能写一个异常'
      ],
      answer: 0,
      explain: 'throws 是方法声明的一部分，告诉调用方“可能会抛”；throw 是语句，真正把异常对象抛出去。一个方法可以声明多个 throws，但一次 throw 只抛一个对象。'
    },
    {
      q: '下面哪个 multi-catch 写法无法通过编译？',
      options: [
        'catch (IOException | SQLException e)',
        'catch (FileNotFoundException | SQLException e)',
        'catch (IOException | Exception e)',
        'catch (RuntimeException | Error e)'
      ],
      answer: 2,
      explain: 'multi-catch 中各个异常类型不能有继承关系：IOException 是 Exception 的子类，同时写会编译报错。其余组合互不继承，合法。'
    },
    {
      q: '调用一个声明了 <code>throws IOException</code> 的方法，既没有 try-catch，也没有在方法上继续 throws，会发生什么？',
      options: [
        '编译错误',
        '运行时抛异常',
        '自动忽略',
        '变成 RuntimeException'
      ],
      answer: 0,
      explain: '受检异常必须显式处理：要么用 try-catch 捕获，要么在方法签名上继续 throws 交给上层。否则编译器直接报错。'
    },
    {
      q: '程序抛出 <code>OutOfMemoryError</code> 时，通常应该怎么理解？',
      options: [
        '普通业务异常，按流程重试即可',
        '必须用 catch (Exception e) 捕获',
        '属于 Error，表示 JVM 层面的严重问题，业务代码不应随意捕获',
        '说明代码有语法错误'
      ],
      answer: 2,
      explain: 'Error 表示 JVM 自身或资源层面的严重故障（如内存耗尽、栈溢出），继承自 Throwable 但不属于 Exception。业务代码通常不应捕获它，而应排查根因。'
    },
    {
      q: '日志里只打印了 <code>e.getMessage()</code>，排查问题时缺少什么？',
      options: [
        '异常类型',
        '线程名',
        'JVM 参数',
        '完整堆栈（出错位置和调用链）'
      ],
      answer: 3,
      explain: 'getMessage() 只返回创建异常时传入的描述文字，没有堆栈信息。排查问题应打印完整堆栈（如 log.error("...", e)），才能看到异常抛出的位置和调用链。'
    },
    {
      q: '<code>&lt;T extends Number&gt;</code> 这个上界约束意味着？',
      options: [
        'T 只能是 Number 本身',
        'T 不能有方法',
        'T 只能是基本类型',
        'T 可以是 Number 或其任意子类，如 Integer、Double'
      ],
      answer: 3,
      explain: '上界 extends 表示 T 必须是 Number 或其子类。这样在方法体内可以安全调用 Number 的方法（如 doubleValue()），传入 Integer、Double 都合法。'
    },
    {
      q: '<code>List&lt;? super Integer&gt; list</code>，下面哪个操作是允许的？',
      options: [
        'Integer i = list.get(0)',
        'list.add(1)',
        'list.add("abc")',
        'list.add(1.0)'
      ],
      answer: 1,
      explain: '? super Integer 表示元素类型是 Integer 的某个父类型。写入 Integer 是安全的；但读取时编译器只知道它是 Object，不能直接赋给 Integer，也不能写入 String 或 Double。'
    },
    {
      q: '在泛型类 <code>class Box&lt;T&gt;</code> 中，下面哪个成员不能使用类型参数 T？',
      options: [
        'static 字段 static T cache',
        '实例字段 T value',
        '实例方法 T get()',
        '构造方法参数 T value'
      ],
      answer: 0,
      explain: 'static 成员属于类本身，在创建对象之前就存在，而 T 的具体类型要到创建对象时才确定，所以 static 字段和方法不能使用类的类型参数（static 泛型方法自己声明 <T> 可以）。'
    },
    {
      q: '下面哪个声明会导致编译错误？',
      options: [
        'List<Integer> list = new ArrayList<>();',
        'List<int> list = new ArrayList<>();',
        'Map<String, Integer> map = new HashMap<>();',
        'Optional<String> opt = Optional.empty();'
      ],
      answer: 1,
      explain: '泛型参数只能是引用类型，不能是 int、double 等基本类型。要存整数请用包装类 Integer，编译器会自动装箱和拆箱。'
    }
  ],

  /* ================================================================
     模块 6 · 函数式编程（现有 7 题，补 11 题 → 18 题）
     ================================================================ */
  m6: [
    {
      q: '<code>Predicate&lt;String&gt;</code> 的抽象方法是？',
      options: [
        'String apply(String s)',
        'boolean test(String s)',
        'void accept(String s)',
        'String get()'
      ],
      answer: 1,
      explain: 'Predicate 表示“判断”，抽象方法是 test，返回 boolean，常用于 filter。apply 属于 Function，accept 属于 Consumer，get 属于 Supplier。'
    },
    {
      q: '<code>Function&lt;String, Integer&gt;</code> 的作用是？',
      options: [
        '把 String 转成 Integer',
        '判断 String 是否合法',
        '消费 String 且不返回',
        '提供一个 String'
      ],
      answer: 0,
      explain: 'Function<T, R> 接收 T 返回 R，抽象方法 apply；这里就是输入 String、输出 Integer，常用于 map。'
    },
    {
      q: '<code>Supplier&lt;String&gt;</code> 适合下面哪个场景？',
      options: [
        '判断字符串是否为空',
        '把字符串转成大写',
        '延迟提供一个 String，调用 get() 时才产出',
        '遍历字符串'
      ],
      answer: 2,
      explain: 'Supplier 无参、有返回值，抽象方法 get()，典型用途是延迟创建对象或提供默认值（如 orElseGet）。'
    },
    {
      q: '<code>Consumer&lt;String&gt;</code> 的 accept 方法返回值是？',
      options: ['String', 'boolean', 'void', 'int'],
      answer: 2,
      explain: 'Consumer 表示“消费”，只接收参数、不返回结果，所以 accept 返回 void，forEach 的参数就是 Consumer。'
    },
    {
      q: '<code>list.forEach(System.out::println)</code> 中的 <code>::</code> 是什么？',
      options: [
        '继承语法',
        '包名分隔符',
        '泛型通配符',
        '方法引用，等价于 x -> System.out.println(x)'
      ],
      answer: 3,
      explain: '方法引用是 lambda 的简写：当 lambda 只是调用一个已有方法时，可以用 类名::方法名 或 对象::方法名 代替。'
    },
    {
      q: 'Stream 的 <code>flatMap</code> 与 <code>map</code> 的关键区别是？',
      options: [
        'flatMap 会把每个元素产生的流“展平”合并成一个流',
        'flatMap 只能处理数字',
        'map 是终止操作',
        '两者完全一样'
      ],
      answer: 0,
      explain: 'map 是一对一转换；flatMap 是一对多，把每个元素返回的 Stream 合并（展平）成一个 Stream，适合处理嵌套集合。'
    },
    {
      q: '<code>List.of(1,2,3).stream().reduce(0, Integer::sum)</code> 的结果是？',
      options: ['0', '3', '6', '编译错误'],
      answer: 2,
      explain: 'reduce 从初始值 0 开始，依次把元素累加：0+1+2+3 = 6。reduce 是终止操作。'
    },
    {
      q: '要把学生按班级分组，最适合用？',
      options: [
        'Collectors.joining()',
        'Collectors.groupingBy(Student::getClazz)',
        'Stream.map()',
        'Collectors.counting()'
      ],
      answer: 1,
      explain: 'groupingBy 按分类函数把元素分到 Map 的不同 List 中；joining 是拼接字符串，counting 是计数，map 是转换。'
    },
    {
      q: '<code>stream.anyMatch(s -&gt; s.isEmpty())</code> 的含义是？',
      options: [
        '所有元素都为空才返回 true',
        '统计空字符串个数',
        '只要有一个元素为空就返回 true',
        '过滤掉空字符串'
      ],
      answer: 2,
      explain: 'anyMatch 判断“是否存在任意一个满足条件”，找到一个就短路返回 true；allMatch 要求全部满足，noneMatch 要求全部不满足。'
    },
    {
      q: 'Optional 的 <code>orElse(getDefault())</code> 与 <code>orElseGet(() -&gt; getDefault())</code> 的区别是？',
      options: [
        '没有区别',
        'orElseGet 不能返回值',
        'orElse 只能返回 null',
        'orElse 无论是否为空都会先调用 getDefault()，orElseGet 只在为空时才调用'
      ],
      answer: 3,
      explain: 'orElse 的参数是“现成的值”，传入方法调用时会立即执行；orElseGet 接收 Supplier，只在 Optional 为空时才执行，能避免不必要的计算。'
    },
    {
      q: '对 <code>Optional.empty()</code> 调用 <code>get()</code> 会发生什么？',
      options: [
        '返回 null',
        '返回空字符串',
        '抛 NoSuchElementException',
        '编译错误'
      ],
      answer: 2,
      explain: 'get() 要求 Optional 中有值，为空时抛 NoSuchElementException。更安全的写法是 orElse、orElseThrow 或先 ifPresent。'
    }
  ],

  /* ================================================================
     模块 7 · IO 与 NIO（现有 11 题，补 7 题 → 18 题）
     ================================================================ */
  m7: [
    {
      q: '下面哪一组都是字符流？',
      options: [
        'FileReader / FileWriter',
        'FileInputStream / FileOutputStream',
        'BufferedInputStream / BufferedOutputStream',
        'DataInputStream / DataOutputStream'
      ],
      answer: 0,
      explain: 'Reader / Writer 体系是字符流，按 char 处理文本；InputStream / OutputStream 体系是字节流，按 byte 处理二进制数据。'
    },
    {
      q: '<code>BufferedReader.readLine()</code> 返回 null 表示？',
      options: [
        '读到空行',
        '发生异常',
        '文件不存在',
        '已经到达文件末尾'
      ],
      answer: 3,
      explain: 'readLine 读到一行内容返回字符串（不含换行符），到达流末尾时返回 null。空行会返回空字符串 ""，不是 null。'
    },
    {
      q: '要把字符流按指定编码写成字节流，应该用？',
      options: [
        'OutputStreamWriter',
        'InputStreamReader',
        'FileReader',
        'BufferedWriter'
      ],
      answer: 0,
      explain: 'OutputStreamWriter 是字符流到字节流的桥梁，构造时可以指定字符集，如 new OutputStreamWriter(out, StandardCharsets.UTF_8)；InputStreamReader 的方向相反。'
    },
    {
      q: '<code>Files.readAllLines(path)</code> 的返回类型是？',
      options: ['String', 'Stream&lt;String&gt;', 'List&lt;String&gt;', 'byte[]'],
      answer: 2,
      explain: 'readAllLines 一次性读取所有行并返回 List<String>，适合小文件；大文件更推荐 Files.lines 返回 Stream 逐行处理。'
    },
    {
      q: '类里的 <code>serialVersionUID</code> 主要作用是？',
      options: [
        '加快序列化速度',
        '指定文件编码',
        '压缩序列化后的字节',
        '校验序列化与反序列化的类版本是否兼容'
      ],
      answer: 3,
      explain: '反序列化时会比对流中的 serialVersionUID 与本地类的值，不一致就抛 InvalidClassException。显式声明可以避免类小幅改动后旧数据无法读取。'
    },
    {
      q: '<code>Files.copy(src, dest)</code> 在目标文件已存在时默认会？',
      options: [
        '直接覆盖',
        '抛 FileAlreadyExistsException',
        '追加内容',
        '静默跳过'
      ],
      answer: 1,
      explain: '默认不覆盖，目标已存在会抛 FileAlreadyExistsException；需要覆盖时传入 StandardCopyOption.REPLACE_EXISTING。'
    },
    {
      q: 'try-with-resources 中声明了多个资源，关闭顺序是？',
      options: [
        '与声明顺序相同',
        '随机',
        '与声明顺序相反（后声明先关闭）',
        '只关闭第一个'
      ],
      answer: 2,
      explain: '多个资源用分号分隔，关闭时按声明的逆序进行，类似栈的后进先出，确保依赖关系正确释放。'
    }
  ],

  /* ================================================================
     模块 8 · 并发编程（现有 11 题，补 7 题 → 18 题）
     ================================================================ */
  m8: [
    {
      q: '创建线程时，为什么通常推荐实现 Runnable 而不是继承 Thread？',
      options: [
        'Java 单继承，实现接口后类还能继承其他父类，职责也更清晰',
        'Runnable 性能更好',
        'Thread 不能被继承',
        'Runnable 会自动加锁'
      ],
      answer: 0,
      explain: '继承 Thread 会占用唯一的继承名额；实现 Runnable 把“任务”和“线程”分离，同一个任务还能交给线程池执行，更灵活。'
    },
    {
      q: '关于 <code>Thread.sleep</code> 与 <code>Object.wait</code>，下面哪个说法正确？',
      options: [
        '两者都会释放锁',
        'wait 不释放锁，sleep 会释放锁',
        '两者都不释放锁',
        'sleep 不释放锁，wait 会释放锁'
      ],
      answer: 3,
      explain: 'sleep 只是让当前线程暂停，仍持有已获得的锁；wait 必须在 synchronized 块内调用，调用后会释放锁并进入等待队列，被 notify 唤醒后重新竞争锁。'
    },
    {
      q: '<code>synchronized static</code> 方法锁住的是？',
      options: [
        '当前类的 Class 对象',
        'this 对象',
        '调用线程',
        '方法参数'
      ],
      answer: 0,
      explain: 'static 方法没有 this，锁的是类对象（如 Foo.class）；实例方法锁的是 this。两者是不同的锁，不会互相阻塞。'
    },
    {
      q: '下面哪个不是死锁产生的必要条件？',
      options: ['互斥', '线程优先级相同', '持有并等待', '循环等待'],
      answer: 1,
      explain: '死锁的四个必要条件是互斥、持有并等待、不可剥夺、循环等待。线程优先级与死锁无关。'
    },
    {
      q: '线程池的 <code>submit</code> 与 <code>execute</code> 的主要区别是？',
      options: [
        'execute 返回 Future',
        'submit 返回 Future，可以拿到结果并捕获任务异常',
        '两者完全一样',
        'submit 只能提交 Runnable'
      ],
      answer: 1,
      explain: 'execute 只接收 Runnable 且无返回值，任务异常会直接抛给线程；submit 可接收 Runnable/Callable，返回 Future，用 get() 取结果，异常会被封装在 ExecutionException 中。'
    },
    {
      q: '主线程要等 5 个子任务都完成后才继续，最适合用？',
      options: [
        'Thread.sleep(5000)',
        'synchronized',
        'CountDownLatch(5)',
        'volatile int'
      ],
      answer: 2,
      explain: 'CountDownLatch 用计数初始化，每个子任务完成后 countDown()，主线程 await() 阻塞到计数归零，正好表达“等 N 个任务完成”。'
    },
    {
      q: '<code>ThreadLocal</code> 的作用是？',
      options: [
        '让多个线程共享一个变量',
        '强制线程串行执行',
        '创建线程池',
        '为每个线程保存一份独立的变量副本'
      ],
      answer: 3,
      explain: 'ThreadLocal 为每个线程维护独立副本，互不干扰，常用于保存用户上下文、连接等；用完要 remove()，避免线程池场景下的内存泄漏。'
    }
  ],

  /* ================================================================
     模块 9 · JVM（现有 8 题，补 10 题 → 18 题）
     ================================================================ */
  m9: [
    {
      q: '程序计数器（PC）的作用是？',
      options: [
        '保存对象的实例数据',
        '记录当前线程正在执行的字节码指令地址',
        '存放类的元数据',
        '缓存字符串常量'
      ],
      answer: 1,
      explain: 'PC 记录当前线程执行到哪条字节码指令，是线程私有的，也是唯一不会抛 OutOfMemoryError 的运行时区域。'
    },
    {
      q: '通过 <code>new</code> 创建的对象实例，通常分配在？',
      options: ['虚拟机栈', '程序计数器', '元空间', '堆'],
      answer: 3,
      explain: '堆是所有线程共享的区域，绝大多数对象都在这里分配，也是垃圾回收的主要场所；栈里存放的是指向对象的引用。'
    },
    {
      q: 'JDK 8 之后，方法区的实现是？',
      options: [
        '永久代 PermGen，位于堆内',
        '元空间 Metaspace，使用本地内存',
        '虚拟机栈',
        '直接内存中的字符串常量池'
      ],
      answer: 1,
      explain: 'JDK 8 用元空间取代永久代，类的元数据放在本地内存中，默认不设上限（可用 -XX:MaxMetaspaceSize 限制），减少了 PermGen OOM。'
    },
    {
      q: '新生代通常由哪些区域组成？',
      options: [
        'Eden + 两个 Survivor',
        '只有一个 Old 区',
        'Metaspace + 栈',
        '常量池 + 方法区'
      ],
      answer: 0,
      explain: '新生代分为 Eden 和两个 Survivor（S0/S1），新对象先在 Eden 分配；Minor GC 回收新生代，存活对象在 Survivor 之间复制并增加年龄。'
    },
    {
      q: '新生代对象什么时候会晋升到老年代？',
      options: [
        '创建后立即晋升',
        '只要被 GC 一次就晋升',
        '永远不会晋升',
        '年龄达到阈值（默认 15）或 Survivor 放不下时'
      ],
      answer: 3,
      explain: '对象每熬过一次 Minor GC 年龄加 1，达到阈值（默认 15，可通过 -XX:MaxTenuringThreshold 调整）就晋升老年代；大对象也可能直接进入老年代。'
    },
    {
      q: '只被 <code>WeakReference</code> 引用的对象，在 GC 时会怎样？',
      options: [
        '永远不会被回收',
        '只有内存不足时才回收',
        '只要发生 GC 就会被回收',
        '必须手动调用 dispose'
      ],
      answer: 2,
      explain: '弱引用不阻止回收：GC 时一旦发现对象只有弱引用，就会把它回收，引用本身变为 null。ThreadLocalMap 的 key 就用弱引用避免泄漏。'
    },
    {
      q: '类加载过程的正确顺序是？',
      options: [
        '加载 → 初始化 → 验证 → 准备 → 解析',
        '加载 → 验证 → 准备 → 解析 → 初始化',
        '准备 → 加载 → 解析 → 验证 → 初始化',
        '验证 → 加载 → 初始化 → 准备 → 解析'
      ],
      answer: 1,
      explain: '标准顺序是加载、验证、准备、解析、初始化；解析阶段有时可以推迟到初始化之后，但整体流程不变。'
    },
    {
      q: '下面哪个操作会触发类的初始化？',
      options: [
        '声明一个该类型的引用变量',
        '访问类的 Class 对象但不用反射',
        '用 new 创建该类的实例',
        '编译时引用该类的常量'
      ],
      answer: 2,
      explain: 'new 实例、访问非编译期常量的静态字段、调用静态方法、反射、初始化子类等会触发初始化；仅声明引用或取 Class 对象不会。'
    },
    {
      q: '自定义类加载器时，通常应该重写哪个方法？',
      options: ['loadClass', 'main', 'findClass', 'finalize'],
      answer: 2,
      explain: 'loadClass 里已经实现了双亲委派逻辑，重写它会破坏委派；正确做法是重写 findClass，在父加载器找不到时定义自己的加载逻辑。'
    },
    {
      q: '参数 <code>-Xmx512m</code> 的含义是？',
      options: [
        '初始堆大小为 512MB',
        '每个线程栈大小 512MB',
        '元空间大小 512MB',
        '最大堆大小为 512MB'
      ],
      answer: 3,
      explain: '-Xms 是初始堆大小，-Xmx 是最大堆大小。设置 -Xms 与 -Xmx 相同可以避免堆频繁扩容缩容带来的抖动。'
    }
  ]
});

/* =====================================================================
   课级补充：只列出现有题目少于 3 道的课，每课补到 3 道
   ===================================================================== */
window.LESSON_EXTRA = window.LESSON_EXTRA || {};

Object.assign(window.LESSON_EXTRA, {

  /* ---------- 模块 5 ---------- */
  'custom-exception': [
    {
      q: '自定义异常构造器里写 <code>super(message)</code> 的主要作用是？',
      options: [
        '把 message 交给父类保存，<code>getMessage()</code> 才能取到',
        '自动打印异常堆栈',
        '把异常变成受检异常',
        '设置异常的 cause'
      ],
      answer: 0,
      explain: '异常的消息由父类 Throwable 保存；不调用 super(message) 时，getMessage() 往往返回 null。cause 是另一个构造器参数，用来保留异常链。'
    }
  ],
  'generics': [
    {
      q: '<code>class Box&lt;T&gt; { T value; }</code>，执行 <code>Box&lt;String&gt; b = new Box&lt;&gt;();</code> 后，<code>b.value</code> 的编译期类型是？',
      options: ['Object', 'String', 'T', 'Class'],
      answer: 1,
      explain: '创建 Box&lt;String> 后，类型参数 T 被确定为 String，字段 value 和方法的返回类型在编译期都按 String 检查，取出时不需要强转。'
    }
  ],
  'erasure': [
    {
      q: '由于泛型擦除，运行时判断一个对象是不是 <code>List</code>，可以怎么写？',
      options: [
        'obj instanceof List&lt;String&gt;',
        'obj.getClass() == List&lt;String&gt;.class',
        'obj instanceof List',
        'List&lt;String&gt;.class.isInstance(obj)'
      ],
      answer: 2,
      explain: '泛型在运行时被擦除，instanceof 和 .class 都不能带泛型参数，List&lt;String>.class 甚至无法通过编译；只能判断原始类型 List，无法判断元素是不是 String。'
    }
  ],

  /* ---------- 模块 6 ---------- */
  'lambda': [
    {
      q: '下面哪个 lambda 可以赋给 <code>Comparator&lt;String&gt;</code>？',
      options: [
        '() -> 0',
        'a -> a.length()',
        '(a, b, c) -> 0',
        '(a, b) -> a.length() - b.length()'
      ],
      answer: 3,
      explain: 'Comparator&lt;String> 的抽象方法 compare(String a, String b) 接收两个参数、返回 int。A 参数个数不对，B 只有一个参数，C 参数过多。'
    }
  ],
  'optional': [
    {
      q: '<code>Optional.of("x").orElse("default")</code> 的结果是？',
      options: ['"default"', '"x"', 'null', '抛异常'],
      answer: 1,
      explain: 'orElse 在 Optional 有值时返回其中的值，只有为空时才返回参数。所以这里返回 "x"。'
    }
  ],

  /* ---------- 模块 7 ---------- */
  'io-streams': [
    {
      q: '读取一个 UTF-8 文本文件，下面哪种组合最合适？',
      options: [
        'InputStreamReader（显式指定 UTF-8）+ BufferedReader',
        'FileInputStream + 强转 char',
        'FileOutputStream + BufferedOutputStream',
        'RandomAccessFile 按字节读'
      ],
      answer: 0,
      explain: '文本按字符读：用 InputStreamReader 显式指定 UTF-8 解码字节，再套 BufferedReader 按行读取，效率高且不易乱码。'
    }
  ],
  'buffered': [
    {
      q: '缓冲流（BufferedInputStream / BufferedReader）的主要作用是？',
      options: [
        '自动加密数据',
        '压缩文件',
        '减少与磁盘 / 网络的交互次数，提高读写性能',
        '把字节流变成对象'
      ],
      answer: 2,
      explain: '缓冲流在内存中维护一个缓冲区，攒够一批再一次性读写，显著减少系统调用次数；小量多次读写时性能提升明显。'
    }
  ],
  'nio-files': [
    {
      q: '要判断一个路径是否存在，应该用？',
      options: [
        'Files.readString(path)',
        'Files.exists(path)',
        'Files.delete(path)',
        'Path.resolve(path)'
      ],
      answer: 1,
      explain: 'Files.exists 返回 boolean，可判断文件或目录是否存在；readString 读内容，delete 删除，resolve 只是拼接路径。'
    }
  ],
  'serialization': [
    {
      q: '一个对象要被 Java 原生序列化，它的类必须？',
      options: [
        '继承 Thread',
        '实现 Serializable 接口',
        '重写 equals',
        '实现 Cloneable'
      ],
      answer: 1,
      explain: 'Serializable 是标记接口，没有任何方法，只用来告诉 JVM 这个类允许序列化；没有实现就抛 NotSerializableException。'
    }
  ],

  /* ---------- 模块 8 ---------- */
  'thread-basics': [
    {
      q: '线程调用了 <code>start()</code> 但还没抢到 CPU 时，处于什么状态？',
      options: ['NEW', 'RUNNABLE', 'BLOCKED', 'TERMINATED'],
      answer: 1,
      explain: 'start() 之后线程进入 RUNNABLE（可运行）状态，是否正在占用 CPU 由操作系统调度决定；NEW 是还没调用 start() 的状态。'
    }
  ],
  'executors': [
    {
      q: '线程池调用 <code>shutdown()</code> 之后会怎样？',
      options: [
        '立即中断所有线程',
        '拒绝所有已提交任务',
        '线程池立刻可用',
        '不再接受新任务，但已提交的任务会继续执行完'
      ],
      answer: 3,
      explain: 'shutdown 是“温和关闭”：停止接收新任务，已提交的任务继续执行，全部结束后线程池终止；shutdownNow 才会尝试中断并返回未执行的任务。'
    }
  ],
  'concurrent-collections': [
    {
      q: '与 HashMap 相比，<code>ConcurrentHashMap</code> 的一个重要限制是？',
      options: [
        '不能并发访问',
        '元素必须有序',
        '不允许 null 键和 null 值',
        '只能存字符串'
      ],
      answer: 2,
      explain: 'ConcurrentHashMap 不允许 null key 和 null value，因为并发环境下无法区分“没有这个键”和“值就是 null”；HashMap 则允许一个 null 键和多个 null 值。'
    }
  ],
  'deadlock-jmm': [
    {
      q: '<code>happens-before</code> 规则主要用来保证？',
      options: [
        '线程按顺序执行',
        '代码不会抛异常',
        '锁一定会释放',
        '前一个操作的结果对后一个操作可见'
      ],
      answer: 3,
      explain: 'happens-before 定义可见性：如果 A happens-before B，那么 A 的写操作对 B 可见。它不保证执行顺序，也不保证原子性。'
    }
  ],

  /* ---------- 模块 9 ---------- */
  'jvm-memory': [
    {
      q: '方法调用时，局部变量和方法参数存放在哪里？',
      options: ['堆', '元空间', '程序计数器', '虚拟机栈的栈帧中'],
      answer: 3,
      explain: '每次方法调用都会创建一个栈帧压入虚拟机栈，栈帧里有局部变量表、操作数栈等；方法返回后栈帧弹出，局部变量随之销毁。'
    }
  ],
  'gc': [
    {
      q: '调用 <code>System.gc()</code> 会发生什么？',
      options: [
        '立即执行一次 Full GC',
        '清空堆内存',
        '只是建议 JVM 执行 GC，不保证立刻执行',
        '抛异常'
      ],
      answer: 2,
      explain: 'System.gc() 只是向 JVM 发出回收建议，具体是否执行、执行哪种 GC 由 JVM 决定；生产代码不应依赖它。'
    }
  ],
  'classloading': [
    {
      q: '<code>java.lang.String</code> 这个核心类由哪个类加载器加载？',
      options: [
        'Bootstrap ClassLoader',
        'Application ClassLoader',
        '自定义加载器',
        'Extension ClassLoader'
      ],
      answer: 0,
      explain: '双亲委派下，核心类库（java.base 等）由最顶层的 Bootstrap 加载器加载，它是 C++ 实现的，Java 里拿到的引用是 null。'
    }
  ],
  'bytecode-tuning': [
    {
      q: '想查看一个 .class 文件里的字节码指令，应该用哪个命令？',
      options: ['javac', 'java -jar', 'jps', 'javap -c'],
      answer: 3,
      explain: 'javap -c 可以反汇编 class 文件，查看方法对应的字节码指令；javac 是编译，java 是运行，jps 查看 Java 进程。'
    }
  ]
});
